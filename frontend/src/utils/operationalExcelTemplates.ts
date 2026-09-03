import * as XLSX from 'xlsx';

export type OperationalTemplateType = 'VEHICLE' | 'IMPLEMENT' | 'ASSIGNMENT' | 'DRIVER';

interface TemplateColumn {
  header: string;
  field: string;
  sample?: string | number;
}

interface TemplateDefinition {
  filename: string;
  dataSheet: string;
  title: string;
  columns: TemplateColumn[];
}

const commonCatalogRows = [
  ['Nhóm danh mục', 'Mã chuẩn', 'Diễn giải'],
  ['Khu liên hợp', 'KOUN_MOM', 'Khu liên hợp Koun Mom (Campuchia)'],
  ['Khu liên hợp', 'SNOUL', 'Khu liên hợp Snoul (Campuchia)'],
  ['Khu liên hợp', 'NAM_LAO', 'Khu liên hợp Nam Lào (Attapeu, Lào)'],
  ['Nhóm tài sản', 'MAY_CONG_TRINH', 'Máy công trình'],
  ['Nhóm tài sản', 'MAY_NONG_NGHIEP', 'Máy nông nghiệp'],
  ['Nhóm tài sản', 'XE_VAN_TAI_CONG_VU', 'Xe vận tải & công vụ'],
  ['Nhóm tài sản', 'THIET_BI_PHU_TRO', 'Thiết bị phụ trợ & nông cụ'],
  ['Nhóm nông cụ', 'DAN_CAY', 'Dàn cày nông nghiệp'],
  ['Nhóm nông cụ', 'DAN_BUA', 'Dàn bừa đĩa & san phẳng'],
  ['Nhóm nông cụ', 'DAN_XOI', 'Dàn xới đất & làm luống'],
  ['Nhóm nông cụ', 'DAN_RAI_PHAN', 'Dàn rải phân & vôi'],
  ['Nhóm nông cụ', 'RO_MOOC', 'Rơ-moóc chuyên dụng'],
  ['Nhóm nông cụ', 'DAN_PHUN_THUOC', 'Dàn phun thuốc BVTV'],
  ['Hạng GPLX', 'BANG_MAY_NONG_NGHIEP', 'Bằng điều khiển máy nông nghiệp'],
  ['Hạng GPLX', 'HANG_C', 'Bằng C'],
  ['Hạng GPLX', 'HANG_FC', 'Bằng FC'],
  ['Hạng GPLX', 'HANG_B2', 'Bằng B2'],
  ['Hạng GPLX', 'HANG_D', 'Bằng D'],
  ['Đơn vị hệ thống', 'NT1', 'Nông trường 1'],
  ['Đơn vị hệ thống', 'NT2', 'Nông trường 2'],
  ['Đơn vị hệ thống', 'XN_BO', 'Xí nghiệp bò'],
  ['Đơn vị hệ thống', 'TT_BTSC', 'Trung tâm BTSC'],
  ['Đơn vị hệ thống', 'BAN_CO_GIOI', 'Ban Cơ giới'],
];

