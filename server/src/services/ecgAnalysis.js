/**
 * ECG Analysis Service
 * Integrates with TensorFlow.js for ML-powered ECG classification
 */

// For MVP, we'll use a simulated model. 
// In production, replace with actual TensorFlow.js model loading.

class ECGAnalysisService {
    constructor() {
        this.modelLoaded = false;
        this.modelVersion = '1.0.0-mvp';

        // Classification labels
        this.labels = ['Normal', 'AFib', 'VT', 'STEMI', 'Bradycardia', 'Tachycardia'];

        // Pattern database for simulation
        this.patterns = {
            normal: {
                classification: 'Normal',
                heartRate: { min: 60, max: 100 },
                prInterval: { min: 120, max: 200 },
                qrsDuration: { min: 80, max: 100 },
                qtInterval: { min: 350, max: 440 },
                rhythm: { regular: true, description: 'Normal Sinus Rhythm' },
                severity: 'normal',
                confidence: { min: 92, max: 98 }
            },
            afib: {
                classification: 'AFib',
                heartRate: { min: 100, max: 160 },
                prInterval: null, // No discernible P-waves
                qrsDuration: { min: 80, max: 120 },
                qtInterval: { min: 300, max: 400 },
                rhythm: { regular: false, description: 'Irregularly Irregular Rhythm' },
                severity: 'warning',
                confidence: { min: 85, max: 95 }
            },
            vt: {
                classification: 'VT',
                heartRate: { min: 150, max: 250 },
                prInterval: null,
                qrsDuration: { min: 120, max: 200 },
                qtInterval: { min: 280, max: 360 },
                rhythm: { regular: true, description: 'Ventricular Tachycardia' },
                severity: 'danger',
                confidence: { min: 88, max: 96 }
            },
            stemi: {
                classification: 'STEMI',
                heartRate: { min: 70, max: 110 },
                prInterval: { min: 120, max: 200 },
                qrsDuration: { min: 80, max: 110 },
                qtInterval: { min: 380, max: 480 },
                rhythm: { regular: true, description: 'ST-Elevation Pattern' },
                severity: 'danger',
                confidence: { min: 82, max: 94 }
            }
        };
    }

    /**
     * Initialize TensorFlow.js model
     * In production, this loads the actual trained model
     */
    async initialize() {
        // Simulated model loading
        // In production:
        // const tf = require('@tensorflow/tfjs-node');
        // this.model = await tf.loadLayersModel('file://./ml-models/ecg-classifier/model.json');

        this.modelLoaded = true;
        console.log('ECG Analysis Service initialized (simulation mode)');
    }

    /**
     * Generate random value within range
     */
    randomInRange(min, max) {
        return Math.round(min + Math.random() * (max - min));
    }

    /**
     * Analyze ECG image/data
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} mimeType - File MIME type
     * @param {number} leadCount - Number of ECG leads
     * @returns {Object} Analysis results
     */
    async analyze(fileBuffer, mimeType, leadCount = 1) {
        // Simulate processing time
        await this.simulateProcessing(1000 + Math.random() * 1500);

        // For MVP, randomly select a pattern (weighted towards normal)
        const patterns = Object.keys(this.patterns);
        const weights = [0.6, 0.15, 0.1, 0.15]; // Normal, AFib, VT, STEMI
        const random = Math.random();
        let cumulative = 0;
        let selectedPattern = 'normal';

        for (let i = 0; i < patterns.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                selectedPattern = patterns[i];
                break;
            }
        }

