/**
 * ECG Visualizer - Canvas-based ECG Waveform Rendering
 * Draws interactive ECG waveforms with medical-grade grid
 */

class ECGVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Configuration
        this.config = {
            // Grid settings (standard ECG paper)
            gridMajorColor: 'rgba(239, 68, 68, 0.3)',
            gridMinorColor: 'rgba(239, 68, 68, 0.1)',
            majorGridSize: 50, // 5mm at 10mm/mV, 25mm/s
            minorGridSize: 10, // 1mm subdivisions

            // Waveform settings
            waveColor: '#10b981',
            waveWidth: 2,

            // Display settings
            backgroundColor: '#1a0a0a',
            textColor: '#9ca3af',

            // Zoom and pan
            zoom: 1,
            offsetX: 0,
            offsetY: 0,

            // Animation
            animationSpeed: 2, // pixels per frame

            // Dimensions
            padding: 40
        };

        this.waveformData = [];
        this.animationFrame = null;
        this.isAnimating = false;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupResizeHandler();
        this.drawGrid();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // Set canvas size with device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        const width = rect.width - 32; // Account for container padding
        const height = 300;

        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.ctx.scale(dpr, dpr);

        this.displayWidth = width;
        this.displayHeight = height;
    }

    setupResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
                this.drawGrid();
                if (this.waveformData.length > 0) {
                    this.drawWaveform(this.waveformData, false);
                }
            }, 250);
        });
    }

    /**
     * Draw ECG grid (medical standard layout)
     */
    drawGrid() {
        const { majorGridSize, minorGridSize, gridMajorColor, gridMinorColor, backgroundColor } = this.config;

        // Clear canvas
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);

        // Draw minor grid lines
        this.ctx.strokeStyle = gridMinorColor;
        this.ctx.lineWidth = 0.5;

        for (let x = 0; x <= this.displayWidth; x += minorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.displayHeight);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.displayHeight; y += minorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.displayWidth, y);
            this.ctx.stroke();
        }

        // Draw major grid lines
        this.ctx.strokeStyle = gridMajorColor;
        this.ctx.lineWidth = 1;

        for (let x = 0; x <= this.displayWidth; x += majorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.displayHeight);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.displayHeight; y += majorGridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.displayWidth, y);
            this.ctx.stroke();
        }

        // Draw scale markers
        this.drawScaleMarkers();
    }

    /**
     * Draw scale markers and labels
     */
    drawScaleMarkers() {
        this.ctx.fillStyle = this.config.textColor;
        this.ctx.font = '10px Inter, sans-serif';

        // Time scale (bottom)
        this.ctx.fillText('25 mm/s', 10, this.displayHeight - 10);

        // Voltage scale marker (1mV calibration)
        const calibX = this.displayWidth - 60;
        const calibY = this.displayHeight / 2;

        this.ctx.strokeStyle = this.config.waveColor;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(calibX, calibY);
        this.ctx.lineTo(calibX, calibY - 50);
        this.ctx.lineTo(calibX + 25, calibY - 50);
        this.ctx.lineTo(calibX + 25, calibY);
        this.ctx.stroke();

        this.ctx.fillText('1 mV', calibX + 30, calibY - 20);
    }

    /**
     * Draw ECG waveform with animation
     * @param {Array} data - Waveform data points [{x, y}, ...]
     * @param {boolean} animate - Whether to animate the drawing
     */
    drawWaveform(data, animate = true) {
        this.waveformData = data;

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        if (animate) {
            this.animateWaveform(data);
        } else {
            this.renderWaveform(data, data.length);
        }
    }

    /**
     * Animate waveform drawing
     * @param {Array} data - Waveform data
     */
    animateWaveform(data) {
        this.isAnimating = true;
        let currentIndex = 0;
        const pointsPerFrame = 5;

        const animate = () => {
            if (currentIndex < data.length) {
                this.drawGrid();
                currentIndex = Math.min(currentIndex + pointsPerFrame, data.length);
                this.renderWaveform(data, currentIndex);
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };

        animate();
    }

    /**
     * Render waveform up to specified index
     * @param {Array} data - Waveform data
     * @param {number} endIndex - Last point to render
     */
    renderWaveform(data, endIndex) {
        if (!data || data.length === 0) return;

        const { waveColor, waveWidth, padding, zoom, offsetX } = this.config;

        // Calculate scaling
        const centerY = this.displayHeight / 2;
        const amplitude = (this.displayHeight - padding * 2) / 2;
        const timeScale = (this.displayWidth - padding) / 10 * zoom; // 10 seconds of data

        this.ctx.strokeStyle = waveColor;
        this.ctx.lineWidth = waveWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Add glow effect
        this.ctx.shadowColor = waveColor;
        this.ctx.shadowBlur = 4;

        this.ctx.beginPath();

        for (let i = 0; i < endIndex && i < data.length; i++) {
            const point = data[i];
            const x = (point.x * timeScale) + padding / 2 + offsetX;
            const y = centerY - (point.y * amplitude);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Add lead label
        this.ctx.fillStyle = this.config.textColor;
        this.ctx.font = 'bold 12px Inter, sans-serif';
        this.ctx.fillText('Lead II', 15, 25);
    }

    /**
     * Set zoom level
     * @param {number} level - Zoom level (0.5 - 3)
     */
    setZoom(level) {
        this.config.zoom = Math.max(0.5, Math.min(3, level));
        this.drawGrid();
        if (this.waveformData.length > 0) {
            this.renderWaveform(this.waveformData, this.waveformData.length);
        }
    }

    /**
     * Zoom in
     */
    zoomIn() {
        this.setZoom(this.config.zoom + 0.25);
    }

    /**
     * Zoom out
     */
    zoomOut() {
        this.setZoom(this.config.zoom - 0.25);
    }

    /**
     * Reset zoom and position
     */
    reset() {
        this.config.zoom = 1;
        this.config.offsetX = 0;
        this.drawGrid();
        if (this.waveformData.length > 0) {
            this.renderWaveform(this.waveformData, this.waveformData.length);
        }
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.waveformData = [];
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.drawGrid();
    }

    /**
     * Export canvas as image
     * @returns {string} Data URL of the canvas
     */
    exportImage() {
        return this.canvas.toDataURL('image/png');
    }
}

// Export for use in other modules
window.ECGVisualizer = ECGVisualizer;
