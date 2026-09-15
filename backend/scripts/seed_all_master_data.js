const { PrismaClient, CatalogType } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. COMPANIES (Pháp nhân công ty)
const COMPANIES_DATA = [
  {
    code: 'THACO_AGRI',
    name: 'Công ty Cổ phần Nông nghiệp Trường Hải (THACO AGRI)',
    address: 'Khu công nghiệp Tam Hiệp, xã Núi Thành, TP. Đà Nẵng',
    field: 'Quản trị Nông nghiệp, Cơ giới hóa & Chăn nuôi quy mô lớn',
    businessLicense: '4000778899',
    charterCapital: '15,000,000,000,000 VND',
  },
  {
    code: 'KOUN_MOM_AGRI',
    name: 'Công ty TNHH Nông nghiệp Koun Mom (Campuchia)',
    address: 'Huyện Koun Mom, Tỉnh Ratanakiri, Vương quốc Campuchia',
    field: 'Trồng trọt Chuối xuất khẩu, Cây ăn trái & Chăn nuôi Bò thịt công nghệ cao',
    businessLicense: 'KH-098234-KM',
    charterCapital: '500,000,000 USD',
  },
  {
    code: 'SNUOL_AGRI',
    name: 'Công ty TNHH Nông nghiệp Snuol (Campuchia)',
    address: 'Huyện Snuol, Tỉnh Kratie, Vương quốc Campuchia',
    field: 'Khu Liên Hợp Cây Ăn Trái, Cỏ voi trạm TMR & Chăn nuôi Bò',
    businessLicense: 'KH-112344-SN',
    charterCapital: '350,000,000 USD',
  },
  {
    code: 'NAM_LAO_AGRI',
    name: 'Công ty TNHH Nông nghiệp Nam Lào (Lào)',
    address: 'Tỉnh Attapeu, Nước CHDCND Lào',
    field: 'Nông nghiệp & Cơ giới hóa Nam Lào, Cây ăn trái & Chăn nuôi',
    businessLicense: 'LA-556677-NL',
    charterCapital: '250,000,000 USD',
  },
];

// 2. POSITIONS (21 Chức danh lái xe & vận hành máy)
const POSITIONS_DATA = [
  { id: 'POS1', code: 'CD_TX_CONTAINER', name: 'Lái xe đầu kéo Container', description: 'Vận tải container chuối xuất khẩu và đối lưu hàng hóa đường dài' },
  { id: 'POS2', code: 'CD_TX_BEN', name: 'Lái xe tải tự đổ (ben)', description: 'Vận chuyển chuối buồng, phân bón, đất đắp và phụ phẩm nông nghiệp' },
  { id: 'POS3', code: 'CD_TX_TAI_THUNG', name: 'Lái xe tải thùng & xe tải nhẹ', description: 'Vận chuyển bao bì đóng gói, vật tư nông trường và phân phối hàng hóa' },
  { id: 'POS4', code: 'CD_TX_BAN_TAI', name: 'Lái xe bán tải & phục vụ công vụ', description: 'Đưa đón kỹ sư, quản lý và kiểm tra tuần tra vườn cây thực địa' },
  { id: 'POS5', code: 'CD_TX_BON', name: 'Lái xe bồn chuyên dụng', description: 'Tiếp nhiên liệu lưu động, bồn tưới nước, bồn mật rỉ và cấp nước sinh hoạt' },
  { id: 'POS6', code: 'CD_TX_NANG', name: 'Lái xe nâng hàng (Forklift)', description: 'Bốc dỡ pallet chuối xuất khẩu, phân bón và sắp xếp hàng tổng kho' },
  { id: 'POS7', code: 'CD_TX_CAU', name: 'Lái xe cẩu tự hành & cứu hộ', description: 'Cứu hộ cơ giới hiện trường, bốc dỡ máy móc và vật tư quá khổ' },
  { id: 'POS8', code: 'CD_LAI_MAY_CAY', name: 'Thợ lái máy cày bánh hơi', description: 'Vận hành máy cày Kubota, John Deere làm đất, phay đất và kéo rơ-moóc' },
  { id: 'POS9', code: 'CD_LAI_MAY_XICH', name: 'Thợ lái máy cày bánh xích', description: 'Cày phá lâm, xới đất đầm lầy và khai hoang đất dốc' },
  { id: 'POS10', code: 'CD_MAY_GAT_DAP', name: 'Thợ vận hành máy gặt đập liên hợp', description: 'Thu hoạch lúa, ngô, đậu tương và cây trồng thương phẩm' },
  { id: 'POS11', code: 'CD_MAY_GAT_CO', name: 'Thợ vận hành máy gặt & cắt cỏ', description: 'Cắt cỏ voi, cao lương phục vụ thức ăn xanh cho đàn bò' },
  { id: 'POS12', code: 'CD_MAY_BAM_TMR', name: 'Thợ vận hành máy băm trộn TMR', description: 'Băm trộn thức ăn tổng hợp TMR và cấp phát tại các ô chuồng bò' },
  { id: 'POS13', code: 'CD_MAY_PHUN_THUOC', name: 'Thợ vận hành máy phun thuốc tự hành', description: 'Phun thuốc bảo vệ thực vật và tưới vi sinh diện rộng' },
  { id: 'POS14', code: 'CD_MAY_GIEO_HAT', name: 'Thợ vận hành máy gieo hạt & rải phân', description: 'Gieo hạt tự động, bón lót và bón thúc chính xác theo định mức' },
  { id: 'POS15', code: 'CD_MAY_DAO', name: 'Thợ lái máy đào thủy lực', description: 'Đào mương tiêu, đắp bờ bao, nạo vét lòng hồ chứa nước' },
  { id: 'POS16', code: 'CD_MAY_SAN_LU', name: 'Thợ lái máy san gạt & lu rung', description: 'San nền, gia cố và duy tu đường lô giao thông nội đồng' },
  { id: 'POS17', code: 'CD_CUU_HO_THO_MAY', name: 'Lái xe cứu hộ kiêm Thợ máy', description: 'Trực cứu hộ kỹ thuật 24/7 và sửa chữa nóng tại hiện trường lô thửa' },
  { id: 'POS18', code: 'CD_THO_SUA_CHUA', name: 'Thợ sửa chữa cơ giới lưu động', description: 'Bảo dưỡng định kỳ 250h, sửa chữa tiểu tu, trung tu và đại tu' },
  { id: 'POS19', code: 'CD_THO_DIEN_MAY', name: 'Thợ điện & điện lạnh xe máy', description: 'Bảo trì hệ thống điện điều khiển, rơ-le, dynamo và máy lạnh cabin' },
  { id: 'POS20', code: 'CD_THO_HAN', name: 'Thợ hàn cơ khí & phục hồi nông cụ', description: 'Gia công hàn, phục hồi lưỡi chảo cày, dàn bừa và rơ-moóc kéo' },
  { id: 'POS21', code: 'CD_THO_LOP', name: 'Thợ bảo dưỡng săm lốp cơ giới', description: 'Thay thế, vá lốp siêu tải, cân chỉnh áp suất và đảo lốp cơ giới' },
];

