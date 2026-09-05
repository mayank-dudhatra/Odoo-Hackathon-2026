export type SalaryRuleCategory =
  | 'BASIC'
  | 'ALLOWANCE'
  | 'GROSS'
  | 'DEDUCTION'
  | 'TAX'
  | 'CONTRIBUTION'
  | 'NET'
  | 'REIMBURSEMENT';

export type ComputationType = 'FIXED' | 'PERCENTAGE' | 'FORMULA';

export interface SalaryRule {
  rule_id: number;
  company_id: number;
  name: string;
  code: string;
  category: SalaryRuleCategory;
  computation_type: ComputationType;
  amount?: number | null;
  percentage_of?: string | null;
  percentage_value?: number | null;
  formula?: string | null;
  sequence?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StructureRule {
  structure_rule_id: number;
  salary_structure_id: number;
  rule_id: number;
  sequence: number;
  is_active: boolean;
  rule?: SalaryRule;
  name?: string;
  code?: string;
  category?: SalaryRuleCategory;
  computation_type?: ComputationType;
}

export interface SalaryStructure {
  salary_structure_id: number;
  company_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  rules_count?: number;
  rules?: StructureRule[];
  created_at: string;
  updated_at: string;
}

export interface CreateSalaryStructurePayload {
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CreateSalaryRulePayload {
  name: string;
  code: string;
  category: SalaryRuleCategory;
  computation_type: ComputationType;
  amount?: number | null;
  percentage_of?: string | null;
  percentage_value?: number | null;
  formula?: string | null;
  is_active?: boolean;
}

export interface AddStructureRulePayload {
  rule_id: number;
  sequence: number;
  is_active?: boolean;
}

export interface SalaryCalculationPreviewResult {
  employee_id: number;
  gross: number;
  deductions: number;
  net: number;
  lines: Array<{
    code: string;
    name: string;
    category: SalaryRuleCategory;
    amount: number;
  }>;
}
