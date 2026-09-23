import axios from 'axios';
import {
  VehicleGPS,
  VehicleProfile,
  ProductionPlan,
  DispatchOrder,
  MaintenancePlan,
  WorkOrder,
  FuelVoucher,
  FuelTankStorage,
  DriverProfile,
  VehicleFilterOptions,
  VehicleListResponse,
  VehicleStatistics,
  VehicleTypeMaster,
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { isLiquidatedAssignedUnit } from '../utils/vehicleLifecycle';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://backend-qlxcg.onrender.com/api' : 'http://localhost:3001/api');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes for large file sync (>500MB)
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('thaco_agri_jwt_token') || localStorage.getItem('thaco_agri_jwt_token');
};

export const setSessionAuth = (token: string, user: any) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('thaco_agri_jwt_token', token);
  sessionStorage.setItem('thaco_auth_user', JSON.stringify(user));
  useAppStore.getState().setCurrentUser(user);
  window.dispatchEvent(new Event('auth-session-updated'));
};

export const clearSessionAuth = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('thaco_agri_jwt_token');
  sessionStorage.removeItem('thaco_auth_user');
  localStorage.removeItem('thaco_agri_jwt_token');
  useAppStore.getState().logout();
  window.dispatchEvent(new Event('auth-session-updated'));
};

// Request interceptor to attach JWT Token
apiClient.interceptors.request.use(async (config) => {
  const token = getSessionToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const savedKLH = typeof window !== 'undefined' ? localStorage.getItem('thaco_selected_klh') : null;
  if (savedKLH && savedKLH !== 'ALL') {
    const url = config.url || '';
    if (url.includes('/vehicles') || url.includes('/dashboard') || url.includes('/dispatch-orders')) {
      config.params = {
        complexCode: savedKLH,
        ...(config.params || {}),
      };
    }
  }

  return config;
});

// Response interceptor to handle token refresh, retry network glitches during server restarts, and display header alert on error
apiClient.interceptors.response.use(
  (response) => {
    // Tự động xóa thông báo lỗi kết nối nếu request đã thành công trở lại
    const currentAlert = useAppStore.getState().headerAlert;
    if (currentAlert?.type === 'error' && (currentAlert.message.includes('Network Error') || currentAlert.message.includes('Lỗi kết nối'))) {
      useAppStore.getState().setHeaderAlert(null);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retryCount?: number }) | undefined;

    // Tự động retry tối đa 2 lần khi gặp Network Error (do backend đang restart trong lúc sửa code)
    const isNetworkGlitch = !error.response && (error.message === 'Network Error' || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED');
    if (isNetworkGlitch && originalRequest && (originalRequest._retryCount || 0) < 2) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      const retryDelay = originalRequest._retryCount * 600;
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return apiClient(originalRequest);
    }

    if (error.response?.status === 401) {
      clearSessionAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const status = error.response?.status;
    const errorData = error.response?.data;
    const msg = errorData?.message || errorData?.error?.message || error.message || 'Không thể kết nối máy chủ.';
    const cleanMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);

    // Bỏ qua hiển thị cảnh báo đỏ xâm lấn nếu là xung đột 409 (bản ghi/mã đã tồn tại) hoặc hủy request
    if (status !== 409 && !axios.isCancel(error)) {
      useAppStore.getState().setHeaderAlert({
        type: 'error',
        message: `Lỗi kết nối máy chủ (${status || 'Network'}): ${cleanMsg}`,
      });
    }

    return Promise.reject(error);
  }
);

const vehicleCategoryLabels: Record<string, string> = {
  MAY_DAO: 'Máy đào', MAY_UI: 'Máy ủi', MAY_SAN: 'Máy san / xe ban', MAY_LU: 'Máy lu',
  MAY_XUC_LAT: 'Máy xúc lật', XE_XUC: 'Xe xúc', MAY_CAY: 'Máy cày', MAY_KEO: 'Máy kéo',
  MAY_GAT_DAP: 'Máy gặt đập', XE_TAI: 'Xe tải', XE_BEN: 'Xe ben', XE_BON: 'Xe bồn / xe téc',
  XE_CONTAINER: 'Xe đầu kéo container', XE_BAN_TAI: 'Xe bán tải', XE_CHUYEN_DUNG: 'Xe / máy chuyên dùng',
  XE_CONG_VU: 'Xe công vụ', XE_CHO_NGUOI: 'Xe chở người', XE_NANG: 'Xe nâng',
  MAY_PHAT_DIEN: 'Máy phát điện', MAY_PHAT_CO: 'Máy phát cỏ', MAY_CUA: 'Máy cưa',
  MAY_BOM: 'Máy bơm', XE_MAY_2_BANH: 'Xe máy hai bánh', THIET_BI_NONG_CU: 'Thiết bị & nông cụ',
};

