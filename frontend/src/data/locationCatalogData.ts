// ============================================================================
// LOCATION CATALOG DATA: PHÂN TÁCH RẠCH RÒI 3 PHÂN HỆ ĐỊA BÀN HOẠT ĐỘNG
// 1. Nông nghiệp: Lô / Thửa canh tác (diện tích ha, loại cây, nông trường)
// 2. Công trình: Khu vực / Phân khu thi công (mương, đập, san nền, đường, quy mô m³/km)
// 3. Vận chuyển: Tuyến đường từ Nơi đi ➔ Nơi đến (cự ly km, tốc độ GPS, loại hàng)
// ============================================================================

export const KLH_OPTIONS = [
  { code: 'KOUN_MOM', name: 'Khu liên hợp Koun Mom' },
  { code: 'SNOUL', name: 'Khu liên hợp Snoul' },
  { code: 'NAM_LAO', name: 'Khu liên hợp Nam Lào' },
];

export interface AgriculturalPlotItem {
  id: string;
  code: string; // VD: LO-KM-01
  name: string; // VD: Lô C1 - Nông trường 1
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
  complexName: string;
  enterpriseName: string; // XN Trồng trọt Chuối KM
  farmName: string; // Nông trường Chuối 1
  areaHa: number; // 25.5 ha
  cropType: string; // Chuối Nam Mỹ Foc TR4
  irrigationSystem: string; // Tưới nhỏ giọt bù áp tự động
  soilCondition: string; // Đất đỏ bazan giàu hữu cơ
  status: 'active' | 'preparing' | 'replanting';
  statusLabel: string;
  notes?: string;
}

export interface AgriculturalTeamItem {
  id: string;
  code: string; // VD: DCG-KM-01
  name: string; // VD: Đội Xe Cơ giới Nông trường Chuối 1
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
  complexName: string;
  enterpriseName: string; // Xí nghiệp Trồng trọt Chuối Koun Mom
  farmName: string; // Nông trường Chuối 1
  leaderName: string; // Nguyễn Văn Tuấn
  leaderPhone: string; // 0912.345.678
  machineCount: string; // 8 máy kéo 70-90HP, 4 máy bánh cao, 12 rơ-moóc
  personnelCount: string; // 14 lái xe & thợ máy
  assignedPlots: string; // Phụ trách Lô C1, C2, C3 Nông trường 1
  status: 'active' | 'busy' | 'maintenance';
  statusLabel: string;
  notes?: string;
}

export interface ConstructionSiteItem {
  id: string;
  code: string; // VD: KV-CT-01
  name: string; // VD: Khu vực Mương chính Koun Mom
  category: 'DAO_DAP' | 'SAN_LAP' | 'GIAO_THONG' | 'HO_DAP' | 'HA_TANG';
  categoryName: string;
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
  complexName: string;
  unitOwner: string; // Ban QLDA Xây dựng / Đội Thi công Cơ giới 1
  targetScope: string; // VD: 12,000 m³, 4.5 km, 8.0 ha
  targetUnit: string; // m³, km, ha, cụm
  recommendedMachines: string; // Xe đào 0.8m³, Xe ủi D6, Xe lu rung
  estimatedDays: number; // 45 ngày
  status: 'in_progress' | 'preparing' | 'completed';
  statusLabel: string;
  notes?: string;
}

export interface ConstructionTeamItem {
  id: string;
  code: string; // VD: DTC-KM-01
  name: string; // VD: Đội Xe Cơ giới Thi công Công trình 1
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
  complexName: string;
  managingUnit: string; // Ban Quản lý Xây dựng & Hạ tầng Koun Mom
  leaderName: string; // Nguyễn Văn Tuấn
  leaderPhone: string; // 0912.345.678
  machineCount: string; // 14 đầu máy (5 máy đào, 3 máy ủi, 2 máy san, 4 xe lu)
  personnelCount: string; // 18 thợ máy & lái xe
  assignedAreas: string; // Khu vực Mương chính & Cụm cống hộp Lô C1-C2
  status: 'active' | 'busy' | 'maintenance';
  statusLabel: string;
  notes?: string;
}

export interface TransportRouteItem {
  id: string;
  code: string; // VD: TD-KM-01
  name: string; // VD: Kho Tổng Vật tư ➔ Trạm sơ chế NT1
  origin: string; // Điểm xuất phát (Từ nơi...)
  destination: string; // Điểm đến (Đến nơi...)
  distanceKm: number; // 12.5 km
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
  complexName: string;
  cargoType: string; // Chuối tươi xuất khẩu
  speedLimitKmH: number; // 35 km/h
  recommendedVehicles: string; // Xe đầu kéo + Rơ-moóc cont / Xe tải thùng 8T
  status: 'active' | 'maintenance';
  statusLabel: string;
  notes?: string;
}

