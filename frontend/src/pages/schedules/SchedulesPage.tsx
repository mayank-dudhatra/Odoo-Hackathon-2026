import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { schedulesApi } from '../../api/schedules.api';
import type { WorkingSchedule } from '../../types/schedules';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TableSkeleton, ErrorAlert, EmptyState } from '../../components/common/States';
import { ScheduleModal } from './ScheduleModal';
import { useAuth } from '../../hooks/useAuth';

export const SchedulesPage: React.FC = () => {
  const { checkPermission, role } = useAuth();
  const isAdmin = role === 'Admin';
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('true');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkingSchedule | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreate = isAdmin || checkPermission('WORKING_SCHEDULES', 'CREATE');
  const canUpdate = isAdmin || checkPermission('WORKING_SCHEDULES', 'UPDATE');
  const canDelete = isAdmin || checkPermission('WORKING_SCHEDULES', 'DELETE');

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await schedulesApi.listSchedules({ is_active: statusFilter });
      setSchedules(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch schedules');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await schedulesApi.deleteSchedule(deleteId);
      setDeleteId(null);
      fetchSchedules();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEdit = (schedule: WorkingSchedule) => {
    setSelectedSchedule(schedule);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedSchedule(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Working Schedules</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage standard operating hours, weekly shifts, and working days.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'true' | 'false' | 'all')}
            aria-label="Filter by schedule status"
            className="px-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          >
            <option value="true">Active Schedules</option>
            <option value="false">Inactive / Archived</option>
            <option value="all">All Schedules</option>
          </select>
          {canCreate && (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
              New Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {error && <ErrorAlert message={error} onRetry={fetchSchedules} />}

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : schedules.length === 0 ? (
        <EmptyState
          title="No Working Schedules"
          description="Create your first company working schedule to begin assigning shifts to employees."
          actionLabel={canCreate ? 'Create Schedule' : undefined}
          onAction={canCreate ? handleCreate : undefined}
          icon={<Calendar className="w-8 h-8 text-[#2563EB]" />}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-4">Schedule Name</th>
                  <th className="py-3 px-4">Timezone</th>
                  <th className="py-3 px-4">Working Days</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {schedules.map((item) => {
                  const workingDaysCount = item.days?.filter((d) => d.is_working_day).length ?? 0;
                  return (
                    <tr key={item.schedule_id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-4 text-[#64748B]">
                        {item.timezone || 'UTC'}
                      </td>
                      <td className="py-3.5 px-4 text-[#0F172A]">
                        <span className="font-semibold">{workingDaysCount}</span> days / week
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={item.is_active ? 'success' : 'neutral'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="p-1 text-[#64748B] hover:text-[#2563EB] rounded-md hover:bg-[#F1F5F9] transition-colors"
                              title="Edit Schedule"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteId(item.schedule_id)}
                              className="p-1 text-[#64748B] hover:text-[#DC2626] rounded-md hover:bg-[#F1F5F9] transition-colors"
                              title="Deactivate Schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Create/Edit Modal */}
      <ScheduleModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSchedule(null);
        }}
        onSuccess={fetchSchedules}
        schedule={selectedSchedule}
      />

      {/* Delete/Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Deactivate Schedule"
        message="Are you sure you want to deactivate this working schedule? Existing active assignments will be affected."
        confirmLabel="Deactivate"
        isDestructive={true}
        isLoading={deleteLoading}
      />
    </div>
  );
};
export default SchedulesPage;
