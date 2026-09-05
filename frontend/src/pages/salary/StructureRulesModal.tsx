import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { salaryApi } from '../../api/salary.api';
import type { SalaryStructure, SalaryRule, StructureRule } from '../../types/salary';

interface StructureRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: SalaryStructure | null;
  onSuccess: () => void;
}

export const StructureRulesModal: React.FC<StructureRulesModalProps> = ({
  isOpen,
  onClose,
  structure,
  onSuccess,
}) => {
  const [allRules, setAllRules] = useState<SalaryRule[]>([]);
  const [structureRules, setStructureRules] = useState<StructureRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [sequence, setSequence] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!structure) return;
    setLoading(true);
    setError(null);
    try {
      const [structData, rulesData] = await Promise.all([
        salaryApi.getStructureById(structure.salary_structure_id),
        salaryApi.listRules({ is_active: true }),
      ]);
      setStructureRules(structData.rules || []);
      setAllRules(rulesData || []);
      const nextSeq = ((structData.rules || []).length + 1) * 10;
      setSequence(nextSeq);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch rules for structure');
    } finally {
      setLoading(false);
    }
  }, [structure]);

  useEffect(() => {
    if (isOpen && structure) {
      fetchDetails();
    }
  }, [isOpen, structure, fetchDetails]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structure || !selectedRuleId) return;

    setError(null);
    try {
      await salaryApi.addRuleToStructure(structure.salary_structure_id, {
        rule_id: Number(selectedRuleId),
        sequence: Number(sequence),
        is_active: true,
      });
      setSelectedRuleId('');
      fetchDetails();
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to attach rule');
    }
  };

  const handleRemoveRule = async (ruleId: number) => {
    if (!structure) return;
    try {
      await salaryApi.removeRuleFromStructure(structure.salary_structure_id, ruleId);
      fetchDetails();
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove rule');
    }
  };

  const handleMoveSequence = async (item: StructureRule, direction: 'up' | 'down') => {
    if (!structure) return;
    const newSeq = direction === 'up' ? Math.max(1, item.sequence - 5) : item.sequence + 5;
    try {
      await salaryApi.updateStructureRule(structure.salary_structure_id, item.rule_id, {
        sequence: newSeq,
      });
      fetchDetails();
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update rule order');
    }
  };

  const sortedRules = [...structureRules].sort((a, b) => a.sequence - b.sequence);
  const unattachedRules = allRules.filter(
    (r) => !structureRules.some((sr) => sr.rule_id === r.rule_id)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure Rules: ${structure?.name || ''}`}
      description="Attach calculation rules and adjust computation execution sequence (Basic → Allowances → Gross → Deductions → Net)."
      maxWidth="xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-sm text-[#DC2626]">
            {error}
          </div>
        )}

        {/* Add Rule Form */}
        <form onSubmit={handleAddRule} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-3">
          <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Attach Salary Rule</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#64748B] mb-1">Select Rule</label>
              <select
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A]"
                required
              >
                <option value="">Choose an available rule...</option>
                {unattachedRules.map((r) => (
                  <option key={r.rule_id} value={r.rule_id}>
                    [{r.code}] {r.name} ({r.category} - {r.computation_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full"
                leftIcon={<Plus className="w-4 h-4" />}
                disabled={!selectedRuleId}
              >
                Add Rule
              </Button>
            </div>
          </div>
        </form>

        {/* Attached Rules List */}
        <div>
          <h4 className="text-sm font-bold text-[#0F172A] mb-3">Attached Rules in Execution Order</h4>

          {loading ? (
            <div className="py-8 text-center text-sm text-[#64748B]">Loading structure rules...</div>
          ) : sortedRules.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#64748B] border border-dashed border-[#E2E8F0] rounded-lg">
              No salary rules attached yet. Attach your first rule above.
            </div>
          ) : (
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Seq</th>
                    <th className="py-2.5 px-3">Rule Name & Code</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {sortedRules.map((sr, idx) => (
                    <tr key={sr.rule_id} className="hover:bg-[#F8FAFC]/60">
                      <td className="py-2 px-3 font-mono font-bold text-xs text-[#2563EB]">
                        {sr.sequence}
                      </td>
                      <td className="py-2 px-3 font-medium text-[#0F172A]">
                        <div>{sr.name || sr.rule?.name}</div>
                        <div className="text-xs text-[#64748B] font-mono">{sr.code || sr.rule?.code}</div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="neutral">
                          {sr.category || sr.rule?.category || 'RULE'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-xs text-[#64748B]">
                        {sr.computation_type || sr.rule?.computation_type}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveSequence(sr, 'up')}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Move Earlier in Sequence"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sortedRules.length - 1}
                            onClick={() => handleMoveSequence(sr, 'down')}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Move Later in Sequence"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRule(sr.rule_id)}
                            className="p-1 text-red-500 hover:text-red-700 cursor-pointer ml-1"
                            title="Remove Rule from Structure"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
