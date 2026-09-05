import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, FileText, Search } from 'lucide-react';
import { contractsApi } from '../../api/contracts.api';
import type { Contract, ContractStatus } from '../../types/contracts';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { ContractModal } from './ContractModal';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const ContractsPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreate = isAdmin || checkPermission('CONTRACTS', 'CREATE');
  const canUpdate = isAdmin || checkPermission('CONTRACTS', 'UPDATE');
  const canDelete = isAdmin || checkPermission('CONTRACTS', 'DELETE');

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contractsApi.listContracts({
        status: statusFilter !== 'ALL' ? (statusFilter as ContractStatus) : undefined,
      });
      setContracts(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch contracts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await contractsApi.deleteContract(deleteId);
      setDeleteId(null);
      fetchContracts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete contract');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const empName = (c.employee_name || `${c.employee_first_name || ''} ${c.employee_last_name || ''}`).toLowerCase();
    const empCode = (c.employee_code || '').toLowerCase();
    const dept = (c.department_name || '').toLowerCase();
    return empName.includes(term) || empCode.includes(term) || dept.includes(term);
  });

  const getStatusBadge = (status: ContractStatus) => {
    const map: Record<ContractStatus, { label: string; variant: BadgeVariant }> = {
      ACTIVE: { label: 'Active', variant: 'success' },
      DRAFT: { label: 'Draft', variant: 'warning' },
      EXPIRED: { label: 'Expired', variant: 'neutral' },
      TERMINATED: { label: 'Terminated', variant: 'danger' },
    };
    const s = map[status] || { label: status, variant: 'neutral' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Employment Contracts</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage compensation terms, wage structures, and active employment periods.
          </p>
        </div>
        {canCreate && (
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setSelectedContract(null);
              setModalOpen(true);
            }}
          >
            New Contract
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search employee or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#64748B]" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {error && <ErrorAlert message={error} onRetry={fetchContracts} />}

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          title="No Contracts Found"
          description="Create employment contracts to define compensation rates and attach salary structures."
          actionLabel={canCreate ? 'Create Contract' : undefined}
          onAction={canCreate ? () => setModalOpen(true) : undefined}
          icon={<FileText className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Contract Ref</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department / Position</th>
                  <th className="py-3 px-4">Wage & Type</th>
                  <th className="py-3 px-4">Salary Structure</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredContracts.map((c) => (
                  <tr key={c.contract_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#2563EB]">
                      <button
                        type="button"
                        onClick={() => navigate(`/contracts/${c.contract_id}`)}
                        className="hover:underline text-left"
                      >
                        CNT-{c.contract_id.toString().padStart(4, '0')}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      {c.employee_name && c.employee_name.trim() !== '' ? (
                        <>
                          <div>{c.employee_name}</div>
                          <div className="text-xs text-[#64748B] font-normal">{c.employee_code}</div>
                        </>
                      ) : (
                        <Badge variant="neutral">Unassigned / Template</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#475569]">
                      <div>{c.department_name || '—'}</div>
                      <div className="text-xs text-[#64748B]">{c.position_name || c.position_title || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      {formatCurrency(c.wage)}
                      <span className="text-xs text-[#64748B] font-normal ml-1">
                        / {c.wage_type?.toLowerCase() || 'month'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#475569]">
                      {c.salary_structure_name || 'Standard'}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] text-xs">
                      <div>From: {formatDate(c.start_date)}</div>
                      <div>To: {c.end_date ? formatDate(c.end_date) : 'Indefinite'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/contracts/${c.contract_id}`)}
                          className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                          title="View Contract Details & Assigned Employees"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContract(c);
                              setModalOpen(true);
                            }}
                            className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Edit Contract"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(c.contract_id)}
                            className="p-1 text-[#64748B] hover:text-[#DC2626] rounded-md hover:bg-[#F1F5F9] transition-colors"
                            title="Delete Contract"
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

      {/* Contract Modal */}
      <ContractModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedContract(null);
        }}
        onSuccess={fetchContracts}
        contract={selectedContract}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Contract"
        message="Are you sure you want to delete this employment contract record? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={deleteLoading}
      />
    </div>
  );
};
export default ContractsPage;
