import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, type OverallDashboardData, type PayrollDashboardMetrics } from '../../api/dashboard.api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton, ErrorAlert } from '../../components/common/States';
import { formatCurrency } from '../../utils/format';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Clock,
  CheckCircle2,
  Sliders,
  Calculator,
} from 'lucide-react';

export const PayrollManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<OverallDashboardData | null>(null);
  const [payrollMetrics, setPayrollMetrics] = useState<PayrollDashboardMetrics | null>(null);
  const [warnings, setWarnings] = useState<Array<{ id: string; type: string; message: string; severity: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManagerDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [overall, payroll, warns] = await Promise.all([
        dashboardApi.getOverallDashboard().catch(() => null),
        dashboardApi.getPayrollDashboard().catch(() => null),
        dashboardApi.getWarnings().catch(() => []),
      ]);
      setDashboardData(overall);
      setPayrollMetrics(payroll);
      setWarnings(warns || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load payroll manager dashboard';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagerDashboard();
  }, [fetchManagerDashboard]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  const p = payrollMetrics || dashboardData?.payroll;
  const costsByDept = dashboardData?.costs?.by_department || [];

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Payroll Supervision</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Enterprise compensation control, approval supervision, department cost distribution, and compliance alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            onClick={() => navigate('/payroll/payruns')}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Review Payruns
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/salary-structures')}
            leftIcon={<Sliders className="w-4 h-4" />}
          >
            Salary Structures
          </Button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchManagerDashboard} />}

      {/* 1. FINANCIAL SUMMARY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Net Salary</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {formatCurrency(Number(p?.total_net) || 0)}
          </p>
          <p className="text-[11px] text-[#64748B]">Disbursed net compensation</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Total Gross Payroll</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#0F172A]">
            {formatCurrency(Number(p?.total_gross) || 0)}
          </p>
          <p className="text-[11px] text-[#64748B]">Pre-deduction wages</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Deductions & Withholdings</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600">
            {formatCurrency(Number(p?.total_deductions) || 0)}
          </p>
          <p className="text-[11px] text-[#64748B]">Taxes & attendance penalties</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">Batches Pending Approval</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{p?.draft_payruns ?? 0}</p>
          <p className="text-[11px] text-[#64748B]">Awaiting validation</p>
        </div>
      </div>

      {/* 2. SALARY COST BY DEPARTMENT & OPERATIONAL ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A]">Salary Cost by Department</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/departments')}
              className="text-xs text-[#2563EB] hover:underline font-semibold"
            >
              Departments →
            </button>
          </div>

          {costsByDept.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#64748B]">
              <p>No department cost metrics computed yet.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {costsByDept.map((dept, idx) => (
                <div key={idx} className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#0F172A]">{dept.department_name}</span>
                  <span className="font-bold text-xs text-[#2563EB]">
                    {formatCurrency(Number(dept.total_cost) || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Alerts & Warnings */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-[#0F172A]">Compliance & Alerts</h2>
            </div>
            <Badge variant={warnings.length > 0 ? 'warning' : 'success'}>
              {warnings.length} Flags
            </Badge>
          </div>

          {warnings.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#64748B]">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-[#0F172A]">Zero Compliance Flags</p>
              <p className="text-xs text-[#64748B]">All employee contracts and salary structures are valid.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs space-y-2">
              {warnings.map((w, idx) => (
                <div key={w.id || idx} className="py-2.5 flex items-start gap-3">
                  <span className="p-1 rounded bg-amber-50 text-amber-600 shrink-0 mt-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-[#0F172A]">{w.message}</p>
                    <span className="text-[10px] text-[#64748B] font-mono">{w.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