// ----------------------------------------------------------------------------
// 1. DANH MỤC LÔ THỬA NÔNG NGHIỆP (LÔ / THỬA / HÉC-TA)
// ----------------------------------------------------------------------------
export const MASTER_AGRICULTURAL_PLOTS: AgriculturalPlotItem[] = [
  {
    id: 'PLOT-KM-01',
    code: 'LO-KM-01',
    name: 'Lô C1 - Nông trường Chuối 1',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom',
    farmName: 'Nông trường Chuối 1',
    areaHa: 25.5,
    cropType: 'Chuối Nam Mỹ Foc TR4 (Vụ 2)',
    irrigationSystem: 'Tưới nhỏ giọt bù áp tự động Netafim',
    soilCondition: 'Đất đỏ bazan tầng canh tác sâu > 1.2m',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Khu vực ưu tiên cơ giới hóa khâu cày ngầm và phun thuốc boom.',
  },
  {
    id: 'PLOT-KM-02',
    code: 'LO-KM-02',
    name: 'Lô C2 - Nông trường Chuối 1',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom',
    farmName: 'Nông trường Chuối 1',
    areaHa: 28.0,
    cropType: 'Chuối Nam Mỹ Foc TR4 (Vụ 1)',
    irrigationSystem: 'Tưới nhỏ giọt bù áp tự động Netafim',
    soilCondition: 'Đất đỏ bazan thoát nước tốt',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Đang chuẩn bị thu hoạch đợt 1 trong tháng 9.',
  },
  {
    id: 'PLOT-KM-03',
    code: 'LO-KM-03',
    name: 'Lô A1 - Nông trường Chuối 2',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom',
    farmName: 'Nông trường Chuối 2',
    areaHa: 32.4,
    cropType: 'Chuối Nam Mỹ cấy mô Foc TR4',
    irrigationSystem: 'Tưới nhỏ giọt kết hợp châm phân Fertigation',
    soilCondition: 'Đất phù sa cổ xen kẹp bazan',
    status: 'preparing',
    statusLabel: 'Đang làm đất',
    notes: 'Kế hoạch điều xe cày lật và bừa đĩa tạo luống chuẩn bị xuống giống.',
  },
  {
    id: 'PLOT-KM-04',
    code: 'LO-KM-04',
    name: 'Lô A2 - Nông trường Chuối 2',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom',
    farmName: 'Nông trường Chuối 2',
    areaHa: 30.0,
    cropType: 'Chuối Nam Mỹ cấy mô Foc TR4',
    irrigationSystem: 'Tưới nhỏ giọt bù áp',
    soilCondition: 'Đất đỏ bazan bằng phẳng',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Đang bón phân định kỳ và tỉa chồi cơ giới.',
  },
  {
    id: 'PLOT-KM-05',
    code: 'LO-KM-05',
    name: 'Lô B1 - Khu Thức ăn gia súc Koun Mom',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Chăn nuôi Bò Koun Mom',
    farmName: 'Vùng đệm Cỏ voi Packchong',
    areaHa: 45.0,
    cropType: 'Cỏ voi Packchong 1 ủ chua',
    irrigationSystem: 'Tưới súng phun mưa bán tự động',
    soilCondition: 'Đất thịt pha cát màu mỡ',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Vùng trồng cung cấp thức ăn xanh định kỳ cho trại bò thịt.',
  },
  {
    id: 'PLOT-KM-06',
    code: 'LO-KM-06',
    name: 'Lô B2 - Khu Thức ăn gia súc Koun Mom',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Chăn nuôi Bò Koun Mom',
    farmName: 'Vùng đệm Bắp sinh khối',
    areaHa: 38.5,
    cropType: 'Bắp sinh khối chuyên ủ chua',
    irrigationSystem: 'Tưới phun xoay tâm trục tự hành',
    soilCondition: 'Đất phù sa bãi bồi',
    status: 'replanting',
    statusLabel: 'Tái canh',
    notes: 'Thu hoạch xong đợt 2, đang cày phay xử lý gốc rạ tái canh vụ mới.',
  },
  {
    id: 'PLOT-SN-01',
    code: 'LO-SN-01',
    name: 'Lô Chuối NT1 - Snoul',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    enterpriseName: 'Xí nghiệp Nông nghiệp Snoul',
    farmName: 'Nông trường Chuối Snoul 1',
    areaHa: 26.8,
    cropType: 'Chuối Nam Mỹ Foc TR4',
    irrigationSystem: 'Tưới nhỏ giọt bù áp Netafim',
    soilCondition: 'Đất đỏ bazan đồi dốc thoải < 5%',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Xe kéo moóc cần chú ý tốc độ dưới 15 km/h khi chở chuối thu hoạch.',
  },
  {
    id: 'PLOT-SN-02',
    code: 'LO-SN-02',
    name: 'Lô Cao su KT2 - Snoul',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    enterpriseName: 'Xí nghiệp Cao su Snoul',
    farmName: 'Nông trường Cao su 2',
    areaHa: 52.0,
    cropType: 'Cao su khai thác mủ năm 6',
    irrigationSystem: 'Tự nhiên theo mùa mưa',
    soilCondition: 'Đất xám bạc màu pha sỏi đỏ',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Xe cơ giới phục vụ phát cỏ luồng và vận chuyển mủ đông.',
  },
  {
    id: 'PLOT-NL-01',
    code: 'LO-NL-01',
    name: 'Lô Cây ăn trái Paksong 1',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    enterpriseName: 'Xí nghiệp Cây ăn trái Nam Lào',
    farmName: 'Nông trường Paksong',
    areaHa: 40.0,
    cropType: 'Bơ booth & Sầu riêng Monthong',
    irrigationSystem: 'Tưới phun gốc tự động tiết kiệm nước',
    soilCondition: 'Đất đỏ bazan cao nguyên Bolaven',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Độ cao 1,000m, khí hậu mát mẻ, địa hình dốc bậc thang.',
  },
  {
    id: 'PLOT-NL-02',
    code: 'LO-NL-02',
    name: 'Lô Cỏ chăn nuôi Attapeu 1',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    enterpriseName: 'Xí nghiệp Chăn nuôi Bò Nam Lào',
    farmName: 'Nông trường Bò Attapeu',
    areaHa: 60.0,
    cropType: 'Cỏ voi Mombasa Ghine',
    irrigationSystem: 'Kênh dẫn nước tràn tự nhiên',
    soilCondition: 'Đất thịt sét ven sông Sekong',
    status: 'active',
    statusLabel: 'Đang canh tác',
    notes: 'Máy cắt cỏ liên hợp và xe vận chuyển thức ăn hoạt động hàng ngày.',
  },
];

