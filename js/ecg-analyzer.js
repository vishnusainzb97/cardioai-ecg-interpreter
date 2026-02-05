/**
 * ECG Analyzer - AI-Powered ECG Interpretation Engine
 * Provides simulated AI analysis for ECG interpretation
 */

class ECGAnalyzer {
    constructor() {
        // Normal reference ranges
        this.normalRanges = {
            heartRate: { min: 60, max: 100 },
            prInterval: { min: 120, max: 200 },
            qrsDuration: { min: 80, max: 120 },
            qtInterval: { min: 350, max: 450 },
            axis: { min: -30, max: 90 }
        };

        // ECG patterns database
        this.patterns = {
            normal: {
                name: 'Normal Sinus Rhythm',
                heartRate: { min: 60, max: 100 },
                prInterval: { min: 140, max: 180 },
                qrsDuration: { min: 80, max: 100 },
                qtcInterval: { min: 380, max: 420 },
                axis: { min: 30, max: 75 },
                regularity: 'Regular',
                pWave: 'Present, upright in II',
                pQrsRatio: '1:1',
                rateVariability: 'Normal',
                stSegment: 'Isoelectric',
                tWave: 'Upright in I, II, V4-V6',
                qWave: 'Small septal Q in I, aVL, V5-V6',
                uWave: 'Not prominent',
                jPoint: 'Isoelectric',
                riskLevel: 15,
                confidence: 94,
                interpretation: `
          <p><strong>Normal Sinus Rhythm</strong> with no acute abnormalities detected.</p>
          <p>The ECG shows regular P waves followed by QRS complexes at a normal rate. All intervals are within normal limits. 
          The cardiac axis is normal. No evidence of chamber enlargement, ischemia, or conduction abnormalities.</p>
          <p>This is a <strong>normal ECG</strong>.</p>
        `,
                recommendations: [
                    'No immediate cardiac intervention required',
                    'Continue routine cardiovascular health monitoring',
                    'Maintain healthy lifestyle with regular exercise',
                    'Follow up as clinically indicated'
                ]
            },
            afib: {
                name: 'Atrial Fibrillation',
                heartRate: { min: 80, max: 160 },
                prInterval: { min: null, max: null },
                qrsDuration: { min: 80, max: 110 },
                qtcInterval: { min: 380, max: 440 },
                axis: { min: 15, max: 75 },
                regularity: 'Irregularly irregular',
                pWave: 'Absent (fibrillatory waves)',
                pQrsRatio: 'N/A',
                rateVariability: 'High (variable R-R)',
                stSegment: 'Isoelectric',
                tWave: 'Variable',
                qWave: 'Not significant',
                uWave: 'Not visible',
                jPoint: 'Isoelectric',
                riskLevel: 55,
                confidence: 91,
                interpretation: `
          <p><strong>Atrial Fibrillation</strong> with rapid ventricular response detected.</p>
          <p>The ECG shows an irregularly irregular rhythm with no discernible P waves. Fibrillatory baseline 
          activity is present. QRS complexes are narrow, suggesting supraventricular origin. R-R intervals 
          are variable throughout the recording.</p>
          <p>This pattern is consistent with <strong>atrial fibrillation</strong>, which carries increased risk of 
          stroke and thromboembolism.</p>
        `,
                recommendations: [
                    'Consider anticoagulation therapy (CHA₂DS₂-VASc score assessment)',
                    'Rate control evaluation (target HR < 110 bpm at rest)',
                    'Rhythm control strategy assessment',
                    'Echocardiogram to evaluate cardiac structure',
                    'Cardiology consultation recommended'
                ]
            },
            vtach: {
                name: 'Ventricular Tachycardia',
                heartRate: { min: 150, max: 250 },
                prInterval: { min: null, max: null },
                qrsDuration: { min: 140, max: 200 },
                qtcInterval: { min: null, max: null },
                axis: { min: -90, max: -30 },
                regularity: 'Regular (monomorphic)',
                pWave: 'AV dissociation',
                pQrsRatio: 'Variable',
                rateVariability: 'Low',
                stSegment: 'Discordant',
                tWave: 'Discordant to QRS',
                qWave: 'Wide complex',
                uWave: 'Obscured',
                jPoint: 'Not applicable',
                riskLevel: 95,
                confidence: 88,
                interpretation: `
          <p><strong>⚠️ CRITICAL: Ventricular Tachycardia</strong> detected!</p>
          <p>Wide complex tachycardia with regular rhythm at a rate exceeding 150 bpm. QRS duration is significantly 
          prolonged (>140ms). AV dissociation is evident. The morphology is consistent with monomorphic ventricular 
          tachycardia.</p>
          <p>This is a <strong>life-threatening arrhythmia</strong> requiring immediate medical attention.</p>
        `,
                recommendations: [
                    '🚨 IMMEDIATE: Assess hemodynamic stability',
                    'If unstable: Synchronized cardioversion',
                    'If stable: Antiarrhythmic therapy (Amiodarone)',
                    'Prepare for possible defibrillation',
                    'Cardiology/EP consultation STAT',
                    'Evaluate for underlying structural heart disease'
                ]
            },
            stemi: {
                name: 'ST-Elevation MI (STEMI)',
                heartRate: { min: 70, max: 110 },
                prInterval: { min: 140, max: 180 },
                qrsDuration: { min: 80, max: 120 },
                qtcInterval: { min: 400, max: 460 },
                axis: { min: 0, max: 60 },
                regularity: 'Regular',
                pWave: 'Present',
                pQrsRatio: '1:1',
                rateVariability: 'Normal to low',
                stSegment: '⬆️ Elevated >2mm',
                tWave: 'Hyperacute (peaked)',
                qWave: 'Pathological Q waves',
                uWave: 'Not significant',
                jPoint: 'Elevated',
                riskLevel: 90,
                confidence: 86,
                interpretation: `
          <p><strong>⚠️ CRITICAL: ST-Elevation Myocardial Infarction (STEMI)</strong> pattern detected!</p>
          <p>Significant ST-segment elevation is present in contiguous leads, consistent with acute transmural 
          myocardial infarction. Reciprocal ST depression may be present in opposite leads. Hyperacute T waves 
          and early pathological Q waves suggest acute coronary occlusion.</p>
          <p>This indicates <strong>acute myocardial ischemia/infarction</strong> requiring emergent intervention.</p>
        `,
                recommendations: [
                    '🚨 ACTIVATE CARDIAC CATH LAB IMMEDIATELY',
                    'Administer aspirin 325mg (if not contraindicated)',
                    'Obtain serial troponins',
                    'Prepare for emergent PCI (Door-to-Balloon < 90 min)',
                    'Consider thrombolytics if PCI not available',
                    'Continuous cardiac monitoring mandatory'
                ]
            }
        };
    }

