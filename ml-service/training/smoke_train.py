"""Phase 6: minimal training smoke test on a handful of real clips.

Validates that the reconstructed W2V2-AASIST is trainable exactly as the
original pipeline expects:

1. Real 16 kHz FLAC clips (bonafide=1 / spoof=0) loaded and padded to the
   64600-sample contract used by inference.
2. The full model trains in `train()` mode on a tiny batch.
3. The XLS-R backbone is frozen (no gradients produced for it) while the
   AASIST backend receives gradients end-to-end.
4. Cross-entropy loss decreases over a couple of gradient steps.

Run with the `.venv` interpreter (transformers + torch + soundfile).
"""

import re
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).resolve().parent))

import soundfile as sf  # noqa: E402

from model import W2V2AASIST, load_w2v2_aasist  # noqa: E402

SUBSET_DIR = Path(r"C:\Users\DELL\Downloads\ASVspoof_train_subset")
TARGET_SAMPLES = 64600
BATCH_SIZE = 2
STEPS = 2
SEED = 0


def load_clip(path: Path) -> np.ndarray:
    audio, sr = sf.read(str(path))
    if sr != 16000:
        raise ValueError(f"{path} is {sr} Hz, expected 16000")
    audio = np.asarray(audio, dtype=np.float32)
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
    if len(audio) >= TARGET_SAMPLES:
        audio = audio[:TARGET_SAMPLES]
    else:
        repeats = int(np.ceil(TARGET_SAMPLES / len(audio)))
        audio = np.tile(audio, repeats)[:TARGET_SAMPLES]
    return audio.astype(np.float32)


def build_batch() -> tuple[torch.Tensor, torch.Tensor]:
    rng = np.random.RandomState(SEED)
    bona_fide = sorted((SUBSET_DIR / "bonafide").glob("*.flac"))
    spoof = sorted((SUBSET_DIR / "spoof").glob("*.flac"))
    rng.shuffle(bona_fide)
    rng.shuffle(spoof)

    waves, labels = [], []
    for p in bona_fide[: BATCH_SIZE // 2]:
        waves.append(load_clip(p))
        labels.append(1)
    for p in spoof[: BATCH_SIZE // 2]:
        waves.append(load_clip(p))
        labels.append(0)

    wave = torch.from_numpy(np.stack(waves))
    label = torch.tensor(labels, dtype=torch.long)
    return wave, label


def main() -> None:
    torch.backends.cuda.matmul.allow_tf32 = False
    torch.backends.cudnn.allow_tf32 = False
    try:
        torch.backends.cudnn.conv.fp32_precision = "ieee"
    except Exception:
        pass

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")

    print("\n[1/4] Building batch from real clips...")
    wave, label = build_batch()
    print(f"  Waveform batch shape: {tuple(wave.shape)} (batch, 64600)")
    print(f"  Labels: {label.tolist()}  (bonafide=1, spoof=0)")

    print("\n[2/4] Loading reconstruction & freezing backbone...")
    model = load_w2v2_aasist()
    model = model.to(device)
    model.train()

    n_backbone = 0
    for p in model.ssl_model.parameters():
        p.requires_grad_(False)
        n_backbone += p.numel()
    n_trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  Backbone params frozen:  {n_backbone:,}")
    print(f"  Trainable (AASIST) params: {n_trainable:,}")
    assert n_trainable < n_backbone, "expected backbone to dominate"

    optimizer = torch.optim.Adam(
        [p for p in model.parameters() if p.requires_grad], lr=1e-4
    )
    class_weights = torch.tensor([1.0, 1.0], device=device)  # balanced subset
    criterion = nn.CrossEntropyLoss(weight=class_weights)

    print("\n[3/4] Training steps...")
    wave, label = wave.to(device), label.to(device)
    losses = []
    for step in range(1, STEPS + 1):
        optimizer.zero_grad()
        logits, _ = model(wave)
        loss = criterion(logits, label)
        loss.backward()

        g_backbone = [p.grad for p in model.ssl_model.parameters()]
        assert all(g is None for g in g_backbone), (
            "frozen backbone received a gradient!"
        )

        # The dead-code encoder bn1 parameters (faithfully replicated from
        # SSL_Anti-spoofing/model.py) are NOT part of the computational
        # graph and therefore legitimately receive no gradient.
        dead_bn1 = re.compile(r"^encoder\.\d\.0\.bn1\.")

        backend_untouched = [
            name
            for name, p in model.named_parameters()
            if p.requires_grad
            and not dead_bn1.match(name)
            and (p.grad is None or float(p.grad.abs().sum()) == 0)
        ]
        assert not backend_untouched, (
            f"AASIST backend got no gradients for: {backend_untouched}"
        )
        named_grads = {
            name: float(p.grad.abs().sum())
            for name, p in model.named_parameters()
            if p.requires_grad and not dead_bn1.match(name)
        }
        for probe in ("LL.weight", "out_layer.weight", "GAT_layer_S.att_weight"):
            assert named_grads.get(probe, 0) > 0, f"no gradient for {probe}"

        optimizer.step()
        losses.append(float(loss.item()))
        print(f"  Step {step}: loss={loss.item():.5f}")
        del logits, loss
        torch.cuda.empty_cache() if device == "cuda" else None

    print("\n[4/4] Checking learning signal...")
    improved = losses[-1] < losses[0]
    print(f"  Loss trajectory: {' -> '.join(f'{l:.5f}' for l in losses)}")
    ok = improved and losses[0] > 0 and np.isfinite(losses).all()

    print("\n" + "=" * 70)
    print(f"VERDICT: {'PASS' if ok else 'FAIL'}")
    print(f"  loss decreased:  {improved}")
    print(f"  finite losses:   {np.isfinite(losses).all()}")
    print("=" * 70)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()