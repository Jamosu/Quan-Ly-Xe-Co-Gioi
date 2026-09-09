import { apiClient } from './client';

export type AvailabilityStatus = 'AVAILABLE' | 'WARNING' | 'UNAVAILABLE';
export type WorkOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'OPEN_FOR_CLAIM' | 'ASSIGNED' | 'DRIVER_ACCEPTED' | 'IN_PROGRESS' | 'SUBMITTED_FOR_ACCEPTANCE' | 'REWORK_REQUIRED' | 'ACCEPTED' | 'CLOSED' | 'REJECTED' | 'CANCELLED';

export interface ScheduleInterval {
  type: string;
  startTime: string;
  endTime: string;
  relatedId?: number;
  relatedCode?: string;
  reasonCode?: string;
}

export interface AvailabilityResource {
  id: number;
  code: string;
  name: string;
  available: boolean;
  availabilityStatus: AvailabilityStatus;
  reasons: Array<{ code: string; severity: 'WARNING' | 'BLOCK'; message: string; relatedId?: number; relatedCode?: string }>;
  intervals: ScheduleInterval[];
  availableSlots: Array<{ startTime: string; endTime: string; durationMinutes: number }>;
}

export interface AvailabilityResponse {
  requestedInterval: { startAt: string; endAt: string };
  policy: { unit: string; timezone: string; vehicleBufferMinutes: number; driverBufferMinutes: number };
  vehicles: AvailabilityResource[];
  drivers: AvailabilityResource[];
}

export interface OperationalWorkOrderRecord {
  id: number;
  type: 'DISPATCH' | 'TRANSPORT' | 'INTERNAL_FEED';
  unit: string;
  assignmentMode: 'FIXED_ASSIGNMENT' | 'OPEN_ASSIGNMENT';
  status: WorkOrderStatus;
  plannedStartAt: string;
  plannedEndAt: string;
  version: number;
  dispatchOrder?: { code: string; purpose: string; origin: string; destination: string };
  transportOrder?: { code: string; cargoType?: string; origin?: string; destination?: string };
  internalFeedTrip?: { code: string; sourceLocation: string; destinationLocation: string };
  vehicleAssignments: Array<{ id: number; vehicleId: number; status: string; vehicle: { code: string; name: string; plate?: string } }>;
  driverAssignments: Array<{ id: number; driverId: number; status: string; driver: { user: { fullName: string; code: string } } }>;
  executionSegments: Array<{ id: number; driverId: number; startedAt: string; endedAt?: string; startOdoKm?: number; endOdoKm?: number }>;
  evidence: Array<{ id: number; type: string; url: string; capturedAt: string }>;
}

const payload = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return typeof body === 'object' && body !== null && 'data' in body ? (body as { data: T }).data : body as T;
};

export const schedulingApi = {
  async searchAvailability(input: { startAt: string; endAt: string; unit?: string; vehicleIds?: number[]; driverIds?: number[]; requiredDurationMinutes?: number; excludeWorkOrderId?: number }) {
    return payload<AvailabilityResponse>(await apiClient.post('/availability/search', input));
  },
  async workOrders(params: { status?: string; type?: string } = {}) {
    return payload<{ items: OperationalWorkOrderRecord[]; pagination: { total: number } }>(await apiClient.get('/work-orders', { params }));
  },
  async workOrder(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.get(`/work-orders/${id}`)); },
  async claim(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/claim`)); },
  async accept(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/driver-accept`)); },
  async cannotAccept(id: number, data: { reasonCode: string; reason: string; evidenceUrl?: string }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/cannot-accept`, data)); },
  async start(id: number, data: { startOdoKm?: number; startMachineHours?: number; lat?: number; lng?: number; evidence?: Array<Record<string, unknown>> }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/start`, data)); },
  async finish(id: number, data: { endOdoKm?: number; endMachineHours?: number; quantity?: number; notes?: string; evidence?: Array<Record<string, unknown>> }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/finish`, data)); },
  async submitAcceptance(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/submit-acceptance`)); },
  async approveAcceptance(id: number, reason?: string) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/acceptance/approve`, { reason })); },
  async rejectAcceptance(id: number, reason: string) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/acceptance/reject`, { reason })); },
};
