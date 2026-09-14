import os
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile

from inference import W2V2AASIST


app = FastAPI(title="VoiceGuard ML Service")


# Load the model once when the ML service starts.
model = W2V2AASIST()


@app.get("/health")
def health():
    return {
        "success": True,
        "message": "VoiceGuard ML service is running",
    }


@app.post("/predict")
async def predict(audio: UploadFile = File(...)):
    if not audio.filename:
        raise HTTPException(
            status_code=400,
            detail="Audio filename is required",
        )

    if not audio.filename.lower().endswith(".wav"):
        raise HTTPException(
            status_code=400,
            detail="Currently only WAV audio is supported",
        )

    audio_bytes = await audio.read()

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".wav",
        ) as temp_file:
            temp_file.write(audio_bytes)
            temp_path = temp_file.name

        result = model.predict_file(temp_path)

        return {
            "success": True,
            "filename": audio.filename,
            "model": "W2V2-AASIST",
            "result": result,
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)