const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const OTP = require('../models/OTP');
const { sendOTPEmail } = require('../utils/mailer');
const crypto = require('crypto');

// Generate 6 digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const otp = generateOTP();
    
    // Delete existing OTPs for this email to prevent spam
    await OTP.deleteMany({ email });

    await OTP.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    await sendOTPEmail(email, otp, 'Contact Verification');
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) return res.status(400).json({ message: 'OTP expired or not found' });
    
    if (otpRecord.attempts >= 3) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: 'Too many failed attempts. Request a new OTP.' });
    }

    if (otpRecord.otp !== otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP matches, delete it so it can't be reused
    await OTP.deleteOne({ _id: otpRecord._id });
    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

router.post('/', async (req, res) => {
  const { name, email, phone, company, service, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Name, email, and message are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.zoho.in',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: parseInt(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.OFFICE_EMAIL_USER || 'office@awooraa.com',
        pass: process.env.OFFICE_EMAIL_PASS ? process.env.OFFICE_EMAIL_PASS.replace(/\s/g, '') : undefined
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Awoora Global Professional Services" <${process.env.OFFICE_EMAIL_USER || 'office@awooraa.com'}>`,
      to: process.env.EMAIL_USER || 'info@awooraa.com',
      bcc: process.env.EMAIL_USER || 'info@awooraa.com',
      replyTo: email,
      subject: `New Contact Request from ${name}`,
      text: `
You have a new contact form submission.

Name: ${name}
Email: ${email}
Phone: ${phone || 'N/A'}
Company: ${company || 'N/A'}
Service Required: ${service || 'N/A'}

Message:
${message}
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully, messageId:', info.messageId);

    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending email' });
  }
});

module.exports = router;
