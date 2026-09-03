const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');

const rootDir = path.resolve(__dirname);
const legacyDir = path.join(rootDir, 'legacy_mockup');
const exportDir = path.join(legacyDir, 'pdf_export');
const imagesDir = path.join(exportDir, 'mockup_images');
const outputPdfPath = path.join(legacyDir, 'THACO_AGRI_Mockup_Hinh_Anh.pdf');

if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Chrome / Edge path
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const executablePath = chromePaths.find(p => fs.existsSync(p));

if (!executablePath) {
  console.error('No Chrome/Edge executable found!');
  process.exit(1);
}

// 50 Screens from app.js
const menu = [
  ['Dashboard', 'A-dashboard', [
    ['Dashboard vận hành', 'dashboard-van-hanh.html']
  ]],
  ['Giám sát GPS trực tuyến', 'B-giam-sat-gps', [
    ['Bản đồ GPS realtime', 'giam-sat-realtime.html'],
    ['Playback hành trình', 'playback-hanh-trinh.html'],
    ['Vùng giám sát (Geofence)', 'vung-giam-sat-geofence.html'],
    ['Cảnh báo tốc độ & Vùng', 'canh-bao-toc-do-vung.html'],
    ['Nhật ký mất sóng offline', 'nhat-ky-mat-song-offline.html']
  ]],
  ['Quản lý đội xe', 'C-doi-xe', [
    ['Hồ sơ xe cơ giới', 'ho-so-xe.html'],
    ['Hồ sơ thiết bị đính kèm', 'ho-so-thiet-bi.html'],
    ['Phân xe theo đơn vị', 'phan-xe-don-vi.html'],
    ['Thiết bị GPS & Cảm biến', 'thiet-bi-gps-cam-bien.html'],
    ['Lịch sử biến động xe', 'lich-su-thay-doi-xe.html']
  ]],
  ['Lệnh điều xe & Vận hành', 'D-lenh-dieu-xe', [
    ['Kế hoạch sản xuất', 'ke-hoach-san-xuat.html'],
    ['Lệnh điều xe', 'lenh-dieu-xe.html'],
    ['Lệnh vận chuyển nội bộ', 'lenh-van-chuyen.html'],
    ['Xác nhận khối lượng & Cân', 'xac-nhan-khoi-luong-phieu-can.html']
  ]],
  ['Quản lý tài xế', 'I-lai-xe', [
    ['Hồ sơ lái xe & Thợ máy', 'ho-so-lai-xe.html'],
    ['Phân công lái xe theo ca', 'phan-cong-lai-xe.html'],
    ['Quản lý GPLX & Hạn SK', 'quan-ly-gplx.html'],
    ['Lịch sử vi phạm', 'lich-su-vi-pham.html'],
    ['Bảng xếp hạng thi đua KPI', 'bang-xep-hang-kpi.html']
  ]],
  ['Xưởng BTSC', 'E-xuong-btsc', [
    ['Kế hoạch bảo trì (250h)', 'ke-hoach-bao-tri.html'],
    ['Tiếp nhận báo hỏng', 'yeu-cau-sua-chua.html'],
    ['Phiếu sửa chữa & Vật tư', 'phieu-sua-chua.html'],
    ['Theo dõi tiến độ xưởng (Kanban)', 'theo-doi-sua-chua.html'],
    ['Đăng kiểm & Bảo hiểm', 'dang-kiem-bao-hiem.html']
  ]],
  ['Quản lý nhiên liệu xe', 'J-nhien-lieu', [
    ['Mức dầu bình xe (Que đo GPS)', 'ton-kho-bon-chua.html'],
    ['Cấp phát dầu tại xe & Lô', 'phieu-cap-nhien-lieu.html'],
    ['Định mức tiêu hao theo xe', 'dinh-muc-nhien-lieu.html'],
    ['Đối chiếu GPS vs Que đo dầu', 'doi-chieu-tieu-hao.html'],
    ['Cảnh báo sụt dầu & Hút trộm', 'canh-bao-bat-thuong-dau.html']
  ]],
  ['Cảnh báo & Thông báo', 'K-canh-bao', [
    ['Cảnh báo chưa xử lý (SOS)', 'canh-bao-chua-xu-ly.html'],
    ['Lịch sử cảnh báo', 'lich-su-canh-bao.html'],
    ['Cấu hình ngưỡng an toàn', 'cau-hinh-nguong-canh-bao.html'],
    ['Thống kê tần suất vi phạm', 'thong-ke-canh-bao.html']
  ]],
  ['Báo cáo hợp nhất', 'F-bao-cao', [
    ['Báo cáo năng suất xe', 'bao-cao-van-hanh.html'],
    ['Hành trình & Vi phạm', 'bao-cao-hanh-trinh-vi-pham.html'],
    ['Báo cáo KPI lái xe', 'bao-cao-lai-xe-kpi.html'],
    ['Báo cáo tiêu hao nhiên liệu', 'bao-cao-nhien-lieu.html'],
    ['Báo cáo chi phí BTSC', 'bao-cao-chi-phi-btsc.html'],
    ['So sánh giữa các KLH', 'bao-cao-so-sanh-klh.html']
  ]],
  ['Danh mục hệ thống', 'H-danh-muc', [
    ['Đơn vị / KLH / Đội xe', 'don-vi-klh-doi-xe.html'],
    ['9 Chủng loại xe chuẩn', 'loai-xe-9-chung-loai.html'],
    ['Loại công việc & Lệnh', 'loai-cong-viec-loai-lenh.html'],
    ['Lô thửa & Tuyến đường', 'lo-thua-tuyen-duong.html'],
    ['Vật tư & Phụ tùng BTSC', 'vat-tu-phu-tung.html'],
    ['Định mức kỹ thuật', 'dinh-muc-ky-thuat.html']
  ]],
  ['Phân quyền hệ thống', 'G-phan-quyen', [
    ['Người dùng & Tài khoản', 'nguoi-dung.html'],
    ['Vai trò & Ma trận quyền', 'vai-tro-phan-quyen.html'],
    ['Phân quyền theo đơn vị', 'phan-quyen-don-vi.html'],
    ['Nhật ký hệ thống (Audit)', 'nhat-ky-he-thong.html']
  ]]
];

