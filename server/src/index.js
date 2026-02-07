require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const securityConfig = require('./config/security');
const logger = require('./utils/logger');
const ecgAnalysisService = require('./services/ecgAnalysis');

// Import routes
const authRoutes = require('./routes/auth');
const ecgRoutes = require('./routes/ecg');
const historyRoutes = require('./routes/history');

// Initialize Express app
const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for API
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = securityConfig.cors.origins;
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: securityConfig.cors.methods,
    allowedHeaders: securityConfig.cors.allowedHeaders,
    credentials: securityConfig.cors.credentials
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: securityConfig.rateLimit.windowMs,
    max: securityConfig.rateLimit.max,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });

    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ecg', ecgRoutes);
app.use('/api/history', historyRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'CardioAI ECG Interpreter API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Create new account',
                'POST /api/auth/login': 'Login and get JWT',
                'GET /api/auth/me': 'Get current user profile',
                'POST /api/auth/logout': 'Logout',
                'PUT /api/auth/password': 'Change password'
            },
            ecg: {
                'POST /api/ecg/analyze': 'Analyze ECG image',
                'POST /api/ecg/analyze-pdf': 'Extract and analyze ECG from PDF',
                'POST /api/ecg/analyze-dicom': 'Parse and analyze DICOM ECG',
                'GET /api/ecg/sample/:type': 'Get sample ECG data'
            },
            history: {
                'GET /api/history': 'Get analysis history',
                'GET /api/history/stats': 'Get analysis statistics',
                'GET /api/history/:id': 'Get specific record',
                'GET /api/history/:id/ecg-data': 'Get decrypted ECG data',
                'GET /api/history/:id/report': 'Download PDF report',
                'DELETE /api/history/:id': 'Delete record',
                'DELETE /api/history': 'Delete all records'
            }
        }
    });
});

// Serve static files from frontend (for unified deployment)
const frontendPath = path.join(__dirname, '../../');
app.use(express.static(frontendPath));

// Catch-all for frontend routes
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation error',
            details: err.message
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 50MB.'
        });
    }

    // Generic error response
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();

        // Initialize ML service
        await ecgAnalysisService.initialize();

        // Start listening
        app.listen(PORT, () => {
            logger.info(`🚀 CardioAI Server running on port ${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🔗 API Documentation: http://localhost:${PORT}/api`);
            logger.info(`💓 Health Check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
