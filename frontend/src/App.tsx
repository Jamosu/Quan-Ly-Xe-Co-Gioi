import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { unifiedSchedulingEnabled } from './config/features';

// Module A: Dashboard
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Module B: GPS Realtime & Playback
import { GPSRealtimePage } from './pages/gps/GPSRealtimePage';
import { GPSPlaybackPage } from './pages/gps/GPSPlaybackPage';
import { GeofencePage } from './pages/gps/GeofencePage';
import { SpeedAlertPage } from './pages/gps/SpeedAlertPage';
import { OfflineLogsPage } from './pages/gps/OfflineLogsPage';

// Module C: Fleet Management
import { VehiclesPage } from './pages/fleet/VehiclesPage';
import { EquipmentPage } from './pages/fleet/EquipmentPage';
import { UnitAssignmentPage } from './pages/fleet/UnitAssignmentPage';
import { GPSSensorsPage } from './pages/fleet/GPSSensorsPage';
import { FleetHistoryPage } from './pages/fleet/FleetHistoryPage';
import { SosManagementPage } from './pages/fleet/SosManagementPage';

// Module D: Dispatch Orders & Operations
import { ProductionPlanPage } from './pages/dispatch/ProductionPlanPage';
import { CreateProductionPlanPage } from './pages/dispatch/CreateProductionPlanPage';
import { DispatchOrdersPage } from './pages/dispatch/DispatchOrdersPage';
import { InternalTransportPage } from './pages/dispatch/InternalTransportPage';
import { WeightTicketsPage } from './pages/dispatch/WeightTicketsPage';
import { ConstructionDispatchPage } from './pages/dispatch/ConstructionDispatchPage';
import { SpecializedPlansPage } from './pages/dispatch/SpecializedPlansPage';
import { CreateSpecializedPlanPage } from './pages/dispatch/CreateSpecializedPlanPage';
import { ResourceSchedulingPage } from './pages/dispatch/ResourceSchedulingPage';
import { AcceptanceQueuePage } from './pages/dispatch/AcceptanceQueuePage';

// Module I: Drivers Management
import { DriversListPage } from './pages/drivers/DriversListPage';
import { ShiftAssignmentPage } from './pages/drivers/ShiftAssignmentPage';
import { LicenseExpiryPage } from './pages/drivers/LicenseExpiryPage';
import { DriverViolationsPage } from './pages/drivers/DriverViolationsPage';
import { DriverKPIRankingPage } from './pages/drivers/DriverKPIRankingPage';
import { DriverMobileWorkPage } from './pages/drivers/DriverMobileWorkPage';

// Module E: Workshop & Maintenance (BTSC)
import { MaintenancePlanPage } from './pages/workshop/MaintenancePlanPage';
import { IssueReportsPage } from './pages/workshop/IssueReportsPage';
import { WorkOrdersPage } from './pages/workshop/WorkOrdersPage';
import { WorkshopKanbanPage } from './pages/workshop/WorkshopKanbanPage';
import { InspectionInsurancePage } from './pages/workshop/InspectionInsurancePage';

// Module J: Fuel Management
import { FuelVouchersPage } from './pages/fuel/FuelVouchersPage';
import { FuelQuotasPage } from './pages/fuel/FuelQuotasPage';
import { FuelReconciliationPage } from './pages/fuel/FuelReconciliationPage';
import { FuelTanksInventoryPage } from './pages/fuel/FuelTanksInventoryPage';
import { FuelDropAlertsPage } from './pages/fuel/FuelDropAlertsPage';

// Module K: Alerts & SOS
import { UnresolvedAlertsPage } from './pages/alerts/UnresolvedAlertsPage';
import { AlertHistoryPage } from './pages/alerts/AlertHistoryPage';
import { AlertThresholdsPage } from './pages/alerts/AlertThresholdsPage';
import { ViolationStatsPage } from './pages/alerts/ViolationStatsPage';

// Module F: Reports
import { VehicleProductivityReportPage } from './pages/reports/VehicleProductivityReportPage';
import { TripViolationReportPage } from './pages/reports/TripViolationReportPage';
import { DriverKPIReportPage } from './pages/reports/DriverKPIReportPage';
import { FuelConsumptionReportPage } from './pages/reports/FuelConsumptionReportPage';
import { MaintenanceCostReportPage } from './pages/reports/MaintenanceCostReportPage';
import { CrossKLHReportPage } from './pages/reports/CrossKLHReportPage';

import { ProjectCatalogsDashboardPage } from './pages/master-data/ProjectCatalogsDashboardPage';
import { PositionsCatalogPage } from './pages/master-data/PositionsCatalogPage';
import { VehicleTypesPage } from './pages/master-data/VehicleTypesPage';
import { JobTypesPage } from './pages/master-data/JobTypesPage';
import { PlotsRoutesPage } from './pages/master-data/PlotsRoutesPage';
import { SparePartsPage } from './pages/master-data/SparePartsPage';
import { TechnicalQuotasPage } from './pages/master-data/TechnicalQuotasPage';

