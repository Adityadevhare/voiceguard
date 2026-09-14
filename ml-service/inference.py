import time

import numpy as np
import onnxruntime as ort
import soundfile as sf


MODEL_PATH = r".\models\w2v2-aasist\w2v2-aasist.onnx"

TARGET_SAMPLE_RATE = 16000
TARGET_SAMPLES = 64600


class W2V2AASIST:
    def __init__(self, model_path: str = MODEL_PATH):
        print("Loading W2V2-AASIST...")

        ort.preload_dlls(directory="")

        self.session = ort.InferenceSession(
            model_path,
            providers=[
                "CUDAExecutionProvider",
                "CPUExecutionProvider",
            ],
        )

        self.input_name = self.session.get_inputs()[0].name

        print("Model loaded.")
        print("Execution providers:", self.session.get_providers())
        print("Input:", self.input_name)

    def prepare_audio(self, audio: np.ndarray) -> np.ndarray:
        audio = np.asarray(audio, dtype=np.float32)

        if audio.ndim > 1:
            audio = np.mean(audio, axis=1)

        if len(audio) >= TARGET_SAMPLES:
            audio = audio[:TARGET_SAMPLES]
        else:
            repeats = int(np.ceil(TARGET_SAMPLES / len(audio)))
            audio = np.tile(audio, repeats)[:TARGET_SAMPLES]

        return audio.astype(np.float32)

    def predict_file(self, audio_path: str) -> dict:
        audio, sample_rate = sf.read(audio_path)

        if sample_rate != TARGET_SAMPLE_RATE:
            raise ValueError(
                f"Expected {TARGET_SAMPLE_RATE} Hz audio, "
                f"got {sample_rate} Hz"
            )

        audio = self.prepare_audio(audio)
        input_tensor = audio[np.newaxis, :]

        start = time.perf_counter()

        outputs = self.session.run(
            None,
            {self.input_name: input_tensor},
        )

        elapsed_ms = (time.perf_counter() - start) * 1000

        logits = outputs[0][0]

        return {
            "logit0": float(logits[0]),
            "logit1": float(logits[1]),
            "inferenceTimeMs": round(elapsed_ms, 2),
        }