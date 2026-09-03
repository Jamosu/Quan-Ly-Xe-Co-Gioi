import { apiClient } from './client';
import type { DispatchOrderRecord, ImportPreview, ImportWorkbookPayload, OperationConfirmationRecord, PaginatedResponse, ProductionPlanRecord, TransportOrderRecord } from '../types';

const payload = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return typeof body === 'object' && body !== null && 'data' in body ? (body as { data: T }).data : body as T;
};

export const operationsApi = {
  async plans(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<ProductionPlanRecord>>(await apiClient.get('/production-plans', { params })); },
  async createPlan(data: Record<string, unknown>) { return payload<ProductionPlanRecord>(await apiClient.post('/production-plans', data)); },
  async dispatchOrders(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<DispatchOrderRecord>>(await apiClient.get('/dispatch-orders', { params })); },
  async createDispatch(data: Record<string, unknown>) { return payload<DispatchOrderRecord>(await apiClient.post('/dispatch-orders', data)); },
  async transportOrders(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<TransportOrderRecord>>(await apiClient.get('/transport-orders', { params })); },
  async createTransport(data: Record<string, unknown>) { return payload<TransportOrderRecord>(await apiClient.post('/transport-orders', data)); },
  async confirmations(params: Record<string, unknown> = {}) { return payload<PaginatedResponse<OperationConfirmationRecord>>(await apiClient.get('/operation-confirmations', { params })); },
  async confirm(id: number) { return payload<OperationConfirmationRecord>(await apiClient.patch(`/operation-confirmations/${id}/confirm`)); },
  async previewImport(data: ImportWorkbookPayload) { return payload<ImportPreview>(await apiClient.post('/transport-orders/import/preview', data)); },
  async commitImport(data: ImportWorkbookPayload) { return payload<{ tripCount: number; itemCount: number; warnings: ImportPreview['warnings'] }>(await apiClient.post('/transport-orders/import/commit', data)); },
};
