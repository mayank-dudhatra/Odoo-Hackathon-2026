import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import type { Payslip, PayslipStatus, EmailStatus } from '../../types/payroll';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { CardSkeleton, ErrorAlert } from '../../components/common/States';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const PayslipDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, checkPermission } = useAuth();

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const isAdmin = role === 'Admin';
  const canEmail = isAdmin || checkPermission('PAYSLIPS', 'PROCESS');

  const fetchPayslip = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await payrollApi.getPayslipById(Number(id));
      setPayslip(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch payslip details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayslip();
  }, [fetchPayslip]);

  const handleDownload = async () => {
    if (!payslip) return;
    setDownloading(true);
    try {
      const filename = `payslip_${payslip.employee_code_snapshot || payslip.payslip_id}_${payslip.period_start}.pdf`;
      await payrollApi.downloadPayslipPdf(payslip.payslip_id, filename);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to download payslip PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!payslip) return;
    setEmailing(true);
    try {
      await payrollApi.sendSinglePayslipEmail(payslip.payslip_id);
      alert('Payslip email successfully queued / dispatched!');
      fetchPayslip();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send payslip email');
    } finally {
      setEmailing(false);
    }
  };

  const getStatusBadge = (status: PayslipStatus) => {
    const map: Record<PayslipStatus, { label: string; variant: BadgeVariant }> = {
      CONFIRMED: { label: 'Confirmed', variant: 'success' },
      PAID: { label: 'Paid', variant: 'success' },
      DRAFT: { label: 'Draft', variant: 'warning' },
      CANCELLED: { label: 'Cancelled', variant: 'neutral' },
    };
    const s = map[status] || { label: status, variant: 'neutral' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getEmailBadge = (status?: EmailStatus) => {
    if (!status) return null;
    const map: Record<EmailStatus, { label: string; variant: BadgeVariant }> = {
      SENT: { label: 'Email Sent', variant: 'success' },
      PENDING: { label: 'Email Pending', variant: 'warning' },
      FAILED: { label: 'Email Failed', variant: 'danger' },
    };
    const s = map[status] || { label: status, variant: 'neutral' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-[#E2E8F0] animate-pulse rounded" />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/payslips')}>
          Back to Payslips
        </Button>
        <ErrorAlert message={error || 'Payslip record not found'} onRetry={fetchPayslip} />
      </div>
    );
  }

  const employeeName = payslip.first_name_snapshot
    ? `${payslip.first_name_snapshot} ${payslip.last_name_snapshot || ''}`
    : payslip.employee_name || `Employee #${payslip.employee_id}`;

  const earningsCategories = ['BASIC', 'ALLOWANCE', 'GROSS', 'REIMBURSEMENT'];
  const deductionCategories = ['DEDUCTION', 'TAX', 'CONTRIBUTION'];

  const lines = payslip.lines || [];
  const earningsLines = lines.filter((l) => earningsCategories.includes(l.category));
  const deductionsLines = lines.filter((l) => deductionCategories.includes(l.category));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                Payslip #{payslip.payslip_id}
              </h1>
              {getStatusBadge(payslip.status)}
              {getEmailBadge(payslip.email_status)}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 font-mono">
              Period: {formatDate(payslip.period_start)} → {formatDate(payslip.period_end)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEmail && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={handleSendEmail}
              isLoading={emailing}
            >
              Email Payslip
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownload}
            isLoading={downloading}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Payslip Document Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
        {/* Document Header */}
        <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                Official Salary Statement
              </div>
              <h2 className="text-xl font-bold text-[#0F172A]">{employeeName}</h2>
              <div className="text-sm font-mono text-[#64748B] mt-0.5">
                {payslip.employee_code_snapshot || payslip.employee_code}
              </div>
              {payslip.email_snapshot && (
                <div className="text-xs text-[#64748B] mt-1">{payslip.email_snapshot}</div>
              )}
            </div>

            <div className="text-left md:text-right space-y-1 text-xs text-[#64748B]">
              <div>
                <span className="font-semibold text-[#0F172A]">Department: </span>
                {payslip.department_name_snapshot || 'General Operations'}
              </div>
              <div>
                <span className="font-semibold text-[#0F172A]">Job Position: </span>
                {payslip.position_name_snapshot || 'Staff'}
              </div>
              <div>
                <span className="font-semibold text-[#0F172A]">Salary Structure: </span>
                {payslip.salary_structure_name_snapshot || 'Standard'}
              </div>
              {payslip.wage_snapshot != null && (
                <div>
                  <span className="font-semibold text-[#0F172A]">Base Contract Wage: </span>
                  {formatCurrency(payslip.wage_snapshot)} ({payslip.wage_type_snapshot?.toLowerCase() || 'monthly'})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Lines Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
          {/* Earnings Column */}
          <div className="p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Earnings & Allowances
            </h3>

            {earningsLines.length === 0 ? (
              <div className="py-4 text-xs text-[#64748B] italic">No itemized earnings lines</div>
            ) : (
              <div className="space-y-2.5">
                {earningsLines.map((line) => (
                  <div key={line.payslip_line_id} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-[#0F172A]">{line.rule_name}</div>
                      <div className="text-xs font-mono text-[#64748B]">{line.rule_code}</div>
                    </div>
                    <div className="font-mono font-medium text-[#0F172A]">
                      {formatCurrency(line.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center text-sm font-bold text-[#0F172A]">
              <span>Gross Earnings:</span>
              <span className="font-mono text-base text-blue-700">
                {formatCurrency(payslip.gross_pay)}
              </span>
            </div>
          </div>

          {/* Deductions Column */}
          <div className="p-6 space-y-4 bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-600" />
              Deductions & Taxes
            </h3>

            {deductionsLines.length === 0 ? (
              <div className="py-4 text-xs text-[#64748B] italic">No statutory deductions applied</div>
            ) : (
              <div className="space-y-2.5">
                {deductionsLines.map((line) => (
                  <div key={line.payslip_line_id} className="flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-[#0F172A]">{line.rule_name}</div>
                      <div className="text-xs font-mono text-[#64748B]">{line.rule_code}</div>
                    </div>
                    <div className="font-mono font-medium text-rose-600">
                      -{formatCurrency(line.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center text-sm font-bold text-[#0F172A]">
              <span>Total Deductions:</span>
              <span className="font-mono text-base text-rose-600">
                -{formatCurrency(payslip.total_deductions)}
              </span>
            </div>
          </div>
        </div>

        {/* Total Net Salary Banner */}
        <div className="p-6 bg-emerald-50 border-t border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-emerald-800">
              Net Payable Take-Home Amount
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">
              Historical immutable snapshot confirmed on {formatDate(payslip.created_at)}
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-800">
            {formatCurrency(payslip.net_pay)}
          </div>
        </div>
      </div>
    </div>
  );
};
export default PayslipDetailPage;
