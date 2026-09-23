import { apiClient } from './client';
import type { DispatchOrderRecord, ImportPreview, ImportWorkbookPayload, OperationConfirmationRecord, PaginatedResponse, ProductionPlanRecord, TransportOrderRecord } from '../types';

const payload = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return typeof body === 'object' && body !== null && 'data' in body ? (body as { data: T }).data : body as T;
};

export const operationsApi = {
  async plans(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<ProductionPlanRecord>>(await apiClient.get('/production-plans', { params })); },
  async createPlan(data: Record<string, unknown>) { return payload<ProductionPlanRecord>(await apiClient.post('/production-plans', data)); },
  async updatePlan(id: number | string, data: Record<string, unknown>) { return payload<ProductionPlanRecord>(await apiClient.patch(`/production-plans/${id}`, data)); },
  async adjustPlan(id: number | string, data: Record<string, unknown>) { return payload<ProductionPlanRecord>(await apiClient.post(`/production-plans/${id}/adjust`, data)); },
  async getPlan(id: number | string) { return payload<ProductionPlanRecord>(await apiClient.get(`/production-plans/${id}`)); },
  async generatedPlanOrders(planId: number | string, itemId: number | string) {
    return payload<Array<{ kind: 'DISPATCH' | 'TRANSPORT'; id: number; code: string; workOrderId?: number; status: string; departureTime?: string; plannedEndTime?: string }>>(
      await apiClient.get(`/production-plans/${planId}/items/${itemId}/generated-orders`),
    );
  },
  async submitPlan(id: number | string) { return payload<ProductionPlanRecord>(await apiClient.post(`/production-plans/${id}/submit`)); },
  async approvePlan(id: number | string) { return payload<ProductionPlanRecord & { generation?: { createdCount: number; updatedCount: number; cancelledCount: number; warnings: string[] } }>(await apiClient.post(`/production-plans/${id}/approve`)); },
  async deletePlan(id: number | string) { return payload<any>(await apiClient.delete(`/production-plans/${id}`)); },
  async dispatchOrders(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<DispatchOrderRecord>>(await apiClient.get('/dispatch-orders', { params })); },
  async getDispatch(id: number | string) { return payload<DispatchOrderRecord>(await apiClient.get(`/dispatch-orders/${id}`)); },
  async createDispatch(data: Record<string, unknown>) { return payload<DispatchOrderRecord>(await apiClient.post('/dispatch-orders', data)); },
  async assignDispatch(id: number | string, data: { vehicleId: number; driverId: number; implementId?: number; implementIds?: number[]; departureTime: string; plannedEndTime: string }) { return payload<DispatchOrderRecord>(await apiClient.post(`/dispatch-orders/${id}/assign`, data)); },
  async cancelDispatch(id: number | string, reason?: string) { return payload<DispatchOrderRecord>(await apiClient.post(`/dispatch-orders/${id}/cancel`, { reason })); },
  async rescheduleDispatch(id: number | string, data: { newDepartureTime: string; newPlannedEndTime: string; reason?: string }) {
    return payload<{ order: DispatchOrderRecord; resetAssignment: boolean; conflicts: string[] }>(await apiClient.post(`/dispatch-orders/${id}/reschedule`, data));
  },
  async batchRescheduleDispatch(data: { ids: number[]; newDepartureTime: string; newPlannedEndTime: string; reason?: string }) {
    return payload<{ results: Array<{ id: number; success: boolean; resetAssignment?: boolean; error?: string }>; successCount: number; failCount: number }>(await apiClient.post('/dispatch-orders/batch-reschedule', data));
  },
  async retroactiveCompleteDispatch(id: number | string, data: { actualStartTime: string; actualCompletedTime: string; actualMachineHours?: number; actualQuantity?: number; notes?: string }) {
    return payload<DispatchOrderRecord>(await apiClient.post(`/dispatch-orders/${id}/retroactive-complete`, data));
  },
  async overdueDispatchSummary() {
    return payload<{ totalOverdue: number; totalAttention: number; pendingAction: number; lateAwaitingAssignment: number; lateAssigned: number; lateAccepted: number; missingVehicle: number; missingDriver: number; awaitingApproval: number; byStatus: Array<{ status: string; count: number }>; items: Array<{ id: number; code: string; status: string; departureTime?: string; attentionType: 'MANAGEMENT_ACTION' | 'DEPARTURE_DELAY'; missingVehicle: boolean; missingDriver: boolean }> }>(await apiClient.get('/dispatch-orders/overdue-summary'));
  },
  async transportOrders(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<TransportOrderRecord>>(await apiClient.get('/transport-orders', { params })); },
  async createTransport(data: Record<string, unknown>) { return payload<TransportOrderRecord>(await apiClient.post('/transport-orders', data)); },
  async assignTransport(id: number | string, data: { vehicleId: number; driverId: number; implementId?: number; departureTime: string; plannedEndTime: string }) { return payload<TransportOrderRecord>(await apiClient.post(`/transport-orders/${id}/assign`, data)); },
  async confirmations(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<OperationConfirmationRecord>>(await apiClient.get('/operation-confirmations', { params })); },
  async confirm(id: number) { return payload<OperationConfirmationRecord>(await apiClient.patch(`/operation-confirmations/${id}/confirm`)); },
  async previewImport(data: ImportWorkbookPayload) { return payload<ImportPreview>(await apiClient.post('/transport-orders/import/preview', data)); },
  async commitImport(data: ImportWorkbookPayload) { return payload<{ tripCount: number; itemCount: number; warnings: ImportPreview['warnings'] }>(await apiClient.post('/transport-orders/import/commit', data)); },
};
