import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Sliders, Layers } from 'lucide-react';
import { salaryApi } from '../../api/salary.api';
import type { SalaryStructure } from '../../types/salary';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { StructureModal } from './StructureModal';
import { StructureRulesModal } from './StructureRulesModal';
import { useAuth } from '../../hooks/useAuth';

export const SalaryStructuresPage: React.FC = () => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);

  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [configuringStructure, setConfiguringStructure] = useState<SalaryStructure | null>(null);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreate = isAdmin || checkPermission('SALARY_STRUCTURES', 'CREATE');
  const canUpdate = isAdmin || checkPermission('SALARY_STRUCTURES', 'UPDATE');
  const canDelete = isAdmin || checkPermission('SALARY_STRUCTURES', 'DELETE');

  const fetchStructures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await salaryApi.listStructures();
      setStructures(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch salary structures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await salaryApi.deleteStructure(deleteId);
      setDeleteId(null);
      fetchStructures();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to deactivate salary structure');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Salary Structures</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Build and manage reusable compensation templates and rule calculation sequences.
          </p>
        </div>

        {canCreate && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setSelectedStructure(null);
              setModalOpen(true);
            }}
          >
            New Structure
          </Button>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchStructures} />}

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : structures.length === 0 ? (
        <EmptyState
          title="No Salary Structures Found"
          description="Create salary structures to define compensation components like Basic, HRA, Allowances, and Deductions."
          actionLabel={canCreate ? 'Create Structure' : undefined}
          onAction={() => {
            setSelectedStructure(null);
            setModalOpen(true);
          }}
          icon={<Layers className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Structure Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {structures.map((s) => (
                  <tr key={s.salary_structure_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      {s.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] max-w-sm truncate">
                      {s.description || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={s.is_active ? 'success' : 'neutral'}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canUpdate && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Sliders className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setConfiguringStructure(s);
                              setRulesModalOpen(true);
                            }}
                            className="mr-1"
                          >
                            Rules
                          </Button>
                        )}
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStructure(s);
                              setModalOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Edit Structure"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(s.salary_structure_id)}
                            className="p-1.5 text-[#64748B] hover:text-[#DC2626] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Deactivate Structure"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Structure Modal */}
      <StructureModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedStructure(null);
        }}
        onSuccess={fetchStructures}
        structure={selectedStructure}
      />

      {/* Rules Configuration Modal */}
      <StructureRulesModal
        isOpen={rulesModalOpen}
        onClose={() => {
          setRulesModalOpen(false);
          setConfiguringStructure(null);
        }}
        structure={configuringStructure}
        onSuccess={fetchStructures}
      />

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Deactivate Salary Structure"
        message="Are you sure you want to deactivate this salary structure? Active contracts referencing this structure will retain it until modified."
        confirmLabel="Deactivate"
        isDestructive={true}
        isLoading={deleteLoading}
      />
    </div>
  );
};
export default SalaryStructuresPage;
