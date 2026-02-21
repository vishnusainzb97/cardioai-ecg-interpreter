import torch
import numpy as np
import scipy.signal as signal
from train.model import ECGResNet1D
from train.preprocess_data import butter_bandpass_filter, WINDOW_SIZE
import os

class ECGInferenceService:
    def __init__(self):
        # Determine the device
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu')
        
        # Load the PyTorch Model Architecture
        self.model = ECGResNet1D(num_classes=2)
        
        # Load the trained weights
        model_path = os.path.join(os.path.dirname(__file__), "model_weights.pth")
        
        try:
            self.model.load_state_dict(torch.load(model_path, map_location=self.device, weights_only=True))
            print(f"Loaded trained model from {model_path} onto {self.device}")
        except FileNotFoundError:
            print(f"WARNING: No trained model weights found at {model_path}! Inference will use random weights.")
            
        self.model.to(self.device)
        self.model.eval()

    def preprocess_signal(self, raw_signal, fs=360):
        """
        Filters the raw frontend signal the same way training data was filtered.
        Finds simple R-peaks to segment the signal into beats.
        """
        # 1. Bandpass filter
        filtered_ecg = butter_bandpass_filter(np.array(raw_signal), fs=fs)
        
        # 2. Basic R-peak detection (using scipy find_peaks)
        # We assume the signal is somewhat clean enough for a simple peak detector here, 
        # normally one would use Pan-Tompkins but scipy is fast for this prototype.
        # Height threshold is dependent on the signal amplitude, we compute a dynamic one
        threshold = np.mean(filtered_ecg) + 0.8 * np.std(filtered_ecg)
        peaks, _ = signal.find_peaks(filtered_ecg, height=threshold, distance=fs*0.4) # At least 0.4s between beats
        
        segments = []
        peak_indices = []
        
        # 3. Extract 360-length windows around each peak
        for peak in peaks:
            left = peak - (WINDOW_SIZE // 2)
            right = peak + (WINDOW_SIZE // 2)
            
            if left >= 0 and right < len(filtered_ecg):
                beat_segment = filtered_ecg[left:right]
                # Normalize exactly like training
                normalized_beat = (beat_segment - np.mean(beat_segment)) / (np.std(beat_segment) + 1e-8)
                segments.append(normalized_beat)
                peak_indices.append(int(peak))
                
        return np.array(segments), peak_indices

    def predict(self, raw_signal):
        """
        Accepts a full raw ECG array, segments it, and classifies each beat.
        Returns a summary report for the frontend.
        """
        if len(raw_signal) < 360:
            return {"confidence": 0, "diagnosis": "Error: Signal too short.", "riskLevel": "Unknown", "abnormalBeats": 0, "totalBeats": 0}

        # 1. Preprocess and get segmented beats
        X, peak_indices = self.preprocess_signal(raw_signal)
        
        if len(X) == 0:
            return {"confidence": 0, "diagnosis": "Could not detect any clear heartbeats.", "riskLevel": "Unknown", "abnormalBeats": 0, "totalBeats": 0}

        # 2. Reshape for PyTorch model (Batch, Channels, Length)
        X_tensor = torch.tensor(X, dtype=torch.float32).unsqueeze(1).to(self.device)
        
        # 3. Predict
        with torch.no_grad():
            outputs = self.model(X_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted_classes = torch.max(probabilities, 1)
            
        predicted_classes = predicted_classes.cpu().numpy()
        confidence = confidence.cpu().numpy()
        
        # 4. Synthesize results
        total_beats = len(predicted_classes)
        # Class 1 is Arrhythmia, Class 0 is Normal
        arrhythmias = np.sum(predicted_classes == 1)
        
        # Generate an interpretation
        diagnosis = "Normal Sinus Rhythm"
        risk_level = "Low"
        overall_confidence = np.mean(confidence) * 100
        
        if arrhythmias > 0:
            percentage_abnormal = (arrhythmias / total_beats) * 100
            if percentage_abnormal > 15:
                # If more than 15% of beats are abnormal, flag as high risk
                diagnosis = "Frequent Arrhythmia Detected. Please consult a cardiologist immediately."
                risk_level = "High"
            else:
                diagnosis = "Occasional Ectopic/Abnormal beats detected."
                risk_level = "Medium"

        return {
            "totalBeats": int(total_beats),
            "abnormalBeats": int(arrhythmias),
            "diagnosis": diagnosis,
            "riskLevel": risk_level,
            "confidence": round(float(overall_confidence), 1),
            # Optional: Return detailed anomaly indices for frontend plotting
            "anomalyIndices": [peak_indices[i] for i in range(total_beats) if predicted_classes[i] == 1]
        }
