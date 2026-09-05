import { apiClient } from './client';
import type {
  Contract,
  CreateContractPayload,
  EffectiveContract,
} from '../types/contracts';

export const contractsApi = {
  async listContracts(params?: { status?: string; employee_id?: number | string }): Promise<Contract[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.employee_id) query.append('employee_id', String(params.employee_id));
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await apiClient<{ data: Contract[] } | Contract[]>(`/contracts${qs}`);
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async getContract(id: number | string): Promise<Contract> {
    const res = await apiClient<{ data: Contract } | Contract>(`/contracts/${id}`);
    if (res && 'data' in res && res.data) return res.data;
    return res as Contract;
  },

  async getContractById(id: number | string): Promise<Contract> {
    return this.getContract(id);
  },

  async createContract(payload: CreateContractPayload): Promise<Contract> {
    const res = await apiClient<{ data: Contract } | Contract>('/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as Contract;
  },

  async updateContract(
    id: number | string,
    payload: Partial<CreateContractPayload>
  ): Promise<Contract> {
    const res = await apiClient<{ data: Contract } | Contract>(`/contracts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as Contract;
  },

  async updateContractStatus(
    id: number | string,
    status: string
  ): Promise<Contract> {
    return this.updateContract(id, { status: status as any });
  },

  async terminateContract(id: number | string): Promise<void> {
    await apiClient<void>(`/contracts/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteContract(id: number | string): Promise<void> {
    return this.terminateContract(id);
  },

  async getEffectiveContract(
    employeeId: number | string,
    date?: string
  ): Promise<EffectiveContract | null> {
    try {
      const endpoint = `/employees/${employeeId}/effective-contract${date ? `?date=${date}` : ''}`;
      const res = await apiClient<{ data: EffectiveContract } | EffectiveContract>(endpoint);
      if (res && 'data' in res && res.data) return res.data;
      return (res as EffectiveContract) || null;
    } catch {
      return null;
    }
  },

  async getEffectiveSchedule(
    employeeId: number | string,
    date?: string
  ): Promise<unknown> {
    try {
      const endpoint = `/employees/${employeeId}/effective-schedule${date ? `?date=${date}` : ''}`;
      const res = await apiClient<{ data: unknown }>(endpoint);
      if (res && 'data' in res && res.data) return res.data;
      return res;
    } catch {
      return null;
    }
  },
};
