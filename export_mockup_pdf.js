const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const rootDir = path.resolve(__dirname);
const legacyDir = path.join(rootDir, 'legacy_mockup');
const exportDir = path.join(legacyDir, 'pdf_export');
const screenshotsDir = path.join(exportDir, 'screenshots');
const outputPdfPath = path.join(legacyDir, 'THACO_AGRI_Mockup_He_Thong_Quan_Ly_Xe_Co_Gioi.pdf');

// Find browser executable
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = chromePaths.find(p => fs.existsSync(p));

const SCREENS = [
  {
    moduleGroup: "Phân hệ 1: Trung tâm Điều hành",
    title: "Dashboard Vận Hành Thời Gian Thực",
    hash: "pages/A-dashboard/dashboard-van-hanh.html",
    desc: "Tổng quan 128 phương tiện cơ giới, 96 tài xế, mức dầu trên xe (18.450L), bản đồ GPS realtime, cảnh báo ưu tiên SOS và bảng lệnh điều xe trong ngày.",
    filename: "01_dashboard_van_hanh.png"
  },
  {
    moduleGroup: "Phân hệ 2: Giám sát GPS Trực tuyến",
    title: "Bản đồ GPS Realtime Toàn Đội Xe",
    hash: "pages/B-giam-sat-gps/giam-sat-realtime.html",
    desc: "Bản đồ trực tiếp hiển thị 86 xe đang hoạt động, phân biệt xe chạy theo lệnh vs xe chạy tự do, định vị nông trường và packhouse.",
    filename: "02_giam_sat_realtime.png"
  },
  {
    moduleGroup: "Phân hệ 2: Giám sát GPS Trực tuyến",
    title: "Playback Xem Lại Lịch Sử Hành Trình",
    hash: "pages/B-giam-sat-gps/playback-hanh-trinh.html",
    desc: "Xem lại vệt di chuyển xe trong ngày, biểu đồ vận tốc, điểm dừng đỗ, đồng hồ giờ máy và các trạng thái cảm biến que đo dầu.",
    filename: "03_playback_hanh_trinh.png"
  },
  {
    moduleGroup: "Phân hệ 2: Giám sát GPS Trực tuyến",
    title: "Thiết Lập Vùng Giám Sát Địa Lý (Geofence)",
    hash: "pages/B-giam-sat-gps/vung-giam-sat-geofence.html",
    desc: "Quản lý ranh giới lô thửa, đường trục nội bộ nông trường, trạm cân, bãi tập kết và cảnh báo xe ra ngoài vùng hoạt động.",
    filename: "04_geofence_vung.png"
  },
  {
    moduleGroup: "Phân hệ 2: Giám sát GPS Trực tuyến",
    title: "Cảnh Báo Vượt Quá Tốc Độ & Sai Vùng",
    hash: "pages/B-giam-sat-gps/canh-bao-toc-do-vung.html",
    desc: "Thống kê danh sách vi phạm tốc độ quy định nông trường (max 30km/h), xâm nhập vùng cấm và thông báo tức thời đến quản đốc.",
    filename: "05_canh_bao_toc_do.png"
  },
  {
    moduleGroup: "Phân hệ 2: Giám sát GPS Trực tuyến",
    title: "Nhật Ký Mất Sóng Offline & Lưu Đệm GPS",
    hash: "pages/B-giam-sat-gps/nhat-ky-mat-song-offline.html",
    desc: "Giám sát thiết bị GPS mất tín hiệu, tự động lưu trữ dữ liệu vào bộ nhớ đệm và truyền bù khi có kết nối sóng 4G nông trường.",
    filename: "06_mat_song_offline.png"
  },
  {
    moduleGroup: "Phân hệ 3: Quản lý Đội xe Cơ giới",
    title: "Hồ Sơ Danh Sách Xe Cơ Giới (128 Xe)",
    hash: "pages/C-doi-xe/ho-so-xe.html",
    desc: "Quản lý thông tin chi tiết 128 phương tiện cơ giới: máy kéo lớn, máy kéo nhỏ, xe tải Howo, Hino, máy gặt đập, máy ủi, xe bồn...",
    filename: "07_ho_so_xe.html.png"
  },
  {
    moduleGroup: "Phân hệ 3: Quản lý Đội xe Cơ giới",
    title: "Hồ Sơ Nông Cụ & Thiết Bị Đính Kèm",
    hash: "pages/C-doi-xe/ho-so-thiet-bi.html",
    desc: "Quản lý 246 nông cụ đính kèm: dàn cày chảo, dàn xới đất, mooc kéo chuối, dàn phun thuốc trừ sâu, bừa răng.",
    filename: "08_ho_so_thiet_bi.png"
  },
  {
    moduleGroup: "Phân hệ 3: Quản lý Đội xe Cơ giới",
    title: "Phân Bổ Xe Cơ Giới Theo Đơn Vị & KLH",
    hash: "pages/C-doi-xe/phan-xe-don-vi.html",
    desc: "Phân quyền quản lý và điều động phương tiện theo từng Xí nghiệp Chuối, XN Cây ăn trái, Đội Cơ giới và KLH.",
    filename: "09_phan_xe_don_vi.png"
  },
  {
    moduleGroup: "Phân hệ 3: Quản lý Đội xe Cơ giới",
    title: "Quản Lý Thiết Bị GPS & Cảm Biến Que Đo Dầu",
    hash: "pages/C-doi-xe/thiet-bi-gps-cam-bien.html",
    desc: "Giám sát tình trạng phần cứng: thiết bị định vị GPS 4G, cảm biến mức nhiên liệu siêu âm/điện dung DUT-E, thẻ RFID.",
    filename: "10_gps_cam_bien.png"
  },
  {
    moduleGroup: "Phân hệ 4: Lệnh Điều xe & Vận hành",
    title: "Kế Hoạch Sản Xuất & Điều Độ Cơ Giới",
    hash: "pages/D-lenh-dieu-xe/ke-hoach-san-xuat.html",
    desc: "Lập kế hoạch làm đất, gieo trồng, thu hoạch chuối theo tuần/tháng, dự toán giờ máy và sản lượng diện tích ha.",
    filename: "11_ke_hoach_san_xuat.png"
  },
  {
    moduleGroup: "Phân hệ 4: Lệnh Điều xe & Vận hành",
    title: "Lệnh Điều Xe Sản Xuất Nông Nghiệp (LSX)",
    hash: "pages/D-lenh-dieu-xe/lenh-dieu-xe.html",
    desc: "Phát hành lệnh điều động máy cày, máy gặt, máy ủi ra Lô/Thửa, tự động kiểm tra điều kiện GPLX tài xế và cấp phiếu dầu.",
    filename: "12_lenh_dieu_xe.png"
  },
  {
    moduleGroup: "Phân hệ 4: Lệnh Điều xe & Vận hành",
    title: "Lệnh Vận Chuyển Nông Sản Nội Bộ (LVC)",
    hash: "pages/D-lenh-dieu-xe/lenh-van-chuyen.html",
    desc: "Điều động xe tải Howo chở chuối từ vườn về xưởng Packhouse, tích hợp trạm cân điện tử và theo dõi thời gian quay vòng chuyến.",
    filename: "13_lenh_van_chuyen.png"
  },
  {
    moduleGroup: "Phân hệ 4: Lệnh Điều xe & Vận hành",
    title: "Xác Nhận Khối Lượng Sản Lượng & Phiếu Cân",
    hash: "pages/D-lenh-dieu-xe/xac-nhan-khoi-luong-phieu-can.html",
    desc: "Tích hợp tự động phiếu cân tại trạm cân KLH Koun Mom, đối chiếu khối lượng tịnh vs số chuyến xe tải.",
    filename: "14_phieu_can.png"
  },
  {
    moduleGroup: "Phân hệ 5: Quản lý Tài xế & Vận hành",
    title: "Hồ Sơ 96 Lái Xe & Thợ Vận Hành Cơ Giới",
    hash: "pages/I-lai-xe/ho-so-lai-xe.html",
    desc: "Quản lý lý lịch, hạng bằng lái (B2, C, FC, Chứng chỉ máy kéo), thâm niên, số điện thoại và đánh giá kỹ năng.",
    filename: "15_ho_so_lai_xe.png"
  },
  {
    moduleGroup: "Phân hệ 5: Quản lý Tài xế & Vận hành",
    title: "Phân Công Lái Xe Theo Ca Trực & Đội Xe",
    hash: "pages/I-lai-xe/phan-cong-lai-xe.html",
    desc: "Bố trí tài xế theo Ca 1 (Sáng), Ca 2 (Chiều), phân công xe cố định và theo dõi tình trạng nghỉ phép off.",
    filename: "16_phan_cong_lai_xe.png"
  },
  {
    moduleGroup: "Phân hệ 5: Quản lý Tài xế & Vận hành",
    title: "Quản Lý GPLX, Chứng Chỉ & Hạn Khám Sức Khỏe",
    hash: "pages/I-lai-xe/quan-ly-gplx.html",
    desc: "Cảnh báo tự động trước 30 ngày đối với GPLX hết hạn, chứng chỉ cơ giới nông nghiệp và lịch khám sức khỏe định kỳ.",
    filename: "17_quan_ly_gplx.png"
  },
  {
    moduleGroup: "Phân hệ 5: Quản lý Tài xế & Vận hành",
    title: "Lịch Sử Vi Phạm & Sự Cố Lái Xe",
    hash: "pages/I-lai-xe/lich-su-vi-pham.html",
    desc: "Ghi nhận vi phạm quá tốc độ, dừng đỗ sai bãi, vượt định mức nhiên liệu hoặc làm hỏng thiết bị.",
    filename: "18_lich_su_vi_pham.png"
  },
  {
    moduleGroup: "Phân hệ 5: Quản lý Tài xế & Vận hành",
    title: "Bảng Xếp Hạng Thi Đua & Đánh Giá KPI Lái Xe",
    hash: "pages/I-lai-xe/bang-xep-hang-kpi.html",
    desc: "Xếp hạng lái xe xuất sắc theo năng suất giờ máy, tỷ lệ tiết kiệm nhiên liệu, an toàn không sự cố.",
    filename: "19_kpi_lai_xe.png"
  },
  {
    moduleGroup: "Phân hệ 6: Xưởng Bảo trì Sửa chữa (BTSC)",
    title: "Kế Hoạch Bảo Dưỡng Định Kỳ (250h - 500h - 1000h)",
    hash: "pages/E-xuong-btsc/ke-hoach-bao-tri.html",
    desc: "Tự động cảnh báo xe sắp đến hạn bảo dưỡng dựa trên số giờ máy thực tế truyền về từ cảm biến GPS.",
    filename: "20_ke_hoach_bao_tri.png"
  },
  {
    moduleGroup: "Phân hệ 6: Xưởng Bảo trì Sửa chữa (BTSC)",
    title: "Tiếp Nhận Báo Hỏng & Yêu Cầu Sửa Chữa",
    hash: "pages/E-xuong-btsc/yeu-cau-sua-chua.html",
    desc: "Tài xế/Quản đốc gửi yêu cầu sửa chữa tức thời từ ứng dụng di động kèm hình ảnh và mô tả triệu chứng hư hỏng.",
    filename: "21_yeu_cau_sua_chua.png"
  },
  {
    moduleGroup: "Phân hệ 6: Xưởng Bảo trì Sửa chữa (BTSC)",
    title: "Phiếu Sửa Chữa & Xuất Kho Vật Tư Phụ Tùng",
    hash: "pages/E-xuong-btsc/phieu-sua-chua.html",
    desc: "Lập phiếu công việc cho thợ máy, định khoản vật tư thay thế (lọc nhớt, dầu thủy lực, lốp xe, dây curoa).",
    filename: "22_phieu_sua_chua.png"
  },
  {
    moduleGroup: "Phân hệ 6: Xưởng Bảo trì Sửa chữa (BTSC)",
    title: "Bảng Kanban Theo Dõi Tiến Độ Xưởng BTSC",
    hash: "pages/E-xuong-btsc/theo-doi-sua-chua.html",
    desc: "Trực quan hóa tiến độ sửa chữa xe qua bảng Kanban 4 cột: Chờ tiếp nhận -> Đang sửa -> Chờ phụ tùng -> Hoàn thành xuất xưởng.",
    filename: "23_kanban_xuong.png"
  },
  {
    moduleGroup: "Phân hệ 6: Xưởng Bảo trì Sửa chữa (BTSC)",
    title: "Quản Lý Đăng Kiểm, Kiểm Định & Bảo Hiểm Xe",
    hash: "pages/E-xuong-btsc/dang-kiem-bao-hiem.html",
    desc: "Theo dõi thời hạn đăng kiểm an toàn kỹ thuật, bảo hiểm xe cơ giới và kiểm định an toàn nông cụ.",
    filename: "24_dang_kiem_bao_hiem.png"
  },
  {
    moduleGroup: "Phân hệ 7: Quản lý Nhiên liệu Trên Xe",
    title: "Mức Dầu Bình Xe Cơ Giới (Que Đo GPS Realtime)",
    hash: "pages/J-nhien-lieu/ton-kho-bon-chua.html",
    desc: "Theo dõi lượng dầu thực tế trong bình 128 xe qua cảm biến que đo GPS DUT-E, dung tích bình, tỷ lệ đầy, giờ máy còn lại và cảnh báo cạn dầu/sụt dầu.",
    filename: "25_muc_dau_binh_xe.png"
  },
  {
    moduleGroup: "Phân hệ 7: Quản lý Nhiên liệu Trên Xe",
    title: "Phiếu Cấp Phát Nhiên Liệu Lưu Động Tại Xe & Lô",
    hash: "pages/J-nhien-lieu/phieu-cap-nhien-lieu.html",
    desc: "Quản lý cấp dầu trực tiếp từ xe téc di động Dongfeng 5m3 cho từng xe cơ giới ngoài lô ruộng theo mã lệnh sản xuất.",
    filename: "26_phieu_cap_dau.png"
  },
  {
    moduleGroup: "Phân hệ 7: Quản lý Nhiên liệu Trên Xe",
    title: "Định Mức Tiêu Hao Nhiên Liệu Theo Loại Xe & Công Việc",
    hash: "pages/J-nhien-lieu/dinh-muc-nhien-lieu.html",
    desc: "Xây dựng định mức khoán L/giờ máy (máy cày, máy gặt, máy ủi) và L/100km (xe tải) theo từng địa hình lô thửa.",
    filename: "27_dinh_muc_nhien_lieu.png"
  },
  {
    moduleGroup: "Phân hệ 7: Quản lý Nhiên liệu Trên Xe",
    title: "Đối Chiếu Tiêu Hao Thực Tế (GPS vs Cảm Biến)",
    hash: "pages/J-nhien-lieu/doi-chieu-tieu-hao.html",
    desc: "Tự động so sánh số lít dầu que đo ghi nhận vs định mức khoán giờ máy để phát hiện xe chạy quá tải hoặc hao dầu.",
    filename: "28_doi_chieu_tieu_hao.png"
  },
  {
    moduleGroup: "Phân hệ 7: Quản lý Nhiên liệu Trên Xe",
    title: "Cảnh Báo Bất Thường Sụt Dầu & Nghi Vấn Hút Trộm",
    hash: "pages/J-nhien-lieu/canh-bao-bat-thuong-dau.html",
    desc: "Hệ thống phát hiện sụt dầu đột ngột (>10-15L/3 phút), tụt dầu lúc tắt máy ban đêm và gửi thông báo khẩn cấp.",
    filename: "29_canh_bao_sut_dau.png"
  },
  {
    moduleGroup: "Phân hệ 8: Cảnh báo & Thông báo",
    title: "Danh Sách Cảnh Báo Khẩn Cấp Chưa Xử Lý (SOS)",
    hash: "pages/K-canh-bao/canh-bao-chua-xu-ly.html",
    desc: "Trung tâm xử lý 18 sự cố khẩn cấp: sụt dầu, quá tốc độ, ra vùng, quá giờ làm việc, đến hạn bảo dưỡng.",
    filename: "30_canh_bao_sos.png"
  },
  {
    moduleGroup: "Phân hệ 8: Cảnh báo & Thông báo",
    title: "Lịch Sử Xử Lý Cảnh Báo & Biên Bản Sự Cố",
    hash: "pages/K-canh-bao/lich-su-canh-bao.html",
    desc: "Lưu vết toàn bộ biên bản xử lý vi phạm, người tiếp nhận, giải pháp khắc phục và thời gian hoàn tất.",
    filename: "31_lich_su_canh_bao.png"
  },
  {
    moduleGroup: "Phân hệ 9: Báo cáo Hợp nhất",
    title: "Báo Cáo Năng Suất Vận Hành Xe Cơ Giới",
    hash: "pages/F-bao-cao/bao-cao-van-hanh.html",
    desc: "Tổng hợp số giờ máy chạy, diện tích hoàn thành ha, sản lượng tấn và hệ số khả dụng của toàn đội xe.",
    filename: "32_bao_cao_nang_suat.png"
  },
  {
    moduleGroup: "Phân hệ 9: Báo cáo Hợp nhất",
    title: "Báo Cáo Tổng Hợp Tiêu Hao Nhiên Liệu",
    hash: "pages/F-bao-cao/bao-cao-nhien-lieu.html",
    desc: "Báo cáo lũy kế số lít dầu tiêu thụ theo ngày, tuần, tháng, tỷ lệ tiết kiệm/vượt định mức của 9 chủng loại xe.",
    filename: "33_bao_cao_nhien_lieu.png"
  },
  {
    moduleGroup: "Phân hệ 9: Báo cáo Hợp nhất",
    title: "Báo Cáo Chi Phí Bảo Trì Sửa Chữa (BTSC)",
    hash: "pages/F-bao-cao/bao-cao-chi-phi-btsc.html",
    desc: "Phân tích chi phí thay thế phụ tùng, dầu nhờn, nhân công xưởng theo từng đầu xe và từng xí nghiệp.",
    filename: "34_bao_cao_chi_phi_btsc.png"
  },
  {
    moduleGroup: "Phân hệ 9: Báo cáo Hợp nhất",
    title: "Báo Cáo So Sánh Hiệu Quả Giữa Các Khu Liên Hợp",
    hash: "pages/F-bao-cao/bao-cao-so-sanh-klh.html",
    desc: "Đối chiếu các chỉ số năng suất, suất tiêu hao nhiên liệu, tỷ lệ xe hỏng giữa KLH Koun Mom và KLH Snuol.",
    filename: "35_bao_cao_so_sanh_klh.png"
  },
  {
    moduleGroup: "Phân hệ 10: Danh mục Hệ thống",
    title: "Danh Mục 9 Chủng Loại Xe Chuẩn THACO AGRI",
    hash: "pages/H-danh-muc/loai-xe-9-chung-loai.html",
    desc: "Quy chuẩn thông số kỹ thuật, công suất HP, tải trọng tấn, dung tích bình dầu của 9 dòng xe chuẩn.",
    filename: "36_danh_muc_9_chung_loai.png"
  },
  {
    moduleGroup: "Phân hệ 11: Phân quyền Hệ thống",
    title: "Phân Quyền Người Dùng & Ma Trận Vai Trò",
    hash: "pages/G-phan-quyen/vai-tro-phan-quyen.html",
    desc: "Phân quyền chi tiết cho Ban Giám đốc KLH, Quản đốc Cơ giới, Trưởng ca Vận tải, Thủ kho Dầu và Thợ máy.",
    filename: "37_phan_quyen_vai_tro.png"
  }
];

