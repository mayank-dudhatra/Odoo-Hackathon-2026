import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Save,
  AlertCircle,
  CheckCircle2,
  Building2,
  Briefcase,
  Clock,
  FileText,
  Shield,
  Plus,
  UserCheck,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ErrorAlert } from '../../components/common/States';
import { employeesApi } from '../../api/employees.api';
import { departmentsApi } from '../../api/departments.api';
import { positionsApi } from '../../api/positions.api';
import { employeeTypesApi } from '../../api/employeeTypes.api';
import { schedulesApi } from '../../api/schedules.api';
import { contractsApi } from '../../api/contracts.api';
import { attendanceApi } from '../../api/attendance.api';
import type {
  Department,
  Position,
  EmployeeType,
  Employee,
  EmployeeStatus,
  CreateEmployeePayload,
} from '../../types/organization';
import type { WorkingSchedule } from '../../types/schedules';
import type { Contract } from '../../types/contracts';
import type { AttendancePolicy } from '../../types/attendance';
import { useAuth } from '../../hooks/useAuth';

const ONBOARDING_STEPS = [
  { step: 1, title: 'Basic Info', icon: UserCheck },
  { step: 2, title: 'Contact', icon: UserPlus },
  { step: 3, title: 'Organization', icon: Building2 },
  { step: 4, title: 'Policies', icon: Shield },
  { step: 5, title: 'Schedule', icon: Clock },
  { step: 6, title: 'Contract', icon: FileText },
  { step: 7, title: 'Review & Create', icon: CheckCircle2 },
];

