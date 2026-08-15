const nodemailer = require('nodemailer');

const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS.replace(/\s/g, ''),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Awoora Global Professional Services <info@awooraa.com>',
    to: email,
    subject: 'Your Awoora Global Professional Services Login OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#F8F7F4;font-family:'Helvetica Neue',Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
          <div style="text-align:center;margin-bottom:48px;">
            <h1 style="margin:0;font-size:24px;font-weight:700;color:#0F2444;letter-spacing:2px;">AWOORAA GLOBAL</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;">Professional Services</p>
          </div>
          <div style="background:#ffffff;border-radius:16px;padding:48px 40px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#0F2444;text-align:center;">Verify Your Identity</h2>
            <p style="margin:0 0 40px;font-size:15px;color:#6B7280;text-align:center;line-height:1.6;">
              Enter the one-time password below to access your Awooraa account.
            </p>
            <div style="background:#0F2444;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
              <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#C9973A;">${otp}</span>
            </div>
            <p style="margin:0;font-size:13px;color:#9CA3AF;text-align:center;line-height:1.6;">
              This OTP expires in <strong>10 minutes</strong>.<br>
              Never share it with anyone. Awoora Global Professional Services will never ask for your OTP.
            </p>
          </div>
          <p style="text-align:center;color:#D1D5DB;font-size:12px;margin-top:32px;">
            © 2024 Awoora Global Professional Services. All rights reserved.<br>
            One Partner. Every Solution.
          </p>
        </div>
      </body>
      </html>
    `,
  });
};

module.exports = { sendOTPEmail };
