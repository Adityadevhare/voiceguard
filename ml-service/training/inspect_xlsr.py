from pathlib import Path

import torch


CHECKPOINT_PATH = Path(
    r"D:\SIH 2026\ml-service\models\w2v2-aasist\xlsr2_300m.pt"
)


def main() -> None:
    print("Loading XLS-R checkpoint...")
    
    checkpoint = torch.load(
        CHECKPOINT_PATH,
        map_location="cpu",
        weights_only=False,
    )

    state_dict = checkpoint["model"]

    print()
    print("Checkpoint loaded successfully.")
    print(f"Total tensors: {len(state_dict)}")

    print()
    print("Architecture configuration:")
    cfg = checkpoint["cfg"]["model"]

    for key in [
        "_name",
        "encoder_layers",
        "encoder_embed_dim",
        "encoder_ffn_embed_dim",
        "encoder_attention_heads",
        "activation_fn",
        "layer_norm_first",
        "final_dim",
        "conv_feature_layers",
    ]:
        print(f"{key}: {cfg.get(key)}")

    print()
    print("Sample checkpoint tensors:")

    for key in list(state_dict.keys())[:25]:
        print(f"{key}: {tuple(state_dict[key].shape)}")


if __name__ == "__main__":
    main()