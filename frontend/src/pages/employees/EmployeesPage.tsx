import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Edit2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { employeesApi } from '../../api/employees.api';
import { departmentsApi } from '../../api/departments.api';
import { positionsApi } from '../../api/positions.api';
import { employeeTypesApi } from '../../api/employeeTypes.api';
import type {
  Employee,
  Department,
  Position,
  EmployeeType,
  EmployeeStatus,
  EmployeeQueryParams,
} from '../../types/organization';
import { useAuth } from '../../hooks/useAuth';

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const canCreate = isAdmin || checkPermission('EMPLOYEES', 'CREATE');
  const canUpdate = isAdmin || checkPermission('EMPLOYEES', 'UPDATE');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Query State
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [employeeTypeId, setEmployeeTypeId] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Reference data
  useEffect(() => {
    Promise.all([
      departmentsApi.getDepartments().catch(() => []),
      positionsApi.getPositions().catch(() => []),
      employeeTypesApi.getEmployeeTypes().catch(() => []),
    ]).then(([deps, pos, types]) => {
      setDepartments(deps);
      setPositions(pos);
      setEmployeeTypes(types);
    });
  }, []);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: EmployeeQueryParams = {
        page,
        limit,
        search: search.trim() || undefined,
        department_id: departmentId ? Number(departmentId) : undefined,
        position_id: positionId ? Number(positionId) : undefined,
        employee_type_id: employeeTypeId ? Number(employeeTypeId) : undefined,
        status: status ? (status as EmployeeStatus) : undefined,
      };

      const res = await employeesApi.getEmployees(params);
      setEmployees(res.rows || []);
      setTotalPages(res.pagination?.total_pages || 1);
      setTotalCount(res.pagination?.total || (res.rows ? res.rows.length : 0));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch employees';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, departmentId, positionId, employeeTypeId, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  const handleResetFilters = () => {
    setSearch('');
    setDepartmentId('');
    setPositionId('');
    setEmployeeTypeId('');
    setStatus('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || departmentId || positionId || employeeTypeId || status
  );

  const getStatusBadge = (empStatus: EmployeeStatus) => {
    switch (empStatus) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="warning">Inactive</Badge>;
      case 'TERMINATED':
        return <Badge variant="danger">Terminated</Badge>;
      default:
        return <Badge variant="neutral">{empStatus}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Employees</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage employee profiles, organizational information and employment records
          </p>
        </div>
        {canCreate && (
          <Button
            variant="primary"
            onClick={() => navigate('/employees/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Employee
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, code or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by department"
              className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.department_id} value={String(d.department_id)}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={positionId}
              onChange={(e) => {
                setPositionId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by position"
              className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              <option value="">All Positions</option>
              {positions.map((p) => (
                <option key={p.position_id} value={String(p.position_id)}>
                  {p.title}
                </option>
              ))}
            </select>

            <select
              value={employeeTypeId}
              onChange={(e) => {
                setEmployeeTypeId(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by employee type"
              className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              <option value="">All Types</option>
              {employeeTypes.map((t) => (
                <option key={t.employee_type_id} value={String(t.employee_type_id)}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by status"
              className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TERMINATED">Terminated</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-[#64748B] hover:text-[#0F172A] bg-slate-50 hover:bg-slate-100 rounded-lg border border-[#E2E8F0] transition-colors"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {error ? (
          <div className="p-6">
            <ErrorAlert message={error} onRetry={fetchEmployees} />
          </div>
        ) : isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No employees found"
              description={
                hasActiveFilters
                  ? 'No employees match the applied search and filter criteria.'
                  : 'Get started by creating the first employee profile.'
              }
              actionLabel={canCreate && !hasActiveFilters ? 'Add Employee' : undefined}
              onAction={canCreate && !hasActiveFilters ? () => navigate('/employees/new') : undefined}
            />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Department & Position</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Manager</th>
                    <th className="py-3 px-4">Hire Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {employees.map((emp) => (
                    <tr
                      key={emp.employee_id}
                      onClick={() => navigate(`/employees/${emp.employee_id}`)}
                      className="hover:bg-[#F8FAFC]/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-[#2563EB] font-bold text-xs flex items-center justify-center shrink-0">
                            {emp.first_name[0]}
                            {emp.last_name[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-[#0F172A] block hover:text-[#2563EB] transition-colors">
                              {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                            </span>
                            <span className="text-xs text-[#64748B] font-mono">
                              {emp.employee_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#475569]">
                        <div>
                          <span className="block text-xs text-[#0F172A] font-medium">
                            {emp.email || '—'}
                          </span>
                          <span className="block text-xs text-[#94A3B8]">
                            {emp.phone || '—'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#475569]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-[#0F172A]">
                            <Building2 className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>{emp.department_name || 'No Dept'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                            <Briefcase className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{emp.position_name || 'No Title'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#475569]">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                          {emp.employee_type_name || 'Regular'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-[#475569]">
                        {emp.manager_name ? (
                          <span className="text-xs font-medium text-[#0F172A]">
                            {emp.manager_name}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94A3B8]">None</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#475569] text-xs">
                        {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(emp.status)}</td>

                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/employees/${emp.employee_id}`)}
                            className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                            title="View Profile"
                            aria-label="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => navigate(`/employees/${emp.employee_id}/edit`)}
                              className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                              title="Edit Employee"
                              aria-label="Edit Employee"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
              <p className="text-xs text-[#64748B]">
                Showing <span className="font-semibold text-[#0F172A]">{employees.length}</span> of{' '}
                <span className="font-semibold text-[#0F172A]">{totalCount}</span> total employees
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#0F172A] font-medium px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
