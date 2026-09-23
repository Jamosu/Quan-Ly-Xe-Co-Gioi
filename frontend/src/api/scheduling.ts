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

export interface ResourceSelection {
  selectable: boolean;
  reasons: Array<{ code: string; message: string }>;
}

export interface PreparationVehicle {
  id: number; code: string; name: string; plate?: string; status: string; vehicleTypeId?: number; fuelQuotaRate?: number;
  vehicleType?: { id: number; code: string; name: string; operationalDomain?: string; implementRequirement?: string; requiredLicenseClass?: string };
  homeDepot?: OperationalLocation;
  availability?: AvailabilityResource;
  selection?: ResourceSelection;
}

export interface PreparationDriver {
  id: number;
  code: string;
  fullName: string;
  phone?: string;
  licenseClass?: string;
  driverProfile?: {
    currentShiftStatus?: string;
    currentLocation?: string;
    licenseClass?: string;
    vehicleAssignments?: Array<{
      id: number;
      vehicleId: number;
      type: 'PRIMARY' | 'SECONDARY';
      vehicle?: PreparationVehicle;
    }>;
  };
  primaryVehicles?: PreparationVehicle[];
  secondaryVehicles?: PreparationVehicle[];
  drivenVehicles?: PreparationVehicle[];
  assignedVehicles?: Array<{
    id: number;
    vehicleId: number;
    type: 'PRIMARY' | 'SECONDARY';
    vehicle?: PreparationVehicle;
  }>;
  availability: AvailabilityResource;
  selection?: ResourceSelection;
}

export interface PreparationImplement {
  id: number; code: string; name: string; status: string; technicalCondition: string;
  usageMode?: string;
  compatibleVehicleTypes: Array<{ vehicleTypeId: number }>;
  currentVehicle?: { id: number; code: string; name: string };
  selection?: ResourceSelection;
}

export interface PreparationContextResponse {
  requestedInterval: { startAt: string; endAt: string };
  policy: AvailabilityResponse['policy'];
  vehicles: PreparationVehicle[];
  drivers: PreparationDriver[];
  implements: PreparationImplement[];
  summary?: {
    vehicles: { total: number; selectable: number };
    drivers: { total: number; selectable: number };
    implements: { total: number; selectable: number };
  };
}

export interface OperationalWorkOrderRecord {
  id: number;
  managementUnitId?: number;
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
  completedQuantity?: number;
  expectedCompletedAt?: string;
  actualCompletedAt?: string;
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
  vehicleAssignments: Array<{ id: number; vehicleId: number; status: string; startAt: string; endAt?: string; reason?: string; vehicle: { code: string; name: string; plate?: string; gpsImei?: string; currentLat?: number; currentLng?: number; lastGpsUpdate?: string; homeDepot?: OperationalLocation } }>;
  driverAssignments: Array<{ id: number; driverId: number; status: string; startAt: string; endAt?: string; reason?: string; driver: { user: { fullName: string; code: string } } }>;
  executionSegments: WorkExecutionSession[];
  dailyProgress: WorkDailyProgress[];
  dailyDispatchOrders: DailyDispatchOrder[];
  dailyReports: DailyReport[];
  evidence: Array<{ id: number; type: string; url: string; capturedAt: string; lat?: number; lng?: number; locationStatus: 'GPS_RECORDED' | 'EXIF_RECORDED' | 'LOCATION_UNKNOWN' }>;
  events: Array<{ id: number; action: string; oldStatus?: string; newStatus?: string; reason?: string; payload?: Record<string, unknown>; occurredAt: string; actor?: { id: number; fullName: string } }>;
  sosAlerts: Array<{ id: number; status: string; emergencyType: string; description?: string; lat: number; lng: number; createdAt: string; resolvedAt?: string }>;
  journeyLegs: JourneyLeg[];
}

export type DailyReportStatus = 'NOT_OPEN' | 'DRAFT' | 'SUBMITTED_ON_TIME' | 'LATE' | 'MISSING' | 'SUBMITTED_BY_MANAGER' | 'REVISION_REQUESTED' | 'ACCEPTED';

export interface DailyReport {
  id: number; dispatchOrderId: number; workOrderId: number; originalDriverId: number; reportDate: string;
  status: DailyReportStatus; quantityToday: number; unit?: string; startMachineHours?: number; endMachineHours?: number;
  startOdoKm?: number; endOdoKm?: number; fuelLiters?: number; evidenceUrls?: string[]; note?: string;
  workCompleted: boolean; reportStartedAt?: string; reportSubmittedAt?: string; reportDelayMinutes: number;
  submittedByType?: 'DRIVER' | 'MANAGER'; managerReason?: string; revisionReason?: string;
  submittedBy?: { id: number; fullName: string };
}

export interface DailyDispatchOrder {
  id: number; code: string; status: string; scheduledStartAt?: string; scheduledEndAt?: string;
  workDurationMinutes: number; breakDurationMinutes: number; acceptGraceMinutes: number; acceptDelayMinutes: number;
  acceptStatus: 'NOT_ACCEPTED' | 'ON_TIME' | 'WITHIN_GRACE' | 'LATE'; reportOpenAt?: string; reportDeadlineAt?: string;
  vehicleId?: number; driverId?: number; implementId?: number; previousDispatchOrderId?: number; dailyReport?: DailyReport;
  vehicle?: { id: number; code: string; name: string; plate?: string };
  driver?: { id: number; code: string; fullName: string };
  implement?: { id: number; code: string; name: string };
}

