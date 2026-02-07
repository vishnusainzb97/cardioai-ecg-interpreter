const mongoose = require('mongoose');

const ecgRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // File information
    fileName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        enum: ['image/png', 'image/jpeg', 'application/pdf', 'application/dicom'],
        required: true
    },
    fileHash: {
        type: String, // SHA-256 hash for integrity verification
        required: true
    },
    // ECG Data (encrypted for HIPAA)
    ecgDataEncrypted: {
        type: String // AES-256-GCM encrypted ECG waveform data
    },
    // Lead configuration
    leadCount: {
        type: Number,
        min: 1,
        max: 12,
        default: 1
    },
    leadLabels: [{
        type: String
    }],
    // Analysis results
    analysisResults: {
        classification: {
            type: String,
            enum: ['Normal', 'AFib', 'VT', 'STEMI', 'Bradycardia', 'Tachycardia', 'Other'],
            required: true
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            required: true
        },
        heartRate: {
            type: Number,
            min: 0,
            max: 300
        },
        intervals: {
            pr: Number,  // ms
            qrs: Number, // ms
            qt: Number,  // ms
            qtc: Number  // corrected QT ms
        },
        rhythm: {
            regular: Boolean,
            description: String
        },
        severity: {
            type: String,
            enum: ['normal', 'warning', 'danger'],
            default: 'normal'
        },
        details: {
            type: Map,
            of: mongoose.Schema.Types.Mixed
        }
    },
    // Clinical interpretation (AI-generated)
    interpretation: {
        summary: String,
        findings: [String],
        recommendations: [String]
    },
    // Model metadata
    modelVersion: {
        type: String,
        default: '1.0.0'
    },
    inferenceTimeMs: {
        type: Number
    },
    // Timestamps
    analyzedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
ecgRecordSchema.index({ userId: 1, createdAt: -1 });
ecgRecordSchema.index({ 'analysisResults.classification': 1 });

// Virtual for formatted date
ecgRecordSchema.virtual('formattedDate').get(function () {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Method to get safe public data
ecgRecordSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        fileName: this.fileName,
        fileType: this.fileType,
        leadCount: this.leadCount,
        leadLabels: this.leadLabels,
        analysisResults: this.analysisResults,
        interpretation: this.interpretation,
        modelVersion: this.modelVersion,
        inferenceTimeMs: this.inferenceTimeMs,
        analyzedAt: this.analyzedAt,
        createdAt: this.createdAt
    };
};

const ECGRecord = mongoose.model('ECGRecord', ecgRecordSchema);

module.exports = ECGRecord;
