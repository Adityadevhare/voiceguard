"""Phase 5 verification: PyTorch reconstruction vs deployed ONNX export.

Runs the same 64600-sample waveform through both:
  * the ONNX runtime session deployed in ``inference.py``
    (CUDAExecutionProvider + CPUExecutionProvider), and
  * the PyTorch reconstruction logits persisted in Phase 4.

Because the ONNX model was exported from the *fine-tuned* original
``LA_model.pth`` (same weights our reconstruction loads), a matching
architecture should produce near-identical logits up to fp kernel
implementation noise.

Run with the ``aasist-venv`` interpreter (has onnxruntime).
"""

import sys
from pathlib import Path

import numpy as np

import onnxruntime as ort

MODEL_DIR = Path(__file__).resolve().parents[1] / "models" / "w2v2-aasist"
ONNX_PATH = MODEL_DIR / "w2v2-aasist.onnx"
ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
PYTORCH_REF_PATH = ARTIFACT_DIR / "w2v2_aasist_pytorch_reference.npz"
OUT_PATH = ARTIFACT_DIR / "w2v2_aasist_onnx_comparison.npz"

TOLERANCE_ABS = 1e-2  # logits are O(1); 1e-2 cleanly separates a matching
TOLERANCE_REL = 1e-1  # architecture from a wrong weight layout (diff ~1.0)


def main() -> None:
    print("=" * 70)
    print("PYTORCH RECONSTRUCTION vs ONNX PARITY")
    print("=" * 70)

    print("\n[1/4] Loading PyTorch reference logits...")
    data = np.load(PYTORCH_REF_PATH)
    audio = data["audio"]
    torch_logits = data["logits"]
    print(f"  PyTorch logits: {torch_logits}")

    print(f"\n[2/4] Loading ONNX session ({ONNX_PATH.name})...")
    ort.preload_dlls(directory="")
    session = ort.InferenceSession(
        str(ONNX_PATH),
        providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
    )
    print("  Providers:", session.get_providers())

    input_name = session.get_inputs()[0].name
    print(f"  Input '{input_name}' shape: {session.get_inputs()[0].shape}")

    print("\n[3/4] Running ONNX forward...")
    input_tensor = audio[np.newaxis, :]
    outputs = session.run(None, {input_name: input_tensor})
    print(f"  Num outputs: {len(outputs)}")

    if len(outputs) == 1:
        onnx_logits = outputs[0][0]
    else:
        onnx_logits = outputs[0][0]
        for i, out in enumerate(outputs[1:], start=1):
            print(f"  Output[{i}] shape: {out.shape}")

    print(f"  ONNX logits: {onnx_logits}")
    onnx_logits = np.asarray(onnx_logits, dtype=np.float32)

    print("\n[4/4] Comparing logits...")
    max_abs = float(np.max(np.abs(torch_logits - onnx_logits)))
    mean_abs = float(np.mean(np.abs(torch_logits - onnx_logits)))
    with np.errstate(divide="ignore", invalid="ignore"):
        rel = np.abs(torch_logits - onnx_logits) / np.maximum(
            1e-12, np.abs(torch_logits))
    max_rel = float(np.max(rel))
    print(f"  Max abs diff: {max_abs:.6e}")
    print(f"  Mean abs diff: {mean_abs:.6e}")
    print(f"  Max rel diff: {max_rel:.6e}")

    ok_abs = max_abs <= TOLERANCE_ABS
    ok_rel = max_rel <= TOLERANCE_REL
    verdict = ok_abs and ok_rel

    print("\n" + "=" * 70)
    print(f"VERDICT: {'PASS' if verdict else 'FAIL'}")
    print(f"  max abs diff {max_abs:.4e} <= {TOLERANCE_ABS} ? {ok_abs}")
    print(f"  max rel diff {max_rel:.4e} <= {TOLERANCE_REL} ? {ok_rel}")
    print("=" * 70)

    np.savez(
        OUT_PATH,
        audio=audio,
        torch_logits=torch_logits,
        onnx_logits=onnx_logits,
        max_abs_diff=max_abs,
        max_rel_diff=max_rel,
    )
    print(f"\nSaved comparison to: {OUT_PATH}")

    sys.exit(0 if verdict else 1)


if __name__ == "__main__":
    main()