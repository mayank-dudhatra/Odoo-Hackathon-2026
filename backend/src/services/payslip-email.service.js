const fs = require("fs");
const { getPayslipById, updatePayslipEmailStatus, updatePayslipPdfPath } = require("../repositories/payslip.repository");
const { generatePayslipPDF } = require("./payslip-pdf.service");
const { sendEmail } = require("./email.service");
const { createAuditLog } = require("./audit.service");
const { AppError } = require("../utils/http");
const { query } = require("../db");

async function resolveEmployeeEmail(companyId, payslip) {
  if (payslip.snapshot_data?.employee?.email) {
    return payslip.snapshot_data.employee.email;
  }
  // Fall back to employee record or user account email
  const res = await query(
    `
      SELECT e.email AS emp_email, u.email AS user_email
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.employee_id
      WHERE e.company_id = $1 AND e.employee_id = $2
    `,
    [companyId, payslip.employee_id]
  );
  const row = res.rows[0];
  return row?.emp_email || row?.user_email || null;
}

async function sendSinglePayslipEmailService({ companyId, payslipId, actorUserId, client = null }) {
  const payslip = await getPayslipById(client, companyId, payslipId);
  if (!payslip) {
    throw new AppError(404, "Payslip not found", "PAYSLIP_NOT_FOUND");
  }

  const recipientEmail = await resolveEmployeeEmail(companyId, payslip);
  if (!recipientEmail) {
    const errorMsg = `No valid email address found for employee ${payslip.employee_code_snapshot}`;
    await updatePayslipEmailStatus(client, companyId, payslipId, {
      email_status: "FAILED",
      email_error_message: errorMsg,
    });
    throw new AppError(400, errorMsg, "MISSING_RECIPIENT_EMAIL");
  }

  // Ensure PDF is generated
  let pdfPath = payslip.pdf_file_path;
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    pdfPath = await generatePayslipPDF(payslip);
    await updatePayslipPdfPath(client, companyId, payslipId, pdfPath, payslip.status === "DRAFT" ? "GENERATED" : payslip.status);
  }

  const companyName = payslip.snapshot_data?.company?.name || "PeoplePay360";
  const empName = payslip.employee_name_snapshot || "Employee";
  const periodStart = payslip.period_start;
  const periodEnd = payslip.period_end;

  const subject = `Your Payslip for Period ${periodStart} to ${periodEnd} - ${companyName}`;
  const text = `Hello ${empName},

Please find attached your payslip for the payroll period from ${periodStart} to ${periodEnd}.

Net Salary: ${payslip.net_pay}

If you have any questions regarding your payslip, please reach out to your HR/Payroll department.

Regards,
${companyName} Payroll Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
        <h2 style="color: #1e40af; margin: 0;">${companyName}</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Payslip Notification</p>
      </div>

      <div style="padding: 20px 0;">
        <p style="font-size: 16px; color: #1e293b;">Hello <strong>${empName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          Your payslip for the period <strong>${periodStart}</strong> to <strong>${periodEnd}</strong> is now available and attached to this email.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Employee Code:</strong> ${payslip.employee_code_snapshot}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Pay Period:</strong> ${periodStart} to ${periodEnd}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Net Salary:</strong> <span style="color: #1e40af; font-weight: bold;">${payslip.net_pay}</span></p>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          The attached PDF document contains your full salary details including gross earnings, tax, and deductions.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">This is an automated notification from ${companyName} Payroll.</p>
    </div>
  `;

  try {
    const activeTransporter = require("./email.service");
    // Send email with PDF attachment
    await activeTransporter.sendEmail({
      to: recipientEmail,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `payslip_${payslip.employee_code_snapshot}_${periodStart}.pdf`,
          path: pdfPath,
        },
      ],
    });

    const updatedPayslip = await updatePayslipEmailStatus(client, companyId, payslipId, {
      email_status: "SENT",
      email_sent_at: new Date(),
      email_error_message: null,
      status: "SENT",
    });

    await createAuditLog({
      companyId,
      userId: actorUserId,
      module: "PAYROLL",
      action: "PAYSLIP_EMAILED",
      recordId: payslipId,
      details: { recipient: recipientEmail },
    }, client);

    return updatedPayslip;
  } catch (error) {
    const errorMsg = error.message || "Failed to deliver payslip email";
    await updatePayslipEmailStatus(client, companyId, payslipId, {
      email_status: "FAILED",
      email_error_message: errorMsg,
      status: "FAILED",
    });

    await createAuditLog({
      companyId,
      userId: actorUserId,
      module: "PAYROLL",
      action: "PAYSLIP_EMAIL_FAILED",
      recordId: payslipId,
      details: { recipient: recipientEmail, error: errorMsg },
    }, client);

    throw new AppError(500, `Email delivery failed: ${errorMsg}`, "EMAIL_DELIVERY_FAILED");
  }
}

module.exports = {
  sendSinglePayslipEmailService,
};
