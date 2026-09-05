export type WageType = 'MONTHLY' | 'HOURLY' | 'ANNUAL';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface Contract {
  contract_id: number;
  company_id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  employee_first_name?: string;
  employee_last_name?: string;
  department_id?: number | null;
  department_name?: string | null;
  position_id?: number | null;
  position_name?: string | null;
  position_title?: string | null;
  schedule_id?: number | null;
  schedule_name?: string | null;
  salary_structure_id: number;
  salary_structure_name?: string | null;
  wage: number;
  wage_type: WageType;
  start_date: string;
  end_date?: string | null;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateContractPayload {
  employee_id: number;
  department_id?: number | null;
  position_id?: number | null;
  schedule_id?: number | null;
  salary_structure_id: number;
  wage: number;
  wage_type: WageType;
  start_date: string;
  end_date?: string | null;
  status?: ContractStatus;
}

export interface EffectiveContract {
  contract_id: number;
  employee_id: number;
  salary_structure_id: number;
  wage: number;
  wage_type: WageType;
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  is_effective: boolean;
  department_name?: string;
  position_name?: string;
  salary_structure_name?: string;
}
