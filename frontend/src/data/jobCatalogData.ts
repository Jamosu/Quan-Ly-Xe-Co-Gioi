// Danh mục Hạng mục Công việc Cơ giới chuẩn hóa cho toàn hệ thống THACO AGRI
// Phân theo 3 loại kế hoạch: Nông nghiệp, Công trình & Ca máy, Vận chuyển nội bộ

export type JobPlanType = 'NONG_NGHIEP' | 'CONG_TRINH' | 'VAN_CHUYEN';

export interface MasterJobItem {
  id: string;
  code: string;
  name: string;
  planType: JobPlanType;
  categoryCode: string;
  categoryName: string;
  implementGroup: string; // Nông cụ / Thiết bị máy móc / Phương tiện
  recommendedVehicle: string; // Đầu máy / Chủng loại xe
  defaultUnit: string; // Đơn vị tính: ha, km, m³, Tấn, Lít, Chuyến
  quotaPerShift: string; // Định mức ca máy
  fuelQuota: number;
  fuelUnit: string;
  complexCode: string;
  description: string;
}

export interface MasterStageItem {
  id: string;
  code: string;
  name: string;
  planType: JobPlanType;
  description: string;
  sequence: number;
  status: 'active' | 'inactive';
}

export const MASTER_JOBS: MasterJobItem[] = [
  // ==========================================
  // 1. NHÓM KẾ HOẠCH NÔNG NGHIỆP (LÀM ĐẤT, TRỒNG, THU HOẠCH)
  // ==========================================
  {
    id: 'JOB-AGRI-01',
    code: 'CV-LD-01',
    name: 'Cày lật phá lâm sâu 30cm',
    planType: 'NONG_NGHIEP',
    categoryCode: 'LAM_DAT',
    categoryName: '1. Làm đất',
    implementGroup: 'Dàn cày 3 - 4 chảo',
    recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP',
    defaultUnit: 'ha',
    quotaPerShift: '3.5 ha/ca 8h',
    fuelQuota: 20.5,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Cày lật sâu 30-35cm khử chua tầng đáy, tiêu diệt rễ cây cũ và cỏ dại.',
  },
  {
    id: 'JOB-AGRI-02',
    code: 'CV-LD-02',
    name: 'Bừa đĩa 24 chảo làm tơi đất',
    planType: 'NONG_NGHIEP',
    categoryCode: 'LAM_DAT',
    categoryName: '1. Làm đất',
    implementGroup: 'Dàn bừa đĩa 24 chảo',
    recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP',
    defaultUnit: 'ha',
    quotaPerShift: '5.0 ha/ca 8h',
    fuelQuota: 12.0,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Bừa 2 lượt tạo độ tơi xốp chuẩn kỹ thuật, phá tảng đất to sau cày lật.',
  },
  {
    id: 'JOB-AGRI-03',
    code: 'CV-LD-03',
    name: 'Xới đất tơi xốp mặt luống',
    planType: 'NONG_NGHIEP',
    categoryCode: 'LAM_DAT',
    categoryName: '1. Làm đất',
    implementGroup: 'Dàn xới đất phay',
    recommendedVehicle: 'Máy kéo bánh hơi 50 - 70HP',
    defaultUnit: 'ha',
    quotaPerShift: '4.0 ha/ca 8h',
    fuelQuota: 10.5,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Phay tơi đất mịn chuẩn bị lên luống đặt bầu chuối.',
  },
  {
    id: 'JOB-AGRI-04',
    code: 'CV-LD-04',
    name: 'Lên luống trồng chuối chuẩn nông trường',
    planType: 'NONG_NGHIEP',
    categoryCode: 'LAM_DAT',
    categoryName: '1. Làm đất',
    implementGroup: 'Dàn lên luống 2 tim',
    recommendedVehicle: 'Máy kéo 70 - 90HP',
    defaultUnit: 'ha',
    quotaPerShift: '4.5 ha/ca 8h',
    fuelQuota: 9.0,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Tạo tim luống cao 35cm, bề rộng mặt luống 1.2m chuẩn quy cách thoát nước.',
  },
  {
    id: 'JOB-AGRI-05',
    code: 'CV-TM-01',
    name: 'Khoan hố đặt bầu cây giống',
    planType: 'NONG_NGHIEP',
    categoryCode: 'TRONG_MOI',
    categoryName: '2. Trồng mới & Chăm sóc',
    implementGroup: 'Dàn khoan hố tự hành',
    recommendedVehicle: 'Máy kéo nhỏ 40 - 50HP',
    defaultUnit: 'hố',
    quotaPerShift: '600 hố/ca 8h',
    fuelQuota: 7.5,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Khoan hố đường kính 40cm, sâu 40cm chuẩn cự ly hàng.',
  },
  {
    id: 'JOB-AGRI-06',
    code: 'CV-TM-02',
    name: 'Rải vôi bột & phân lót hữu cơ',
    planType: 'NONG_NGHIEP',
    categoryCode: 'TRONG_MOI',
    categoryName: '2. Trồng mới & Chăm sóc',
    implementGroup: 'Dàn rải phân / vôi đĩa quay',
    recommendedVehicle: 'Máy kéo 40 - 50HP',
    defaultUnit: 'ha',
    quotaPerShift: '6.0 ha/ca 8h',
    fuelQuota: 6.5,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Rải vôi bột nông nghiệp cân bằng pH kết hợp phân chuồng hoai mục.',
  },
  {
    id: 'JOB-AGRI-07',
    code: 'CV-TM-03',
    name: 'Phun thuốc BVTV & dưỡng cây tự hành',
    planType: 'NONG_NGHIEP',
    categoryCode: 'TRONG_MOI',
    categoryName: '2. Trồng mới & Chăm sóc',
    implementGroup: 'Dàn phun thuốc cần dài 12m',
    recommendedVehicle: 'Máy kéo bánh cao 50 - 60HP',
    defaultUnit: 'ha',
    quotaPerShift: '8.0 ha/ca 8h',
    fuelQuota: 5.0,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Phun phòng trừ nấm bệnh Sigatoka và đốm lá, phun sáng sớm trước 9h00.',
  },
  {
    id: 'JOB-AGRI-08',
    code: 'CV-TH-01',
    name: 'Cắt buồng & gom kéo mooc về xưởng đóng gói',
    planType: 'NONG_NGHIEP',
    categoryCode: 'THU_HOACH',
    categoryName: '3. Thu hoạch',
    implementGroup: 'Rơ-moóc chuyên dụng treo chuối',
    recommendedVehicle: 'Máy kéo 50 - 70HP',
    defaultUnit: 'moóc',
    quotaPerShift: '12 mooc/ca 8h',
    fuelQuota: 3.2,
    fuelUnit: 'Lít/h',
    complexCode: 'KOUN_MOM',
    description: 'Kéo đoàn rơ-moóc đệm mút treo buồng chuối tươi về xưởng đóng gói xuất khẩu.',
  },
  {
    id: 'JOB-AGRI-09',
    code: 'CV-TH-02',
    name: 'Băm nghiền thân cây chuối sau thu hoạch',
    planType: 'NONG_NGHIEP',
    categoryCode: 'THU_HOACH',
    categoryName: '3. Thu hoạch',
    implementGroup: 'Dàn băm thân cây PTO',
    recommendedVehicle: 'Máy kéo 70 - 90HP',
    defaultUnit: 'ha',
    quotaPerShift: '3.0 ha/ca 8h',
    fuelQuota: 14.0,
    fuelUnit: 'Lít/ha',
    complexCode: 'KOUN_MOM',
    description: 'Băm mịn thân cây rải đều mặt ruộng tạo mùn hữu cơ tái tạo đất.',
  },

  // ==========================================
  // 2. NHÓM KẾ HOẠCH CÔNG TRÌNH & CA MÁY
  // ==========================================
  {
    id: 'JOB-CT-01',
    code: 'CV-CT-01',
    name: 'San gạt bù vê và lu lèn nền đường giao thông',
    planType: 'CONG_TRINH',
    categoryCode: 'SAN_GAT',
    categoryName: 'San gạt & Nền đường',
    implementGroup: 'Lưỡi ben san gạt & Trục lu rung',
    recommendedVehicle: 'Máy san gạt GD555 & Xe lu rung 14T',
    defaultUnit: 'km',
    quotaPerShift: '1.5 km/ca 8h',
    fuelQuota: 14.5,
    fuelUnit: 'Lít/h',
    complexCode: 'KOUN_MOM',
    description: 'San gạt 2 bên lề, bù vê mặt đường và đầm nén đạt chuẩn K95.',
  },
  {
    id: 'JOB-CT-02',
    code: 'CV-CT-02',
    name: 'Đào và nạo vét bùn mương thoát nước chính',
    planType: 'CONG_TRINH',
    categoryCode: 'DAO_MUONG',
    categoryName: 'Nạo vét & Đào mương',
    implementGroup: 'Gầu đào 0.8m³ cần dài',
    recommendedVehicle: 'Máy đào PC200 gầu 0.8m³ cần dài',
    defaultUnit: 'm³',
    quotaPerShift: '500 m³/ca 8h',
    fuelQuota: 16.0,
    fuelUnit: 'Lít/h',
    complexCode: 'KOUN_MOM',
    description: 'Nạo vét bùn đất lắng đọng đáy mương trục chính, tạo mái dốc taluy chống sạt lở.',
  },
  {
    id: 'JOB-CT-03',
    code: 'CV-CT-03',
    name: 'Đào hố móng hồ lắng và bể lắng sinh học',
    planType: 'CONG_TRINH',
    categoryCode: 'DAO_HO',
    categoryName: 'Hồ chứa & Hố móng',
    implementGroup: 'Gầu đào dung tích lớn 1.2m³',
    recommendedVehicle: 'Máy đào bánh xích gầu 1.2m³',
    defaultUnit: 'm³',
    quotaPerShift: '600 m³/ca 8h',
    fuelQuota: 18.0,
    fuelUnit: 'Lít/h',
    complexCode: 'KOUN_MOM',
    description: 'Đào hố móng sâu 3.5m tạo hồ chứa nước lắng cặn xử lý nước thải chăn nuôi & sơ chế.',
  },
  {
    id: 'JOB-CT-04',
    code: 'CV-CT-04',
    name: 'Đắp bờ bao ngăn lũ và đê ngăn nước tràn',
    planType: 'CONG_TRINH',
    categoryCode: 'DE_BAO',
    categoryName: 'Bờ bao & Đê ngăn lũ',
    implementGroup: 'Lưỡi ủi đất bán kính cong',
    recommendedVehicle: 'Máy ủi D6 & Máy đào bánh xích',
    defaultUnit: 'm³',
    quotaPerShift: '400 m³/ca 8h',
    fuelQuota: 15.0,
    fuelUnit: 'Lít/h',
    complexCode: 'KOUN_MOM',
    description: 'Gom đất đắp tôn cao bờ bao quanh nông trường cao hơn đỉnh lũ lịch sử 0.5m.',
  },
  {
    id: 'JOB-CT-05',
    code: 'CV-CT-05',
    name: 'Cải tạo san lấp mặt bằng sân bãi đóng gói',
    planType: 'CONG_TRINH',
    categoryCode: 'MAT_BANG',
    categoryName: 'Cải tạo mặt bằng',
    implementGroup: 'Lưỡi ủi & Gầu san lấp',
    recommendedVehicle: 'Máy ủi D6R & Máy san gạt',
    defaultUnit: 'm²',
    quotaPerShift: '3.000 m²/ca 8h',
    fuelQuota: 17.5,
    fuelUnit: 'Lít/h',
    complexCode: 'KOUN_MOM',
    description: 'San lấp mặt bằng chuẩn độ dốc thoát nước 1.5% phục vụ dựng nhà xưởng đóng gói.',
  },
  {
    id: 'JOB-CT-06',
    code: 'CV-CT-06',
    name: 'Rải cấp phối đá dăm và đầm nén đường trục',
    planType: 'CONG_TRINH',
    categoryCode: 'SAN_GAT',
    categoryName: 'San gạt & Nền đường',
    implementGroup: 'Thùng rải đá & Lu bánh sắt',
    recommendedVehicle: 'Xe lu rung 14T & Máy san gạt',
    defaultUnit: 'km',
    quotaPerShift: '0.8 km/ca 8h',
    fuelQuota: 13.0,
    fuelUnit: 'Lít/h',
    complexCode: 'KOUN_MOM',
    description: 'Rải lớp đá dăm 0x4 dày 15cm đầm chặt phục vụ xe container ra vào mùa mưa.',
  },

  // ==========================================
  // 3. NHÓM KẾ HOẠCH VẬN CHUYỂN NỘI BỘ
  // ==========================================
  {
    id: 'JOB-VC-01',
    code: 'CV-VC-01',
    name: 'Vận chuyển dầu Diesel tiếp ứng trạm bơm & máy ngoài đồng',
    planType: 'VAN_CHUYEN',
    categoryCode: 'NHIEN_LIEU',
    categoryName: 'Nhiên liệu & Nước',
    implementGroup: 'Bồn xitec chuyên dụng bơm xả lưu động',
    recommendedVehicle: 'Xe bồn xitec 5 khối (92C-112.34)',
    defaultUnit: 'Lít',
    quotaPerShift: '5.000 Lít/chuyến',
    fuelQuota: 28.0,
    fuelUnit: 'Lít/100km',
    complexCode: 'KOUN_MOM',
    description: 'Cấp phát dầu Diesel trực tiếp cho các trạm bơm tưới tự động và tổ máy cày ngoài đồng.',
  },
  {
    id: 'JOB-VC-02',
    code: 'CV-VC-02',
    name: 'Chở chuối tươi đóng pallet về kho lạnh xuất khẩu',
    planType: 'VAN_CHUYEN',
    categoryCode: 'NONG_SAN',
    categoryName: 'Chuối & Nông sản',
    implementGroup: 'Container lạnh 40ft duy trì nhiệt độ 13.5°C',
    recommendedVehicle: 'Đầu kéo Container lạnh 40ft (92H-012.34)',
    defaultUnit: 'Tấn',
    quotaPerShift: '25 Tấn/chuyến',
    fuelQuota: 32.0,
    fuelUnit: 'Lít/100km',
    complexCode: 'KOUN_MOM',
    description: 'Vận chuyển chuối đạt tiêu chuẩn xuất khẩu từ xưởng sơ chế về kho lạnh trung tâm.',
  },
  {
    id: 'JOB-VC-03',
    code: 'CV-VC-03',
    name: 'Chuyển phân bón NPK và hữu cơ từ kho tổng về nông trường',
    planType: 'VAN_CHUYEN',
    categoryCode: 'PHAN_BON',
    categoryName: 'Phân bón & Vật tư',
    implementGroup: 'Thùng ben bọc bạt chống thấm',
    recommendedVehicle: 'Xe tải ben 10 - 15T',
    defaultUnit: 'Tấn',
    quotaPerShift: '12 Tấn/chuyến',
    fuelQuota: 26.0,
    fuelUnit: 'Lít/100km',
    complexCode: 'KOUN_MOM',
    description: 'Xuất phân bón từ kho tổng KLH cấp cho chòi tập kết vật tư các nông trường.',
  },
  {
    id: 'JOB-VC-04',
    code: 'CV-VC-04',
    name: 'Cấp phát ống tưới nhỏ giọt, béc phun và phụ tùng cơ giới',
    planType: 'VAN_CHUYEN',
    categoryCode: 'THIET_BI',
    categoryName: 'Nông cụ & Phụ tùng',
    implementGroup: 'Thùng mui bạt sàn gỗ chống trượt',
    recommendedVehicle: 'Xe tải thùng mui bạt 5T',
    defaultUnit: 'Tấn',
    quotaPerShift: '5 Tấn/chuyến',
    fuelQuota: 18.0,
    fuelUnit: 'Lít/100km',
    complexCode: 'KOUN_MOM',
    description: 'Chở cuộn ống tưới PE, béc tưới và dầu nhớt phụ tùng thay thế định kỳ.',
  },
  {
    id: 'JOB-VC-05',
    code: 'CV-VC-05',
    name: 'Tiếp nước sinh hoạt và nước tưới trạm sơ chế',
    planType: 'VAN_CHUYEN',
    categoryCode: 'NHIEN_LIEU',
    categoryName: 'Nhiên liệu & Nước',
    implementGroup: 'Bồn chứa inox hợp chuẩn nước sạch',
    recommendedVehicle: 'Xe xitec bồn nước 8 khối',
    defaultUnit: 'm³',
    quotaPerShift: '8 m³/chuyến',
    fuelQuota: 22.0,
    fuelUnit: 'Lít/100km',
    complexCode: 'KOUN_MOM',
    description: 'Cấp nước sinh hoạt cho khu nhà ở công nhân và bồn rửa chuối xưởng đóng gói.',
  },
  {
    id: 'JOB-VC-06',
    code: 'CV-VC-06',
    name: 'Vận chuyển bao bì thùng carton từ xưởng in về xưởng đóng gói',
    planType: 'VAN_CHUYEN',
    categoryCode: 'THIET_BI',
    categoryName: 'Nông cụ & Phụ tùng',
    implementGroup: 'Thùng kín chống mưa tuyệt đối',
    recommendedVehicle: 'Xe tải thùng kín 8T',
    defaultUnit: 'hộp',
    quotaPerShift: '6.000 hộp/chuyến',
    fuelQuota: 20.0,
    fuelUnit: 'Lít/100km',
    complexCode: 'KOUN_MOM',
    description: 'Chở thùng carton in thương hiệu chuối đóng gói xuất khẩu không được để ẩm ướt.',
  },
];

