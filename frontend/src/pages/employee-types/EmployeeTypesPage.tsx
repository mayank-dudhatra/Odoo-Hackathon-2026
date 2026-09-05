import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Layers, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { TableSkeleton, EmptyState, ErrorAlert } from '../../components/common/States';
import { EmployeeTypeModal } from './EmployeeTypeModal';
import { employeeTypesApi } from '../../api/employeeTypes.api';
import type { EmployeeType } from '../../types/organization';
import { useAuth } from '../../hooks/useAuth';

export const EmployeeTypesPage: React.FC = () => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const canCreate = isAdmin || checkPermission('EMPLOYEE_TYPES', 'CREATE');
  const canUpdate = isAdmin || checkPermission('EMPLOYEE_TYPES', 'UPDATE');
  const canDelete = isAdmin || checkPermission('EMPLOYEE_TYPES', 'DELETE');

  const [types, setTypes] = useState<EmployeeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('true');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [typeToEdit, setTypeToEdit] = useState<EmployeeType | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const list = await employeeTypesApi.getEmployeeTypes({ is_active: statusFilter });
      setTypes(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch employee types';
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
        const list = await employeeTypesApi.getEmployeeTypes({ is_active: statusFilter });
        if (active) setTypes(list);
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch employee types';
          setError(msg);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [statusFilter]);

  const handleCreate = () => {
    setTypeToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (t: EmployeeType) => {
    setTypeToEdit(t);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (t: EmployeeType) => {
    try {
      await employeeTypesApi.setEmployeeTypeStatus(t.employee_type_id, !t.is_active);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change employee type status';
      alert(msg);
    }
  };

  const filteredTypes = types.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Employee Types</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Configure employment classifications such as Full-Time, Part-Time, or Contractor
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={handleCreate} leftIcon={<Plus className="w-4 h-4" />}>
            Add Employee Type
          </Button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee classifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors"
          />
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'true' | 'false' | 'all')}
            aria-label="Filter by employee type status"
            className="w-full sm:w-48 px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          >
            <option value="true">Active Types</option>
            <option value="false">Inactive / Archived</option>
            <option value="all">All Employee Types</option>
          </select>
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
            <TableSkeleton rows={4} cols={3} />
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No employee types found"
              description={
                search
                  ? `No employment classifications match "${search}".`
                  : 'Create standard employee types for contract and policy binding.'
              }
              actionLabel={canCreate && !search ? 'Add Employee Type' : undefined}
              onAction={canCreate && !search ? handleCreate : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Classification Name</th>
                  <th className="py-3 px-4">Status</th>
                  {(canUpdate || canDelete) && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredTypes.map((t) => (
                  <tr key={t.employee_type_id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#0F172A]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold block">{t.name}</span>
                          <span className="text-xs text-[#94A3B8]">ID: #{t.employee_type_id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={t.is_active ? 'success' : 'neutral'}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleEdit(t)}
                              className="p-1.5 rounded text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 transition-colors"
                              title="Edit Type"
                              aria-label="Edit Type"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              className={`p-1.5 rounded transition-colors ${
                                t.is_active
                                  ? 'text-[#64748B] hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-[#64748B] hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={t.is_active ? 'Deactivate Type' : 'Activate Type'}
                              aria-label={t.is_active ? 'Deactivate Type' : 'Activate Type'}
                            >
                              {t.is_active ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
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
        <EmployeeTypeModal
          key={typeToEdit ? typeToEdit.employee_type_id : 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchData}
          typeToEdit={typeToEdit}
        />
      )}
    </div>
  );
};