// Module G: Permissions & Audit
import { EmployeesManagementPage } from './pages/permissions/EmployeesManagementPage';
import { UsersManagementPage } from './pages/permissions/UsersManagementPage';
import { RolesMatrixPage } from './pages/permissions/RolesMatrixPage';
import { UnitPermissionsPage } from './pages/permissions/UnitPermissionsPage';
import { AuditLogsPage } from './pages/permissions/AuditLogsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Index Redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Module A: Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Module B: GPS & Realtime */}
          <Route path="gps/realtime" element={<GPSRealtimePage />} />
          <Route path="gps/playback" element={<GPSPlaybackPage />} />
          <Route path="gps/geofence" element={<GeofencePage />} />
          <Route path="gps/speed-alert" element={<SpeedAlertPage />} />
          <Route path="gps/offline-logs" element={<OfflineLogsPage />} />

          {/* Module C: Fleet */}
          <Route path="doi-xe/ho-so-xe" element={<VehiclesPage />} />
          <Route path="doi-xe/thiet-bi" element={<EquipmentPage />} />
          <Route path="doi-xe/phan-xe" element={<UnitAssignmentPage />} />
          <Route path="doi-xe/gps-cam-bien" element={<GPSSensorsPage />} />
          <Route path="doi-xe/lich-su" element={<FleetHistoryPage />} />
          <Route path="doi-xe/quan-li-sos" element={<SosManagementPage />} />
          <Route path="doi-xe/quan-ly-sos" element={<SosManagementPage />} />

          {/* Module D: Dispatch Orders */}
          <Route path="lenh-dieu-xe" element={<Navigate to="/lenh-dieu-xe/danh-sach" replace />} />
          <Route path="lenh-dieu-xe/danh-sach" element={<DispatchOrdersPage />} />
          <Route path="lenh-dieu-xe/ke-hoach" element={<Navigate to="/lenh-dieu-xe/ke-hoach/nong-nghiep" replace />} />
          <Route path="lenh-dieu-xe/ke-hoach/nong-nghiep" element={<ProductionPlanPage />} />
          <Route path="lenh-dieu-xe/ke-hoach/cong-trinh" element={<SpecializedPlansPage key="CONSTRUCTION" kind="CONSTRUCTION" />} />
          <Route path="lenh-dieu-xe/ke-hoach/cong-trinh/tao-moi" element={<CreateSpecializedPlanPage key="CONSTRUCTION_CREATE" kind="CONSTRUCTION" />} />
          <Route path="lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo" element={<SpecializedPlansPage key="TRANSPORT" kind="TRANSPORT" />} />
          <Route path="lenh-dieu-xe/ke-hoach/van-chuyen-noi-bo/tao-moi" element={<CreateSpecializedPlanPage key="TRANSPORT_CREATE" kind="TRANSPORT" />} />
          <Route path="lenh-dieu-xe/ke-hoach/tao-moi" element={<CreateProductionPlanPage />} />
          <Route path="lenh-dieu-xe/ke-hoach/nong-nghiep/tao-moi" element={<CreateProductionPlanPage />} />
          <Route path="lenh-dieu-xe/ke-hoach/chinh-sua" element={<CreateProductionPlanPage />} />
          <Route path="lenh-dieu-xe/lenh-nong-nghiep" element={<DispatchOrdersPage />} />
          <Route path="lenh-dieu-xe/lenh-cong-trinh" element={<ConstructionDispatchPage />} />
          <Route path="lenh-dieu-xe/lenh-noi-bo" element={<InternalTransportPage />} />
          <Route path="lenh-dieu-xe/van-chuyen" element={<InternalTransportPage />} />
          <Route path="lenh-dieu-xe/ca-may" element={<Navigate to="/lenh-dieu-xe/lenh-cong-trinh" replace />} />
          <Route path="lenh-dieu-xe/phieu-can" element={<WeightTicketsPage />} />
          {unifiedSchedulingEnabled && <Route path="lenh-dieu-xe/lich-tai-nguyen" element={<ResourceSchedulingPage />} />}
          {unifiedSchedulingEnabled && <Route path="lenh-dieu-xe/nghiem-thu" element={<AcceptanceQueuePage />} />}

          {/* Module I: Drivers */}
          <Route path="lai-xe" element={<Navigate to="/lai-xe/ho-so" replace />} />
          <Route path="lai-xe/ho-so" element={<DriversListPage />} />
          <Route path="lai-xe/phan-cong" element={<ShiftAssignmentPage />} />
          <Route path="lai-xe/quan-ly-gplx" element={<LicenseExpiryPage />} />
          <Route path="lai-xe/vi-pham" element={<DriverViolationsPage />} />
          <Route path="lai-xe/kpi" element={<DriverKPIRankingPage />} />
          {unifiedSchedulingEnabled && <Route path="mobile/driver" element={<DriverMobileWorkPage />} />}

          {/* Module E: Workshop & Maintenance */}
          <Route path="xuong-btsc" element={<Navigate to="/xuong-btsc/ke-hoach" replace />} />
          <Route path="xuong-btsc/ke-hoach" element={<MaintenancePlanPage />} />
          <Route path="xuong-btsc/yeu-cau" element={<IssueReportsPage />} />
          <Route path="xuong-btsc/phieu-sua-chua" element={<WorkOrdersPage />} />
          <Route path="xuong-btsc/tien-do" element={<WorkshopKanbanPage />} />
          <Route path="xuong-btsc/dang-kiem" element={<InspectionInsurancePage />} />

          {/* Module J: Fuel */}
          <Route path="nhien-lieu" element={<Navigate to="/nhien-lieu/phieu-cap" replace />} />
          <Route path="nhien-lieu/phieu-cap" element={<FuelVouchersPage />} />
          <Route path="nhien-lieu/dinh-muc" element={<FuelQuotasPage />} />
          <Route path="nhien-lieu/doi-chieu" element={<FuelReconciliationPage />} />
          <Route path="nhien-lieu/ton-kho" element={<FuelTanksInventoryPage />} />
          <Route path="nhien-lieu/canh-bao-sut-dau" element={<FuelDropAlertsPage />} />

          {/* Module K: Alerts & SOS */}
          <Route path="canh-bao" element={<Navigate to="/canh-bao/chua-xu-ly" replace />} />
          <Route path="canh-bao/chua-xu-ly" element={<UnresolvedAlertsPage />} />
          <Route path="canh-bao/lich-su" element={<AlertHistoryPage />} />
          <Route path="canh-bao/cau-hinh" element={<AlertThresholdsPage />} />
          <Route path="canh-bao/thong-ke" element={<ViolationStatsPage />} />

          {/* Module F: Reports */}
          <Route path="bao-cao" element={<Navigate to="/bao-cao/nang-suat" replace />} />
          <Route path="bao-cao/nang-suat" element={<VehicleProductivityReportPage />} />
          <Route path="bao-cao/hanh-trinh-vi-pham" element={<TripViolationReportPage />} />
          <Route path="bao-cao/kpi-lai-xe" element={<DriverKPIReportPage />} />
          <Route path="bao-cao/nhien-lieu" element={<FuelConsumptionReportPage />} />
          <Route path="bao-cao/chi-phi-btsc" element={<MaintenanceCostReportPage />} />
          <Route path="bao-cao/so-sanh-klh" element={<CrossKLHReportPage />} />

          {/* Module H: Master Data */}
          <Route path="danh-muc" element={<Navigate to="/danh-muc/quan-ly-du-an" replace />} />
          <Route path="danh-muc/don-vi" element={<Navigate to="/danh-muc/quan-ly-du-an" replace />} />
          <Route path="danh-muc/quan-ly-du-an" element={<ProjectCatalogsDashboardPage />} />
          <Route path="danh-muc/chuc-danh" element={<PositionsCatalogPage />} />
          <Route path="danh-muc/loai-xe" element={<VehicleTypesPage />} />
          <Route path="danh-muc/loai-cong-viec" element={<Navigate to="/danh-muc/loai-cong-viec/nong-nghiep" replace />} />
          <Route path="danh-muc/loai-cong-viec/nong-nghiep" element={<JobTypesPage defaultDomain="NONG_NGHIEP" />} />
          <Route path="danh-muc/loai-cong-viec/cong-trinh" element={<JobTypesPage defaultDomain="CONG_TRINH" />} />
          <Route path="danh-muc/loai-cong-viec/van-chuyen" element={<JobTypesPage defaultDomain="VAN_CHUYEN" />} />
          <Route path="danh-muc/lo-thua-tuyen-duong" element={<PlotsRoutesPage />} />
          <Route path="danh-muc/lo-thua-tuyen-duong/nong-nghiep" element={<PlotsRoutesPage defaultTab="plots" />} />
          <Route path="danh-muc/lo-thua-tuyen-duong/cong-trinh" element={<PlotsRoutesPage defaultTab="construction" />} />
          <Route path="danh-muc/lo-thua-tuyen-duong/van-chuyen" element={<PlotsRoutesPage defaultTab="transport" />} />
          <Route path="danh-muc/dia-ban-tuyen-duong" element={<Navigate to="/danh-muc/lo-thua-tuyen-duong" replace />} />
          <Route path="danh-muc/vat-tu-phu-tung" element={<SparePartsPage />} />
          <Route path="danh-muc/dinh-muc-ky-thuat" element={<TechnicalQuotasPage />} />

          {/* Module G: Permissions */}
          <Route path="phan-quyen" element={<Navigate to="/phan-quyen/nhan-vien" replace />} />
          <Route path="phan-quyen/nhan-vien" element={<EmployeesManagementPage />} />
          <Route path="phan-quyen/quan-ly-nhan-vien" element={<EmployeesManagementPage />} />
          <Route path="phan-quyen/nguoi-dung" element={<UsersManagementPage />} />
          <Route path="phan-quyen/vai-tro" element={<RolesMatrixPage />} />
          <Route path="phan-quyen/don-vi" element={<UnitPermissionsPage />} />
          <Route path="phan-quyen/audit" element={<AuditLogsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
