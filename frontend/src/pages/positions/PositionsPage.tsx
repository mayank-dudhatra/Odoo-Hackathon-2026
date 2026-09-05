import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Briefcase, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { PositionModal } from './PositionModal';
import { positionsApi } from '../../api/positions.api';
import { departmentsApi } from '../../api/departments.api';
import type { Position, Department } from '../../types/organization';
import { useAuth } from '../../hooks/useAuth';

export const PositionsPage: React.FC = () => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const canCreate = isAdmin || checkPermission('POSITIONS', 'CREATE');
  const canUpdate = isAdmin || checkPermission('POSITIONS', 'UPDATE');
  const canDelete = isAdmin || checkPermission('POSITIONS', 'DELETE');

  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('true');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [positionToEdit, setPositionToEdit] = useState<Position | null>(null);

  // Deactivate Confirm State
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [posList, deptList] = await Promise.all([
        positionsApi.getPositions({ is_active: statusFilter }),
        departmentsApi.getDepartments().catch(() => []),
      ]);
      setPositions(posList);
      setDepartments(deptList);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch positions';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setIsLoading(true);
        const [posList, deptList] = await Promise.all([
          positionsApi.getPositions({ is_active: statusFilter }),
          departmentsApi.getDepartments().catch(() => []),
        ]);
        if (active) {
          setPositions(posList);
          setDepartments(deptList);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch positions';
          setError(msg);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [statusFilter]);

  const handleCreate = () => {
    setPositionToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (pos: Position) => {
    setPositionToEdit(pos);
    setIsModalOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    setIsDeactivating(true);
    try {
      await positionsApi.deletePosition(deactivateId);
      setDeactivateId(null);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete position';
      alert(msg);
    } finally {
      setIsDeactivating(false);
    }
  };

  const filteredPositions = positions.filter((pos) => {
    const matchesSearch =
      pos.title.toLowerCase().includes(search.toLowerCase()) ||
      (pos.department_name && pos.department_name.toLowerCase().includes(search.toLowerCase()));
    const matchesDept = selectedDeptFilter ? String(pos.department_id) === selectedDeptFilter : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Job Positions</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Manage job roles, professional titles, and department alignments
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={handleCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Add Position
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search positions by title or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
          />
        </div>

        {departments.length > 0 && (
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            aria-label="Filter positions by department"
            className="w-full sm:w-48 px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={String(d.department_id)}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'true' | 'false' | 'all')}
          aria-label="Filter by position status"
          className="w-full sm:w-48 px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
        >
          <option value="true">Active Positions</option>
          <option value="false">Inactive / Archived</option>
          <option value="all">All Positions</option>
        </select>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        {error ? (
          <div className="p-6">
            <ErrorAlert message={error} onRetry={fetchData} />
          </div>
        ) : isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={4} />
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No job positions found"
              description={
                search || selectedDeptFilter
                  ? 'No positions match your search/filter criteria.'
                  : 'Start by creating standard job positions for your organization.'
              }
              actionLabel={canCreate && !search && !selectedDeptFilter ? 'Add Position' : undefined}
              onAction={canCreate && !search && !selectedDeptFilter ? handleCreate : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Position Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  {(canUpdate || canDelete) && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPositions.map((pos) => (
                  <tr key={pos.position_id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0F172A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold block">{pos.title}</span>
                          <span className="text-xs text-[#94A3B8]">ID: #{pos.position_id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">
                      {pos.department_name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                          {pos.department_name}
                        </span>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">General / Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={pos.is_active ? 'success' : 'neutral'}>
                        {pos.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleEdit(pos)}
                              className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                              title="Edit Position"
                              aria-label="Edit Position"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && pos.is_active && (
                            <button
                              type="button"
                              onClick={() => setDeactivateId(pos.position_id)}
                              className="p-1.5 rounded text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Deactivate Position"
                              aria-label="Deactivate Position"
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
        <PositionModal
          key={positionToEdit ? positionToEdit.position_id : 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          positionToEdit={positionToEdit}
          departments={departments}
        />
      )}

      {/* Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deactivateId)}
        title="Deactivate Job Position"
        message="Are you sure you want to deactivate this position? Existing employee records will retain their history."
        confirmLabel="Deactivate"
        isDestructive={true}
        isLoading={isDeactivating}
        onConfirm={handleDeactivate}
        onClose={() => setDeactivateId(null)}
      />
    </div>
  );
};
