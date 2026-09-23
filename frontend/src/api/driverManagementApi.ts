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
  mainDepotId?: number | null;
  status: DriverManagementStatus;
  description?: string | null;
  parent?: Pick<DriverManagementUnit, 'id' | 'code' | 'name'> | null;
  mainDepot?: { id: number; code: string; name: string; complexCode?: string; regionName?: string; address?: string } | null;
  managerName?: string | null;
  managerPhone?: string | null;
  currentManager?: ManagementUnitManagerAssignment | null;
  managerAssignments?: Array<{ manager: { id: number; code?: string; fullName: string; phone?: string | null } }>;
  teamCount?: number;
  vehicleCount?: number;
  implementCount?: number;
  totalEquipmentCount?: number;
  driverCount?: number;
  workOrderCount?: number;
  _count?: { children: number; vehicles: number; implements: number; workOrders: number; ownerAssignments: number; teamAssignments: number };
}

export interface ManagementUnitManagerAssignment {
  id: number;
  managementUnitId: number;
  managerUserId: number;
  managerType: 'PRIMARY' | 'DEPUTY';
  effectiveFrom: string;
  effectiveTo?: string | null;
  reason?: string | null;
  status?: 'PLANNED' | 'ACTIVE' | 'ENDED';
  managementUnit?: DriverManagementUnit;
  manager?: { id: number; code: string; fullName: string; phone?: string | null; username?: string };
  legacyCatalogId?: string | null;
  legacyCatalog?: { id: string; address?: string | null } | null;
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
  async getManagers(params: Record<string, unknown> = {}) { return unwrap<ManagementUnitManagerAssignment[]>(await apiClient.get('/driver-management/managers', { params })); },
  async getUnresolvedManagers() { return unwrap<any[]>(await apiClient.get('/driver-management/managers/unresolved')); },
  async createManagerAssignment(data: Record<string, unknown>) { return unwrap<ManagementUnitManagerAssignment>(await apiClient.post('/driver-management/managers', data)); },
  async endManagerAssignment(id: number, data: Record<string, unknown> = {}) { return unwrap<ManagementUnitManagerAssignment>(await apiClient.post(`/driver-management/managers/${id}/end`, data)); },
  async replaceManagerAssignment(id: number, data: Record<string, unknown>) { return unwrap<ManagementUnitManagerAssignment>(await apiClient.post(`/driver-management/managers/${id}/replace`, data)); },
};
