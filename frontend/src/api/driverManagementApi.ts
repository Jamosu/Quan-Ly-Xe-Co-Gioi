import { apiClient } from './client';

export type DriverManagementLevel = 'OWNER' | 'TEAM';
export type DriverManagementStatus = 'ACTIVE' | 'INACTIVE';
export type DriverManagementUnitType = 'BAN' | 'PHONG' | 'TRUNG_TAM' | 'XI_NGHIEP' | 'NONG_TRUONG' | 'DOI' | 'TO' | 'KHAC';

export interface DriverManagementUnit {
  id: number;
  complexCode: string;
  code: string;
  name: string;
  level: DriverManagementLevel;
  unitType: DriverManagementUnitType;
  parentId?: number | null;
  status: DriverManagementStatus;
  description?: string | null;
  parent?: Pick<DriverManagementUnit, 'id' | 'code' | 'name'> | null;
  _count?: { children: number; ownerAssignments: number; teamAssignments: number };
}

const unwrap = <T>(response: any): T => {
  let value = response?.data ?? response;
  for (let i = 0; i < 3 && value && !Array.isArray(value) && typeof value === 'object' && 'data' in value; i += 1) value = value.data;
  return value as T;
};

// Kept deliberately separate from the generic CatalogItem API: these records
// own driver history and authorization, not vehicle usage master data.
export const driverManagementApi = {
  async getUnits(params: Record<string, unknown> = {}) {
    return unwrap<DriverManagementUnit[]>(await apiClient.get('/driver-management/units', { params }));
  },
  async createUnit(data: Partial<DriverManagementUnit>) {
    return unwrap<DriverManagementUnit>(await apiClient.post('/driver-management/units', data));
  },
  async updateUnit(id: number, data: Partial<DriverManagementUnit>) {
    return unwrap<DriverManagementUnit>(await apiClient.patch(`/driver-management/units/${id}`, data));
  },
  async deactivateUnit(id: number) {
    return unwrap<DriverManagementUnit>(await apiClient.post(`/driver-management/units/${id}/deactivate`));
  },
  async deleteUnit(id: number) {
    return unwrap<any>(await apiClient.delete(`/driver-management/units/${id}`));
  },
  async getScopes() { return unwrap<any[]>(await apiClient.get('/driver-management/scopes')); },
  async createScope(data: Record<string, unknown>) { return unwrap<any>(await apiClient.post('/driver-management/scopes', data)); },
  async getReconciliation() { return unwrap<any[]>(await apiClient.get('/driver-management/reconciliation')); },
  async assignDriver(data: Record<string, unknown>) { return unwrap<any>(await apiClient.post('/driver-management/assignments', data)); },
  async getAssignmentHistory(driverId: number) { return unwrap<any[]>(await apiClient.get(`/driver-management/drivers/${driverId}/assignments`)); },
};