    /**
     * Analyze ECG image or sample
     * @param {string|File} input - Sample name or uploaded file
     * @returns {Promise<Object>} Analysis results
     */
    async analyze(input) {
        // Simulate AI processing time
        await this.simulateProcessing(2000 + Math.random() * 1500);

        let pattern;

        if (typeof input === 'string') {
            // Sample ECG selected
            pattern = this.patterns[input] || this.patterns.normal;
        } else {
            // File uploaded - simulate analysis (randomly select pattern for demo)
            const patterns = Object.keys(this.patterns);
            const randomIndex = Math.floor(Math.random() * patterns.length);
            pattern = this.patterns[patterns[randomIndex]];
        }

        // Generate realistic values with some variance
        const results = this.generateResults(pattern);

        return results;
    }

    /**
     * Generate analysis results with realistic variance
     * @param {Object} pattern - Base pattern data
     * @returns {Object} Analysis results
     */
    generateResults(pattern) {
        // Generate values within pattern ranges
        const heartRate = pattern.heartRate.min
            ? this.randomInRange(pattern.heartRate.min, pattern.heartRate.max)
            : null;

        const prInterval = pattern.prInterval.min
            ? this.randomInRange(pattern.prInterval.min, pattern.prInterval.max)
            : null;

        const qrsDuration = this.randomInRange(pattern.qrsDuration.min, pattern.qrsDuration.max);

        const qtcInterval = pattern.qtcInterval.min
            ? this.randomInRange(pattern.qtcInterval.min, pattern.qtcInterval.max)
            : null;

        const axis = pattern.axis.min !== null
            ? this.randomInRange(pattern.axis.min, pattern.axis.max)
            : null;

        // Add small variance to confidence
        const confidence = Math.round(pattern.confidence + (Math.random() * 6 - 3));

        return {
            // Main stats
            heartRate: heartRate ? Math.round(heartRate) : 'N/A',
            prInterval: prInterval ? Math.round(prInterval) : 'N/A',
            qrsDuration: Math.round(qrsDuration),
            qtcInterval: qtcInterval ? Math.round(qtcInterval) : 'N/A',
            axis: axis !== null ? Math.round(axis) : 'N/A',
            confidence: Math.min(99, Math.max(75, confidence)),

            // Rhythm analysis
            rhythmType: pattern.name,
            regularity: pattern.regularity,
            pWave: pattern.pWave,
            pQrsRatio: pattern.pQrsRatio,
            rateVariability: pattern.rateVariability,

            // Detailed parameters
            stSegment: pattern.stSegment,
            tWave: pattern.tWave,
            qWave: pattern.qWave,
            uWave: pattern.uWave,
            jPoint: pattern.jPoint,

            // Risk assessment
            riskLevel: pattern.riskLevel,
            riskClass: this.getRiskClass(pattern.riskLevel),

            // Interpretation
            interpretation: pattern.interpretation,
            recommendations: pattern.recommendations,

            // Classification for styling
            severity: this.getSeverity(pattern.name),

            // Timestamp
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get risk classification
     * @param {number} level - Risk level (0-100)
     * @returns {string} Risk class
     */
    getRiskClass(level) {
        if (level < 30) return 'low';
        if (level < 60) return 'medium';
        return 'high';
    }

    /**
     * Get severity for styling
     * @param {string} condition - Condition name
     * @returns {string} Severity class
     */
    getSeverity(condition) {
        if (condition.includes('Normal')) return 'normal';
        if (condition.includes('Atrial')) return 'warning';
        return 'danger';
    }

    /**
     * Check if a value is within normal range
     * @param {number} value - Value to check
     * @param {string} param - Parameter name
     * @returns {string} Status class
     */
    checkNormalRange(value, param) {
        if (value === 'N/A' || !this.normalRanges[param]) return '';

        const range = this.normalRanges[param];
        if (value < range.min || value > range.max) {
            return value < range.min ? 'warning' : 'danger';
        }
        return 'normal';
    }

    /**
     * Generate random number in range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random value
     */
    randomInRange(min, max) {
        return min + Math.random() * (max - min);
    }

    /**
     * Simulate AI processing delay
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Resolves after delay
     */
    simulateProcessing(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Generate sample ECG waveform data
     * @param {string} type - Type of rhythm
     * @returns {Array} Waveform points
     */
    generateWaveformData(type = 'normal') {
        const points = [];
        const duration = 10; // 10 seconds
        const samplingRate = 250; // 250 Hz
        const totalPoints = duration * samplingRate;

        let heartRate;
        switch (type) {
            case 'afib':
                heartRate = 120 + Math.random() * 40;
                break;
            case 'vtach':
                heartRate = 180 + Math.random() * 50;
                break;
            case 'stemi':
                heartRate = 80 + Math.random() * 20;
                break;
            default:
                heartRate = 70 + Math.random() * 20;
        }

        const beatsPerSecond = heartRate / 60;
        const pointsPerBeat = samplingRate / beatsPerSecond;

        for (let i = 0; i < totalPoints; i++) {
            const beatPosition = (i % pointsPerBeat) / pointsPerBeat;
            let value = 0;

            // Add rhythm variation for AFib
            const rrVariation = type === 'afib' ? (Math.random() * 0.3 - 0.15) : 0;
            const adjustedBeatPosition = (beatPosition + rrVariation + 1) % 1;

            if (type === 'vtach') {
                // Wide QRS pattern for VTach
                value = this.generateVTachBeat(adjustedBeatPosition);
            } else if (type === 'stemi') {
                // ST elevation pattern
                value = this.generateSTEMIBeat(adjustedBeatPosition);
            } else if (type === 'afib') {
                // No P wave, fibrillatory baseline
                value = this.generateAFibBeat(adjustedBeatPosition);
            } else {
                // Normal sinus rhythm
                value = this.generateNormalBeat(adjustedBeatPosition);
            }

            // Add some noise
            value += (Math.random() - 0.5) * 0.02;

            points.push({
                x: i / samplingRate,
                y: value
            });
        }

        return points;
    }

    generateNormalBeat(position) {
        // P wave (0.08-0.12)
        if (position >= 0.08 && position < 0.16) {
            const p = (position - 0.08) / 0.08;
            return 0.15 * Math.sin(p * Math.PI);
        }
        // PR segment (0.16-0.20)
        else if (position >= 0.16 && position < 0.20) {
            return 0;
        }
        // Q wave (0.20-0.22)
        else if (position >= 0.20 && position < 0.22) {
            const q = (position - 0.20) / 0.02;
            return -0.1 * Math.sin(q * Math.PI);
        }
        // R wave (0.22-0.26)
        else if (position >= 0.22 && position < 0.26) {
            const r = (position - 0.22) / 0.04;
            return 1.0 * Math.sin(r * Math.PI);
        }
        // S wave (0.26-0.30)
        else if (position >= 0.26 && position < 0.30) {
            const s = (position - 0.26) / 0.04;
            return -0.25 * Math.sin(s * Math.PI);
        }
        // ST segment (0.30-0.40)
        else if (position >= 0.30 && position < 0.40) {
            return 0;
        }
        // T wave (0.40-0.55)
        else if (position >= 0.40 && position < 0.55) {
            const t = (position - 0.40) / 0.15;
            return 0.3 * Math.sin(t * Math.PI);
        }
        // Baseline
        return 0;
    }

    generateVTachBeat(position) {
        // Wide QRS complex characteristic of VTach
        if (position >= 0.10 && position < 0.50) {
            const qrs = (position - 0.10) / 0.40;
            const waveform = Math.sin(qrs * Math.PI * 2);
            return waveform * 0.8 * (1 - qrs * 0.5);
        }
        // Brief recovery
        else if (position >= 0.50 && position < 0.70) {
            const t = (position - 0.50) / 0.20;
            return -0.4 * Math.sin(t * Math.PI);
        }
        return 0;
    }

    generateSTEMIBeat(position) {
        // P wave
        if (position >= 0.05 && position < 0.13) {
            const p = (position - 0.05) / 0.08;
            return 0.15 * Math.sin(p * Math.PI);
        }
        // Q wave (pathological - deeper)
        else if (position >= 0.18 && position < 0.22) {
            const q = (position - 0.18) / 0.04;
            return -0.3 * Math.sin(q * Math.PI);
        }
        // R wave
        else if (position >= 0.22 && position < 0.26) {
            const r = (position - 0.22) / 0.04;
            return 0.8 * Math.sin(r * Math.PI);
        }
        // S wave
        else if (position >= 0.26 && position < 0.30) {
            const s = (position - 0.26) / 0.04;
            return -0.2 * Math.sin(s * Math.PI);
        }
        // ST ELEVATION (key feature)
        else if (position >= 0.30 && position < 0.45) {
            return 0.35; // Elevated ST segment
        }
        // T wave (hyperacute - tall and peaked)
        else if (position >= 0.45 && position < 0.65) {
            const t = (position - 0.45) / 0.20;
            return 0.35 + 0.45 * Math.sin(t * Math.PI);
        }
        return 0;
    }

    generateAFibBeat(position) {
        // No P wave - fibrillatory baseline added as noise
        const fibrillation = Math.sin(position * 50) * 0.03 + Math.sin(position * 73) * 0.02;

        // QRS complex (may occur at variable times due to irregular R-R)
        if (position >= 0.20 && position < 0.24) {
            const q = (position - 0.20) / 0.02;
            return -0.08 * Math.sin(q * Math.PI) + fibrillation;
        }
        else if (position >= 0.24 && position < 0.28) {
            const r = (position - 0.24) / 0.04;
            return 0.9 * Math.sin(r * Math.PI) + fibrillation;
        }
        else if (position >= 0.28 && position < 0.32) {
            const s = (position - 0.28) / 0.04;
            return -0.2 * Math.sin(s * Math.PI) + fibrillation;
        }
        // T wave
        else if (position >= 0.40 && position < 0.55) {
            const t = (position - 0.40) / 0.15;
            return 0.25 * Math.sin(t * Math.PI) + fibrillation;
        }

        return fibrillation;
    }
}

// Export for use in other modules
window.ECGAnalyzer = ECGAnalyzer;
