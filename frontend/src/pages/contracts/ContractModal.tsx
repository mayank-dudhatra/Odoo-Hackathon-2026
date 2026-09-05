import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { contractsApi } from '../../api/contracts.api';
import { employeesApi } from '../../api/employees.api';
import { departmentsApi } from '../../api/departments.api';
import { positionsApi } from '../../api/positions.api';
import { schedulesApi } from '../../api/schedules.api';
import { salaryApi } from '../../api/salary.api';
import type { Contract, CreateContractPayload, WageType, ContractStatus } from '../../types/contracts';
import type { Employee, Department, Position } from '../../types/organization';
import type { WorkingSchedule } from '../../types/schedules';
import type { SalaryStructure } from '../../types/salary';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contract?: Contract | null;
  defaultEmployeeId?: number;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  contract,
  defaultEmployeeId,
}) => {
  const isEditing = Boolean(contract);

  const [employeeId, setEmployeeId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');
  const [scheduleId, setScheduleId] = useState<string>('');
  const [salaryStructureId, setSalaryStructureId] = useState<string>('');
  const [wage, setWage] = useState<string>('');
  const [wageType, setWageType] = useState<WageType>('MONTHLY');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<ContractStatus>('ACTIVE');

  // Master options
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      Promise.all([
        employeesApi.getEmployees({ limit: 200, status: 'ACTIVE' }).catch(() => ({ rows: [] })),
        departmentsApi.getDepartments().catch(() => []),
        positionsApi.getPositions().catch(() => []),
        schedulesApi.listSchedules().catch(() => []),
        salaryApi.listStructures().catch(() => []),
      ]).then(([empRes, deptRes, posRes, schedRes, structRes]) => {
        if (!active) return;
        const empRows = (empRes as any)?.rows || (Array.isArray(empRes) ? empRes : []);
        setEmployees(empRows);
        setDepartments(deptRes || []);
        setPositions(posRes || []);
        setSchedules(schedRes || []);
        setStructures(structRes || []);
      });
    }
    return () => { active = false; };
  }, [isOpen]);

  useEffect(() => {
    if (contract) {
      setEmployeeId(contract.employee_id ? String(contract.employee_id) : '');
      setDepartmentId(contract.department_id ? String(contract.department_id) : '');
      setPositionId(contract.position_id ? String(contract.position_id) : '');
      setScheduleId(contract.schedule_id ? String(contract.schedule_id) : '');
      setSalaryStructureId(String(contract.salary_structure_id));
      setWage(String(contract.wage));
      setWageType(contract.wage_type || 'MONTHLY');
      setStartDate(contract.start_date ? contract.start_date.slice(0, 10) : '');
      setEndDate(contract.end_date ? contract.end_date.slice(0, 10) : '');
      setStatus(contract.status || 'ACTIVE');
    } else {
      setEmployeeId(defaultEmployeeId ? String(defaultEmployeeId) : '');
      setDepartmentId('');
      setPositionId('');
      setScheduleId('');
      setSalaryStructureId('');
      setWage('');
      setWageType('MONTHLY');
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate('');
      setStatus('ACTIVE');
    }
    setError(null);
  }, [contract, defaultEmployeeId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!salaryStructureId) {
      setError('Please select a salary structure');
      return;
    }
    if (!wage || Number(wage) <= 0) {
      setError('Please enter a valid positive wage amount');
      return;
    }
    if (!startDate) {
      setError('Start date is required');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('End date must be greater than or equal to start date');
      return;
    }

    setLoading(true);
    try {
      const payload: CreateContractPayload = {
        employee_id: employeeId ? Number(employeeId) : null,
        department_id: departmentId ? Number(departmentId) : null,
        position_id: positionId ? Number(positionId) : null,
        schedule_id: scheduleId ? Number(scheduleId) : null,
        salary_structure_id: Number(salaryStructureId),
        wage: Number(wage),
        wage_type: wageType,
        start_date: startDate,
        end_date: endDate || null,
        status,
      };

      if (isEditing && contract) {
        await contractsApi.updateContract(contract.contract_id, payload);
      } else {
        await contractsApi.createContract(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        'Failed to save contract';
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Employment Contract' : 'Create Employment Contract'}
      description="Define salary structure, wage compensation, working schedule, and active period."
      maxWidth="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={loading}>
            {isEditing ? 'Save Changes' : 'Create Contract'}
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

        {/* Employee */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
            Employee (Optional / Assign Later)
          </label>
          <select
            disabled={Boolean(defaultEmployeeId)}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:bg-[#F1F5F9]"
          >
            <option value="">Unassigned / Select Employee Later...</option>
            {employees.map((emp) => (
              <option key={emp.employee_id} value={emp.employee_id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code})
              </option>
            ))}
          </select>
        </div>

        {/* Department & Position */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">None / Inherit</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Position
            </label>
            <select
              value={positionId}
              onChange={(e) => setPositionId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">None / Inherit</option>
              {positions.map((p) => (
                <option key={p.position_id} value={p.position_id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Working Schedule & Salary Structure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Working Schedule
            </label>
            <select
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            >
              <option value="">None</option>
              {schedules.map((s) => (
                <option key={s.schedule_id} value={s.schedule_id}>
                  {s.name} ({s.timezone || 'UTC'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Salary Structure *
            </label>
            <select
              value={salaryStructureId}
              onChange={(e) => setSalaryStructureId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              required
            >
              <option value="">Select Structure...</option>
              {structures.map((s) => (
                <option key={s.salary_structure_id} value={s.salary_structure_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Wage & Wage Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Wage Amount *
            </label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={wage}
              onChange={(e) => setWage(e.target.value)}
              placeholder="e.g. 50000"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Wage Type *
            </label>
            <select
              value={wageType}
              onChange={(e) => setWageType(e.target.value as WageType)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              required
            >
              <option value="MONTHLY">Monthly</option>
              <option value="HOURLY">Hourly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </div>
        </div>

        {/* Period Dates & Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Start Date *
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              End Date (Optional)
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-1">
              Contract Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContractStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              required
            >
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
};
