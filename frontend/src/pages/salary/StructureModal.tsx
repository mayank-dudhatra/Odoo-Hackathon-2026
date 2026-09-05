import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { salaryApi } from '../../api/salary.api';
import type { SalaryStructure, CreateSalaryStructurePayload } from '../../types/salary';

interface StructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  structure?: SalaryStructure | null;
}

export const StructureModal: React.FC<StructureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  structure,
}) => {
  const isEditing = Boolean(structure);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (structure) {
      setName(structure.name);
      setDescription(structure.description || '');
      setIsActive(structure.is_active ?? true);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
    }
    setError(null);
  }, [structure, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Structure name is required');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CreateSalaryStructurePayload = {
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
    };

    try {
      if (isEditing && structure) {
        await salaryApi.updateStructure(structure.salary_structure_id, payload);
      } else {
        await salaryApi.createStructure(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to save salary structure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Salary Structure' : 'Create Salary Structure'}
      description="Define the salary framework template that houses sequenced calculation rules."
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Structure'}
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

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Structure Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Full-Time Staff"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the salary structure..."
            className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#2563EB] rounded-sm border-[#E2E8F0]"
            />
            <span className="text-sm font-medium text-[#0F172A]">Structure is Active</span>
          </label>
        </div>
      </form>
    </Modal>
  );
};
