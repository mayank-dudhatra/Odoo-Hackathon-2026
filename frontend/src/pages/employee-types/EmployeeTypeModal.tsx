import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { employeeTypesApi } from '../../api/employeeTypes.api';
import type { EmployeeType } from '../../types/organization';

interface EmployeeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  typeToEdit?: EmployeeType | null;
}

export const EmployeeTypeModal: React.FC<EmployeeTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  typeToEdit,
}) => {
  const isEditing = Boolean(typeToEdit);

  const [name, setName] = useState(typeToEdit?.name || '');
  const [isActive, setIsActive] = useState<boolean>(
    typeToEdit?.is_active !== undefined ? typeToEdit.is_active : true
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Employee type name is required';
    } else if (name.length < 2) {
      errs.name = 'Name must be at least 2 characters';
    } else if (name.length > 50) {
      errs.name = 'Name cannot exceed 50 characters';
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
        name: name.trim(),
        is_active: isActive,
      };

      if (isEditing && typeToEdit) {
        await employeeTypesApi.updateEmployeeType(typeToEdit.employee_type_id, payload);
      } else {
        await employeeTypesApi.createEmployeeType(payload);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save employee type';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Employee Type' : 'Create Employee Type'}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {generalError}
          </div>
        )}

        <Input
          label="Type Name"
          placeholder="e.g. Full-time, Part-time, Contractor, Intern"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          error={errors.name}
          required
        />

        <div className="pt-1">
          <label className="flex items-center gap-2.5 text-sm text-[#0F172A] cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] border-[#CBD5E1]"
            />
            <span className="font-medium">Active Status</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Type'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
