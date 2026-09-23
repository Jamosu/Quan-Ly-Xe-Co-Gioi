const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', '..', 'frontend', 'src', 'data', 'catalogData.ts');

const fileContent = `export interface CompanyEntity {
  id: number;
  code: string;
  name: string;
  address: string;
  field: string;
  businessLicense: string;
  charterCapital: string;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  parentCode?: string;
  parentName?: string;
  enterpriseName?: string;
  farmName?: string;
  plotStatus?: string;
  routeFlowType?: 'ONE_WAY' | 'TWO_WAY';
  returnOrigin?: string;
  returnDestination?: string;
  returnCargoName?: string;
  returnTonnage?: number;
  type:
    | 'COMPLEX'
    | 'REGION'
    | 'DEPARTMENT'
    | 'ENTERPRISE'
    | 'FARM'
    | 'TEAM'
    | 'PLOT'
    | 'LAND_PARCEL'
    | 'POSITION'
    | 'JOB_TYPE'
    | 'VEHICLE_CATEGORY'
    | string;
  systemId?: string;
  address?: string;
  managerName?: string;
  phone?: string;
  areaHa?: number;
  status: 'HOAT_DONG' | 'TAM_DUNG';
  description?: string;
  createdAt?: string;
  createdDate?: string;
  createdUser?: string;
  updatedDate?: string;
  updatedUser?: string;
  confirmedDate?: string;
  confirmedUser?: string;
  deletedDate?: string;
  deletedUser?: string;
}

export const mockCompanyEntities: CompanyEntity[] = [
  {
    id: 1,
    code: 'THACO AGRI',
    name: 'Công ty Cổ phần Nông nghiệp Trường Hải (THACO AGRI)',
    address: 'Khu công nghiệp Tam Hiệp, xã Núi Thành, TP. Đà Nẵng',
    field: 'Quản trị Nông nghiệp, Cơ giới hóa & Chăn nuôi quy mô lớn',
    businessLicense: '4000778899',
    charterCapital: '15,000,000,000,000 VND',
    createdAt: '09-01-2026',
  },
  {
    id: 2,
    code: 'KOUN_MOM_AGRI',
    name: 'Công ty TNHH Nông nghiệp Koun Mom (Campuchia)',
    address: 'Huyện Koun Mom, Tỉnh Ratanakiri, Vương quốc Campuchia',
    field: 'Trồng trọt Chuối xuất khẩu, Cây ăn trái & Chăn nuôi Bò thịt công nghệ cao',
    businessLicense: 'KH-098234-KM',
    charterCapital: '500,000,000 USD',
    createdAt: '15-01-2026',
  },
  {
    id: 3,
    code: 'SNUOL_AGRI',
    name: 'Công ty TNHH Nông nghiệp Snuol (Campuchia)',
    address: 'Huyện Snuol, Tỉnh Kratie, Vương quốc Campuchia',
    field: 'Khu Liên Hợp Cây Ăn Trái, Cỏ voi trạm TMR & Chăn nuôi Bò',
    businessLicense: 'KH-112344-SN',
    charterCapital: '350,000,000 USD',
    createdAt: '20-01-2026',
  },
];

// ----------------------------------------------------------------------------
// 7. DANH MỤC KHU LIÊN HỢP, XÍ NGHIỆP, NÔNG TRƯỜNG, ĐỘI XE, LÔ SẢN XUẤT
// ----------------------------------------------------------------------------
export const mockComplexes: CatalogItem[] = [
  {
    id: 'KLH_KM',
    systemId: '100026',
    code: 'KOUN_MOM',
    name: 'Khu liên hợp Koun Mom',
    type: 'COMPLEX',
    managerName: 'Ban Quản lý KLH Koun Mom',
    phone: '0912.334.556',
    address: 'Huyện Koun Mom, Tỉnh Ratanakiri, Campuchia',
    areaHa: 16963.944,
    status: 'HOAT_DONG',
    description: 'KLH trọng điểm Chuối & Bò tại Campuchia với 1.263 xe cơ giới (15 xí nghiệp, 16.340 ha)',
    createdAt: '2026-02-27',
    createdDate: '2026-02-27',
    createdUser: 'admin',
    updatedDate: '2026-03-14',
    updatedUser: 'admin',
  },
  {
    id: 'KLH_SN',
    systemId: '100027',
    code: 'SNOUL',
    name: 'Khu liên hợp Snoul',
    type: 'COMPLEX',
    managerName: 'Ban Quản lý KLH Snoul',
    phone: '0903.345.678',
    address: 'Huyện Snoul, Tỉnh Kratie, Campuchia',
    areaHa: 12770,
    status: 'HOAT_DONG',
    description: 'KLH Cao su, Cây ăn trái & Chăn nuôi Bò với 1.035 xe cơ giới (8 xí nghiệp, 12.770 ha)',
    createdAt: '2026-02-27',
    createdDate: '2026-02-27',
    createdUser: 'admin',
    updatedDate: '2026-03-14',
    updatedUser: 'admin',
  },
  {
    id: 'KLH_NL',
    systemId: '100028',
    code: 'NAM_LAO',
    name: 'Khu liên hợp Nam Lào',
    type: 'COMPLEX',
    managerName: 'Ban Quản lý KLH Nam Lào',
    phone: '+856 20 555 8888',
    address: 'Tỉnh Attapeu, Nước CHDCND Lào',
    areaHa: 8150,
    status: 'HOAT_DONG',
    description: 'KLH Nông nghiệp & Cơ giới hóa Nam Lào với 906 xe cơ giới (6 xí nghiệp, 8.150 ha)',
    createdAt: '2026-02-27',
    createdDate: '2026-02-27',
    createdUser: 'admin',
    updatedDate: '2026-03-14',
    updatedUser: 'admin',
  },
];

export const mockRegions: CatalogItem[] = [
  // --- KLH KOUN MOM ---
  { id: 'KV_DP', code: 'DP', name: 'Khu vực Daun Penh (DP)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Vùng Daun Penh, Tỉnh Ratanakiri, Campuchia', managerName: 'Ban Giám đốc KV Daun Penh', phone: '0918.111.001', status: 'HOAT_DONG', description: 'Cụm các xí nghiệp trồng chuối & cây ăn trái Daun Penh', createdAt: '01-01-2026' },
  { id: 'KV_LP', code: 'LP', name: 'Khu vực Lumphat (LP)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Vùng Lumphat, Tỉnh Ratanakiri, Campuchia', managerName: 'Ban Giám đốc KV Lumphat', phone: '0918.111.004', status: 'HOAT_DONG', description: 'Cụm các xí nghiệp chuối Lumphat', createdAt: '01-01-2026' },
  { id: 'KV_AD', code: 'AD', name: 'Khu vực Andong Meas (AD)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Vùng Andong Meas, Tỉnh Ratanakiri, Campuchia', managerName: 'Ban Giám đốc KV Andong Meas', phone: '0918.111.008', status: 'HOAT_DONG', description: 'Khu vực chăn nuôi bò Andong Meas', createdAt: '01-01-2026' },
  { id: 'KV_KM', code: 'KLH', name: 'Khu vực Văn phòng KLH Koun Mom (KLH)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Trung tâm điều hành KLH Koun Mom', managerName: 'Ban Giám đốc KLH Koun Mom', phone: '0918.111.000', status: 'HOAT_DONG', description: 'Khối cơ quan & hạ tầng dùng chung KLH Koun Mom', createdAt: '01-01-2026' },

  // --- KLH SNOUL ---
  { id: 'KV_BP', code: 'BP', name: 'Khu vực Snoul BP (BP)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Vùng BP, Huyện Snoul, Tỉnh Kratie', managerName: 'Ban Giám đốc KV BP', phone: '0918.222.002', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối BP Snoul', createdAt: '01-01-2026' },
  { id: 'KV_BSA', code: 'BSA', name: 'Khu vực Snoul BSA (BSA)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Vùng BSA, Huyện Snoul, Tỉnh Kratie', managerName: 'Ban Giám đốc KV BSA', phone: '0918.222.005', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối BSA Snoul', createdAt: '01-01-2026' },
  { id: 'KV_ERC', code: 'ERC', name: 'Khu vực Snoul ERC (ERC)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Vùng ERC, Huyện Snoul, Tỉnh Kratie', managerName: 'Ban Giám đốc KV ERC', phone: '0918.222.001', status: 'HOAT_DONG', description: 'Xí nghiệp chuối ERC Snoul', createdAt: '01-01-2026' },
  { id: 'KV_SN', code: 'SN', name: 'Khu vực Văn phòng KLH Snoul (SN)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Trung tâm điều hành KLH Snoul', managerName: 'Ban Giám đốc KLH Snoul', phone: '0918.222.000', status: 'HOAT_DONG', description: 'Khối cơ quan & hạ tầng dùng chung KLH Snoul', createdAt: '01-01-2026' },

  // --- KLH NAM LÀO ---
  { id: 'KV_NSA', code: 'NSA', name: 'Khu vực Sanxay NSA (NSA)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Vùng NSA, Sanxay, Attapeu, Lào', managerName: 'Ban Giám đốc KV NSA', phone: '0918.333.001', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối NSA Nam Lào', createdAt: '01-01-2026' },
  { id: 'KV_NK', code: 'NK', name: 'Khu vực Sanxay NK (NK)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Vùng NK, Sanxay, Attapeu, Lào', managerName: 'Ban Giám đốc KV NK', phone: '0918.333.002', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối NK Nam Lào', createdAt: '01-01-2026' },
  { id: 'KV_PV', code: 'PV', name: 'Khu vực Phouvong (PV)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Vùng Phouvong, Attapeu, Lào', managerName: 'Ban Giám đốc KV PV', phone: '0918.333.003', status: 'HOAT_DONG', description: 'Xí nghiệp chuối Phouvong Nam Lào', createdAt: '01-01-2026' },
  { id: 'KV_NL', code: 'NL', name: 'Khu vực Văn phòng KLH Nam Lào (NL)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Trung tâm điều hành KLH Nam Lào', managerName: 'Ban Giám đốc KLH Nam Lào', phone: '0918.333.000', status: 'HOAT_DONG', description: 'Khối cơ quan & hạ tầng dùng chung KLH Nam Lào', createdAt: '01-01-2026' },
];

export const mockDepartments: CatalogItem[] = [];

export const mockEnterprises: CatalogItem[] = [];

export const mockFarms: CatalogItem[] = [];

export const mockTeams: CatalogItem[] = [
  { id: 'TEAM-01', code: 'DOI_CGLD_02', name: 'Đội Cơ giới Làm đất 02', type: 'TEAM', managerName: 'Nguyễn Văn Hải', phone: '0918.111.002', status: 'HOAT_DONG', createdAt: '15-01-2026' },
  { id: 'TEAM-02', code: 'DOI_VT_NOI_BO', name: 'Đội Vận tải Nội bộ', type: 'TEAM', managerName: 'Trần Văn Khương', phone: '0918.311.006', status: 'HOAT_DONG', createdAt: '15-01-2026' },
  { id: 'TEAM-03', code: 'DOI_VAN_TAI', name: 'Đội Vận tải', type: 'TEAM', managerName: 'Phan Thành Tâm', phone: '0918.505.009', status: 'HOAT_DONG', createdAt: '16-01-2026' },
  { id: 'TEAM-04', code: 'DOI_CG_NT1', name: 'Đội Cơ giới Nông trường 1', type: 'TEAM', managerName: 'Phạm Quốc Thiện', phone: '0918.505.012', status: 'HOAT_DONG', createdAt: '18-01-2026' },
  { id: 'TEAM-05', code: 'TO_CO_VU_NT2', name: 'Tổ Cơ vụ Nông trường 2', type: 'TEAM', managerName: 'Lê Văn Thắng', phone: '0903.345.678', status: 'HOAT_DONG', createdAt: '18-01-2026' },
  { id: 'TEAM-06', code: 'DOI_XE_BEN_10T', name: 'Đội Xe ben 10T', type: 'TEAM', managerName: 'Trần Đình Trọng', phone: '0901.123.456', status: 'HOAT_DONG', createdAt: '18-01-2026' },
  { id: 'TEAM-07', code: 'DOI_XE_CONT_DD', name: 'Đội Xe Container Đường dài', type: 'TEAM', managerName: 'Đặng Hoàng Nam', phone: '0912.334.455', status: 'HOAT_DONG', createdAt: '18-01-2026' },
  { id: 'TEAM-08', code: 'TO_DIEU_HANH', name: 'Tổ Điều hành', type: 'TEAM', managerName: 'Nguyễn Văn Minh', phone: '0908.889.900', status: 'HOAT_DONG', createdAt: '19-01-2026' },
  { id: 'TEAM-09', code: 'DOI_VT_CG_01', name: 'Đội Vận tải Cơ giới 01', type: 'TEAM', managerName: 'Vũ Đức Thịnh', phone: '0913.456.789', status: 'HOAT_DONG', createdAt: '19-01-2026' },
  { id: 'TEAM-10', code: 'DOI_VC_TMR', name: 'Đội Vận chuyển thức ăn TMR', type: 'TEAM', managerName: 'Hoàng Quốc Việt', phone: '0909.112.233', status: 'HOAT_DONG', createdAt: '20-01-2026' },
  { id: 'TEAM-11', code: 'DOI_CUU_HO_KT', name: 'Đội Cứu hộ Kỹ thuật', type: 'TEAM', managerName: 'Bùi Anh Tuấn', phone: '0915.223.344', status: 'HOAT_DONG', createdAt: '20-01-2026' },
  { id: 'TEAM-12', code: 'DOI_XE_CONTAINER', name: 'Đội Xe Container', type: 'TEAM', managerName: 'Ngô Quang Huy', phone: '0916.334.455', status: 'HOAT_DONG', createdAt: '20-01-2026' },
  { id: 'TEAM-13', code: 'TO_THU_NGHIEM_MAY', name: 'Tổ Thử nghiệm máy', type: 'TEAM', managerName: 'Đinh Trọng Hưng', phone: '0917.445.566', status: 'HOAT_DONG', createdAt: '21-01-2026' },
  { id: 'TEAM-14', code: 'TO_XE_CONG_VU', name: 'Tổ Xe Công vụ', type: 'TEAM', managerName: 'Lý Kiến Quốc', phone: '0918.556.677', status: 'HOAT_DONG', createdAt: '21-01-2026' },
  { id: 'TEAM-15', code: 'DOI_CG_TRONG_CO', name: 'Đội Cơ giới Trồng cỏ', type: 'TEAM', managerName: 'Dương Văn Tiến', phone: '0919.667.788', status: 'HOAT_DONG', createdAt: '22-01-2026' },
  { id: 'TEAM-16', code: 'DOI_CAU_CUU_HO', name: 'Đội Xe Cẩu & Cứu hộ', type: 'TEAM', managerName: 'Trịnh Thanh Bình', phone: '0902.778.899', status: 'HOAT_DONG', createdAt: '22-01-2026' },
];

export const mockPlots: CatalogItem[] = [];

export const mockLandParcels: CatalogItem[] = [];

export const mockPositions: CatalogItem[] = [
  { id: 'POS1', code: 'CD_TX_CONTAINER', name: 'Lái xe đầu kéo Container', type: 'POSITION', status: 'HOAT_DONG', description: 'Vận tải container chuối xuất khẩu và đối lưu hàng hóa đường dài', createdAt: '10-01-2026' },
  { id: 'POS2', code: 'CD_TX_BEN', name: 'Lái xe tải tự đổ (ben)', type: 'POSITION', status: 'HOAT_DONG', description: 'Vận chuyển chuối buồng, phân bón, đất đắp và phụ phẩm nông nghiệp', createdAt: '10-01-2026' },
  { id: 'POS3', code: 'CD_TX_TAI_THUNG', name: 'Lái xe tải thùng', type: 'POSITION', status: 'HOAT_DONG', description: 'Vận chuyển vật tư phân bón, cây giống, bao bì đóng gói nông trường', createdAt: '10-01-2026' },
  { id: 'POS4', code: 'CD_TX_BON_XITEC', name: 'Lái xe bồn xitéc', type: 'POSITION', status: 'HOAT_DONG', description: 'Cấp phát dầu DO lưu động và tiếp nước tưới cây tự hành', createdAt: '11-01-2026' },
  { id: 'POS5', code: 'CD_TX_NANG_HANG', name: 'Lái xe nâng hàng Forklift', type: 'POSITION', status: 'HOAT_DONG', description: 'Bốc xếp pallet chuối đóng thùng, phân bón tại tổng kho KLH', createdAt: '11-01-2026' },
  { id: 'POS6', code: 'CD_TX_CONG_VU', name: 'Lái xe công vụ / bán tải', type: 'POSITION', status: 'HOAT_DONG', description: 'Đưa đón cán bộ kỹ thuật, giám sát nông trường và tuần tra nông nghiệp', createdAt: '12-01-2026' },
  { id: 'POS7', code: 'CD_LX_MAY_CAY_LON', name: 'Lái máy cày công suất lớn (>120HP)', type: 'POSITION', status: 'HOAT_DONG', description: 'Cày ngầm xới sâu phá váng, bừa ngả, lên liếp chuối công nghệ cao', createdAt: '12-01-2026' },
  { id: 'POS8', code: 'CD_LX_MAY_CAY_TRUNG', name: 'Lái máy cày trung (70 - 110HP)', type: 'POSITION', status: 'HOAT_DONG', description: 'Xới đất liếp, rải vôi, phay đất và đánh rãnh thoát nước', createdAt: '12-01-2026' },
  { id: 'POS9', code: 'CD_LX_MAY_KEO_RANG', name: 'Lái máy kéo kéo rơ-moóc chở nông sản', type: 'POSITION', status: 'HOAT_DONG', description: 'Kéo chuối buồng từ lô về nhà đóng gói packing house', createdAt: '13-01-2026' },
  { id: 'POS10', code: 'CD_LX_MAY_DAO', name: 'Lái máy đào gầu nghịch bánh xích', type: 'POSITION', status: 'HOAT_DONG', description: 'Đào đắp mương máng, nạo vét kênh thủy lợi, tạo bờ vùng bờ thửa', createdAt: '14-01-2026' },
  { id: 'POS11', code: 'CD_LX_MAY_UI', name: 'Lái máy ủi đất D6/D8', type: 'POSITION', status: 'HOAT_DONG', description: 'San gạt mặt bằng khai hoang, làm đường nội bộ nông trường', createdAt: '14-01-2026' },
  { id: 'POS12', code: 'CD_LX_MAY_SAN', name: 'Lái máy san gạt bánh lốp', type: 'POSITION', status: 'HOAT_DONG', description: 'Hoàn thiện lu lèn nền hạ đường giao thông lô thửa', createdAt: '15-01-2026' },
  { id: 'POS13', code: 'CD_LX_MAY_LU', name: 'Lái máy lu rung bánh thép', type: 'POSITION', status: 'HOAT_DONG', description: 'Đầm nén nền đường nội đồng và sân bãi bốc dỡ', createdAt: '15-01-2026' },
  { id: 'POS14', code: 'CD_LX_MAY_XUC_LAT', name: 'Lái máy xúc lật bánh lốp', type: 'POSITION', status: 'HOAT_DONG', description: 'Xúc phân vi sinh, bắp ủ chua TMR cho bò thịt', createdAt: '15-01-2026' },
  { id: 'POS15', code: 'CD_LX_GAT_DAP', name: 'Lái máy gặt đập liên hợp', type: 'POSITION', status: 'HOAT_DONG', description: 'Thu hoạch bắp sinh khối, lúa hữu cơ tại các dự án lương thực', createdAt: '16-01-2026' },
  { id: 'POS16', code: 'CD_TM_DIEN_LANH', name: 'Thợ máy điện lạnh xe máy', type: 'POSITION', status: 'HOAT_DONG', description: 'Bảo trì hệ thống lạnh cabin xe máy và cụm container lạnh', createdAt: '16-01-2026' },
  { id: 'POS17', code: 'CD_TM_DONG_CO', name: 'Thợ máy động cơ Diesel', type: 'POSITION', status: 'HOAT_DONG', description: 'Đại tu máy Diesel Cummins, Weichai, Yanmar, John Deere', createdAt: '16-01-2026' },
  { id: 'POS18', code: 'CD_TM_THUY_LUC', name: 'Thợ thủy lực & Cơ cấu truyền động', type: 'POSITION', status: 'HOAT_DONG', description: 'Sửa chữa bơm thủy lực, van phân phối, xylanh nâng hạ nông cụ', createdAt: '17-01-2026' },
  { id: 'POS19', code: 'CD_TM_GIA_CONG_HAN', name: 'Thợ cơ khí nông cụ & Hàn tiện', type: 'POSITION', status: 'HOAT_DONG', description: 'Gia công dàn cày 7 chảo, dàn bừa, moóc kéo và gầu xúc', createdAt: '17-01-2026' },
  { id: 'POS20', code: 'CD_NV_NHIEN_LIEU', name: 'Nhân viên cấp phát nhiên liệu bồn di động', type: 'POSITION', status: 'HOAT_DONG', description: 'Vận hành cột bơm điện tử, xuất hóa đơn QR và đối soát tồn kho', createdAt: '18-01-2026' },
  { id: 'POS21', code: 'CD_NV_DIEU_DO', name: 'Nhân viên điều phối xe máy', type: 'POSITION', status: 'HOAT_DONG', description: 'Giám sát hành trình GPS, tiếp nhận yêu cầu điều động và giao ca', createdAt: '18-01-2026' },
];
`;

fs.writeFileSync(target, fileContent, 'utf8');
console.log('Successfully written clean catalogData.ts');
