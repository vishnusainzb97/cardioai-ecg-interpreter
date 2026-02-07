const crypto = require('crypto');
const securityConfig = require('../config/security');

/**
 * AES-256-GCM Encryption for HIPAA compliance
 * Encrypts sensitive medical data at rest
 */
class Encryption {
    constructor() {
        this.algorithm = securityConfig.encryption.algorithm;
        this.keyLength = securityConfig.encryption.keyLength;
        this.ivLength = securityConfig.encryption.ivLength;
        this.tagLength = securityConfig.encryption.tagLength;
    }

    /**
     * Get or derive encryption key
     */
    getKey() {
        const envKey = process.env.ENCRYPTION_KEY;
        if (!envKey) {
            throw new Error('ENCRYPTION_KEY environment variable is required for HIPAA compliance');
        }
        // Derive a proper key from the password
        return crypto.scryptSync(envKey, 'cardioai-salt', this.keyLength);
    }

    /**
     * Encrypt data using AES-256-GCM
     * @param {string} plaintext - Data to encrypt
     * @returns {string} - Encrypted data as base64 string
     */
    encrypt(plaintext) {
        const key = this.getKey();
        const iv = crypto.randomBytes(this.ivLength);

        const cipher = crypto.createCipheriv(this.algorithm, key, iv, {
            authTagLength: this.tagLength
        });

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Combine IV + authTag + encrypted data
        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'hex')
        ]);

        return combined.toString('base64');
    }

    /**
     * Decrypt data using AES-256-GCM
     * @param {string} encryptedData - Base64 encrypted string
     * @returns {string} - Decrypted plaintext
     */
    decrypt(encryptedData) {
        const key = this.getKey();
        const combined = Buffer.from(encryptedData, 'base64');

        // Extract IV, authTag, and encrypted data
        const iv = combined.subarray(0, this.ivLength);
        const authTag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
        const encrypted = combined.subarray(this.ivLength + this.tagLength);

        const decipher = crypto.createDecipheriv(this.algorithm, key, iv, {
            authTagLength: this.tagLength
        });
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Hash sensitive data (one-way, for lookups)
     * @param {string} data - Data to hash
     * @returns {string} - SHA-256 hash
     */
    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}

module.exports = new Encryption();