// Helper lấy danh mục công việc từ localStorage hoặc dữ liệu chuẩn
export function getStoredJobs(): MasterJobItem[] {
  try {
    const saved = localStorage.getItem('thaco_job_items_v5');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => {
          const master = MASTER_JOBS.find((candidate) => candidate.code === item.code);
          const fallbackUnit = item.planType === 'NONG_NGHIEP' ? 'ha' : item.planType === 'CONG_TRINH' ? 'm³' : 'Tấn';
          return { ...master, ...item, defaultUnit: item.defaultUnit || master?.defaultUnit || fallbackUnit } as MasterJobItem;
        });
      }
    }
  } catch {}
  return MASTER_JOBS;
}

export const DEFAULT_MASTER_STAGES: MasterStageItem[] = [
  // 1. Nông nghiệp
  { id: 'STG-NN-01', code: 'LAM_DAT', name: '1. Làm đất', planType: 'NONG_NGHIEP', description: 'Cày sâu 30cm, bừa đĩa tơi xốp, phay xới tạo luống', sequence: 1, status: 'active' },
  { id: 'STG-NN-02', code: 'TRONG_MOI', name: '2. Trồng mới & Chăm sóc', planType: 'NONG_NGHIEP', description: 'Khoan hố đặt bầu, rải vôi khử trùng, bón lót hữu cơ, phun thuốc BVTV', sequence: 2, status: 'active' },
  { id: 'STG-NN-03', code: 'THU_HOACH', name: '3. Thu hoạch', planType: 'NONG_NGHIEP', description: 'Cắt buồng chuối, gom kéo mooc về trạm đóng gói, băm nghiền thân cây', sequence: 3, status: 'active' },

  // 2. Công trình
  { id: 'STG-CT-01', code: 'DAO_DAP', name: '1. Đào đắp mương máng & hồ đập', planType: 'CONG_TRINH', description: 'Đào mương trục chính, nạo vét bùn lắng, đào hố móng hồ lắng sinh học', sequence: 1, status: 'active' },
  { id: 'STG-CT-02', code: 'SAN_LAP', name: '2. San lấp mặt bằng & tạo cos nền', planType: 'CONG_TRINH', description: 'Ủi gạt tạo mặt bằng sân bãi, đắp bờ bao ngăn lũ và kè chống sạt lở', sequence: 2, status: 'active' },
  { id: 'STG-CT-03', code: 'GIAO_THONG', name: '3. Mở đường & Lu lèn giao thông nội bộ', planType: 'CONG_TRINH', description: 'Bù vê tạo mặt đường, rải cấp phối đá dăm và lu rung đạt K95', sequence: 3, status: 'active' },
  { id: 'STG-CT-04', code: 'BAO_DUONG', name: '4. Nạo vét & Duy tu hạ tầng công trình', planType: 'CONG_TRINH', description: 'Duy tu định kỳ đường trục nội bộ và hệ thống mương máng mùa mưa lũ', sequence: 4, status: 'active' },

  // 3. Vận chuyển
  { id: 'STG-VC-01', code: 'CHUYEN_CHUOI', name: '1. Vận chuyển chuối xuất khẩu', planType: 'VAN_CHUYEN', description: 'Chở buồng tươi về xưởng đóng gói và chở cont lạnh 40ft về kho trung tâm', sequence: 1, status: 'active' },
  { id: 'STG-VC-02', code: 'CHUYEN_THUC_AN', name: '2. Vận chuyển thức ăn gia súc (Bò)', planType: 'VAN_CHUYEN', description: 'Chở thân lá chuối tươi, bắp sinh khối về hầm ủ chua và trại bò thịt', sequence: 2, status: 'active' },
  { id: 'STG-VC-03', code: 'CHUYEN_VAT_TU', name: '3. Vận chuyển phân bón & vật tư', planType: 'VAN_CHUYEN', description: 'Vận chuyển phân bón, vôi, ống tưới, bao buồng từ kho tổng về chòi tập kết', sequence: 3, status: 'active' },
  { id: 'STG-VC-04', code: 'CHUYEN_NOI_BO', name: '4. Tiếp liệu & Điều chuyển cơ giới', planType: 'VAN_CHUYEN', description: 'Tiếp ứng dầu Diesel, nước sinh hoạt và điều chuyển máy móc nông cụ', sequence: 4, status: 'active' },
];

