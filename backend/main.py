from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
from model_service import ECGInferenceService
from image_processor import ECGImageProcessor
import json

app = FastAPI(title="CardioAI ECG Interpreter API")

# Add CORS so the local frontend can talk to it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the inference service
inference_service = ECGInferenceService()
# Initialize the image processing service
image_processor = ECGImageProcessor()

@app.get("/")
def read_root():
    return {"message": "CardioAI Backend is running."}

@app.post("/api/analyze")
async def analyze_ecg(file: UploadFile = File(...)):
    
    try:
        contents = await file.read()
        signal = None
        
        # Determine if it's JSON array or Image
        if file.filename.endswith('.json'):
            ecg_data = json.loads(contents)
            if 'signal' not in ecg_data:
                raise HTTPException(status_code=400, detail="JSON must contain a 'signal' key array.")
            signal = ecg_data['signal']
            
        elif file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            # It's an image. Process it!
            signal = image_processor.process_image(contents)
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload JSON or an Image.")

        # Run inference
        results = inference_service.predict(signal)
        return results
        
    except Exception as e:
        print(f"Error during analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
