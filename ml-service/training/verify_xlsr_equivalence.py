"""Numerical equivalence test: original Fairseq XLS-R vs Transformers reconstruction.

The reference can either be computed inline (when this script runs in the
environment that can import the vendored fairseq, e.g. aasist-venv) or
loaded from a precomputed artifact produced by
``export_fairseq_xlsr_features.py``.

Both models run with the same deterministic 16 kHz input, in eval mode and
float32 precision. The compared representation is the 1024-dimensional
contextual encoder output (``["x"]`` in fairseq /
``last_hidden_state`` in Transformers) — the layer that feeds the AASIST
``LL`` projection in the original W2V2-AASIST pipeline.

Run (preferred):

    python training/verify_xlsr_equivalence.py
"""

import sys
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from xlsr import XLSR_CHECKPOINT_PATH, load_reconstructed_xlsr  # noqa: E402


def _force_ieee_fp32() -> None:
    """Disable TF32 so both sides run pure IEEE fp32 numerics."""
    torch.backends.cuda.matmul.allow_tf32 = False
    torch.backends.cudnn.allow_tf32 = False
    try:
        torch.backends.cudnn.conv.fp32_precision = "ieee"  # torch >= 2.9
    except Exception:
        pass

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
REFERENCE_PATH = ARTIFACT_DIR / "fairseq_xlsr_features.npz"

TOLERANCE_ABS = 1e-4
TOLERANCE_REL = 1e-2


def _numpy_shim() -> None:
    for _name, _val in [("float", float), ("int", int), ("bool", bool), ("object", object), ("str", str)]:
        if not hasattr(np, _name):
            setattr(np, _name, _val)


def compute_fairseq_reference(audio: np.ndarray) -> np.ndarray:
    """Run the genuine fairseq model inline."""
    _numpy_shim()
    _force_ieee_fp32()
    vendored = r"D:\SIH 2026\ml-service\SSL_Anti-spoofing\fairseq-a54021305d6b3c4c5959ac9395135f63202db8f1"
    sys.path.insert(0, vendored)

    from fairseq.checkpoint_utils import load_model_ensemble_and_task

    model, _cfg, _task = load_model_ensemble_and_task([str(XLSR_CHECKPOINT_PATH)])
    ssl = model[0]
    device = "cuda" if torch.cuda.is_available() else "cpu"
    ssl = ssl.to(device)
    ssl.eval()

    wave = torch.from_numpy(audio).unsqueeze(0).to(device)
    with torch.no_grad():
        out = ssl(wave, mask=False, features_only=True)
    return out["x"].float().cpu().numpy()


def load_reference(audio: np.ndarray) -> np.ndarray:
    if REFERENCE_PATH.exists():
        data = np.load(REFERENCE_PATH)
        ref_audio = data["audio"]
        ref_features = data["features"]
        assert np.array_equal(ref_audio, audio), "Reference audio mismatch."
        return ref_features

    if not sys.modules.get(
        "fairseq"
    ):  # try inline only if fairseq is importable
        return compute_fairseq_reference(audio)

    raise FileNotFoundError(
        f"Reference features not found at {REFERENCE_PATH} and fairseq "
        "is not importable in this environment. Run "
        "training/export_fairseq_xlsr_features.py first."
    )


def main() -> None:
    rng = np.random.RandomState(0)
    audio = rng.randn(64600).astype(np.float32)

    print("=" * 70)
    print("XLS-R RECONSTRUCTION NUMERICAL EQUIVALENCE")
    print("=" * 70)

    print("\n[1/4] Loading reference (original fairseq XLS-R)...")
    ref_features = load_reference(audio)
    print("  Reference features shape:", ref_features.shape)

    print("\n[2/4] Loading Transformers reconstruction...")
    _force_ieee_fp32()

    model = load_reconstructed_xlsr()
    model.eval()

    print("\n[3/4] Running reconstruction forward...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    wave = torch.from_numpy(audio).unsqueeze(0).to(device)
    with torch.no_grad():
        out = model(wave)
    rec_features = out.last_hidden_state.float().cpu().numpy()
    print("  Reconstruction features shape:", rec_features.shape)

    print("\n[4/4] Comparing representations...")
    if rec_features.shape != ref_features.shape:
        print("FAIL: shape mismatch", rec_features.shape, ref_features.shape)
        sys.exit(1)

    diff = rec_features - ref_features
    abs_diff = np.abs(diff)
    max_abs = float(abs_diff.max())
    mean_abs = float(abs_diff.mean())

    ref_norm = float(np.abs(ref_features).mean())
    mean_rel = mean_abs / (ref_norm + 1e-12)
    max_rel = max_abs / (ref_norm + 1e-12)

    # Scale-invariant check: cosine similarity between flattened vectors.
    cos_sim = float(
        np.dot(rec_features.ravel(), ref_features.ravel())
        / (np.linalg.norm(rec_features.ravel()) * np.linalg.norm(ref_features.ravel()) + 1e-12)
    )

    print(f"  Shape:            {rec_features.shape} vs {ref_features.shape}")
    print(f"  Max abs diff:     {max_abs:.3e}")
    print(f"  Mean abs diff:    {mean_abs:.3e}")
    print(f"  Reference mean|.|: {ref_norm:.4f}")
    print(f"  Mean rel diff:    {mean_rel:.3e}")
    print(f"  Max rel diff:     {max_rel:.3e}")
    print(f"  Cosine similarity: {cos_sim:.10f}")

    verdict = "PASS" if max_abs <= TOLERANCE_ABS else "FAIL"
    print("\n" + "=" * 70)
    print(f"VERDICT: {verdict}")
    print(f"  max abs diff {max_abs:.3e} <= tolerance {TOLERANCE_ABS:.3e} ? {max_abs <= TOLERANCE_ABS}")
    print("=" * 70)

    if verdict != "PASS":
        sys.exit(1)


if __name__ == "__main__":
    main()