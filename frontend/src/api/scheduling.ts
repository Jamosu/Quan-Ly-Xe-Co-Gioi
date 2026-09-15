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
  reasons: Array<{ code: string; severity: 'WARNING' | 'BLOCK'; message: string; relatedId?: number; relatedCode?: string; conflictInterval?: { startAt: string; endAt: string; overlapMinutes: number } }>;
  intervals: ScheduleInterval[];
  availableSlots: Array<{ startTime: string; endTime: string; durationMinutes: number }>;
}

export interface AvailabilityResponse {
  requestedInterval: { startAt: string; endAt: string };
  policy: { unit: string; timezone: string; vehicleBufferMinutes: number; driverBufferMinutes: number };
  vehicles: AvailabilityResource[];
  drivers: AvailabilityResource[];
}

export interface PreparationVehicle {
  id: number; code: string; name: string; plate?: string; status: string; vehicleTypeId?: number;
  vehicleType?: { id: number; code: string; name: string; implementRequirement?: string; requiredLicenseClass?: string };
  homeDepot?: OperationalLocation;
  availability: AvailabilityResource;
}

export interface PreparationDriver {
  id: number; code: string; fullName: string; phone?: string; licenseClass?: string;
  driverProfile?: { currentShiftStatus?: string; currentLocation?: string; licenseClass?: string };
  availability: AvailabilityResource;
}

export interface PreparationImplement {
  id: number; code: string; name: string; status: string; technicalCondition: string;
  compatibleVehicleTypes: Array<{ vehicleTypeId: number }>;
  currentVehicle?: { id: number; code: string; name: string };
}

export interface PreparationContextResponse {
  requestedInterval: { startAt: string; endAt: string };
  policy: AvailabilityResponse['policy'];
  vehicles: PreparationVehicle[];
  drivers: PreparationDriver[];
  implements: PreparationImplement[];
}

export interface OperationalWorkOrderRecord {
  id: number;
  type: 'DISPATCH' | 'TRANSPORT' | 'INTERNAL_FEED';
  category: 'AGRICULTURE' | 'CONSTRUCTION' | 'TRANSPORT';
  sourceType: 'MANUAL' | 'MANUAL_EXCEPTION' | 'PRODUCTION_ORDER' | 'IMPORT';
  unit: string;
  assignmentMode: 'FIXED_ASSIGNMENT' | 'OPEN_ASSIGNMENT';
  status: WorkOrderStatus;
  plannedStartAt: string;
  plannedEndAt: string;
  version: number;
  complexCode?: string;
  complexName?: string;
  enterpriseCode?: string;
  enterpriseName?: string;
  farmCode?: string;
  farmName?: string;
  workLocationText?: string;
  workLocationNotes?: string;
  workLat?: number;
  workLng?: number;
  jobCode?: string;
  jobName: string;
  jobDescription?: string;
  shift?: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  targetQuantity?: number;
  targetUnit?: string;
  categoryDetails?: Record<string, unknown>;
  notes?: string;
  driverDelay?: {
    isLate: true;
    delayMinutes: number;
    thresholdMinutes: number;
    phase: 'WAITING_ACCEPTANCE' | 'WAITING_DEPARTURE';
  } | null;
  workLocation?: OperationalLocation;
  requestedVehicleType?: { id: number; code: string; name: string };
  dispatchOrder?: { id?: number; code: string; purpose: string; origin: string; destination: string; status: string; originLocation?: OperationalLocation; destinationLocation?: OperationalLocation; implement?: { id: number; code: string; name: string } };
  transportOrder?: { id?: number; code: string; cargoType?: string; origin?: string; destination?: string; status: string; routeType: 'ONE_WAY' | 'TWO_WAY'; returnCargoName?: string; returnOrigin?: string; returnDestination?: string; originLocation?: OperationalLocation; destinationLocation?: OperationalLocation; returnOriginLocation?: OperationalLocation; returnDestinationLocation?: OperationalLocation; trailer?: { id: number; code: string; name: string } };
  internalFeedTrip?: { code: string; sourceLocation: string; destinationLocation: string };
  vehicleAssignments: Array<{ id: number; vehicleId: number; status: string; vehicle: { code: string; name: string; plate?: string; gpsImei?: string; homeDepot?: OperationalLocation } }>;
  driverAssignments: Array<{ id: number; driverId: number; status: string; driver: { user: { fullName: string; code: string } } }>;
  executionSegments: Array<{ id: number; driverId: number; startedAt: string; endedAt?: string; startOdoKm?: number; endOdoKm?: number }>;
  evidence: Array<{ id: number; type: string; url: string; capturedAt: string; lat?: number; lng?: number; locationStatus: 'GPS_RECORDED' | 'EXIF_RECORDED' | 'LOCATION_UNKNOWN' }>;
  journeyLegs: JourneyLeg[];
}

export interface OperationalLocation {
  id: number;
  code: string;
  name: string;
  type: 'DEPOT' | 'WORKSITE' | 'PICKUP' | 'DELIVERY' | 'OTHER';
  unit?: string;
  complexCode?: string;
  enterpriseCode?: string;
  farmCode?: string;
  regionName?: string;
  address?: string;
  lat?: number;
  lng?: number;
  geofenceRadiusM: number;
  active: boolean;
}

export interface JourneyLeg {
  id: number;
  sequence: number;
  type: 'OUTBOUND' | 'RETURN' | 'REPOSITION';
  status: 'PLANNED' | 'EN_ROUTE_TO_PICKUP' | 'AT_PICKUP' | 'LOADING' | 'WORKING' | 'IN_TRANSIT' | 'AT_DELIVERY' | 'UNLOADING' | 'COMPLETED' | 'RETURNING_TO_DEPOT' | 'AT_DEPOT';
  originName: string;
  destinationName: string;
  cargoName?: string;
  tonnage?: number;
  isEmpty: boolean;
}

