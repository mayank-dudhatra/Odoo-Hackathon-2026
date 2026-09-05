export interface ScheduleDay {
  day_of_week: number; // 1 (Mon) - 7 (Sun)
  is_working_day: boolean;
  start_time?: string | null; // HH:MM or HH:MM:SS
  end_time?: string | null;
  break_minutes: number;
}

export interface WorkingSchedule {
  schedule_id: number;
  company_id: number;
  name: string;
  timezone: string;
  attendance_policy_id?: number | null;
  attendance_policy_name?: string | null;
  hours_per_week?: number;
  is_active: boolean;
  days?: ScheduleDay[];
  created_at: string;
  updated_at: string;
}

export interface CreateSchedulePayload {
  name: string;
  timezone?: string;
  attendance_policy_id?: number | null;
  is_active?: boolean;
  days: ScheduleDay[];
}

export interface AssignSchedulePayload {
  schedule_id?: number;
  employee_id?: number;
}
