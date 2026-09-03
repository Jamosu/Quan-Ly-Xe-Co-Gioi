const menu = [
  ['Dashboard', 'A-dashboard', [
    ['Dashboard vận hành', 'dashboard-van-hanh.html', '']
  ]],
  ['Giám sát GPS trực tuyến', 'B-giam-sat-gps', [
    ['Bản đồ GPS realtime', 'giam-sat-realtime.html', ''],
    ['Playback hành trình', 'playback-hanh-trinh.html', ''],
    ['Vùng giám sát (Geofence)', 'vung-giam-sat-geofence.html', ''],
    ['Cảnh báo tốc độ & Vùng', 'canh-bao-toc-do-vung.html', ''],
    ['Nhật ký mất sóng offline', 'nhat-ky-mat-song-offline.html', '']
  ]],
  ['Quản lý đội xe', 'C-doi-xe', [
    ['Hồ sơ xe cơ giới', 'ho-so-xe.html', ''],
    ['Hồ sơ thiết bị đính kèm', 'ho-so-thiet-bi.html', ''],
    ['Phân xe theo đơn vị', 'phan-xe-don-vi.html', ''],
    ['Thiết bị GPS & Cảm biến', 'thiet-bi-gps-cam-bien.html', ''],
    ['Lịch sử biến động xe', 'lich-su-thay-doi-xe.html', '']
  ]],
  ['Lệnh điều xe & Vận hành', 'D-lenh-dieu-xe', [
    ['Kế hoạch sản xuất', 'ke-hoach-san-xuat.html', ''],
    ['Lệnh điều xe', 'lenh-dieu-xe.html', ''],
    ['Lệnh vận chuyển nội bộ', 'lenh-van-chuyen.html', ''],
    ['Xác nhận khối lượng & Cân', 'xac-nhan-khoi-luong-phieu-can.html', '']
  ]],
  ['Quản lý tài xế', 'I-lai-xe', [
    ['Hồ sơ lái xe & Thợ máy', 'ho-so-lai-xe.html', ''],
    ['Phân công lái xe theo ca', 'phan-cong-lai-xe.html', ''],
    ['Quản lý GPLX & Hạn SK', 'quan-ly-gplx.html', ''],
    ['Lịch sử vi phạm', 'lich-su-vi-pham.html', ''],
    ['Bảng xếp hạng thi đua KPI', 'bang-xep-hang-kpi.html', '']
  ]],
  ['Xưởng BTSC', 'E-xuong-btsc', [
    ['Kế hoạch bảo trì (250h)', 'ke-hoach-bao-tri.html', ''],
    ['Tiếp nhận báo hỏng', 'yeu-cau-sua-chua.html', ''],
    ['Phiếu sửa chữa & Vật tư', 'phieu-sua-chua.html', ''],
    ['Theo dõi tiến độ xưởng (Kanban)', 'theo-doi-sua-chua.html', ''],
    ['Đăng kiểm & Bảo hiểm', 'dang-kiem-bao-hiem.html', '']
  ]],
  ['Quản lý nhiên liệu xe', 'J-nhien-lieu', [
    ['Mức dầu bình xe (Que đo GPS)', 'ton-kho-bon-chua.html', ''],
    ['Cấp phát dầu tại xe & Lô', 'phieu-cap-nhien-lieu.html', ''],
    ['Định mức tiêu hao theo xe', 'dinh-muc-nhien-lieu.html', ''],
    ['Đối chiếu GPS vs Que đo dầu', 'doi-chieu-tieu-hao.html', ''],
    ['Cảnh báo sụt dầu & Hút trộm', 'canh-bao-bat-thuong-dau.html', '']
  ]],
  ['Cảnh báo & Thông báo', 'K-canh-bao', [
    ['Cảnh báo chưa xử lý (SOS)', 'canh-bao-chua-xu-ly.html', '18'],
    ['Lịch sử cảnh báo', 'lich-su-canh-bao.html', ''],
    ['Cấu hình ngưỡng an toàn', 'cau-hinh-nguong-canh-bao.html', ''],
    ['Thống kê tần suất vi phạm', 'thong-ke-canh-bao.html', '']
  ], '18'],
  ['Báo cáo hợp nhất', 'F-bao-cao', [
    ['Báo cáo năng suất xe', 'bao-cao-van-hanh.html', ''],
    ['Hành trình & Vi phạm', 'bao-cao-hanh-trinh-vi-pham.html', ''],
    ['Báo cáo KPI lái xe', 'bao-cao-lai-xe-kpi.html', ''],
    ['Báo cáo tiêu hao nhiên liệu', 'bao-cao-nhien-lieu.html', ''],
    ['Báo cáo chi phí BTSC', 'bao-cao-chi-phi-btsc.html', ''],
    ['So sánh giữa các KLH', 'bao-cao-so-sanh-klh.html', '']
  ]],
  ['Danh mục hệ thống', 'H-danh-muc', [
    ['Đơn vị / KLH / Đội xe', 'don-vi-klh-doi-xe.html', ''],
    ['9 Chủng loại xe chuẩn', 'loai-xe-9-chung-loai.html', ''],
    ['Loại công việc & Lệnh', 'loai-cong-viec-loai-lenh.html', ''],
    ['Lô thửa & Tuyến đường', 'lo-thua-tuyen-duong.html', ''],
    ['Vật tư & Phụ tùng BTSC', 'vat-tu-phu-tung.html', ''],
    ['Định mức kỹ thuật', 'dinh-muc-ky-thuat.html', '']
  ]],
  ['Phân quyền hệ thống', 'G-phan-quyen', [
    ['Người dùng & Tài khoản', 'nguoi-dung.html', ''],
    ['Vai trò & Ma trận quyền', 'vai-tro-phan-quyen.html', ''],
    ['Phân quyền theo đơn vị', 'phan-quyen-don-vi.html', ''],
    ['Nhật ký hệ thống (Audit)', 'nhat-ky-he-thong.html', '']
  ]]
];