export interface WorkBreakSession {
  id: number; type: 'LUNCH' | 'PERSONAL' | 'SCHEDULED_BREAK' | 'OTHER'; startedAt: string; endedAt?: string; durationMinutes?: number; note?: string;
}

export interface WorkPauseSession {
  id: number; reason: 'WAITING_MATERIAL' | 'WAITING_CARGO' | 'WEATHER' | 'WAITING_DISPATCH' | 'VEHICLE_ISSUE' | 'WORKSITE_NOT_READY' | 'OTHER'; startedAt: string; endedAt?: string; durationMinutes?: number; note?: string;
}

export interface WorkExecutionSession {
  id: number; driverId: number; workDate: string; status: 'ACTIVE' | 'ON_BREAK' | 'PAUSED' | 'ENDED'; startedAt: string; endedAt?: string;
  startOdoKm?: number; endOdoKm?: number; startMachineHours?: number; endMachineHours?: number;
  grossMinutes: number; breakMinutes: number; pauseMinutes: number; workingMinutes: number;
  breaks: WorkBreakSession[]; pauses: WorkPauseSession[];
}

export interface WorkDailyProgress {
  id: number; progressDate: string; quantityToday: number; accumulatedQuantity: number; overallProgressPercent: number; description?: string; note?: string; evidenceUrls?: string[];
}

export interface DriverWorkContext {
  order: OperationalWorkOrderRecord;
  driverActivity: string;
  workSession: WorkExecutionSession | null;
  openBreak: WorkBreakSession | null;
  openPause: WorkPauseSession | null;
  dailyProgress: WorkDailyProgress[];
  currentDispatch?: DailyDispatchOrder | null;
  allowedActions: Array<'ACCEPT_ORDER' | 'START_WORK_SESSION' | 'UPDATE_PROGRESS' | 'START_BREAK' | 'END_BREAK' | 'PAUSE_WORK' | 'RESUME_WORK' | 'END_WORK_SESSION' | 'REQUEST_COMPLETION' | 'SAVE_DAILY_REPORT' | 'SUBMIT_DAILY_REPORT' | 'SOS'>;
  version: number;
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
  async preparationContext(params: { managementUnitId: number; category: string; unit: string; complexCode: string; startAt: string; endAt: string; excludeWorkOrderId?: number; vehicleId?: number }) {
    return payload<PreparationContextResponse>(await apiClient.get('/work-orders/preparation-context', { params }));
  },
  async searchAvailability(input: { startAt: string; endAt: string; unit?: string; vehicleIds?: number[]; driverIds?: number[]; requiredDurationMinutes?: number; excludeWorkOrderId?: number; excludeDispatchOrderId?: number }) {
    return payload<AvailabilityResponse>(await apiClient.post('/availability/search', input));
  },
  async workOrders(params: { status?: string; type?: string } = {}) {
    return payload<{ items: OperationalWorkOrderRecord[]; pagination: { total: number } }>(await apiClient.get('/work-orders', { params }));
  },
  async workOrder(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.get(`/work-orders/${id}`)); },
  async driverContext(id: number) { return payload<DriverWorkContext>(await apiClient.get(`/work-orders/${id}/driver-context`)); },
  async claimOptions(id: number) { return payload<ClaimOptionsResponse>(await apiClient.get(`/work-orders/${id}/claim-options`)); },
  async claim(id: number, vehicleId?: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/claim`, { vehicleId })); },
  async accept(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/driver-accept`)); },
  async cannotAccept(id: number, data: { reasonCode: string; reason: string; evidenceUrl?: string }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/cannot-accept`, data)); },
  async start(id: number, data: { startOdoKm?: number; startMachineHours?: number; lat?: number; lng?: number; evidence?: Array<Record<string, unknown>> }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/start`, data)); },
  async startBreak(id: number, data: { type?: WorkBreakSession['type']; note?: string } = {}) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/start-break`, data)); },
  async endBreak(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/end-break`)); },
  async pause(id: number, data: { reason: WorkPauseSession['reason']; note?: string }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/pause`, data)); },
  async resume(id: number) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/resume`)); },
  async endSession(id: number, data: { endOdoKm?: number; endMachineHours?: number; notes?: string; confirmNoProgress?: boolean }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/execution/end-session`, data)); },
  async updateProgress(id: number, data: { progressDate?: string; quantityToday?: number; overallProgressPercent?: number; description?: string; note?: string; evidenceUrls?: string[] }) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/progress`, data)); },
  async saveDailyReport(id: number, data: Record<string, unknown>) { return payload<DailyReport>(await apiClient.post(`/work-orders/${id}/daily-report/draft`, data)); },
  async submitDailyReport(id: number, data: Record<string, unknown>) { return payload<DailyReport>(await apiClient.post(`/work-orders/${id}/daily-report/submit`, data)); },
  async requestDailyReportRevision(id: number, dispatchOrderId: number, reason: string) { return payload<DailyReport>(await apiClient.post(`/work-orders/${id}/daily-report/${dispatchOrderId}/revision`, { reason })); },
  async acceptDailyReport(id: number, dispatchOrderId: number, data: Record<string, unknown> = {}) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/daily-report/${dispatchOrderId}/accept`, data)); },
  async continueNextDay(id: number, data: Record<string, unknown>) { return payload<OperationalWorkOrderRecord>(await apiClient.post(`/work-orders/${id}/continue-next-day`, data)); },
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
