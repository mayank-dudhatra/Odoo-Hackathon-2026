import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, FileText, Search } from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import type { Payslip, PayslipStatus } from '../../types/payroll';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const PayslipsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEmployeeRole = user?.role_name === 'Employee';

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchPayslips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = isEmployeeRole
        ? await payrollApi.getOwnPayslips()
        : await payrollApi.listPayslips();
      setPayslips(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, [isEmployeeRole]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const handleDownloadPdf = async (payslip: Payslip) => {
    setDownloadingId(payslip.payslip_id);
    try {
      const filename = `payslip_${payslip.employee_code_snapshot || payslip.payslip_id}_${payslip.period_start}.pdf`;
      await payrollApi.downloadPayslipPdf(payslip.payslip_id, filename);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to download payslip PDF');
    } finally {
      setDownloadingId(null);
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

  const filteredPayslips = payslips.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = `${p.first_name_snapshot || p.employee_name || ''} ${p.last_name_snapshot || ''}`.toLowerCase();
    const code = (p.employee_code_snapshot || p.employee_code || '').toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            {isEmployeeRole ? 'My Payslips' : 'All Payslips'}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Access certified historical salary statements, line item breakdowns, and PDF exports.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      {!isEmployeeRole && (
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search employee or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#64748B]" />}
          />
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchPayslips} />}

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : filteredPayslips.length === 0 ? (
        <EmptyState
          title="No Payslips Available"
          description={
            isEmployeeRole
              ? 'No salary statements have been generated for your account yet.'
              : 'Generate payslips from a validated payrun to view them here.'
          }
          icon={<FileText className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Payroll Period</th>
                  <th className="py-3 px-4">Gross Pay</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPayslips.map((ps) => {
                  const empName = ps.first_name_snapshot
                    ? `${ps.first_name_snapshot} ${ps.last_name_snapshot || ''}`
                    : ps.employee_name || `Employee #${ps.employee_id}`;
                  const empCode = ps.employee_code_snapshot || ps.employee_code || '';
                  const isDownloading = downloadingId === ps.payslip_id;

                  return (
                    <tr key={ps.payslip_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div>{empName}</div>
                        <div className="text-xs text-[#64748B] font-normal">{empCode}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#0F172A]">
                        {formatDate(ps.period_start)} to {formatDate(ps.period_end)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        {formatCurrency(ps.gross_pay)}
                      </td>
                      <td className="py-3.5 px-4 text-rose-600 font-medium">
                        -{formatCurrency(ps.total_deductions)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-700">
                        {formatCurrency(ps.net_pay)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(ps.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => navigate(`/payslips/${ps.payslip_id}`)}
                          >
                            View
                          </Button>
                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleDownloadPdf(ps)}
                            className="p-1.5 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
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
  );
};
export default PayslipsPage;