// ----------------------------------------------------------------------------
// 1.2 DANH MỤC ĐỘI XE CƠ GIỚI NÔNG NGHIỆP (ĐỘI CƠ GIỚI NÔNG TRƯỜNG / XÍ NGHIỆP)
// ----------------------------------------------------------------------------
export const MASTER_AGRICULTURAL_TEAMS: AgriculturalTeamItem[] = [
  {
    id: 'TEAM-AGRI-KM-01',
    code: 'DCG-KM-01',
    name: 'Đội Xe Cơ giới Nông trường Chuối 1',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom',
    farmName: 'Nông trường Chuối 1',
    leaderName: 'Trần Văn Mạnh',
    leaderPhone: '0918.112.233',
    machineCount: '8 máy kéo 70-90HP, 4 máy phun boom, 16 rơ-moóc',
    personnelCount: '16 lái xe & kỹ thuật viên',
    assignedPlots: 'Lô C1, C2, C3 Nông trường 1',
    status: 'active',
    statusLabel: 'Sẵn sàng',
    notes: 'Chuyên trách làm đất cày ngầm, bón lót và vận chuyển chuối thu hoạch.',
  },
  {
    id: 'TEAM-AGRI-KM-02',
    code: 'DCG-KM-02',
    name: 'Đội Xe Cơ giới Nông trường Chuối 2',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom',
    farmName: 'Nông trường Chuối 2',
    leaderName: 'Lê Hoàng Nam',
    leaderPhone: '0919.445.566',
    machineCount: '6 máy kéo 70HP, 3 máy bừa đĩa, 12 rơ-moóc',
    personnelCount: '12 lái xe',
    assignedPlots: 'Lô A1, A2 Nông trường 2',
    status: 'active',
    statusLabel: 'Sẵn sàng',
    notes: 'Phụ trách khâu xới đất, lên luống và đặt bầu cây giống.',
  },
  {
    id: 'TEAM-AGRI-KM-03',
    code: 'DCG-KM-03',
    name: 'Đội Cơ giới Vùng thức ăn & Trại Bò Koun Mom',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseName: 'Xí nghiệp Chăn nuôi Bò Koun Mom',
    farmName: 'Vùng đệm Cỏ voi Packchong',
    leaderName: 'Nguyễn Quốc Bảo',
    leaderPhone: '0903.778.899',
    machineCount: '5 máy cắt cỏ liên hợp, 4 xe băm sinh khối, 6 xe tải ben',
    personnelCount: '14 nhân sự',
    assignedPlots: 'Lô B1, B2 Vùng đệm Thức ăn',
    status: 'active',
    statusLabel: 'Sẵn sàng',
    notes: 'Cắt cỏ tươi, băm ủ chua sinh khối bắp và chuyển về hầm ủ trại bò.',
  },
  {
    id: 'TEAM-AGRI-SN-01',
    code: 'DCG-SN-01',
    name: 'Đội Xe Cơ giới Nông trường Chuối Snoul',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    enterpriseName: 'Xí nghiệp Nông nghiệp Snoul',
    farmName: 'Nông trường Chuối Snoul 1',
    leaderName: 'Phạm Đức Thịnh',
    leaderPhone: '0988.223.344',
    machineCount: '7 máy kéo Kubota, 4 dàn băm thân chuối, 14 rơ-moóc',
    personnelCount: '15 lái xe',
    assignedPlots: 'Lô Chuối NT1 - Snoul',
    status: 'active',
    statusLabel: 'Sẵn sàng',
    notes: 'Đội phụ trách toàn diện quy trình cơ giới hóa nông trường chuối Snoul.',
  },
  {
    id: 'TEAM-AGRI-SN-02',
    code: 'DCG-SN-02',
    name: 'Đội Xe Cơ giới Nông trường Cao su 2 Snoul',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    enterpriseName: 'Xí nghiệp Cao su Snoul',
    farmName: 'Nông trường Cao su 2',
    leaderName: 'Hoàng Văn Dũng',
    leaderPhone: '0977.556.677',
    machineCount: '4 máy kéo bánh xích phát cỏ luồng, 3 xe bồn chở mủ',
    personnelCount: '9 lái xe',
    assignedPlots: 'Lô Cao su KT2 - Snoul',
    status: 'active',
    statusLabel: 'Sẵn sàng',
    notes: 'Phát cỏ hàng cây cao su và thu gom vận chuyển mủ đông về nhà máy.',
  },
  {
    id: 'TEAM-AGRI-NL-01',
    code: 'DCG-NL-01',
    name: 'Đội Xe Cơ giới Nông trường Paksong (Nam Lào)',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    enterpriseName: 'Xí nghiệp Cây ăn trái Nam Lào',
    farmName: 'Nông trường Paksong',
    leaderName: 'Đỗ Hữu Thắng',
    leaderPhone: '0933.889.900',
    machineCount: '6 máy kéo nhỏ bánh lốp, 4 hệ thống phun sương cao áp',
    personnelCount: '10 nhân sự',
    assignedPlots: 'Lô Cây ăn trái Paksong 1',
    status: 'active',
    statusLabel: 'Sẵn sàng',
    notes: 'Phục vụ vùng cây ăn trái cao nguyên Paksong (Bơ, Sầu riêng).',
  },
  {
    id: 'TEAM-AGRI-NL-02',
    code: 'DCG-NL-02',
    name: 'Đội Cơ giới Đồng cỏ Attapeu (Nam Lào)',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    enterpriseName: 'Xí nghiệp Chăn nuôi Bò Nam Lào',
    farmName: 'Nông trường Bò Attapeu',
    leaderName: 'Vũ Đình Trọng',
    leaderPhone: '0912.667.788',
    machineCount: '6 máy cắt cỏ liên hợp, 4 xe tải thùng chuyển thức ăn',
    personnelCount: '12 lái xe',
    assignedPlots: 'Lô Cỏ chăn nuôi Attapeu 1',
    status: 'active',
    statusLabel: 'Sẵn sàng',
    notes: 'Vận hành thu hoạch đồng cỏ Mombasa ven sông Sekong cấp thức ăn cho bò.',
  },
];