// 3. PLOTS (10 Lô canh tác Nông nghiệp)
const PLOTS_DATA = [
  { id: 'PLOT-KM-01', code: 'LO-KM-01', name: 'Lô C1 - Nông trường Chuối 1', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 1', areaHa: 25.5, description: 'Chuối Nam Mỹ Foc TR4 (Vụ 2) | Tưới nhỏ giọt bù áp tự động Netafim', status: 'HOAT_DONG' },
  { id: 'PLOT-KM-02', code: 'LO-KM-02', name: 'Lô C2 - Nông trường Chuối 1', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 1', areaHa: 28.0, description: 'Chuối Nam Mỹ Foc TR4 (Vụ 1) | Chuẩn bị thu hoạch đợt 1', status: 'HOAT_DONG' },
  { id: 'PLOT-KM-03', code: 'LO-KM-03', name: 'Lô A1 - Nông trường Chuối 2', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 2', areaHa: 32.4, description: 'Chuối Nam Mỹ cấy mô Foc TR4 | Đang làm đất cày lật và bừa đĩa', status: 'HOAT_DONG' },
  { id: 'PLOT-KM-04', code: 'LO-KM-04', name: 'Lô A2 - Nông trường Chuối 2', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 2', areaHa: 30.0, description: 'Chuối Nam Mỹ cấy mô Foc TR4 | Đang bón phân định kỳ và tỉa chồi', status: 'HOAT_DONG' },
  { id: 'PLOT-KM-05', code: 'LO-KM-05', name: 'Lô B1 - Khu Thức ăn gia súc KM', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Xí nghiệp Chăn nuôi Bò Koun Mom', farmName: 'Vùng đệm Cỏ voi Packchong', areaHa: 45.0, description: 'Cỏ voi Packchong 1 ủ chua | Cắt cỏ voi định kỳ cho trại bò', status: 'HOAT_DONG' },
  { id: 'PLOT-KM-06', code: 'LO-KM-06', name: 'Lô B2 - Khu Thức ăn gia súc KM', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Xí nghiệp Chăn nuôi Bò Koun Mom', farmName: 'Vùng đệm Bắp sinh khối', areaHa: 38.5, description: 'Bắp sinh khối chuyên ủ chua | Tái canh sau thu hoạch đợt 2', status: 'HOAT_DONG' },
  { id: 'PLOT-SN-01', code: 'LO-SN-01', name: 'Lô Chuối NT1 - Snoul', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', enterpriseName: 'Xí nghiệp Nông nghiệp Snoul', farmName: 'Nông trường Chuối Snoul 1', areaHa: 26.8, description: 'Chuối Nam Mỹ Foc TR4 | Xe kéo moóc chú ý tốc độ < 15 km/h', status: 'HOAT_DONG' },
  { id: 'PLOT-SN-02', code: 'LO-SN-02', name: 'Lô Cao su KT2 - Snoul', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', enterpriseName: 'Xí nghiệp Cao su Snoul', farmName: 'Nông trường Cao su 2', areaHa: 52.0, description: 'Cao su khai thác mủ năm 6 | Xe phát cỏ luồng và chở mủ đông', status: 'HOAT_DONG' },
  { id: 'PLOT-NL-01', code: 'LO-NL-01', name: 'Lô Cây ăn trái Paksong 1', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', enterpriseName: 'Xí nghiệp Cây ăn trái Nam Lào', farmName: 'Nông trường Paksong', areaHa: 40.0, description: 'Bơ booth & Sầu riêng Monthong | Độ cao 1,000m dốc bậc thang', status: 'HOAT_DONG' },
  { id: 'PLOT-NL-02', code: 'LO-NL-02', name: 'Lô Cỏ voi Trại Bò Nam Lào', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', enterpriseName: 'Xí nghiệp Chăn nuôi Bò Nam Lào', farmName: 'Nông trường Chăn nuôi Sanxay', areaHa: 48.0, description: 'Cỏ voi Packchong & Cao lương | Cắt băm rải trực tiếp máng ăn', status: 'HOAT_DONG' },
];

// 4. LAND PARCELS (8 Thửa đất nông nghiệp)
const LAND_PARCELS_DATA = [
  { id: 'PARCEL-KM-01', code: 'THUA-KM-01', name: 'Thửa 01 - Lô C1 (NT1 Koun Mom)', parentCode: 'LO-KM-01', parentName: 'Lô C1 - Nông trường Chuối 1', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 1', areaHa: 12.5, plotStatus: 'Đang thu hoạch chuối', description: 'Thửa chuối tơ vụ 2 năng suất cao', status: 'HOAT_DONG' },
  { id: 'PARCEL-KM-02', code: 'THUA-KM-02', name: 'Thửa 02 - Lô C1 (NT1 Koun Mom)', parentCode: 'LO-KM-01', parentName: 'Lô C1 - Nông trường Chuối 1', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 1', areaHa: 13.0, plotStatus: 'Đang chăm sóc & bao buồng', description: 'Thửa chuối bao buồng chống côn trùng', status: 'HOAT_DONG' },
  { id: 'PARCEL-KM-03', code: 'THUA-KM-03', name: 'Thửa 01 - Lô C2 (NT1 Koun Mom)', parentCode: 'LO-KM-02', parentName: 'Lô C2 - Nông trường Chuối 1', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 1', areaHa: 14.0, plotStatus: 'Đang tưới nhỏ giọt', description: 'Thửa hệ thống Netafim tự động', status: 'HOAT_DONG' },
  { id: 'PARCEL-KM-04', code: 'THUA-KM-04', name: 'Thửa 02 - Lô C2 (NT1 Koun Mom)', parentCode: 'LO-KM-02', parentName: 'Lô C2 - Nông trường Chuối 1', enterpriseName: 'Xí nghiệp Trồng trọt Chuối Koun Mom', farmName: 'Nông trường Chuối 1', areaHa: 14.0, plotStatus: 'Chuẩn bị thu hoạch', description: 'Thửa đạt chuẩn GlobalGAP', status: 'HOAT_DONG' },
  { id: 'PARCEL-SN-01', code: 'THUA-SN-01', name: 'Thửa 01 - Lô Chuối NT1 Snoul', parentCode: 'LO-SN-01', parentName: 'Lô Chuối NT1 - Snoul', enterpriseName: 'Xí nghiệp Nông nghiệp Snoul', farmName: 'Nông trường Chuối Snoul 1', areaHa: 13.4, plotStatus: 'Đang canh tác', description: 'Thửa dốc thoải đất đỏ bazan', status: 'HOAT_DONG' },
  { id: 'PARCEL-SN-02', code: 'THUA-SN-02', name: 'Thửa 02 - Lô Chuối NT1 Snoul', parentCode: 'LO-SN-01', parentName: 'Lô Chuối NT1 - Snoul', enterpriseName: 'Xí nghiệp Nông nghiệp Snoul', farmName: 'Nông trường Chuối Snoul 1', areaHa: 13.4, plotStatus: 'Đang canh tác', description: 'Thửa chuối xuất khẩu chính vụ', status: 'HOAT_DONG' },
  { id: 'PARCEL-NL-01', code: 'THUA-NL-01', name: 'Thửa 01 - Lô Cây ăn trái Paksong', parentCode: 'LO-NL-01', parentName: 'Lô Cây ăn trái Paksong 1', enterpriseName: 'Xí nghiệp Cây ăn trái Nam Lào', farmName: 'Nông trường Paksong', areaHa: 20.0, plotStatus: 'Cây năm thứ 3', description: 'Thửa sầu riêng Monthong tưới phun gốc', status: 'HOAT_DONG' },
  { id: 'PARCEL-NL-02', code: 'THUA-NL-02', name: 'Thửa 02 - Lô Cây ăn trái Paksong', parentCode: 'LO-NL-01', parentName: 'Lô Cây ăn trái Paksong 1', enterpriseName: 'Xí nghiệp Cây ăn trái Nam Lào', farmName: 'Nông trường Paksong', areaHa: 20.0, plotStatus: 'Cây năm thứ 2', description: 'Thửa bơ booth ghép cành cao sản', status: 'HOAT_DONG' },
];

// 5. CONSTRUCTION SITES (Khu vực thi công Công trình)
const CONSTRUCTION_SITES_DATA = [
  { id: 'SITE-KM-01', code: 'KV-CT-01', name: 'Khu vực Mương chính Koun Mom', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Ban QLDA Xây dựng Koun Mom', description: 'Đào đắp mương máng | Quy mô: 12,000 m³ | Máy đào 0.8m³, Xe ủi D6', status: 'HOAT_DONG' },
  { id: 'SITE-KM-02', code: 'KV-CT-02', name: 'Khu vực San nền Sân phơi & Trạm sơ chế NT1', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Ban QLDA Xây dựng Koun Mom', description: 'San lấp mặt bằng | Quy mô: 8.5 ha | Máy san gạt GD555, Xe lu rung 14T', status: 'HOAT_DONG' },
  { id: 'SITE-KM-03', code: 'KV-CT-03', name: 'Tuyến đường trục chính nội bộ NT1 ➔ NT2', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', enterpriseName: 'Đội Thi công Cơ giới 1', description: 'Mở đường & Lu lèn | Quy mô: 6.2 km | Xe lu rung, Máy rải cấp phối', status: 'HOAT_DONG' },
  { id: 'SITE-SN-01', code: 'KV-CT-SN-01', name: 'Hồ lắng sinh học Xí nghiệp Chăn nuôi Snoul', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', enterpriseName: 'Ban Xây dựng KLH Snoul', description: 'Hồ đập & thoát lũ | Quy mô: 25,000 m³ | Máy đào gầu 1.2m³, Xe ben 15T', status: 'HOAT_DONG' },
  { id: 'SITE-NL-01', code: 'KV-CT-NL-01', name: 'Kè rọ đá chống sạt lở bờ suối Nam Lào', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', enterpriseName: 'Ban Hạ tầng Nam Lào', description: 'Kè & Bảo dưỡng | Quy mô: 1.8 km | Máy đào bánh xích, Xe cẩu 10T', status: 'HOAT_DONG' },
];

// 6. ROUTES (Tuyến đường vận chuyển nội bộ)
const ROUTES_DATA = [
  { id: 'RTE-KM-01', code: 'TD-KM-01', name: 'Nông trường 1 ➔ Xí nghiệp Bò Koun Mom', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', address: 'Kho phụ phẩm NT1 (Lô A/B) ➔ Trại Bò thịt', description: 'Cự ly: 12.5 km | Hàng: Thân lá chuối tươi | Tốc độ GPS: 35 km/h', status: 'HOAT_DONG' },
  { id: 'RTE-KM-02', code: 'TD-KM-02', name: 'Nông trường 2 ➔ Trung tâm Chế biến Thức ăn (TĂCN)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', address: 'Cánh đồng bắp sinh khối NT2 ➔ Hầm ủ chua TT TĂCN', description: 'Cự ly: 18.0 km | Hàng: Bắp sinh khối | Tốc độ GPS: 40 km/h', status: 'HOAT_DONG' },
  { id: 'RTE-KM-03', code: 'TD-KM-03', name: 'Lô thu hoạch ➔ Trạm sơ chế đóng gói chuối', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', address: 'Cụm Lô thu hoạch D01-D03 ➔ Xưởng đóng gói xuất khẩu', description: 'Cự ly: 4.5 km | Hàng: Rơ-moóc buồng chuối | Tốc độ GPS: 15 km/h', status: 'HOAT_DONG' },
  { id: 'RTE-KM-04', code: 'TD-KM-04', name: 'Kho Tổng KLH ➔ Chòi tập kết Nông trường', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', address: 'Kho Tổng Vật tư KLH ➔ Kho đệm Đội cơ giới NT1 & NT2', description: 'Cự ly: 8.0 km | Hàng: Phân bón vô cơ, vôi bột | Tốc độ GPS: 35 km/h', status: 'HOAT_DONG' },
  { id: 'RTE-SN-01', code: 'TD-SN-01', name: 'Nông trường Cao su Snoul ➔ Xưởng chế biến mủ', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', address: 'Trạm mủ NT Cao su ➔ Nhà máy chế biến mủ Snoul', description: 'Cự ly: 14.2 km | Hàng: Mủ cao su đông đặc | Tốc độ GPS: 40 km/h', status: 'HOAT_DONG' },
  { id: 'RTE-NL-01', code: 'TD-NL-01', name: 'Khu nông nghiệp Paksong ➔ Trại bò Nam Lào', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', address: 'Vùng đệm cỏ voi Paksong ➔ Trại Bò giống Nam Lào', description: 'Cự ly: 22.0 km | Hàng: Cỏ voi ủ chua & phụ phẩm | Tốc độ GPS: 45 km/h', status: 'HOAT_DONG' },
];

// 7. ORDER TYPES (4 Loại lệnh điều động cơ giới)
const ORDER_TYPES_DATA = [
  {
    id: 'ORD-01',
    code: 'LL-LSX',
    name: 'Lệnh Sản Xuất Nông Nghiệp',
    parentCode: 'NONG_NGHIEP',
    parentName: 'Cơ giới Nông nghiệp',
    description: 'Điều động máy móc làm đất, trồng mới, thu hoạch theo kế hoạch tuần gắn Lô/Thửa | Ca máy: 8-12h / ha | Định mức: 18.5 L/ha cày ải',
    status: 'HOAT_DONG',
  },
  {
    id: 'ORD-02',
    code: 'LL-LCT',
    name: 'Lệnh Điều Xe Công Trình & Ca Máy',
    parentCode: 'CONG_TRINH',
    parentName: 'Máy Công trình',
    description: 'Quản lý ca máy san gạt đường nội đồng, nạo vét kênh mương theo giờ máy | Ca máy: 8h/ca | Định mức: 14.5 L/h máy đào',
    status: 'HOAT_DONG',
  },
  {
    id: 'ORD-03',
    code: 'LL-LVC',
    name: 'Lệnh Vận Chuyển Nội Bộ',
    parentCode: 'VAN_CHUYEN',
    parentName: 'Vận chuyển nội bộ',
    description: 'Vận chuyển vật tư kho, phân bón, dầu diesel, bao bì, chuối xuất khẩu, luồng 3 chặng TĂCN bò | Chuyến: Km & Tấn | Định mức: 30.0 L/100km Howo',
    status: 'HOAT_DONG',
  },
  {
    id: 'ORD-04',
    code: 'LL-LĐX',
    name: 'Lệnh Điều Xe Công Tác & Cứu Hộ',
    parentCode: 'CUU_HO',
    parentName: 'Ứng cứu khẩn cấp',
    description: 'Điều xe công tác liên nông trường và kéo cứu hộ máy móc sự cố ngoài đồng; kích hoạt tức thì | Theo đợt công tác / Giờ cứu hộ',
    status: 'HOAT_DONG',
  },
];

// 8. SPARE PARTS (3 Phụ tùng / Vật tư ERP)
const SPARE_PARTS_DATA = [
  {
    id: 'PT-01',
    code: 'LOC-JD-001',
    name: 'Lọc nhớt động cơ John Deere 6120B',
    parentCode: 'LOC_NHOT',
    parentName: 'Lọc & Lõi lọc',
    systemId: '450000', // Đơn giá VNĐ
    description: 'Hãng: John Deere Genuine | ĐVT: Cái | Xe áp dụng: Máy kéo John Deere 6120B | Đơn giá: 450.000 VNĐ',
    status: 'HOAT_DONG',
  },
  {
    id: 'PT-02',
    code: 'DAU-HYD-046',
    name: 'Dầu thủy lực Shell Tellus S2 M46 (Phuy 209L)',
    parentCode: 'DAU_THUY_LUC',
    parentName: 'Dầu thủy lực',
    systemId: '78000', // Đơn giá VNĐ
    description: 'Hãng: Shell Lubricants | ĐVT: Lít | Xe áp dụng: Toàn bộ dàn nâng cày & ben xe tải | Đơn giá: 78.000 VNĐ/Lít',
    status: 'HOAT_DONG',
  },
  {
    id: 'PT-03',
    code: 'LOP-KB-954',
    name: 'Lốp sau máy kéo Kubota M9540 (18.4-30)',
    parentCode: 'LOP_SAM_YEM',
    parentName: 'Lốp & Săm yếm',
    systemId: '12500000', // Đơn giá VNĐ
    description: 'Hãng: BKT Tire | ĐVT: Quả | Xe áp dụng: Máy cày Kubota M9540 | Đơn giá: 12.500.000 VNĐ/Quả',
    status: 'HOAT_DONG',
  },
];

// 9. TECHNICAL QUOTAS (3 Bảng định mức kỹ thuật)
const TECHNICAL_QUOTAS_DATA = [
  {
    id: 'DM-01',
    code: 'DM-CAY-01',
    name: 'Định mức cày phá lâm / cày ngầm sâu',
    parentCode: 'NONG_NGHIEP',
    parentName: 'Cơ giới Nông nghiệp',
    description: 'Đối tượng: Máy kéo John Deere 6120B + Cày ngầm | Năng suất: 3.5 - 4.2 ha/ca | Giờ công: 8h/ca | Dung sai: ±5% | Ngày ban hành: 01/01/2026',
    status: 'HOAT_DONG',
  },
  {
    id: 'DM-02',
    code: 'DM-XOI-02',
    name: 'Định mức xới đất mặt & phay đất trồng chuối',
    parentCode: 'NONG_NGHIEP',
    parentName: 'Cơ giới Nông nghiệp',
    description: 'Đối tượng: Máy kéo Kubota M9540 + Dàn xới | Năng suất: 4.8 - 5.5 ha/ca | Giờ công: 8h/ca | Dung sai: ±5% | Ngày ban hành: 01/01/2026',
    status: 'HOAT_DONG',
  },
  {
    id: 'DM-03',
    code: 'DM-VT-03',
    name: 'Định mức vận chuyển buồng chuối về xưởng đóng gói',
    parentCode: 'VAN_CHUYEN',
    parentName: 'Vận chuyển nội bộ',
    description: 'Đối tượng: Xe kéo rơ-moóc chuyên dùng | Năng suất: 35 - 40 tấn/ca | Giờ công: 8h/ca | Dung sai: ±3% | Ngày ban hành: 15/02/2026',
    status: 'HOAT_DONG',
  },
];

// 10. CG MANAGERS (27 Quản lý cơ giới & đơn vị)
const CG_MANAGERS_DATA = [
  { id: 'CGM-01', code: 'CGM_DP1', name: 'Thái Cao Lưu', parentCode: 'KOUN_MOM', parentName: 'XN Chuối DP1', phone: '0387783316', address: 'Lô 21 DP1', status: 'HOAT_DONG' },
  { id: 'CGM-02', code: 'CGM_DP2', name: 'Huỳnh Quang Viên', parentCode: 'KOUN_MOM', parentName: 'XN Chuối DP2', phone: '0977623379', address: 'Lô 15.6 DP2', status: 'HOAT_DONG' },
  { id: 'CGM-03', code: 'CGM_DP3', name: 'Thạch Ngọc Vững', parentCode: 'KOUN_MOM', parentName: 'XN Chuối DP3', phone: '0975905267', address: 'Lô 28 DP3', status: 'HOAT_DONG' },
  { id: 'CGM-04', code: 'CGM_DP4', name: 'Cơ giới DP4', parentCode: 'KOUN_MOM', parentName: 'XN Chuối DP4', phone: '0825456565', address: 'Lô 85 DP4', status: 'HOAT_DONG' },
  { id: 'CGM-05', code: 'CGM_LP1', name: 'Nguyễn Ngọc Nhân', parentCode: 'KOUN_MOM', parentName: 'XN Chuối LP1', phone: '0979578112', address: 'Lô 7 LP1', status: 'HOAT_DONG' },
  { id: 'CGM-06', code: 'CGM_LP2', name: 'Cơ giới LP2', parentCode: 'KOUN_MOM', parentName: 'XN Chuối LP2', phone: '0979578112', address: 'Lô 7 LP1', status: 'HOAT_DONG' },
  { id: 'CGM-07', code: 'CGM_LP3', name: 'Lê Cao Nghị', parentCode: 'KOUN_MOM', parentName: 'XN Chuối LP3', phone: '0977423100', address: 'Lô 2 LP3', status: 'HOAT_DONG' },
  { id: 'CGM-08', code: 'CGM_AD_BO', name: 'Trần Văn Nam', parentCode: 'KOUN_MOM', parentName: 'XN Bò AD', phone: '0971993540', address: 'Lô 28 XN Bò', status: 'HOAT_DONG' },
  { id: 'CGM-09', code: 'CGM_CGLD_BO', name: 'T.Q.Đ Ngọc Hải', parentCode: 'KOUN_MOM', parentName: 'CGLĐ XN Bò', phone: '0344302386', address: 'Lô 28, 65 XN Bò', status: 'HOAT_DONG' },
  { id: 'CGM-10', code: 'CGM_CGLD_DP', name: 'Nguyễn Tấn Triều', parentCode: 'KOUN_MOM', parentName: 'CGLĐ DP', phone: '05974160290', address: 'Lô 85 DP4', status: 'HOAT_DONG' },
  { id: 'CGM-11', code: 'CGM_CGLD_LP', name: 'Nguyễn Tấn Triều', parentCode: 'KOUN_MOM', parentName: 'CGLĐ LP', phone: '05974160290', address: 'LP3.5-LP3', status: 'HOAT_DONG' },
  { id: 'CGM-12', code: 'CGM_CGTC_DP', name: 'Phạm Ngọc Hải', parentCode: 'KOUN_MOM', parentName: 'CGTC DP', phone: '0825456565', address: 'Lô 85 DP4', status: 'HOAT_DONG' },
  { id: 'CGM-13', code: 'CGM_CGTC_LP', name: 'Đỗ Đức Nghĩa', parentCode: 'KOUN_MOM', parentName: 'CGTC LP', phone: '0971462780', address: 'NOCN L.4-LP3', status: 'HOAT_DONG' },
  { id: 'CGM-14', code: 'CGM_CGTC_AD', name: 'Vũ Trung Kiên', parentCode: 'KOUN_MOM', parentName: 'CGTC AD', phone: '0981761677', address: 'Lô 73 ADM', status: 'HOAT_DONG' },
  { id: 'CGM-15', code: 'CGM_TRAM_TRON', name: 'Phạm Nhật Thịnh', parentCode: 'KOUN_MOM', parentName: 'Trạm trộn bê tông', phone: '0935178908', address: 'Trạm trộn DP', status: 'HOAT_DONG' },
  { id: 'CGM-16', code: 'CGM_HC_KLH', name: 'Lê Trần Hoàng Minh', parentCode: 'KOUN_MOM', parentName: 'Hành chính KLH', phone: '0965509539', address: 'Văn Phòng 94', status: 'HOAT_DONG' },
  { id: 'CGM-17', code: 'CGM_XOAI_AD', name: 'Huỳnh Đông Giang', parentCode: 'KOUN_MOM', parentName: 'Xoài AD', phone: '0972283372', address: 'Lô 132 XN AD', status: 'HOAT_DONG' },
  { id: 'CGM-18', code: 'CGM_XOAI_DP', name: 'Hà Văn Nghĩa', parentCode: 'KOUN_MOM', parentName: 'Xoài DP', phone: '0813564564', address: 'Lô 136 XN Xoài', status: 'HOAT_DONG' },
  { id: 'CGM-19', code: 'CGM_BUOI_AD', name: 'Huỳnh Đông Giang', parentCode: 'KOUN_MOM', parentName: 'Bưởi AD', phone: '0972283372', address: 'Lô 132 XN AD', status: 'HOAT_DONG' },
  { id: 'CGM-20', code: 'CGM_DIEN_NUOC', name: 'Trần Đình Phúc', parentCode: 'KOUN_MOM', parentName: 'Ban điện nước', phone: '0924518278', address: 'Kho điện nước', status: 'HOAT_DONG' },
  { id: 'CGM-21', code: 'CGM_XUONG_CK', name: 'Xưởng BTSC DP', parentCode: 'KOUN_MOM', parentName: 'Xưởng Cơ khí DP', phone: '0825456565', address: 'Xưởng cơ khí DP', status: 'HOAT_DONG' },
  { id: 'CGM-22', code: 'CGM_GNVC', name: 'Lâm Quốc Cường', parentCode: 'KOUN_MOM', parentName: 'Phòng GNVC', phone: '0384653979', address: 'Tổng kho KLH', status: 'HOAT_DONG' },
  { id: 'CGM-23', code: 'CGM_THADICONS', name: 'Cơ giới Thadicons', parentCode: 'KOUN_MOM', parentName: 'Thadicons A&I', phone: '0825456565', address: 'VP Thadicons', status: 'HOAT_DONG' },
  { id: 'CGM-24', code: 'CGM_THAGRICONS', name: 'Cơ giới Thagricons', parentCode: 'KOUN_MOM', parentName: 'Thagricons', phone: '0825456565', address: 'VP Thagricons', status: 'HOAT_DONG' },
  { id: 'CGM-25', code: 'CGM_TONG_KHO', name: 'Võ Thanh Hiếu', parentCode: 'KOUN_MOM', parentName: 'Tổng kho', phone: '0884281479', address: 'Tổng kho KLH', status: 'HOAT_DONG' },
  { id: 'CGM-26', code: 'CGM_NM_NHUA', name: 'Nguyễn Xuân Liêm', parentCode: 'KOUN_MOM', parentName: 'NM NHỰA -XỐP DP', phone: '0762578457', address: 'NM Nhựa', status: 'HOAT_DONG' },
  { id: 'CGM-27', code: 'CGM_BAN_CG', name: 'Ban Cơ Giới KLH', parentCode: 'KOUN_MOM', parentName: 'BAN CG-CK & SXCN', phone: '0825456565', address: 'VP Ban Cơ Giới', status: 'HOAT_DONG' },
];

// 11. MASTER JOBS (40 Hạng mục công việc cơ giới kèm định mức ca máy & nhiên liệu)
const MASTER_JOBS_RAW = [
  // 1. NÔNG NGHIỆP
  { id: 'JOB-AGRI-01', code: 'CV-LD-01', name: 'Cày lật phá lâm sâu 30cm', planType: 'NONG_NGHIEP', categoryCode: 'LAM_DAT', categoryName: '1. Làm đất', implementGroup: 'Dàn cày 3 - 4 chảo', recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP', defaultUnit: 'ha', quotaPerShift: '3.5 ha/ca 8h', fuelQuota: 20.5, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Cày sâu lật đất khử chua tầng đáy, tiêu diệt mầm bệnh nấm hại' },
  { id: 'JOB-AGRI-02', code: 'CV-LD-02', name: 'Bừa đĩa tơi xốp mặt ruộng', planType: 'NONG_NGHIEP', categoryCode: 'LAM_DAT', categoryName: '1. Làm đất', implementGroup: 'Dàn bừa đĩa 24 chảo', recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP', defaultUnit: 'ha', quotaPerShift: '6.0 ha/ca 8h', fuelQuota: 11.2, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Bừa 2 lượt phá vỡ tảng đất sau cày lật, làm mịn bề mặt' },
  { id: 'JOB-AGRI-03', code: 'CV-LD-03', name: 'Phay xới đất làm tơi luống', planType: 'NONG_NGHIEP', categoryCode: 'LAM_DAT', categoryName: '1. Làm đất', implementGroup: 'Dàn xới đất phay', recommendedVehicle: 'Máy kéo bánh hơi 50 - 70HP', defaultUnit: 'ha', quotaPerShift: '4.8 ha/ca 8h', fuelQuota: 12.8, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Xới băm vụn đất mặt chuẩn bị lên luống đặt bầu chuối' },
  { id: 'JOB-AGRI-04', code: 'CV-LD-04', name: 'Lên luống trồng chuối chuẩn thoát nước', planType: 'NONG_NGHIEP', categoryCode: 'LAM_DAT', categoryName: '1. Làm đất', implementGroup: 'Dàn lên luống 2 tim', recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP', defaultUnit: 'ha', quotaPerShift: '4.0 ha/ca 8h', fuelQuota: 14.5, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Lên luống cao 35-40cm, tim cách tim 2.2m chuẩn rãnh thoát nước' },
  { id: 'JOB-AGRI-05', code: 'CV-LD-05', name: 'Rải vôi khử trùng & bón lót hữu cơ', planType: 'NONG_NGHIEP', categoryCode: 'LAM_DAT', categoryName: '1. Làm đất', implementGroup: 'Dàn rải phân / vôi đĩa quay', recommendedVehicle: 'Máy kéo nhỏ 40 - 50HP', defaultUnit: 'ha', quotaPerShift: '7.5 ha/ca 8h', fuelQuota: 8.5, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Rải đều 1.5 tấn vôi/ha và 3 tấn phân hữu cơ vi sinh' },
  { id: 'JOB-AGRI-06', code: 'CV-TM-01', name: 'Khoan hố đặt bầu chuối cấy mô', planType: 'NONG_NGHIEP', categoryCode: 'TRONG_MOI', categoryName: '2. Trồng mới & Chăm sóc', implementGroup: 'Dàn khoan hố tự hành', recommendedVehicle: 'Máy kéo nhỏ 40 - 50HP', defaultUnit: 'hố', quotaPerShift: '1,200 hố/ca 8h', fuelQuota: 0.035, fuelUnit: 'Lít/hố', complexCode: 'KOUN_MOM', description: 'Khoan đường kính 40cm, sâu 40cm theo cự ly cây 2m x 2.2m' },
  { id: 'JOB-AGRI-07', code: 'CV-TM-02', name: 'Rải phân NPK / hữu cơ bón thúc đợt 1', planType: 'NONG_NGHIEP', categoryCode: 'TRONG_MOI', categoryName: '2. Trồng mới & Chăm sóc', implementGroup: 'Dàn rải phân / vôi đĩa quay', recommendedVehicle: 'Máy kéo nhỏ 40 - 50HP', defaultUnit: 'ha', quotaPerShift: '8.0 ha/ca 8h', fuelQuota: 7.8, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Bón thúc NPK định kỳ 20 ngày sau trồng, rải dọc 2 bên mép luống' },
  { id: 'JOB-AGRI-08', code: 'CV-TM-03', name: 'Phun thuốc bảo vệ thực vật boom 12m', planType: 'NONG_NGHIEP', categoryCode: 'TRONG_MOI', categoryName: '2. Trồng mới & Chăm sóc', implementGroup: 'Dàn phun thuốc boom 12m', recommendedVehicle: 'Máy kéo bánh cao 50 - 60HP', defaultUnit: 'ha', quotaPerShift: '15.0 ha/ca 8h', fuelQuota: 5.2, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Phun phòng trừ đốm lá Sigatoka và bọ trĩ với áp lực phun sương cao' },
  { id: 'JOB-AGRI-09', code: 'CV-TM-04', name: 'Cắt cỏ luồng liên hàng chuối', planType: 'NONG_NGHIEP', categoryCode: 'TRONG_MOI', categoryName: '2. Trồng mới & Chăm sóc', implementGroup: 'Dàn cắt cỏ đĩa xoay', recommendedVehicle: 'Máy kéo bánh hơi 50 - 70HP', defaultUnit: 'ha', quotaPerShift: '5.5 ha/ca 8h', fuelQuota: 9.8, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Phát sạch cỏ dại liên hàng chống cạnh tranh dinh dưỡng' },
  { id: 'JOB-AGRI-10', code: 'CV-TM-05', name: 'Bón phân qua hệ thống tưới Fertigation', planType: 'NONG_NGHIEP', categoryCode: 'TRONG_MOI', categoryName: '2. Trồng mới & Chăm sóc', implementGroup: 'Không gắn nông cụ (Trạm bơm)', recommendedVehicle: 'Trạm bơm tưới nhỏ giọt', defaultUnit: 'ha', quotaPerShift: '20.0 ha/ca 8h', fuelQuota: 4.0, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Hòa tan phân vi lượng châm trực tiếp qua đường ống Netafim' },
  { id: 'JOB-AGRI-11', code: 'CV-TH-01', name: 'Gom kéo buồng chuối thu hoạch về xưởng', planType: 'NONG_NGHIEP', categoryCode: 'THU_HOACH', categoryName: '3. Thu hoạch', implementGroup: 'Rơ-moóc chuyên dụng treo chuối', recommendedVehicle: 'Máy kéo bánh hơi 50 - 70HP', defaultUnit: 'chuyến', quotaPerShift: '8 chuyến/ca 8h', fuelQuota: 3.8, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Kéo moóc đệm mút treo 80 buồng/chuyến về xưởng đóng gói sơ chế' },
  { id: 'JOB-AGRI-12', code: 'CV-TH-02', name: 'Băm dập thân cây chuối sau thu hoạch', planType: 'NONG_NGHIEP', categoryCode: 'THU_HOACH', categoryName: '3. Thu hoạch', implementGroup: 'Dàn băm thân cây PTO', recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP', defaultUnit: 'ha', quotaPerShift: '3.8 ha/ca 8h', fuelQuota: 16.0, fuelUnit: 'Lít/ha', complexCode: 'KOUN_MOM', description: 'Băm mịn thân chuối rải đều tạo mùn hữu cơ giữ ẩm gốc cây con' },
  { id: 'JOB-AGRI-13', code: 'CV-TH-03', name: 'Thu gom bắp sinh khối làm thức ăn bò', planType: 'NONG_NGHIEP', categoryCode: 'THU_HOACH', categoryName: '3. Thu hoạch', implementGroup: 'Dàn thu hoạch bắp sinh khối', recommendedVehicle: 'Máy kéo bánh hơi 70 - 90HP', defaultUnit: 'Tấn', quotaPerShift: '45 Tấn/ca 8h', fuelQuota: 2.5, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Chặt băm thân bắp cây tươi tại ruộng xả trực tiếp lên thùng xe ben' },
  { id: 'JOB-AGRI-14', code: 'CV-TH-04', name: 'Cắt cỏ voi Packchong chở về hầm ủ', planType: 'NONG_NGHIEP', categoryCode: 'THU_HOACH', categoryName: '3. Thu hoạch', implementGroup: 'Dàn cắt cỏ voi tự hành', recommendedVehicle: 'Máy gặt cỏ chuyên dụng', defaultUnit: 'Tấn', quotaPerShift: '50 Tấn/ca 8h', fuelQuota: 2.2, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Cắt gốc cỏ voi 60 ngày tuổi, băm đoạn 2-3cm phục vụ hầm ủ chua TĂCN' },

  // 2. CÔNG TRÌNH & CA MÁY
  { id: 'JOB-CT-01', code: 'CV-DD-01', name: 'Đào mương trục chính thoát nước lô', planType: 'CONG_TRINH', categoryCode: 'DAO_DAP', categoryName: '1. Đào đắp mương máng & hồ đập', implementGroup: 'Gầu đào 0.8m³', recommendedVehicle: 'Máy đào bánh xích 0.5 - 0.8m³', defaultUnit: 'm³', quotaPerShift: '250 m³/ca 8h', fuelQuota: 14.5, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'Đào mương trục rộng miệng 2.5m, đáy 1.0m, sâu 1.5m ngăn ngập úng' },
  { id: 'JOB-CT-02', code: 'CV-DD-02', name: 'Nạo vét bùn lắng mương tiêu mùa mưa', planType: 'CONG_TRINH', categoryCode: 'DAO_DAP', categoryName: '1. Đào đắp mương máng & hồ đập', implementGroup: 'Gầu đào vét bùn 1.0m³', recommendedVehicle: 'Máy đào bánh xích 0.5 - 0.8m³', defaultUnit: 'm', quotaPerShift: '350 m/ca 8h', fuelQuota: 13.0, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'Vét sạch cỏ rác và bùn lắng thông dòng chảy mương tiêu' },
  { id: 'JOB-CT-03', code: 'CV-DD-03', name: 'Đào hố móng hồ lắng sinh học trại bò', planType: 'CONG_TRINH', categoryCode: 'DAO_DAP', categoryName: '1. Đào đắp mương máng & hồ đập', implementGroup: 'Gầu đào 1.2m³', recommendedVehicle: 'Máy đào bánh xích gầu 1.2m³', defaultUnit: 'm³', quotaPerShift: '380 m³/ca 8h', fuelQuota: 18.0, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'Đào hồ biogas và hồ lắng phân sâu 4m đạt chuẩn môi trường' },
  { id: 'JOB-CT-04', code: 'CV-SL-01', name: 'Ủi gạt tạo mặt bằng sân phơi sơ chế', planType: 'CONG_TRINH', categoryCode: 'SAN_LAP', categoryName: '2. San lấp mặt bằng & tạo cos nền', implementGroup: 'Lưỡi ủi san phẳng đất', recommendedVehicle: 'Máy ủi D6R & Máy san gạt GD555', defaultUnit: 'm²', quotaPerShift: '2,800 m²/ca 8h', fuelQuota: 16.5, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'Gạt phẳng cos nền sân bãi sơ chế và hầm ủ thức ăn gia súc' },
  { id: 'JOB-CT-05', code: 'CV-SL-02', name: 'Đắp bờ bao ngăn lũ và kè chống sạt', planType: 'CONG_TRINH', categoryCode: 'SAN_LAP', categoryName: '2. San lấp mặt bằng & tạo cos nền', implementGroup: 'Lưỡi ủi + Đầm lèn', recommendedVehicle: 'Máy ủi D6R & Máy san gạt GD555', defaultUnit: 'm³', quotaPerShift: '320 m³/ca 8h', fuelQuota: 15.5, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'Đắp đê bao bờ lô cao 1.8m gia cố chân bờ bao mùa mưa' },
  { id: 'JOB-CT-06', code: 'CV-GT-01', name: 'Bù vê tạo mui luyện mặt đường nội bộ', planType: 'CONG_TRINH', categoryCode: 'GIAO_THONG', categoryName: '3. Mở đường & Lu lèn giao thông nội bộ', implementGroup: 'Lưỡi cào san gạt thủy lực', recommendedVehicle: 'Máy ủi D6R & Máy san gạt GD555', defaultUnit: 'km', quotaPerShift: '2.2 km/ca 8h', fuelQuota: 15.0, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'Tạo dốc mui luyện 3% sang 2 bên rãnh thoát nước đường lô' },
  { id: 'JOB-CT-07', code: 'CV-GT-02', name: 'Rải cấp phối đá dăm & lu lèn K95', planType: 'CONG_TRINH', categoryCode: 'GIAO_THONG', categoryName: '3. Mở đường & Lu lèn giao thông nội bộ', implementGroup: 'Trống lu rung thép 14T', recommendedVehicle: 'Xe lu rung 14T & Máy san gạt', defaultUnit: 'm²', quotaPerShift: '1,500 m²/ca 8h', fuelQuota: 13.5, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'Rải đá 0x4 dày 15cm lu rung đạt độ chặt K95 chịu tải xe đầu kéo' },
  { id: 'JOB-CT-08', code: 'CV-BD-01', name: 'Duy tu định kỳ đường trục nội bộ mùa mưa', planType: 'CONG_TRINH', categoryCode: 'BAO_DUONG', categoryName: '4. Nạo vét & Duy tu hạ tầng công trình', implementGroup: 'Lưỡi cào san + Lu tĩnh', recommendedVehicle: 'Xe lu rung 14T & Máy san gạt', defaultUnit: 'km', quotaPerShift: '3.0 km/ca 8h', fuelQuota: 12.0, fuelUnit: 'Lít/h', complexCode: 'KOUN_MOM', description: 'San lấp ổ gà, rãnh xói mòn trên mặt đường cấp phối' },

  // 3. VẬN CHUYỂN NỘI BỘ
  { id: 'JOB-VC-01', code: 'CV-VC-01', name: 'Chở buồng chuối tươi về xưởng đóng gói', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_CHUOI', categoryName: '1. Vận chuyển chuối xuất khẩu', implementGroup: 'Rơ-moóc chuyên dụng chở chuối', recommendedVehicle: 'Xe tải thùng mui bạt 5T', defaultUnit: 'Chuyến', quotaPerShift: '6 chuyến/ca 8h', fuelQuota: 3.5, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Vận chuyển chuối buồng bảo đảm không trầy xước từ chòi đệm về xưởng' },
  { id: 'JOB-VC-02', code: 'CV-VC-02', name: 'Kéo Container lạnh 40ft chuối xuất khẩu', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_CHUOI', categoryName: '1. Vận chuyển chuối xuất khẩu', implementGroup: 'Sơ-mi rơ-moóc xương chở cont', recommendedVehicle: 'Đầu kéo Container lạnh 40ft', defaultUnit: 'km', quotaPerShift: '180 km/ca 8h', fuelQuota: 38.0, fuelUnit: 'Lít/100km', complexCode: 'KOUN_MOM', description: 'Kéo cont lạnh 13.5°C từ xưởng đóng gói về cảng xuất khẩu' },
  { id: 'JOB-VC-03', code: 'CV-VC-03', name: 'Chở thân lá chuối tươi về hầm ủ chua', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_THUC_AN', categoryName: '2. Vận chuyển thức ăn gia súc (Bò)', implementGroup: 'Thùng ben tự đổ 8 - 15 tấn', recommendedVehicle: 'Xe tải ben 10 - 15T', defaultUnit: 'Chuyến', quotaPerShift: '7 chuyến/ca 8h', fuelQuota: 4.8, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Vận chuyển phụ phẩm thân lá chuối sau thu hoạch về trại bò' },
  { id: 'JOB-VC-04', code: 'CV-VC-04', name: 'Chở bắp sinh khối về hầm ủ chua TĂCN', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_THUC_AN', categoryName: '2. Vận chuyển thức ăn gia súc (Bò)', implementGroup: 'Thùng ben tự đổ 8 - 15 tấn', recommendedVehicle: 'Xe tải ben 10 - 15T', defaultUnit: 'Chuyến', quotaPerShift: '8 chuyến/ca 8h', fuelQuota: 4.2, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Vận chuyển bắp cây băm nhỏ về nén ủ chua dinh dưỡng' },
  { id: 'JOB-VC-05', code: 'CV-VC-05', name: 'Vận chuyển phân bón vô cơ từ kho tổng về lô', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_VAT_TU', categoryName: '3. Vận chuyển phân bón & vật tư', implementGroup: 'Sơ-mi rơ-moóc sàn 40ft', recommendedVehicle: 'Xe tải thùng mui bạt 5T', defaultUnit: 'Tấn', quotaPerShift: '35 Tấn/ca 8h', fuelQuota: 28.0, fuelUnit: 'Lít/100km', complexCode: 'KOUN_MOM', description: 'Chở phân NPK, DAP, vôi bột theo phiếu xuất kho nội bộ' },
  { id: 'JOB-VC-06', code: 'CV-VC-06', name: 'Chở cuộn ống tưới nhỏ giọt và phụ kiện tưới', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_VAT_TU', categoryName: '3. Vận chuyển phân bón & vật tư', implementGroup: 'Sơ-mi rơ-moóc sàn 40ft', recommendedVehicle: 'Xe tải thùng mui bạt 5T', defaultUnit: 'Chuyến', quotaPerShift: '5 chuyến/ca 8h', fuelQuota: 3.2, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Vận chuyển thiết bị tưới Netafim thi công hệ thống mới' },
  { id: 'JOB-VC-07', code: 'CV-VC-07', name: 'Tiếp dầu Diesel lưu động cho máy ngoài đồng', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_NOI_BO', categoryName: '4. Tiếp liệu & Điều chuyển cơ giới', implementGroup: 'Bồn xitec chuyên dụng bơm xả lưu động', recommendedVehicle: 'Xe bồn xitec 5 khối (92C-112.34)', defaultUnit: 'Chuyến', quotaPerShift: '4 chuyến/ca 8h', fuelQuota: 5.5, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Bơm tiếp dầu trực tiếp tại hiện trường kèm đồng hồ đo lưu lượng' },
  { id: 'JOB-VC-08', code: 'CV-VC-08', name: 'Điều chuyển máy kéo nông cụ giữa các nông trường', planType: 'VAN_CHUYEN', categoryCode: 'CHUYEN_NOI_BO', categoryName: '4. Tiếp liệu & Điều chuyển cơ giới', implementGroup: 'Sơ-mi rơ-moóc lùn chở máy', recommendedVehicle: 'Đầu kéo Container lạnh 40ft', defaultUnit: 'Chuyến', quotaPerShift: '3 chuyến/ca 8h', fuelQuota: 18.0, fuelUnit: 'Lít/chuyến', complexCode: 'KOUN_MOM', description: 'Vận chuyển máy kéo lớn và dàn nông cụ theo lệnh điều động liên đơn vị' },
];

async function main() {
  console.log('============================================================');
  console.log('🚀 BẮT ĐẦU SEED TOÀN BỘ MASTER DATA TỪ CODE XUỐNG DATABASE SQL');
  console.log('============================================================');

  // 1. COMPANIES
  console.log('\n1. Đang upsert Companies...');
  for (const comp of COMPANIES_DATA) {
    await prisma.companyEntity.upsert({
      where: { code: comp.code },
      update: comp,
      create: comp,
    });
  }
  console.log(`✅ Đã upsert ${COMPANIES_DATA.length} công ty.`);

  // 2. POSITIONS
  console.log('\n2. Đang upsert Chức danh (POSITION)...');
  for (const pos of POSITIONS_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: pos.id },
      update: {
        code: pos.code,
        name: pos.name,
        type: CatalogType.POSITION,
        description: pos.description,
        status: 'HOAT_DONG',
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: pos.id,
        code: pos.code,
        name: pos.name,
        type: CatalogType.POSITION,
        description: pos.description,
        status: 'HOAT_DONG',
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${POSITIONS_DATA.length} chức danh.`);

  // 3. PLOTS
  console.log('\n3. Đang upsert Lô canh tác (PLOT)...');
  for (const plot of PLOTS_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: plot.id },
      update: {
        code: plot.code,
        name: plot.name,
        type: CatalogType.PLOT,
        parentCode: plot.parentCode,
        parentName: plot.parentName,
        enterpriseName: plot.enterpriseName,
        farmName: plot.farmName,
        areaHa: plot.areaHa,
        description: plot.description,
        status: plot.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: plot.id,
        code: plot.code,
        name: plot.name,
        type: CatalogType.PLOT,
        parentCode: plot.parentCode,
        parentName: plot.parentName,
        enterpriseName: plot.enterpriseName,
        farmName: plot.farmName,
        areaHa: plot.areaHa,
        description: plot.description,
        status: plot.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${PLOTS_DATA.length} lô canh tác.`);

  // 4. LAND PARCELS
  console.log('\n4. Đang upsert Thửa đất (LAND_PARCEL)...');
  for (const parcel of LAND_PARCELS_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: parcel.id },
      update: {
        code: parcel.code,
        name: parcel.name,
        type: CatalogType.LAND_PARCEL,
        parentCode: parcel.parentCode,
        parentName: parcel.parentName,
        enterpriseName: parcel.enterpriseName,
        farmName: parcel.farmName,
        areaHa: parcel.areaHa,
        plotStatus: parcel.plotStatus,
        description: parcel.description,
        status: parcel.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: parcel.id,
        code: parcel.code,
        name: parcel.name,
        type: CatalogType.LAND_PARCEL,
        parentCode: parcel.parentCode,
        parentName: parcel.parentName,
        enterpriseName: parcel.enterpriseName,
        farmName: parcel.farmName,
        areaHa: parcel.areaHa,
        plotStatus: parcel.plotStatus,
        description: parcel.description,
        status: parcel.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${LAND_PARCELS_DATA.length} thửa đất.`);

  // 5. CONSTRUCTION SITES
  console.log('\n5. Đang upsert Khu vực thi công (CONSTRUCTION_SITE)...');
  for (const site of CONSTRUCTION_SITES_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: site.id },
      update: {
        code: site.code,
        name: site.name,
        type: CatalogType.CONSTRUCTION_SITE,
        parentCode: site.parentCode,
        parentName: site.parentName,
        enterpriseName: site.enterpriseName,
        description: site.description,
        status: site.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: site.id,
        code: site.code,
        name: site.name,
        type: CatalogType.CONSTRUCTION_SITE,
        parentCode: site.parentCode,
        parentName: site.parentName,
        enterpriseName: site.enterpriseName,
        description: site.description,
        status: site.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${CONSTRUCTION_SITES_DATA.length} khu vực thi công.`);

  // 6. ROUTES
  console.log('\n6. Đang upsert Tuyến đường vận chuyển (ROUTE)...');
  for (const r of ROUTES_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: r.id },
      update: {
        code: r.code,
        name: r.name,
        type: CatalogType.ROUTE,
        parentCode: r.parentCode,
        parentName: r.parentName,
        address: r.address,
        description: r.description,
        status: r.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: r.id,
        code: r.code,
        name: r.name,
        type: CatalogType.ROUTE,
        parentCode: r.parentCode,
        parentName: r.parentName,
        address: r.address,
        description: r.description,
        status: r.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${ROUTES_DATA.length} tuyến đường.`);

  // 7. ORDER TYPES
  console.log('\n7. Đang upsert Loại lệnh điều xe (ORDER_TYPE)...');
  for (const ord of ORDER_TYPES_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: ord.id },
      update: {
        code: ord.code,
        name: ord.name,
        type: CatalogType.ORDER_TYPE,
        parentCode: ord.parentCode,
        parentName: ord.parentName,
        description: ord.description,
        status: ord.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: ord.id,
        code: ord.code,
        name: ord.name,
        type: CatalogType.ORDER_TYPE,
        parentCode: ord.parentCode,
        parentName: ord.parentName,
        description: ord.description,
        status: ord.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${ORDER_TYPES_DATA.length} loại lệnh điều xe.`);

  // 8. SPARE PARTS
  console.log('\n8. Đang upsert Phụ tùng ERP (SPARE_PART)...');
  for (const part of SPARE_PARTS_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: part.id },
      update: {
        code: part.code,
        name: part.name,
        type: CatalogType.SPARE_PART,
        parentCode: part.parentCode,
        parentName: part.parentName,
        systemId: part.systemId,
        description: part.description,
        status: part.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: part.id,
        code: part.code,
        name: part.name,
        type: CatalogType.SPARE_PART,
        parentCode: part.parentCode,
        parentName: part.parentName,
        systemId: part.systemId,
        description: part.description,
        status: part.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${SPARE_PARTS_DATA.length} phụ tùng ERP.`);

  // 9. TECHNICAL QUOTAS
  console.log('\n9. Đang upsert Định mức kỹ thuật (TECHNICAL_QUOTA)...');
  for (const q of TECHNICAL_QUOTAS_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: q.id },
      update: {
        code: q.code,
        name: q.name,
        type: CatalogType.TECHNICAL_QUOTA,
        parentCode: q.parentCode,
        parentName: q.parentName,
        description: q.description,
        status: q.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: q.id,
        code: q.code,
        name: q.name,
        type: CatalogType.TECHNICAL_QUOTA,
        parentCode: q.parentCode,
        parentName: q.parentName,
        description: q.description,
        status: q.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${TECHNICAL_QUOTAS_DATA.length} định mức kỹ thuật.`);

  // 10. CG MANAGERS
  console.log('\n10. Đang upsert Quản lý cơ giới (CG_MANAGER)...');
  for (const cgm of CG_MANAGERS_DATA) {
    await prisma.catalogItem.upsert({
      where: { id: cgm.id },
      update: {
        code: cgm.code,
        name: cgm.name,
        type: CatalogType.CG_MANAGER,
        parentCode: cgm.parentCode,
        parentName: cgm.parentName,
        phone: cgm.phone,
        address: cgm.address,
        status: cgm.status,
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: cgm.id,
        code: cgm.code,
        name: cgm.name,
        type: CatalogType.CG_MANAGER,
        parentCode: cgm.parentCode,
        parentName: cgm.parentName,
        phone: cgm.phone,
        address: cgm.address,
        status: cgm.status,
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${CG_MANAGERS_DATA.length} cán bộ quản lý cơ giới.`);

  // 11. MASTER JOBS
  console.log('\n11. Đang upsert Hạng mục công việc & định mức (JOB_ITEM)...');
  for (const job of MASTER_JOBS_RAW) {
    await prisma.catalogItem.upsert({
      where: { id: job.id },
      update: {
        code: job.code,
        name: job.name,
        type: CatalogType.JOB_ITEM,
        parentCode: job.planType,
        parentName: job.categoryName,
        enterpriseName: job.categoryCode,
        farmName: job.implementGroup,
        plotStatus: job.recommendedVehicle,
        systemId: job.defaultUnit,
        areaHa: job.fuelQuota,
        address: job.fuelUnit,
        managerName: job.quotaPerShift,
        phone: job.complexCode,
        description: job.description,
        status: 'HOAT_DONG',
        updatedUser: 'system_seed',
        updatedDate: '2026-03-14',
      },
      create: {
        id: job.id,
        code: job.code,
        name: job.name,
        type: CatalogType.JOB_ITEM,
        parentCode: job.planType,
        parentName: job.categoryName,
        enterpriseName: job.categoryCode,
        farmName: job.implementGroup,
        plotStatus: job.recommendedVehicle,
        systemId: job.defaultUnit,
        areaHa: job.fuelQuota,
        address: job.fuelUnit,
        managerName: job.quotaPerShift,
        phone: job.complexCode,
        description: job.description,
        status: 'HOAT_DONG',
        createdUser: 'system_seed',
        createdDate: '2026-03-14',
      },
    });
  }
  console.log(`✅ Đã upsert ${MASTER_JOBS_RAW.length} hạng mục công việc định mức.`);

  console.log('\n🎉 HOÀN TẤT SEED TOÀN BỘ MASTER DATA VÀO MYSQL!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