const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const nav = document.querySelector('#mainNav');
if (nav) {
  nav.innerHTML = '';
  menu.forEach((m, i) => {
    const isDirectDashboard = (i === 0);
    const g = document.createElement('div');
    g.className = 'nav-group' + (i === 0 ? ' open' : '');

    const badgeHTML = m[3] ? `<span class="badge">${m[3]}</span>` : '';

    g.innerHTML = `
      <button class="nav-parent ${i === 0 ? 'active' : ''}" data-index="${i}">
        <span class="nav-label">${m[0]}</span>
        ${badgeHTML}
        ${!isDirectDashboard ? '<span class="chev">⌄</span>' : ''}
      </button>
      <div class="nav-children">
        ${m[2].map((x, j) => `
          <button data-parent="${m[0]}" data-folder="${m[1]}" data-file="${x[1]}" data-page="${x[0]}" data-route="${slug(m[0])}/${slug(x[0])}" class="nav-child ${i === 0 && j === 0 ? 'active' : ''}">
            <span>${x[0]}</span>
            ${x[2] ? `<span class="badge badge-child">${x[2]}</span>` : ''}
          </button>
        `).join('')}
      </div>
    `;
    nav.appendChild(g);
  });

  document.querySelectorAll('.nav-parent').forEach(b => b.onclick = (e) => {
    const g = b.parentElement;
    const isDashboard = b.dataset.index === '0';

    if (isDashboard) {
      document.querySelectorAll('.nav-group').forEach(x => x.classList.remove('open'));
      g.classList.add('open');
      const firstChild = g.querySelector('.nav-child');
      if (firstChild) firstChild.click();
      return;
    }

    const wasOpen = g.classList.contains('open');
    document.querySelectorAll('.nav-group').forEach(x => x !== g && x.classList.remove('open'));
    g.classList.toggle('open', !wasOpen);
  });

  document.querySelectorAll('.nav-child').forEach(b => b.onclick = () => {
    document.querySelectorAll('.nav-child,.nav-parent').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    b.closest('.nav-group').querySelector('.nav-parent').classList.add('active');
    location.hash = b.dataset.route;
    renderScreen(b.dataset.parent, b.dataset.page, b.dataset.folder, b.dataset.file);
  });
}

const cBtn = document.querySelector('#collapseBtn');
if (cBtn) {
  cBtn.onclick = () => {
    const sidebar = document.querySelector('#sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
      cBtn.textContent = sidebar.classList.contains('collapsed') ? '›' : '‹';
    }
  };
}

function showToast(msg) {
  const t = document.querySelector('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function bindButtons() {
  document.querySelectorAll('.btn,.text-btn,.select-btn,.select-mini,.notification,.profile,.module-toolbar button,.module-toolbar select,.module-panel footer button,.kanban article,.settings footer button,.timeline button,.module-map aside button,.zoom button').forEach(b => {
    b.onclick = () => showToast('Đã ghi nhận: ' + b.textContent.trim());
  });
}
bindButtons();

const dashboardPageEl = document.querySelector('.page');
const dashboardHTML = dashboardPageEl ? dashboardPageEl.innerHTML : '';

function renderScreen(parent, page, folder, file) {
  const breadcrumb = document.querySelector('.breadcrumb');
  if (breadcrumb) breadcrumb.innerHTML = `<span>${parent}</span><b>/</b><strong>${page}</strong>`;

  const key = `pages/${folder}/${file}`;
  if (window.MOCKUP_PAGE_DATA && window.MOCKUP_PAGE_DATA[key]) {
    document.querySelector('.page').innerHTML = window.MOCKUP_PAGE_DATA[key];
    bindButtons();
    return;
  }
}

function openHash() {
  const currentHash = location.hash.slice(1);
  if (!currentHash) return;
  const b = [...document.querySelectorAll('.nav-child')].find(x => x.dataset.route === currentHash);
  if (b) {
    document.querySelectorAll('.nav-child,.nav-parent').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    b.closest('.nav-group').classList.add('open');
    b.closest('.nav-group').querySelector('.nav-parent').classList.add('active');
    renderScreen(b.dataset.parent, b.dataset.page, b.dataset.folder, b.dataset.file);
  }
}

window.addEventListener('hashchange', openHash);
openHash();
