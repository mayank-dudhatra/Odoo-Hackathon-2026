export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'LATE'
  | 'ON_LEAVE'
  | 'OVERTIME';

export type LateStatus = 'ON_TIME' | 'WITHIN_GRACE' | 'BEYOND_GRACE';
export type DeductionType = 'NONE' | 'HALF_DAY' | 'FULL_DAY';
export type PenaltyType = DeductionType;

export interface AttendanceRecord {
  attendance_id: number;
  company_id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  employee_first_name?: string;
  employee_last_name?: string;
  department_name?: string;
  position_name?: string;
  work_date: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  scheduled_break_minutes?: number;
  scheduled_hours?: number;
  check_in?: string | null;
  check_out?: string | null;
  hours_worked?: number;
  worked_hours?: number;
  late_minutes?: number;
  early_leave_minutes?: number;
  status: AttendanceStatus;
  late_status?: LateStatus;
  deduction_type?: DeductionType;
  deduction_days?: number;
  remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckInPayload {
  work_date?: string;
  check_in?: string;
  remarks?: string;
}

export interface CheckOutPayload {
  work_date?: string;
  check_out?: string;
  remarks?: string;
}

export interface AttendanceCorrectionPayload {
  check_in?: string | null;
  check_out?: string | null;
  status?: AttendanceStatus;
  deduction_type?: DeductionType;
  remarks?: string;
}

export interface AttendanceQueryFilters {
  employee_id?: number;
  work_date?: string;
  start_date?: string;
  end_date?: string;
  department_id?: number;
  status?: AttendanceStatus;
  late_status?: LateStatus;
  deduction_type?: DeductionType;
  page?: number;
  limit?: number;
}

export interface AttendancePolicy {
  policy_id: number;
  company_id: number;
  name: string;
  grace_period_minutes: number;
  grace_occurrences_allowed: number;
  grace_period_penalty: DeductionType;
  beyond_grace_penalty: DeductionType;
  early_leave_grace_minutes: number;
  early_leave_penalty: DeductionType;
  stack_deductions: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
