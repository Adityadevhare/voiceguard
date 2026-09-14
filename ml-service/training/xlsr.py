"""Shared XLS-R reconstruction utilities.

Reconstructs the original Fairseq XLS-R 300M ``wav2vec2`` backbone
(checkpoint ``xlsr2_300m.pt``) inside a modern ``transformers``
``Wav2Vec2Model`` while preserving the original pretrained weights.

The mapping was validated against the checkpoint in
``test_xlsr_mapping.py`` (429 fairseq tensors, 7 pretraining-only
tensors skipped, 422 transformers tensors, 0 missing, 0 unexpected).
"""

import re
from pathlib import Path

import torch
from transformers import Wav2Vec2Config, Wav2Vec2Model

MODELS_DIR = Path(__file__).resolve().parents[1] / "models" / "w2v2-aasist"
XLSR_CHECKPOINT_PATH = MODELS_DIR / "xlsr2_300m.pt"

# These seven Fairseq tensors belong to the self-supervised pretraining
# objective and are not part of ``Wav2Vec2Model``.
PRETRAINING_ONLY_KEYS = (
    "final_proj.weight",
    "final_proj.bias",
    "project_q.weight",
    "project_q.bias",
    "quantizer.vars",
    "quantizer.weight_proj.weight",
    "quantizer.weight_proj.bias",
)


def build_xlsr_config() -> Wav2Vec2Config:
    return Wav2Vec2Config(
        hidden_size=1024,
        num_hidden_layers=24,
        num_attention_heads=16,
        intermediate_size=4096,
        hidden_act="gelu",
        hidden_dropout=0.0,
        activation_dropout=0.0,
        attention_dropout=0.0,
        feat_proj_dropout=0.0,
        feat_extract_norm="layer",
        feat_extract_activation="gelu",
        conv_dim=(512, 512, 512, 512, 512, 512, 512),
        conv_stride=(5, 2, 2, 2, 2, 2, 2),
        conv_kernel=(10, 3, 3, 3, 3, 2, 2),
        conv_bias=True,
        num_conv_pos_embeddings=128,
        num_conv_pos_embedding_groups=16,
        do_stable_layer_norm=True,
        layerdrop=0.0,
        initializer_range=0.02,
        layer_norm_eps=1e-5,
        apply_spec_augment=False,
    )


def fairseq_to_transformers_key(key: str) -> str | None:
    if key in PRETRAINING_ONLY_KEYS:
        return None

    if key == "mask_emb":
        return "masked_spec_embed"

    if key == "post_extract_proj.weight":
        return "feature_projection.projection.weight"

    if key == "post_extract_proj.bias":
        return "feature_projection.projection.bias"

    # Fairseq applies LayerNorm on the raw conv features before the
    # post-extract projection. Transformers mirrors this inside
    # Wav2Vec2FeatureProjection (layer_norm -> projection).
    if key == "layer_norm.weight":
        return "feature_projection.layer_norm.weight"

    if key == "layer_norm.bias":
        return "feature_projection.layer_norm.bias"

    # Convolutional feature extractor.
    match = re.match(
        r"feature_extractor\.conv_layers\.(\d+)\.0\.(weight|bias)$",
        key,
    )
    if match:
        index, parameter = match.groups()
        return f"feature_extractor.conv_layers.{index}.conv.{parameter}"

    match = re.match(
        r"feature_extractor\.conv_layers\.(\d+)\.2\.1\.(weight|bias)$",
        key,
    )
    if match:
        index, parameter = match.groups()
        return f"feature_extractor.conv_layers.{index}.layer_norm.{parameter}"

    # Positional convolution.
    if key == "encoder.pos_conv.0.bias":
        return "encoder.pos_conv_embed.conv.bias"

    if key == "encoder.pos_conv.0.weight_g":
        return "encoder.pos_conv_embed.conv.parametrizations.weight.original0"

    if key == "encoder.pos_conv.0.weight_v":
        return "encoder.pos_conv_embed.conv.parametrizations.weight.original1"

    # Transformer encoder layers.
    match = re.match(r"encoder\.layers\.(\d+)\.self_attn\.(.+)$", key)
    if match:
        index, remainder = match.groups()
        return f"encoder.layers.{index}.attention.{remainder}"

    match = re.match(r"encoder\.layers\.(\d+)\.fc1\.(.+)$", key)
    if match:
        index, remainder = match.groups()
        return f"encoder.layers.{index}.feed_forward.intermediate_dense.{remainder}"

    match = re.match(r"encoder\.layers\.(\d+)\.fc2\.(.+)$", key)
    if match:
        index, remainder = match.groups()
        return f"encoder.layers.{index}.feed_forward.output_dense.{remainder}"

    match = re.match(r"encoder\.layers\.(\d+)\.self_attn_layer_norm\.(.+)$", key)
    if match:
        index, remainder = match.groups()
        return f"encoder.layers.{index}.layer_norm.{remainder}"

    match = re.match(r"encoder\.layers\.(\d+)\.final_layer_norm\.(.+)$", key)
    if match:
        index, remainder = match.groups()
        return f"encoder.layers.{index}.final_layer_norm.{remainder}"

    # Final encoder layer norm.
    if key == "encoder.layer_norm.weight":
        return "encoder.layer_norm.weight"

    if key == "encoder.layer_norm.bias":
        return "encoder.layer_norm.bias"

    return None


def build_reconstructed_xlsr() -> Wav2Vec2Model:
    config = build_xlsr_config()
    return Wav2Vec2Model(config)


def map_fairseq_checkpoint(
    checkpoint_path: Path = XLSR_CHECKPOINT_PATH,
) -> tuple[dict[str, torch.Tensor], list[str]]:
    """Map the Fairseq checkpoint's model state_dict to transformers keys.

    Returns ``(mapped_state, skipped_keys)`` where ``mapped_state`` uses
    only keys that exist in the empty transformers model.
    """
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    fairseq_state = checkpoint["model"]

    transformers_state = build_reconstructed_xlsr().state_dict()

    mapped_state: dict[str, torch.Tensor] = {}
    skipped: list[str] = []

    for fairseq_key, tensor in fairseq_state.items():
        transformers_key = fairseq_to_transformers_key(fairseq_key)

        if transformers_key is None:
            skipped.append(fairseq_key)
            continue

        if transformers_key not in transformers_state:
            raise KeyError(
                f"Mapped key does not exist in Transformers model:\n"
                f"Fairseq: {fairseq_key}\n"
                f"Transformers: {transformers_key}"
            )

        expected_shape = tuple(transformers_state[transformers_key].shape)
        actual_shape = tuple(tensor.shape)
        if actual_shape != expected_shape:
            raise ValueError(
                f"Shape mismatch:\n"
                f"Fairseq: {fairseq_key} {actual_shape}\n"
                f"Transformers: {transformers_key} {expected_shape}"
            )

        mapped_state[transformers_key] = tensor

    missing = sorted(set(transformers_state.keys()) - set(mapped_state.keys()))
    unexpected = sorted(set(mapped_state.keys()) - set(transformers_state.keys()))

    if missing or unexpected:
        raise RuntimeError(
            f"Mapping is incomplete: missing={missing} unexpected={unexpected}"
        )

    return mapped_state, skipped


def load_reconstructed_xlsr(
    checkpoint_path: Path = XLSR_CHECKPOINT_PATH,
) -> Wav2Vec2Model:
    model = build_reconstructed_xlsr()
    mapped_state, _ = map_fairseq_checkpoint(checkpoint_path)
    model.load_state_dict(mapped_state, strict=True)
    return model