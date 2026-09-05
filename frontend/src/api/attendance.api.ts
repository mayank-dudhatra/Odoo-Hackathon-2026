import { apiClient } from './client';
import type {
  AttendanceRecord,
  CheckInPayload,
  CheckOutPayload,
  AttendanceCorrectionPayload,
  AttendanceQueryFilters,
  AttendancePolicy,
} from '../types/attendance';

export const attendanceApi = {
  async listAttendance(filters?: AttendanceQueryFilters): Promise<AttendanceRecord[]> {
    const query = new URLSearchParams();
    if (filters) {
      if (filters.employee_id) query.set('employee_id', String(filters.employee_id));
      if (filters.work_date) query.set('work_date', filters.work_date);
      if (filters.start_date) query.set('start_date', filters.start_date);
      if (filters.end_date) query.set('end_date', filters.end_date);
      if (filters.department_id) query.set('department_id', String(filters.department_id));
      if (filters.status) query.set('status', filters.status);
      if (filters.late_status) query.set('late_status', filters.late_status);
      if (filters.deduction_type) query.set('deduction_type', filters.deduction_type);
      if (filters.page) query.set('page', String(filters.page));
      if (filters.limit) query.set('limit', String(filters.limit));
    }

    const qs = query.toString();
    const endpoint = `/attendance${qs ? `?${qs}` : ''}`;
    const res = await apiClient<any>(endpoint);
    if (Array.isArray(res)) return res;
    if (res && res.data) {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.data)) return res.data.data;
      if (Array.isArray(res.data.rows)) return res.data.rows;
      if (Array.isArray(res.data.records)) return res.data.records;
    }
    if (res && Array.isArray(res.records)) return res.records;
    if (res && Array.isArray(res.rows)) return res.rows;
    return [];
  },

  async getAttendance(id: number | string): Promise<AttendanceRecord> {
    const res = await apiClient<{ data: AttendanceRecord } | AttendanceRecord>(`/attendance/${id}`);
    if (res && 'data' in res && res.data) return res.data;
    return res as AttendanceRecord;
  },

  async checkIn(payload?: CheckInPayload): Promise<AttendanceRecord> {
    const res = await apiClient<{ data: AttendanceRecord } | AttendanceRecord>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as AttendanceRecord;
  },

  async checkOut(payload?: CheckOutPayload): Promise<AttendanceRecord> {
    const res = await apiClient<{ data: AttendanceRecord } | AttendanceRecord>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as AttendanceRecord;
  },

  async getOwnAttendance(filters?: AttendanceQueryFilters): Promise<AttendanceRecord[]> {
    const query = new URLSearchParams();
    if (filters?.work_date) query.set('work_date', filters.work_date);
    if (filters?.start_date) query.set('start_date', filters.start_date);
    if (filters?.end_date) query.set('end_date', filters.end_date);

    const qs = query.toString();
    const res = await apiClient<any>(`/attendance/me${qs ? `?${qs}` : ''}`);
    if (Array.isArray(res)) return res;
    if (res && res.data) {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.data.data)) return res.data.data;
      if (Array.isArray(res.data.rows)) return res.data.rows;
    }
    return [];
  },

  async getMyAttendance(filters?: AttendanceQueryFilters): Promise<AttendanceRecord[]> {
    return attendanceApi.getOwnAttendance(filters);
  },

  async getOwnAttendanceByDate(date: string): Promise<AttendanceRecord | null> {
    try {
      const res = await apiClient<{ data: AttendanceRecord } | AttendanceRecord>(`/attendance/me/${date}`);
      if (res && 'data' in res && res.data) return res.data;
      return (res as AttendanceRecord) || null;
    } catch {
      return null;
    }
  },

  async getMyAttendanceByDate(date: string): Promise<AttendanceRecord | null> {
    return attendanceApi.getOwnAttendanceByDate(date);
  },

  async correctAttendance(
    id: number | string,
    payload: AttendanceCorrectionPayload
  ): Promise<AttendanceRecord> {
    const res = await apiClient<{ data: AttendanceRecord } | AttendanceRecord>(`/attendance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as AttendanceRecord;
  },

  // Policies
  async listPolicies(params?: { is_active?: string | boolean }): Promise<AttendancePolicy[]> {
    const qs = params?.is_active !== undefined ? `?is_active=${params.is_active}` : '';
    const res = await apiClient<{ data: AttendancePolicy[] } | AttendancePolicy[]>(`/attendance-policies${qs}`);
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async createPolicy(payload: Partial<AttendancePolicy>): Promise<AttendancePolicy> {
    const res = await apiClient<{ data: AttendancePolicy } | AttendancePolicy>('/attendance-policies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as AttendancePolicy;
  },

  async updatePolicy(id: number | string, payload: Partial<AttendancePolicy>): Promise<AttendancePolicy> {
    const res = await apiClient<{ data: AttendancePolicy } | AttendancePolicy>(`/attendance-policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as AttendancePolicy;
  },

  async deletePolicy(id: number | string): Promise<void> {
    await apiClient<void>(`/attendance-policies/${id}`, {
      method: 'DELETE',
    });
  },
};
