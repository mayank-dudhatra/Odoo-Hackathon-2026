export type PayrunStatus = 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID';
export type PayslipStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
export type EmailStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Payrun {
  payrun_id: number;
  company_id: number;
  name: string;
  salary_structure_id: number;
  salary_structure_name?: string;
  period_start: string;
  period_end: string;
  status: PayrunStatus;
  total_gross?: number;
  total_deductions?: number;
  total_net?: number;
  employee_count?: number;
  computed_at?: string | null;
  validated_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrunEmployee {
  payrun_employee_id: number;
  payrun_id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  department_name?: string;
  position_name?: string;
  contract_id?: number;
  gross_pay?: number;
  total_deductions?: number;
  net_pay?: number;
  warnings?: string[];
  errors?: string[];
  status?: string;
}

export interface PayslipLine {
  payslip_line_id: number;
  payslip_id: number;
  rule_id?: number;
  rule_code: string;
  rule_name: string;
  category: string;
  sequence: number;
  amount: number;
}

export interface Payslip {
  payslip_id: number;
  company_id: number;
  payrun_id: number;
  payrun_name?: string;
  employee_id: number;
  employee_code?: string;
  employee_code_snapshot?: string;
  employee_name?: string;
  first_name_snapshot?: string;
  last_name_snapshot?: string;
  email_snapshot?: string;
  department_name_snapshot?: string;
  position_name_snapshot?: string;
  salary_structure_name_snapshot?: string;
  contract_id?: number;
  wage_snapshot?: number;
  wage_type_snapshot?: string;
  period_start: string;
  period_end: string;
  status: PayslipStatus;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  email_status?: EmailStatus;
  email_sent_at?: string | null;
  email_error?: string | null;
  lines?: PayslipLine[];
  created_at: string;
  updated_at: string;
}

export interface CreatePayrunPayload {
  name: string;
  salary_structure_id: number;
  period_start: string;
  period_end: string;
}
