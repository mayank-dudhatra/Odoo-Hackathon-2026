import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, DollarSign } from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import type { Payrun, PayrunStatus } from '../../types/payroll';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { NewPayrunModal } from './NewPayrunModal';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const PayrunsPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = isAdmin || checkPermission('PAYRUNS', 'CREATE');

  const fetchPayruns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await payrollApi.listPayruns({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setPayruns(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch payruns');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayruns();
  }, [fetchPayruns]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Payroll Runs</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Execute batch salary computations, validate net disbursements, and generate payslips.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setModalOpen(true)}
          >
            New Payrun
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#64748B] uppercase">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="COMPUTED">Computed</option>
            <option value="VALIDATED">Validated</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchPayruns} />}

      {loading ? (
        <TableSkeleton rows={5} cols={7} />
      ) : payruns.length === 0 ? (
        <EmptyState
          title="No Payruns Found"
          description="Create your first payroll run to calculate employee salaries, taxes, and net disbursements."
          actionLabel={canCreate ? 'Create Payrun' : undefined}
          onAction={() => setModalOpen(true)}
          icon={<DollarSign className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Payrun Reference</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Employees</th>
                  <th className="py-3 px-4">Total Gross</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Total Net</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {payruns.map((p) => (
                  <tr key={p.payrun_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      <div>{p.name}</div>
                      <div className="text-xs text-[#64748B]">#{p.payrun_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-[#0F172A]">
                      <div>{formatDate(p.period_start)}</div>
                      <div className="text-[#64748B]">to {formatDate(p.period_end)}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#0F172A]">
                      <span className="font-semibold">{p.employee_count ?? 0}</span> staff
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      {formatCurrency(p.total_gross || 0)}
                    </td>
                    <td className="py-3.5 px-4 text-rose-600 font-medium">
                      -{formatCurrency(p.total_deductions || 0)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {formatCurrency(p.total_net || 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/payroll/payruns/${p.payrun_id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Payrun Modal */}
      <NewPayrunModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchPayruns}
      />
    </div>
  );
};
export default PayrunsPage;