export interface VehicleRecommendation {
  vehicle: { id: number; code: string; name: string; plate?: string };
  availability: 'AVAILABLE_NOW' | 'FINISHING_SOON';
  readyAt: string;
  earliestArrivalAt?: string;
  etaMinutes?: number;
  distanceKm?: number;
  etaSource: 'ROUTING' | 'HAVERSINE' | 'REGION';
  positionSource: 'VEHICLE_GPS' | 'PHOTO_EXIF' | 'TASK_DESTINATION' | 'HOME_DEPOT' | 'REGION';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  feasible: boolean;
  driverAvailable: boolean;
  currentWorkOrderId?: number;
  warnings: string[];
}

export interface ExcludedVehicleRecommendation {
  vehicle: { id: number; code: string; name: string; plate?: string };
  reasons: Array<{ code: string; message: string }>;
}

export interface ClaimVehicleOption {
  id: number;
  code: string;
  name: string;
  plate?: string;
  source: 'DRIVER_CURRENT' | 'ORDER_RESERVED' | 'BOTH';
}

export interface ClaimOptionsResponse {
  defaultVehicleId: number;
  options: ClaimVehicleOption[];
}

export type JourneyAction = 'DEPART_TO_WORK' | 'ARRIVE_WORKSITE' | 'START_WORK' | 'FINISH_WORK' | 'ARRIVE_PICKUP' | 'START_LOADING' | 'DEPART_PICKUP' | 'ARRIVE_DELIVERY' | 'START_UNLOADING' | 'COMPLETE_DELIVERY' | 'RETURN_TO_DEPOT' | 'ARRIVE_DEPOT';

const payload = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return typeof body === 'object' && body !== null && 'data' in body ? (body as { data: T }).data : body as T;
};

export const schedulingApi = {
  async preparationContext(params: { category: string; unit: string; startAt: string; endAt: string; excludeWorkOrderId?: number; complexCode?: string }) {
    return payload<PreparationContextResponse>(await apiClient.get('/work-orders/preparation-context', { params }));
  },
  async searchAvailability(input: { startAt: string; endAt: string; unit?: string; vehicleIds?: number[]; driverIds?: number[]; requiredDurationMinutes?: number; excludeWorkOrderId?: number; excludeDispatchOrderId?: number }) {
    return payload<AvailabilityResponse>(await apiClient.post('/availability/search', input));
  },
  async workOrders(params: { status?: string; type?: string } = {}) {
    return payload<{ items: OperationalWorkOrderRecord[]; pagination: { total: number } }>(await apiClient.get('/work-orders', { params }));
  },
  async workOrder(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.get(`/work-orders/${id}`)); },
  async claimOptions(id: number) { return payload<ClaimOptionsResponse>(await apiClient.get(`/work-orders/${id}/claim-options`)); },
  async claim(id: number, vehicleId?: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/claim`, { vehicleId })); },
  async accept(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/driver-accept`)); },
  async cannotAccept(id: number, data: { reasonCode: string; reason: string; evidenceUrl?: string }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/cannot-accept`, data)); },
  async start(id: number, data: { startOdoKm?: number; startMachineHours?: number; lat?: number; lng?: number; evidence?: Array<Record<string, unknown>> }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/start`, data)); },
  async finish(id: number, data: { endOdoKm?: number; endMachineHours?: number; quantity?: number; notes?: string; evidence?: Array<Record<string, unknown>> }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/finish`, data)); },
  async journeyAction(id: number, action: JourneyAction, data: { evidenceId?: number; lat?: number; lng?: number; odoKm?: number; machineHours?: number; notes?: string } = {}) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/journey/${action}`, data)); },
  async uploadEvidence(id: number, file: File, type: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    form.append('capturedAt', new Date().toISOString());
    return payload<OperationalWorkOrderRecord['evidence'][number]>(await apiClient.post(`/work-orders/${id}/evidence/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  async recommendVehicles(workOrderId: number) {
    return payload<{ workOrderId: number; finishingWindowMinutes: number; recommendations: VehicleRecommendation[]; excluded: ExcludedVehicleRecommendation[] }>(await apiClient.post('/availability/recommendations', { workOrderId }));
  },
  async locations(params: { type?: string; unit?: string; complexCode?: string; enterpriseCode?: string; farmCode?: string; search?: string; active?: boolean } = {}) {
    return payload<OperationalLocation[]>(await apiClient.get('/operational-locations', { params }));
  },
  async createLocation(data: Record<string, unknown>) { return payload<OperationalLocation>(await apiClient.post('/operational-locations', data)); },
  async updateLocation(id: number, data: Record<string, unknown>) { return payload<OperationalLocation>(await apiClient.patch(`/operational-locations/${id}`, data)); },
  async deactivateLocation(id: number) { return payload<OperationalLocation>(await apiClient.delete(`/operational-locations/${id}`)); },
  async submitAcceptance(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/submit-acceptance`)); },
  async approveAcceptance(id: number, reason?: string) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/acceptance/approve`, { reason })); },
  async rejectAcceptance(id: number, reason: string) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/acceptance/reject`, { reason })); },
  async createManual(data: Record<string, unknown>) { return payload<OperationalWorkOrderRecord>(await apiClient.post('/work-orders/manual', data)); },
  async prepare(id: number, data: Record<string, unknown>) { return payload<OperationalWorkOrderRecord>(await apiClient.patch(`/work-orders/${id}/preparation`, data)); },
};
