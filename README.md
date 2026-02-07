# ECG Interpreter - Frontend Demo

An AI-powered ECG interpretation demo using client-side simulation.

## Quick Start

Simply open `index.html` in a browser - no server required!

```bash
# Option 1: Open directly
open index.html

# Option 2: Use a simple HTTP server
npx serve .
# Then visit http://localhost:3000
```

## Features

- 🫀 **ECG Visualization** - Real-time waveform display
- 🔬 **AI Analysis** - Simulated ML-based interpretation
- 📊 **Sample ECGs** - Normal, Atrial Fibrillation, V-Tach, STEMI
- 📝 **PDF Reports** - Client-side report generation
- 🏥 **12-Lead Support** - Full 12-lead ECG visualization

## Current Status

**Demo Mode** - Uses simulated AI analysis for demonstration.

## Future: Real ML Integration

See `task.md` in the brain folder for detailed steps to:
1. Download PhysioNet datasets (PTB-XL, MIT-BIH)
2. Train a 1D CNN ECG classifier
3. Export to TensorFlow.js
4. Add backend server for real predictions

## Files

```
ecg-interpreter/
├── index.html           # Main application
├── index.css            # Styles
├── how-it-works.html    # Documentation page
├── deep-learning-presentation.html
├── js/
│   ├── app.js           # Main application logic
│   ├── ecg-analyzer.js  # Simulated AI analysis
│   ├── ecg-visualizer.js
│   ├── twelve-lead-visualizer.js
│   └── report-generator.js
└── assets/              # Images and assets
```

---

*Built for medical education and demonstration purposes.*
