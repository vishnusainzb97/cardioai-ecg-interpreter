const express = require('express');
const { authenticate } = require('../middleware/auth');
const { auditECG } = require('../middleware/audit');
const { decryptFromStorage } = require('../middleware/encryption');
const ECGRecord = require('../models/ECGRecord');
const reportGenerator = require('../services/reportGenerator');
const logger = require('../utils/logger');
const { validate, historyQueryRules, recordIdRules } = require('../utils/validation');

const router = express.Router();

// All history routes require authentication
router.use(authenticate);
router.use(auditECG);

/**
 * @route   GET /api/history
 * @desc    Get user's ECG analysis history
 * @access  Private
 */
router.get('/', historyQueryRules, validate, async (req, res) => {
    try {
        const { page = 1, limit = 20, classification, startDate, endDate } = req.query;

        // Build query
        const query = { userId: req.userId };

        if (classification) {
            query['analysisResults.classification'] = classification;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Get total count
        const total = await ECGRecord.countDocuments(query);

        // Get records
        const records = await ECGRecord.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .select('-ecgDataEncrypted'); // Don't include encrypted data in list

        res.json({
            success: true,
            data: {
                records: records.map(r => r.toPublicJSON()),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        logger.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get history.'
        });
    }
});

/**
 * @route   GET /api/history/stats
 * @desc    Get user's analysis statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await ECGRecord.aggregate([
            { $match: { userId: req.userId } },
            {
                $group: {
                    _id: '$analysisResults.classification',
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$analysisResults.confidence' },
                    avgHeartRate: { $avg: '$analysisResults.heartRate' }
                }
            }
        ]);

        const totalAnalyses = await ECGRecord.countDocuments({ userId: req.userId });
        const lastAnalysis = await ECGRecord.findOne({ userId: req.userId })
            .sort({ createdAt: -1 })
            .select('createdAt analysisResults.classification');

        res.json({
            success: true,
            data: {
                totalAnalyses,
                lastAnalysisDate: lastAnalysis?.createdAt,
                lastClassification: lastAnalysis?.analysisResults?.classification,
                byClassification: stats
            }
        });
    } catch (error) {
        logger.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics.'
        });
    }
});

/**
 * @route   GET /api/history/:id
 * @desc    Get specific analysis record
 * @access  Private
 */
router.get('/:id', recordIdRules, validate, async (req, res) => {
    try {
        const record = await ECGRecord.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Record not found.'
            });
        }

        res.json({
            success: true,
            data: record.toPublicJSON()
        });
    } catch (error) {
        logger.error('Get record error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get record.'
        });
    }
});

/**
 * @route   GET /api/history/:id/ecg-data
 * @desc    Get decrypted ECG waveform data
 * @access  Private
 */
router.get('/:id/ecg-data', recordIdRules, validate, async (req, res) => {
    try {
        const record = await ECGRecord.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Record not found.'
            });
        }

        // Decrypt ECG data
        const decryptedData = decryptFromStorage(record.ecgDataEncrypted);

        res.json({
            success: true,
            data: {
                ecgData: decryptedData,
                leadCount: record.leadCount,
                leadLabels: record.leadLabels
            }
        });
    } catch (error) {
        logger.error('Get ECG data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get ECG data.'
        });
    }
});

/**
 * @route   GET /api/history/:id/report
 * @desc    Generate and download PDF report
 * @access  Private
 */
router.get('/:id/report', recordIdRules, validate, async (req, res) => {
    try {
        const record = await ECGRecord.findOne({
            _id: req.params.id,
            userId: req.userId
        }).populate('userId', 'name email');

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Record not found.'
            });
        }

        // Generate PDF report
        const pdfBuffer = await reportGenerator.generatePDF(record);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ecg-report-${record._id}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report.'
        });
    }
});

/**
 * @route   DELETE /api/history/:id
 * @desc    Delete analysis record
 * @access  Private
 */
router.delete('/:id', recordIdRules, validate, async (req, res) => {
    try {
        const record = await ECGRecord.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!record) {
            return res.status(404).json({
                success: false,
                error: 'Record not found.'
            });
        }

        logger.info(`ECG record deleted: ${req.params.id} by user: ${req.user.email}`);

        res.json({
            success: true,
            message: 'Record deleted successfully.'
        });
    } catch (error) {
        logger.error('Delete record error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete record.'
        });
    }
});

/**
 * @route   DELETE /api/history
 * @desc    Delete all user's records (data portability/right to be forgotten)
 * @access  Private
 */
router.delete('/', async (req, res) => {
    try {
        const { confirm } = req.body;

        if (confirm !== 'DELETE_ALL_MY_DATA') {
            return res.status(400).json({
                success: false,
                error: 'Please confirm deletion by sending { "confirm": "DELETE_ALL_MY_DATA" }'
            });
        }

        const result = await ECGRecord.deleteMany({ userId: req.userId });

        logger.info(`All ECG records deleted for user: ${req.user.email} (${result.deletedCount} records)`);

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} records.`
        });
    } catch (error) {
        logger.error('Delete all records error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete records.'
        });
    }
});

module.exports = router;
