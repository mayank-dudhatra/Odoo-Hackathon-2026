import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ErrorAlert } from '../../components/common/States';
import { employeesApi } from '../../api/employees.api';
import { departmentsApi } from '../../api/departments.api';
import { positionsApi } from '../../api/positions.api';
import { employeeTypesApi } from '../../api/employeeTypes.api';
import type {
  Department,
  Position,
  EmployeeType,
  Employee,
  EmployeeStatus,
  CreateEmployeePayload,
} from '../../types/organization';

export const EmployeeFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form Fields
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [hireDate, setHireDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [employeeTypeId, setEmployeeTypeId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('ACTIVE');

  // Load Reference Data
  useEffect(() => {
    Promise.all([
      departmentsApi.getDepartments().catch(() => []),
      positionsApi.getPositions().catch(() => []),
      employeeTypesApi.getEmployeeTypes().catch(() => []),
      employeesApi.getEmployees({ limit: 100 }).catch(() => ({ rows: [] })),
    ]).then(([deps, pos, types, empRes]) => {
      setDepartments(deps);
      setPositions(pos);
      setEmployeeTypes(types);
      setPotentialManagers(empRes.rows || []);
    });
  }, []);

  // If editing, load employee
  const loadEmployee = useCallback(async () => {
    if (!id) return;
    try {
      const data = await employeesApi.getEmployee(id);
      setEmployeeCode(data.employee_code || '');
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setDateOfBirth(
        data.date_of_birth ? data.date_of_birth.split('T')[0] : ''
      );
      setGender(data.gender || '');
      setAddress(data.address || '');
      setHireDate(
        data.hire_date ? data.hire_date.split('T')[0] : ''
      );
      setDepartmentId(data.department_id ? String(data.department_id) : '');
      setPositionId(data.position_id ? String(data.position_id) : '');
      setEmployeeTypeId(data.employee_type_id ? String(data.employee_type_id) : '');
      setManagerId(data.manager_id ? String(data.manager_id) : '');
      setStatus(data.status || 'ACTIVE');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employee details';
      setInitialError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isEditing || !id) return;
    let active = true;
    (async () => {
      try {
        const data = await employeesApi.getEmployee(id);
        if (active) {
          setEmployeeCode(data.employee_code || '');
          setFirstName(data.first_name || '');
          setLastName(data.last_name || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setDateOfBirth(
            data.date_of_birth ? data.date_of_birth.split('T')[0] : ''
          );
          setGender(data.gender || '');
          setAddress(data.address || '');
          setHireDate(
            data.hire_date ? data.hire_date.split('T')[0] : ''
          );
          setDepartmentId(data.department_id ? String(data.department_id) : '');
          setPositionId(data.position_id ? String(data.position_id) : '');
          setEmployeeTypeId(data.employee_type_id ? String(data.employee_type_id) : '');
          setManagerId(data.manager_id ? String(data.manager_id) : '');
          setStatus(data.status || 'ACTIVE');
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load employee details';
          setInitialError(msg);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isEditing, id]);

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!employeeCode.trim()) {
      errs.employeeCode = 'Employee code is required';
    } else if (employeeCode.length < 2 || employeeCode.length > 20) {
      errs.employeeCode = 'Code must be between 2 and 20 characters';
    }

    if (!firstName.trim()) {
      errs.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      errs.lastName = 'Last name is required';
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = 'Invalid email address format';
      }
    }

    if (!hireDate) {
      errs.hireDate = 'Hire date is required';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFormError(null);

    const payload: CreateEmployeePayload = {
      employee_code: employeeCode.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      date_of_birth: dateOfBirth || null,
      gender: gender.trim() || null,
      address: address.trim() || null,
      hire_date: hireDate,
      department_id: departmentId ? Number(departmentId) : null,
      position_id: positionId ? Number(positionId) : null,
      employee_type_id: employeeTypeId ? Number(employeeTypeId) : null,
      manager_id: managerId ? Number(managerId) : null,
      status,
    };

    try {
      if (isEditing && id) {
        await employeesApi.updateEmployee(id, payload);
        navigate(`/employees/${id}`);
      } else {
        const created = await employeesApi.createEmployee(payload);
        navigate(`/employees/${created.employee_id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save employee profile';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out the current employee from manager choices to avoid self-reporting
  const managerOptions = [
    { value: '', label: 'None (No direct manager)' },
    ...potentialManagers
      .filter((m) => !isEditing || String(m.employee_id) !== String(id))
      .map((m) => ({
        value: String(m.employee_id),
        label: `${m.full_name || `${m.first_name} ${m.last_name}`} (${m.employee_code})`,
      })),
  ];

  const departmentOptions = [
    { value: '', label: 'None / Select Department' },
    ...departments.map((d) => ({
      value: String(d.department_id),
      label: d.name,
    })),
  ];

  // Filter positions by selected department if department is selected
  const availablePositions = positions.filter((p) => {
    if (!departmentId) return true;
    return !p.department_id || String(p.department_id) === departmentId;
  });

  const positionOptions = [
    { value: '', label: 'None / Select Position' },
    ...availablePositions.map((p) => ({
      value: String(p.position_id),
      label: p.title,
    })),
  ];

  const typeOptions = [
    { value: '', label: 'None / Select Type' },
    ...employeeTypes.map((t) => ({
      value: String(t.employee_type_id),
      label: t.name,
    })),
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-96 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Button
          variant="secondary"
          onClick={() => navigate('/employees')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Employees
        </Button>
        <ErrorAlert message={initialError} onRetry={loadEmployee} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="secondary"
            onClick={() => navigate(isEditing && id ? `/employees/${id}` : '/employees')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="mb-2"
          >
            {isEditing ? 'Back to Profile' : 'Back to Employees'}
          </Button>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            {isEditing ? 'Edit Employee Profile' : 'Add New Employee'}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {isEditing
              ? 'Update employee contact details, organizational alignment and job details.'
              : 'Create a new employee profile to begin onboarding into company directory.'}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to save employee profile</p>
            <p>{formError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identification & Basic Info */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Employee Code"
              placeholder="e.g. EMP-001"
              value={employeeCode}
              onChange={(e) => {
                setEmployeeCode(e.target.value.toUpperCase());
                if (fieldErrors.employeeCode) setFieldErrors({ ...fieldErrors, employeeCode: '' });
              }}
              error={fieldErrors.employeeCode}
              required
            />

            <Input
              label="First Name"
              placeholder="e.g. John"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (fieldErrors.firstName) setFieldErrors({ ...fieldErrors, firstName: '' });
              }}
              error={fieldErrors.firstName}
              required
            />

            <Input
              label="Last Name"
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (fieldErrors.lastName) setFieldErrors({ ...fieldErrors, lastName: '' });
              }}
              error={fieldErrors.lastName}
              required
            />
          </div>
        </div>

        {/* Section 2: Personal & Contact Information */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
            Personal & Contact Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="e.g. john.doe@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
              }}
              error={fieldErrors.email}
            />

            <Input
              type="tel"
              label="Phone Number"
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Input
              type="date"
              label="Date of Birth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />

            <Select
              label="Gender"
              options={[
                { value: '', label: 'Select Gender' },
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
                { value: 'OTHER', label: 'Other' },
              ]}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            />

            <div className="md:col-span-2">
              <Input
                label="Residential Address"
                placeholder="Full residential street, city, state, postal code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Organizational & Employment Details */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] pb-2 border-b border-[#E2E8F0]">
            Organizational & Employment Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Hire Date"
              value={hireDate}
              onChange={(e) => {
                setHireDate(e.target.value);
                if (fieldErrors.hireDate) setFieldErrors({ ...fieldErrors, hireDate: '' });
              }}
              error={fieldErrors.hireDate}
              required
            />

            <Select
              label="Account Status"
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
                { value: 'TERMINATED', label: 'TERMINATED' },
              ]}
              value={status}
              onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
            />

            <Select
              label="Department"
              options={departmentOptions}
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPositionId(''); // Reset position when department changes
              }}
            />

            <Select
              label="Job Position"
              options={positionOptions}
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
            />

            <Select
              label="Employment Classification"
              options={typeOptions}
              value={employeeTypeId}
              onChange={(e) => setEmployeeTypeId(e.target.value)}
            />

            <Select
              label="Reporting Manager"
              options={managerOptions}
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(isEditing && id ? `/employees/${id}` : '/employees')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={isEditing ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          >
            {isEditing ? 'Save Changes' : 'Create Employee Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
};
