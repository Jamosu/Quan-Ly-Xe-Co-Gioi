// Common Types
export type StatusType = 'active' | 'idle' | 'maintenance' | 'warning' | 'offline' | 'completed' | 'pending' | 'cancelled';

export interface KLHUnit {
  id: string;
  name: string;
  code: string;
  region: string;
  totalVehicles: number;
}

// 1. Module A & B: GPS & Realtime Telemetry
export interface VehicleGPS {
  id: string;
  plateNumber: string;
  code: string;
  driverName: string;
  driverPhone: string;
  vehicleType: string;
  klhName: string;
  subUnit: string;
  status: 'running' | 'idling' | 'stopped' | 'maintenance' | 'offline';
  speed: number;
  engineRpm: number;
  fuelLevelPercent: number;
  fuelLiters: number;
  temperature: number;
  lat: number;
  lng: number;
  address: string;
  heading: number;
  lastUpdated: string;
  todayKm: number;
  todayEngineHours: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  code: string;
  klhName: string;
  zoneType: 'plot' | 'workshop' | 'warehouse' | 'fuel_station' | 'restricted';
  areaHectares: number;
  maxSpeedKmH: number;
  activeVehiclesCount: number;
  alertOnExit: boolean;
  alertOnEntry: boolean;
  status: 'active' | 'inactive';
}

export interface GPSOfflineLog {
  id: string;
  plateNumber: string;
  driverName: string;
  klhName: string;
  lostSignalTime: string;
  reconnectedTime: string;
  durationMinutes: number;
  lastKnownLocation: string;
  reason: 'Mất sóng 4G/GSM' | 'Hết nguồn ắc quy' | 'Rút thiết bị GPS' | 'Vào vùng trũng hẻo lánh';
  status: 'resolved' | 'unresolved';
}

// 2. Module C: Fleet & Equipment
export interface VehicleProfile {
  id: string;
  plateNumber: string;
  internalCode: string;
  vehicleCategory: string;
  categoryCode?: string;
  vehicleTypeId?: number;
  vehicleTypeCode?: string;
  vehicleTypeName?: string;
  assetGroup?: string;
  vehicleSubtype?: string;
  brandModel: string;
  yearManufactured: number;
  klhName: string;
  teamUnit: string;
  currentDriver: string;
  status: 'active' | 'idle' | 'maintenance' | 'repair' | 'standby';
  rawStatus?: string;
  currentOdoKm: number;
  currentEngineHours: number;
  gpsImei?: string;
  fuelSensorImei?: string;
  inspectionExpiry?: string;
  insuranceExpiry?: string;

  // Thuộc tính mở rộng từ Master MMTB
  oldCode?: string;
  bravoCode?: string;
  assetCode?: string;
  purchaseCondition?: string;
  allocationDate?: string;
  conditionStatus?: string;
  transferHistory?: string;
  modelName?: string;
  manufacturer?: string;
  origin?: string;
  frameNumber?: string;
  engineNumber?: string;
  powerHp?: string;
  fuelQuotaRate?: number;
  fuelQuotaUnit?: 'L_PER_HOUR' | 'L_PER_KM' | 'L_PER_HA' | string;
  fuelTankCapacity?: number;
  supplier?: string;
  notes?: string;
  imageUrl?: string;
  contractStatus?: string;
  companyOwner?: string;
  assignedUnitCode?: string;
  complexCode?: string;
  regionCode?: string;
  categoryGroup?: string;
  maintenanceAlertTier?: 'GREEN' | 'AMBER' | 'RED' | string;
  hoursSinceLastService?: number;
  lastGpsUpdate?: string;
  technicalSpecs?: string;
  dimensions?: string;
  productivity?: string;
  inspectionDate?: string;
  nextInspectionDate?: string;
  roadFeeDate?: string;
  roadFeeExpiryDate?: string;
  nextRoadFeeDate?: string;
  sourceSheets?: string[];

  // Nhân sự quản lý & Nơi tập kết (từ sheet XE & MÁY CG AGRI)
  managerName?: string | null;
  managerPhone?: string | null;
  currentLocationName?: string | null;
}

export interface VehicleTypeOption {
  id: number;
  code: string;
  name: string;
  assetGroup?: string;
  category?: string;
  vehicleCount: number;
}

export interface ManufacturerOption {
  id: number;
  name: string;
  countryName?: string;
  vehicleCount: number;
}

export interface ModelOption {
  id: number;
  name: string;
  manufacturerId: number;
  categoryHint?: string;
  vehicleCount: number;
}

export interface YearOption {
  year: number;
  vehicleCount: number;
}

export interface OriginOption {
  name: string;
  vehicleCount: number;
}