const allScreens = [];
let screenIdx = 1;
for (const [groupName, folder, items] of menu) {
  for (const [screenName, file] of items) {
    const padded = String(screenIdx).padStart(2, '0');
    const safeName = file.replace('.html', '');
    allScreens.push({
      index: screenIdx,
      group: groupName,
      title: screenName,
      hash: `pages/${folder}/${file}`,
      filename: `${padded}_${safeName}.png`
    });
    screenIdx++;
  }
}

// Start static file server
function startServer(port) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };

    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(legacyDir, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(port, () => resolve(server));
  });
}

async function main() {
  console.log('Starting static server...');
  const port = 3088;
  const server = await startServer(port);
  console.log(`Server running at http://localhost:${port}`);

  console.log('Launching browser to capture all 50 screens...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1600,1000', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1.25 });

  for (let i = 0; i < allScreens.length; i++) {
    const s = allScreens[i];
    const imagePath = path.join(imagesDir, s.filename);
    if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 10000) {
      console.log(`[${i + 1}/${allScreens.length}] Reusing cached image: ${s.title}`);
      continue;
    }
    const targetUrl = `http://localhost:${port}/#${s.hash}`;
    console.log(`[${i + 1}/${allScreens.length}] Capturing: ${s.title} (${s.hash})`);

    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log('goto err:', e.message));
    await new Promise(r => setTimeout(r, 400));

    await page.screenshot({ path: imagePath, type: 'png' });
  }

  console.log('Generating Image-Only Master HTML Document...');

  let pagesHtml = '';
  for (const s of allScreens) {
    const imgSrc = `./mockup_images/${s.filename}`;
    pagesHtml += `
      <div class="mockup-page">
        <img src="${imgSrc}" class="full-img" alt="${s.title}" />
      </div>
    `;
  }

  const masterHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>THACO AGRI - Toàn bộ Mockup Hình Ảnh Giao Diện</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .mockup-page {
      width: 297mm;
      height: 210mm;
      page-break-after: always;
      page-break-inside: avoid;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      overflow: hidden;
    }

    .full-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top left;
      display: block;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  const masterHtmlPath = path.join(exportDir, 'image_only_document.html');
  fs.writeFileSync(masterHtmlPath, masterHtml, 'utf8');
  console.log('Saved master HTML document at:', masterHtmlPath);

  console.log('Rendering pure Image-Only PDF document...');
  const pdfPage = await browser.newPage();
  const fileUrl = 'file:///' + masterHtmlPath.replace(/\\/g, '/');

  await pdfPage.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  await pdfPage.pdf({
    path: outputPdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log('SUCCESS! PDF generated at:', outputPdfPath);
  await browser.close();
  server.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
