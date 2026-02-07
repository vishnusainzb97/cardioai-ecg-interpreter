const AuditLog = require('../models/AuditLog');

/**
 * HIPAA-compliant Audit Logging Middleware
 * Automatically logs all API requests involving PHI
 */
const auditMiddleware = (resource) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;
        const startTime = Date.now();

        // Override send to capture response
        res.send = function (body) {
            // Calculate response time
            const responseTime = Date.now() - startTime;

            // Determine action from HTTP method
            const actionMap = {
                'GET': 'READ',
                'POST': 'CREATE',
                'PUT': 'UPDATE',
                'PATCH': 'UPDATE',
                'DELETE': 'DELETE'
            };

            let action = actionMap[req.method] || 'READ';

            // Special cases for specific endpoints
            if (req.path.includes('/analyze')) {
                action = 'ANALYZE';
            } else if (req.path.includes('/report')) {
                action = 'VIEW_REPORT';
            } else if (req.path.includes('/export') || req.path.includes('/download')) {
                action = 'EXPORT';
            } else if (req.path.includes('/login')) {
                action = res.statusCode === 200 ? 'LOGIN' : 'LOGIN_FAILED';
            } else if (req.path.includes('/logout')) {
                action = 'LOGOUT';
            }

            // Log the action
            AuditLog.log({
                userId: req.userId || null,
                userEmail: req.user?.email || null,
                userRole: req.user?.role || null,
                action,
                resource,
                resourceId: req.params.id || null,
                description: `${req.method} ${req.path}`,
                request: {
                    method: req.method,
                    path: req.originalUrl,
                    ip: req.ip || req.connection?.remoteAddress,
                    userAgent: req.get('user-agent')
                },
                response: {
                    statusCode: res.statusCode,
                    success: res.statusCode >= 200 && res.statusCode < 300
                },
                metadata: {
                    responseTimeMs: responseTime,
                    contentLength: body ? body.length : 0
                }
            });

            // Call original send
            return originalSend.call(this, body);
        };

        next();
    };
};

/**
 * Specific audit loggers for different resources
 */
const auditECG = auditMiddleware('ECG_RECORD');
const auditUser = auditMiddleware('USER');
const auditReport = auditMiddleware('REPORT');
const auditSystem = auditMiddleware('SYSTEM');

module.exports = {
    auditMiddleware,
    auditECG,
    auditUser,
    auditReport,
    auditSystem
};
