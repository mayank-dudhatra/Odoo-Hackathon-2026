import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  MapPin,
  User,
  UserCheck,
  Edit2,
  Trash2,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ErrorAlert } from '../../components/common/States';
import { employeesApi } from '../../api/employees.api';
import { contractsApi } from '../../api/contracts.api';
import { schedulesApi } from '../../api/schedules.api';
import type { Employee, EmployeeStatus } from '../../types/organization';
import type { EffectiveContract } from '../../types/contracts';
import type { WorkingSchedule } from '../../types/schedules';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { checkPermission, role, user } = useAuth();
  const isAdmin = role === 'Admin';

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [effectiveContract, setEffectiveContract] = useState<EffectiveContract | null>(null);
  const [effectiveSchedule, setEffectiveSchedule] = useState<WorkingSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status Change State
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<EmployeeStatus | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwnProfile = Boolean(user?.employee_id && String(user.employee_id) === String(id));
  const canUpdate = isAdmin || checkPermission('EMPLOYEES', 'UPDATE') || isOwnProfile;
  const canChangeStatus = isAdmin || checkPermission('EMPLOYEES', 'UPDATE_STATUS') || checkPermission('EMPLOYEES', 'UPDATE');
  const canDelete = isAdmin || checkPermission('EMPLOYEES', 'DELETE');

  const fetchEmployee = useCallback(async () => {
    if (!id) return;
    try {
      const data = await employeesApi.getEmployee(id);
      setEmployee(data);
      // Also fetch effective contract and schedule
      contractsApi.getEffectiveContract(Number(id)).then(setEffectiveContract).catch(() => setEffectiveContract(null));
      schedulesApi.getEffectiveSchedule(Number(id)).then(setEffectiveSchedule).catch(() => setEffectiveSchedule(null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employee details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const data = await employeesApi.getEmployee(id);
        if (active) {
          setEmployee(data);
          contractsApi.getEffectiveContract(Number(id)).then((c) => active && setEffectiveContract(c)).catch(() => {});
          schedulesApi.getEffectiveSchedule(Number(id)).then((s: WorkingSchedule) => active && setEffectiveSchedule(s)).catch(() => {});
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to load employee details';
          setError(msg);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const handleStatusChangeConfirm = async () => {
    if (!employee || !targetStatus) return;
    setIsUpdatingStatus(true);
    try {
      await employeesApi.updateEmployeeStatus(employee.employee_id, targetStatus);
      setIsStatusDialogOpen(false);
      setTargetStatus(null);
      fetchEmployee();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update employee status';
      alert(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!employee) return;
    setIsDeleting(true);
    try {
      await employeesApi.deleteEmployee(employee.employee_id);
      setIsDeleteDialogOpen(false);
      navigate('/employees');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete employee';
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (empStatus?: EmployeeStatus) => {
    switch (empStatus) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="warning">Inactive</Badge>;
      case 'TERMINATED':
        return <Badge variant="danger">Terminated</Badge>;
      default:
        return <Badge variant="neutral">{empStatus || 'Unknown'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-44 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
          <div className="h-64 bg-white rounded-xl border border-[#E2E8F0] animate-pulse p-6" />
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/employees')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Employees
        </Button>
        <ErrorAlert
          message={error || 'Employee not found or you do not have permission to view this profile.'}
          onRetry={fetchEmployee}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/employees')}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Employees
        </Button>

        <div className="flex items-center gap-2.5">
          {canUpdate && (
            <Button
              variant="primary"
              onClick={() => navigate(`/employees/${employee.employee_id}/edit`)}
              leftIcon={<Edit2 className="w-4 h-4" />}
            >
              Edit Profile
            </Button>
          )}

          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] font-bold text-xl flex items-center justify-center border border-blue-200 shadow-2xs shrink-0">
              {employee.first_name[0]}
              {employee.last_name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                  {employee.full_name || `${employee.first_name} ${employee.last_name}`}
                </h1>
                {getStatusBadge(employee.status)}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[#64748B]">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-700 font-semibold">
                  {employee.employee_code}
                </span>
                {employee.position_name && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {employee.position_name}
                  </span>
                )}
                {employee.department_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {employee.department_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {canChangeStatus && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-[#64748B] font-medium">Status Control:</span>
              <select
                value={employee.status}
                onChange={(e) => {
                  setTargetStatus(e.target.value as EmployeeStatus);
                  setIsStatusDialogOpen(true);
                }}
                aria-label="Change employee status"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <User className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#0F172A]">Personal Information</h2>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">First Name:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">{employee.first_name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Last Name:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">{employee.last_name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Email Address:</span>
              <span className="col-span-2 font-medium text-[#0F172A] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                {employee.email || '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Phone Number:</span>
              <span className="col-span-2 font-medium text-[#0F172A] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                {employee.phone || '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Date of Birth:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {employee.date_of_birth
                  ? new Date(employee.date_of_birth).toLocaleDateString()
                  : '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Gender:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {employee.gender || '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Address:</span>
              <span className="col-span-2 font-medium text-[#0F172A] flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
                {employee.address || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
            <Briefcase className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base font-bold text-[#0F172A]">Employment Information</h2>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Employee Code:</span>
              <span className="col-span-2 font-mono font-bold text-[#0F172A]">
                {employee.employee_code}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Hire Date:</span>
              <span className="col-span-2 font-medium text-[#0F172A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                {employee.hire_date
                  ? new Date(employee.hire_date).toLocaleDateString()
                  : '—'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Department:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {employee.department_name || 'Unassigned'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Job Position:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {employee.position_name || 'Unassigned'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Classification:</span>
              <span className="col-span-2 font-medium text-[#0F172A]">
                {employee.employee_type_name || 'Regular'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Reporting Manager:</span>
              <span className="col-span-2 font-medium text-[#0F172A] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#94A3B8]" />
                {employee.manager_name || 'No Direct Manager'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-[#64748B]">Account Status:</span>
              <span className="col-span-2">{getStatusBadge(employee.status)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Effective Contract & Working Schedule Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Effective Contract */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A]">Effective Contract (Today)</h2>
            </div>
            {effectiveContract && (
              <Badge variant="success">Active</Badge>
            )}
          </div>

          {effectiveContract ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Wage Compensation:</span>
                <span className="font-bold text-[#0F172A]">
                  {formatCurrency(effectiveContract.wage)}
                  <span className="text-xs text-[#64748B] font-normal ml-1">
                    / {effectiveContract.wage_type?.toLowerCase() || 'month'}
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Salary Structure:</span>
                <span className="font-medium text-[#0F172A]">{effectiveContract.salary_structure_name || 'Standard'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Contract Duration:</span>
                <span className="text-[#0F172A] text-xs font-mono">
                  {formatDate(effectiveContract.start_date)} → {effectiveContract.end_date ? formatDate(effectiveContract.end_date) : 'Indefinite'}
                </span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/contracts/${effectiveContract.contract_id}`)}
                  className="w-full"
                >
                  View Contract Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-[#64748B]">
              <p>No active employment contract effective for today's date.</p>
              {canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/contracts')}
                  className="mt-3"
                >
                  Manage Contracts
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Effective Working Schedule */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-base font-bold text-[#0F172A]">Working Schedule (Today)</h2>
            </div>
            {effectiveSchedule && (
              <Badge variant="info">{effectiveSchedule.timezone || 'UTC'}</Badge>
            )}
          </div>

          {effectiveSchedule ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Assigned Schedule:</span>
                <span className="font-semibold text-[#0F172A]">{effectiveSchedule.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Weekly Operating Days:</span>
                <span className="font-medium text-[#0F172A]">
                  {effectiveSchedule.days?.filter((d) => d.is_working_day).length ?? 0} days / week
                </span>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/working-schedules')}
                  className="w-full"
                >
                  View Schedules
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-[#64748B]">
              <p>No working schedule assigned or resolved for this employee.</p>
              {canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/working-schedules')}
                  className="mt-3"
                >
                  Assign Schedule
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Status Change Dialog */}
      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        title="Confirm Status Change"
        message={`Are you sure you want to change this employee's status to ${targetStatus}?`}
        confirmLabel="Update Status"
        isDestructive={targetStatus === 'TERMINATED'}
        isLoading={isUpdatingStatus}
        onConfirm={handleStatusChangeConfirm}
        onClose={() => {
          setIsStatusDialogOpen(false);
          setTargetStatus(null);
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Employee"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        confirmLabel="Delete Employee"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
};
