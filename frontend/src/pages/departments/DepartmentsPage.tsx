import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Building2, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { DepartmentModal } from './DepartmentModal';
import { departmentsApi } from '../../api/departments.api';
import { employeesApi } from '../../api/employees.api';
import type { Department, Employee } from '../../types/organization';
import { useAuth } from '../../hooks/useAuth';

export const DepartmentsPage: React.FC = () => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const canCreate = isAdmin || checkPermission('DEPARTMENTS', 'CREATE');
  const canUpdate = isAdmin || checkPermission('DEPARTMENTS', 'UPDATE');
  const canDelete = isAdmin || checkPermission('DEPARTMENTS', 'DELETE');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);

  // Deactivate Confirm State
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [depList, empRes] = await Promise.all([
        departmentsApi.getDepartments(),
        employeesApi.getEmployees({ limit: 100 }).catch(() => ({ rows: [] })),
      ]);
      setDepartments(depList);
      setEmployees(empRes.rows || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch departments';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [depList, empRes] = await Promise.all([
          departmentsApi.getDepartments(),
          employeesApi.getEmployees({ limit: 100 }).catch(() => ({ rows: [] })),
        ]);
        if (active) {
          setDepartments(depList);
          setEmployees(empRes.rows || []);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch departments';
          setError(msg);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleCreate = () => {
    setDepartmentToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setDepartmentToEdit(dept);
    setIsModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setIsDeactivating(true);
    try {
      await departmentsApi.deleteDepartment(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate department';
      alert(msg);
    } finally {
      setIsDeactivating(false);
    }
  };

  const filteredDepartments = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.parent_department_name && d.parent_department_name.toLowerCase().includes(search.toLowerCase())) ||
    (d.manager_name && d.manager_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Departments</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Organize company business units, reporting hierarchy and team divisions
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={handleCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Add Department
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search departments by name or manager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {error ? (
          <div className="p-6">
            <ErrorAlert message={error} onRetry={fetchData} />
          </div>
        ) : isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No departments found"
              description={
                search
                  ? `No departments match "${search}". Try another keyword.`
                  : 'Start by creating the first department for your company.'
              }
              actionLabel={canCreate && !search ? 'Add Department' : undefined}
              onAction={canCreate && !search ? handleCreate : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Department Name</th>
                  <th className="py-3 px-4">Parent Department</th>
                  <th className="py-3 px-4">Department Head / Manager</th>
                  <th className="py-3 px-4">Status</th>
                  {(canUpdate || canDelete) && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.department_id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0F172A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold block">{dept.name}</span>
                          <span className="text-xs text-[#94A3B8]">ID: #{dept.department_id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">
                      {dept.parent_department_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                          {dept.parent_department_name}
                        </span>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">None (Top Level)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#475569]">
                      {dept.manager_name ? (
                        <span className="font-medium text-[#0F172A]">{dept.manager_name}</span>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={dept.is_active ? 'success' : 'neutral'}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleEdit(dept)}
                              className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                              title="Edit Department"
                              aria-label="Edit Department"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && dept.is_active && (
                            <button
                              type="button"
                              onClick={() => setDeactivateId(dept.department_id)}
                              className="p-1.5 rounded text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Deactivate Department"
                              aria-label="Deactivate Department"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <DepartmentModal
          key={departmentToEdit ? departmentToEdit.department_id : 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          departmentToEdit={departmentToEdit}
          departments={departments}
          employees={employees}
        />
      )}

      {/* Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deactivateId)}
        title="Deactivate Department"
        message="Are you sure you want to deactivate this department? Associated positions and records may be affected."
        confirmLabel="Deactivate"
        isDestructive={true}
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onClose={() => setDeactivateId(null)}
      />
    </div>
  );
};
