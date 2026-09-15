const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STANDARDIZED_POSITIONS = [
  { code: 'CD_TX_CONTAINER', name: 'Lái xe đầu kéo Container', description: 'Vận tải container chuối xuất khẩu và đối lưu hàng hóa đường dài' },
  { code: 'CD_TX_BEN', name: 'Lái xe tải tự đổ (ben)', description: 'Vận chuyển chuối buồng, phân bón, đất đắp và phụ phẩm nông nghiệp' },
  { code: 'CD_TX_TAI_THUNG', name: 'Lái xe tải thùng & xe tải nhẹ', description: 'Vận chuyển bao bì đóng gói, vật tư nông trường và phân phối hàng hóa' },
  { code: 'CD_TX_BAN_TAI', name: 'Lái xe bán tải & phục vụ công vụ', description: 'Đưa đón kỹ sư, quản lý và kiểm tra tuần tra vườn cây thực địa' },
  { code: 'CD_TX_BON', name: 'Lái xe bồn chuyên dụng', description: 'Tiếp nhiên liệu lưu động, bồn tưới nước, bồn mật rỉ và cấp nước sinh hoạt' },
  { code: 'CD_TX_NANG', name: 'Lái xe nâng hàng (Forklift)', description: 'Bốc dỡ pallet chuối xuất khẩu, phân bón và sắp xếp hàng tổng kho' },
  { code: 'CD_TX_CAU', name: 'Lái xe cẩu tự hành & cứu hộ', description: 'Cứu hộ cơ giới hiện trường, bốc dỡ máy móc và vật tư quá khổ' },
  { code: 'CD_LAI_MAY_CAY', name: 'Thợ lái máy cày bánh hơi', description: 'Vận hành máy cày Kubota, John Deere làm đất, phay đất và kéo rơ-moóc' },
  { code: 'CD_LAI_MAY_XICH', name: 'Thợ lái máy cày bánh xích', description: 'Cày phá lâm, xới đất đầm lầy và khai hoang đất dốc' },
  { code: 'CD_MAY_GAT_DAP', name: 'Thợ vận hành máy gặt đập liên hợp', description: 'Thu hoạch lúa, ngô, đậu tương và cây trồng thương phẩm' },
  { code: 'CD_MAY_GAT_CO', name: 'Thợ vận hành máy gặt & cắt cỏ', description: 'Cắt cỏ voi, cao lương phục vụ thức ăn xanh cho đàn bò' },
  { code: 'CD_MAY_BAM_TMR', name: 'Thợ vận hành máy băm trộn TMR', description: 'Băm trộn thức ăn tổng hợp TMR và cấp phát tại các ô chuồng bò' },
  { code: 'CD_MAY_PHUN_THUOC', name: 'Thợ vận hành máy phun thuốc tự hành', description: 'Phun thuốc bảo vệ thực vật và tưới vi sinh diện rộng' },
  { code: 'CD_MAY_GIEO_HAT', name: 'Thợ vận hành máy gieo hạt & rải phân', description: 'Gieo hạt tự động, bón lót và bón thúc chính xác theo định mức' },
  { code: 'CD_MAY_DAO', name: 'Thợ lái máy đào thủy lực', description: 'Đào mương tiêu, đắp bờ bao, nạo vét lòng hồ chứa nước' },
  { code: 'CD_MAY_SAN_LU', name: 'Thợ lái máy san gạt & lu rung', description: 'San nền, gia cố và duy tu đường lô giao thông nội đồng' },
  { code: 'CD_THO_SUA_CHUA', name: 'Thợ sửa chữa cơ giới', description: 'Bảo dưỡng định kỳ 250h, sửa chữa tiểu tu, trung tu và đại tu' },
  { code: 'CD_THO_DIEN_MAY', name: 'Thợ điện & điện lạnh xe máy', description: 'Bảo trì hệ thống điện điều khiển, rơ-le, dynamo và máy lạnh cabin' },
  { code: 'CD_THO_HAN', name: 'Thợ hàn cơ khí & phục hồi nông cụ', description: 'Gia công hàn, phục hồi lưỡi chảo cày, dàn bừa và rơ-moóc kéo' },
  { code: 'CD_THO_LOP', name: 'Thợ bảo dưỡng săm lốp', description: 'Thay thế, vá lốp siêu tải, cân chỉnh áp suất và đảo lốp cơ giới' },
  { code: 'CD_KIEM_DINH_AT', name: 'Kỹ thuật viên kiểm định & an toàn', description: 'Kiểm tra kỹ thuật an toàn trước và sau ca máy, huấn luyện ATVSLĐ' },
  { code: 'CD_CUU_HO_THO_MAY', name: 'Lái xe cứu hộ kiêm Thợ máy', description: 'Trực cứu hộ kỹ thuật 24/7 và sửa chữa nóng tại hiện trường lô thửa' },
  { code: 'CD_TO_TRUONG_CG', name: 'Tổ trưởng tổ cơ giới', description: 'Quản lý tổ máy, phân công ca nhật trình và giám sát tiến độ thực địa' },
  { code: 'CD_DIEU_DO_VIEN', name: 'Nhân viên điều độ vận tải', description: 'Điều hành lệnh điều xe, giám sát lộ trình GPS và đối soát nhiên liệu' },
  { code: 'CD_THU_KHO_NL', name: 'Thủ kho nhiên liệu', description: 'Quản lý kho bồn xăng dầu DO, cấp phát quét QR và kiểm soát hao hụt' },
  { code: 'CD_THU_KHO_PT', name: 'Thủ kho phụ tùng & vật tư BTSC', description: 'Quản lý xuất nhập tồn phụ tùng thay thế, săm lốp, dầu nhớt mỡ bôi trơn' },
];

