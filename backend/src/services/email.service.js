const nodemailer = require("nodemailer");
const { env } = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (env.smtp.host && env.smtp.user && env.smtp.password) {
      transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465, // true for 465, false for 587 or other ports
        auth: {
          user: env.smtp.user,
          pass: env.smtp.password,
        },
      });
    }
  }
  return transporter;
}

async function sendEmail({ to, subject, html, text, attachments }) {
  const activeTransporter = getTransporter();

  if (!activeTransporter) {
    console.warn(
      `[EmailService] SMTP credentials not fully set. Email not sent via SMTP. Target: ${to}, Subject: "${subject}"`
    );
    return false;
  }

  try {
    const info = await activeTransporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html,
      attachments,
    });
    console.log(`[EmailService] Email sent to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    throw error;
  }
}

async function sendPasswordResetEmail({ to, resetUrl, userName }) {
  const subject = "PeoplePay360 - Password Reset Request";
  const displayName = userName || "User";

  const text = `Hello ${displayName},\n\nYou requested a password reset for your PeoplePay360 account.\n\nPlease use the following link to reset your password:\n${resetUrl}\n\nThis link will expire in ${env.passwordResetTtlMinutes} minutes.\n\nIf you did not request this, please ignore this email or contact support.\n\nRegards,\nPeoplePay360 Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; borderRadius: 8px;">
      <h2 style="color: #4f46e5;">PeoplePay360 Password Reset</h2>
      <p>Hello <strong>${displayName}</strong>,</p>
      <p>We received a request to reset the password for your PeoplePay360 account.</p>
      <p style="margin: 25px 0;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">Or copy and paste this URL into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="font-size: 13px; color: #9ca3af; margin-top: 20px;">This password reset link is valid for <strong>${env.passwordResetTtlMinutes} minutes</strong> and can only be used once.</p>
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

async function sendUserInvitationEmail({ to, userName, emailOrUsername, tempPassword, loginUrl, companyName }) {
  const subject = `Welcome to ${companyName || 'PeoplePay360'} - Your Account Credentials`;
  const displayName = userName || "User";
  const targetLoginUrl = loginUrl || `${env.frontendBaseUrl.replace(/\/$/, "")}/login`;

  const text = `Hello ${displayName},

Welcome to ${companyName || 'PeoplePay360'}! An account has been created for you.

Login Email/ID: ${emailOrUsername}
Temporary Password: ${tempPassword}
Login URL: ${targetLoginUrl}

IMPORTANT SECURITY NOTICE:
You are required to change your temporary password immediately upon your first login. Do not share this temporary password with anyone.

Regards,
${companyName || 'PeoplePay360'} Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <h2 style="color: #4f46e5; margin: 0;">PeoplePay360</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Human Capital & Payroll Management</p>
      </div>
      
      <div style="padding: 20px 0;">
        <p style="font-size: 16px; color: #1e293b;">Hello <strong>${displayName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          An account has been created for you at <strong>${companyName || 'PeoplePay360'}</strong>. You can now log in using the temporary credentials provided below.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Login Email / ID:</strong> ${emailOrUsername}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 15px; color: #0f172a;">${tempPassword}</code></p>
        </div>

        <p style="margin: 25px 0; text-align: center;">
          <a href="${targetLoginUrl}" style="background-color: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Log In to Your Account</a>
        </p>

        <div style="background-color: #fffbebf8; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin-top: 20px;">
          <p style="font-size: 13px; color: #92400e; margin: 0; font-weight: 600;">Security Requirement:</p>
          <p style="font-size: 13px; color: #b45309; margin: 4px 0 0 0; line-height: 1.5;">
            You will be prompted to change your temporary password immediately after your first login. Do not share this temporary password with anyone.
          </p>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from PeoplePay360.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendUserInvitationEmail,
};
