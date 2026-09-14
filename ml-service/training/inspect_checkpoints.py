from pathlib import Path

import torch


MODELS_DIR = Path(r"D:\SIH 2026\ml-service\models\w2v2-aasist")


def inspect_xlsr() -> None:
    ckpt = torch.load(MODELS_DIR / "xlsr2_300m.pt", map_location="cpu", weights_only=False)
    state = ckpt["model"]
    print("=== XLS-R CHECKPOINT ===")
    print("keys:", len(state))
    print("cfg keys:", list(ckpt.keys()))
    cfg = ckpt["cfg"]["model"]
    print("model cfg:")
    for k, v in cfg.items():
        print(f"  {k}: {v}")


def inspect_la() -> None:
    ckpt = torch.load(MODELS_DIR / "LA_model.pth", map_location="cpu", weights_only=False)
    state = ckpt if isinstance(ckpt, dict) and "ssl_model" in ckpt else ckpt.get("model_state_dict", ckpt)
    print("=== LA_MODEL.PTH ===")
    print("top-level type:", type(ckpt))
    if isinstance(ckpt, dict):
        print("top-level keys:", list(ckpt.keys())[:20])
    print("tensor keys:", len(state))
    ssl_keys = [k for k in state if k.startswith("ssl_model")]
    non_ssl = [k for k in state if not k.startswith("ssl_model")]
    print("ssl_model keys:", len(ssl_keys))
    print("non-ssl (AASIST) keys:", len(non_ssl))
    print("sample ssl_model keys:")
    for k in ssl_keys[:8]:
        print(f"  {k}: {tuple(state[k].shape)}")
    print("sample ssl_model last keys:")
    for k in ssl_keys[-3:]:
        print(f"  {k}: {tuple(state[k].shape)}")
    print("non-ssl keys:")
    for k in sorted(non_ssl):
        print(f"  {k}: {tuple(state[k].shape)}")


if __name__ == "__main__":
    inspect_xlsr()
    inspect_la()