// ----------------------------------------------------------------------------
// 2. DANH MỤC KHU VỰC THI CÔNG CÔNG TRÌNH (KHU VỰC / PHÂN KHU / MƯƠNG / ĐẬP)
// ----------------------------------------------------------------------------
export const MASTER_CONSTRUCTION_SITES: ConstructionSiteItem[] = [
  {
    id: 'SITE-KM-01',
    code: 'KV-CT-01',
    name: 'Khu vực Mương chính Koun Mom (Kênh cấp 1)',
    category: 'DAO_DAP',
    categoryName: 'Đào đắp mương máng',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    unitOwner: 'Ban Quản lý Dự án & Hạ tầng Koun Mom',
    targetScope: '14,500 m³ đào đắp',
    targetUnit: 'm³',
    recommendedMachines: 'Xe đào bánh xích 0.8m³, Xe ben 15T',
    estimatedDays: 60,
    status: 'in_progress',
    statusLabel: 'Đang thi công',
    notes: 'Nạo vét bùn lắng và mở rộng lòng kênh thoát lũ trước mùa mưa.',
  },
  {
    id: 'SITE-KM-02',
    code: 'KV-CT-02',
    name: 'Khu San lấp Mặt bằng Xưởng đóng gói số 2',
    category: 'SAN_LAP',
    categoryName: 'San lấp mặt bằng',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    unitOwner: 'Đội Xe Cơ giới Thi công Công trình 1',
    targetScope: '6.5 ha tạo cos nền',
    targetUnit: 'ha',
    recommendedMachines: 'Xe ủi D6, Máy san gạt, Xe lu rung 14T',
    estimatedDays: 35,
    status: 'in_progress',
    statusLabel: 'Đang thi công',
    notes: 'Lu lèn k95 phục vụ đổ sàn bê tông nhà xưởng đóng chuối xuất khẩu.',
  },
  {
    id: 'SITE-KM-03',
    code: 'KV-CT-03',
    name: 'Tuyến đường giao thông nội bộ Trục chính D1',
    category: 'GIAO_THONG',
    categoryName: 'Làm đường giao thông nội bộ',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    unitOwner: 'Đội Thi công Cầu đường KLH Koun Mom',
    targetScope: '8.2 km rải cấp phối đá dăm',
    targetUnit: 'km',
    recommendedMachines: 'Máy san gạt Komatsu, Xe lu rung Hamm, Xe tưới nước',
    estimatedDays: 45,
    status: 'in_progress',
    statusLabel: 'Đang thi công',
    notes: 'Tuyến huyết mạch kết nối Kho Tổng ra các Nông trường 1, 2, 3.',
  },
  {
    id: 'SITE-KM-04',
    code: 'KV-CT-04',
    name: 'Khu Hồ lắng & Trạm bơm tưới tiêu NT1',
    category: 'HO_DAP',
    categoryName: 'Hồ đập chứa nước & Trạm bơm',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    unitOwner: 'Ban Quản lý Hạ tầng Thủy lợi Koun Mom',
    targetScope: 'Hồ dung tích 80,000 m³',
    targetUnit: 'cụm hồ',
    recommendedMachines: 'Xe đào cần dài 16m, Máy đầm cóc, Xe ben',
    estimatedDays: 50,
    status: 'preparing',
    statusLabel: 'Chuẩn bị mặt bằng',
    notes: 'Đắp bờ đập đất sét chống thấm và lắp đặt ống hút trạm bơm tưới tiêu.',
  },
  {
    id: 'SITE-KM-05',
    code: 'KV-CT-05',
    name: 'Khu Đắp đê bao ngăn lũ Nông trường 3',
    category: 'DAO_DAP',
    categoryName: 'Đào đắp mương máng & Đê bao',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    unitOwner: 'Đội Xe Cơ giới Thi công Công trình 2',
    targetScope: '5.6 km đê bao chống ngập',
    targetUnit: 'km',
    recommendedMachines: 'Xe ủi đất D6, Xe đào 0.8m³, Xe lu bánh lốp',
    estimatedDays: 40,
    status: 'in_progress',
    statusLabel: 'Đang thi công',
    notes: 'Đắp đất tôn cao mặt đê 1.5m ngăn nước tràn từ sông Sesan.',
  },
  {
    id: 'SITE-KM-06',
    code: 'KV-CT-06',
    name: 'Cụm Cống hộp qua đường Lô C1 - C2',
    category: 'HA_TANG',
    categoryName: 'Cầu cống & Hạ tầng kỹ thuật',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    unitOwner: 'Đội Xây dựng Thủy lợi Nội đồng',
    targetScope: '4 cống hộp đôi 2x2m',
    targetUnit: 'cụm cống',
    recommendedMachines: 'Xe cẩu 25T, Xe đào 0.5m³, Máy trộn bê tông',
    estimatedDays: 20,
    status: 'completed',
    statusLabel: 'Hoàn thành',
    notes: 'Đã nghiệm thu thông dòng nước tiêu úng cho khu vực chuối NT1.',
  },
  {
    id: 'SITE-SN-01',
    code: 'KV-CT-07',
    name: 'Khu San lấp Mở rộng Trại Bò Snoul',
    category: 'SAN_LAP',
    categoryName: 'San lấp mặt bằng',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    unitOwner: 'Đội Xe Cơ giới Thi công Snoul',
    targetScope: '10.0 ha tạo mặt bằng chuồng trại',
    targetUnit: 'ha',
    recommendedMachines: 'Xe ủi D65, Xe đào 1.2m³, Xe ben 3 chân',
    estimatedDays: 45,
    status: 'in_progress',
    statusLabel: 'Đang thi công',
    notes: 'Bạt đồi đất cao bù đắp vào khu trũng theo độ dốc 2% thoát phân lỏng.',
  },
  {
    id: 'SITE-SN-02',
    code: 'KV-CT-08',
    name: 'Đường vành đai bảo vệ rừng cao su Snoul',
    category: 'GIAO_THONG',
    categoryName: 'Làm đường giao thông nội bộ',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    unitOwner: 'Đội Quản lý Rừng & Công trình Snoul',
    targetScope: '12.0 km đường đất cấp phối sỏi phèn',
    targetUnit: 'km',
    recommendedMachines: 'Máy san gạt, Xe lu rung, Xe ủi đất',
    estimatedDays: 30,
    status: 'in_progress',
    statusLabel: 'Đang thi công',
    notes: 'Đường kết hợp băng cản lửa phòng chống cháy mùa khô.',
  },
  {
    id: 'SITE-NL-01',
    code: 'KV-CT-09',
    name: 'Hồ chứa nước thủy lợi cao nguyên Paksong',
    category: 'HO_DAP',
    categoryName: 'Hồ đập chứa nước & Trạm bơm',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    unitOwner: 'Ban Quản lý Dự án Nam Lào',
    targetScope: 'Dung tích 120,000 m³',
    targetUnit: 'hồ chứa',
    recommendedMachines: 'Xe đào Komatsu PC300, Xe ben Howo 4 chân',
    estimatedDays: 75,
    status: 'in_progress',
    statusLabel: 'Đang thi công',
    notes: 'Đào sâu lòng hồ tích trữ nước suối tự nhiên phục vụ tưới mùa khô.',
  },
  {
    id: 'SITE-NL-02',
    code: 'KV-CT-10',
    name: 'Cải tạo đường đèo dốc Nông trường Bò Attapeu',
    category: 'GIAO_THONG',
    categoryName: 'Làm đường giao thông nội bộ',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    unitOwner: 'Đội Xe Cơ giới Hạ tầng Attapeu',
    targetScope: '6.5 km gia cố lề đường và mương đá',
    targetUnit: 'km',
    recommendedMachines: 'Xe đào có búa đập đá, Xe ben, Xe lu rung',
    estimatedDays: 40,
    status: 'preparing',
    statusLabel: 'Chuẩn bị mặt bằng',
    notes: 'Hạ độ dốc các khúc cua tay áo nguy hiểm cho xe chở cỏ tải trọng lớn.',
  },
];

