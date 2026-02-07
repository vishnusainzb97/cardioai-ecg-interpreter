const mongoose = require('mongoose');

/**
 * HIPAA-compliant Audit Log Schema
 * Records all access to Protected Health Information (PHI)
 */
const auditLogSchema = new mongoose.Schema({
    // Who performed the action
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    userEmail: {
        type: String // Stored for quick reference even if user is deleted
    },
    userRole: {
        type: String
    },
    // What action was performed
    action: {
        type: String,
        enum: [
            'CREATE', 'READ', 'UPDATE', 'DELETE',  // CRUD
            'LOGIN', 'LOGOUT', 'LOGIN_FAILED',      // Authentication
            'EXPORT', 'DOWNLOAD', 'PRINT',          // Data export
            'ANALYZE', 'VIEW_REPORT',               // ECG specific
            'ACCESS_DENIED', 'PERMISSION_CHANGE'    // Security
        ],
        required: true,
        index: true
    },
    // What resource was accessed
    resource: {
        type: String,
        enum: ['USER', 'ECG_RECORD', 'REPORT', 'SYSTEM'],
        required: true
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    // Additional context
    description: {
        type: String
    },
    // Request metadata
    request: {
        method: String,
        path: String,
        ip: String,
        userAgent: String
    },
    // Response info
    response: {
        statusCode: Number,
        success: Boolean
    },
    // Any additional data
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    // Timestamp
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: false // We use our own timestamp field
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });

// Static method to create audit log entry
auditLogSchema.statics.log = async function ({
    userId,
    userEmail,
    userRole,
    action,
    resource,
    resourceId,
    description,
    request,
    response,
    metadata
}) {
    try {
        await this.create({
            userId,
            userEmail,
            userRole,
            action,
            resource,
            resourceId,
            description,
            request,
            response,
            metadata,
            timestamp: new Date()
        });
    } catch (error) {
        // Log to console but don't throw - audit logging should never break the app
        console.error('Audit log error:', error.message);
    }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = async function (userId, options = {}) {
    const { page = 1, limit = 50, startDate, endDate } = options;

    const query = { userId };

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return this.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
