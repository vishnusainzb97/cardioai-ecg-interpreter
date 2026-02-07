const express = require('express');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { auditUser } = require('../middleware/audit');
const { validate, registerRules, loginRules } = require('../utils/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Apply audit logging to all auth routes
router.use(auditUser);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerRules, validate, async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered.'
            });
        }

        // Create user
        const user = new User({
            email: email.toLowerCase(),
            passwordHash: password, // Will be hashed by pre-save hook
            name
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        logger.info(`New user registered: ${email}`);

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
                user: user.toJSON(),
                token
            }
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create account.'
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT
 * @access  Public
 */
router.post('/login', loginRules, validate, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials.'
            });
        }

        // Check if account is locked
        if (user.isLocked()) {
            return res.status(423).json({
                success: false,
                error: 'Account is temporarily locked. Please try again later.'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated.'
            });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            await User.handleFailedLogin(user._id);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials.'
            });
        }

        // Reset login attempts and update last login
        await User.resetLoginAttempts(user._id);

        // Generate token
        const token = generateToken(user._id);

        logger.info(`User logged in: ${email}`);

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                user: user.toJSON(),
                token
            }
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed.'
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const { authenticate } = require('../middleware/auth');

router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        res.json({
            success: true,
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile.'
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token invalidation)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
    // In a JWT setup, logout is handled client-side by removing the token
    // For enhanced security, you could implement a token blacklist

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
        success: true,
        message: 'Logged out successfully.'
    });
});

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 * @access  Private
 */
router.put('/password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required.'
            });
        }

        const user = await User.findById(req.userId).select('+passwordHash');

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect.'
            });
        }

        // Update password
        user.passwordHash = newPassword;
        await user.save();

        logger.info(`Password changed for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Password changed successfully.'
        });
    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password.'
        });
    }
});

module.exports = router;