export function getStoredStages(): MasterStageItem[] {
  let list: MasterStageItem[] = [];
  try {
    const saved = localStorage.getItem('thaco_job_stages_v5');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed.map((stage, index) => ({
          ...stage,
          id: stage.id || `STG-${stage.code || index + 1}`,
          planType: ((stage.planType || 'NONG_NGHIEP') as string).toUpperCase() as JobPlanType,
          description: stage.description || '',
          sequence: Number(stage.sequence) || index + 1,
          status: stage.status === 'inactive' ? 'inactive' : 'active',
        })) as MasterStageItem[];
      }
    }
  } catch {}

  if (!list || list.length === 0) {
    list = [...DEFAULT_MASTER_STAGES];
  }

  // Khử trùng lặp tuyệt đối theo stage.code (Strict Deduplication by code)
  const uniqueMap = new Map<string, MasterStageItem>();
  list.forEach((stage) => {
    if (stage.code && !uniqueMap.has(stage.code)) {
      uniqueMap.set(stage.code, stage);
    }
  });

  // Bổ sung các giai đoạn mặc định nếu chưa có
  DEFAULT_MASTER_STAGES.forEach((defStage) => {
    if (!uniqueMap.has(defStage.code)) {
      uniqueMap.set(defStage.code, defStage);
    }
  });

  const deduplicatedList = Array.from(uniqueMap.values());
  // Làm sạch dữ liệu trùng lặp trong localStorage của trình duyệt
  try {
    localStorage.setItem('thaco_job_stages_v5', JSON.stringify(deduplicatedList));
  } catch {}

  return deduplicatedList;
}

