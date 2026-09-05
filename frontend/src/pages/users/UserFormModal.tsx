import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import type { User } from '../../types/users';
import type { Role } from '../../types/rbac';
import { usersApi } from '../../api/users.api';
import { rolesApi } from '../../api/roles.api';
import { employeesApi } from '../../api/employees.api';
import type { Employee } from '../../types/organization';
import { AlertCircle, Mail } from 'lucide-react';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
}

const DEFAULT_ROLES: Role[] = [
  { role_id: 1, role_name: 'Admin', description: 'Full system administration access' },
  { role_id: 2, role_name: 'HR Manager', description: 'HR management role' },
  { role_id: 3, role_name: 'Payroll Manager', description: 'Payroll supervision and approval role' },
  { role_id: 4, role_name: 'Payroll User', description: 'Payroll operations role' },
  { role_id: 5, role_name: 'Employee', description: 'Employee self-service role' },
];

const UserFormContent: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
}> = ({ onClose, onSuccess, userToEdit }) => {
  const isEditing = Boolean(userToEdit);

  const [username, setUsername] = useState(userToEdit?.username || '');
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [roleName, setRoleName] = useState(userToEdit?.role_name || DEFAULT_ROLES[0].role_name);
  const [employeeId, setEmployeeId] = useState(
    userToEdit?.employee_id ? String(userToEdit.employee_id) : ''
  );
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setRolesLoading(true);
        const [rolesList, empRes] = await Promise.all([
          rolesApi.listRoles().catch(() => []),
          employeesApi.getEmployees({ limit: 150 }).catch(() => ({ rows: [] })),
        ]);
        if (active) {
          if (rolesList.length > 0) {
            setRoles(rolesList);
            setRoleName((prev) => (!userToEdit && !prev ? rolesList[0].role_name : prev));
          }
          if (empRes && empRes.rows) {
            setEmployees(empRes.rows);
          }
        }
      } finally {
        if (active) {
          setRolesLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [userToEdit]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!isEditing) {
      if (!username.trim()) {
        newErrors.username = 'Username is required';
      } else if (username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }

      if (!email.trim()) {
        newErrors.email = 'Email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!roleName) {
      newErrors.roleName = 'Please select a role';
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
      if (isEditing && userToEdit) {
        await usersApi.updateUser(userToEdit.user_id, {
          role_name: roleName,
          employee_id: employeeId ? Number(employeeId) : null,
        });
      } else {
        await usersApi.createUser({
          username: username.trim(),
          email: email.trim(),
          role_name: roleName,
          employee_id: employeeId ? Number(employeeId) : null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setErrors({
        general: errorObj?.message || 'Failed to save user. Please check your inputs.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = roles.map((r) => ({
    value: r.role_name,
    label: r.role_name,
  }));

  return (
    <Modal
      isOpen={true}
      onClose={isSubmitting ? () => {} : onClose}
      title={isEditing ? 'Edit User' : 'Add New User'}
      description={
        isEditing
          ? 'Update the assigned role and employee link for this user'
          : 'Create a new corporate account or send an invitation'
      }
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Create User'}
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

        <Select
          label="Link to Employee (Optional)"
          value={employeeId}
          onChange={(e) => {
            const val = e.target.value;
            setEmployeeId(val);
            if (val && !isEditing) {
              const selectedEmp = employees.find((emp) => String(emp.employee_id) === val);
              if (selectedEmp) {
                if (!email && selectedEmp.email) {
                  setEmail(selectedEmp.email);
                }
                if (!username) {
                  const cleanFirst = (selectedEmp.first_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  const cleanLast = (selectedEmp.last_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                  setUsername(cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst);
                }
              }
            }
          }}
          options={[
            { value: '', label: 'None (Unlinked User)' },
            ...employees.map((emp) => ({
              value: String(emp.employee_id),
              label: `${emp.full_name || `${emp.first_name} ${emp.last_name}`} (${emp.employee_code})${emp.email ? ` - ${emp.email}` : ''}`,
            })),
          ]}
          disabled={isSubmitting}
          helperText="Select an employee to link profile data and automatically personalize email credentials"
        />

        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. john.doe"
          error={errors.username}
          disabled={isEditing || isSubmitting}
          required={!isEditing}
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. john.doe@company.com"
          error={errors.email}
          disabled={isEditing || isSubmitting}
          required={!isEditing}
        />

        <Select
          label="Assigned Role"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          options={roleOptions}
          placeholder={rolesLoading ? 'Loading roles...' : 'Select a role'}
          error={errors.roleName}
          disabled={rolesLoading || isSubmitting}
          required
        />

        {!isEditing && (
          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg flex items-start gap-2.5 text-xs text-[#1D4ED8]">
            <Mail className="w-4 h-4 shrink-0 mt-0.5 text-[#2563EB]" />
            <span>
              <strong>Automated Welcome Email:</strong> Temporary login credentials and portal access instructions will be sent to this email address automatically upon creation.
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
};

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userToEdit,
}) => {
  if (!isOpen) return null;

  return (
    <UserFormContent
      key={userToEdit ? userToEdit.user_id : 'new'}
      onClose={onClose}
      onSuccess={onSuccess}
      userToEdit={userToEdit}
    />
  );
};