export interface VehicleFilterOptions {
  complexes: string[];
  regions: string[];
  assignedUnits: string[];
  locations?: string[];
  assetGroups: string[];
  vehicleTypes: VehicleTypeOption[];
  manufacturers: ManufacturerOption[];
  models: ModelOption[];
  origins: Array<string | OriginOption>;
  manufactureYears: Array<number | YearOption>;
  statuses: string[];
  alertTiers: string[];
  purchaseConditions?: string[];
  suppliers?: string[];
  companyOwners?: string[];
}

export interface VehicleListResponse {
  items: VehicleProfile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface VehicleStatistics {
  totalVehicles: number;
  running: number;
  standby: number;
  maintenance: number;
  repair: number;
  waitingDispatch: number;
  gpsAttached: number;
  availabilityRate: string;
  maintenanceAlerts: {
    red: number;
    amber: number;
    green: number;
  };
}

export interface VehicleTypeMaster {
  id: number;
  code: string;
  name: string;
  assetGroup?: string;
  category?: string;
  defaultMaintenanceHours: number;
  defaultFuelQuotaRate?: number;
  defaultFuelQuotaUnit?: 'L_PER_HOUR' | 'L_PER_KM' | 'L_PER_HA';
  active: boolean;
  description?: string;
  sourceLabels?: string[];
  vehicleCount: number;
  childCount: number;
  manufacturers: string[];
  models: string[];
  origins: string[];
  assignedUnits: string[];
  powerRatings: string[];
}

export interface EquipmentProfile {
  id: string;
  equipmentCode: string;
  name: string;
  category: 'Rơ-moóc chở chuối' | 'Dàn xới đất 4 chảo' | 'Dàn phun thuốc tự hành' | 'Gầu múc chuyên dụng' | 'Bồn áp lực phân bón';
  assignedVehicle: string;
  klhName: string;
  purchaseDate: string;
  technicalStatus: 'Tốt' | 'Cần bảo dưỡng' | 'Hỏng chờ sửa';
}

export interface GPSSensorDevice {
  id: string;
  imei: string;
  deviceType: 'GPS 4G Tracker' | 'Cảm biến mức dầu điện dung' | 'Cảm biến nhiệt độ thùng lạnh' | 'Cảm biến nâng hạ ben' | 'Đầu đọc thẻ lái xe RFID';
  simNumber: string;
  telecomProvider: 'Viettel' | 'Mobifone' | 'Metfone (Cam)';
  installedVehicle: string;
  installDate: string;
  batteryStatus: string;
  signalStrength: 'Mạnh (4G)' | 'Trung bình (3G)' | 'Yếu (2G)' | 'Mất sóng';
  status: 'active' | 'faulty' | 'inventory';
}

// 3. Module D: Dispatch & Transport Orders
export interface ProductionPlan {
  id: string;
  planCode: string;
  seasonName: string;
  klhName: string;
  cropType: string;
  targetVolumeTons: number;
  completedVolumeTons: number;
  assignedVehiclesCount: number;
  startDate: string;
  endDate: string;
  status: 'in_progress' | 'completed' | 'draft';
}

export interface DispatchOrder {
  id: string;
  orderCode: string;
  orderType: 'Vận chuyển nông sản' | 'Làm đất xới cày' | 'Phun tưới dinh dưỡng' | 'Cấp phát vật tư phân bón' | 'Đưa đón nhân sự';
  klhName: string;
  fromLocation: string;
  toLocation: string;
  plateNumber: string;
  vehicleType: string;
  driverName: string;
  cargoDescription: string;
  plannedWeightTons: number;
  actualWeightTons: number;
  startTime: string;
  endTime: string;
  progressPercent: number;
  status: 'pending' | 'dispatched' | 'running' | 'completed' | 'cancelled';
}

export interface WeightTicket {
  id: string;
  ticketCode: string;
  scaleStationName: string;
  dispatchOrderCode: string;
  plateNumber: string;
  driverName: string;
  cargoType: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  scaleTimeIn: string;
  scaleTimeOut: string;
  weighMaster: string;
  status: 'confirmed' | 'discrepancy' | 'cancelled';
}

export type PlanWorkflowStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'ADJUSTED' | 'CANCELLED';
export type DispatchWorkflowStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ASSIGNED' | 'DRIVER_ACCEPTED' | 'DEPARTED' | 'WORKING' | 'COMPLETED' | 'ACCEPTED' | 'CLOSED' | 'REJECTED' | 'CANCELLED';
export type TransportWorkflowStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ASSIGNED' | 'DRIVER_ACCEPTED' | 'AT_PICKUP' | 'LOADING' | 'DEPARTED' | 'IN_TRANSIT' | 'AT_DELIVERY' | 'UNLOADING' | 'DELIVERED' | 'ACCEPTED' | 'COMPLETED';

export interface ApiPerson { id: number; fullName: string; phone?: string; licenseClass?: string; licenseExpiryDate?: string; healthCheckExpiryDate?: string; }
export interface ApiVehicle { id: number; code: string; plate?: string; name: string; status: string; vehicleType?: { id: number; name: string; requiredLicenseClass?: string }; }
export interface ProductionPlanItemRecord { id: number; workDate: string; shift: string; plotName: string; stage: 'LAM_DAT' | 'TRONG_MOI' | 'THU_HOACH'; jobName: string; targetQuantity: number; targetUnit: string; plannedVehicleCount: number; plannedMachineHours: number; status?: string; vehicleType?: { id: number; name: string }; }
export interface ProductionPlanRecord { id: number; code: string; title: string; stage: 'LAM_DAT' | 'TRONG_MOI' | 'THU_HOACH'; unit: string; complexCode: string; lotPlot: string; targetAreaHa: number; completedAreaHa: number; assignedVehiclesCount: number; startDate: string; endDate: string; weekStart?: string; status: PlanWorkflowStatus; items: ProductionPlanItemRecord[]; }
export interface DispatchOrderRecord { id: number; code: string; sourceType: string; unit: string; purpose: string; origin: string; destination: string; departureTime?: string; plannedEndTime?: string; actualDepartureTime?: string; status: DispatchWorkflowStatus; isDelayed: boolean; vehicle?: ApiVehicle; driver?: ApiPerson; implement?: { id: number; code: string; name: string }; legacyVehicle?: string; legacyDriver?: string; approvedAt?: string; confirmations?: OperationConfirmationRecord[]; }
export interface TransportItemRecord { id: number; materialCode?: string; cargoName: string; unitOfMeasure: string; plannedQuantity: number; actualQuantity?: number; pickupLocation?: string; deliveryLocation?: string; sourceRowNumber?: number; }
export interface TransportOrderRecord { id: number; code: string; routeType: 'ONE_WAY' | 'TWO_WAY'; flowType: 'STANDARD' | 'LIVESTOCK_FEED_3_LEG'; unit: string; requestDate?: string; executionDate?: string; cargoType?: string; tonnage?: number; origin?: string; destination?: string; departureTime?: string; plannedEndTime?: string; distanceKm: number; plannedFuelLiters?: number; palletCount?: number; trailerNote?: string; status: TransportWorkflowStatus; isRouteDeviated: boolean; vehicle?: ApiVehicle; driver?: ApiPerson; trailer?: { id: number; code: string; name: string }; legacyVehicle?: string; legacyDriver?: string; items: TransportItemRecord[]; confirmations?: OperationConfirmationRecord[]; }
export interface OperationConfirmationRecord { id: number; code: string; type: 'WEIGHT' | 'GPS'; status: 'PENDING' | 'CONFIRMED' | 'REJECTED'; grossWeightTons?: number; tareWeightTons?: number; netWeightTons?: number; measuredAreaHa?: number; machineHours?: number; routeLocation?: string; confirmedAt?: string; dispatchOrder?: DispatchOrderRecord; transportOrder?: TransportOrderRecord; }
export interface PaginatedResponse<T> { items: T[]; pagination: { total: number; page: number; limit: number; totalPages: number } }
export interface ImportWorkbookPayload { fileName: string; sheetName?: string; checksum: string; rows: Array<{ rowNumber: number; values: Array<string | number | null> }>; merges: string[]; }
export interface ImportPreview { checksum: string; fileName: string; tripCount: number; itemCount: number; trips: Array<Record<string, unknown>>; errors: Array<{ rowNumber: number; field: string; message: string }>; warnings: Array<{ rowNumber: number; field: string; value?: string; message: string }>; canCommit: boolean; }

// 4. Module I: Drivers & Staff
export interface DriverProfile {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  rfidCardNumber: string;
  klhName: string;
  teamUnit: string;
  licenseNumber: string;
  licenseClass: 'FC' | 'C' | 'B2' | 'Máy kéo hạng A4' | 'Chứng chỉ cơ giới';
  licenseExpiry: string;
  healthCheckExpiry: string;
  assignedVehicle: string;
  safetyScore: number;
  totalTripsMonth: number;
  fuelEfficiencyRate: number; // %
  status: 'on_shift' | 'available' | 'on_leave' | 'suspended';
}

export interface DriverViolation {
  id: string;
  violationCode: string;
  driverName: string;
  employeeCode: string;
  plateNumber: string;
  violationType: 'Chạy quá tốc độ' | 'Lái xe quá 4h liên tục' | 'Ra khỏi vùng cho phép' | 'Đỗ xe nổ máy > 30p' | 'Không quẹt thẻ định danh';
  violationValue: string;
  occurredAt: string;
  location: string;
  penaltyPoints: number;
  status: 'pending_review' | 'confirmed' | 'excused';
}

// 5. Module E: Workshop & Maintenance (BTSC)
export interface MaintenancePlan {
  id: string;
  planCode: string;
  plateNumber: string;
  vehicleType: string;
  klhName: string;
  maintenanceType: 'Bảo dưỡng 250 giờ' | 'Bảo dưỡng 500 giờ' | 'Bảo dưỡng 1000 giờ' | 'Đại tu động cơ' | 'Bảo dưỡng định kỳ 10,000 km';
  currentHours: number;
  dueHours: number;
  overdueHours: number;
  scheduledDate: string;
  assignedTechnician: string;
  status: 'upcoming' | 'overdue' | 'in_progress' | 'completed';
}

export interface WorkOrder {
  id: string;
  orderCode: string;
  plateNumber: string;
  vehicleType: string;
  klhName: string;
  issueDescription: string;
  priority: 'low' | 'medium' | 'high' | 'critical_sos';
  reportedBy: string;
  reportedDate: string;
  leadTechnician: string;
  sparePartsCostVND: number;
  laborHours: number;
  currentStep: 'Tiếp nhận' | 'Đang sửa chữa' | 'Chờ vật tư phụ tùng' | 'Kiểm thử KCS' | 'Đã xuất xưởng';
  estimatedCompletion: string;
}

// 6. Module J: Fuel Management
export interface FuelVoucher {
  id: string;
  voucherCode: string;
  plateNumber: string;
  driverName: string;
  klhName: string;
  fuelStation: string;
  fuelType: 'DO 0.05S-II' | 'Xăng Ron 95-III';
  litersPumped: number;
  odoAtRefuelKm: number;
  engineHoursAtRefuel: number;
  pumpMeterBefore: number;
  pumpMeterAfter: number;
  refuelTime: string;
  dispenserStaff: string;
  status: 'verified' | 'flagged';
}

export interface FuelTankStorage {
  id: string;
  tankCode: string;
  tankName: string;
  klhName: string;
  capacityLiters: number;
  currentLiters: number;
  fillPercent: number;
  safeMinLiters: number;
  lastImportDate: string;
  temperatureC: number;
  status: 'normal' | 'low_warning' | 'critical_empty';
}

export interface FuelDropAlert {
  id: string;
  alertCode: string;
  plateNumber: string;
  driverName: string;
  klhName: string;
  droppedLiters: number;
  durationMinutes: number;
  dropTime: string;
  location: string;
  engineStatus: 'Đang tắt máy' | 'Đang nổ cầm chừng';
  suspectedCause: 'Hút trộm dầu trái phép' | 'Rò rỉ bồn chứa' | 'Cảm biến dao động giả lập';
  status: 'investigating' | 'confirmed_theft' | 'false_positive' | 'settled';
}

// 7. Module K: System Alerts & SOS
export interface SystemAlert {
  id: string;
  alertCode: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'SOS Khẩn cấp' | 'Quá tốc độ' | 'Rời vùng Geofence' | 'Sụt dầu bất thường' | 'Nhiệt độ động cơ cao' | 'Mất tín hiệu GPS' | 'Quá giờ lái liên tục';
  plateNumber: string;
  driverName: string;
  klhName: string;
  location: string;
  description: string;
  occurredAt: string;
  acknowledgedBy?: string;
  status: 'unresolved' | 'handling' | 'resolved' | 'dismissed';
}

// 8. Module F: Reports
export interface ProductivityReportItem {
  id: string;
  plateNumber: string;
  vehicleType: string;
  klhName: string;
  operationalDays: number;
  totalKm: number;
  totalEngineHours: number;
  tripsCount: number;
  payloadTons: number;
  fuelConsumedLiters: number;
  avgLitersPerHour: number;
  efficiencyScore: number;
}

// 9. Module H: Master Data
export interface MasterUnit {
  id: string;
  code: string;
  name: string;
  parentUnit: string;
  unitType: 'KLH' | 'Xí nghiệp nông nghiệp' | 'Đội xe vận tải' | 'Xưởng cơ điện';
  headOfficer: string;
  contactPhone: string;
  locationAddress: string;
  vehicleCount: number;
}

export interface MasterVehicleType {
  id: string;
  code: string;
  name: string;
  category: string;
  standardFuelQuotaPerHour: number;
  maintenanceCycleHours: number;
  currentFleetCount: number;
}

// 10. Module G: Permissions & Audit
export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'SuperAdmin' | 'GiamDocKLH' | 'DieuHanhDoiXe' | 'QuanLyNhienLieu' | 'TruongXuongBTSC' | 'NhanVienGiamSat';
  assignedKLH: string;
  status: 'active' | 'locked';
  lastLogin: string;
}

export interface AuditLogItem {
  id: string;
  userFullName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DISPATCH' | 'APPROVE' | 'EXPORT';
  module: string;
  targetEntity: string;
  ipAddress: string;
  timestamp: string;
  details: string;
}