const assetGroupLabels: Record<string, string> = {
  MAY_CONG_TRINH: 'Máy công trình',
  MAY_NONG_NGHIEP: 'Máy nông nghiệp',
  XE_VAN_TAI_CONG_VU: 'Xe vận tải & Công vụ',
  THIET_BI_PHU_TRO: 'Máy móc & Phụ trợ',
};

const unwrapPayload = (response: any) => response.data?.data || response.data || {};

const mapVehicleResponse = (v: any): VehicleProfile => {
  const isLiquidated = isLiquidatedAssignedUnit(v.assignedUnitCode);
  return ({
  id: `V${v.id}`,
  plateNumber: v.plate || 'Chưa gắn biển',
  internalCode: v.code,
  vehicleCategory: v.vehicleType?.name || vehicleCategoryLabels[v.category] || v.category || 'Phương tiện chuyên dùng',
  categoryCode: v.category,
  vehicleTypeId: v.vehicleType?.id || v.vehicleTypeId,
  vehicleTypeCode: v.vehicleType?.code,
  vehicleTypeName: v.vehicleType?.name,
  assetGroup: v.assetGroup,
  vehicleSubtype: v.vehicleSubtype,
  brandModel: v.modelName ? `${v.name} (${v.modelName})` : v.name,
  yearManufactured: v.manufactureYear || 0,
  klhName: v.complexCode === 'KOUN_MOM' ? 'Khu liên hợp Koun Mom (Campuchia)' : (v.complexCode || 'Khu liên hợp Koun Mom'),
  teamUnit: v.managementUnit?.name || v.assignedUnitCode || (
    v.unit === 'KOUN_MOM' ? 'Đội cơ giới Nông trường 1' :
    v.unit === 'KOUN_MOM' ? 'Đội cơ giới Nông trường 2' :
    v.unit === 'KOUN_MOM' ? 'Xí nghiệp Chăn nuôi Bò' :
    v.unit === 'KOUN_MOM' ? 'Xưởng BTSC' : 'Ban Ô tô Xe máy'
  ),
  currentDriver: v.defaultDriver?.fullName || 'Chưa gán',
  status: v.status === 'HOAT_DONG' ? 'active' :
          v.status === 'BAO_DUONG' ? 'maintenance' :
          v.status === 'SUA_CHUA' ? 'repair' :
          v.status === 'TAM_DUNG' ? 'standby' : 'idle',
  rawStatus: v.status,
  currentOdoKm: v.odoKm || 0,
  currentEngineHours: v.totalMachineHours || 0,
  gpsImei: v.gpsImei || undefined,
  fuelSensorImei: v.fuelSensorImei || undefined,
  inspectionExpiry: v.inspectionExpiryDate ? new Date(v.inspectionExpiryDate).toLocaleDateString('vi-VN') : undefined,
  insuranceExpiry: undefined,
  oldCode: v.oldCode,
  bravoCode: v.bravoCode,
  assetCode: v.assetCode,
  purchaseCondition: v.purchaseCondition,
  allocationDate: v.allocationDate ? new Date(v.allocationDate).toLocaleDateString('vi-VN') : undefined,
  conditionStatus: v.conditionStatus || (
    v.status === 'SUA_CHUA' ? 'Hư hỏng / Đang sửa chữa' :
    v.status === 'BAO_DUONG' ? 'Đang bảo dưỡng' :
    v.status === 'TAM_DUNG' ? (isLiquidated ? 'Đã loại biên / Thanh lý' : 'Tạm dừng') :
    v.status === 'CHO_PHAN_CONG' ? 'Chờ phân công' : 'Bình thường'
  ),
  transferHistory: v.transferHistory,
  modelName: v.modelName,
  manufacturer: v.manufacturer,
  origin: v.origin,
  frameNumber: v.frameNumber,
  engineNumber: v.engineNumber,
  powerHp: v.powerHp,
  fuelQuotaRate: v.fuelQuotaRate ?? v.fuelRateStandard,
  fuelQuotaUnit: v.fuelQuotaUnit,
  fuelTankCapacity: v.fuelTankCapacity,
  supplier: v.supplier,
  notes: v.notes,
  imageUrl: v.imageUrl,
  contractStatus: v.contractStatus,
  companyOwner: v.companyOwner,
  assignedUnitCode: v.managementUnit?.name || v.assignedUnitCode,
  isLiquidated,
  managementUnitId: v.managementUnit?.id || v.managementUnitId,
  complexCode: v.complexCode,
  regionCode: v.regionCode,
  categoryGroup: assetGroupLabels[v.assetGroup] || 'Chưa phân loại',
  maintenanceAlertTier: v.alertTier,
  hoursSinceLastService: v.hoursSinceLastService,
  lastGpsUpdate: v.lastGpsUpdate,
  technicalSpecs: v.technicalSpecs,
  dimensions: v.dimensions,
  productivity: v.productivity,
  inspectionDate: v.inspectionDate,
  nextInspectionDate: v.nextInspectionDate,
  roadFeeDate: v.roadFeeDate,
  roadFeeExpiryDate: v.roadFeeExpiryDate,
  nextRoadFeeDate: v.nextRoadFeeDate,
  sourceSheets: Array.isArray(v.sourceSheets) ? v.sourceSheets : undefined,
  managerName: v.managementUnit?.managerAssignments?.[0]?.manager?.fullName || v.managerName,
  managerPhone: v.managementUnit?.managerAssignments?.[0]?.manager?.phone || v.managerPhone,
  managerUserId: v.managementUnit?.managerAssignments?.[0]?.manager?.id || null,
  currentLocationName: v.homeDepot?.name || v.managementUnit?.mainDepot?.name || v.currentLocationName,
  });
};

