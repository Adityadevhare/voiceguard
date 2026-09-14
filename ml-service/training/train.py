"""Phase 7: full training of the reconstructed W2V2-AASIST backend.

Mirrors the original pipeline (SSL_Anti-spoofing/main_SSL_LA.py) but on
the modern reconstruction:
  * XLS-R backbone frozen; only the AASIST backend is trained.
  * Adam (lr=1e-6, weight_decay=1e-4), batch 14 (matching the original).
  * Weighted cross-entropy; defaults to equal class weights because the
    5100-clip subset is balanced (2580 bona fide / 2520 spoof).
  * Speaker-disjoint holdout (from train_subset_manifest.csv): every
    utterance of a validation speaker goes to validation, every utterance
    of a training speaker goes to training. The fixed validation speakers
    are LA_0097 and LA_0098; training speakers are LA_0079..LA_0096.
    The holdout is evaluated each epoch (loss + accuracy); the best
    backend checkpoint (by dev loss) and the last epoch weights are saved
    as *trainable-params only* (the frozen pretrained backbone is
    reconstructed on load from the mapped XLS-R checkpoint).
"""

import argparse
import csv
import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from torch.utils.data import DataLoader, Dataset

import soundfile as sf  # noqa: E402

from model import load_w2v2_aasist  # noqa: E402

SUBSET_DIR = Path(r"C:\Users\DELL\Downloads\ASVspoof_train_subset")
MANIFEST_PATH = Path(r"C:\Users\DELL\Downloads\train_subset_manifest.csv")
TARGET_SAMPLES = 64600

BONAFIDE_LABEL = 1  # matches original d_meta: bonafide=1, spoof=0
SPOOF_LABEL = 0

# Fixed, speaker-disjoint assignment for the 20-speaker subset
# (LA_0079..LA_0098 from train_subset_manifest.csv).
VALIDATION_SPEAKERS = {"LA_0097", "LA_0098"}


def prepare_audio(audio: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio, dtype=np.float32)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    if len(audio) >= TARGET_SAMPLES:
        audio = audio[:TARGET_SAMPLES]
    else:
        repeats = int(np.ceil(TARGET_SAMPLES / len(audio)))
        audio = np.tile(audio, repeats)[:TARGET_SAMPLES]
    return audio.astype(np.float32)


class SubsetDataset(Dataset):
    """ASVspoof-style; flac files under <root>/bonafide and <root>/spoof."""

    def __init__(self, root: Path, files: list[tuple[str, int]]):
        self.root = root
        self.files = files  # list of (path, label)

    def __len__(self) -> int:
        return len(self.files)

    def __getitem__(self, index):
        path, label = self.files[index]
        audio, sr = sf.read(str(path), dtype="float32")
        if sr != 16000:
            raise ValueError(f"{path} is {sr} Hz, expected 16000")
        return prepare_audio(audio), label


def load_manifest() -> list[dict]:
    with MANIFEST_PATH.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def build_entries(root: Path, rows: list[dict]) -> list[tuple]:
    entries = []
    for row in rows:
        label_txt = row["label"]
        if label_txt == "bonafide":
            label_int, leaf = BONAFIDE_LABEL, "bonafide"
        elif label_txt == "spoof":
            label_int, leaf = SPOOF_LABEL, "spoof"
        else:
            raise ValueError(f"Unexpected label {label_txt!r} for {row['audio_id']}")
        path = root / leaf / (row["audio_id"] + ".flac")
        if not path.exists():
            raise FileNotFoundError(f"Missing audio: {path}")
        entries.append((str(path), label_int, row["audio_id"], row["speaker"]))
    return entries


def _subsample_per_class(entries, limit: int, seed: int):
    rng = np.random.RandomState(seed)
    out = []
    for label in (SPOOF_LABEL, BONAFIDE_LABEL):
        subset = [e for e in entries if e[1] == label]
        subset = list(subset)
        rng.shuffle(subset)
        out.extend(subset[:limit])
    return out


def speaker_disjoint_split(root: Path, seed: int, limit: int = 0) -> dict:
    rows = load_manifest()
    all_speakers = sorted({row["speaker"] for row in rows})
    val_speakers = sorted(set(all_speakers) & set(VALIDATION_SPEAKERS))
    train_speakers = sorted(set(all_speakers) - set(VALIDATION_SPEAKERS))

    entries = build_entries(root, rows)
    train_entries = [e for e in entries if e[3] in set(train_speakers)]
    val_entries = [e for e in entries if e[3] in set(val_speakers)]

    if limit:
        train_entries = _subsample_per_class(train_entries, limit, seed)
        val_entries = _subsample_per_class(val_entries, limit, seed)

    train_files = [(e[0], e[1]) for e in train_entries]
    val_files = [(e[0], e[1]) for e in val_entries]

    return {
        "train_files": train_files,
        "val_files": val_files,
        "train_speakers": train_speakers,
        "val_speakers": val_speakers,
        "train_entries": train_entries,
        "val_entries": val_entries,
        "rows": rows,
    }


