export interface Department {
  department_id: number;
  company_id: number;
  name: string;
  parent_department_id: number | null;
  parent_department_name: string | null;
  manager_id: number | null;
  manager_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentPayload {
  name: string;
  parent_department_id?: number | null;
  manager_id?: number | null;
  is_active?: boolean;
}

export interface Position {
  position_id: number;
  company_id: number;
  title: string;
  department_id: number | null;
  department_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePositionPayload {
  title: string;
  department_id?: number | null;
  is_active?: boolean;
}

export interface EmployeeType {
  employee_type_id: number;
  company_id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeTypePayload {
  name: string;
  is_active?: boolean;
}

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export interface Employee {
  employee_id: number;
  company_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  hire_date: string;
  department_id: number | null;
  department_name: string | null;
  position_id: number | null;
  position_name: string | null;
  employee_type_id: number | null;
  employee_type_name: string | null;
  schedule_id: number | null;
  schedule_name: string | null;
  manager_id: number | null;
  manager_name: string | null;
  status: EmployeeStatus;
  created_by?: number;
  created_by_username?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeePayload {
  employee_code: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  address?: string | null;
  hire_date: string;
  department_id?: number | null;
  position_id?: number | null;
  employee_type_id?: number | null;
  schedule_id?: number | null;
  manager_id?: number | null;
  status?: EmployeeStatus;
}

export interface EmployeeQueryParams {
  search?: string;
  department_id?: number;
  position_id?: number;
  employee_type_id?: number;
  status?: EmployeeStatus;
  manager_id?: number;
  page?: number;
  limit?: number;
  sortBy?: 'employee_code' | 'first_name' | 'last_name' | 'email' | 'hire_date' | 'status' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeListResponse {
  rows: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
