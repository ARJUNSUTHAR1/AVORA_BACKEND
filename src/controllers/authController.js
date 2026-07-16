const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/mailer');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    await OTP.deleteMany({ email: email.toLowerCase() });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.create({ email: email.toLowerCase(), otp: hashOTP(otp), expiresAt });
    await sendOTPEmail(email, otp);

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    res.json({
      message: 'OTP sent to your email',
      isNewUser: !existingUser,
      hasPassword: existingUser?.password ? true : false,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpDoc = await OTP.findOne({
      email: email.toLowerCase(),
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (otpDoc.attempts >= 3) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    if (otpDoc.otp !== hashOTP(otp)) {
      await OTP.updateOne({ _id: otpDoc._id }, { $inc: { attempts: 1 } });
      const remaining = 3 - otpDoc.attempts - 1;
      return res.status(400).json({ message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
    }

    await OTP.deleteOne({ _id: otpDoc._id });

    let user = await User.findOne({ email: email.toLowerCase() });
    const isNewUser = !user;

    if (!user) {
      user = await User.create({ email: email.toLowerCase(), isVerified: true });
    } else {
      user.isVerified = true;
      user.lastLogin = new Date();
      await user.save();
    }

    if (isNewUser || !user.password) {
      const tempToken = jwt.sign(
        { email: email.toLowerCase(), purpose: 'set-password' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      return res.json({
        message: 'OTP verified. Please set your password.',
        requiresPassword: true,
        tempToken,
      });
    }

    const token = signToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};

const setPassword = async (req, res) => {
  try {
    const { tempToken, password } = req.body;
    if (!tempToken || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please start over.' });
    }

    if (decoded.purpose !== 'set-password') {
      return res.status(401).json({ message: 'Invalid session token' });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({
      message: 'Password set successfully',
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ message: 'Failed to set password. Please try again.' });
  }
};

const loginWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

const getMe = async (req, res) => {
  res.json({
    user: { id: req.user._id, email: req.user.email, name: req.user.name, role: req.user.role },
  });
};

module.exports = { sendOTP, verifyOTP, setPassword, loginWithPassword, getMe };
