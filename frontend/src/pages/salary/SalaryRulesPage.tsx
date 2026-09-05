import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Calculator, Search } from 'lucide-react';
import { salaryApi } from '../../api/salary.api';
import type { SalaryRule, SalaryRuleCategory } from '../../types/salary';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { RuleModal } from './RuleModal';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const SalaryRulesPage: React.FC = () => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';
  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<SalaryRule | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreate = isAdmin || checkPermission('SALARY_RULES', 'CREATE');
  const canUpdate = isAdmin || checkPermission('SALARY_RULES', 'UPDATE');
  const canDelete = isAdmin || checkPermission('SALARY_RULES', 'DELETE');

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salaryApi.listRules({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
      });
      setRules(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch salary rules');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await salaryApi.deleteRule(deleteId);
      setDeleteId(null);
      fetchRules();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to deactivate salary rule');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getCategoryBadge = (cat: SalaryRuleCategory) => {
    const map: Record<SalaryRuleCategory, { label: string; variant: BadgeVariant }> = {
      BASIC: { label: 'Basic', variant: 'info' },
      ALLOWANCE: { label: 'Allowance', variant: 'success' },
      GROSS: { label: 'Gross', variant: 'info' },
      DEDUCTION: { label: 'Deduction', variant: 'warning' },
      TAX: { label: 'Tax', variant: 'danger' },
      CONTRIBUTION: { label: 'Contribution', variant: 'warning' },
      NET: { label: 'Net', variant: 'success' },
      REIMBURSEMENT: { label: 'Reimbursement', variant: 'neutral' },
    };
    const s = map[cat] || { label: cat, variant: 'neutral' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const getComputationDetail = (r: SalaryRule) => {
    if (r.computation_type === 'FIXED') {
      return r.amount != null ? formatCurrency(r.amount) : 'Fixed';
    }
    if (r.computation_type === 'PERCENTAGE') {
      return `${r.percentage_value}% of ${r.percentage_of}`;
    }
    if (r.computation_type === 'FORMULA') {
      return r.formula || 'Custom Formula';
    }
    return '—';
  };

  const filteredRules = rules.filter((r) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Salary Rules</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Build and manage reusable calculation logic for basic wages, allowances, statutory taxes, and deductions.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setSelectedRule(null);
              setModalOpen(true);
            }}
          >
            New Salary Rule
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search rule name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#64748B]" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="ALL">All Categories</option>
            <option value="BASIC">BASIC</option>
            <option value="ALLOWANCE">ALLOWANCE</option>
            <option value="GROSS">GROSS</option>
            <option value="DEDUCTION">DEDUCTION</option>
            <option value="TAX">TAX</option>
            <option value="CONTRIBUTION">CONTRIBUTION</option>
            <option value="NET">NET</option>
            <option value="REIMBURSEMENT">REIMBURSEMENT</option>
          </select>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchRules} />}

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredRules.length === 0 ? (
        <EmptyState
          title="No Salary Rules Found"
          description="Create your first salary rule (e.g. Basic Wage, HRA Allowance, PF Deduction)."
          actionLabel={canCreate ? 'Create Rule' : undefined}
          onAction={() => {
            setSelectedRule(null);
            setModalOpen(true);
          }}
          icon={<Calculator className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Computation</th>
                  <th className="py-3 px-4">Calculation Formula</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredRules.map((r) => (
                  <tr key={r.rule_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#2563EB]">
                      {r.code}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      {r.name}
                    </td>
                    <td className="py-3.5 px-4">
                      {getCategoryBadge(r.category)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-[#475569]">
                      {r.computation_type}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#0F172A] font-mono">
                      {getComputationDetail(r)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.is_active ? 'success' : 'neutral'}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRule(r);
                              setModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(r.rule_id)}
                            className="p-1.5 text-[#64748B] hover:text-[#DC2626] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Deactivate Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      <RuleModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedRule(null);
        }}
        onSuccess={fetchRules}
        rule={selectedRule}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Deactivate Salary Rule"
        message="Are you sure you want to deactivate this rule? Existing salary structures using it will need to be reconfigured."
        confirmLabel="Deactivate"
        isDestructive={true}
        isLoading={deleteLoading}
      />
    </div>
  );
};
export default SalaryRulesPage;
