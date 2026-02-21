import cv2
import numpy as np
from PIL import Image
import io

class ECGImageProcessor:
    def __init__(self, target_points=2500):
        # We target 2500 points to match the 10s * 250Hz input our model expects
        self.target_points = target_points

    def process_image(self, file_bytes: bytes) -> list:
        """
        Takes image bytes, extracts the ECG waveform, and returns a 1D list of floats.
        """
        # 1. Read the image into OpenCV format
        image = Image.open(io.BytesIO(file_bytes)).convert('RGB')
        img_np = np.array(image)
        # Convert RGB to BGR for OpenCV
        img_bgr = img_np[:, :, ::-1].copy()

        # 2. Convert to grayscale
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # 3. Enhance the image (Thresholding) to isolate the dark ECG lines
        # Assuming the ECG line is dark on a lighter background
        # We use adaptive thresholding or Otsu's to binarize
        _, thresh = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

        # Optional: Remove grid lines. Often grid lines are lighter or a specific color.
        # For a general "ECG Photo", simple thresholding often leaves the thickest lines.
        # We can apply morphological operations to clean noise.
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)

        # 4. Extract the signal (y-coordinate for each x)
        # We'll scan column by column and find the most prominent "black" pixel (now white in `cleaned`)
        height, width = cleaned.shape
        signal_raw = []

        for x in range(width):
            column = cleaned[:, x]
            # Find indices where the pixel is part of the line
            line_pixels = np.where(column > 128)[0]
            
            if len(line_pixels) > 0:
                # Average the y-positions if the line is thick
                y_pos = np.mean(line_pixels)
                # Invert y-axis so that higher pixel row (lower numeric y) means higher signal
                signal_raw.append(height - y_pos)
            else:
                # If no line pixel is found in this column, just repeat previous or 0
                if len(signal_raw) > 0:
                    signal_raw.append(signal_raw[-1])
                else:
                    signal_raw.append(height / 2.0) # start in middle if empty

        # 5. Normalize and Interpolate to target_points (e.g., 2500)
        signal_np = np.array(signal_raw)
        
        # Min-Max Normalization to [-1, 1] range to match expected model input scale roughly
        if np.ptp(signal_np) != 0:
            signal_normalized = 2 * ((signal_np - np.min(signal_np)) / np.ptp(signal_np)) - 1
        else:
            signal_normalized = signal_np # flat line fallback

        # Resample to exactly self.target_points
        original_x = np.linspace(0, 1, len(signal_normalized))
        target_x = np.linspace(0, 1, self.target_points)
        signal_resampled = np.interp(target_x, original_x, signal_normalized)

        return signal_resampled.tolist()

if __name__ == '__main__':
    # Test script if run directly
    print("ECGImageProcessor loaded successfully.")
