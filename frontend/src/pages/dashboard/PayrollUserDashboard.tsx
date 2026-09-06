import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, type PayrollDashboardMetrics } from '../../api/dashboard.api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert } from '../../components/common/States';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  Calculator,
  Receipt,
} from 'lucide-react';

import { EmployeeProfileRoleCard } from '../../components/common/EmployeeProfileRoleCard';

export const PayrollUserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [payrollData, setPayrollData] = useState<PayrollDashboardMetrics | null>(null);
  const [warnings, setWarnings] = useState<Array<{ id: string; type: string; message: string; severity: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [payroll, warns] = await Promise.all([
        dashboardApi.getPayrollDashboard().catch(() => null),
        dashboardApi.getWarnings().catch(() => []),
      ]);
      setPayrollData(payroll);
      setWarnings(warns || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load payroll operations dashboard';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Banner: Employee Profile + Role Governance */}
      <EmployeeProfileRoleCard />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Payroll Operations</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Operational payrun processing, payslip computation, and pre-payroll data checks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => navigate('/payroll/payruns')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Payrun
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/payslips')}
            leftIcon={<Receipt className="w-4 h-4" />}
          >
            View Payslips
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDashboard} />}

      {/* 1. OPERATIONS METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Payruns</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A]">{payrollData?.total_payruns ?? 0}</p>
          <p className="text-[11px] text-[#64748B]">All recorded periods</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Draft Batches</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{payrollData?.draft_payruns ?? 0}</p>
          <p className="text-[11px] text-[#64748B]">Requiring computation / review</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Payslips Generated</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{payrollData?.total_payslips ?? 0}</p>
          <p className="text-[11px] text-[#64748B]">Computed payslips count</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Approved & Paid</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-indigo-700">
            {(payrollData?.approved_payruns ?? 0) + (payrollData?.paid_payruns ?? 0)}
          </p>
          <p className="text-[11px] text-[#64748B]">Validated and disbursed</p>
        </div>
      </div>

      {/* 2. OPERATIONAL ALERTS & SHORTCUTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-[#0F172A]">Payroll Warnings & Data Checks</h2>
            </div>
            <Badge variant="neutral">{warnings.length} Notices</Badge>
          </div>

          {warnings.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#64748B]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-[#0F172A]">All Payroll Data Healthy</p>
              <p className="text-xs text-[#64748B]">No missing contracts or calculation flags detected.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs space-y-2">
              {warnings.map((w, idx) => (
                <div key={w.id || idx} className="py-2.5 flex items-start gap-3">
                  <span className="p-1 rounded bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-[#0F172A]">{w.message}</p>
                    <span className="text-[10px] text-[#64748B] font-mono uppercase">{w.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Operations Links */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] pb-3 border-b border-[#E2E8F0]">
              Quick Actions
            </h2>
            <div className="space-y-2 pt-3">
              <button
                type="button"
                onClick={() => navigate('/payroll/payruns')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
              >
                <span>Process Payruns</span>
                <ArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/payslips')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
              >
                <span>Review Generated Payslips</span>
                <ArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/salary-structures')}
                className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-left text-xs font-semibold text-[#0F172A] flex items-center justify-between transition-colors"
              >
                <span>View Salary Structures</span>
                <ArrowRight className="w-4 h-4 text-[#64748B]" />
              </button>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-[#64748B] flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Payroll operations queue</span>
          </div>
        </div>
      </div>
    </div>
  );
};