export const EmployeeFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isEditing = Boolean(id);
  const isSelfEdit =
    isEditing &&
    (role === 'Employee' ||
      (role !== 'Admin' && role !== 'HR Manager' && String(user?.employee_id) === String(id)));

  // Onboarding step (for new employee creation)
  const [currentStep, setCurrentStep] = useState(1);

  // Reference Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form Fields - Step 1: Basic
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<EmployeeStatus>('ACTIVE');

  // Form Fields - Step 2: Contact
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');

  // Form Fields - Step 3: Organization
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [employeeTypeId, setEmployeeTypeId] = useState('');
  const [managerId, setManagerId] = useState('');

  // Form Fields - Step 4: Attendance & Policy
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [isCustomizingPolicy, setIsCustomizingPolicy] = useState(false);
  const [customPolicyName, setCustomPolicyName] = useState('');
  const [customGraceMinutes, setCustomGraceMinutes] = useState('15');
  const [isCreatingCustomPolicy, setIsCreatingCustomPolicy] = useState(false);

  // Form Fields - Step 5: Working Schedule
  const [scheduleId, setScheduleId] = useState('');

  // Form Fields - Step 6: Contract
  const [selectedContractId, setSelectedContractId] = useState('');

  // Load Reference Data
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      departmentsApi.getDepartments().catch(() => []),
      positionsApi.getPositions().catch(() => []),
      employeeTypesApi.getEmployeeTypes().catch(() => []),
      employeesApi.getEmployees({ limit: 100 }).catch(() => ({ rows: [] })),
      schedulesApi.listSchedules().catch(() => []),
      contractsApi.listContracts().catch(() => []),
      attendanceApi.listPolicies().catch(() => []),
    ])
      .then(([deps, pos, types, empRes, scheds, ctrs, pols]) => {
        setDepartments(deps);
        setPositions(pos);
        setEmployeeTypes(types);
        setPotentialManagers(empRes.rows || []);
        setSchedules(scheds);
        setContracts(ctrs);
        setPolicies(pols);
      })
      .finally(() => {
        if (!isEditing) setIsLoading(false);
      });
  }, [isEditing]);

  // Load Existing Employee details if editing
  const loadEmployee = useCallback(async () => {
    if (!id) return;
    try {
      const data = await employeesApi.getEmployee(id);
      setEmployeeCode(data.employee_code || '');
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setDateOfBirth(data.date_of_birth ? data.date_of_birth.split('T')[0] : '');
      setGender(data.gender || '');
      setAddress(data.address || '');
      setHireDate(data.hire_date ? data.hire_date.split('T')[0] : '');
      setDepartmentId(data.department_id ? String(data.department_id) : '');
      setPositionId(data.position_id ? String(data.position_id) : '');
      setEmployeeTypeId(data.employee_type_id ? String(data.employee_type_id) : '');
      setManagerId(data.manager_id ? String(data.manager_id) : '');
      setScheduleId(data.schedule_id ? String(data.schedule_id) : '');
      setStatus(data.status || 'ACTIVE');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employee details';
      setInitialError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditing) {
      loadEmployee();
    }
  }, [isEditing, loadEmployee]);

  // Validation functions per step
  const validateStep = (stepNumber: number) => {
    const errs: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!isSelfEdit) {
        if (!employeeCode.trim()) {
          errs.employeeCode = 'Employee code is required';
        } else if (employeeCode.length < 2 || employeeCode.length > 20) {
          errs.employeeCode = 'Code must be between 2 and 20 characters';
        }
        if (!hireDate) {
          errs.hireDate = 'Hire date is required';
        }
      }
      if (!firstName.trim()) {
        errs.firstName = 'First name is required';
      }
      if (!lastName.trim()) {
        errs.lastName = 'Last name is required';
      }
    }

    if (stepNumber === 2) {
      if (email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          errs.email = 'Invalid email address format';
        }
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 7));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Custom Attendance Policy Creation helper
  const handleCreateCustomPolicy = async () => {
    if (!customPolicyName.trim()) {
      setFormError('Please enter a policy name for the custom policy');
      return;
    }
    setIsCreatingCustomPolicy(true);
    setFormError(null);
    try {
      const newPol = await attendanceApi.createPolicy({
        name: customPolicyName.trim(),
        grace_period_minutes: Number(customGraceMinutes) || 15,
        grace_occurrences_allowed: 3,
        grace_period_penalty: 'NONE',
        beyond_grace_penalty: 'HALF_DAY',
        early_leave_grace_minutes: 15,
        early_leave_penalty: 'NONE',
        stack_deductions: false,
        is_active: true,
      });
      setPolicies((prev) => [...prev, newPol]);
      setSelectedPolicyId(String(newPol.policy_id));
      setIsCustomizingPolicy(false);
      setCustomPolicyName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create custom policy';
      setFormError(msg);
    } finally {
      setIsCreatingCustomPolicy(false);
    }
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;

    setIsSubmitting(true);
    setFormError(null);

    const payload: Partial<CreateEmployeePayload> = isSelfEdit
      ? {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          date_of_birth: dateOfBirth || null,
          gender: gender.trim() || null,
          address: address.trim() || null,
        }
      : {
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
          schedule_id: scheduleId ? Number(scheduleId) : null,
          manager_id: managerId ? Number(managerId) : null,
          status,
        };

    try {
      if (isEditing && id) {
        await employeesApi.updateEmployee(id, payload);
        navigate(`/employees/${id}`);
      } else {
        const created = await employeesApi.createEmployee(payload as CreateEmployeePayload);

        // If a contract was selected during onboarding, link the created employee
        if (selectedContractId) {
          try {
            await contractsApi.updateContract(selectedContractId, {
              employee_id: created.employee_id,
              status: 'ACTIVE',
            });
          } catch {
            // Non-blocking contract association fallback
          }
        }

        navigate(`/employees/${created.employee_id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save employee profile';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper arrays for options
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

  const scheduleOptions = [
    { value: '', label: 'None / Select Working Schedule' },
    ...schedules.map((s) => ({
      value: String(s.schedule_id),
      label: `${s.name} (${s.hours_per_week} hrs/wk)`,
    })),
  ];

  const contractOptions = [
    { value: '', label: 'Assign Contract Later' },
    ...contracts.map((c) => ({
      value: String(c.contract_id),
      label: `${c.salary_structure_name || 'Contract'} - ₹${c.wage.toLocaleString()} / ${c.wage_type} (${c.status})`,
    })),
  ];

  const policyOptions = [
    { value: '', label: 'None / Default Attendance Policy' },
    ...policies.map((p) => ({
      value: String(p.policy_id),
      label: `${p.name} (${p.grace_period_minutes}m Grace Period)`,
    })),
  ];

  // Helper lookup objects for Review step
  const selectedDeptName = departments.find((d) => String(d.department_id) === departmentId)?.name || 'Not assigned';
  const selectedPosName = positions.find((p) => String(p.position_id) === positionId)?.title || 'Not assigned';
  const selectedTypeName = employeeTypes.find((t) => String(t.employee_type_id) === employeeTypeId)?.name || 'Not assigned';
  const selectedManagerObj = potentialManagers.find((m) => String(m.employee_id) === managerId);
  const selectedManagerName = selectedManagerObj ? `${selectedManagerObj.full_name || `${selectedManagerObj.first_name} ${selectedManagerObj.last_name}`}` : 'None';
  const selectedSchedObj = schedules.find((s) => String(s.schedule_id) === scheduleId);
  const selectedPolicyObj = policies.find((p) => String(p.policy_id) === selectedPolicyId);
  const selectedContractObj = contracts.find((c) => String(c.contract_id) === selectedContractId);

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
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="secondary"
            onClick={() => navigate(isEditing && id ? `/employees/${id}` : '/employees')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="mb-2"
          >
            {isEditing ? 'Back to Profile' : 'Back to Directory'}
          </Button>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            {isEditing ? 'Edit Employee Profile' : 'New Employee Onboarding'}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {isEditing
              ? isSelfEdit
                ? 'Update your personal profile details. Employment fields are managed by HR/Admin.'
                : 'Update employee contact details, organizational alignment, and job details.'
              : 'Complete the step-by-step form to onboard a new employee.'}
          </p>
        </div>
      </div>

      {isSelfEdit && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 text-blue-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
          <div>
            <p className="font-semibold">Self-Service Profile Edit</p>
            <p>You may edit your personal and contact details. Department, position, status, and employment details are locked and managed by HR/Admin.</p>
          </div>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to process request</p>
            <p>{formError}</p>
          </div>
        </div>
      )}

      {/* Multi-step Onboarding Progress Bar (When Creating New Employee) */}
      {!isEditing && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 scrollbar-none">
            {ONBOARDING_STEPS.map((s) => {
              const Icon = s.icon;
              const isCurrent = currentStep === s.step;
              const isCompleted = currentStep > s.step;

              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    if (s.step < currentStep || validateStep(currentStep)) {
                      setCurrentStep(s.step);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-[#2563EB] text-white'
                      : isCompleted
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-white text-[#2563EB] font-bold'
                        : isCompleted
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.step}
                  </div>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1 / Single View: Basic Information */}
        {(isEditing || currentStep === 1) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#2563EB]" />
                <span>Basic Information</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 1 of 7</span>}
            </div>

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
                required={!isSelfEdit}
                disabled={isSelfEdit}
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

              <Input
                type="date"
                label="Hire Date"
                value={hireDate}
                onChange={(e) => {
                  setHireDate(e.target.value);
                  if (fieldErrors.hireDate) setFieldErrors({ ...fieldErrors, hireDate: '' });
                }}
                error={fieldErrors.hireDate}
                required={!isSelfEdit}
                disabled={isSelfEdit}
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
                disabled={isSelfEdit}
              />
            </div>
          </div>
        )}

        {/* STEP 2 / Single View: Contact Information */}
        {(isEditing || currentStep === 2) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#2563EB]" />
                <span>Personal & Contact Details</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 2 of 7</span>}
            </div>

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
        )}

        {/* STEP 3 / Single View: Organization */}
        {(isEditing || currentStep === 3) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2563EB]" />
                <span>Organizational Alignment</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 3 of 7</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Department"
                options={departmentOptions}
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPositionId('');
                }}
                disabled={isSelfEdit}
              />

              <Select
                label="Job Position"
                options={positionOptions}
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                disabled={isSelfEdit}
              />

              <Select
                label="Employment Classification"
                options={typeOptions}
                value={employeeTypeId}
                onChange={(e) => setEmployeeTypeId(e.target.value)}
                disabled={isSelfEdit}
              />

              <Select
                label="Reporting Manager"
                options={managerOptions}
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                disabled={isSelfEdit}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Policy & Attendance Assignment (New Employee Wizard Step 4) */}
        {!isEditing && currentStep === 4 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#2563EB]" />
                <span>Policy & Attendance Assignment</span>
              </h2>
              <span className="text-xs font-medium text-[#64748B]">Step 4 of 7</span>
            </div>

            <div className="space-y-4">
              <Select
                label="Select Attendance Policy"
                options={policyOptions}
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                helperText="Select an existing company attendance policy for late arrival and grace rules."
              />

              {/* Option to Clone/Customize Policy */}
              <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Need a Custom Attendance Policy?</h3>
                    <p className="text-xs text-[#64748B]">Clone an existing policy to customize rules without altering shared company policies.</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsCustomizingPolicy(!isCustomizingPolicy)}
                  >
                    {isCustomizingPolicy ? 'Cancel Customization' : 'Customize Policy'}
                  </Button>
                </div>

                {isCustomizingPolicy && (
                  <div className="pt-3 border-t border-[#CBD5E1] space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="New Policy Name"
                        placeholder="e.g. Sales Department Shift Policy"
                        value={customPolicyName}
                        onChange={(e) => setCustomPolicyName(e.target.value)}
                      />
                      <Input
                        type="number"
                        label="Grace Period (Minutes)"
                        placeholder="15"
                        value={customGraceMinutes}
                        onChange={(e) => setCustomGraceMinutes(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isCreatingCustomPolicy}
                        onClick={handleCreateCustomPolicy}
                      >
                        Create & Assign Custom Policy
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Policy Summary Preview */}
              {selectedPolicyObj && (
                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl text-xs space-y-1 text-blue-900">
                  <p className="font-semibold text-sm text-blue-950">{selectedPolicyObj.name}</p>
                  <p>Grace Period: {selectedPolicyObj.grace_period_minutes} minutes ({selectedPolicyObj.grace_occurrences_allowed} occurrences/month)</p>
                  <p>Late Penalty Beyond Grace: {selectedPolicyObj.beyond_grace_penalty}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Working Schedule (New Employee Wizard Step 5) */}
        {!isEditing && currentStep === 5 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2563EB]" />
                <span>Working Schedule Assignment</span>
              </h2>
              <span className="text-xs font-medium text-[#64748B]">Step 5 of 7</span>
            </div>

            <div className="space-y-4">
              <Select
                label="Assigned Working Schedule / Shift"
                options={scheduleOptions}
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                helperText="Select an existing company shift or working schedule for attendance calculations."
              />

              {selectedSchedObj && (
                <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">{selectedSchedObj.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {selectedSchedObj.hours_per_week} hrs/week
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B]">Timezone: {selectedSchedObj.timezone}</p>
                  {selectedSchedObj.attendance_policy_name && (
                    <p className="text-xs text-[#64748B]">Linked Policy: {selectedSchedObj.attendance_policy_name}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Contract Selection (New Employee Wizard Step 6) */}
        {!isEditing && currentStep === 6 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2563EB]" />
                <span>Employment Contract</span>
              </h2>
              <span className="text-xs font-medium text-[#64748B]">Step 6 of 7</span>
            </div>

            <div className="space-y-4">
              <Select
                label="Assign Existing Draft Contract (Optional)"
                options={contractOptions}
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                helperText="Select an existing unassigned draft contract or proceed to create without linking immediately."
              />

              {selectedContractObj ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-900">
                  <div className="flex items-center justify-between font-bold text-sm text-emerald-950">
                    <span>Contract #{selectedContractObj.contract_id}</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">{selectedContractObj.status}</span>
                  </div>
                  <p>Structure: {selectedContractObj.salary_structure_name || 'Standard'}</p>
                  <p>Wage: ₹{selectedContractObj.wage.toLocaleString()} ({selectedContractObj.wage_type})</p>
                  <p>Effective Start Date: {selectedContractObj.start_date}</p>
                </div>
              ) : (
                <p className="text-xs text-[#64748B] italic">No contract selected. You can create or assign contracts at any time under Contract Management.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 7: Review & Finalize (New Employee Wizard Step 7) */}
        {!isEditing && currentStep === 7 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2563EB]" />
                <span>Review & Create Employee</span>
              </h2>
              <span className="text-xs font-medium text-[#64748B]">Step 7 of 7</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">1. Basic Details</span>
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Code:</span> {employeeCode}</p>
                <p><span className="text-[#64748B]">Name:</span> {firstName} {lastName}</p>
                <p><span className="text-[#64748B]">Hire Date:</span> {hireDate}</p>
                <p><span className="text-[#64748B]">Status:</span> {status}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">2. Contact Details</span>
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Email:</span> {email || 'N/A'}</p>
                <p><span className="text-[#64748B]">Phone:</span> {phone || 'N/A'}</p>
                <p><span className="text-[#64748B]">Gender:</span> {gender || 'N/A'}</p>
                <p><span className="text-[#64748B]">Address:</span> {address || 'N/A'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">3. Organization</span>
                  <button type="button" onClick={() => setCurrentStep(3)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Department:</span> {selectedDeptName}</p>
                <p><span className="text-[#64748B]">Position:</span> {selectedPosName}</p>
                <p><span className="text-[#64748B]">Type:</span> {selectedTypeName}</p>
                <p><span className="text-[#64748B]">Manager:</span> {selectedManagerName}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">4 & 5. Policies & Schedule</span>
                  <button type="button" onClick={() => setCurrentStep(4)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Attendance Policy:</span> {selectedPolicyObj ? selectedPolicyObj.name : 'Default'}</p>
                <p><span className="text-[#64748B]">Working Schedule:</span> {selectedSchedObj ? `${selectedSchedObj.name} (${selectedSchedObj.hours_per_week} hrs/wk)` : 'Not assigned'}</p>
                <p><span className="text-[#64748B]">Contract:</span> {selectedContractObj ? `${selectedContractObj.salary_structure_name || 'Contract'} - ₹${selectedContractObj.wage}` : 'None linked'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
          <div>
            {!isEditing && currentStep > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevStep}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                disabled={isSubmitting}
              >
                Previous Step
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEditing && id ? `/employees/${id}` : '/employees')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {isEditing ? (
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Profile Changes
              </Button>
            ) : currentStep < 7 ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleNextStep}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Step {currentStep + 1}
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Create Employee Profile
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