function mapRawPosition(raw) {
  if (!raw) return 'Thợ lái máy cày bánh hơi';
  const s = raw.toLowerCase().trim();

  if (s.includes('container') || s.includes('đầu kéo')) return 'Lái xe đầu kéo Container';
  if (s.includes('ben')) return 'Lái xe tải tự đổ (ben)';
  if (s.includes('bán tải') || s.includes('công vụ')) return 'Lái xe bán tải & phục vụ công vụ';
  if (s.includes('bồn') || s.includes('tiếp dầu') || s.includes('cấp dầu')) return 'Lái xe bồn chuyên dụng';
  if (s.includes('nâng')) return 'Lái xe nâng hàng (Forklift)';
  if (s.includes('cẩu')) return 'Lái xe cẩu tự hành & cứu hộ';
  if (s.includes('gặt đập')) return 'Thợ vận hành máy gặt đập liên hợp';
  if (s.includes('cắt cỏ') || s.includes('gặt cắt cỏ')) return 'Thợ vận hành máy gặt & cắt cỏ';
  if (s.includes('băm cỏ') || s.includes('tmr')) return 'Thợ vận hành máy băm trộn TMR';
  if (s.includes('phun thuốc')) return 'Thợ vận hành máy phun thuốc tự hành';
  if (s.includes('gieo hạt') || s.includes('rải phân')) return 'Thợ vận hành máy gieo hạt & rải phân';
  if (s.includes('đào')) return 'Thợ lái máy đào thủy lực';
  if (s.includes('san gạt') || s.includes('lu')) return 'Thợ lái máy san gạt & lu rung';
  if (s.includes('xích') || s.includes('phá lâm')) return 'Thợ lái máy cày bánh xích';
  if (s.includes('cứu hộ') || s.includes('thợ máy')) return 'Lái xe cứu hộ kiêm Thợ máy';
  if (s.includes('sửa chữa')) return 'Thợ sửa chữa cơ giới';
  if (s.includes('điện')) return 'Thợ điện & điện lạnh xe máy';
  if (s.includes('hàn')) return 'Thợ hàn cơ khí & phục hồi nông cụ';
  if (s.includes('lốp')) return 'Thợ bảo dưỡng săm lốp';
  if (s.includes('kiểm định') || s.includes('an toàn')) return 'Kỹ thuật viên kiểm định & an toàn';
  if (s.includes('đội trưởng') || s.includes('tổ trưởng')) return 'Tổ trưởng tổ cơ giới';
  if (s.includes('điều độ')) return 'Nhân viên điều độ vận tải';
  if (s.includes('nhiên liệu')) return 'Thủ kho nhiên liệu';
  if (s.includes('phụ tùng')) return 'Thủ kho phụ tùng & vật tư BTSC';
  if (s.includes('tải nhẹ') || s.includes('vận chuyển') || s.includes('tải')) return 'Lái xe tải thùng & xe tải nhẹ';
  if (s.includes('cày') || s.includes('kéo') || s.includes('nông nghiệp') || s.includes('cơ giới')) return 'Thợ lái máy cày bánh hơi';
  if (s.includes('quản trị') || s.includes('admin')) return 'Quản trị viên Hệ thống (Admin)';

  return 'Thợ lái máy cày bánh hơi';
}

async function main() {
  console.log('🔄 Đang bắt đầu chuẩn hóa dữ liệu Chức danh trong database...');

  const emps = await prisma.employeeRecord.findMany();
  console.log(`Tìm thấy ${emps.length} bản ghi nhân sự trong EmployeeRecord.`);

  let updatedCount = 0;
  for (const emp of emps) {
    const standardized = mapRawPosition(emp.position);
    if (emp.position !== standardized) {
      await prisma.employeeRecord.update({
        where: { id: emp.id },
        data: { position: standardized },
      });
      updatedCount++;
    }
  }

  console.log(`✅ Đã chuẩn hóa ${updatedCount} bản ghi nhân sự về 26 Chức danh chuẩn!`);

  // Kiểm tra lại danh sách chức danh duy nhất trong EmployeeRecord
  const afterEmps = await prisma.employeeRecord.findMany({ select: { position: true } });
  const uniquePositions = [...new Set(afterEmps.map((e) => e.position).filter(Boolean))].sort();
  console.log(`\n📋 Tổng số chức danh duy nhất sau khi chuẩn hóa: ${uniquePositions.length}`);
  console.log(uniquePositions);
}

main()
  .catch((err) => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
