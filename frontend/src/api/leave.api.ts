import { apiClient } from './client';
import type {
  LeaveType,
  LeaveAllocation,
  LeaveBalance,
  LeaveRequest,
  CreateLeaveTypePayload,
  CreateAllocationPayload,
  CreateLeaveRequestPayload,
} from '../types/leave';

export const leaveApi = {
  // Types
  async listLeaveTypes(): Promise<LeaveType[]> {
    const res = await apiClient<{ data: LeaveType[] } | LeaveType[]>('/leave-types');
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async createLeaveType(payload: CreateLeaveTypePayload): Promise<LeaveType> {
    const res = await apiClient<{ data: LeaveType } | LeaveType>('/leave-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as LeaveType;
  },

  async updateLeaveType(id: number | string, payload: Partial<CreateLeaveTypePayload>): Promise<LeaveType> {
    const res = await apiClient<{ data: LeaveType } | LeaveType>(`/leave-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as LeaveType;
  },

  async deleteLeaveType(id: number | string): Promise<void> {
    await apiClient<void>(`/leave-types/${id}`, {
      method: 'DELETE',
    });
  },

  // Allocations
  async listAllocations(): Promise<LeaveAllocation[]> {
    const res = await apiClient<{ data: LeaveAllocation[] } | LeaveAllocation[]>('/leave-allocations');
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async createAllocation(payload: CreateAllocationPayload): Promise<LeaveAllocation> {
    const res = await apiClient<{ data: LeaveAllocation } | LeaveAllocation>('/leave-allocations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as LeaveAllocation;
  },

  // Balances
  async getOwnLeaveBalances(): Promise<LeaveBalance[]> {
    const res = await apiClient<any>('/leave-balances/my');
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.balances)) return res.data.balances;
      if (Array.isArray(res.balances)) return res.balances;
    }
    return [];
  },

  async getEmployeeLeaveBalances(employeeId: number | string): Promise<LeaveBalance[]> {
    const res = await apiClient<any>(`/employees/${employeeId}/leave-balances`);
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.balances)) return res.data.balances;
      if (Array.isArray(res.balances)) return res.balances;
    }
    return [];
  },

  // Requests
  async listLeaveRequests(): Promise<LeaveRequest[]> {
    const res = await apiClient<{ data: LeaveRequest[] } | LeaveRequest[]>('/leave-requests');
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async getOwnLeaveRequests(): Promise<LeaveRequest[]> {
    const res = await apiClient<{ data: LeaveRequest[] } | LeaveRequest[]>('/leave-requests/my');
    if (Array.isArray(res)) return res;
    if (res && 'data' in res && Array.isArray(res.data)) return res.data;
    return [];
  },

  async createLeaveRequest(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    const res = await apiClient<{ data: LeaveRequest } | LeaveRequest>('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as LeaveRequest;
  },

  async approveLeaveRequest(id: number | string, remarks?: string | { comments?: string }): Promise<LeaveRequest> {
    const remarksStr = typeof remarks === 'object' && remarks !== null ? remarks.comments : remarks;
    const res = await apiClient<{ data: LeaveRequest } | LeaveRequest>(`/leave-requests/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks: remarksStr || 'Approved' }),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as LeaveRequest;
  },

  async refuseLeaveRequest(id: number | string, remarks?: string | { comments?: string }): Promise<LeaveRequest> {
    const remarksStr = typeof remarks === 'object' && remarks !== null ? remarks.comments : remarks;
    const res = await apiClient<{ data: LeaveRequest } | LeaveRequest>(`/leave-requests/${id}/refuse`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks: remarksStr || 'Refused' }),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as LeaveRequest;
  },

  async rejectLeaveRequest(id: number | string, remarks?: string | { comments?: string }): Promise<LeaveRequest> {
    return this.refuseLeaveRequest(id, remarks);
  },

  async cancelLeaveRequest(id: number | string): Promise<LeaveRequest> {
    const res = await apiClient<{ data: LeaveRequest } | LeaveRequest>(`/leave-requests/${id}/cancel`, {
      method: 'PATCH',
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as LeaveRequest;
  },
};
