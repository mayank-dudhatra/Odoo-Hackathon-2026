import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, History } from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import type { Payrun } from '../../types/payroll';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { formatCurrency, formatDate } from '../../utils/format';

export const PayrollHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [payruns, setPayruns] = useState<Payrun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // List all payruns
      const data = await payrollApi.listPayruns();
      // Keep only validated or paid in history
      const hist = (data as Payrun[]).filter((p: Payrun) => ['VALIDATED', 'PAID'].includes(p.status));
      setPayruns(hist);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch payroll history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-[#E2E8F0]">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Payroll History</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Historical ledger of validated and paid payroll cycles across company operations.
        </p>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchHistory} />}

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : payruns.length === 0 ? (
        <EmptyState
          title="No Historical Payruns"
          description="Completed and validated payruns will appear here."
          icon={<History className="w-8 h-8 text-[#2563EB]" />}
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
                  <th className="py-3 px-4">Total Net</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                      {formatDate(p.period_start)} to {formatDate(p.period_end)}
                    </td>
                    <td className="py-3.5 px-4 text-[#0F172A]">
                      {p.employee_count ?? 0} staff
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      {formatCurrency(p.total_gross || 0)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      {formatCurrency(p.total_net || 0)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={p.status === 'PAID' ? 'success' : 'info'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/payroll/payruns/${p.payrun_id}`)}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default PayrollHistoryPage;
