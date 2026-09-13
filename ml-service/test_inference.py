import time

import numpy as np
import onnxruntime as ort
import soundfile as sf

MODEL_PATH = r".\models\w2v2-aasist\w2v2-aasist.onnx"
AUDIO_PATH = r".\test.wav"

TARGET_SAMPLES = 64600


def prepare_audio(audio: np.ndarray) -> np.ndarray:
    audio = np.asarray(audio, dtype=np.float32)

    # Safety: convert stereo/multi-channel to mono.
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)

    # Match the model's fixed input length.
    if len(audio) >= TARGET_SAMPLES:
        audio = audio[:TARGET_SAMPLES]
    else:
        repeats = int(np.ceil(TARGET_SAMPLES / len(audio)))
        audio = np.tile(audio, repeats)[:TARGET_SAMPLES]

    return audio.astype(np.float32)


print("Loading audio...")
audio, sample_rate = sf.read(AUDIO_PATH)

print(f"Sample rate: {sample_rate}")
print(f"Original samples: {len(audio)}")
print(f"Original duration: {len(audio) / sample_rate:.3f}s")

if sample_rate != 16000:
    raise ValueError(f"Expected 16000 Hz audio, got {sample_rate} Hz")

audio = prepare_audio(audio)

print(f"Model input shape: {audio.shape}")

print("\nLoading ONNX Runtime...")
ort.preload_dlls(directory="")

session = ort.InferenceSession(
    MODEL_PATH,
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
)

print("Execution providers:", session.get_providers())

input_name = session.get_inputs()[0].name
print("Input name:", input_name)

print("\nRunning inference...")

input_tensor = audio[np.newaxis, :]

start = time.perf_counter()

outputs = session.run(
    None,
    {input_name: input_tensor},
)

elapsed_ms = (time.perf_counter() - start) * 1000

logits = outputs[0]

print("\n========== RESULT ==========")
print("Logits:", logits)
print("Output shape:", logits.shape)
print(f"Inference time: {elapsed_ms:.2f} ms")
print("============================")