const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOTP, verifyOTP, setPassword, loginWithPassword, getMe } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests from this IP. Please try again after 15 minutes.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again later.' },
});

router.post('/send-otp', otpLimiter, sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/set-password', setPassword);
router.post('/login', loginLimiter, loginWithPassword);
router.get('/me', protect, getMe);

module.exports = router;