const definitions: Record<OperationalTemplateType, TemplateDefinition> = {
  VEHICLE: {
    filename: 'Template_Import_Ho_So_Xe_THACO_AGRI.xlsx',
    dataSheet: 'Ho_So_Xe',
    title: 'HỒ SƠ XE & MMTB',
    columns: [
      ['Mã MMTB mới (*)', 'code', 'CHT-MDA-001'], ['Mã MMTB cũ', 'oldCode', 'MD-01-DP'],
      ['Mã Bravo ERP', 'bravoCode', 'BV-2024-889'], ['Biển số xe', 'plate', '72A-123.45'],
      ['Tên phương tiện (*)', 'name', 'Máy đào bánh xích KOBELCO SK200-8'], ['Nhóm tài sản (*)', 'assetGroup', 'MAY_CONG_TRINH'],
      ['Chủng loại xe (*)', 'category', 'MAY_DAO'], ['Phân loại phụ', 'vehicleSubtype', 'Máy đào bánh lốp'],
      ['Khu liên hợp (*)', 'complexCode', 'KOUN_MOM'], ['Đơn vị sử dụng (*)', 'assignedUnitCode', 'CGTC DP'],
      ['Khu vực địa lý', 'regionCode', 'DP'], ['Hãng sản xuất', 'manufacturer', 'KOBELCO'],
      ['Model xe', 'modelName', 'SK200-08'], ['Năm sản xuất', 'manufactureYear', 2022],
      ['Quốc gia xuất xứ', 'origin', 'NHẬT BẢN'], ['Công suất động cơ', 'powerHp', '140 HP'],
      ['Số khung', 'frameNumber', 'FRAME-001'], ['Số máy', 'engineNumber', 'ENGINE-001'],
      ['Định mức dầu chuẩn', 'fuelQuotaRate', 12.5], ['Đơn vị định mức dầu', 'fuelQuotaUnit', 'L_PER_HOUR'],
      ['Dung tích thùng dầu (Lít)', 'fuelTankCapacity', 320], ['Tình trạng mua sắm', 'purchaseCondition', 'Mua mới 100%'],
      ['Nhà cung cấp', 'supplier', 'THACO AGRI'], ['Pháp nhân sở hữu', 'companyOwner', 'THACO AGRI'],
      ['Mã tài sản kế toán', 'assetCode', 'TSCD-2024-0091'], ['Hạn kiểm định/Đăng kiểm', 'inspectionExpiryDate', '25/12/2026'],
      ['Hạn nộp phí đường bộ', 'roadFeeExpiryDate', '25/12/2026'], ['Mã thiết bị GPS (IMEI)', 'gpsImei', '864201041234567'],
      ['Mã cảm biến dầu (IMEI)', 'fuelSensorImei', 'F-902148'], ['Vị trí / Bãi tập kết', 'currentLocationName', 'Lô 85 DP4'],
      ['Số giờ máy hoạt động', 'totalMachineHours', 1250.5], ['Số Km lăn bánh (ODO)', 'odoKm', 45200],
      ['Trạng thái vận hành (*)', 'status', 'HOAT_DONG'], ['Ghi chú phương tiện', 'notes', 'Xe phục vụ làm đất'],
    ].map(([header, field, sample]) => ({ header: String(header), field: String(field), sample })),
  },
  IMPLEMENT: {
    filename: 'Template_Import_Thiet_Bi_Nong_Cu_THACO_AGRI.xlsx',
    dataSheet: 'Thiet_Bi_Nong_Cu',
    title: 'THIẾT BỊ & NÔNG CỤ PHỤ TRỢ',
    columns: [
      ['Mã nông cụ / Thiết bị (*)', 'code', 'CHT-CNA-001'], ['Tên nông cụ / Thiết bị (*)', 'name', 'Dàn cày 4 chảo Kubota DP4'],
      ['Nhóm nông cụ (*)', 'category', 'DAN_CAY'], ['Khu liên hợp (*)', 'complexCode', 'KOUN_MOM'],
      ['Đơn vị sử dụng / XN (*)', 'unit', 'BAN_CO_GIOI'], ['Khu vực địa lý', 'regionCode', 'DP'],
      ['Bãi / Nơi tập kết (*)', 'gatheringLocation', 'Lô 85 DP4'], ['Họ tên NS Quản lý', 'managerName', 'Phạm Ngọc Hải'],
      ['Số điện thoại / Zalo NS', 'managerPhone', '0825456565'], ['Hãng sản xuất / Hiệu', 'brand', 'KUBOTA'],
      ['Model nông cụ', 'model', 'DP244'], ['Năm sản xuất', 'year', 2023], ['Quốc gia xuất xứ', 'origin', 'THÁI LAN'],
      ['Tình trạng mua sắm', 'purchaseCondition', 'MUA MỚI'], ['Pháp nhân sở hữu', 'companyOwner', 'THACO AGRI'],
      ['Tình trạng kỹ thuật (*)', 'technicalCondition', 'GOOD'], ['Cảnh báo độ mòn', 'alertTier', 'GREEN'],
      ['Trạng thái vận hành (*)', 'status', 'IN_DEPOT'], ['Mã xe cơ giới gắn kèm', 'attachedVehicleCode', 'CHT-MKE-012'],
      ['Ngày gắn vào xe', 'attachedAt', '10/08/2026'], ['Công năng / Tiêu chuẩn kỹ thuật', 'standardPurpose', 'Cày sâu 35-40cm'],
      ['Ghi chú bảo dưỡng / sửa chữa', 'maintenanceNotes', 'Theo dõi độ mòn định kỳ'],
    ].map(([header, field, sample]) => ({ header: String(header), field: String(field), sample })),
  },
  ASSIGNMENT: {
    filename: 'Template_Import_Phan_Bo_Dieu_Chuyen_THACO_AGRI.xlsx',
    dataSheet: 'Phan_Bo_Dieu_Chuyen',
    title: 'PHÂN BỔ XE & NÔNG CỤ CHO ĐƠN VỊ',
    columns: [
      ['Loại tài sản (*)', 'assetType', 'XE_CO_GIOI'], ['Mã phương tiện / Nông cụ (*)', 'itemCode', 'CHT-MDA-068'],
      ['Tên phương tiện / Nông cụ', 'itemName', 'Máy đào bánh xích SK200'], ['Biển số xe (nếu có)', 'plateNumber', '72A-12345'],
      ['Khu liên hợp (*)', 'complexCode', 'KOUN_MOM'], ['Đơn vị quản lý cũ', 'oldUnitName', 'Ban Cơ Giới KLH'],
      ['Vị trí / Bãi xe cũ', 'oldLocation', 'Tổng kho KLH'], ['Người quản lý cũ', 'oldManager', 'Nguyễn Tấn Triều'],
      ['SĐT người quản lý cũ', 'oldManagerPhone', '05974160290'], ['Đơn vị tiếp nhận mới (*)', 'newUnitName', 'XN Chuối LP2'],
      ['Khu vực / Nông trường mới', 'newRegion', 'LP'], ['Vị trí / Nơi làm việc mới (*)', 'newLocation', 'Lô 7 LP1'],
      ['Người tiếp nhận / Quản lý (*)', 'newManager', 'Lê Cao Nghị'], ['SĐT người tiếp nhận (*)', 'newManagerPhone', '0977423100'],
      ['Mã tài xế bàn giao (nếu có)', 'driverCode', 'TX-NT1-008'], ['Họ tên tài xế phụ trách', 'driverName', 'Nguyễn Văn Tuấn'],
      ['Số điện thoại tài xế', 'driverPhone', '0912345678'], ['Ngày phân bổ / Bàn giao (*)', 'assignedDate', '15/08/2026'],
      ['Số quyết định / Công văn', 'decisionNumber', '128/QĐ-KLH-2026'], ['Mục đích điều động / Nhiệm vụ', 'purpose', 'Vận hành theo kế hoạch sản xuất'],
      ['Ghi chú biên bản bàn giao', 'transferHistory', 'Bàn giao đầy đủ phụ kiện'],
    ].map(([header, field, sample]) => ({ header: String(header), field: String(field), sample })),
  },
  DRIVER: {
    filename: 'Template_Import_Ho_So_Lai_Xe_THACO_AGRI.xlsx',
    dataSheet: 'Ho_So_Lai_Xe',
    title: 'HỒ SƠ NHÂN SỰ LÁI XE & LÁI MÁY',
    columns: [
      ['Mã nhân sự / Lái xe (*)', 'code', 'TX-NT1-001'], ['Họ và tên (*)', 'fullName', 'Nguyễn Văn Tuấn'],
      ['Tên đăng nhập hệ thống', 'username', 'tuan.nv'], ['Số điện thoại di động (*)', 'phone', '0912345678'],
      ['Email làm việc', 'email', 'tuan.nv@thacoagri.com.vn'], ['Giới tính', 'gender', 'Nam'],
      ['Ngày tháng năm sinh', 'dateOfBirth', '18/05/1990'], ['Quốc tịch', 'nationality', 'Việt Nam'],
      ['Số CCCD / CMND / Hộ chiếu', 'idCardNumber', '079201004567'], ['Ngày cấp CCCD', 'idCardIssueDate', '15/06/2021'],
      ['Nơi cấp CCCD', 'idCardIssuePlace', 'Cục Cảnh sát QLHC về TTXH'], ['Địa chỉ thường trú', 'permanentAddress', 'Huyện Koun Mom, Ratanakiri'],
      ['Nơi ở hiện tại / Cư xá', 'currentAddress', 'Khu cư xá Nông trường 1'], ['Khu liên hợp (*)', 'complex', 'KOUN_MOM'],
      ['Đơn vị / Xí nghiệp (*)', 'businessUnit', 'XN Chuối DP1'], ['Nông trường / Cụm', 'farm', 'Nông trường 1'],
      ['Tổ / Đội sản xuất', 'team', 'Đội Cơ giới 1'], ['Chức danh / Vị trí (*)', 'position', 'Lái máy kéo nông nghiệp'],
      ['Loại hợp đồng lao động', 'contractType', 'HĐLĐ xác định thời hạn'], ['Ngày vào làm việc (*)', 'joinedDate', '01/01/2023'],
      ['Tình trạng làm việc (*)', 'employmentStatus', 'DANG_LAM_VIEC'], ['Ngày thôi việc (nếu có)', 'resignedDate', ''],
      ['Lý do thôi việc', 'resignedReason', ''], ['Hạng giấy phép lái xe (*)', 'licenseClass', 'BANG_MAY_NONG_NGHIEP'],
      ['Số giấy phép lái xe', 'licenseNumber', '790123456789'], ['Ngày cấp GPLX', 'licenseIssueDate', '12/04/2020'],
      ['Ngày hết hạn GPLX (*)', 'licenseExpiryDate', '12/04/2028'], ['Hạn khám sức khỏe định kỳ', 'healthCheckExpiryDate', '15/10/2026'],
      ['Mã xe cơ giới phụ trách chính', 'primaryVehicleCode', 'CHT-MDA-001'], ['Trạng thái ca làm việc', 'currentShiftStatus', 'SAN_SANG'],
    ].map(([header, field, sample]) => ({ header: String(header), field: String(field), sample })),
  },
};

