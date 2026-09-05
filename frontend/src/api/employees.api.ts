import { apiClient } from './client';
import type {
  Employee,
  CreateEmployeePayload,
  EmployeeQueryParams,
  EmployeeListResponse,
  EmployeeStatus,
} from '../types/organization';

async function requestWithOrgFallback<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T }> {
  try {
    return await apiClient<{ data: T }>(`/org${path}`, options);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
      return await apiClient<{ data: T }>(path, options);
    }
    throw err;
  }
}

export const employeesApi = {
  async getEmployees(params?: EmployeeQueryParams): Promise<EmployeeListResponse> {
    const query = new URLSearchParams();
    query.set('page', String(params?.page || 1));
    query.set('limit', String(params?.limit || 20));
    query.set('sortBy', params?.sortBy || 'created_at');
    query.set('sortOrder', params?.sortOrder || 'desc');

    if (params) {
      if (params.search) query.set('search', params.search);
      if (params.department_id) query.set('department_id', String(params.department_id));
      if (params.position_id) query.set('position_id', String(params.position_id));
      if (params.employee_type_id) query.set('employee_type_id', String(params.employee_type_id));
      if (params.status) query.set('status', params.status);
      if (params.manager_id) query.set('manager_id', String(params.manager_id));
    }

    const qs = query.toString();
    const endpoint = `/employees${qs ? `?${qs}` : ''}`;
    const res = await requestWithOrgFallback<EmployeeListResponse | Employee[]>(endpoint);
    
    // Normalize response if backend directly returned an array vs pagination object
    if (Array.isArray(res)) {
      const arr = res as Employee[];
      return {
        rows: arr,
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || arr.length,
          total: arr.length,
          total_pages: 1,
        },
      };
    }

    if (res && 'data' in res && Array.isArray(res.data)) {
      const arr = res.data as Employee[];
      return {
        rows: arr,
        pagination: {
          page: params?.page || 1,
          limit: params?.limit || arr.length,
          total: arr.length,
          total_pages: 1,
        },
      };
    }

    return (res.data as EmployeeListResponse) || {
      rows: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 1 },
    };
  },

  async getEmployee(id: number | string): Promise<Employee> {
    const res = await requestWithOrgFallback<Employee>(`/employees/${id}`);
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Employee;
  },

  async getMyEmployee(): Promise<Employee> {
    const res = await requestWithOrgFallback<Employee>('/employees/me');
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Employee;
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    const res = await requestWithOrgFallback<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Employee;
  },

  async updateEmployee(
    id: number | string,
    payload: Partial<CreateEmployeePayload>
  ): Promise<Employee> {
    try {
      const res = await requestWithOrgFallback<Employee>(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as Employee;
    } catch {
      const res = await requestWithOrgFallback<Employee>(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as Employee;
    }
  },

  async updateEmployeeStatus(id: number | string, status: EmployeeStatus): Promise<Employee> {
    const res = await requestWithOrgFallback<Employee>(`/employees/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Employee;
  },

  async deleteEmployee(id: number | string): Promise<void> {
    try {
      await requestWithOrgFallback<void>(`/employees/${id}`, {
        method: 'DELETE',
      });
    } catch {
      await this.updateEmployeeStatus(id, 'TERMINATED');
    }
  },
};
