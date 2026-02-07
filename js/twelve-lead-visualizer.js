/**
 * 12-Lead ECG Visualizer
 * Displays ECG waveforms in standard clinical format
 */

class TwelveLeadVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
        this.canvases = {};
        this.contexts = {};
        this.animationFrames = {};
        this.waveformData = null;

        // Grid settings
        this.gridColor = 'rgba(16, 185, 129, 0.15)';
        this.majorGridColor = 'rgba(16, 185, 129, 0.3)';
        this.waveformColor = '#10b981';
        this.backgroundColor = '#0f172a';

        // Timing
        this.samplesPerSecond = 500;
        this.mmPerMv = 10; // 10mm per mV (standard)
        this.mmPerSecond = 25; // 25mm/s (standard)

        this.init();
    }

    init() {
        if (!this.container) {
            console.error('12-Lead container not found');
            return;
        }

        this.createGrid();
        this.createControls();
    }

    createGrid() {
        // Create 4x3 grid layout (standard 12-lead format)
        const grid = document.createElement('div');
        grid.className = 'twelve-lead-grid';
        grid.innerHTML = `
      <style>
        .twelve-lead-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 8px;
          background: ${this.backgroundColor};
          padding: 15px;
          border-radius: 12px;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .lead-container {
          position: relative;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 3 / 1;
          min-height: 80px;
        }
        
        .lead-label {
          position: absolute;
          top: 5px;
          left: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: ${this.waveformColor};
          z-index: 2;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .lead-canvas {
          width: 100%;
          height: 100%;
        }
        
        .lead-container:hover {
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }
        
        .twelve-lead-controls {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 15px;
        }
        
        .twelve-lead-btn {
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
          padding: 8px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }
        
        .twelve-lead-btn:hover {
          background: rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }
        
        .rhythm-strip {
          grid-column: 1 / -1;
          aspect-ratio: 12 / 1;
          min-height: 100px;
        }
        
        @media (max-width: 768px) {
          .twelve-lead-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: auto;
          }
          
          .rhythm-strip {
            grid-column: 1 / -1;
          }
        }
      </style>
    `;

        // Create lead containers in standard order
        // Row 1: I, aVR, V1, V4
        // Row 2: II, aVL, V2, V5
        // Row 3: III, aVF, V3, V6
        const leadOrder = [
            ['I', 'aVR', 'V1', 'V4'],
            ['II', 'aVL', 'V2', 'V5'],
            ['III', 'aVF', 'V3', 'V6']
        ];

        leadOrder.forEach(row => {
            row.forEach(lead => {
                const container = document.createElement('div');
                container.className = 'lead-container';
                container.id = `lead-${lead}`;

                const label = document.createElement('div');
                label.className = 'lead-label';
                label.textContent = lead;

                const canvas = document.createElement('canvas');
                canvas.className = 'lead-canvas';
                canvas.id = `canvas-${lead}`;

                container.appendChild(label);
                container.appendChild(canvas);
                grid.appendChild(container);

                this.canvases[lead] = canvas;
            });
        });

        // Add rhythm strip (Lead II, full width)
        const rhythmStrip = document.createElement('div');
        rhythmStrip.className = 'lead-container rhythm-strip';
        rhythmStrip.id = 'lead-rhythm';

        const rhythmLabel = document.createElement('div');
        rhythmLabel.className = 'lead-label';
        rhythmLabel.textContent = 'II (Rhythm Strip)';

        const rhythmCanvas = document.createElement('canvas');
        rhythmCanvas.className = 'lead-canvas';
        rhythmCanvas.id = 'canvas-rhythm';

        rhythmStrip.appendChild(rhythmLabel);
        rhythmStrip.appendChild(rhythmCanvas);
        grid.appendChild(rhythmStrip);

        this.canvases['rhythm'] = rhythmCanvas;

        this.container.appendChild(grid);
        this.gridElement = grid;

        // Initialize canvases after DOM is ready
        requestAnimationFrame(() => this.initCanvases());
    }

    createControls() {
        const controls = document.createElement('div');
        controls.className = 'twelve-lead-controls';
        controls.innerHTML = `
      <button class="twelve-lead-btn" id="twelve-lead-play">▶️ Animate</button>
      <button class="twelve-lead-btn" id="twelve-lead-reset">🔄 Reset</button>
      <button class="twelve-lead-btn" id="twelve-lead-zoom-in">🔍+ Zoom In</button>
      <button class="twelve-lead-btn" id="twelve-lead-zoom-out">🔍- Zoom Out</button>
    `;

        this.container.appendChild(controls);

        // Add event listeners
        document.getElementById('twelve-lead-play')?.addEventListener('click', () => this.animate());
        document.getElementById('twelve-lead-reset')?.addEventListener('click', () => this.reset());
        document.getElementById('twelve-lead-zoom-in')?.addEventListener('click', () => this.zoom(1.2));
        document.getElementById('twelve-lead-zoom-out')?.addEventListener('click', () => this.zoom(0.8));
    }

    initCanvases() {
        Object.keys(this.canvases).forEach(lead => {
            const canvas = this.canvases[lead];
            const rect = canvas.parentElement.getBoundingClientRect();

            // Set canvas size with device pixel ratio for crisp rendering
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);

            this.contexts[lead] = ctx;

            // Draw initial grid
            this.drawGrid(lead);
        });
    }

    drawGrid(lead) {
        const canvas = this.canvases[lead];
        const ctx = this.contexts[lead];
        if (!ctx) return;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw minor grid (1mm squares)
        const minorStep = 4; // 4 pixels per mm approximation
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        for (let x = 0; x <= width; x += minorStep) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += minorStep) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Draw major grid (5mm squares)
        const majorStep = minorStep * 5;
        ctx.strokeStyle = this.majorGridColor;
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let x = 0; x <= width; x += majorStep) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += majorStep) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();
    }

    setData(waveformData) {
        this.waveformData = waveformData;
        this.render();
    }

    render() {
        if (!this.waveformData) return;

        const { leads } = this.waveformData;

        leads.forEach((leadData, index) => {
            const leadName = leadData.label || this.leads[index];
            if (this.contexts[leadName]) {
                this.drawWaveform(leadName, leadData.data);
            }
        });

        // Also draw rhythm strip using Lead II data
        const leadII = leads.find(l => l.label === 'II') || leads[1];
        if (leadII && this.contexts['rhythm']) {
            this.drawWaveform('rhythm', leadII.data, true);
        }
    }

    drawWaveform(lead, data, isRhythmStrip = false) {
        const canvas = this.canvases[lead];
        const ctx = this.contexts[lead];
        if (!ctx || !data) return;

        // Redraw grid first
        this.drawGrid(lead);

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const centerY = height / 2;

        // Calculate scaling
        const amplitude = height * 0.35;
        const samplesCount = data.length;
        const xStep = width / samplesCount;

        // Draw waveform
        ctx.beginPath();
        ctx.strokeStyle = this.waveformColor;
        ctx.lineWidth = isRhythmStrip ? 2 : 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < samplesCount; i++) {
            const x = i * xStep;
            const y = centerY - (data[i] * amplitude);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    animate() {
        if (!this.waveformData) {
            console.log('No waveform data to animate');
            return;
        }

        this.stopAllAnimations();

        Object.keys(this.contexts).forEach(lead => {
            if (lead === 'rhythm') {
                const leadII = this.waveformData.leads.find(l => l.label === 'II') || this.waveformData.leads[1];
                if (leadII) {
                    this.animateLead(lead, leadII.data);
                }
            } else {
                const leadData = this.waveformData.leads.find(l => l.label === lead);
                if (leadData) {
                    this.animateLead(lead, leadData.data);
                }
            }
        });
    }

    animateLead(lead, data) {
        const canvas = this.canvases[lead];
        const ctx = this.contexts[lead];
        if (!ctx || !data) return;

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const centerY = height / 2;
        const amplitude = height * 0.35;
        const samplesCount = data.length;
        const xStep = width / samplesCount;

        let currentSample = 0;
        const speed = 10; // Samples per frame

        const animate = () => {
            this.drawGrid(lead);

            ctx.beginPath();
            ctx.strokeStyle = this.waveformColor;
            ctx.lineWidth = lead === 'rhythm' ? 2 : 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i <= currentSample && i < samplesCount; i++) {
                const x = i * xStep;
                const y = centerY - (data[i] * amplitude);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();

            currentSample += speed;

            if (currentSample < samplesCount) {
                this.animationFrames[lead] = requestAnimationFrame(animate);
            }
        };

        animate();
    }

    stopAllAnimations() {
        Object.keys(this.animationFrames).forEach(lead => {
            if (this.animationFrames[lead]) {
                cancelAnimationFrame(this.animationFrames[lead]);
                delete this.animationFrames[lead];
            }
        });
    }

    reset() {
        this.stopAllAnimations();
        Object.keys(this.contexts).forEach(lead => {
            this.drawGrid(lead);
        });
    }

    zoom(factor) {
        // Placeholder for zoom functionality
        console.log('Zoom factor:', factor);
    }

    resize() {
        this.initCanvases();
        if (this.waveformData) {
            this.render();
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TwelveLeadVisualizer;
} else {
    window.TwelveLeadVisualizer = TwelveLeadVisualizer;
}