def validate_speaker_split(split: dict, limit: int = 0) -> None:
    train_speakers = split["train_speakers"]
    val_speakers = split["val_speakers"]
    rows = split["rows"]

    speaker_overlap = set(train_speakers) & set(val_speakers)
    assert not speaker_overlap, f"Speaker overlap: {sorted(speaker_overlap)}"

    train_ids = {e[2] for e in split["train_entries"]}
    val_ids = {e[2] for e in split["val_entries"]}
    id_overlap = train_ids & val_ids
    assert not id_overlap, f"audio_id in both sets: {sorted(id_overlap)[:10]}"

    val_bona = sum(1 for e in split["val_entries"] if e[1] == BONAFIDE_LABEL)
    val_spoof = sum(1 for e in split["val_entries"] if e[1] == SPOOF_LABEL)
    assert val_bona > 0 and val_spoof > 0, "Validation must contain both classes"

    if limit == 0:
        n_train = len(split["train_entries"])
        n_val = len(split["val_entries"])
        assert n_train + n_val == len(rows), f"{n_train + n_val} != {len(rows)}"
        assert len(train_speakers) == 18, f"{len(train_speakers)} train speakers, expected 18"
        assert len(val_speakers) == 2, f"{len(val_speakers)} val speakers, expected 2"
        # Manifest truth for LA_0097+LA_0098 (127/126 each): 254 bona / 252 spoof.
        assert val_bona == 254, f"Expected 254 validation bonafide, got {val_bona}"
        assert val_spoof == 252, f"Expected 252 validation spoof, got {val_spoof}"


def print_split_summary(split: dict) -> None:
    train_files = split["train_files"]
    val_files = split["val_files"]
    train_speakers = split["train_speakers"]
    val_speakers = split["val_speakers"]
    train_bona = sum(1 for e in split["train_entries"] if e[1] == BONAFIDE_LABEL)
    train_spoof = sum(1 for e in split["train_entries"] if e[1] == SPOOF_LABEL)
    val_bona = sum(1 for e in split["val_entries"] if e[1] == BONAFIDE_LABEL)
    val_spoof = sum(1 for e in split["val_entries"] if e[1] == SPOOF_LABEL)
    overlap = len(set(train_speakers) & set(val_speakers))

    print("Speaker-disjoint split")
    print(f"Train speakers: {len(train_speakers)}")
    print(f"Validation speakers: {len(val_speakers)}")
    print(f"Train clips: {len(train_files)}")
    print(f"Validation clips: {len(val_files)}")
    print(f"Train bonafide: {train_bona}")
    print(f"Train spoof: {train_spoof}")
    print(f"Validation bonafide: {val_bona}")
    print(f"Validation spoof: {val_spoof}")
    print(f"Speaker overlap: {overlap}")


@torch.no_grad()
def evaluate(loader, model, criterion, device):
    model.eval()
    total_loss = 0.0
    correct = 0
    num_total = 0
    for batch_x, batch_y in loader:
        batch_x = batch_x.to(device)
        batch_y = batch_y.to(device)
        batch_out, _ = model(batch_x)
        batch_size = batch_out.size(0)
        loss = criterion(batch_out, batch_y)
        total_loss += loss.item() * batch_size
        correct += (batch_out.argmax(dim=1) == batch_y).sum().item()
        num_total += batch_size
    model.train()
    return total_loss / max(num_total, 1), correct / max(num_total, 1)


def train_epoch(loader, model, optimizer, criterion, device):
    running_loss = 0.0
    num_total = 0
    for batch_x, batch_y in loader:
        batch_x = batch_x.to(device)
        batch_y = batch_y.to(device)

        optimizer.zero_grad()
        batch_out, _ = model(batch_x)
        batch_loss = criterion(batch_out, batch_y)
        batch_loss.backward()
        optimizer.step()

        batch_size = batch_out.size(0)
        running_loss += batch_loss.item() * batch_size
        num_total += batch_size
    return running_loss / max(num_total, 1)