        return this.generateResults(this.patterns[selectedPattern], leadCount);
    }

    /**
     * Generate analysis results from pattern
     */
    generateResults(pattern, leadCount) {
        const heartRate = this.randomInRange(pattern.heartRate.min, pattern.heartRate.max);
        const confidence = this.randomInRange(pattern.confidence.min, pattern.confidence.max);

        const results = {
            classification: pattern.classification,
            confidence,
            heartRate,
            intervals: {
                pr: pattern.prInterval ? this.randomInRange(pattern.prInterval.min, pattern.prInterval.max) : null,
                qrs: this.randomInRange(pattern.qrsDuration.min, pattern.qrsDuration.max),
                qt: this.randomInRange(pattern.qtInterval.min, pattern.qtInterval.max),
                qtc: null // Will calculate
            },
            rhythm: pattern.rhythm,
            severity: pattern.severity,
            leadCount,
            details: this.generateDetails(pattern),
            interpretation: this.generateInterpretation(pattern, heartRate),
            modelVersion: this.modelVersion,
            waveformData: this.generateWaveformData(pattern.classification.toLowerCase(), leadCount)
        };

        // Calculate QTc using Bazett's formula
        if (results.intervals.qt && heartRate > 0) {
            const rrInterval = 60000 / heartRate; // RR in ms
            results.intervals.qtc = Math.round(results.intervals.qt / Math.sqrt(rrInterval / 1000));
        }

        return results;
    }

    /**
     * Generate detailed analysis
     */
    generateDetails(pattern) {
        const details = new Map();

        details.set('pWave', pattern.prInterval ? 'Normal morphology' : 'Absent or fibrillatory');
        details.set('qrsComplex', pattern.qrsDuration.max <= 100 ? 'Normal width' : 'Widened');
        details.set('tWave', pattern.classification === 'STEMI' ? 'Hyperacute or inverted' : 'Normal');
        details.set('stSegment', pattern.classification === 'STEMI' ? 'Elevated' : 'Isoelectric');

        return Object.fromEntries(details);
    }

    /**
     * Generate clinical interpretation
     */
    generateInterpretation(pattern, heartRate) {
        const interpretations = {
            Normal: {
                summary: 'Normal sinus rhythm with no acute abnormalities detected.',
                findings: [
                    'Regular rhythm with normal rate',
                    'Normal P-wave morphology',
                    'Normal PR interval',
                    'Normal QRS duration',
                    'No ST-segment abnormalities'
                ],
                recommendations: [
                    'No immediate action required',
                    'Continue routine monitoring as indicated'
                ]
            },
            AFib: {
                summary: 'Atrial fibrillation detected with irregularly irregular rhythm.',
                findings: [
                    'Irregularly irregular R-R intervals',
                    'Absent P-waves',
                    'Fibrillatory baseline',
                    'Variable ventricular response'
                ],
                recommendations: [
                    'Evaluate stroke risk (CHA₂DS₂-VASc score)',
                    'Consider rate or rhythm control',
                    'Anticoagulation assessment recommended',
                    'Cardiology consultation advised'
                ]
            },
            VT: {
                summary: 'Ventricular tachycardia detected - URGENT evaluation required.',
                findings: [
                    'Wide QRS complexes (>120ms)',
                    'Rapid ventricular rate',
                    'AV dissociation may be present',
                    'Regular or slightly irregular rhythm'
                ],
                recommendations: [
                    '⚠️ URGENT: Immediate medical evaluation required',
                    'Assess hemodynamic stability',
                    'Prepare for potential cardioversion',
                    'Cardiology emergency consultation'
                ]
            },
            STEMI: {
                summary: 'ST-elevation pattern consistent with acute myocardial infarction.',
                findings: [
                    'ST-segment elevation in contiguous leads',
                    'Possible reciprocal ST depression',
                    'Hyperacute T-wave changes',
                    'Possible Q-wave formation'
                ],
                recommendations: [
                    '🚨 EMERGENCY: Activate cardiac catheterization team',
                    'Administer aspirin if not contraindicated',
                    'Prepare for primary PCI',
                    'Door-to-balloon time critical'
                ]
            }
        };

        return interpretations[pattern.classification] || interpretations.Normal;
    }

    /**
     * Generate waveform visualization data
     */
    generateWaveformData(type, leadCount = 1) {
        const samplesPerSecond = 500;
        const duration = 3; // 3 seconds
        const totalSamples = samplesPerSecond * duration;

        const leads = [];
        const leadLabels = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

        for (let lead = 0; lead < Math.min(leadCount, 12); lead++) {
            const data = [];

            for (let i = 0; i < totalSamples; i++) {
                const t = i / samplesPerSecond;
                let value = 0;

                // Generate ECG-like waveform based on type
                const beatDuration = type === 'vt' ? 0.4 : (type === 'afib' ? 0.5 + Math.random() * 0.3 : 0.8);
                const phase = (t % beatDuration) / beatDuration;

                if (type === 'normal' || type === 'stemi') {
                    // P wave (0.0-0.1)
                    if (phase < 0.1) {
                        value = 0.15 * Math.sin(phase * Math.PI / 0.1);
                    }
                    // PR segment (0.1-0.15)
                    else if (phase < 0.15) {
                        value = 0;
                    }
                    // QRS complex (0.15-0.25)
                    else if (phase < 0.25) {
                        const qrsPhase = (phase - 0.15) / 0.1;
                        if (qrsPhase < 0.3) {
                            value = -0.1 * Math.sin(qrsPhase * Math.PI / 0.3); // Q
                        } else if (qrsPhase < 0.6) {
                            value = 1.0 * Math.sin((qrsPhase - 0.3) * Math.PI / 0.3); // R
                        } else {
                            value = -0.2 * Math.sin((qrsPhase - 0.6) * Math.PI / 0.4); // S
                        }
                    }
                    // ST segment (0.25-0.4)
                    else if (phase < 0.4) {
                        value = type === 'stemi' ? 0.3 : 0; // ST elevation for STEMI
                    }
                    // T wave (0.4-0.6)
                    else if (phase < 0.6) {
                        const tPhase = (phase - 0.4) / 0.2;
                        value = 0.25 * Math.sin(tPhase * Math.PI);
                    }
                } else if (type === 'afib') {
                    // Fibrillatory baseline + irregular QRS
                    value = 0.05 * Math.sin(t * 50) + 0.03 * Math.sin(t * 73);

                    if (phase > 0.1 && phase < 0.2) {
                        const qrsPhase = (phase - 0.1) / 0.1;
                        value += 0.8 * Math.sin(qrsPhase * Math.PI);
                    }
                } else if (type === 'vt') {
                    // Wide QRS, rapid rate
                    if (phase < 0.4) {
                        value = 0.9 * Math.sin(phase * Math.PI / 0.4);
                    }
                }

                // Add some noise
                value += (Math.random() - 0.5) * 0.02;

                data.push(value);
            }

            leads.push({
                label: leadLabels[lead],
                data
            });
        }

        return {
            samplesPerSecond,
            duration,
            leads
        };
    }

    /**
     * Extract ECG from PDF
     */
    async extractFromPDF(pdfBuffer) {
        // In production, use pdf-lib and pdf2pic to extract ECG images
        // For MVP, return simulated data
        await this.simulateProcessing(500);

        return {
            success: true,
            leadCount: 12,
            extractedRegions: 1
        };
    }

    /**
     * Analyze extracted PDF data
     */
    async analyzeExtracted(extractedData) {
        return this.analyze(null, 'application/pdf', extractedData.leadCount);
    }

    /**
     * Parse DICOM file
     */
    async parseDICOM(dicomBuffer) {
        // In production, use dcmjs or dicom-parser
        // For MVP, return simulated data
        await this.simulateProcessing(300);

        return {
            success: true,
            leadCount: 12,
            leadLabels: ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'],
            patientInfo: {
                // Anonymized/non-PHI info only
                acquisitionDate: new Date().toISOString().split('T')[0]
            }
        };
    }

    /**
     * Analyze DICOM data
     */
    async analyzeFromDICOM(dicomData) {
        return this.analyze(null, 'application/dicom', dicomData.leadCount);
    }

    /**
     * Get sample ECG data
     */
    getSampleECG(type) {
        const pattern = this.patterns[type] || this.patterns.normal;
        return this.generateResults(pattern, 1);
    }

    /**
     * Simulate processing delay
     */
    simulateProcessing(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new ECGAnalysisService();
