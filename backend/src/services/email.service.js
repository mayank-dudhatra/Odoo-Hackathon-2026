const nodemailer = require("nodemailer");
const { env } = require("../config/env");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    if (env.smtp.user && env.smtp.password) {
      const isGmail = (env.smtp.host && env.smtp.host.includes("gmail")) || (env.smtp.user && env.smtp.user.endsWith("@gmail.com"));
      if (isGmail) {
        transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: env.smtp.user,
            pass: env.smtp.password,
          },
        });
      } else if (env.smtp.host) {
        transporter = nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.port === 465,
          auth: {
            user: env.smtp.user,
            pass: env.smtp.password,
          },
        });
      }
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
    const fromAddress = env.smtp.from && env.smtp.from.includes("<")
      ? env.smtp.from
      : `"PeoplePay360" <${env.smtp.user || env.smtp.from || "no-reply@peoplepay360.com"}>`;

    const info = await activeTransporter.sendMail({
      from: fromAddress,
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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
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

async function sendUserInvitationEmail({ to, userName, emailOrUsername, tempPassword, loginUrl, companyName, employeeCode, roleName }) {
  const subject = `Welcome to ${companyName || 'PeoplePay360'} - Your Account Credentials`;
  const displayName = userName || "Employee";
  const targetLoginUrl = loginUrl || `${env.frontendBaseUrl.replace(/\/$/, "")}/login`;

  const text = `Hello ${displayName},

Welcome to ${companyName || 'PeoplePay360'}! An account has been created for you.

${employeeCode ? `Employee ID / Code: ${employeeCode}\n` : ''}${roleName ? `Role: ${roleName}\n` : ''}Login Email / Username: ${emailOrUsername}
Temporary Password: ${tempPassword}
Login URL: ${targetLoginUrl}

IMPORTANT SECURITY NOTICE:
You are required to change your temporary password immediately upon your first login. Do not share this temporary password with anyone.

Regards,
${companyName || 'PeoplePay360'} Team`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 700;">PeoplePay360</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Human Resource & Payroll Management Portal</p>
      </div>
      
      <div style="padding: 24px 0;">
        <p style="font-size: 16px; color: #0f172a; margin: 0 0 12px 0;">Hello <strong>${displayName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          Welcome to <strong>${companyName || 'PeoplePay360'}</strong>! Your employee portal account is ready. You can now log in using the temporary credentials below to access your profile, leave requests, attendance, and payslips.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Credentials</h3>
          ${employeeCode ? `<p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Employee Code:</strong> <span style="color: #0f172a; font-weight: 600;">${employeeCode}</span></p>` : ''}
          ${roleName ? `<p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Assigned Role:</strong> <span style="color: #0f172a;">${roleName}</span></p>` : ''}
          <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Email / ID:</strong> <span style="color: #0f172a; font-weight: 600;">${emailOrUsername}</span></p>
          <p style="margin: 8px 0 4px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; color: #1e293b; font-weight: 700;">${tempPassword}</code></p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${targetLoginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 13px 32px; text-decoration: none; border-radius: 7px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Log In to Portal</a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0 0 20px 0;">
          Direct link: <a href="${targetLoginUrl}" style="color: #2563eb; text-decoration: underline;">${targetLoginUrl}</a>
        </p>

        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-top: 20px;">
          <p style="font-size: 13px; color: #92400e; margin: 0; font-weight: 700;">Important Security Requirement:</p>
          <p style="font-size: 12px; color: #b45309; margin: 4px 0 0 0; line-height: 1.5;">
            You will be prompted to change your temporary password immediately upon your first login. Please keep your credentials secure and never share them with anyone.
          </p>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from ${companyName || 'PeoplePay360'}. If you did not expect this email, please contact your HR department.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

async function sendLeaveNotificationEmail({ to, employeeName, leaveTypeName, startDate, endDate, daysRequested, status, reason, companyName }) {
  if (!to) return false;
  const subject = `PeoplePay360 - Leave Request ${status}: ${leaveTypeName}`;
  const text = `Hello ${employeeName || 'Employee'},\n\nYour leave request for ${daysRequested} day(s) of ${leaveTypeName} (${startDate} to ${endDate}) has been updated to ${status}.\n${reason ? `Details/Reason: ${reason}\n` : ''}\nRegards,\n${companyName || 'PeoplePay360'} Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2563eb;">Leave Request Update</h2>
      <p>Hello <strong>${employeeName || 'Employee'}</strong>,</p>
      <p>Your leave request for <strong>${daysRequested} day(s)</strong> of <strong>${leaveTypeName}</strong> (${startDate} to ${endDate}) status is now <strong style="color: ${status === 'APPROVED' ? '#16a34a' : status === 'REFUSED' ? '#dc2626' : '#2563eb'};">${status}</strong>.</p>
      ${reason ? `<p style="background-color: #f8fafc; padding: 10px; border-radius: 4px;"><strong>Note:</strong> ${reason}</p>` : ''}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">This is an automated notification from ${companyName || 'PeoplePay360'}.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendUserInvitationEmail,
  sendLeaveNotificationEmail,
};
