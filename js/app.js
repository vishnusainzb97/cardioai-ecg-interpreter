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
            sampleButtons: document.querySelectorAll('.sample-btn'),

            // RLHF Feedback
            feedbackCard: document.getElementById('rlhf-feedback-card'),
            feedbackYesBtn: document.getElementById('feedback-yes-btn'),
            feedbackNoBtn: document.getElementById('feedback-no-btn'),
            feedbackCorrectionPanel: document.getElementById('feedback-correction-panel'),
            trueDiagnosisInput: document.getElementById('true-diagnosis-input'),
            feedbackNotesInput: document.getElementById('feedback-notes-input'),
            submitFeedbackBtn: document.getElementById('submit-feedback-btn'),
            feedbackSuccessMsg: document.getElementById('feedback-success-msg'),

            // Mobile menu
            mobileMenuBtn: document.getElementById('mobile-menu-btn'),
            navMobile: document.getElementById('nav-mobile'),

            // Results Modal
            resultsModal: document.getElementById('results-modal'),
            resultsModalClose: document.getElementById('results-modal-close')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFeedbackListeners();
        this.initializeVisualizer();
        this.initScrollReveal();
        this.initStatsCounters();
        this.initSmoothScroll();
        this.initHeaderScroll();
    }

    initializeVisualizer() {
        // Delay initialization to ensure DOM is ready
        setTimeout(() => {
            this.visualizer = new ECGVisualizer('ecg-canvas');
        }, 100);
    }

    /**
     * Scroll reveal animation using IntersectionObserver
     */
    initScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal');
        if (!revealElements.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Stagger the reveal animation
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 80);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(el => observer.observe(el));
    }

    /**
     * Animated stat counters in the stats bar section
     */
    initStatsCounters() {
        const statsBarItems = document.querySelectorAll('.stats-bar-value[data-target]');
        if (!statsBarItems.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        statsBarItems.forEach(el => observer.observe(el));
    }

    /**
     * Animate a counter element from 0 to its target value
     */
    animateCounter(element) {
        const target = parseInt(element.dataset.target);
        const suffix = element.dataset.suffix || '';
        const duration = 2000;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (decelerate)
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);

            element.textContent = current.toLocaleString() + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }

    /**
     * Smooth scroll for anchor links
     */
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('href');
                if (targetId === '#') return;

                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    const headerOffset = 80;
                    const elementPosition = targetEl.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.scrollY - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    // Close mobile menu if open
                    if (this.elements.navMobile) {
                        this.elements.navMobile.classList.remove('open');
                        this.elements.mobileMenuBtn.classList.remove('active');
                    }
                }
            });
        });
    }

    /**
     * Header background change on scroll
     */
    initHeaderScroll() {
        const header = document.getElementById('header');
        if (!header) return;

        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 50) {
                header.style.borderBottomColor = 'rgba(148, 163, 184, 0.15)';
            } else {
                header.style.borderBottomColor = 'rgba(148, 163, 184, 0.1)';
            }
            lastScroll = currentScroll;
        }, { passive: true });
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
            this.closeResultsModal();
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

        // Mobile menu toggle
        if (this.elements.mobileMenuBtn) {
            this.elements.mobileMenuBtn.addEventListener('click', () => {
                this.elements.mobileMenuBtn.classList.toggle('active');
                this.elements.navMobile.classList.toggle('open');
            });
        }

        // Close mobile menu on link click
        document.querySelectorAll('.nav-link-mobile').forEach(link => {
            link.addEventListener('click', () => {
                if (this.elements.navMobile) {
                    this.elements.navMobile.classList.remove('open');
                    this.elements.mobileMenuBtn.classList.remove('active');
                }
            });
        });

        // Results modal close button
        if (this.elements.resultsModalClose) {
            this.elements.resultsModalClose.addEventListener('click', () => {
                this.closeResultsModal();
            });
        }

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.resultsModal?.classList.contains('active')) {
                this.closeResultsModal();
            }
        });
    }

    setupFeedbackListeners() {
        if (!this.elements.feedbackYesBtn) return;

        this.elements.feedbackYesBtn.addEventListener('click', () => {
            // Clinician agreed with the model
            this.submitFeedback(true);
        });

        this.elements.feedbackNoBtn.addEventListener('click', () => {
            // Clinician disagreed, show the correction panel
            this.elements.feedbackCorrectionPanel.style.display = 'flex';
        });

        this.elements.submitFeedbackBtn.addEventListener('click', () => {
            // Clinician provided the correct diagnosis
            this.submitFeedback(false);
        });
    }

    async submitFeedback(isCorrect) {
        if (!this.currentResults) return;

        const predictedDiagnosis = this.currentResults.rhythmType;
        let trueDiagnosis = predictedDiagnosis;
        let notes = "";

        if (!isCorrect) {
            trueDiagnosis = this.elements.trueDiagnosisInput.value.trim();
            notes = this.elements.feedbackNotesInput.value.trim();
            if (!trueDiagnosis) {
                alert("Please provide the true diagnosis before submitting.");
                return;
            }
        }

        const feedbackData = {
            predicted_diagnosis: predictedDiagnosis,
            true_diagnosis: trueDiagnosis,
            notes: notes
        };

        try {
            const response = await fetch('http://localhost:8000/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });

            if (!response.ok) {
                throw new Error("Failed to submit feedback.");
            }

            // Success UI state
            this.elements.feedbackYesBtn.parentElement.style.display = 'none';
            this.elements.feedbackCorrectionPanel.style.display = 'none';
            this.elements.feedbackSuccessMsg.style.display = 'flex';

        } catch (error) {
            console.error(error);
            alert("Error saving feedback. Make sure backend is running.");
        }
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

            // Show results section (this might be the content for the modal)
            this.elements.resultsSection.classList.add('visible');

            // Open fullscreen modal
            if (this.elements.resultsModal) {
                this.elements.resultsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }

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
          <span class="rec-dot"></span>
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
     * Close the fullscreen results modal
     */
    closeResultsModal() {
        if (this.elements.resultsModal) {
            this.elements.resultsModal.classList.remove('active');
            document.body.style.overflow = '';
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

        // Reset Feedback UI
        if (this.elements.feedbackYesBtn) {
            this.elements.feedbackYesBtn.parentElement.style.display = 'flex';
            this.elements.feedbackCorrectionPanel.style.display = 'none';
            this.elements.feedbackSuccessMsg.style.display = 'none';
            this.elements.trueDiagnosisInput.value = '';
            this.elements.feedbackNotesInput.value = '';
        }
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
