const XLSX = require('xlsx');
const path = require('path');

const outputDir = path.resolve(__dirname, '..', 'FileTemplate_mau');

const catalogs = [
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

const templates = [
  {
    filename: 'Template_Import_Ho_So_Xe_THACO_AGRI.xlsx', sheet: 'Ho_So_Xe', title: 'HỒ SƠ XE & MMTB',
    headers: ['Mã MMTB mới (*)','Mã MMTB cũ','Mã Bravo ERP','Biển số xe','Tên phương tiện (*)','Nhóm tài sản (*)','Chủng loại xe (*)','Phân loại phụ','Khu liên hợp (*)','Đơn vị sử dụng (*)','Khu vực địa lý','Hãng sản xuất','Model xe','Năm sản xuất','Quốc gia xuất xứ','Công suất động cơ','Số khung','Số máy','Định mức dầu chuẩn','Đơn vị định mức dầu','Dung tích thùng dầu (Lít)','Tình trạng mua sắm','Nhà cung cấp','Pháp nhân sở hữu','Mã tài sản kế toán','Hạn kiểm định/Đăng kiểm','Hạn nộp phí đường bộ','Mã thiết bị GPS (IMEI)','Mã cảm biến dầu (IMEI)','Vị trí / Bãi tập kết','Số giờ máy hoạt động','Số Km lăn bánh (ODO)','Trạng thái vận hành (*)','Ghi chú phương tiện'],
    sample: ['CHT-MDA-001','MD-01-DP','BV-2024-889','72A-123.45','Máy đào bánh xích KOBELCO SK200-8','MAY_CONG_TRINH','MAY_DAO','Máy đào bánh lốp','KOUN_MOM','CGTC DP','DP','KOBELCO','SK200-08',2022,'NHẬT BẢN','140 HP','FRAME-001','ENGINE-001',12.5,'L_PER_HOUR',320,'Mua mới 100%','THACO AGRI','THACO AGRI','TSCD-2024-0091','25/12/2026','25/12/2026','864201041234567','F-902148','Lô 85 DP4',1250.5,45200,'HOAT_DONG','Xe phục vụ làm đất'],
  },
  {
    filename: 'Template_Import_Thiet_Bi_Nong_Cu_THACO_AGRI.xlsx', sheet: 'Thiet_Bi_Nong_Cu', title: 'THIẾT BỊ & NÔNG CỤ PHỤ TRỢ',
    headers: ['Mã nông cụ / Thiết bị (*)','Tên nông cụ / Thiết bị (*)','Nhóm nông cụ (*)','Khu liên hợp (*)','Đơn vị sử dụng / XN (*)','Khu vực địa lý','Bãi / Nơi tập kết (*)','Họ tên NS Quản lý','Số điện thoại / Zalo NS','Hãng sản xuất / Hiệu','Model nông cụ','Năm sản xuất','Quốc gia xuất xứ','Tình trạng mua sắm','Pháp nhân sở hữu','Tình trạng kỹ thuật (*)','Cảnh báo độ mòn','Trạng thái vận hành (*)','Mã xe cơ giới gắn kèm','Ngày gắn vào xe','Công năng / Tiêu chuẩn kỹ thuật','Ghi chú bảo dưỡng / sửa chữa'],
    sample: ['CHT-CNA-001','Dàn cày 4 chảo Kubota DP4','DAN_CAY','KOUN_MOM','BAN_CO_GIOI','DP','Lô 85 DP4','Phạm Ngọc Hải','0825456565','KUBOTA','DP244',2023,'THÁI LAN','MUA MỚI','THACO AGRI','GOOD','GREEN','IN_DEPOT','CHT-MKE-012','10/08/2026','Cày sâu 35-40cm','Theo dõi độ mòn định kỳ'],
  },
  {
    filename: 'Template_Import_Phan_Bo_Dieu_Chuyen_THACO_AGRI.xlsx', sheet: 'Phan_Bo_Dieu_Chuyen', title: 'PHÂN BỔ XE & NÔNG CỤ CHO ĐƠN VỊ',
    headers: ['Loại tài sản (*)','Mã phương tiện / Nông cụ (*)','Tên phương tiện / Nông cụ','Biển số xe (nếu có)','Khu liên hợp (*)','Đơn vị quản lý cũ','Vị trí / Bãi xe cũ','Người quản lý cũ','SĐT người quản lý cũ','Đơn vị tiếp nhận mới (*)','Khu vực / Nông trường mới','Vị trí / Nơi làm việc mới (*)','Người tiếp nhận / Quản lý (*)','SĐT người tiếp nhận (*)','Mã tài xế bàn giao (nếu có)','Họ tên tài xế phụ trách','Số điện thoại tài xế','Ngày phân bổ / Bàn giao (*)','Số quyết định / Công văn','Mục đích điều động / Nhiệm vụ','Ghi chú biên bản bàn giao'],
    sample: ['XE_CO_GIOI','CHT-MDA-068','Máy đào bánh xích SK200','72A-12345','KOUN_MOM','Ban Cơ Giới KLH','Tổng kho KLH','Nguyễn Tấn Triều','05974160290','XN Chuối LP2','LP','Lô 7 LP1','Lê Cao Nghị','0977423100','TX-NT1-008','Nguyễn Văn Tuấn','0912345678','15/08/2026','128/QĐ-KLH-2026','Vận hành theo kế hoạch sản xuất','Bàn giao đầy đủ phụ kiện'],
  },
  {
    filename: 'Template_Import_Ho_So_Lai_Xe_THACO_AGRI.xlsx', sheet: 'Ho_So_Lai_Xe', title: 'HỒ SƠ NHÂN SỰ LÁI XE & LÁI MÁY',
    headers: ['Mã nhân sự / Lái xe (*)','Họ và tên (*)','Tên đăng nhập hệ thống','Số điện thoại di động (*)','Email làm việc','Giới tính','Ngày tháng năm sinh','Quốc tịch','Số CCCD / CMND / Hộ chiếu','Ngày cấp CCCD','Nơi cấp CCCD','Địa chỉ thường trú','Nơi ở hiện tại / Cư xá','Khu liên hợp (*)','Đơn vị / Xí nghiệp (*)','Nông trường / Cụm','Tổ / Đội sản xuất','Chức danh / Vị trí (*)','Loại hợp đồng lao động','Ngày vào làm việc (*)','Tình trạng làm việc (*)','Ngày thôi việc (nếu có)','Lý do thôi việc','Hạng giấy phép lái xe (*)','Số giấy phép lái xe','Ngày cấp GPLX','Ngày hết hạn GPLX (*)','Hạn khám sức khỏe định kỳ','Mã xe cơ giới phụ trách chính','Trạng thái ca làm việc'],
    sample: ['TX-NT1-001','Nguyễn Văn Tuấn','tuan.nv','0912345678','tuan.nv@thacoagri.com.vn','Nam','18/05/1990','Việt Nam','079201004567','15/06/2021','Cục Cảnh sát QLHC về TTXH','Huyện Koun Mom, Ratanakiri','Khu cư xá Nông trường 1','KOUN_MOM','XN Chuối DP1','Nông trường 1','Đội Cơ giới 1','Lái máy kéo nông nghiệp','HĐLĐ xác định thời hạn','01/01/2023','DANG_LAM_VIEC','','','BANG_MAY_NONG_NGHIEP','790123456789','12/04/2020','12/04/2028','15/10/2026','CHT-MDA-001','SAN_SANG'],
  },
];

for (const template of templates) {
  const instructions = template.headers.map((header) => {
    const normalized = header.toLocaleLowerCase('vi-VN');
    if (normalized.includes('ngày') || normalized.includes('hạn ')) return '<Ngày dd/mm/yyyy>';
    if (normalized.includes('năm sản xuất') || normalized.includes('định mức') || normalized.includes('dung tích') || normalized.includes('số giờ') || normalized.includes('odo')) return '<Số>';
    return header.includes('(*)') ? '<Text> - <Bắt buộc nhập *>' : '<Text>';
  });
  const dataSheet = XLSX.utils.aoa_to_sheet([[template.title], [], template.headers, instructions, template.sample]);
  dataSheet['!cols'] = template.headers.map((header) => ({ wch: Math.min(36, Math.max(16, header.length + 3)) }));
  dataSheet['!autofilter'] = { ref: `A3:${XLSX.utils.encode_col(template.headers.length - 1)}5` };

  const catalogSheet = XLSX.utils.aoa_to_sheet(catalogs);
  catalogSheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 58 }];

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ['TEMPLATE IMPORT THACO AGRI', template.title],
    ['Hướng dẫn', 'Giữ nguyên tên cột. Xóa dòng dữ liệu mẫu trước khi nhập dữ liệu thật. Các cột có (*) là bắt buộc.'],
    ['Định dạng ngày', 'dd/mm/yyyy'],
    ['Tên sheet dữ liệu', template.sheet],
    ['Số cột', template.headers.length],
  ]);
  guideSheet['!cols'] = [{ wch: 26 }, { wch: 100 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, template.sheet);
  XLSX.utils.book_append_sheet(workbook, catalogSheet, 'Danh_Muc_Chuan');
  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Huong_Dan');
  XLSX.writeFile(workbook, path.join(outputDir, template.filename), { compression: true });
}

console.log(`Generated ${templates.length} operational templates in ${outputDir}`);
