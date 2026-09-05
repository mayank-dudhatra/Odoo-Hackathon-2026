import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { rolesApi } from '../../api/roles.api';
import type { Role } from '../../types/rbac';
import { AlertCircle } from 'lucide-react';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: Role | null;
}

const RoleFormContent: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
  roleToEdit?: Role | null;
}> = ({ onClose, onSuccess, roleToEdit }) => {
  const isEditing = Boolean(roleToEdit);

  const [roleName, setRoleName] = useState(roleToEdit?.role_name || '');
  const [description, setDescription] = useState(roleToEdit?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!roleName.trim()) {
      newErrors.roleName = 'Role name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      if (isEditing && roleToEdit) {
        await rolesApi.updateRole(roleToEdit.role_id, {
          role_name: roleName.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await rolesApi.createRole({
          role_name: roleName.trim(),
          description: description.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrors({
        general: errorObj?.message || 'Failed to save role.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={isSubmitting ? () => {} : onClose}
      title={isEditing ? 'Edit Role' : 'Create New Role'}
      description={
        isEditing
          ? 'Update the name and description of this role'
          : 'Define a new security role for role-based access control'
      }
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Role'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FECACA] rounded-lg flex items-start gap-2.5 text-xs text-[#DC2626]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        <Input
          label="Role Name"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          placeholder="e.g. Department Lead"
          error={errors.roleName}
          disabled={isSubmitting}
          required
          autoFocus
        />

        <div className="w-full flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#334155]">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Briefly describe the purpose of this role..."
            className="w-full px-3 py-2 text-sm bg-white text-[#0F172A] placeholder-[#94A3B8] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
};

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roleToEdit,
}) => {
  if (!isOpen) return null;

  return (
    <RoleFormContent
      key={roleToEdit ? roleToEdit.role_id : 'new'}
      onClose={onClose}
      onSuccess={onSuccess}
      roleToEdit={roleToEdit}
    />
  );
};
