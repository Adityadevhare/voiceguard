"""Export the authoritative Fairseq XLS-R 300M feature representation.

This script is the *reference implementation* for Phase 3. It loads the
original ``xlsr2_300m.pt`` checkpoint through the exact code path used by
the original ``SSL_Anti-spoofing`` repository
(``fairseq.checkpoint_utils.load_model_ensemble_and_task``) and runs the
same forward the original ``SSLModel.extract_feat`` performs:

    model(waveform, mask=False, features_only=True)["x"]

It saves the deterministic audio + the 1024-dimensional contextual
features to ``training/artifacts/fairseq_xlsr_features.npz`` so the
reconstructed Transformers model can be compared numerically.

Run in the legacy-compatible environment (aasist-venv):

    python training/export_fairseq_xlsr_features.py
"""

import sys
from pathlib import Path

import numpy as np

# Old Fairseq still references the removed numpy aliases.
for _name, _val in [("float", float), ("int", int), ("bool", bool), ("object", object), ("str", str)]:
    if not hasattr(np, _name):
        setattr(np, _name, _val)

VENDEED_FAIRSEQ = Path(
    r"D:\SIH 2026\ml-service\SSL_Anti-spoofing\fairseq-a54021305d6b3c4c5959ac9395135f63202db8f1"
)
CKPT = Path(r"D:\SIH 2026\ml-service\models\w2v2-aasist\xlsr2_300m.pt")
ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"

SAMPLE_RATE = 16000
TARGET_SAMPLES = 64600


def build_input_audio() -> np.ndarray:
    """Deterministic 16 kHz mono float32 input (identical every run/env)."""
    rng = np.random.RandomState(0)
    return rng.randn(TARGET_SAMPLES).astype(np.float32)


def main() -> None:
    sys.path.insert(0, str(VENDEED_FAIRSEQ))

    import torch

    # Force IEEE fp32 for deterministic, numerically transparent math.
    # cuDNN TF32 (default True) is the biggest cross-version noise source
    # on the Ampere GPU and must be disabled symmetrically on both the
    # reference and the reconstruction side.
    torch.backends.cuda.matmul.allow_tf32 = False
    torch.backends.cudnn.allow_tf32 = False

    from fairseq.checkpoint_utils import load_model_ensemble_and_task

    print("Loading original Fairseq XLS-R via load_model_ensemble_and_task...")
    model, _cfg, _task = load_model_ensemble_and_task([str(CKPT)])
    ssl = model[0]
    print("Loaded:", type(ssl).__name__)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    ssl = ssl.to(device)
    ssl.eval()

    audio = build_input_audio()
    wave = torch.from_numpy(audio).unsqueeze(0).to(device)

    print("Running features_only forward...")
    with torch.no_grad():
        out = ssl(wave, mask=False, features_only=True)
    features = out["x"].float().cpu().numpy()

    print("Features shape:", features.shape)
    print("Features mean abs:", float(np.abs(features).mean()))

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ARTIFACT_DIR / "fairseq_xlsr_features.npz"
    np.savez_compressed(
        out_path,
        audio=audio,
        features=features,
        note=(
            "Reference: fairseq Wav2Vec2Model loaded from xlsr2_300m.pt "
            "via load_model_ensemble_and_task; forward(wave, mask=False, "
            "features_only=True)['x']; fp32 eval mode."
        ),
    )
    print("Saved reference features to:", out_path)


if __name__ == "__main__":
    main()