async function main() {
  console.log('Generating Master HTML Document...');

  let pagesHtml = '';

  for (let i = 0; i < SCREENS.length; i++) {
    const s = SCREENS[i];
    // Use relative file path from master_mockup_document.html to screenshot
    const imgSrc = `./screenshots/${s.filename}`;

    pagesHtml += `
      <div class="mockup-sheet">
        <div class="sheet-header">
          <div class="sheet-group">${s.moduleGroup}</div>
          <div class="sheet-title">${s.title}</div>
          <div class="sheet-desc">${s.desc}</div>
        </div>

        <div class="mockup-frame">
          <div class="browser-bar">
            <div class="dots"><span></span><span></span><span></span></div>
            <div class="url-bar">https://fleet.thacoagri.com.vn/#${s.hash}</div>
            <div class="live-pill">● Trực tiếp GPS</div>
          </div>
          <div class="mockup-img-wrap">
            <img src="${imgSrc}" class="mockup-img" alt="${s.title}" />
          </div>
        </div>

        <div class="sheet-footer">
          <span class="left">Hệ thống Quản lý Phương tiện Cơ giới & Lái xe · THACO AGRI</span>
          <span class="right">Trang ${i + 3} / ${SCREENS.length + 2}</span>
        </div>
      </div>
    `;
  }

  const masterHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>THACO AGRI - Tài liệu Mockup Hệ Thống Quản Lý Xe Cơ Giới</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .cover-page {
      width: 297mm;
      height: 210mm;
      page-break-after: always;
      background: #0d3b20;
      color: #ffffff;
      padding: 24mm 24mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .cover-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .cover-brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #ffffff;
    }

    .cover-brand-sub {
      font-size: 11px;
      letter-spacing: 3px;
      color: #a3e635;
      font-weight: 700;
    }

    .cover-main {
      margin-top: 6mm;
    }

    .cover-tag {
      display: inline-block;
      background: rgba(184, 216, 61, 0.2);
      border: 1px solid rgba(184, 216, 61, 0.4);
      color: #d9f99d;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 16px;
    }

    .cover-title {
      font-size: 30px;
      font-weight: 800;
      line-height: 1.25;
      color: #ffffff;
      margin-bottom: 12px;
    }

    .cover-subtitle {
      font-size: 14px;
      color: #cbd5e1;
      max-width: 240mm;
      line-height: 1.6;
    }

    .cover-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 16px 20px;
      margin-top: 8mm;
    }

    .cover-stat-item strong {
      display: block;
      font-size: 22px;
      font-weight: 800;
      color: #a3e635;
    }

    .cover-stat-item span {
      font-size: 11px;
      color: #e2e8f0;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 12px;
      font-size: 11px;
      color: #94a3b8;
    }

    /* TOC PAGE */
    .toc-page {
      width: 297mm;
      height: 210mm;
      page-break-after: always;
      background: #ffffff;
      padding: 14mm 18mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .toc-header h2 {
      font-size: 20px;
      font-weight: 800;
      color: #0d3b20;
      margin-bottom: 4px;
    }

    .toc-header p {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 10px;
    }

    .toc-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 18px;
      font-size: 10px;
    }

    .toc-group {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .toc-group-title {
      font-weight: 700;
      color: #154e2c;
      font-size: 11px;
      margin-bottom: 4px;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      color: #334155;
      border-bottom: 1px dotted #cbd5e1;
    }

    .toc-item:last-child {
      border-bottom: none;
    }

    .toc-item span:first-child {
      font-weight: 500;
    }

    .toc-item span:last-child {
      font-weight: 700;
      color: #154e2c;
    }

    /* MOCKUP SHEET PAGE */
    .mockup-sheet {
      width: 297mm;
      height: 210mm;
      page-break-after: always;
      background: #f8fafc;
      padding: 8mm 12mm 6mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .sheet-header {
      margin-bottom: 4px;
    }

    .sheet-group {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #154e2c;
      margin-bottom: 1px;
    }

    .sheet-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .sheet-desc {
      font-size: 10px;
      color: #475569;
      line-height: 1.3;
    }

    .mockup-frame {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex: 1;
      max-height: 162mm;
    }

    .browser-bar {
      height: 22px;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      padding: 0 8px;
      gap: 8px;
    }

    .dots {
      display: flex;
      gap: 4px;
    }

    .dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
    }

    .dots span:nth-child(1) { background: #f87171; }
    .dots span:nth-child(2) { background: #fbbf24; }
    .dots span:nth-child(3) { background: #4ade80; }

    .url-bar {
      flex: 1;
      background: #ffffff;
      height: 15px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
      font-size: 8px;
      font-family: monospace;
      color: #64748b;
      display: flex;
      align-items: center;
      padding: 0 6px;
    }

    .live-pill {
      font-size: 7px;
      font-weight: 700;
      color: #154e2c;
      background: #dcfce7;
      padding: 1px 5px;
      border-radius: 8px;
    }

    .mockup-img-wrap {
      flex: 1;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: #ffffff;
    }

    .mockup-img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
      object-position: top;
    }

    .sheet-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #94a3b8;
      padding-top: 3px;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>

  <!-- 1. COVER PAGE -->
  <div class="cover-page">
    <div class="cover-brand">
      <div>
        <div class="cover-brand-title">THACO AGRI</div>
        <div class="cover-brand-sub">AGRICULTURAL CORPORATION</div>
      </div>
    </div>

    <div class="cover-main">
      <div class="cover-tag">TÀI LIỆU ĐẶC TẢ GIAO DIỆN & MOCKUP CHỨC NĂNG</div>
      <h1 class="cover-title">HỆ THỐNG QUẢN LÝ XE CƠ GIỚI & LÁI XE<br/>KHU LIÊN HỢP NÔNG NGHIỆP</h1>
      <p class="cover-subtitle">
        Tài liệu tổng hợp 37 màn hình giao diện chuẩn hóa (Monochrome, nhận diện xanh lá THACO AGRI, không icon màu, quản lý dầu trên xe qua que đo GPS) phục vụ điều hành 128 phương tiện cơ giới & 96 lái xe tại KLH Koun Mom & Snuol.
      </p>

      <div class="cover-stats">
        <div class="cover-stat-item">
          <strong>128 Xe</strong>
          <span>Phương tiện cơ giới & thiết bị</span>
        </div>
        <div class="cover-stat-item">
          <strong>18.450 Lít</strong>
          <span>Mức dầu bình xe (Que đo GPS)</span>
        </div>
        <div class="cover-stat-item">
          <strong>96 Lái xe</strong>
          <span>Lực lượng vận hành theo ca</span>
        </div>
        <div class="cover-stat-item">
          <strong>11 Phân hệ</strong>
          <span>Giám sát & Quản trị tích hợp</span>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <span>Đơn vị phát triển: THACO AGRI IT & Ban Cơ Giới Nông Nghiệp</span>
      <span>Phiên bản 1.0.0 · Phát hành: 29/08/2026</span>
    </div>
  </div>

  <!-- 2. TABLE OF CONTENTS -->
  <div class="toc-page">
    <div class="toc-header">
      <h2>MỤC LỤC DANH MỤC CÁC MÀN HÌNH MOCKUP</h2>
      <p>Tổng hợp 37 màn hình chức năng thuộc 11 phân hệ nghiệp vụ chính của hệ thống</p>
    </div>

    <div class="toc-grid">
      <div class="toc-group">
        <div class="toc-group-title">1. Dashboard Điều hành & 2. Giám sát GPS</div>
        <div class="toc-item"><span>Dashboard vận hành thời gian thực</span><span>Trang 3</span></div>
        <div class="toc-item"><span>Bản đồ GPS realtime toàn đội xe</span><span>Trang 4</span></div>
        <div class="toc-item"><span>Playback xem lại lịch sử hành trình</span><span>Trang 5</span></div>
        <div class="toc-item"><span>Vùng giám sát địa lý (Geofence)</span><span>Trang 6</span></div>
        <div class="toc-item"><span>Cảnh báo vượt tốc độ & sai vùng</span><span>Trang 7</span></div>
        <div class="toc-item"><span>Nhật ký mất sóng offline</span><span>Trang 8</span></div>
      </div>

      <div class="toc-group">
        <div class="toc-group-title">3. Quản lý Đội xe & 4. Lệnh Điều xe</div>
        <div class="toc-item"><span>Hồ sơ danh sách xe cơ giới (128 xe)</span><span>Trang 9</span></div>
        <div class="toc-item"><span>Hồ sơ nông cụ & thiết bị đính kèm</span><span>Trang 10</span></div>
        <div class="toc-item"><span>Phân bổ xe theo đơn vị & KLH</span><span>Trang 11</span></div>
        <div class="toc-item"><span>Thiết bị GPS & cảm biến que đo</span><span>Trang 12</span></div>
        <div class="toc-item"><span>Kế hoạch sản xuất & điều độ cơ giới</span><span>Trang 13</span></div>
        <div class="toc-item"><span>Lệnh điều xe sản xuất (LSX)</span><span>Trang 14</span></div>
        <div class="toc-item"><span>Lệnh vận chuyển nội bộ (LVC)</span><span>Trang 15</span></div>
        <div class="toc-item"><span>Xác nhận khối lượng & phiếu cân</span><span>Trang 16</span></div>
      </div>

      <div class="toc-group">
        <div class="toc-group-title">5. Quản lý Lái xe & 6. Xưởng BTSC</div>
        <div class="toc-item"><span>Hồ sơ 96 lái xe & thợ vận hành</span><span>Trang 17</span></div>
        <div class="toc-item"><span>Phân công lái xe theo ca trực</span><span>Trang 18</span></div>
        <div class="toc-item"><span>Quản lý GPLX & hạn khám sức khỏe</span><span>Trang 19</span></div>
        <div class="toc-item"><span>Lịch sử vi phạm & sự cố</span><span>Trang 20</span></div>
        <div class="toc-item"><span>Bảng xếp hạng thi đua KPI lái xe</span><span>Trang 21</span></div>
        <div class="toc-item"><span>Kế hoạch bảo dưỡng định kỳ 250h</span><span>Trang 22</span></div>
        <div class="toc-item"><span>Tiếp nhận báo hỏng & yêu cầu sửa</span><span>Trang 23</span></div>
        <div class="toc-item"><span>Phiếu sửa chữa & xuất phụ tùng</span><span>Trang 24</span></div>
        <div class="toc-item"><span>Bảng Kanban tiến độ xưởng BTSC</span><span>Trang 25</span></div>
        <div class="toc-item"><span>Quản lý đăng kiểm & bảo hiểm xe</span><span>Trang 26</span></div>
      </div>

      <div class="toc-group">
        <div class="toc-group-title">7. Quản lý Nhiên liệu Xe & Báo cáo</div>
        <div class="toc-item"><span>Mức dầu bình xe (Que đo GPS Realtime)</span><span>Trang 27</span></div>
        <div class="toc-item"><span>Phiếu cấp dầu lưu động tại Lô</span><span>Trang 28</span></div>
        <div class="toc-item"><span>Định mức tiêu hao theo loại xe</span><span>Trang 29</span></div>
        <div class="toc-item"><span>Đối chiếu tiêu hao GPS vs que đo</span><span>Trang 30</span></div>
        <div class="toc-item"><span>Cảnh báo sụt dầu & hút trộm</span><span>Trang 31</span></div>
        <div class="toc-item"><span>Danh sách cảnh báo khẩn cấp SOS</span><span>Trang 32</span></div>
        <div class="toc-item"><span>Báo cáo năng suất vận hành xe</span><span>Trang 33</span></div>
        <div class="toc-item"><span>Báo cáo tiêu hao nhiên liệu tổng hợp</span><span>Trang 34</span></div>
        <div class="toc-item"><span>Báo cáo chi phí BTSC & phụ tùng</span><span>Trang 35</span></div>
        <div class="toc-item"><span>So sánh hiệu quả giữa các KLH</span><span>Trang 36</span></div>
        <div class="toc-item"><span>Danh mục 9 chủng loại & Phân quyền</span><span>Trang 37-38</span></div>
      </div>
    </div>

    <div class="sheet-footer">
      <span>Tài liệu Mockup Giao diện Hệ thống Quản lý Phương tiện Cơ giới & Lái xe</span>
      <span>Trang 2 / ${SCREENS.length + 2}</span>
    </div>
  </div>

  <!-- 3. MOCKUP PAGES -->
  ${pagesHtml}

</body>
</html>`;

  const masterHtmlPath = path.join(exportDir, 'master_mockup_document.html');
  fs.writeFileSync(masterHtmlPath, masterHtml, 'utf8');
  console.log('Saved master HTML document at:', masterHtmlPath);

  console.log('Launching browser to print PDF...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + masterHtmlPath.replace(/\\/g, '/');
  console.log('Loading:', fileUrl);

  await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Printing PDF...');
  await page.pdf({
    path: outputPdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log('SUCCESS! PDF generated at:', outputPdfPath);
  await browser.close();
}

main().catch(err => {
  console.error('Error exporting PDF:', err);
  process.exit(1);
});