const normalizeHeader = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN');

export const toIsoDate = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
};

export const downloadOperationalTemplate = (type: OperationalTemplateType) => {
  const definition = definitions[type];
  const headers = definition.columns.map((column) => column.header);
  const samples = definition.columns.map((column) => column.sample ?? '');
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, samples]);
  dataSheet['!cols'] = definition.columns.map((column) => ({ wch: Math.min(34, Math.max(16, column.header.length + 3)) }));
  dataSheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}2` };

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE IMPORT THACO AGRI', definition.title],
    ['Hướng dẫn', 'Giữ nguyên tên cột. Xóa dòng dữ liệu mẫu trước khi nhập dữ liệu thật. Các cột có (*) là bắt buộc.'],
    ['Định dạng ngày', 'dd/mm/yyyy'],
    ['Tên sheet dữ liệu', definition.dataSheet],
    ['Số cột', definition.columns.length],
  ]);
  guideSheet['!cols'] = [{ wch: 26 }, { wch: 100 }];

  const catalogSheet = XLSX.utils.aoa_to_sheet(commonCatalogRows);
  catalogSheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 58 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, definition.dataSheet);
  XLSX.utils.book_append_sheet(workbook, catalogSheet, 'Danh_Muc_Chuan');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Huong_Dan');
  XLSX.writeFile(workbook, definition.filename, { compression: true });
};

export const parseOperationalImport = async (file: File, type: OperationalTemplateType): Promise<Record<string, unknown>[]> => {
  const definition = definitions[type];
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[definition.dataSheet] || workbook.Sheets[workbook.SheetNames.find((name) => name !== 'Huong_Dan' && name !== 'Danh_Muc_Chuan') || ''];
  if (!sheet) throw new Error(`Không tìm thấy sheet dữ liệu ${definition.dataSheet}.`);

  const fieldByHeader = new Map(definition.columns.map((column) => [normalizeHeader(column.header), column.field]));
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
  const firstHeader = normalizeHeader(definition.columns[0].header);
  const headerIndex = rawRows.findIndex((row) => Array.isArray(row) && row.some((value) => normalizeHeader(value) === firstHeader));
  if (headerIndex < 0) throw new Error(`Không tìm thấy hàng tiêu đề của template ${definition.filename}.`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true, range: headerIndex });
  const sampleSignature = JSON.stringify(definition.columns.map((column) => String(column.sample ?? '').trim()));

  return rows
    .map((row) => {
      const normalized: Record<string, unknown> = {};
      Object.entries(row).forEach(([header, value]) => {
        const field = fieldByHeader.get(normalizeHeader(header));
        if (field && value !== '') normalized[field] = typeof value === 'string' ? value.trim() : value;
      });
      return normalized;
    })
    .filter((row) => Object.keys(row).length > 0)
    .filter((row) => !String(row[definition.columns[0].field] ?? '').trim().startsWith('<'))
    .filter((row) => JSON.stringify(definition.columns.map((column) => String(row[column.field] ?? '').trim())) !== sampleSignature);
};

export const getOperationalTemplateFilename = (type: OperationalTemplateType) => definitions[type].filename;
