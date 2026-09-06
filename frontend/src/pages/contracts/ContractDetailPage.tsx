import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Calendar, DollarSign, Briefcase, Clock, Building2, User, Users, ExternalLink, Mail, Phone } from 'lucide-react';
import { contractsApi } from '../../api/contracts.api';
import type { Contract, ContractStatus } from '../../types/contracts';
import { Button } from '../../components/common/Button';
import { Badge, type BadgeVariant } from '../../components/common/Badge';
import { CardSkeleton, ErrorAlert } from '../../components/common/States';
import { ContractModal } from './ContractModal';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../hooks/useAuth';

export const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const canUpdate = isAdmin || checkPermission('CONTRACTS', 'UPDATE');

  const fetchContract = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await contractsApi.getContractById(Number(id));
      setContract(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load contract details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleStatusChange = async (newStatus: ContractStatus) => {
    if (!contract) return;
    try {
      await contractsApi.updateContractStatus(contract.contract_id, newStatus);
      fetchContract();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update contract status');
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] animate-pulse rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/contracts')}>
          Back to Contracts
        </Button>
        <ErrorAlert message={error || 'Contract not found'} onRetry={fetchContract} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/contracts')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Contracts
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                Contract #CNT-{contract.contract_id.toString().padStart(4, '0')}
              </h1>
              {getStatusBadge(contract.status)}
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Assigned Employee: {contract.employee_name || `${contract.employee_first_name || ''} ${contract.employee_last_name || ''}`} ({contract.employee_code})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUpdate && (
            <>
              <select
                value={contract.status}
                onChange={(e) => handleStatusChange(e.target.value as ContractStatus)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E2E8F0] rounded-md text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="EXPIRED">Expired</option>
                <option value="TERMINATED">Terminated</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={() => setEditOpen(true)}
              >
                Edit Contract
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Compensation */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">
            <DollarSign className="w-4 h-4 text-[#2563EB]" />
            Compensation
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {formatCurrency(contract.wage)}
          </div>
          <div className="text-xs text-[#64748B] mt-0.5 capitalize">
            Payment interval: {contract.wage_type?.toLowerCase() || 'monthly'}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Salary Structure:</span>
              <span className="font-medium text-[#0F172A]">{contract.salary_structure_name || 'Standard'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Period & Status */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">
            <Calendar className="w-4 h-4 text-[#2563EB]" />
            Contract Duration
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Start Date:</span>
              <span className="font-semibold text-[#0F172A]">{formatDate(contract.start_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">End Date:</span>
              <span className="font-semibold text-[#0F172A]">
                {contract.end_date ? formatDate(contract.end_date) : 'Indefinite / Permanent'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
              <span className="text-[#64748B]">Contract Status:</span>
              <span>{getStatusBadge(contract.status)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Organization & Assignment */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">
            <Briefcase className="w-4 h-4 text-[#2563EB]" />
            Organization & Shift
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2 text-[#0F172A]">
              <User className="w-4 h-4 text-[#64748B]" />
              <span className="font-medium">
                {contract.employee_name || `${contract.employee_first_name || ''} ${contract.employee_last_name || ''}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#475569]">
              <Building2 className="w-4 h-4 text-[#64748B]" />
              <span>{contract.department_name || 'No Department'}</span>
            </div>
            <div className="flex items-center gap-2 text-[#475569]">
              <Clock className="w-4 h-4 text-[#64748B]" />
              <span>{contract.schedule_name || 'Standard Working Schedule'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Employees / Users Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden mt-6">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Assigned Employees / Users under this Contract</h2>
              <p className="text-xs text-[#64748B]">
                List of all active user records holding this employment contract assignment.
              </p>
            </div>
          </div>
          <Badge variant="neutral">
            {contract.assigned_employees?.length || 0} Assigned
          </Badge>
        </div>

        {contract.assigned_employees && contract.assigned_employees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Department / Position</th>
                  <th className="py-3 px-4">Hire Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {contract.assigned_employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] font-bold text-xs flex items-center justify-center border border-blue-200 shrink-0">
                          {emp.employee_name?.[0] || 'E'}
                        </div>
                        <div>
                          <div className="font-semibold text-[#0F172A]">{emp.employee_name}</div>
                          <div className="text-xs text-[#64748B]">{emp.email || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#475569]">
                      {emp.employee_code || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#475569]">
                      {emp.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3 text-[#64748B]" />{emp.email}</div>}
                      {emp.phone && <div className="flex items-center gap-1 text-[#64748B]"><Phone className="w-3 h-3 text-[#64748B]" />{emp.phone}</div>}
                      {!emp.email && !emp.phone && '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#475569]">
                      <div className="font-medium text-[#0F172A]">{emp.department_name || '—'}</div>
                      <div className="text-xs text-[#64748B]">{emp.position_name || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] text-xs">
                      {emp.hire_date ? formatDate(emp.hire_date) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {emp.status || 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/employees/${emp.employee_id}`)}
                        rightIcon={<ExternalLink className="w-3 h-3" />}
                      >
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-[#64748B]">
            No employees currently assigned to this contract. This contract is created as a template for {contract.department_name ? `the ${contract.department_name} department` : 'the company'}. You can assign an employee when needed.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ContractModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchContract}
        contract={contract}
      />
    </div>
  );
};
export default ContractDetailPage;
