// Security configuration for HIPAA compliance
const securityConfig = {
    // JWT Settings
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        algorithm: 'HS256'
    },

    // Encryption Settings (AES-256)
    encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16,
        tagLength: 16,
        key: process.env.ENCRYPTION_KEY
    },

    // Password Hashing
    bcrypt: {
        saltRounds: 12
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
    },

    // CORS Settings
    cors: {
        origins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    },

    // Security Headers (Helmet)
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true
        }
    },

    // File Upload
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'application/pdf',
            'application/dicom'
        ],
        uploadDir: process.env.UPLOAD_DIR || './uploads'
    }
};

module.exports = securityConfig;