// Map database entities to Frontend React Types
export const apiService = {
  // 1. Dashboard & Live GPS
  async getDashboardOverview() {
    const res = await apiClient.get('/dashboard/overview');
    return res.data?.data || res.data;
  },

  async getLiveFleet(): Promise<VehicleGPS[]> {
    const res = await apiClient.get('/dashboard/live-fleet');
    const items = res.data?.data || res.data || [];
    return items.map((v: any) => ({
      id: `V${v.id}`,
      plateNumber: v.plate || '70C-000.00',
      code: v.code || `TA-KM-${v.id}`,
      driverName: v.defaultDriver?.fullName || 'Chưa phân công',
      driverPhone: v.defaultDriver?.phone || '0908 xxx xxx',
      vehicleType: v.category === 'MAY_KEO' ? 'Máy kéo nông nghiệp' :
                   v.category === 'MAY_CAY' ? 'Máy cày nông nghiệp' :
                   v.category === 'XE_CONTAINER' ? 'Xe tải Howo 4 chân' :
                   v.category === 'XE_BEN' ? 'Xe ben Hyundai' :
                   v.category === 'XE_BON' ? 'Xe bồn tưới nước' :
                   v.category === 'XE_XUC' ? 'Máy xúc đào' :
                   v.category === 'XE_NANG' ? 'Xe nâng hàng' : 'Xe cơ giới',
      klhName: 'Khu liên hợp Koun Mom (Campuchia)',
      subUnit: v.unit === 'KOUN_MOM' ? 'Nông trường Chuối 01' :
               v.unit === 'KOUN_MOM' ? 'Nông trường Chuối 02' :
               v.unit === 'KOUN_MOM' ? 'Xí nghiệp Chăn nuôi Bò' :
               v.unit === 'KOUN_MOM' ? 'Trung tâm BTSC' : 'Ban Xe Cơ Giới',
      status: v.status === 'HOAT_DONG' ? 'running' :
              v.status === 'BAO_DUONG' ? 'maintenance' :
              v.status === 'SUA_CHUA' ? 'maintenance' : 'idling',
      speed: v.status === 'HOAT_DONG' ? 24 : 0,
      engineRpm: v.status === 'HOAT_DONG' ? 1800 : 0,
      fuelLevelPercent: 75,
      fuelLiters: 180,
      temperature: 82,
      lat: v.currentLat || 13.5678,
      lng: v.currentLng || 106.8901,
      address: v.currentLocationName || 'Lô CN-A12 - KLH Koun Mom',
      heading: 90,
      lastUpdated: 'Vừa cập nhật',
      todayKm: v.odoKm || 0,
      todayEngineHours: v.totalMachineHours || 0,
    }));
  },

  // 2. Vehicles
  async getVehicles(params?: Record<string, unknown>): Promise<VehicleProfile[]> {
    const { page: _page, limit: _limit, ...filters } = params || {};
    const pageSize = 200;
    const firstResponse = await apiClient.get('/vehicles', {
      params: { ...filters, page: 1, limit: pageSize },
    });
    const firstPayload = unwrapPayload(firstResponse);
    const firstItems = Array.isArray(firstPayload) ? firstPayload : firstPayload.items || [];
    const totalPages = Array.isArray(firstPayload)
      ? 1
      : Math.max(1, Number(firstPayload.pagination?.totalPages || 1));

    let items = firstItems;
    if (totalPages > 1) {
      const remainingResponses = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          apiClient.get('/vehicles', {
            params: { ...filters, page: index + 2, limit: pageSize },
          })
        )
      );
      items = [
        ...firstItems,
        ...remainingResponses.flatMap((response) => {
          const payload = unwrapPayload(response);
          return Array.isArray(payload) ? payload : payload.items || [];
        }),
      ];
    }

    return items.map(mapVehicleResponse);
  },

  async getVehiclesPage(params?: Record<string, unknown>): Promise<VehicleListResponse> {
    const response = await apiClient.get('/vehicles', { params });
    const payload = unwrapPayload(response);
    const items = Array.isArray(payload) ? payload : payload.items || [];
    return {
      items: items.map(mapVehicleResponse),
      pagination: payload.pagination || {
        total: items.length,
        page: 1,
        limit: items.length,
        totalPages: 1,
      },
    };
  },

  async getVehicleFilterOptions(params?: Record<string, unknown>): Promise<VehicleFilterOptions> {
    const response = await apiClient.get('/vehicles/filter-options', { params });
    return unwrapPayload(response) as VehicleFilterOptions;
  },

  async getVehicleStatistics(params?: Record<string, unknown>): Promise<VehicleStatistics> {
    const response = await apiClient.get('/vehicles/statistics', { params });
    return unwrapPayload(response) as VehicleStatistics;
  },

  async getNextVehicleCode(category?: string, vehicleTypeId?: number, unit?: string): Promise<{ code: string; nextNumber: number; prefix: string }> {
    try {
      const response = await apiClient.get('/vehicles/next-code', {
        params: { category, vehicleTypeId, unit },
      });
      return unwrapPayload(response);
    } catch {
      return { code: '', nextNumber: 1, prefix: '' };
    }
  },

  async updateVehicle(id: number | string, data: Record<string, unknown>): Promise<VehicleProfile> {
    const numericId = typeof id === 'string' ? parseInt(id.replace(/\D/g, ''), 10) : id;
    const response = await apiClient.patch(`/vehicles/${numericId}`, data);
    const payload = unwrapPayload(response);
    return mapVehicleResponse(payload);
  },

  async createVehicle(data: Record<string, unknown>): Promise<VehicleProfile> {
    const response = await apiClient.post('/vehicles', data);
    const payload = unwrapPayload(response);
    return mapVehicleResponse(payload);
  },

  async archiveVehicle(id: number | string, reason: string): Promise<VehicleProfile> {
    const numericId = typeof id === 'string' ? parseInt(id.replace(/\D/g, ''), 10) : id;
    const response = await apiClient.delete(`/vehicles/${numericId}`, { data: { reason } });
    return mapVehicleResponse(unwrapPayload(response));
  },

  async getSosAlerts(): Promise<any[]> {
    const res = await apiClient.get('/vehicles/sos-alerts');
    const payload = unwrapPayload(res);
    return Array.isArray(payload) ? payload : payload.items || [];
  },

  async getVehicleTypes(params?: Record<string, unknown>): Promise<VehicleTypeMaster[]> {
    const response = await apiClient.get('/vehicle-types', { params });
    return unwrapPayload(response) as VehicleTypeMaster[];
  },

  async createVehicleType(data: Record<string, unknown>): Promise<VehicleTypeMaster> {
    const response = await apiClient.post('/vehicle-types', data);
    return unwrapPayload(response) as VehicleTypeMaster;
  },

  async updateVehicleType(id: number | string, data: Record<string, unknown>): Promise<VehicleTypeMaster> {
    const response = await apiClient.patch(`/vehicle-types/${id}`, data);
    return unwrapPayload(response) as VehicleTypeMaster;
  },

  async getManufacturers(): Promise<Array<{ id: number; name: string; countryName?: string; countryCode?: string; active: boolean; vehicleCount: number; modelCount: number }>> {
    const response = await apiClient.get('/vehicles/manufacturers/list');
    return unwrapPayload(response);
  },

  async createManufacturer(data: { name: string; countryName?: string; countryCode?: string }): Promise<any> {
    const response = await apiClient.post('/vehicles/manufacturers', data);
    return unwrapPayload(response);
  },

  async updateManufacturer(id: number, data: { name?: string; countryName?: string; countryCode?: string; active?: boolean }): Promise<any> {
    const response = await apiClient.patch(`/vehicles/manufacturers/${id}`, data);
    return unwrapPayload(response);
  },

  async deleteManufacturer(id: number): Promise<any> {
    const response = await apiClient.delete(`/vehicles/manufacturers/${id}`);
    return unwrapPayload(response);
  },

  async getModels(manufacturerId?: number): Promise<Array<{ id: number; name: string; manufacturerId: number; manufacturerName?: string; countryName?: string; categoryHint?: string; active: boolean; vehicleCount: number }>> {
    const response = await apiClient.get('/vehicles/models/list', { params: { manufacturerId } });
    return unwrapPayload(response);
  },

  async createModel(data: { name: string; manufacturerId: number; categoryHint?: string }): Promise<any> {
    const response = await apiClient.post('/vehicles/models', data);
    return unwrapPayload(response);
  },

  async updateModel(id: number, data: { name?: string; manufacturerId?: number; categoryHint?: string; active?: boolean }): Promise<any> {
    const response = await apiClient.patch(`/vehicles/models/${id}`, data);
    return unwrapPayload(response);
  },

  async deleteModel(id: number): Promise<any> {
    const response = await apiClient.delete(`/vehicles/models/${id}`);
    return unwrapPayload(response);
  },

  async mergeCatalogItems(data: { catalogType: string; sourceNames: string[]; targetName: string }): Promise<{ updatedVehicles: number; removedItems: number }> {
    const response = await apiClient.post('/vehicles/catalogs/merge', data);
    return unwrapPayload(response);
  },

  // 3. Production Plans
  async getProductionPlans(): Promise<ProductionPlan[]> {
    const res = await apiClient.get('/production-plans');
    const items = res.data?.data?.items || res.data?.data || res.data || [];
    return items.map((p: any) => ({
      id: `PP${p.id}`,
      planCode: p.code,
      plotName: p.lotPlot,
      cropType: 'Chuối Nam Mỹ Foc TR4',
      stage: p.stage === 'LAM_DAT' ? 'Cày ải & Làm đất' :
             p.stage === 'TRONG_MOI' ? 'Bón lót & Lên luống' : 'Thu hoạch xuất khẩu',
      startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : '15/08/2026',
      endDate: p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : '25/08/2026',
      targetAreaHa: p.targetAreaHa || 0,
      completedAreaHa: p.completedAreaHa || 0,
      assignedTractorsCount: p.assignedVehiclesCount || 0,
      quotaFuelLiters: p.fuelQuotaLiters || 0,
      actualFuelLiters: p.fuelUsedLiters || 0,
      status: p.status === 'COMPLETED' ? 'completed' :
              p.status === 'IN_PROGRESS' ? 'in_progress' : 'pending',
    }));
  },

  // 4. Dispatch Orders
  async getDispatchOrders(): Promise<DispatchOrder[]> {
    const res = await apiClient.get('/dispatch-orders');
    const items = res.data?.data?.items || res.data?.data || res.data || [];
    return items.map((d: any) => ({
      id: `DO${d.id}`,
      orderCode: d.code,
      vehiclePlate: d.vehicle?.plate || '70C-xxx.xx',
      vehicleCode: d.vehicle?.code || 'TA-KM-000',
      driverName: d.driver?.fullName || 'Tài xế',
      departurePoint: d.origin,
      destinationPoint: d.destination,
      departureTime: d.departureTime ? new Date(d.departureTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '06:30',
      purpose: d.purpose,
      approvedBy: 'Trần Quốc Đạt (Trưởng ban)',
      status: d.status === 'RUNNING' ? 'running' :
              d.status === 'APPROVED' ? 'approved' :
              d.status === 'COMPLETED' ? 'completed' : 'pending',
    }));
  },

  // 5. Fuel Warehouses & Tickets
  async getFuelTanks(): Promise<FuelTankStorage[]> {
    const res = await apiClient.get('/fuel/warehouses');
    const items = res.data?.data || res.data || [];
    return items.map((w: any) => ({
      id: `FT${w.id}`,
      tankName: w.name,
      klhName: 'Khu liên hợp Koun Mom (Campuchia)',
      fuelType: 'Diesel DO 0.05S',
      capacityLiters: w.capacityLiters || 45000,
      currentLiters: w.currentStockLiters || 38000,
      lastRefilledDate: '22/08/2026',
      status: 'normal',
    }));
  },

  async getFuelVouchers(): Promise<FuelVoucher[]> {
    const res = await apiClient.get('/fuel/tickets');
    const items = res.data?.data?.items || res.data?.data || res.data || [];
    return items.map((t: any) => ({
      id: `FV${t.id}`,
      voucherCode: t.ticketCode,
      vehiclePlate: t.vehicle?.plate || '70C-xxx.xx',
      driverName: t.driver?.fullName || 'Tài xế',
      dispensedLiters: t.dispensedLiters || 0,
      quotaLiters: t.quotaLiters || 0,
      varianceLiters: t.varianceLiters || 0,
      stationName: t.warehouse?.name || 'Kho Xăng Dầu T1',
      date: t.dispensedAt ? new Date(t.dispensedAt).toLocaleDateString('vi-VN') : '23/08/2026',
      status: t.isExcess ? 'warning' : 'approved',
    }));
  },

  // 6. Maintenance & Repairs
  async getMaintenancePlans(): Promise<MaintenancePlan[]> {
    const res = await apiClient.get('/maintenance/records');
    const items = res.data?.data?.items || res.data?.data || res.data || [];
    return items.map((m: any) => ({
      id: `MP${m.id}`,
      planCode: `BD-250H-00${m.id}`,
      vehiclePlate: m.vehicle?.plate || '70A-xxx.xx',
      vehicleName: m.vehicle?.name || 'Máy kéo',
      maintenanceType: 'Bảo dưỡng định kỳ Cấp 2 (250h)',
      currentEngineHours: m.currentHours || 0,
      nextServiceDueHours: (m.currentHours || 0) + (m.hoursToNextService || 250),
      hoursRemaining: m.hoursToNextService || 0,
      urgencyTier: m.alertTier === 'RED' ? 'red' :
                   m.alertTier === 'AMBER' ? 'amber' : 'green',
      status: m.status === 'COMPLETED' ? 'completed' :
              m.status === 'IN_SERVICE' ? 'in_progress' : 'scheduled',
      assignedWorkshop: 'Trung tâm BTSC Koun Mom',
    }));
  },

  async getWorkOrders(): Promise<WorkOrder[]> {
    const res = await apiClient.get('/repairs');
    const items = res.data?.data?.items || res.data?.data || res.data || [];
    return items.map((r: any) => ({
      id: `WO${r.id}`,
      orderCode: r.code,
      vehiclePlate: r.vehicle?.plate || '70C-xxx.xx',
      issueDescription: r.issueDescription,
      reportedBy: r.reportedByDriver?.fullName || 'Tài xế báo hỏng',
      technician: r.assignedTechnician?.fullName || 'Vũ Mạnh Hùng',
      priority: r.repairTier === 'SOS_CUU_HO' ? 'urgent' :
                r.repairTier === 'DAI_TU' ? 'high' : 'medium',
      stage: r.status === 'RECEIVED' ? 'tiep_nhan' :
             r.status === 'IN_REPAIR' ? 'dang_sua' :
             r.status === 'WAITING_PARTS' ? 'cho_vat_tu' : 'hoan_thanh',
      estimatedCostVnd: r.estimatedCostVnd || 0,
      createdDate: r.receivedDate ? new Date(r.receivedDate).toLocaleDateString('vi-VN') : '23/08/2026',
    }));
  },

  // 7. Driver KPI & Profiles
  async getDriverRankings(): Promise<DriverProfile[]> {
    const res = await apiClient.get('/driver-kpi/leaderboard-summary');
    const items = res.data?.data?.items || res.data?.data || res.data || [];
    return items.map((k: any) => ({
      id: `D${k.driverId}`,
      fullName: k.driverName || 'Lái xe THACO',
      empCode: `TX-00${k.driverId}`,
      phone: '0912 xxx xxx',
      assignedVehicle: `70C-00${k.driverId}`,
      klhName: 'Khu liên hợp Koun Mom',
      teamUnit: 'Đội cơ giới Nông trường 1',
      licenseClass: 'Hạng C / Máy nông nghiệp',
      licenseExpiry: '15/12/2027',
      kpiTripsCount: k.tripsCount || 0,
      kpiDistanceKm: k.distanceKm || 0,
      kpiMachineHours: k.machineHours || 0,
      kpiFuelSavedLiters: k.fuelSavedLiters || 0,
      kpiScore: k.totalScore || 90,
      kpiRankGrade: k.rankGrade === 'HANG_A' ? 'A (Xuất sắc)' :
                    k.rankGrade === 'HANG_B' ? 'B (Khá)' : 'C (Đạt)',
      rewardBonusVnd: k.bonusAmountVnd || 1000000,
      status: 'active',
    }));
  },

  // 8. Agricultural Implements & Attachments (Hồ sơ Nông Cụ & Thiết Bị Đính Kèm)
  async getImplements(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    unit?: string;
    managementUnitId?: number;
  }) {
    const res = await apiClient.get('/implements', { params });
    return res.data?.data || res.data;
  },

  async getAllImplements(params?: { search?: string; status?: string; category?: string; unit?: string; usageMode?: string; assetScope?: 'ALL' | 'VEHICLE_RELATED' | 'OTHER'; managerUserId?: number; managementUnitId?: number }) {
    const cleanParams = { ...params };
    if (cleanParams.assetScope === 'ALL') delete cleanParams.assetScope;
    const firstRes = await apiClient.get('/implements', { params: { ...cleanParams, page: 1, limit: 200 } });
    const firstData = firstRes.data?.data || firstRes.data;
    const items = [...(firstData?.items || [])];
    const totalPages = firstData?.pagination?.totalPages || 1;

    if (totalPages > 1) {
      const pagePromises = [];
      for (let p = 2; p <= totalPages; p++) {
        pagePromises.push(
          apiClient.get('/implements', { params: { ...cleanParams, page: p, limit: 200 } })
        );
      }
      const pageResults = await Promise.all(pagePromises);
      for (const pr of pageResults) {
        const d = pr.data?.data || pr.data;
        if (d?.items) {
          items.push(...d.items);
        }
      }
    }
    return {
      items,
      total: firstData?.pagination?.total || items.length,
    };
  },

  async getImplementFilterOptions(params?: { category?: string; unit?: string; usageMode?: string; assetScope?: 'ALL' | 'VEHICLE_RELATED' | 'OTHER'; managerUserId?: number; managementUnitId?: number }) {
    const response = await apiClient.get('/implements/filter-options', { params });
    return unwrapPayload(response) as {
      units: string[];
      locations: string[];
      categories: Array<{ code: string; count: number }>;
      managers: Array<{ id: number; name: string; phone?: string | null; implementCount: number }>;
      statuses: string[];
      technicalConditions: string[];
      usageModes: string[];
    };
  },

  async getImplementStatistics(params?: { unit?: string; category?: string; usageMode?: string; assetScope?: 'ALL' | 'VEHICLE_RELATED' | 'OTHER'; managerUserId?: number; managementUnitId?: number }): Promise<{
    totalImplements: number;
    attached: number;
    inDepot: number;
    maintenance: number;
    unassignedUnit?: number;
    condition?: {
      good: number;
      wornOut: number;
      needRepair: number;
    };
  }> {
    const cleanParams = { ...params };
    if (cleanParams.assetScope === 'ALL') delete cleanParams.assetScope;
    const res = await apiClient.get('/implements/statistics', { params: cleanParams });
    return res.data?.data || res.data;
  },

  async getCompatibleVehiclesForImplement(id: number, unit?: string): Promise<VehicleProfile[]> {
    const res = await apiClient.get(`/implements/${id}/compatible-vehicles`, { params: { unit } });
    const payload = res.data?.data || res.data;
    const items = Array.isArray(payload) ? payload : payload?.items || [];
    return items.map(mapVehicleResponse);
  },

  async attachImplement(id: number, vehicleId: number) {
    const res = await apiClient.post(`/implements/${id}/attach`, { vehicleId });
    return res.data?.data || res.data;
  },

  async detachImplement(id: number, notes?: string) {
    const res = await apiClient.post(`/implements/${id}/detach`, { notes });
    return res.data?.data || res.data;
  },

  async updateImplement(id: number, data: Partial<any>) {
    const res = await apiClient.patch(`/implements/${id}`, data);
    return res.data?.data || res.data;
  },

  async createImplement(data: any) {
    const res = await apiClient.post('/implements', data);
    return res.data?.data || res.data;
  },

  // 12. Employees & Personnel Management
  async getEmployees(params?: Record<string, unknown>) {
    const res = await apiClient.get('/catalogs/employees/list', { params });
    return res.data?.data || res.data || [];
  },

  async createEmployee(data: any) {
    const res = await apiClient.post('/catalogs/employees', data);
    return res.data?.data || res.data;
  },

  async updateEmployee(id: number, data: any) {
    const res = await apiClient.put(`/catalogs/employees/${id}`, data);
    return res.data?.data || res.data;
  },

  async deleteEmployee(id: number) {
    const res = await apiClient.delete(`/catalogs/employees/${id}`);
    return res.data?.data || res.data;
  },

  // 13. System Users
  async getUsers(params?: Record<string, unknown>) {
    const res = await apiClient.get('/users', { params });
    const payload = res.data?.data ?? res.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  },

  async createUser(data: any) {
    const res = await apiClient.post('/users', data);
    return res.data?.data || res.data;
  },

  async updateUser(id: number, data: any) {
    const res = await apiClient.patch(`/users/${id}`, data);
    return res.data?.data || res.data;
  },

  async deleteUser(id: number) {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data?.data || res.data;
  },

  async getDriverProfiles(params?: Record<string, unknown>) {
    const res = await apiClient.get('/users/drivers/profiles', { params });
    return res.data?.data || res.data;
  },

  async getDriverProfile(id: number) {
    const res = await apiClient.get(`/users/drivers/${id}/profile`);
    return res.data?.data || res.data;
  },

  async getDriverProfileOptions() {
    const res = await apiClient.get('/users/drivers/profile-options');
    return res.data?.data || res.data;
  },

  async createDriverProfile(data: Record<string, unknown>) {
    const res = await apiClient.post('/users/drivers/profiles', data);
    return res.data?.data || res.data;
  },

  async updateDriverProfile(id: number, data: Record<string, unknown>) {
    const res = await apiClient.patch(`/users/drivers/${id}/profile`, data);
    return res.data?.data || res.data;
  },

  // 14. Fleet History Events
  async getFleetHistoryEvents(params?: Record<string, unknown>) {
    const res = await apiClient.get('/vehicles/history/events', { params });
    return res.data?.data || res.data;
  },
};
