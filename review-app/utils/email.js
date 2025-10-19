const nodemailer = require('nodemailer');

const getTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }

  // fallback: jsonTransport (does not deliver emails externally)
  return nodemailer.createTransport({ jsonTransport: true });
};

exports.send = async ({ to, subject, text, html }) => {
  // If SMTP isn't configured, throw so callers (signup) can fall back to dev behaviour
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS in your .env to send real emails.');
  }

  const transporter = getTransporter();
  const info = await transporter.sendMail({ from: process.env.SMTP_FROM || 'noreply@example.com', to, subject, text, html });
  return info;
};
