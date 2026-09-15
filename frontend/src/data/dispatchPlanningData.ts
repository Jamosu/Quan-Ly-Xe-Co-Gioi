/** Shared source for weekly-plan editors and direct work-order preparation. */
export { mockComplexes, mockEnterprises, mockFarms } from './catalogData';
export {
  KLH_OPTIONS,
  getStoredPlots,
  getStoredConstructionSites,
  getStoredConstructionTeams,
  getStoredTransportRoutes,
} from './locationCatalogData';
export type {
  AgriculturalPlotItem,
  ConstructionSiteItem,
  ConstructionTeamItem,
  TransportRouteItem,
} from './locationCatalogData';
export { getStoredJobs, getStoredStages } from './jobCatalogData';
export type { MasterJobItem, MasterStageItem, JobPlanType } from './jobCatalogData';

export const CONSTRUCTION_MACHINE_OPTIONS = [
  { value: 'Máy san gạt GD555-5', label: 'Máy san gạt GD555-5', subLabel: 'Công suất 140HP • San gạt mặt đường' },
  { value: 'Xe lu rung Sakai 14 tấn', label: 'Xe lu rung Sakai 14 tấn', subLabel: 'Trọng lượng 14T • Đầm nén nền K95' },
  { value: 'Máy xúc bánh xích Komatsu PC200', label: 'Máy xúc bánh xích Komatsu PC200', subLabel: 'Dung tích gầu 0.8m³ • Đào mương/hố' },
  { value: 'Máy ủi bánh xích Cat D6', label: 'Máy ủi bánh xích Cat D6', subLabel: 'Công suất 170HP • Ủi đất, đắp bờ bao' },
  { value: 'Xe ben Howo 3 chân 15 tấn', label: 'Xe ben Howo 3 chân 15 tấn', subLabel: 'Tải trọng 15T • Vận chuyển đất đá san lấp' },
];

export const TRANSPORT_VEHICLE_OPTIONS = [
  { value: 'Xe tải ben 8 - 10 tấn', label: 'Xe tải ben 8 - 10 tấn', subLabel: 'Chở phụ phẩm tươi, bắp sinh khối' },
  { value: 'Xe tải bồn xi-téc dầu DO 10m³', label: 'Xe tải bồn xi-téc dầu DO 10m³', subLabel: 'Tiếp nhiên liệu cơ giới lưu động' },
  { value: 'Đầu kéo container 40 feet', label: 'Đầu kéo container 40 feet', subLabel: 'Vận chuyển chuối xuất khẩu ra cảng' },
  { value: 'Đoàn rơ-moóc kéo chuối 40-50HP', label: 'Đoàn rơ-moóc kéo chuối 40-50HP', subLabel: 'Kéo buồng chuối thu hoạch về xưởng' },
  { value: 'Xe bồn cấp nước sinh hoạt 8m³', label: 'Xe bồn cấp nước sinh hoạt 8m³', subLabel: 'Cấp nước sinh hoạt xí nghiệp, trại bò' },
];
