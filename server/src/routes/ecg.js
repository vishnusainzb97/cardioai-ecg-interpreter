const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { auditECG } = require('../middleware/audit');
const { encryptForStorage } = require('../middleware/encryption');
const ECGRecord = require('../models/ECGRecord');
const ecgAnalysisService = require('../services/ecgAnalysis');
const logger = require('../utils/logger');
const securityConfig = require('../config/security');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: securityConfig.upload.maxFileSize
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed: PNG, JPG, PDF'), false);
        }
    }
});

// Apply audit logging
router.use(auditECG);

/**
 * @route   POST /api/ecg/analyze
 * @desc    Analyze uploaded ECG image
 * @access  Private (optional auth for anonymous analysis)
 */
router.post('/analyze', optionalAuth, upload.single('ecg'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No ECG file uploaded.'
            });
        }

        const startTime = Date.now();
        const { leadCount = 1 } = req.body;

        // Generate file hash for integrity
        const fileHash = crypto
            .createHash('sha256')
            .update(req.file.buffer)
            .digest('hex');

        // Analyze ECG
        const analysisResults = await ecgAnalysisService.analyze(
            req.file.buffer,
            req.file.mimetype,
            parseInt(leadCount)
        );

        const inferenceTime = Date.now() - startTime;

        // If user is authenticated, save to history
        let savedRecord = null;
        if (req.userId) {
            // Encrypt ECG data before storage
            const encryptedData = encryptForStorage(req.file.buffer.toString('base64'));

            const record = new ECGRecord({
                userId: req.userId,
                fileName: req.file.originalname,
                fileType: req.file.mimetype,
                fileHash,
                ecgDataEncrypted: encryptedData,
                leadCount: parseInt(leadCount),
                analysisResults: {
                    classification: analysisResults.classification,
                    confidence: analysisResults.confidence,
                    heartRate: analysisResults.heartRate,
                    intervals: analysisResults.intervals,
                    rhythm: analysisResults.rhythm,
                    severity: analysisResults.severity,
                    details: analysisResults.details
                },
                interpretation: analysisResults.interpretation,
                modelVersion: analysisResults.modelVersion,
                inferenceTimeMs: inferenceTime
            });

            savedRecord = await record.save();
            logger.info(`ECG analysis saved for user: ${req.user.email}`);
        }

        res.json({
            success: true,
            data: {
                ...analysisResults,
                recordId: savedRecord?._id || null,
                inferenceTimeMs: inferenceTime
            }
        });
    } catch (error) {
        logger.error('ECG analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze ECG.'
        });
    }
});

/**
 * @route   POST /api/ecg/analyze-pdf
 * @desc    Extract and analyze ECG from PDF
 * @access  Private
 */
router.post('/analyze-pdf', authenticate, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file uploaded.'
            });
        }

        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({
                success: false,
                error: 'File must be a PDF.'
            });
        }

        const startTime = Date.now();

        // Extract ECG from PDF
        const extractedData = await ecgAnalysisService.extractFromPDF(req.file.buffer);

        // Analyze extracted ECG
        const analysisResults = await ecgAnalysisService.analyzeExtracted(extractedData);

        const inferenceTime = Date.now() - startTime;

        // Save to history
        const fileHash = crypto
            .createHash('sha256')
            .update(req.file.buffer)
            .digest('hex');

        const encryptedData = encryptForStorage(req.file.buffer.toString('base64'));

        const record = new ECGRecord({
            userId: req.userId,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileHash,
            ecgDataEncrypted: encryptedData,
            leadCount: extractedData.leadCount || 1,
            analysisResults: {
                classification: analysisResults.classification,
                confidence: analysisResults.confidence,
                heartRate: analysisResults.heartRate,
                intervals: analysisResults.intervals,
                rhythm: analysisResults.rhythm,
                severity: analysisResults.severity
            },
            interpretation: analysisResults.interpretation,
            modelVersion: analysisResults.modelVersion,
            inferenceTimeMs: inferenceTime
        });

        await record.save();

        res.json({
            success: true,
            data: {
                ...analysisResults,
                recordId: record._id,
                extractedLeads: extractedData.leadCount,
                inferenceTimeMs: inferenceTime
            }
        });
    } catch (error) {
        logger.error('PDF ECG analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze PDF ECG.'
        });
    }
});

/**
 * @route   POST /api/ecg/analyze-dicom
 * @desc    Parse and analyze DICOM ECG
 * @access  Private
 */
router.post('/analyze-dicom', authenticate, upload.single('dicom'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No DICOM file uploaded.'
            });
        }

        const startTime = Date.now();

        // Parse DICOM
        const dicomData = await ecgAnalysisService.parseDICOM(req.file.buffer);

        // Analyze ECG from DICOM
        const analysisResults = await ecgAnalysisService.analyzeFromDICOM(dicomData);

        const inferenceTime = Date.now() - startTime;

        // Save to history
        const fileHash = crypto
            .createHash('sha256')
            .update(req.file.buffer)
            .digest('hex');

        const encryptedData = encryptForStorage(req.file.buffer.toString('base64'));

        const record = new ECGRecord({
            userId: req.userId,
            fileName: req.file.originalname,
            fileType: 'application/dicom',
            fileHash,
            ecgDataEncrypted: encryptedData,
            leadCount: dicomData.leadCount || 12,
            leadLabels: dicomData.leadLabels,
            analysisResults: {
                classification: analysisResults.classification,
                confidence: analysisResults.confidence,
                heartRate: analysisResults.heartRate,
                intervals: analysisResults.intervals,
                rhythm: analysisResults.rhythm,
                severity: analysisResults.severity
            },
            interpretation: analysisResults.interpretation,
            modelVersion: analysisResults.modelVersion,
            inferenceTimeMs: inferenceTime
        });

        await record.save();

        res.json({
            success: true,
            data: {
                ...analysisResults,
                recordId: record._id,
                patientInfo: dicomData.patientInfo, // Only non-PHI info
                leadCount: dicomData.leadCount,
                inferenceTimeMs: inferenceTime
            }
        });
    } catch (error) {
        logger.error('DICOM ECG analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze DICOM ECG.'
        });
    }
});

/**
 * @route   GET /api/ecg/sample/:type
 * @desc    Get sample ECG data for testing
 * @access  Public
 */
router.get('/sample/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['normal', 'afib', 'vt', 'stemi'];

        if (!validTypes.includes(type.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid sample type. Valid types: ${validTypes.join(', ')}`
            });
        }

        const sampleData = ecgAnalysisService.getSampleECG(type.toLowerCase());

        res.json({
            success: true,
            data: sampleData
        });
    } catch (error) {
        logger.error('Get sample ECG error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sample ECG.'
        });
    }
});

module.exports = router;
