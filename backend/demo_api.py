import requests
import json
import numpy as np

# Let's create a synthetic array that looks like a basic 10-second ECG signal
# to feed into the API just like the frontend would.
sampling_rate = 250
duration = 10
total_points = duration * sampling_rate
signal = []

for i in range(total_points):
    # A very rough simulation of a heartbeat for the sake of triggering the API
    beat_position = (i % (sampling_rate)) / sampling_rate
    val = 0
    if 0.22 <= beat_position < 0.26:
        # R wave spike
        r = (beat_position - 0.22) / 0.04
        val = 1.0 * np.sin(r * np.pi)
    signal.append(val + (np.random.random() - 0.5) * 0.02) # Add some noise

url = 'http://localhost:8000/api/analyze'
payload = {'signal': signal}

print("1. Sending simulated Raw ECG Signal (10 seconds) to the FastAPI backend...")
try:
    response = requests.post(url, files={'file': ('ecg.json', json.dumps(payload), 'application/json')})
    if response.status_code == 200:
        print("\n2. Received API Response! Here is the model's interpretation:\n")
        print(json.dumps(response.json(), indent=4))
    else:
        print(f"Failed with status code: {response.status_code}")
except requests.exceptions.ConnectionError:
    print("Error: The FastAPI server isn't running. Please start it with 'uvicorn main:app --port 8000' in the backend directory.")