// ----------------------------------------------------------------------------
// 2.1 DANH MỤC ĐỘI THI CÔNG CƠ GIỚI (THUỘC SỰ QUẢN LÝ BÊN BAN XÂY DỰNG THEO KLH)
// ----------------------------------------------------------------------------
export const MASTER_CONSTRUCTION_TEAMS: ConstructionTeamItem[] = [
  {
    id: 'TEAM-KM-01',
    code: 'DTC-KM-01',
    name: 'Đội Xe Cơ giới Thi công Công trình 1',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    managingUnit: 'Ban Quản lý Xây dựng & Hạ tầng Koun Mom',
    leaderName: 'Nguyễn Văn Tuấn',
    leaderPhone: '0912.345.678',
    machineCount: '14 đầu máy (5 máy đào PC200, 3 máy ủi D6, 2 máy san, 4 xe lu)',
    personnelCount: '18 thợ máy & lái xe',
    assignedAreas: 'KV-CT-01 (Mương chính), KV-CT-06 (Cống hộp Lô C1-C2)',
    status: 'active',
    statusLabel: 'Đang thi công',
    notes: 'Phụ trách đào đắp thủy lợi nội đồng và cống tiêu úng nông trường.',
  },
  {
    id: 'TEAM-KM-02',
    code: 'DTC-KM-02',
    name: 'Đội Thi công Cầu đường & San lấp Mặt bằng',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    managingUnit: 'Ban Quản lý Xây dựng & Hạ tầng Koun Mom',
    leaderName: 'Trần Hữu Thắng',
    leaderPhone: '0988.765.432',
    machineCount: '12 đầu máy (4 máy ủi D6R, 2 máy san gạt Komatsu, 3 xe lu Hamm, 3 xe bồn)',
    personnelCount: '15 thợ máy & tài xế',
    assignedAreas: 'KV-CT-02 (Mặt bằng xưởng 2), KV-CT-03 (Trục đường chính D1)',
    status: 'active',
    statusLabel: 'Đang thi công',
    notes: 'Chuyên trách tạo cos nền xưởng và rải cấp phối lu lèn đường K95.',
  },
  {
    id: 'TEAM-KM-03',
    code: 'DTC-KM-03',
    name: 'Đội Hạ tầng Thủy lợi & Đê bao Ngăn lũ',
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    managingUnit: 'Ban Quản lý Xây dựng & Hạ tầng Koun Mom',
    leaderName: 'Lê Hoàng Long',
    leaderPhone: '0903.112.233',
    machineCount: '10 đầu máy (4 xe đào cần dài 16m, 2 xe ủi D6, 4 xe ben 15T)',
    personnelCount: '12 thợ máy',
    assignedAreas: 'KV-CT-04 (Hồ lắng NT1), KV-CT-05 (Đê bao NT3)',
    status: 'active',
    statusLabel: 'Đang thi công',
    notes: 'Đắp bờ đập đất sét chống thấm và nâng cao mặt đê ngăn lũ sông Sesan.',
  },
  {
    id: 'TEAM-SN-01',
    code: 'DTC-SN-01',
    name: 'Đội Thi công Cơ giới & San gạt Snoul',
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    managingUnit: 'Ban Quản lý Xây dựng & Hạ tầng Snoul',
    leaderName: 'Phạm Quốc Hùng',
    leaderPhone: '0918.889.900',
    machineCount: '11 đầu máy (4 máy đào, 3 máy ủi, 2 xe lu rung, 2 xe ben)',
    personnelCount: '14 thợ máy & lái xe',
    assignedAreas: 'KV-CT-07 (Đập ngăn Snoul), KV-CT-08 (Đường vành đai)',
    status: 'active',
    statusLabel: 'Đang thi công',
    notes: 'Phụ trách toàn bộ hạ tầng thoát nước và đường liên lô cao su Snoul.',
  },
  {
    id: 'TEAM-NL-01',
    code: 'DTC-NL-01',
    name: 'Đội Thi công Công trình & Thủy lợi Nam Lào',
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    managingUnit: 'Ban Quản lý Xây dựng & Hạ tầng Nam Lào',
    leaderName: 'Đặng Văn Minh',
    leaderPhone: '0977.654.321',
    machineCount: '12 đầu máy (5 máy đào bánh xích, 3 máy ủi, 2 xe lu, 2 xe ben)',
    personnelCount: '16 thợ máy & tài xế',
    assignedAreas: 'KV-CT-09 (Hồ thủy lợi Paksong), KV-CT-10 (Đường đèo Attapeu)',
    status: 'active',
    statusLabel: 'Đang thi công',
    notes: 'Thi công hồ tích trữ nước suối Paksong và hạ độ dốc đường dốc Attapeu.',
  },
];

