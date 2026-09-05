import { apiClient, getStoredAccessToken } from './client';
import type { Payrun, PayrunEmployee, Payslip, CreatePayrunPayload } from '../types/payroll';

function extractData<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && res.data !== undefined) {
    return res.data;
  }
  return res as T;
}

export const payrollApi = {
  // Payruns
  listPayruns: async (params?: {
    status?: string;
    salary_structure_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<Payrun[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.salary_structure_id) query.set('salary_structure_id', String(params.salary_structure_id));
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    const qs = query.toString();
    const res = await apiClient<any>(`/payruns${qs ? `?${qs}` : ''}`);
    return extractData<Payrun[]>(res) || [];
  },

  getPayrunById: async (id: number): Promise<Payrun> => {
    const res = await apiClient<any>(`/payruns/${id}`);
    return extractData<Payrun>(res);
  },

  createPayrun: async (payload: CreatePayrunPayload): Promise<Payrun> => {
    const res = await apiClient<any>('/payruns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return extractData<Payrun>(res);
  },

  updatePayrun: async (id: number, payload: Partial<CreatePayrunPayload>): Promise<Payrun> => {
    const res = await apiClient<any>(`/payruns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return extractData<Payrun>(res);
  },

  computePayrun: async (id: number): Promise<Payrun> => {
    const res = await apiClient<any>(`/payruns/${id}/compute`, {
      method: 'POST',
    });
    return extractData<Payrun>(res);
  },

  validatePayrun: async (id: number): Promise<Payrun> => {
    const res = await apiClient<any>(`/payruns/${id}/validate`, {
      method: 'POST',
    });
    return extractData<Payrun>(res);
  },

  payPayrun: async (id: number): Promise<Payrun> => {
    const res = await apiClient<any>(`/payruns/${id}/pay`, {
      method: 'POST',
    });
    return extractData<Payrun>(res);
  },

  getPayrunEmployees: async (id: number): Promise<PayrunEmployee[]> => {
    const res = await apiClient<any>(`/payruns/${id}/employees`);
    return extractData<PayrunEmployee[]>(res) || [];
  },

  getPayrunEmployeeById: async (id: number, employeeId: number): Promise<PayrunEmployee> => {
    const res = await apiClient<any>(`/payruns/${id}/employees/${employeeId}`);
    return extractData<PayrunEmployee>(res);
  },

  getPayrunPayslips: async (id: number): Promise<Payslip[]> => {
    const res = await apiClient<any>(`/payruns/${id}/payslips`);
    return extractData<Payslip[]>(res) || [];
  },

  generatePayrunPayslips: async (payrunId: number): Promise<{ count: number; payslips: Payslip[] }> => {
    const res = await apiClient<any>(`/payruns/${payrunId}/payslips/generate`, {
      method: 'POST',
    });
    return extractData<{ count: number; payslips: Payslip[] }>(res);
  },

  bulkEmailPayslips: async (payrunId: number): Promise<{ total: number; sent: number; failed: number }> => {
    const res = await apiClient<any>(`/payruns/${payrunId}/payslips/email`, {
      method: 'POST',
    });
    return extractData<{ total: number; sent: number; failed: number }>(res);
  },

  // Payslips
  listPayslips: async (params?: {
    payrun_id?: number;
    employee_id?: number;
    status?: string;
    email_status?: string;
  }): Promise<Payslip[]> => {
    const query = new URLSearchParams();
    if (params?.payrun_id) query.set('payrun_id', String(params.payrun_id));
    if (params?.employee_id) query.set('employee_id', String(params.employee_id));
    if (params?.status) query.set('status', params.status);
    if (params?.email_status) query.set('email_status', params.email_status);
    const qs = query.toString();
    const res = await apiClient<any>(`/payslips${qs ? `?${qs}` : ''}`);
    return extractData<Payslip[]>(res) || [];
  },

  getOwnPayslips: async (): Promise<Payslip[]> => {
    const res = await apiClient<any>('/payslips/my');
    return extractData<Payslip[]>(res) || [];
  },

  getPayslipById: async (id: number): Promise<Payslip> => {
    const res = await apiClient<any>(`/payslips/${id}`);
    return extractData<Payslip>(res);
  },

  getMyPayslips: async (): Promise<Payslip[]> => {
    const res = await apiClient<any>('/payslips/my');
    return extractData<Payslip[]>(res) || [];
  },

  getEmployeePayslips: async (employeeId: number): Promise<Payslip[]> => {
    const res = await apiClient<any>(`/employees/${employeeId}/payslips`);
    return extractData<Payslip[]>(res) || [];
  },

  getPayslipPdfUrl: (id: number): string => {
    return `/api/payslips/${id}/pdf`;
  },

  downloadPayslipPdf: async (id: number, filename?: string): Promise<void> => {
    const token = getStoredAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/payslips/${id}/pdf`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to download PDF (status: ${response.status})`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `payslip_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  sendSinglePayslipEmail: async (id: number): Promise<any> => {
    const res = await apiClient<any>(`/payslips/${id}/email`, {
      method: 'POST',
    });
    return extractData<any>(res);
  },

  retryPayslipEmail: async (id: number): Promise<any> => {
    const res = await apiClient<any>(`/payslips/${id}/email/retry`, {
      method: 'POST',
    });
    return extractData<any>(res);
  },
};
