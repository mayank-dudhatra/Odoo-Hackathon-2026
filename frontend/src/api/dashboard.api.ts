import { apiClient } from './client';

export interface PayrollDashboardMetrics {
  total_payruns: number;
  draft_payruns: number;
  approved_payruns: number;
  paid_payruns: number;
  total_gross: number | string;
  total_net: number | string;
  total_deductions: number | string;
  total_tax: number | string;
  total_payslips: number;
}

export interface HrDashboardMetrics {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  terminated_employees: number;
  department_distribution?: Array<{ department_id: number; department_name: string; employee_count: number }>;
}

export interface AttendanceHealthMetrics {
  total_expected: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  half_day_count: number;
}

export interface TimeOffMetrics {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
}

export interface OverallDashboardData {
  payroll: PayrollDashboardMetrics;
  hr: HrDashboardMetrics;
  time_off: TimeOffMetrics;
  attendance_health: AttendanceHealthMetrics;
  costs?: {
    by_department?: Array<{ department_name: string; total_cost: number | string }>;
  };
  warnings?: Array<{ id: string; type: string; message: string; severity: string }>;
}

export const dashboardApi = {
  async getOverallDashboard(): Promise<OverallDashboardData> {
    const res = await apiClient<{ data: OverallDashboardData } | OverallDashboardData>('/dashboard/overall');
    if (res && 'data' in res && res.data) return res.data;
    return res as OverallDashboardData;
  },

  async getPayrollDashboard(): Promise<PayrollDashboardMetrics> {
    const res = await apiClient<{ data: PayrollDashboardMetrics } | PayrollDashboardMetrics>('/dashboard/payroll');
    if (res && 'data' in res && res.data) return res.data;
    return res as PayrollDashboardMetrics;
  },

  async getHrDashboard(): Promise<HrDashboardMetrics> {
    const res = await apiClient<{ data: HrDashboardMetrics } | HrDashboardMetrics>('/dashboard/hr');
    if (res && 'data' in res && res.data) return res.data;
    return res as HrDashboardMetrics;
  },

  async getAttendanceDashboard(): Promise<AttendanceHealthMetrics> {
    const res = await apiClient<{ data: AttendanceHealthMetrics } | AttendanceHealthMetrics>('/dashboard/attendance');
    if (res && 'data' in res && res.data) return res.data;
    return res as AttendanceHealthMetrics;
  },

  async getTimeOffDashboard(): Promise<TimeOffMetrics> {
    const res = await apiClient<{ data: TimeOffMetrics } | TimeOffMetrics>('/dashboard/time-off');
    if (res && 'data' in res && res.data) return res.data;
    return res as TimeOffMetrics;
  },

  async getWarnings(): Promise<Array<{ id: string; type: string; message: string; severity: string }>> {
    const res = await apiClient<{ data: any } | any>('/dashboard/warnings');
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    if (Array.isArray(res)) return res;
    return [];
  },
};