// ----------------------------------------------------------------------------
// 3. DANH MỤC TUYẾN ĐƯỜNG VẬN CHUYỂN NỘI BỘ (TỪ NƠI... ➔ ĐẾN NƠI...)
// ----------------------------------------------------------------------------
export const MASTER_TRANSPORT_ROUTES: TransportRouteItem[] = [
  {
    id: 'ROUTE-KM-01',
    code: 'TD-KM-01',
    name: 'Kho Tổng Vật tư ➔ Trạm sơ chế Chuối NT1',
    origin: 'Kho Tổng Vật tư KLH Koun Mom',
    destination: 'Trạm sơ chế đóng gói NT1',
    distanceKm: 12.5,
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    cargoType: 'Bao bì carton, tem nhãn, phân bón hòa tan',
    speedLimitKmH: 35,
    recommendedVehicles: 'Xe tải thùng 8 tấn / Xe ben 3 chân',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Đường cấp phối đá dăm rộng 7m, xe qua cầu Suối Cạn chú ý tải trọng.',
  },
  {
    id: 'ROUTE-KM-02',
    code: 'TD-KM-02',
    name: 'Xưởng Đóng gói Chuối NT1 ➔ Cảng Quốc tế Sihanoukville',
    origin: 'Xưởng Đóng gói Chuối NT1',
    destination: 'Cảng Quốc tế Sihanoukville (PAS Port)',
    distanceKm: 380.0,
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    cargoType: 'Chuối tươi xuất khẩu đóng cont lạnh 40ft',
    speedLimitKmH: 60,
    recommendedVehicles: 'Xe đầu kéo container lạnh Genset 40ft',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Tuyến quốc lộ đường dài có gắn trạm kiểm soát GPS nhiệt độ buồng lạnh.',
  },
  {
    id: 'ROUTE-KM-03',
    code: 'TD-KM-03',
    name: 'Vườn chuối NT1 (Lô C1) ➔ Xưởng sơ chế đóng gói NT1',
    origin: 'Bãi tập kết Lô C1 - NT1',
    destination: 'Nhà xưởng sơ chế đóng gói NT1',
    distanceKm: 3.5,
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    cargoType: 'Buồng chuối tươi cắt cuống',
    speedLimitKmH: 15,
    recommendedVehicles: 'Máy kéo 70HP kéo rơ-moóc chuyên dụng treo chuối',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Tốc độ tối đa 15 km/h để chống va đập trầy xước buồng chuối.',
  },
  {
    id: 'ROUTE-KM-04',
    code: 'TD-KM-04',
    name: 'Xưởng Đóng gói Chuối NT1 & NT2 ➔ Xí nghiệp Bò Koun Mom',
    origin: 'Xưởng Đóng gói NT1 & NT2',
    destination: 'Trại Bò thịt - Xí nghiệp Chăn nuôi Bò',
    distanceKm: 8.0,
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    cargoType: 'Thân cây, lá chuối và chuối dạt làm thức ăn ủ chua',
    speedLimitKmH: 30,
    recommendedVehicles: 'Xe ben tự đổ 10 - 15 tấn / Rơ-moóc thùng bạt',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Vận chuyển phụ phẩm tươi ngay trong ca làm việc tránh ôi thiu.',
  },
  {
    id: 'ROUTE-KM-05',
    code: 'TD-KM-05',
    name: 'Kho Xăng dầu Trung tâm ➔ Bồn đệm Đội cơ giới NT2',
    origin: 'Kho Xăng dầu Trung tâm KLH Koun Mom',
    destination: 'Bồn đệm cấp phát dầu Đội Cơ giới NT2',
    distanceKm: 14.0,
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    cargoType: 'Dầu Diesel 0.05S chuyên dùng cho xe máy kéo',
    speedLimitKmH: 35,
    recommendedVehicles: 'Xe bồn xi-téc chuyên dụng PCCC 8,000 Lít',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Yêu cầu giấy phép vận chuyển hàng nguy hiểm dễ cháy nổ.',
  },
  {
    id: 'ROUTE-KM-06',
    code: 'TD-KM-06',
    name: 'Bãi ủ phân hữu cơ vi sinh ➔ Lô C3 chuẩn bị đất',
    origin: 'Nhà máy ủ Phân vi sinh Koun Mom',
    destination: 'Lô C3 - Vùng đất chuẩn bị trồng mới NT1',
    distanceKm: 6.2,
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    cargoType: 'Phân chuồng ủ hoai mục và vôi bột rải lót',
    speedLimitKmH: 25,
    recommendedVehicles: 'Xe ben tải trung và thùng rải phân chuyên dụng',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Che bạt kín thùng xe chống rơi vãi ra mặt đường giao thông.',
  },
  {
    id: 'ROUTE-SN-01',
    code: 'TD-SN-01',
    name: 'Nông trường Cao su Snoul ➔ Nhà máy chế biến mủ Snoul',
    origin: 'Trạm thu mủ Nông trường Cao su 1 & 2',
    destination: 'Nhà máy chế biến mủ cốm Snoul',
    distanceKm: 14.2,
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    cargoType: 'Mủ cao su đông và mủ nước tươi',
    speedLimitKmH: 40,
    recommendedVehicles: 'Xe tải gắn bồn chuyên chở mủ cao su',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Kiểm tra van xả và nắp bồn chứa kín trước khi khởi hành.',
  },
  {
    id: 'ROUTE-SN-02',
    code: 'TD-SN-02',
    name: 'Kho Nông sản Snoul ➔ Cửa khẩu Quốc tế Hoa Lư (Bình Phước)',
    origin: 'Tổng kho Nông sản KLH Snoul',
    destination: 'Cửa khẩu Quốc tế Hoa Lư - Việt Nam',
    distanceKm: 45.0,
    complexCode: 'SNOUL',
    complexName: 'Khu liên hợp Snoul',
    cargoType: 'Chuối đóng thùng và mủ cao su thương phẩm',
    speedLimitKmH: 50,
    recommendedVehicles: 'Xe container 40ft / Xe tải nặng 15T',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Thực hiện thủ tục hải quan xuất nhập khẩu điện tử trước khi đến cửa khẩu.',
  },
  {
    id: 'ROUTE-NL-01',
    code: 'TD-NL-01',
    name: 'Cánh đồng cỏ Paksong ➔ Trại Bò giống Nam Lào',
    origin: 'Vùng đệm cánh đồng cỏ voi Paksong',
    destination: 'Trại Bò giống công nghệ cao Nam Lào',
    distanceKm: 22.0,
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    cargoType: 'Cỏ voi băm nhỏ ủ men vi sinh',
    speedLimitKmH: 40,
    recommendedVehicles: 'Xe ben 3 chân chuyên dụng chở cỏ sinh khối',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Tuyến đường cao nguyên dốc nhẹ, tài xế kiểm tra phanh và số thấp khi xuống đèo.',
  },
  {
    id: 'ROUTE-NL-02',
    code: 'TD-NL-02',
    name: 'Trang trại Attapeu ➔ Cửa khẩu Quốc tế Bờ Y (Kon Tum)',
    origin: 'Kho trung tâm KLH Nam Lào (Attapeu)',
    destination: 'Cửa khẩu Quốc tế Bờ Y - Kon Tum, Việt Nam',
    distanceKm: 95.0,
    complexCode: 'NAM_LAO',
    complexName: 'Khu liên hợp Nam Lào',
    cargoType: 'Bò thương phẩm xuất bán và hoa quả tươi',
    speedLimitKmH: 50,
    recommendedVehicles: 'Xe chuyên dụng 2 tầng chở gia súc',
    status: 'active',
    statusLabel: 'Hoạt động',
    notes: 'Có giấy chứng nhận kiểm dịch thú y liên vận quốc tế.',
  },
];

