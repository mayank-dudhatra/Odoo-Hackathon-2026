import { apiClient } from './client';
import type {
  SalaryStructure,
  SalaryRule,
  CreateSalaryStructurePayload,
  CreateSalaryRulePayload,
  AddStructureRulePayload,
  StructureRule,
  SalaryCalculationPreviewResult,
} from '../types/salary';

function extractData<T>(res: any): T {
  if (res && typeof res === 'object' && 'data' in res && res.data !== undefined) {
    return res.data;
  }
  return res as T;
}

export const salaryApi = {
  // Structures
  listStructures: async (params?: { is_active?: boolean }): Promise<SalaryStructure[]> => {
    const qs = params?.is_active !== undefined ? `?is_active=${params.is_active}` : '';
    const res = await apiClient<any>(`/salary-structures${qs}`);
    return extractData<SalaryStructure[]>(res) || [];
  },

  getStructureById: async (id: number): Promise<SalaryStructure> => {
    const res = await apiClient<any>(`/salary-structures/${id}`);
    return extractData<SalaryStructure>(res);
  },

  createStructure: async (payload: CreateSalaryStructurePayload): Promise<SalaryStructure> => {
    const res = await apiClient<any>('/salary-structures', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return extractData<SalaryStructure>(res);
  },

  updateStructure: async (id: number, payload: Partial<CreateSalaryStructurePayload>): Promise<SalaryStructure> => {
    const res = await apiClient<any>(`/salary-structures/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return extractData<SalaryStructure>(res);
  },

  deleteStructure: async (id: number): Promise<void> => {
    await apiClient<void>(`/salary-structures/${id}`, {
      method: 'DELETE',
    });
  },

  // Structure Rules
  addRuleToStructure: async (structureId: number, payload: AddStructureRulePayload): Promise<StructureRule> => {
    const res = await apiClient<any>(`/salary-structures/${structureId}/rules`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return extractData<StructureRule>(res);
  },

  updateStructureRule: async (
    structureId: number,
    ruleId: number,
    payload: { sequence?: number; is_active?: boolean }
  ): Promise<StructureRule> => {
    const res = await apiClient<any>(`/salary-structures/${structureId}/rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return extractData<StructureRule>(res);
  },

  removeRuleFromStructure: async (structureId: number, ruleId: number): Promise<void> => {
    await apiClient<void>(`/salary-structures/${structureId}/rules/${ruleId}`, {
      method: 'DELETE',
    });
  },

  // Salary Rules
  listRules: async (params?: { category?: string; is_active?: boolean }): Promise<SalaryRule[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.is_active !== undefined) query.set('is_active', String(params.is_active));
    const qs = query.toString();
    const res = await apiClient<any>(`/salary-rules${qs ? `?${qs}` : ''}`);
    return extractData<SalaryRule[]>(res) || [];
  },

  getRuleById: async (id: number): Promise<SalaryRule> => {
    const res = await apiClient<any>(`/salary-rules/${id}`);
    return extractData<SalaryRule>(res);
  },

  createRule: async (payload: CreateSalaryRulePayload): Promise<SalaryRule> => {
    const res = await apiClient<any>('/salary-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return extractData<SalaryRule>(res);
  },

  updateRule: async (id: number, payload: Partial<CreateSalaryRulePayload>): Promise<SalaryRule> => {
    const res = await apiClient<any>(`/salary-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return extractData<SalaryRule>(res);
  },

  deleteRule: async (id: number): Promise<void> => {
    await apiClient<void>(`/salary-rules/${id}`, {
      method: 'DELETE',
    });
  },

  // Preview Calculation
  previewCalculation: async (payload: {
    employee_id: number;
    target_date?: string;
    salary_structure_id?: number;
    wage?: number;
  }): Promise<SalaryCalculationPreviewResult> => {
    const res = await apiClient<any>('/salary-calculations/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return extractData<SalaryCalculationPreviewResult>(res);
  },
};
