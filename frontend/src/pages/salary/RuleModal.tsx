import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { salaryApi } from '../../api/salary.api';
import type { SalaryRule, CreateSalaryRulePayload, SalaryRuleCategory, ComputationType } from '../../types/salary';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  rule?: SalaryRule | null;
}

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rule,
}) => {
  const isEditing = Boolean(rule);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<SalaryRuleCategory>('BASIC');
  const [computationType, setComputationType] = useState<ComputationType>('FIXED');
  const [amount, setAmount] = useState('');
  const [percentageOf, setPercentageOf] = useState('BASIC');
  const [percentageValue, setPercentageValue] = useState('');
  const [formula, setFormula] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setCode(rule.code);
      setCategory(rule.category);
      setComputationType(rule.computation_type);
      setAmount(rule.amount != null ? String(rule.amount) : '');
      setPercentageOf(rule.percentage_of || 'BASIC');
      setPercentageValue(rule.percentage_value != null ? String(rule.percentage_value) : '');
      setFormula(rule.formula || '');
      setIsActive(rule.is_active ?? true);
    } else {
      setName('');
      setCode('');
      setCategory('BASIC');
      setComputationType('FIXED');
      setAmount('');
      setPercentageOf('BASIC');
      setPercentageValue('');
      setFormula('');
      setIsActive(true);
    }
    setError(null);
  }, [rule, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }
    if (!code.trim() || !/^[A-Za-z0-9_]+$/.test(code.trim())) {
      setError('Code is required and can only contain letters, numbers, and underscores');
      return;
    }

    if (computationType === 'FIXED' && (!amount || isNaN(Number(amount)))) {
      setError('A valid amount is required for FIXED computation');
      return;
    }

    if (computationType === 'PERCENTAGE') {
      if (!percentageOf.trim()) {
        setError('Percentage Of code is required');
        return;
      }
      if (!percentageValue || isNaN(Number(percentageValue))) {
        setError('Percentage value is required');
        return;
      }
    }

    if (computationType === 'FORMULA' && !formula.trim()) {
      setError('Formula expression is required for FORMULA computation');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateSalaryRulePayload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        category,
        computation_type: computationType,
        amount: computationType === 'FIXED' ? Number(amount) : null,
        percentage_of: computationType === 'PERCENTAGE' ? percentageOf.trim().toUpperCase() : null,
        percentage_value: computationType === 'PERCENTAGE' ? Number(percentageValue) : null,
        formula: computationType === 'FORMULA' ? formula.trim() : null,
        is_active: isActive,
      };

      if (isEditing && rule) {
        await salaryApi.updateRule(rule.rule_id, payload);
      } else {
        await salaryApi.createRule(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save salary rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Salary Rule' : 'Create Salary Rule'}
      description="Define financial calculation parameters for earnings, taxes, and deductions."
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Rule'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-sm text-[#DC2626]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Rule Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basic Salary, HRA"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Code (Identifier) *
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. BASIC, HRA, PF"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SalaryRuleCategory)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              required
            >
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

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Computation Type *
            </label>
            <select
              value={computationType}
              onChange={(e) => setComputationType(e.target.value as ComputationType)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              required
            >
              <option value="FIXED">Fixed Amount</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FORMULA">Formula Expression</option>
            </select>
          </div>
        </div>

        {/* Dynamic fields based on computation type */}
        {computationType === 'FIXED' && (
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Fixed Amount *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />
          </div>
        )}

        {computationType === 'PERCENTAGE' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Percentage Of (Code) *
              </label>
              <Input
                value={percentageOf}
                onChange={(e) => setPercentageOf(e.target.value)}
                placeholder="e.g. BASIC or GROSS"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Percentage Value (%) *
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={percentageValue}
                onChange={(e) => setPercentageValue(e.target.value)}
                placeholder="e.g. 40"
                required
              />
            </div>
          </div>
        )}

        {computationType === 'FORMULA' && (
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Mathematical Formula Expression *
            </label>
            <Input
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="e.g. BASIC * 0.5 + HRA"
              required
            />
            <p className="text-xs text-[#64748B] mt-1">
              Use existing rule codes like BASIC, GROSS, or standard arithmetic (+, -, *, /).
            </p>
          </div>
        )}

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Rule is Active</span>
          </label>
        </div>
      </form>
    </Modal>
  );
};
