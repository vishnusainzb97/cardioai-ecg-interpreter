const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const securityConfig = require('../config/security');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies token and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer '

        // Verify token
        const decoded = jwt.verify(token, securityConfig.jwt.secret);

        // Get user from database
        const user = await User.findById(decoded.userId).select('+role');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found.'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated.'
            });
        }

        if (user.isLocked()) {
            return res.status(423).json({
                success: false,
                error: 'Account is temporarily locked. Please try again later.'
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token.'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please login again.'
            });
        }

        logger.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: 'Authentication error.'
        });
    }
};

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, securityConfig.jwt.secret);
            const user = await User.findById(decoded.userId);

            if (user && user.isActive && !user.isLocked()) {
                req.user = user;
                req.userId = user._id;
            }
        }

        next();
    } catch (error) {
        // Ignore errors for optional auth
        next();
    }
};

/**
 * Role-based access control middleware
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            // Log unauthorized access attempt
            AuditLog.log({
                userId: req.user._id,
                userEmail: req.user.email,
                userRole: req.user.role,
                action: 'ACCESS_DENIED',
                resource: 'SYSTEM',
                description: `Attempted to access resource requiring roles: ${roles.join(', ')}`,
                request: {
                    method: req.method,
                    path: req.path,
                    ip: req.ip,
                    userAgent: req.get('user-agent')
                },
                response: {
                    statusCode: 403,
                    success: false
                }
            });

            return res.status(403).json({
                success: false,
                error: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        securityConfig.jwt.secret,
        {
            expiresIn: securityConfig.jwt.expiresIn,
            algorithm: securityConfig.jwt.algorithm
        }
    );
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize,
    generateToken
};