// Helper lấy dữ liệu đồng bộ LocalStorage
export function getStoredPlots(): AgriculturalPlotItem[] {
  try {
    const raw = localStorage.getItem('thaco_plots_catalog_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc thaco_plots_catalog_v1', e);
  }
  return MASTER_AGRICULTURAL_PLOTS;
}

export function getStoredAgriTeams(): AgriculturalTeamItem[] {
  try {
    const raw = localStorage.getItem('thaco_agri_teams_catalog_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc thaco_agri_teams_catalog_v1', e);
  }
  return MASTER_AGRICULTURAL_TEAMS;
}

export function getStoredConstructionSites(): ConstructionSiteItem[] {
  try {
    const raw = localStorage.getItem('thaco_construction_sites_catalog_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc thaco_construction_sites_catalog_v1', e);
  }
  return MASTER_CONSTRUCTION_SITES;
}

export function getStoredConstructionTeams(): ConstructionTeamItem[] {
  try {
    const raw = localStorage.getItem('thaco_construction_teams_catalog_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc thaco_construction_teams_catalog_v1', e);
  }
  return MASTER_CONSTRUCTION_TEAMS;
}

export function getStoredTransportRoutes(): TransportRouteItem[] {
  try {
    const raw = localStorage.getItem('thaco_transport_routes_catalog_v1');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Lỗi đọc thaco_transport_routes_catalog_v1', e);
  }
  return MASTER_TRANSPORT_ROUTES;
}

