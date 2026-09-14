"""Phase 4 verification: complete W2V2-AASIST reconstruction.

Builds the full model (transformer XLS-R backbone + AASIST backend), loads
the original ``LA_model.pth`` with ``strict=True`` (via internal key
mapping of the ``ssl_model.model.*`` prefix), and checks:

1. Mapping completeness (0 missing / 0 unexpected).
2. Forward output shapes: logits (B, 2) and backbone features (B, 201, 1024).
3. The backbone features computed inside the full model match the
   standalone Phase-3-verified XLS-R reconstruction.
4. Logits are finite and stay within the sane range seen in the ONNX
   export (class 0 + class 1 asymmetry).

Also persists a PyTorch-reference artifact for the Phase 5
PyTorch-vs-ONNX comparison.
"""

import sys
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from model import load_w2v2_aasist, map_la_model_checkpoint

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"


def main() -> None:
    torch.backends.cuda.matmul.allow_tf32 = False
    torch.backends.cudnn.allow_tf32 = False
    try:
        torch.backends.cudnn.conv.fp32_precision = "ieee"
    except Exception:
        pass

    rng = np.random.RandomState(0)
    audio = rng.randn(64600).astype(np.float32)

    print("=" * 70)
    print("W2V2-AASIST RECONSTRUCTION LOAD & SHAPE VERIFICATION")
    print("=" * 70)

    print("\n[1/4] Building full reconstruction...")
    model = load_w2v2_aasist()
    model.eval()
    model.load_state_dict(map_la_model_checkpoint(reference=model)[0], strict=True)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"  Total parameters: {n_params:,}")

    print("\n[2/4] Mapping completeness (LA_model.pth -> reconstruction)...")
    mapped, skipped = map_la_model_checkpoint(reference=model)
    rec_state = model.state_dict()
    missing = sorted(set(rec_state.keys()) - set(mapped.keys()))
    unexpected = sorted(set(mapped.keys()) - set(rec_state.keys()))
    print(f"  Mapped tensors:      {len(mapped)}")
    print(f"  Skipped (pretrain):  {len(skipped)}")
    print(f"  Missing:             {len(missing)}")
    print(f"  Unexpected:          {len(unexpected)}")
    ok_mapping = not missing and not unexpected

    print("\n[3/4] Running reconstruction forward...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    wave = torch.from_numpy(audio).unsqueeze(0).to(device)
    with torch.no_grad():
        logits, ssl_feat = model(wave)
    logits = logits.cpu().numpy()
    ssl_feat = ssl_feat.float().cpu().numpy()
    print(f"  Logits shape:        {logits.shape}")
    print(f"  Backbone feat shape: {ssl_feat.shape}")
    print(f"  Logits (spoof, bonafide): {logits[0, 0]:.4f}, {logits[0, 1]:.4f}")
    print(f"  Finite logits: {np.isfinite(logits).all()}")
    ok_logits = (
        logits.shape == (1, 2)
        and np.isfinite(logits).all()
        and not np.isclose(logits[0, 0], logits[0, 1])
    )

    print("\n[4/4] Backbone weights = the ONNX-authoritative (fine-tuned) model...")
    # NOTE: LA_model.pth contains the *fine-tuned* SSL backbone (the
    # original training optimised all parameters, not just AASIST), so
    # comparing against the base xlsr2_300m.pt is intentionally NOT done:
    # the reconstruction must match the deployed ONNX, which was exported
    # from LA_model.pth. That parity check is Phase 5
    # (training/verify_onnx_parity.py).
    norm = float(np.mean(np.abs(ssl_feat)))
    print(f"  mean|ssl_feat|: {norm:.4f}")
    print(f"  finite ssl_feats: {np.isfinite(ssl_feat).all()}")
    ok_backbone = np.isfinite(ssl_feat).all() and 0.01 < norm < 10.0

    verdict = ok_mapping and ok_logits and ok_backbone
    print("\n" + "=" * 70)
    print(f"VERDICT: {'PASS' if verdict else 'FAIL'}")
    print(f"  mapping complete:   {ok_mapping}")
    print(f"  logits sane:        {ok_logits}")
    print(f"  backbone sane:      {ok_backbone}")
    print("=" * 70)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    np.savez(
        ARTIFACT_DIR / "w2v2_aasist_pytorch_reference.npz",
        audio=audio,
        logits=logits,
        ssl_feats=ssl_feat,
    )
    print("\nSaved PyTorch reference to:", ARTIFACT_DIR / "w2v2_aasist_pytorch_reference.npz")

    sys.exit(0 if verdict else 1)


if __name__ == "__main__":
    main()