import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  CreditCard,
  FileSpreadsheet,
  Mail,
  AlertTriangle,
  Users,
  DollarSign,
  TrendingDown,
  Eye,
} from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import type { Payrun, PayrunEmployee, PayrunStatus, Payslip } from '../../types/payroll';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CardSkeleton, TableSkeleton, ErrorAlert } from '../../components/common/States';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const PayrunDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, checkPermission } = useAuth();

  const [payrun, setPayrun] = useState<Payrun | null>(null);
  const [employees, setEmployees] = useState<PayrunEmployee[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workflow actions
  const [computing, setComputing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [generatingPayslips, setGeneratingPayslips] = useState(false);
  const [emailing, setEmailing] = useState(false);

  // Confirm dialogs
  const [confirmValidateOpen, setConfirmValidateOpen] = useState(false);
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [confirmEmailOpen, setConfirmEmailOpen] = useState(false);

  // Permissions
  const isAdmin = role === 'Admin';
  const canCompute = isAdmin || checkPermission('PAYRUNS', 'PROCESS');
  const canValidate = isAdmin || checkPermission('PAYRUNS', 'VALIDATE');
  const canPay = isAdmin || checkPermission('PAYRUNS', 'PAY');
  const canCreatePayslip = isAdmin || checkPermission('PAYSLIPS', 'CREATE');
  const canEmailPayslip = isAdmin || checkPermission('PAYSLIPS', 'PROCESS');

  const fetchPayrunDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [payrunData, empData, slipData] = await Promise.all([
        payrollApi.getPayrunById(Number(id)),
        payrollApi.getPayrunEmployees(Number(id)).catch(() => []),
        payrollApi.getPayrunPayslips(Number(id)).catch(() => []),
      ]);
      setPayrun(payrunData);
      setEmployees(empData || []);
      setPayslips(slipData || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch payrun details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayrunDetails();
  }, [fetchPayrunDetails]);

  const handleCompute = async () => {
    if (!payrun) return;
    setComputing(true);
    try {
      await payrollApi.computePayrun(payrun.payrun_id);
      await fetchPayrunDetails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Payroll computation failed');
    } finally {
      setComputing(false);
    }
  };

  const handleValidate = async () => {
    if (!payrun) return;
    setValidating(true);
    try {
      await payrollApi.validatePayrun(payrun.payrun_id);
      setConfirmValidateOpen(false);
      await fetchPayrunDetails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Payroll validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handlePay = async () => {
    if (!payrun) return;
    setPaying(true);
    try {
      await payrollApi.payPayrun(payrun.payrun_id);
      setConfirmPayOpen(false);
      await fetchPayrunDetails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Payment processing failed');
    } finally {
      setPaying(false);
    }
  };

  const handleGeneratePayslips = async () => {
    if (!payrun) return;
    setGeneratingPayslips(true);
    try {
      const res = await payrollApi.generatePayrunPayslips(payrun.payrun_id);
      alert(`Successfully generated ${res.count || res.payslips?.length || 0} payslips!`);
      await fetchPayrunDetails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate payslips');
    } finally {
      setGeneratingPayslips(false);
    }
  };

  const handleBulkEmail = async () => {
    if (!payrun) return;
    setEmailing(true);
    try {
      const res = await payrollApi.bulkEmailPayslips(payrun.payrun_id);
      setConfirmEmailOpen(false);
      alert(`Email batch dispatched. Sent: ${res.sent}, Failed: ${res.failed}`);
      await fetchPayrunDetails();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to dispatch payslip emails');
    } finally {
      setEmailing(false);
    }
  };

  const getStatusBadge = (status: PayrunStatus) => {
    const map: Record<PayrunStatus, { label: string; variant: BadgeVariant }> = {
      DRAFT: { label: 'Draft', variant: 'warning' },
      COMPUTED: { label: 'Computed', variant: 'info' },
      VALIDATED: { label: 'Validated', variant: 'info' },
      PAID: { label: 'Paid', variant: 'success' },
    };
    const s = map[status] || { label: status, variant: 'neutral' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  if (error || !payrun) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/payroll/payruns')}>
          Back to Payruns
        </Button>
        <ErrorAlert message={error || 'Payrun not found'} onRetry={fetchPayrunDetails} />
      </div>
    );
  }

  const errors = employees.filter((e) => e.status === 'ERROR' || (e.errors && e.errors.length > 0));
  const hasPayslips = payslips.length > 0;

  const getEmployeeErrorText = (employee: PayrunEmployee) => {
    const explicitErrors = Array.isArray(employee.errors) ? employee.errors.filter(Boolean) : [];
    const primaryMessage = employee.error_message || (explicitErrors.length ? explicitErrors.join(', ') : null);
    return primaryMessage || 'Missing contract or salary structure';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/payroll/payruns')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Payruns
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">{payrun.name}</h1>
              {getStatusBadge(payrun.status)}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 font-mono">
              Period: {formatDate(payrun.period_start)} → {formatDate(payrun.period_end)}
            </p>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Compute */}
          {canCompute && ['DRAFT', 'COMPUTED'].includes(payrun.status) && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Calculator className="w-4 h-4" />}
              onClick={handleCompute}
              isLoading={computing}
            >
              {payrun.status === 'COMPUTED' ? 'Re-Compute Payroll' : 'Compute Payroll'}
            </Button>
          )}

          {/* 2. Validate */}
          {canValidate && payrun.status === 'COMPUTED' && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={() => setConfirmValidateOpen(true)}
              isLoading={validating}
            >
              Validate Payrun
            </Button>
          )}

          {/* 3. Mark Paid */}
          {canPay && payrun.status === 'VALIDATED' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CreditCard className="w-4 h-4" />}
              onClick={() => setConfirmPayOpen(true)}
              isLoading={paying}
            >
              Mark as Paid
            </Button>
          )}

          {/* 4. Generate Payslips */}
          {canCreatePayslip && ['VALIDATED', 'PAID'].includes(payrun.status) && !hasPayslips && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={handleGeneratePayslips}
              isLoading={generatingPayslips}
            >
              Generate Payslips
            </Button>
          )}

          {/* 5. Bulk Email Payslips */}
          {canEmailPayslip && hasPayslips && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={() => setConfirmEmailOpen(true)}
              isLoading={emailing}
            >
              Email Payslips
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold uppercase">
            <span>Staff Processed</span>
            <Users className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {payrun.employee_count ?? employees.length}
          </div>
          <div className="text-xs text-[#64748B] mt-1">Eligible active employees</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold uppercase">
            <span>Total Gross Pay</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A] mt-2">
            {formatCurrency(payrun.total_gross || 0)}
          </div>
          <div className="text-xs text-[#64748B] mt-1">Before deductions & taxes</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold uppercase">
            <span>Total Deductions</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">
            -{formatCurrency(payrun.total_deductions || 0)}
          </div>
          <div className="text-xs text-[#64748B] mt-1">Statutory, tax & unpaid leaves</div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B] text-xs font-semibold uppercase">
            <span>Net Disbursement</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">
            {formatCurrency(payrun.total_net || 0)}
          </div>
          <div className="text-xs text-[#64748B] mt-1">Authoritative take-home total</div>
        </div>
      </div>

      {/* Warnings & Errors Panel */}
      {errors.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Payroll Warnings & Excluded Records ({errors.length})</span>
          </div>
          <ul className="text-xs text-amber-800 space-y-1 list-disc pl-5">
            {errors.map((errEmp) => (
              <li key={errEmp.payrun_employee_id || errEmp.employee_id}>
                <span className="font-semibold">{errEmp.employee_name || `Employee #${errEmp.employee_id}`}</span>: {errEmp.status} - {getEmployeeErrorText(errEmp)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Employee Lines Table */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-[#0F172A]">Employee Payroll Computation Lines</h2>
          {hasPayslips && (
            <Badge variant="success">{payslips.length} Payslips Available</Badge>
          )}
        </div>

        {employees.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 text-center text-sm text-[#64748B]">
            {payrun.status === 'DRAFT'
              ? "Payroll has not been computed yet. Click 'Compute Payroll' above to resolve active contracts, attendance, unpaid leaves, and salary rules."
              : 'No eligible employees were found for this payrun.'}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department / Position</th>
                    <th className="py-3 px-4">Gross Pay</th>
                    <th className="py-3 px-4">Deductions</th>
                    <th className="py-3 px-4">Net Payout</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {employees.map((e) => {
                    const linkedPayslip = payslips.find((ps) => ps.employee_id === e.employee_id);

                    return (
                      <tr key={e.payrun_employee_id || e.employee_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                          <div>{e.employee_name || `Employee #${e.employee_id}`}</div>
                          <div className="text-xs text-[#64748B] font-normal">{e.employee_code}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#475569]">
                          <div>{e.department_name || '—'}</div>
                          <div className="text-[#64748B]">{e.position_name || ''}</div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                          {formatCurrency(e.gross_pay || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-rose-600 font-medium">
                          -{formatCurrency(e.total_deductions || 0)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">
                          {formatCurrency(e.net_pay || 0)}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={e.status === 'ERROR' ? 'danger' : 'success'}>
                            {e.status || 'PROCESSED'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {linkedPayslip ? (
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => navigate(`/payslips/${linkedPayslip.payslip_id}`)}
                            >
                              Payslip
                            </Button>
                          ) : (
                            <span className="text-xs text-[#94A3B8]">Not generated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmValidateOpen}
        onClose={() => setConfirmValidateOpen(false)}
        onConfirm={handleValidate}
        title="Validate Payroll Run"
        message="Are you sure you want to validate this payroll computation? Once validated, values are locked and ready for payment disbursement."
        confirmLabel="Validate Payroll"
        isLoading={validating}
      />

      <ConfirmDialog
        isOpen={confirmPayOpen}
        onClose={() => setConfirmPayOpen(false)}
        onConfirm={handlePay}
        title="Mark Payrun as Paid"
        message="Confirm that salary funds have been disbursed to employees. This will record the authoritative paid status."
        confirmLabel="Confirm Payment"
        isDestructive={false}
        isLoading={paying}
      />

      <ConfirmDialog
        isOpen={confirmEmailOpen}
        onClose={() => setConfirmEmailOpen(false)}
        onConfirm={handleBulkEmail}
        title="Bulk Email Payslips"
        message={`Send payslip PDFs via email to all ${payslips.length} employees with generated payslips?`}
        confirmLabel="Send Emails"
        isDestructive={false}
        isLoading={emailing}
      />
    </div>
  );
};
export default PayrunDetailPage;
