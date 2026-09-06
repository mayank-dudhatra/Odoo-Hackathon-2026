export type LeaveUnit = 'DAYS' | 'HOURS';
export type AllocationStatus = 'DRAFT' | 'APPROVED' | 'EXPIRED' | 'CANCELLED';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REFUSED' | 'CANCELLED';

export interface LeaveType {
  leave_type_id: number;
  company_id: number;
  name: string;
  unit: LeaveUnit;
  requires_allocation: boolean;
  is_paid: boolean;
  default_days_year: number;
  approval_required: boolean;
  payroll_integration: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveAllocation {
  allocation_id: number;
  company_id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  year: number;
  allocated_days: number;
  used_days?: number;
  remaining_days?: number;
  valid_from?: string | null;
  valid_to?: string | null;
  status: AllocationStatus;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  is_paid: boolean;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
}

export interface LeaveRequest {
  leave_request_id: number;
  request_id?: number;
  company_id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  leave_type_id: number;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string | null;
  status: LeaveRequestStatus;
  approved_by?: number | null;
  approver_name?: string | null;
  approval_remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveTypePayload {
  name: string;
  unit?: LeaveUnit;
  requires_allocation?: boolean;
  is_paid?: boolean;
  default_days_year?: number;
  approval_required?: boolean;
  payroll_integration?: boolean;
  is_active?: boolean;
}

export interface CreateAllocationPayload {
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated_days: number;
  valid_from?: string | null;
  valid_to?: string | null;
  status?: AllocationStatus;
}

export interface CreateLeaveRequestPayload {
  leave_type_id: number;
  employee_id?: number | null;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string | null;
}