// Helper tự động tính Mã lô tăng dần theo Khu liên hợp
export function getNextPlotCode(
  complexCode: string = 'KOUN_MOM',
  existingPlots: AgriculturalPlotItem[] = getStoredPlots()
): string {
  let prefix = 'LO-KM-';
  if (complexCode === 'SNOUL') prefix = 'LO-SN-';
  else if (complexCode === 'NAM_LAO') prefix = 'LO-NL-';

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)`, 'i');

  existingPlots.forEach((p) => {
    const match = p.code.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });

  return `${prefix}${String(maxNum + 1).padStart(2, '0')}`;
}

// Helper tự động tính Mã đội cơ giới nông nghiệp tăng dần theo Khu liên hợp
export function getNextAgriTeamCode(
  complexCode: string = 'KOUN_MOM',
  existingTeams: AgriculturalTeamItem[] = getStoredAgriTeams()
): string {
  let prefix = 'DCG-KM-';
  if (complexCode === 'SNOUL') prefix = 'DCG-SN-';
  else if (complexCode === 'NAM_LAO') prefix = 'DCG-NL-';

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)`, 'i');
  existingTeams.forEach((t) => {
    const match = t.code.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return `${prefix}${String(maxNum + 1).padStart(2, '0')}`;
}

// Helper tự động tính Mã khu vực công trình tăng dần
export function getNextSiteCode(
  existingSites: ConstructionSiteItem[] = getStoredConstructionSites()
): string {
  let maxNum = 0;
  existingSites.forEach((s) => {
    const match = s.code.match(/^KV-CT-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return `KV-CT-${String(maxNum + 1).padStart(2, '0')}`;
}

// Helper tự động tính Mã đội thi công tăng dần theo Khu liên hợp
export function getNextTeamCode(
  complexCode: string = 'KOUN_MOM',
  existingTeams: ConstructionTeamItem[] = getStoredConstructionTeams()
): string {
  let prefix = 'DTC-KM-';
  if (complexCode === 'SNOUL') prefix = 'DTC-SN-';
  else if (complexCode === 'NAM_LAO') prefix = 'DTC-NL-';

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)`, 'i');
  existingTeams.forEach((t) => {
    const match = t.code.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return `${prefix}${String(maxNum + 1).padStart(2, '0')}`;
}

// Helper tự động tính Mã tuyến đường vận chuyển tăng dần theo Khu liên hợp
export function getNextRouteCode(
  complexCode: string = 'KOUN_MOM',
  existingRoutes: TransportRouteItem[] = getStoredTransportRoutes()
): string {
  let prefix = 'TD-KM-';
  if (complexCode === 'SNOUL') prefix = 'TD-SN-';
  else if (complexCode === 'NAM_LAO') prefix = 'TD-NL-';

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)`, 'i');
  existingRoutes.forEach((r) => {
    const match = r.code.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  return `${prefix}${String(maxNum + 1).padStart(2, '0')}`;
}
