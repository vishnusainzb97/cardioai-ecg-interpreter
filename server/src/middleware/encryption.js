const encryption = require('../utils/encryption');
const logger = require('../utils/logger');

/**
 * Middleware to encrypt sensitive fields in response
 * Used for encrypting PHI before storage
 */
const encryptResponse = (fieldsToEncrypt = []) => {
    return (req, res, next) => {
        const originalJson = res.json;

        res.json = function (data) {
            try {
                if (data && typeof data === 'object') {
                    fieldsToEncrypt.forEach(field => {
                        if (data[field]) {
                            data[field] = encryption.encrypt(JSON.stringify(data[field]));
                        }
                    });
                }
            } catch (error) {
                logger.error('Encryption middleware error:', error);
            }

            return originalJson.call(this, data);
        };

        next();
    };
};

/**
 * Middleware to decrypt sensitive fields from request
 */
const decryptRequest = (fieldsToDecrypt = []) => {
    return (req, res, next) => {
        try {
            if (req.body) {
                fieldsToDecrypt.forEach(field => {
                    if (req.body[field]) {
                        const decrypted = encryption.decrypt(req.body[field]);
                        req.body[field] = JSON.parse(decrypted);
                    }
                });
            }
        } catch (error) {
            logger.error('Decryption middleware error:', error);
            return res.status(400).json({
                success: false,
                error: 'Failed to decrypt request data.'
            });
        }

        next();
    };
};

/**
 * Helper to encrypt data for storage
 */
const encryptForStorage = (data) => {
    if (typeof data === 'string') {
        return encryption.encrypt(data);
    }
    return encryption.encrypt(JSON.stringify(data));
};

/**
 * Helper to decrypt data from storage
 */
const decryptFromStorage = (encryptedData) => {
    try {
        const decrypted = encryption.decrypt(encryptedData);
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    } catch (error) {
        logger.error('Decryption error:', error);
        return null;
    }
};

module.exports = {
    encryptResponse,
    decryptRequest,
    encryptForStorage,
    decryptFromStorage
};
