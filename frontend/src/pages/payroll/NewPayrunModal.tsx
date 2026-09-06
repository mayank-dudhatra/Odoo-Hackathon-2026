import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { payrollApi } from '../../api/payroll.api';
import { salaryApi } from '../../api/salary.api';
import type { SalaryStructure } from '../../types/salary';
import type { CreatePayrunPayload } from '../../types/payroll';

interface NewPayrunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const toLocalDateInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const NewPayrunModal: React.FC<NewPayrunModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);

  const [name, setName] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      salaryApi.listStructures({ is_active: true }).then((data) => {
        if (active) setStructures(data);
      }).catch(() => {});

      // Default to current month using local calendar dates to avoid UTC date drift
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

      setName(`Payrun - ${monthName}`);
      setPeriodStart(toLocalDateInputValue(firstDay));
      setPeriodEnd(toLocalDateInputValue(lastDay));
      setStep(1);
      setError(null);
    }
    return () => { active = false; };
  }, [isOpen]);

  const handleNext = () => {
    setError(null);
    if (!name.trim()) {
      setError('Payrun name is required');
      return;
    }
    if (!salaryStructureId) {
      setError('Please select a salary structure');
      return;
    }
    if (!periodStart || !periodEnd) {
      setError('Start date and end date are required');
      return;
    }
    if (periodEnd < periodStart) {
      setError('End date cannot be earlier than start date');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: CreatePayrunPayload = {
        name: name.trim(),
        salary_structure_id: Number(salaryStructureId),
        period_start: periodStart,
        period_end: periodEnd,
      };

      const created = await payrollApi.createPayrun(payload);
      onSuccess();
      onClose();
      navigate(`/payroll/payruns/${created.payrun_id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create payrun');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const selectedStructureName = structures.find(
    (s) => String(s.salary_structure_id) === salaryStructureId
  )?.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Payrun"
      description={
        step === 1
          ? 'Step 1: Configure payroll period and salary structure framework'
          : 'Step 2: Confirm payrun settings before employee eligibility resolution'
      }
      maxWidth="md"
      footer={
        <>
          {step === 2 ? (
            <>
              <Button variant="secondary" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
              <Button variant="primary" onClick={handleCreate} isLoading={loading}>
                Create Payrun & Proceed
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleNext}>
                Continue to Review
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg text-sm text-[#DC2626]">
            {error}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Payrun Name / Reference *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. October 2026 Regular Payrun"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                Salary Structure *
              </label>
              <select
                value={salaryStructureId}
                onChange={(e) => setSalaryStructureId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                required
              >
                <option value="">Select Salary Structure...</option>
                {structures.map((s) => (
                  <option key={s.salary_structure_id} value={s.salary_structure_id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#64748B] mt-1">
                Only employees with an active contract referencing this structure will be computed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Period Start Date *
                </label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
                  Period End Date *
                </label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-lg space-y-3 text-sm">
            <h4 className="font-bold text-[#0F172A] border-b border-slate-200 pb-2">Payrun Summary</h4>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Name:</span>
              <span className="font-semibold text-[#0F172A]">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Salary Structure:</span>
              <span className="font-semibold text-[#0F172A]">{selectedStructureName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Period Duration:</span>
              <span className="font-mono text-xs text-[#0F172A]">{periodStart} to {periodEnd}</span>
            </div>
            <div className="pt-2 text-xs text-[#64748B]">
              Upon creation, the payrun will be initialized in DRAFT mode. You will be able to trigger the authoritative backend computation engine to resolve contracts, attendance, unpaid leaves, and salary rules.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
