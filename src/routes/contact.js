const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

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
        user: process.env.EMAIL_USER || 'info@awooraa.com',
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : undefined
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"Awoora Global Professional Services" <${process.env.EMAIL_USER || 'info@awooraa.com'}>`,
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