// Helper tự động tính toán Mã quy trình tăng dần (Sequential Ascending Job Code)
export function getNextJobCode(
  planType: JobPlanType,
  stageCode?: string,
  existingJobs: { code: string; planType?: JobPlanType }[] = MASTER_JOBS
): string {
  let prefix = 'CV-NN-';
  if (planType === 'CONG_TRINH') {
    prefix = 'CV-CT-';
  } else if (planType === 'VAN_CHUYEN') {
    prefix = 'CV-VC-';
  } else {
    // Kế hoạch nông nghiệp: định dạng theo giai đoạn nếu có
    if (stageCode === 'LAM_DAT') prefix = 'CV-LD-';
    else if (stageCode === 'TRONG_MOI') prefix = 'CV-TM-';
    else if (stageCode === 'THU_HOACH') prefix = 'CV-TH-';
    else prefix = 'CV-NN-';
  }

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)`, 'i');

  existingJobs.forEach((j) => {
    const match = j.code.match(regex);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  });

  // Nếu không tìm thấy tiền tố riêng lẻ trong nông nghiệp, tìm số lớn nhất của nông nghiệp
  if (maxNum === 0 && prefix === 'CV-NN-') {
    existingJobs.forEach((j) => {
      if (j.planType === 'NONG_NGHIEP' || !j.planType) {
        const match = j.code.match(/CV-[A-Z]+-(\d+)/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(2, '0')}`;
}