def save_backend(model, path: Path, meta: dict) -> None:
    """Persist only the AASIST backend (trainable weights + BN buffers).

    Every ``ssl_model.model.*`` tensor is part of the frozen pretrained
    backbone and is reconstructed on load from the mapped XLS-R
    checkpoint, so it is intentionally not saved.
    """
    state = {
        name: tensor.detach().cpu()
        for name, tensor in model.state_dict().items()
        if not name.startswith("ssl_model.model.")
    }
    torch.save({"state_dict": state, "meta": meta}, str(path))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch-size", type=int, default=14)
    parser.add_argument("--lr", type=float, default=1e-6)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--class-weight", default="1.0,1.0",
                        help="two floats for (spoof, bonafide)")
    parser.add_argument("--val-fraction", type=float, default=0.1,
                        help="ignored; split is speaker-disjoint with fixed"
                             " validation speakers (LA_0097, LA_0098)")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--num-workers", type=int, default=2)
    parser.add_argument("--limit", type=int, default=0,
                        help="only use N clips per class (0 = all)")
    parser.add_argument("--split-only", action="store_true",
                        help="build + validate the split and exit without training")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--save-dir", default=None)
    args = parser.parse_args()

    torch.backends.cuda.matmul.allow_tf32 = False
    torch.backends.cudnn.allow_tf32 = False
    try:
        torch.backends.cudnn.conv.fp32_precision = "ieee"
    except Exception:
        pass

    torch.manual_seed(args.seed)

    device = args.device
    if device != "cpu" and not torch.cuda.is_available():
        device = "cpu"
        print("CUDA unavailable; falling back to CPU.")
    print(f"Device: {device}")
    print(f"PyTorch CUDA available: {torch.cuda.is_available()}")
    print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")

    cw = [float(x) for x in args.class_weight.split(",")]
    assert len(cw) == 2, "--class-weight needs two floats (spoof,bonafide)"
    class_weights = torch.tensor(cw, device=device)

    print("\n[1/5] Building speaker-disjoint split...")
    split = speaker_disjoint_split(SUBSET_DIR, args.seed, args.limit)
    validate_speaker_split(split, args.limit)
    print_split_summary(split)

    if args.split_only:
        print("\nSplit validated. Exiting (--split-only).")
        return

    save_dir = Path(args.save_dir) if args.save_dir else (
        Path(__file__).resolve().parent / "artifacts" / "runs"
        / time.strftime("w2v2aasist_%Y%m%d_%H%M%S")
    )
    save_dir.mkdir(parents=True, exist_ok=True)

    train_set = SubsetDataset(SUBSET_DIR, split["train_files"])
    val_set = SubsetDataset(SUBSET_DIR, split["val_files"])
    train_loader = DataLoader(
        train_set, batch_size=args.batch_size, shuffle=True,
        num_workers=args.num_workers, drop_last=True, pin_memory=True,
    )
    val_loader = DataLoader(
        val_set, batch_size=args.batch_size, shuffle=False,
        num_workers=args.num_workers, pin_memory=False,
    )
    print(f"  Train clips: {len(train_set)}  Val clips: {len(val_set)}")

    print("\n[2/5] Loading reconstruction & freezing backbone...")
    model = load_w2v2_aasist()
    model = model.to(device)
    model.train()
    n_backbone = 0
    for p in model.ssl_model.parameters():
        p.requires_grad_(False)
        n_backbone += p.numel()
    n_trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Frozen backbone: {n_backbone:,}  Trainable backend: {n_trainable:,}")

    optimizer = torch.optim.Adam(
        [p for p in model.parameters() if p.requires_grad],
        lr=args.lr, weight_decay=args.weight_decay,
    )
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    print("\n[3/5] Training...")
    best_val_loss = float("inf")
    history = []
    for epoch in range(1, args.epochs + 1):
        t0 = time.perf_counter()
        train_loss = train_epoch(train_loader, model, optimizer, criterion, device)
        val_loss, val_acc = evaluate(val_loader, model, criterion, device)
        elapsed = time.perf_counter() - t0

        record = {
            "epoch": epoch, "train_loss": train_loss,
            "val_loss": val_loss, "val_acc": val_acc,
        }
        history.append(record)
        print(f"  Epoch {epoch:3d}: train_loss={train_loss:.5f} "
              f"val_loss={val_loss:.5f} val_acc={val_acc:.4f} [{elapsed:.0f}s]")

        is_best = val_loss < best_val_loss
        if is_best:
            best_val_loss = val_loss
            save_backend(model, save_dir / "best_backend.pt",
                         {"epoch": epoch, "val_loss": val_loss, "train_loss": train_loss})

        if save_dir:
            save_backend(model, save_dir / "last_backend.pt",
                         {"epoch": epoch, "val_loss": val_loss, "train_loss": train_loss})
            (save_dir / "history.json").write_text(json.dumps(history))

    print("\n[4/5] Summary...")
    print(f"  Best val loss: {best_val_loss:.5f}")
    print(f"  Checkpoints: {save_dir}")

    print("\n[5/5] Metrics parity sanity on val split...")
    final_val_loss, final_val_acc = evaluate(val_loader, model, criterion, device)
    print(f"  Final val_loss={final_val_loss:.5f} val_acc={final_val_acc:.4f}")
    assert np.isfinite(final_val_loss) and 0.0 <= final_val_acc <= 1.0

    print("\n" + "=" * 70)
    print("TRAINING COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()