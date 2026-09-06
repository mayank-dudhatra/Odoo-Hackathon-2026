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
  Clock,
  FileText,
  Shield,
  Plus,
  UserCheck,
  Mail,
  KeyRound,
  DollarSign,
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
import { salaryApi } from '../../api/salary.api';
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
import type { SalaryStructure } from '../../types/salary';
import { useAuth } from '../../hooks/useAuth';

const ADMIN_WIZARD_STEPS = [
  { step: 1, title: 'Basic Info', icon: UserCheck },
  { step: 2, title: 'Employment', icon: Building2 },
  { step: 3, title: 'Work Config', icon: Clock },
  { step: 4, title: 'Contract & Salary', icon: DollarSign },
  { step: 5, title: 'Account & Role', icon: KeyRound },
  { step: 6, title: 'Review & Create', icon: CheckCircle2 },
];

export const EmployeeFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const isEditing = Boolean(id);

  useEffect(() => {
    if (role === 'Employee') {
      navigate(user?.employee_id ? `/employees/${user.employee_id}` : '/dashboard', { replace: true });
    }
  }, [role, user, navigate]);

  // Wizard Step Control
  const [currentStep, setCurrentStep] = useState(1);

  // Reference Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // STEP 1 — Basic Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // STEP 2 — Employment Information
  const [employeeCode, setEmployeeCode] = useState('');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [employeeTypeId, setEmployeeTypeId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [status, setStatus] = useState<EmployeeStatus>('ACTIVE');

  // STEP 3 — Work Configuration
  const [scheduleId, setScheduleId] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');
  const [isCustomizingPolicy, setIsCustomizingPolicy] = useState(false);
  const [customPolicyName, setCustomPolicyName] = useState('');
  const [customGraceMinutes, setCustomGraceMinutes] = useState('15');
  const [isCreatingCustomPolicy, setIsCreatingCustomPolicy] = useState(false);

  // STEP 4 — Contract & Salary
  const [contractOption, setContractOption] = useState<'NONE' | 'EXISTING' | 'INLINE'>('INLINE');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [salaryStructureId, setSalaryStructureId] = useState('');
  const [wageAmount, setWageAmount] = useState('15000');
  const [wageType, setWageType] = useState('MONTHLY');
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractEndDate, setContractEndDate] = useState('');

  // STEP 5 — Account & Role
  const [email, setEmail] = useState('');
  const [assignedRole, setAssignedRole] = useState<'EMPLOYEE' | 'HR_MANAGER' | 'HR_PAYROLL_USER' | 'HR_PAYROLL_MANAGER'>('EMPLOYEE');
  const [accountStatus, setAccountStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [createUserAccount, setCreateUserAccount] = useState(true);

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
      salaryApi.listStructures().catch(() => []),
    ])
      .then(([deps, pos, types, empRes, scheds, ctrs, pols, structures]) => {
        setDepartments(deps);
        setPositions(pos);
        setEmployeeTypes(types);
        setPotentialManagers(empRes.rows || []);
        setSchedules(scheds);
        setContracts(ctrs);
        setPolicies(pols);
        setSalaryStructures(structures);

        if (structures.length > 0 && !salaryStructureId) {
          setSalaryStructureId(String(structures[0].salary_structure_id));
        }
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
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setDateOfBirth(data.date_of_birth ? data.date_of_birth.split('T')[0] : '');
      setGender(data.gender || '');
      setAddress(data.address || '');

      setEmployeeCode(data.employee_code || '');
      setHireDate(data.hire_date ? data.hire_date.split('T')[0] : '');
      setDepartmentId(data.department_id ? String(data.department_id) : '');
      setPositionId(data.position_id ? String(data.position_id) : '');
      setEmployeeTypeId(data.employee_type_id ? String(data.employee_type_id) : '');
      setManagerId(data.manager_id ? String(data.manager_id) : '');
      setStatus(data.status || 'ACTIVE');
      setScheduleId(data.schedule_id ? String(data.schedule_id) : '');

      if (data.role_name) {
        const roleUpper = data.role_name.toUpperCase().replace(/\s+/g, '_');
        if (roleUpper.includes('PAYROLL_MANAGER')) setAssignedRole('HR_PAYROLL_MANAGER');
        else if (roleUpper.includes('PAYROLL_USER')) setAssignedRole('HR_PAYROLL_USER');
        else if (roleUpper.includes('HR_MANAGER')) setAssignedRole('HR_MANAGER');
        else setAssignedRole('EMPLOYEE');
      }

      if (data.account_status) {
        setAccountStatus(data.account_status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
      }
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

  // Step Validation
  const validateStep = (stepNumber: number) => {
    const errs: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!firstName.trim()) errs.firstName = 'First name is required';
      if (!lastName.trim()) errs.lastName = 'Last name is required';
    }

    if (stepNumber === 2) {
      if (!employeeCode.trim()) {
        errs.employeeCode = 'Employee code is required';
      } else if (employeeCode.length < 2 || employeeCode.length > 20) {
        errs.employeeCode = 'Code must be between 2 and 20 characters';
      }
      if (!hireDate) errs.hireDate = 'Joining / Hire date is required';
    }

    if (stepNumber === 5) {
      if (createUserAccount && email.trim()) {
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
      setCurrentStep((prev) => Math.min(prev + 1, 6));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Custom Policy Handler
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

  // Final Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(5)) return;

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
      schedule_id: scheduleId ? Number(scheduleId) : null,
      manager_id: managerId ? Number(managerId) : null,
      status,
      create_user_account: createUserAccount,
      role_name: assignedRole,
      account_status: accountStatus,
      selected_contract_id: contractOption === 'EXISTING' && selectedContractId ? Number(selectedContractId) : null,
      salary_structure_id: contractOption === 'INLINE' && salaryStructureId ? Number(salaryStructureId) : null,
      wage: contractOption === 'INLINE' && wageAmount ? Number(wageAmount) : null,
      wage_type: contractOption === 'INLINE' ? wageType : 'MONTHLY',
      contract_start_date: contractOption === 'INLINE' ? contractStartDate : null,
      contract_end_date: contractOption === 'INLINE' && contractEndDate ? contractEndDate : null,
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

  // Dropdown Options
  const departmentManagers = potentialManagers.filter((m) => {
    if (isEditing && String(m.employee_id) === String(id)) return false;
    if (!departmentId) return true;
    return m.department_id && String(m.department_id) === departmentId;
  });

  const filteredManagersList = departmentManagers.length > 0
    ? departmentManagers
    : potentialManagers.filter((m) => !isEditing || String(m.employee_id) !== String(id));

  const managerOptions = [
    { value: '', label: 'None (No direct manager)' },
    ...filteredManagersList.map((m) => ({
      value: String(m.employee_id),
      label: `${m.full_name || `${m.first_name} ${m.last_name}`} (${m.employee_code})${m.department_name ? ` - ${m.department_name}` : ''}`,
    })),
  ];

  const departmentOptions = [
    { value: '', label: 'None / Select Department' },
    ...departments.map((d) => ({
      value: String(d.department_id),
      label: d.name,
    })),
  ];

  const positionOptions = [
    { value: '', label: 'None / Select Position' },
    ...positions.map((p) => ({
      value: String(p.position_id),
      label: p.department_name ? `${p.title} (${p.department_name})` : p.title,
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
    { value: '', label: 'Select Draft Contract Template' },
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

  const salaryStructureOptions = [
    { value: '', label: 'Select Salary Structure' },
    ...salaryStructures.map((ss) => ({
      value: String(ss.salary_structure_id),
      label: `${ss.name} (${ss.rules_count || 0} Rules)`,
    })),
  ];

  // Helper Labels for Review
  const selectedDeptName = departments.find((d) => String(d.department_id) === departmentId)?.name || 'Unassigned';
  const selectedPosName = positions.find((p) => String(p.position_id) === positionId)?.title || 'Unassigned';
  const selectedTypeName = employeeTypes.find((t) => String(t.employee_type_id) === employeeTypeId)?.name || 'Regular';
  const selectedManagerObj = potentialManagers.find((m) => String(m.employee_id) === managerId);
  const selectedManagerName = selectedManagerObj ? `${selectedManagerObj.full_name || `${selectedManagerObj.first_name} ${selectedManagerObj.last_name}`}` : 'None';
  const selectedSchedObj = schedules.find((s) => String(s.schedule_id) === scheduleId);
  const selectedPolicyObj = policies.find((p) => String(p.policy_id) === selectedPolicyId);
  const selectedStructureObj = salaryStructures.find((ss) => String(ss.salary_structure_id) === salaryStructureId);

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
      {/* Header */}
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
            {isEditing ? 'Edit Employee & Account Details' : 'Admin Unified Employee Creation Wizard'}
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {isEditing
              ? 'Update complete employee information, employment details, work configuration, and system role.'
              : 'Complete the unified workflow to create employee record, user account, role permissions, and contract.'}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to process employee creation</p>
            <p>{formError}</p>
          </div>
        </div>
      )}

      {/* Multi-step Wizard Progress Bar (For New Employee Creation) */}
      {!isEditing && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 scrollbar-none">
            {ADMIN_WIZARD_STEPS.map((s) => {
              const isCurrent = currentStep === s.step;
              const isCompleted = currentStep > s.step;
              const StepIcon = s.icon;

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
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StepIcon className="w-3 h-3" />}
                  </div>
                  <span>{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Basic Information */}
        {(isEditing || currentStep === 1) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#2563EB]" />
                <span>STEP 1 — Basic Personal Details</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 1 of 6</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <Input
                type="tel"
                label="Phone Number"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="md:col-span-2">
                <Input
                  label="Residential Address"
                  placeholder="Street address, city, state, zip code"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Employment Information */}
        {(isEditing || currentStep === 2) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2563EB]" />
                <span>STEP 2 — Employment & Organizational Alignment</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 2 of 6</span>}
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
                required
              />

              <Input
                type="date"
                label="Joining / Hire Date"
                value={hireDate}
                onChange={(e) => {
                  setHireDate(e.target.value);
                  if (fieldErrors.hireDate) setFieldErrors({ ...fieldErrors, hireDate: '' });
                }}
                error={fieldErrors.hireDate}
                required
              />

              <Select
                label="Employee Status"
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
                  setPositionId('');
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

              <div className="md:col-span-3">
                <Select
                  label="Reporting Manager"
                  options={managerOptions}
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Work Configuration */}
        {(isEditing || currentStep === 3) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2563EB]" />
                <span>STEP 3 — Work Configuration (Schedule & Policies)</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 3 of 6</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Working Schedule / Shift"
                options={scheduleOptions}
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
                helperText="Assign work shift pattern for attendance & payroll calculations."
              />

              <Select
                label="Attendance Policy"
                options={policyOptions}
                value={selectedPolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
                helperText="Assign grace period and late penalty rules."
              />

              {/* Custom Policy creation prompt */}
              <div className="md:col-span-2 p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Custom Attendance Policy</h3>
                    <p className="text-xs text-[#64748B]">Create a custom policy specifically tailored for this shift/role.</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => setIsCustomizingPolicy(!isCustomizingPolicy)}
                  >
                    {isCustomizingPolicy ? 'Cancel Custom Policy' : 'Create Custom Policy'}
                  </Button>
                </div>

                {isCustomizingPolicy && (
                  <div className="pt-3 border-t border-[#CBD5E1] space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="New Policy Name"
                        placeholder="e.g. High Priority Shift Policy"
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
            </div>
          </div>
        )}

        {/* STEP 4: Contract & Salary */}
        {(isEditing || currentStep === 4) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#2563EB]" />
                <span>STEP 4 — Contract & Salary Configuration</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 4 of 6</span>}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="contractOption"
                    checked={contractOption === 'INLINE'}
                    onChange={() => setContractOption('INLINE')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Create Active Contract Now</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="contractOption"
                    checked={contractOption === 'EXISTING'}
                    onChange={() => setContractOption('EXISTING')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Link Existing Draft Contract</span>
                </label>

                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="contractOption"
                    checked={contractOption === 'NONE'}
                    onChange={() => setContractOption('NONE')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Skip Contract Setup</span>
                </label>
              </div>

              {contractOption === 'EXISTING' && (
                <Select
                  label="Select Draft Contract Template"
                  options={contractOptions}
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                />
              )}

              {contractOption === 'INLINE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <Select
                    label="Salary Structure"
                    options={salaryStructureOptions}
                    value={salaryStructureId}
                    onChange={(e) => setSalaryStructureId(e.target.value)}
                    required
                  />

                  <Input
                    type="number"
                    label="Wage / Base Amount (₹)"
                    placeholder="e.g. 25000"
                    value={wageAmount}
                    onChange={(e) => setWageAmount(e.target.value)}
                    required
                  />

                  <Select
                    label="Wage Type"
                    options={[
                      { value: 'MONTHLY', label: 'Monthly Base Wage' },
                      { value: 'HOURLY', label: 'Hourly Rate' },
                      { value: 'WEEKLY', label: 'Weekly Pay' },
                    ]}
                    value={wageType}
                    onChange={(e) => setWageType(e.target.value)}
                  />

                  <Input
                    type="date"
                    label="Contract Start Date"
                    value={contractStartDate}
                    onChange={(e) => setContractStartDate(e.target.value)}
                  />

                  <Input
                    type="date"
                    label="Contract End Date (Optional)"
                    placeholder="Leave empty for indefinite contract"
                    value={contractEndDate}
                    onChange={(e) => setContractEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Account & Role Assignment */}
        {(isEditing || currentStep === 5) && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#2563EB]" />
                <span>STEP 5 — Account Credentials & System Role</span>
              </h2>
              {!isEditing && <span className="text-xs font-medium text-[#64748B]">Step 5 of 6</span>}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="email"
                  label="Login Email Address"
                  placeholder="e.g. employee@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                  }}
                  error={fieldErrors.email}
                />

                <Select
                  label="Account Status"
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE (Enabled Login)' },
                    { value: 'INACTIVE', label: 'INACTIVE (Disabled Access)' },
                  ]}
                  value={accountStatus}
                  onChange={(e) => setAccountStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                />
              </div>

              {/* System Role Selection Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  Assign System Permission Role
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => setAssignedRole('EMPLOYEE')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      assignedRole === 'EMPLOYEE'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                      <span>Employee</span>
                      {assignedRole === 'EMPLOYEE' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Own profile, attendance check-in/out, own leave requests, payslips. No admin access.
                    </p>
                  </div>

                  <div
                    onClick={() => setAssignedRole('HR_MANAGER')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      assignedRole === 'HR_MANAGER'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                      <span>HR Manager</span>
                      {assignedRole === 'HR_MANAGER' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Employee records, contract management, working schedules, leave approval. No payroll admin.
                    </p>
                  </div>

                  <div
                    onClick={() => setAssignedRole('HR_PAYROLL_USER')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      assignedRole === 'HR_PAYROLL_USER'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                      <span>HR Payroll User</span>
                      {assignedRole === 'HR_PAYROLL_USER' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      HR permissions + payrun draft processing, payslip management. Read-only salary rules.
                    </p>
                  </div>

                  <div
                    onClick={() => setAssignedRole('HR_PAYROLL_MANAGER')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      assignedRole === 'HR_PAYROLL_MANAGER'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                      <span>HR Payroll Manager</span>
                      {assignedRole === 'HR_PAYROLL_MANAGER' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Full Salary Structure & Rule CRUD, full payrun validation, approval, and payslip control.
                    </p>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Auto-create user account & email login credentials upon submission</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={createUserAccount}
                    onChange={(e) => setCreateUserAccount(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Review & Finalize */}
        {!isEditing && currentStep === 6 && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2563EB]" />
                <span>STEP 6 — Review & Create Employee Profile</span>
              </h2>
              <span className="text-xs font-medium text-[#64748B]">Step 6 of 6</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">1. Basic Info</span>
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Name:</span> {firstName} {lastName}</p>
                <p><span className="text-[#64748B]">DOB:</span> {dateOfBirth || 'N/A'}</p>
                <p><span className="text-[#64748B]">Gender:</span> {gender || 'N/A'}</p>
                <p><span className="text-[#64748B]">Phone:</span> {phone || 'N/A'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">2. Employment</span>
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Code:</span> {employeeCode}</p>
                <p><span className="text-[#64748B]">Joining Date:</span> {hireDate}</p>
                <p><span className="text-[#64748B]">Department:</span> {selectedDeptName}</p>
                <p><span className="text-[#64748B]">Position:</span> {selectedPosName}</p>
                <p><span className="text-[#64748B]">Type:</span> {selectedTypeName}</p>
                <p><span className="text-[#64748B]">Manager:</span> {selectedManagerName}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">3. Work Config</span>
                  <button type="button" onClick={() => setCurrentStep(3)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Schedule:</span> {selectedSchedObj ? `${selectedSchedObj.name} (${selectedSchedObj.hours_per_week} hrs/wk)` : 'Company Default'}</p>
                <p><span className="text-[#64748B]">Attendance Policy:</span> {selectedPolicyObj ? selectedPolicyObj.name : 'Company Default'}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-[#E2E8F0] space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#CBD5E1]">
                  <span className="font-bold text-[#0F172A]">4 & 5. Contract, Account & Role</span>
                  <button type="button" onClick={() => setCurrentStep(4)} className="text-xs text-[#2563EB] hover:underline font-semibold">Edit</button>
                </div>
                <p><span className="text-[#64748B]">Contract Setup:</span> {contractOption === 'INLINE' ? `₹${wageAmount} / ${wageType} (${selectedStructureObj?.name || 'Standard'})` : contractOption === 'EXISTING' ? 'Template Linked' : 'None'}</p>
                <p><span className="text-[#64748B]">Login Email:</span> {email || 'N/A'}</p>
                <p><span className="text-[#64748B]">Assigned Role:</span> <span className="font-bold text-blue-700">{assignedRole.replace(/_/g, ' ')}</span></p>
                <p><span className="text-[#64748B]">Account Status:</span> {accountStatus}</p>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
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
                Save Employee Profile
              </Button>
            ) : currentStep < 6 ? (
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
                Create Employee Record
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
