/**
 * CardioAI - Main Application Controller
 * Handles UI interactions, file uploads, and coordinates analysis workflow
 */

class CardioAIApp {
    constructor() {
        // Initialize modules
        this.analyzer = new ECGAnalyzer();
        this.visualizer = null;
        this.reportGenerator = new ReportGenerator();

        // State
        this.currentResults = null;
        this.uploadedFile = null;
        this.currentSample = null;

        // DOM Elements
        this.elements = {
            // Upload
            uploadZone: document.getElementById('upload-zone'),
            uploadInput: document.getElementById('upload-input'),

            // Preview
            previewSection: document.getElementById('preview-section'),
            previewImage: document.getElementById('preview-image'),
            clearBtn: document.getElementById('clear-btn'),

            // Results
            resultsSection: document.getElementById('results-section'),
            statsGrid: document.getElementById('stats-grid'),

            // Stats
            heartRate: document.getElementById('heart-rate'),
            prInterval: document.getElementById('pr-interval'),
            qrsDuration: document.getElementById('qrs-duration'),
            qtcInterval: document.getElementById('qtc-interval'),
            axis: document.getElementById('axis'),
            confidence: document.getElementById('confidence'),

            // Rhythm
            rhythmBadge: document.getElementById('rhythm-badge'),
            rhythmType: document.getElementById('rhythm-type'),
            regularity: document.getElementById('regularity'),
            pWave: document.getElementById('p-wave'),
            pQrsRatio: document.getElementById('p-qrs-ratio'),
            rateVariability: document.getElementById('rate-variability'),

            // Parameters
            stSegment: document.getElementById('st-segment'),
            tWave: document.getElementById('t-wave'),
            qWave: document.getElementById('q-wave'),
            uWave: document.getElementById('u-wave'),
            jPoint: document.getElementById('j-point'),

            // Interpretation
            interpretationText: document.getElementById('interpretation-text'),

            // Risk
            riskFill: document.getElementById('risk-fill'),
            recommendations: document.getElementById('recommendations'),

            // Controls
            newAnalysisBtn: document.getElementById('new-analysis-btn'),
            exportBtn: document.getElementById('export-btn'),
            zoomInBtn: document.getElementById('zoom-in-btn'),
            zoomOutBtn: document.getElementById('zoom-out-btn'),
            resetZoomBtn: document.getElementById('reset-zoom-btn'),

            // Loading
            loadingOverlay: document.getElementById('loading-overlay'),

            // Samples
            sampleButtons: document.querySelectorAll('.sample-btn')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeVisualizer();
    }

    initializeVisualizer() {
        // Delay initialization to ensure DOM is ready
        setTimeout(() => {
            this.visualizer = new ECGVisualizer('ecg-canvas');
        }, 100);
    }

    setupEventListeners() {
        // Upload zone click
        this.elements.uploadZone.addEventListener('click', () => {
            this.elements.uploadInput.click();
        });

        // File input change
        this.elements.uploadInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Drag and drop
        this.elements.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.uploadZone.classList.add('drag-over');
        });

        this.elements.uploadZone.addEventListener('dragleave', () => {
            this.elements.uploadZone.classList.remove('drag-over');
        });

