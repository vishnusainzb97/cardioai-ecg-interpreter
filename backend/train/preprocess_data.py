import os
import wfdb
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt
import glob

# Constants
FS = 360  # MIT-BIH sampling frequency
WINDOW_SIZE = 360  # 1 second window (0.5s before, 0.5s after R-peak)

# AAMI beat classes mapping (simplified to Normal vs Abnormal for initial model)
# N: Normal beat
# S: Supraventricular ectopic beat
# V: Ventricular ectopic beat
# F: Fusion beat
# Q: Unknown beat
aami_mapping = {
    'N': ['N', 'L', 'R', 'e', 'j'],
    'S': ['A', 'a', 'J', 'S'],
    'V': ['V', 'E'],
    'F': ['F'],
    'Q': ['/', 'f', 'Q']
}

# We'll formulate a binary classification problem: Normal (0) vs Arrhythmia (1)
def map_annotation_to_class(symbol):
    if symbol in aami_mapping['N']:
        return 0 # Normal
    elif symbol in aami_mapping['S'] or symbol in aami_mapping['V'] or symbol in aami_mapping['F'] or symbol in aami_mapping['Q']:
        return 1 # Arrhythmia
    else:
        return -1 # Ignore

def butter_bandpass(lowcut, highcut, fs, order=5):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    return b, a

def butter_bandpass_filter(data, lowcut=0.5, highcut=40.0, fs=360, order=5):
    """
    Apply a bandpass filter to remove baseline wander and high-frequency noise.
    Standard ECG filtering is usually 0.5Hz to 40Hz.
    """
    b, a = butter_bandpass(lowcut, highcut, fs, order=order)
    y = filtfilt(b, a, data)
    return y

def preprocess_dataset(data_dir="data/mit-bih", output_dir="data/processed"):
    """
    Reads all MIT-BIH records, filters the signals, extracts beats around annotations,
    and saves them mapping to binary classes.
    """
    print("Starting preprocessing...")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    records = [os.path.basename(f)[:-4] for f in glob.glob(os.path.join(data_dir, '*.dat'))]
    records = list(set(records)) # unique records
    print(f"Found {len(records)} records: {records}")
    
    X_all = []
    y_all = []
    
    for record in records:
        record_path = os.path.join(data_dir, record)
        try:
            # Read signal (usually MLII and V1/V5, we use MLII which is channel 0)
            signals, fields = wfdb.rdsamp(record_path)
            annotation = wfdb.rdann(record_path, 'atr')
            
            # Using channel 0 (MLII typically)
            ecg_signal = signals[:, 0]
            
            # Filter the signal
            filtered_signal = butter_bandpass_filter(ecg_signal, fs=FS)
            
            # Extract beats based on annotator R-peaks
            peaks = annotation.sample
            symbols = annotation.symbol
            
            for i, peak in enumerate(peaks):
                sym = symbols[i]
                label = map_annotation_to_class(sym)
                
                # Ignore non-beat annotations or ones we don't care about
                if label == -1:
                    continue
                    
                # Ensure window does not go out of bounds
                left = peak - (WINDOW_SIZE // 2)
                right = peak + (WINDOW_SIZE // 2)
                
                if left >= 0 and right < len(filtered_signal):
                    beat_segment = filtered_signal[left:right]
                    # Z-score normalization for this specific beat
                    normalized_beat = (beat_segment - np.mean(beat_segment)) / (np.std(beat_segment) + 1e-8)
                    
                    X_all.append(normalized_beat)
                    y_all.append(label)
                    
        except Exception as e:
            print(f"Error processing record {record}: {e}")
            
    X_all = np.array(X_all)
    y_all = np.array(y_all)
    
    print(f"Processed dataset shape: X={X_all.shape}, y={y_all.shape}")
    print(f"Class distribution: {np.bincount(y_all)}")
    
    # Save the processed data
    np.save(os.path.join(output_dir, "X.npy"), X_all)
    np.save(os.path.join(output_dir, "y.npy"), y_all)
    print(f"Dataset saved to {output_dir}")

if __name__ == "__main__":
    # Base directory for the backend is where we will run this from
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data", "mit-bih")
    output_dir = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
    preprocess_dataset(data_dir, output_dir)
