import torch

from xlsr import (
    XLSR_CHECKPOINT_PATH,
    build_reconstructed_xlsr,
    fairseq_to_transformers_key,
)


def main() -> None:
    print("Loading Fairseq XLS-R checkpoint...")

    checkpoint = torch.load(
        XLSR_CHECKPOINT_PATH,
        map_location="cpu",
        weights_only=False,
    )

    fairseq_state = checkpoint["model"]

    print("Building Transformers XLS-R architecture...")

    model = build_reconstructed_xlsr()

    transformers_state = model.state_dict()

    mapped_state = {}
    skipped = []

    print()
    print("Mapping Fairseq parameters...")

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

    missing = sorted(
        set(transformers_state.keys()) - set(mapped_state.keys())
    )

    unexpected = sorted(
        set(mapped_state.keys()) - set(transformers_state.keys())
    )

    print()
    print("=" * 70)
    print("MAPPING VERIFICATION")
    print("=" * 70)

    print(f"Fairseq tensors:          {len(fairseq_state)}")
    print(f"Skipped pretraining:      {len(skipped)}")
    print(f"Mapped tensors:            {len(mapped_state)}")
    print(f"Transformers tensors:      {len(transformers_state)}")
    print(f"Missing Transformers keys: {len(missing)}")
    print(f"Unexpected mapped keys:    {len(unexpected)}")

    print()
    print("Skipped Fairseq tensors:")

    for key in skipped:
        print(f"  {key}")

    if missing:
        print()
        print("MISSING TRANSFORMERS KEYS:")
        for key in missing:
            print(f"  {key}")

    if unexpected:
        print()
        print("UNEXPECTED MAPPED KEYS:")
        for key in unexpected:
            print(f"  {key}")

    if missing or unexpected:
        raise RuntimeError(
            "Mapping is incomplete. Do not load or train the model yet."
        )

    print()
    print("Loading mapped weights with strict=True...")

    load_result = model.load_state_dict(
        mapped_state,
        strict=True,
    )

    print(load_result)

    print()
    print("=" * 70)
    print("SUCCESS")
    print("=" * 70)
    print("All 422 Transformers tensors were matched and loaded.")
    print("The Fairseq XLS-R backbone can be reconstructed safely.")


if __name__ == "__main__":
    main()