        this.elements.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.uploadZone.classList.remove('drag-over');

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleFileUpload(e.dataTransfer.files[0]);
            }
        });

        // Sample buttons
        this.elements.sampleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sampleType = btn.dataset.sample;
                this.analyzeSample(sampleType);
            });
        });

        // Clear button
        this.elements.clearBtn.addEventListener('click', () => {
            this.clearAnalysis();
        });

        // New analysis button
        this.elements.newAnalysisBtn.addEventListener('click', () => {
            this.clearAnalysis();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Export button
        this.elements.exportBtn.addEventListener('click', () => {
            this.exportReport();
        });

        // Zoom controls
        this.elements.zoomInBtn.addEventListener('click', () => {
            if (this.visualizer) this.visualizer.zoomIn();
        });

        this.elements.zoomOutBtn.addEventListener('click', () => {
            if (this.visualizer) this.visualizer.zoomOut();
        });

        this.elements.resetZoomBtn.addEventListener('click', () => {
            if (this.visualizer) this.visualizer.reset();
        });
    }

    /**
     * Handle file upload
     * @param {File} file - Uploaded file
     */
    async handleFileUpload(file) {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf'];

        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid image file (PNG, JPG, GIF) or PDF.');
            return;
        }

        this.uploadedFile = file;
        this.currentSample = null;

        // Show preview
        await this.showPreview(file);

        // Run analysis
        await this.runAnalysis(file);
    }

    /**
     * Show uploaded image preview
     * @param {File} file - Uploaded file
     */
    showPreview(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                this.elements.previewImage.src = e.target.result;
                this.elements.previewSection.classList.add('visible');
                resolve();
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Analyze sample ECG
     * @param {string} sampleType - Type of sample (normal, afib, vtach, stemi)
     */
    async analyzeSample(sampleType) {
        this.currentSample = sampleType;
        this.uploadedFile = null;

        // Hide preview for samples
        this.elements.previewSection.classList.remove('visible');

        // Run analysis
        await this.runAnalysis(sampleType);
    }

    /**
     * Run ECG analysis
     * @param {File|string} input - File or sample type
     */
    async runAnalysis(input) {
        // Show loading
        this.showLoading(true);

        try {
            // Get analysis results
            const results = await this.analyzer.analyze(input);
            this.currentResults = results;

            // Update UI with results
            this.displayResults(results);

            // Generate and display waveform
            const sampleType = typeof input === 'string' ? input : 'normal';
            const waveformData = this.analyzer.generateWaveformData(sampleType);

            if (this.visualizer) {
                this.visualizer.drawWaveform(waveformData, true);
            }

            // Show results section
            this.elements.resultsSection.classList.add('visible');

            // Scroll to results
            setTimeout(() => {
                this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 500);

        } catch (error) {
            console.error('Analysis failed:', error);
            alert('Analysis failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Display analysis results in UI
     * @param {Object} results - Analysis results
     */
    displayResults(results) {
        // Update stats
        this.animateValue(this.elements.heartRate, results.heartRate);
        this.animateValue(this.elements.prInterval, results.prInterval);
        this.animateValue(this.elements.qrsDuration, results.qrsDuration);
        this.animateValue(this.elements.qtcInterval, results.qtcInterval);
        this.animateValue(this.elements.axis, results.axis !== 'N/A' ? `${results.axis}°` : 'N/A');
        this.animateValue(this.elements.confidence, `${results.confidence}%`);

        // Update rhythm analysis
        this.elements.rhythmType.textContent = results.rhythmType;
        this.elements.rhythmBadge.className = `rhythm-badge ${results.severity}`;
        this.elements.regularity.textContent = results.regularity;
        this.elements.pWave.textContent = results.pWave;
        this.elements.pQrsRatio.textContent = results.pQrsRatio;
        this.elements.rateVariability.textContent = results.rateVariability;

        // Update detailed parameters
        this.elements.stSegment.textContent = results.stSegment;
        this.elements.tWave.textContent = results.tWave;
        this.elements.qWave.textContent = results.qWave;
        this.elements.uWave.textContent = results.uWave;
        this.elements.jPoint.textContent = results.jPoint;

        // Update interpretation
        this.elements.interpretationText.innerHTML = results.interpretation;

        // Update risk meter
        this.elements.riskFill.className = `risk-fill ${results.riskClass}`;
        this.elements.riskFill.style.width = `${results.riskLevel}%`;

        // Update recommendations
        this.elements.recommendations.innerHTML = results.recommendations
            .map(rec => `
        <li class="recommendation-item">
          <span class="icon">→</span>
          <span>${rec}</span>
        </li>
      `)
            .join('');

        // Apply severity-based styling to parameters
        this.applyParameterStyling(results);
    }

    /**
     * Apply styling based on parameter values
     * @param {Object} results - Analysis results
     */
    applyParameterStyling(results) {
        // Heart rate styling
        const hrStatus = this.analyzer.checkNormalRange(results.heartRate, 'heartRate');
        if (hrStatus) {
            this.elements.heartRate.classList.add(hrStatus);
        }

        // QRS styling
        const qrsStatus = this.analyzer.checkNormalRange(results.qrsDuration, 'qrsDuration');
        if (qrsStatus) {
            this.elements.qrsDuration.classList.add(qrsStatus);
        }
    }

    /**
     * Animate value update
     * @param {HTMLElement} element - Target element
     * @param {string|number} value - New value
     */
    animateValue(element, value) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';

        setTimeout(() => {
            element.textContent = value;
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, 100);
    }

    /**
     * Show/hide loading overlay
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        if (show) {
            this.elements.loadingOverlay.classList.add('visible');
        } else {
            this.elements.loadingOverlay.classList.remove('visible');
        }
    }

    /**
     * Clear current analysis and reset UI
     */
    clearAnalysis() {
        this.currentResults = null;
        this.uploadedFile = null;
        this.currentSample = null;

        // Hide sections
        this.elements.previewSection.classList.remove('visible');
        this.elements.resultsSection.classList.remove('visible');

        // Reset upload input
        this.elements.uploadInput.value = '';

        // Clear visualizer
        if (this.visualizer) {
            this.visualizer.clear();
        }

        // Reset stats
        const statsElements = [
            this.elements.heartRate,
            this.elements.prInterval,
            this.elements.qrsDuration,
            this.elements.qtcInterval,
            this.elements.axis,
            this.elements.confidence
        ];

        statsElements.forEach(el => {
            el.textContent = '--';
            el.className = el.className.replace(/normal|warning|danger/g, '').trim();
        });
    }

    /**
     * Export analysis report
     */
    exportReport() {
        if (!this.currentResults) {
            alert('No analysis results to export.');
            return;
        }

        // Get ECG waveform image
        const ecgImageData = this.visualizer ? this.visualizer.exportImage() : null;

        // Open report in new window
        this.reportGenerator.openReport(this.currentResults, ecgImageData);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CardioAIApp();
});
