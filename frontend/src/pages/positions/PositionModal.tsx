import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { positionsApi } from '../../api/positions.api';
import type { Position, Department } from '../../types/organization';

interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  positionToEdit?: Position | null;
  departments: Department[];
}

export const PositionModal: React.FC<PositionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  positionToEdit,
  departments,
}) => {
  const isEditing = Boolean(positionToEdit);

  const [title, setTitle] = useState(positionToEdit?.title || '');
  const [departmentId, setDepartmentId] = useState<string>(
    positionToEdit?.department_id ? String(positionToEdit.department_id) : ''
  );
  const [isActive, setIsActive] = useState<boolean>(
    positionToEdit?.is_active !== undefined ? positionToEdit.is_active : true
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departmentOptions = [
    { value: '', label: 'None (Unassigned)' },
    ...departments.map((d) => ({
      value: String(d.department_id),
      label: d.name,
    })),
  ];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Position title is required';
    } else if (title.length < 2) {
      errs.title = 'Title must be at least 2 characters';
    } else if (title.length > 100) {
      errs.title = 'Title cannot exceed 100 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setGeneralError(null);

    try {
      const payload = {
        title: title.trim(),
        department_id: departmentId ? Number(departmentId) : null,
        is_active: isActive,
      };

      if (isEditing && positionToEdit) {
        await positionsApi.updatePosition(positionToEdit.position_id, payload);
      } else {
        await positionsApi.createPosition(payload);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save position';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Job Position' : 'Create Job Position'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {generalError}
          </div>
        )}

        <Input
          label="Job Position Title"
          placeholder="e.g. Senior Software Engineer, Payroll Specialist"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors({ ...errors, title: '' });
          }}
          error={errors.title}
          required
        />

        <Select
          label="Department (Optional)"
          options={departmentOptions}
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        />

        <div className="pt-1">
          <label className="flex items-center gap-2.5 text-sm text-[#0F172A] cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] border-[#CBD5E1]"
            />
            <span className="font-medium">Active Position</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Position'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
