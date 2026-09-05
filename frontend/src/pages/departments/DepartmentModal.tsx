import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { departmentsApi } from '../../api/departments.api';
import type { Department, Employee } from '../../types/organization';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departmentToEdit?: Department | null;
  departments: Department[];
  employees: Employee[];
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  departmentToEdit,
  departments,
  employees,
}) => {
  const isEditing = Boolean(departmentToEdit);

  const [name, setName] = useState(departmentToEdit?.name || '');
  const [parentDepartmentId, setParentDepartmentId] = useState<string>(
    departmentToEdit?.parent_department_id ? String(departmentToEdit.parent_department_id) : ''
  );
  const [managerId, setManagerId] = useState<string>(
    departmentToEdit?.manager_id ? String(departmentToEdit.manager_id) : ''
  );
  const [isActive, setIsActive] = useState<boolean>(
    departmentToEdit?.is_active !== undefined ? departmentToEdit.is_active : true
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exclude current department from parent options to avoid cycles
  const parentOptions = [
    { value: '', label: 'None (Top Level)' },
    ...departments
      .filter((d) => !departmentToEdit || d.department_id !== departmentToEdit.department_id)
      .map((d) => ({
        value: String(d.department_id),
        label: d.name,
      })),
  ];

  const managerOptions = [
    { value: '', label: 'None' },
    ...employees.map((e) => ({
      value: String(e.employee_id),
      label: `${e.full_name || `${e.first_name} ${e.last_name}`} (${e.employee_code})`,
    })),
  ];

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Department name is required';
    } else if (name.length < 2) {
      errs.name = 'Name must be at least 2 characters';
    } else if (name.length > 100) {
      errs.name = 'Name cannot exceed 100 characters';
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
        parent_department_id: parentDepartmentId ? Number(parentDepartmentId) : null,
        manager_id: managerId ? Number(managerId) : null,
        is_active: isActive,
      };

      if (isEditing && departmentToEdit) {
        await departmentsApi.updateDepartment(departmentToEdit.department_id, payload);
      } else {
        await departmentsApi.createDepartment(payload);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save department';
      setGeneralError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Department' : 'Create Department'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {generalError}
          </div>
        )}

        <Input
          label="Department Name"
          placeholder="e.g. Engineering, Sales, Human Resources"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors({ ...errors, name: '' });
          }}
          error={errors.name}
          required
        />

        <Select
          label="Parent Department (Optional)"
          options={parentOptions}
          value={parentDepartmentId}
          onChange={(e) => setParentDepartmentId(e.target.value)}
        />

        <Select
          label="Department Head / Manager (Optional)"
          options={managerOptions}
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
        />

        <div className="pt-1">
          <label className="flex items-center gap-2.5 text-sm text-[#0F172A] cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] border-[#CBD5E1]"
            />
            <span className="font-medium">Active Department</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Department'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
