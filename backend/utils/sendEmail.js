const nodemailer = require("nodemailer");

// ─── Singleton Transporter ─────────────────────────────────────────────────
// Creating a transporter is expensive (DNS lookups, TLS handshake).
// Reuse one pooled instance across all requests.
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: Infinity,
  });
  return _transporter;
};

const sendEmail = async ({ to, subject, html }) => {
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
};

const getResetPasswordEmail = (name, resetUrl) => {
  const expiry = process.env.RESET_TOKEN_EXPIRE || 15;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reset Password</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 14px 32px; background-color: #6C63FF; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 24px 0; }
        .footer { margin-top: 32px; font-size: 12px; color: #999; }
        h2 { color: #333; }
        p { color: #555; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Manage Maladaptive Daydreaming — Reset Your Password</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to create a new password. This link is valid for <strong>${expiry} minutes</strong>.</p>
        <a href="${resetUrl}" class="btn">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <div class="footer">
          <p>This link expires in ${expiry} minutes for your security.</p>
          <p>— The Managing Maladaptive Daydreaming Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { sendEmail, getResetPasswordEmail };
