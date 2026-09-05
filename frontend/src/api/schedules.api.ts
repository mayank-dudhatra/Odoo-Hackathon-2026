import { apiClient } from './client';
import type {
  WorkingSchedule,
  CreateSchedulePayload,
  AssignSchedulePayload,
} from '../types/schedules';

export const schedulesApi = {
  async listSchedules(params?: { is_active?: string | boolean }): Promise<WorkingSchedule[]> {
    const qs = params?.is_active !== undefined ? `?is_active=${params.is_active}` : '';
    const res = await apiClient<{ data: WorkingSchedule[] } | WorkingSchedule[]>(`/working-schedules${qs}`);
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async getSchedule(id: number | string): Promise<WorkingSchedule> {
    const res = await apiClient<{ data: WorkingSchedule } | WorkingSchedule>(`/working-schedules/${id}`);
    if (res && 'data' in res && res.data) return res.data;
    return res as WorkingSchedule;
  },

  async createSchedule(payload: CreateSchedulePayload): Promise<WorkingSchedule> {
    const res = await apiClient<{ data: WorkingSchedule } | WorkingSchedule>('/working-schedules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as WorkingSchedule;
  },

  async updateSchedule(
    id: number | string,
    payload: Partial<CreateSchedulePayload>
  ): Promise<WorkingSchedule> {
    const res = await apiClient<{ data: WorkingSchedule } | WorkingSchedule>(`/working-schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as WorkingSchedule;
  },

  async deleteSchedule(id: number | string): Promise<void> {
    await apiClient<void>(`/working-schedules/${id}`, {
      method: 'DELETE',
    });
  },

  async assignEmployeeSchedule(
    employeeId: number | string,
    payload: AssignSchedulePayload
  ): Promise<void> {
    await apiClient<void>(`/working-schedules/employees/${employeeId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getEffectiveSchedule(
    employeeId: number | string,
    date?: string
  ): Promise<WorkingSchedule> {
    const res = await apiClient<{ data: WorkingSchedule } | WorkingSchedule>(
      `/employees/${employeeId}/effective-schedule${date ? `?date=${date}` : ''}`
    );
    if (res && 'data' in res && res.data) return res.data;
    return res as WorkingSchedule;
  },
};
