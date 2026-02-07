const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const securityConfig = require('../config/security');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        select: false // Don't include in queries by default
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: 100
    },
    role: {
        type: String,
        enum: ['user', 'clinician', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();

    try {
        const salt = await bcrypt.genSalt(securityConfig.bcrypt.saltRounds);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
    return this.lockUntil && this.lockUntil > Date.now();
};

// Static method to handle failed login attempts
userSchema.statics.handleFailedLogin = async function (userId) {
    const MAX_ATTEMPTS = 5;
    const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

    const user = await this.findById(userId);
    if (!user) return;

    user.loginAttempts += 1;

    if (user.loginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);
    }

    await user.save();
};

// Static method to reset login attempts on successful login
userSchema.statics.resetLoginAttempts = async function (userId) {
    await this.findByIdAndUpdate(userId, {
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date()
    });
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.loginAttempts;
    delete obj.lockUntil;
    return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
