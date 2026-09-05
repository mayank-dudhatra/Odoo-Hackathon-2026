const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Service to generate professional payslip PDF files from immutable snapshot data.
 */

function formatCurrency(amount, currencyCode = "INR") {
  const num = Number(amount) || 0;
  return `${currencyCode} ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}

async function generatePayslipPDF(payslip) {
  return new Promise((resolve, reject) => {
    try {
      const companyId = payslip.company_id;
      const payslipId = payslip.payslip_id;

      // Extract snapshot data or fall back to header fields
      const snapshot = payslip.snapshot_data || {};
      const companyInfo = snapshot.company || {
        name: payslip.company_name || "PeoplePay360 Demo Pvt Ltd",
        email: "contact@peoplepay360.com",
        address: "Corporate HQ, Tech Park, India",
        currency_code: "INR",
      };

      const employeeInfo = snapshot.employee || {
        name: payslip.employee_name_snapshot || "N/A",
        code: payslip.employee_code_snapshot || "N/A",
        department: "General",
        position: "Employee",
      };

      const storageDir = path.join(__dirname, "../../storage/payslips", `company_${companyId}`);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const fileName = `payslip_${payslipId}.pdf`;
      const filePath = path.join(storageDir, fileName);

      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // Colors
      const primaryColor = "#1e40af"; // Deep Blue
      const secondaryColor = "#475569"; // Slate Gray
      const darkColor = "#0f172a";
      const lightBg = "#f8fafc";
      const accentBg = "#e0e7ff";

      // Header: Company & Title
      doc.fillColor(primaryColor).fontSize(20).font("Helvetica-Bold").text(companyInfo.name, 40, 40);
      doc.fillColor(secondaryColor).fontSize(9).font("Helvetica")
        .text(companyInfo.address || "", 40, 65)
        .text(`Email: ${companyInfo.email || "N/A"}`, 40, 78);

      doc.fillColor(primaryColor).fontSize(18).font("Helvetica-Bold").text("PAYSLIP", 400, 40, { align: "right" });
      doc.fillColor(secondaryColor).fontSize(9).font("Helvetica")
        .text(`Ref #: PAYSLIP-${payslipId}`, 400, 65, { align: "right" })
        .text(`Generated: ${formatDate(payslip.generated_at || new Date())}`, 400, 78, { align: "right" });

      // Horizontal Divider
      doc.moveTo(40, 100).lineTo(555, 100).strokeColor("#cbd5e1").lineWidth(1).stroke();

      // Employee & Payroll Info Box
      const boxY = 110;
      doc.rect(40, boxY, 515, 80).fillAndStroke(lightBg, "#e2e8f0");

      doc.fillColor(darkColor).fontSize(10).font("Helvetica-Bold");
      doc.text("EMPLOYEE DETAILS", 50, boxY + 10);
      doc.text("PAYROLL PERIOD", 320, boxY + 10);

      doc.fontSize(9).font("Helvetica").fillColor(secondaryColor);

      // Left Column Details
      doc.text(`Employee Name:`, 50, boxY + 28);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(`${employeeInfo.name}`, 140, boxY + 28);

      doc.fillColor(secondaryColor).font("Helvetica").text(`Employee Code:`, 50, boxY + 44);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(`${employeeInfo.code}`, 140, boxY + 44);

      doc.fillColor(secondaryColor).font("Helvetica").text(`Department / Pos:`, 50, boxY + 60);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(`${employeeInfo.department || "-"} / ${employeeInfo.position || "-"}`, 140, boxY + 60);

      // Right Column Details
      doc.fillColor(secondaryColor).font("Helvetica").text(`Pay Period:`, 320, boxY + 28);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(`${formatDate(payslip.period_start)} to ${formatDate(payslip.period_end)}`, 400, boxY + 28);

      doc.fillColor(secondaryColor).font("Helvetica").text(`Payrun Name:`, 320, boxY + 44);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(`${payslip.payrun_name || snapshot.period?.payrun_name || "Monthly Payrun"}`, 400, boxY + 44);

      doc.fillColor(secondaryColor).font("Helvetica").text(`Worked Days:`, 320, boxY + 60);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(`${payslip.worked_days || 0} Days`, 400, boxY + 60);

      // Payslip Lines Table
      let tableY = 205;

      doc.rect(40, tableY, 515, 22).fill(primaryColor);
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
      doc.text("CODE", 50, tableY + 6);
      doc.text("DESCRIPTION / RULE NAME", 130, tableY + 6);
      doc.text("CATEGORY", 330, tableY + 6);
      doc.text("AMOUNT", 460, tableY + 6, { align: "right" });

      tableY += 22;

      const lines = payslip.lines || [];
      const currency = companyInfo.currency_code || "INR";

      lines.forEach((line, index) => {
        const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, tableY, 515, 20).fillAndStroke(bg, "#f1f5f9");

        doc.fillColor(darkColor).fontSize(8.5).font("Helvetica");
        doc.text(line.rule_code_snapshot || "-", 50, tableY + 5);
        doc.text(line.label || "-", 130, tableY + 5);
        doc.text(line.category || "-", 330, tableY + 5);
        doc.font("Helvetica-Bold").text(formatCurrency(line.amount, currency), 450, tableY + 5, { align: "right" });

        tableY += 20;

        // Manage page height limit
        if (tableY > 700) {
          doc.addPage();
          tableY = 40;
        }
      });

      tableY += 15;

      // Summary Box
      const summaryY = tableY;
      doc.rect(300, summaryY, 255, 90).fillAndStroke(lightBg, "#cbd5e1");

      doc.fontSize(9.5).font("Helvetica").fillColor(secondaryColor);
      doc.text("Gross Salary:", 310, summaryY + 12);
      doc.fillColor(darkColor).font("Helvetica-Bold").text(formatCurrency(payslip.gross_pay, currency), 440, summaryY + 12, { align: "right" });

      doc.font("Helvetica").fillColor(secondaryColor).text("Total Deductions/Tax:", 310, summaryY + 30);
      doc.fillColor("#dc2626").font("Helvetica-Bold").text(`- ${formatCurrency(payslip.total_deductions, currency)}`, 440, summaryY + 30, { align: "right" });

      // Highlight Net Pay Box
      doc.rect(305, summaryY + 48, 245, 32).fill(accentBg);
      doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold");
      doc.text("NET SALARY:", 315, summaryY + 58);
      doc.text(formatCurrency(payslip.net_pay, currency), 420, summaryY + 58, { align: "right" });

      // Footer Notice
      doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
        .text("This payslip is an official historical financial snapshot generated by PeoplePay360.", 40, 780, { align: "center" })
        .text("Values on this document are permanently preserved and immutable.", 40, 792, { align: "center" });

      doc.end();

      stream.on("finish", () => {
        resolve(filePath);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generatePayslipPDF,
};
