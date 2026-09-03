# -*- coding: utf-8 -*-
"""
Builder for 11 Modules THACO AGRI Fleet Management System
Creates/replaces files in `pages/` according to modules A -> Removes SMS/Zalo/Email configurations and replaces them with clean in-app web alerts.
"""

import os
import shutil
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

from module_structure import MODULES
from mockup_helpers import (
    make_pill, make_stats, make_filters, make_head, 
    make_table, make_kanban, make_calendar, make_map, 
    make_analytics, make_timeline, make_settings
)

PAGES_DATA = {}

# ==========================================
# MODULE A: DASHBOARD
# ==========================================
PAGES_DATA["pages/A-dashboard/dashboard-van-hanh.html"] = f'''
<div class="page-head">
  <div>
    <p class="eyebrow">TRUNG TÂM ĐIỀU HÀNH THỜI GIAN THỰC</p>
    <h1>Chào buổi sáng, anh Long!</h1>
    <p>Theo dõi toàn cảnh 128 phương tiện cơ giới & 96 lái xe tại Khu liên hợp Koun Mom.</p>
  </div>
  <div class="head-actions">
    <button class="btn btn-light">↗ Xuất báo cáo nhanh</button>
    <button class="btn btn-primary">＋ Lập lệnh điều xe</button>
  </div>
</div>

<div class="filterbar">
  <button class="select-btn">▦&nbsp; Hôm nay, 23/08/2026 <span>⌄</span></button>
  <button class="select-btn">⌂&nbsp; KLH Koun Mom (Tất cả xí nghiệp) <span>⌄</span></button>
  <div class="live-status"><i></i>Dữ liệu trực tiếp GPS <span>Cập nhật 08:42:16</span></div>
</div>

<div class="stats">
  <div class="stat-card">
    <div class="stat-top"><span class="stat-icon green">▰</span><span class="trend">+4,2%</span></div>
    <div class="stat-value">128</div>
    <div class="stat-label">Tổng phương tiện (86 chạy / 21 dừng / 15 BTSC / 6 mất sóng)</div>
  </div>
  <div class="stat-card">
    <div class="stat-top"><span class="stat-icon blue">♙</span><span class="trend">96 tài xế</span></div>
    <div class="stat-value">68 / 24</div>
    <div class="stat-label">Lái xe đang trực ca / Nghỉ off (4 chưa nhận lệnh)</div>
  </div>
  <div class="stat-card">
    <div class="stat-top"><span class="stat-icon amber">⛽</span><span class="trend">82.4% đầy</span></div>
    <div class="stat-value">84.500 L</div>
    <div class="stat-label">Tồn kho nhiên liệu Diesel (Bồn Xăng Ron 95 sắp hết)</div>
  </div>
  <div class="stat-card">
    <div class="stat-top"><span class="stat-icon red">🔔</span><span class="trend down">Ưu tiên 6 SOS</span></div>
    <div class="stat-value">18</div>
    <div class="stat-label">Cảnh báo chưa xử lý (Sụt dầu, Quá tốc độ, Ra vùng)</div>
  </div>
</div>

<div class="dashboard-grid">
  <section class="card map-card">
    <div class="card-head">
      <div>
        <h2>Bản đồ GPS Realtime toàn đội xe</h2>
        <p>Phân biệt xe đang chạy lệnh (Xanh) · Chạy tự do (Lam) · Dừng đỗ (Vàng) · Cảnh báo (Đỏ)</p>
      </div>
      <button class="text-btn">Mở bản đồ lớn ↗</button>
    </div>
    <div class="map-area">
      <div class="map-grid"></div>
      <svg class="route-lines" viewBox="0 0 900 390" preserveAspectRatio="none">
        <path d="M44 282 C170 236, 190 290, 320 210 S535 92, 655 170 S785 300, 860 242" />
        <path d="M84 72 C210 120, 300 70, 410 145 S624 270, 808 82" />
      </svg>
      <div class="map-label l1">XN Chuối 1</div>
      <div class="map-label l2">XN Chuối 2</div>
      <div class="map-label l3">Packhouse 2</div>
      <div class="map-label l4">Xưởng BTSC</div>
      <div class="vehicle-marker green m1" data-tip="XC-JD-024 • Đang cày ải (Lệnh LSX-018)">●<span>24</span></div>
      <div class="vehicle-marker green m2" data-tip="XT-HW-102 • Chở chuối Packhouse (Lệnh LVC-011)">●<span>02</span></div>
      <div class="vehicle-marker amber m3" data-tip="XC-KB-053 • Dừng chờ bồn dầu">●<span>53</span></div>
      <div class="vehicle-marker red m4" data-tip="XT-HN-079 • Cảnh báo quá tốc độ 38km/h">●<span>79</span></div>
      <div class="vehicle-marker blue m5" data-tip="BT-FR-007 • Xe kỹ thuật tuần tra tự do">●<span>07</span></div>
      <div class="zoom"><button>＋</button><button>−</button></div>
      <div class="legend">
        <span><i class="green-dot"></i>Đang chạy lệnh 58</span>
        <span><i class="blue-dot" style="background:#2563eb;width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px"></i>Chạy tự do 28</span>
        <span><i class="amber-dot"></i>Dừng đỗ 21</span>
        <span><i class="red-dot"></i>Cảnh báo SOS 6</span>
      </div>
    </div>
  </section>

  <section class="card alert-card">
    <div class="card-head">
      <div>
        <h2>Cảnh báo chưa xử lý (Phân cấp ưu tiên)</h2>
        <p>18 cảnh báo trực tiếp trên hệ thống Web</p>
      </div>
      <button class="text-btn">Xem tất cả</button>
    </div>
    <div id="alerts">
      <div class="alert-item"><span class="alert-symbol red">!</span>
        <div class="alert-copy"><b>Sụt giảm nhiên liệu bất thường (>15L/3p)</b><small>XC-JD-024 · Lô CN-A12 · Mức độ: Khẩn cấp</small></div><span class="alert-time">2 phút</span>
      </div>
      <div class="alert-item"><span class="alert-symbol red">⚡</span>
        <div class="alert-copy"><b>Chạy quá tốc độ nông trường (38.5 km/h)</b><small>XT-HN-079 · Trục chính NT2 · Mức độ: Khẩn cấp</small></div><span class="alert-time">7 phút</span>
      </div>
      <div class="alert-item"><span class="alert-symbol amber">⏱</span>
        <div class="alert-copy"><b>Xe đến hạn bảo dưỡng Cấp 2 (2.500h)</b><small>XC-JD-024 · Còn 15 giờ máy · Mức độ: Cảnh báo</small></div><span class="alert-time">15 phút</span>
      </div>
      <div class="alert-item"><span class="alert-symbol amber">⌁</span>
        <div class="alert-copy"><b>Mất kết nối GPS > 2 giờ</b><small>MU-KM-015 · Khu khai hoang MR-01 · Mức độ: Cảnh báo</small></div><span class="alert-time">32 phút</span>
      </div>
      <div class="alert-item"><span class="alert-symbol blue">♙</span>
        <div class="alert-copy"><b>GPLX lái xe sắp hết hạn (<30 ngày)</b><small>Sok Phearith (GPLX Hạng C) · Hạn 15/09/2026</small></div><span class="alert-time">1 giờ</span>
      </div>
    </div>
  </section>

  <!-- THANH NGANG: LỆNH ĐIỀU XE & VẬN CHUYỂN HÔM NAY -->
  <section class="card orders-horizontal-card">
    <div class="orders-head-wrap">
      <div>
        <h2 style="font:700 15px Manrope;margin:0;display:flex;align-items:center;gap:8px">
          <span>▦</span> Lệnh điều xe & Vận chuyển hôm nay
          <span style="font-size:10px;font-weight:700;background:#e6f3ec;color:var(--green2);padding:2px 8px;border-radius:10px">42 lệnh trong ngày</span>
        </h2>
        <p style="font-size:11px;color:var(--muted);margin:4px 0 0">Giám sát tiến độ realtime qua GPS, đồng hồ giờ máy & App Lái xe (Tự động kiểm tra GPLX & Cấp dầu)</p>
      </div>

      <div class="orders-filter-tabs">
        <button class="order-tab active">Tất cả <span class="tab-cnt">42</span></button>
        <button class="order-tab">🚜 Sản xuất (LSX) <span class="tab-cnt">24</span></button>
        <button class="order-tab">🚛 Vận chuyển (LVC) <span class="tab-cnt">12</span></button>
        <button class="order-tab">🔧 Điều động cơ giới (LĐX) <span class="tab-cnt">6</span></button>
        <button class="order-tab" style="color:var(--red)">⚠️ Cần chú ý <span class="tab-cnt" style="background:#fbe9e9;color:var(--red)">2</span></button>
      </div>

      <div style="display:flex;align-items:center;gap:8px">
        <div class="orders-search-box">
          <span>🔍</span>
          <input placeholder="Tìm mã lệnh, xe, lái xe, lô..." />
        </div>
        <button class="btn btn-primary" style="height:32px;padding:0 12px;font-size:11px">＋ Lập lệnh mới</button>
        <button class="text-btn" style="font-size:11px;white-space:nowrap">Xem tất cả ↗</button>
      </div>
    </div>

    <div class="orders-kpi-bar">
      <div class="orders-kpi-item">
        <span class="orders-kpi-icon">📋</span>
        <div class="orders-kpi-text">
          <small>Tổng lệnh phát hành</small>
          <strong>42 lệnh (100% giao việc)</strong>
        </div>
      </div>
      <div class="orders-kpi-item">
        <span class="orders-kpi-icon" style="color:var(--green2)">🚜</span>
        <div class="orders-kpi-text">
          <small>Đang làm việc tại Lô/Thửa</small>
          <strong>26 phương tiện cơ giới</strong>
        </div>
      </div>
      <div class="orders-kpi-item">
        <span class="orders-kpi-icon" style="color:var(--blue)">🚛</span>
        <div class="orders-kpi-text">
          <small>Đang vận chuyển trên đường</small>
          <strong>12 chuyến xe nông sản</strong>
        </div>
      </div>
      <div class="orders-kpi-item">
        <span class="orders-kpi-icon" style="color:var(--amber)">⏱</span>
        <div class="orders-kpi-text">
          <small>Chờ duyệt & Xuất bến</small>
          <strong>4 lệnh ca tiếp theo</strong>
        </div>
      </div>
      <div class="orders-kpi-item">
        <span class="orders-kpi-icon" style="color:var(--green2)">🛡</span>
        <div class="orders-kpi-text">
          <small>GPLX & An toàn kỹ thuật</small>
          <strong>100% Hợp lệ / Đạt chuẩn</strong>
        </div>
      </div>
    </div>

    <div class="table-wrap">
      <table class="orders-table">
        <thead>
          <tr>
            <th>MÃ LỆNH & LOẠI LỆNH</th>
            <th>PHƯƠNG TIỆN & THIẾT BỊ</th>
            <th>LÁI XE / VẬN HÀNH</th>
            <th>CÔNG VIỆC / LÔ THỬA / LỘ TRÌNH</th>
            <th>NHIÊN LIỆU & ĐỊNH MỨC</th>
            <th>TIẾN ĐỘ THỰC HIỆN</th>
            <th>TRẠNG THÁI & HÀNH ĐỘNG</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <b style="font-size:12px">LSX-260823-018</b>
              <div><span class="tag green">Lệnh sản xuất</span> <small style="color:var(--muted)">06:30 • Ca 1</small></div>
            </td>
            <td>
              <b style="color:var(--ink);font-size:12px">XC-JD-024</b>
              <small style="display:block;color:var(--muted)">John Deere 140HP • Bánh hơi (7.2 km/h)</small>
            </td>
            <td>
              <b>Nguyễn Văn Minh</b>
              <div style="margin-top:2px"><span style="color:var(--green2);font-weight:700;font-size:10px">✓ Hạng FC / Máy kéo</span> <small style="color:var(--muted)">· 0918.234.567</small></div>
            </td>
            <td>
              <b>Cày lật sâu 35cm · Lô CN-A12</b>
              <small style="display:block;color:var(--muted)">Kế hoạch 24.0 ha (Đã xong 17.3 ha • Đạt 72%)</small>
            </td>
            <td>
              <b>115 L / 160 L</b>
              <small style="display:block;color:var(--muted)">Tiêu hao 71.8% • Giờ máy: 2.485h</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:7px">
                <span class="progress" style="width:90px"><i style="width:72%"></i></span>
                <b>72%</b>
              </div>
              <small style="display:block;color:var(--muted);margin-top:2px">ETA: Còn ~1.5 giờ máy</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="status-pill">Đang cày ải</span>
                <button class="mini-btn">⌖ GPS</button>
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <b style="font-size:12px">LVC-260823-011</b>
              <div><span class="tag blue">Vận chuyển nội bộ</span> <small style="color:var(--muted)">07:15 • Ca 1</small></div>
            </td>
            <td>
              <b style="color:var(--ink);font-size:12px">XT-HW-102</b>
              <small style="display:block;color:var(--muted)">Howo 4 chân 15T • Thùng lạnh (38 km/h)</small>
            </td>
            <td>
              <b>Trần Quốc Huy</b>
              <div style="margin-top:2px"><span style="color:var(--green2);font-weight:700;font-size:10px">✓ Hạng C</span> <small style="color:var(--muted)">· 0977.812.345</small></div>
            </td>
            <td>
              <b>Chở 14.2T chuối tươi ➔ Packhouse 2</b>
              <small style="display:block;color:var(--muted)">Lộ trình 18.5 km (Đã qua Trạm cân 1 • 14.230 kg)</small>
            </td>
            <td>
              <b>105 L / 220 L</b>
              <small style="display:block;color:var(--muted)">Tiêu hao 47.7% • Odo: 48.320 km</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:7px">
                <span class="progress" style="width:90px"><i style="width:48%"></i></span>
                <b>48%</b>
              </div>
              <small style="display:block;color:var(--muted);margin-top:2px">Đến Packhouse sau ~15 phút</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="status-pill">Đang vận chuyển</span>
                <button class="mini-btn">⌖ GPS</button>
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <b style="font-size:12px">LSX-260823-022</b>
              <div><span class="tag green">Lệnh sản xuất</span> <small style="color:var(--muted)">07:30 • Ca 1</small></div>
            </td>
            <td>
              <b style="color:var(--ink);font-size:12px">MG-KB-018</b>
              <small style="display:block;color:var(--muted)">Máy gặt đập Kubota DC-70 Plus (4.5 km/h)</small>
            </td>
            <td>
              <b>Lê Hoàng Nam</b>
              <div style="margin-top:2px"><span style="color:var(--green2);font-weight:700;font-size:10px">✓ CC Cơ giới NN</span> <small style="color:var(--muted)">· 0903.112.233</small></div>
            </td>
            <td>
              <b>Thu hoạch bắp sinh khối bò sữa · Lô SK-08</b>
              <small style="display:block;color:var(--muted)">Kế hoạch 12.0 ha (Đã xong 3.0 ha • Năng suất 2.1 ha/h)</small>
            </td>
            <td>
              <b>30 L / 120 L</b>
              <small style="display:block;color:var(--muted)">Tiêu hao 25.0% • Giờ máy: 1.890h</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:7px">
                <span class="progress" style="width:90px"><i style="width:25%"></i></span>
                <b>25%</b>
              </div>
              <small style="display:block;color:var(--muted);margin-top:2px">Đang gom hạt lên xe trung chuyển</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="status-pill amber">Đang thu hoạch</span>
                <button class="mini-btn">⌖ GPS</button>
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <b style="font-size:12px">LĐX-260823-026</b>
              <div><span class="tag amber">Điều động cơ giới</span> <small style="color:var(--muted)">08:00 • Ca 1</small></div>
            </td>
            <td>
              <b style="color:var(--ink);font-size:12px">XB-HN-045</b>
              <small style="display:block;color:var(--muted)">Hino FG8J 8m³ • Xe bồn tưới dưỡng ẩm</small>
            </td>
            <td>
              <b>Đỗ Thanh Hải</b>
              <div style="margin-top:2px"><span style="color:var(--green2);font-weight:700;font-size:10px">✓ Hạng C</span> <small style="color:var(--muted)">· 0945.678.901</small></div>
            </td>
            <td>
              <b>Tưới dưỡng ẩm lô chuối mới trồng · Lô CB-03</b>
              <small style="display:block;color:var(--muted)">Kế hoạch 3 lượt bồn 8m³ (Đã xong 2 lượt)</small>
            </td>
            <td>
              <b>45 L / 90 L</b>
              <small style="display:block;color:var(--muted)">Tiêu hao 50.0% • Giờ bơm: 3.120h</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:7px">
                <span class="progress" style="width:90px"><i style="width:66%"></i></span>
                <b>66%</b>
              </div>
              <small style="display:block;color:var(--muted);margin-top:2px">Còn 1 lượt xả bồn nước</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="status-pill">Đang tưới ẩm</span>
                <button class="mini-btn">⌖ GPS</button>
              </div>
            </td>
          </tr>

          <tr>
            <td>
              <b style="font-size:12px">LĐX-260823-031</b>
              <div><span class="tag gray">Chờ xuất bến</span> <small style="color:var(--muted)">08:30 • Ca 1</small></div>
            </td>
            <td>
              <b style="color:var(--ink);font-size:12px">MU-KM-015</b>
              <small style="display:block;color:var(--muted)">Komatsu D65PX • Máy ủi bánh xích</small>
            </td>
            <td>
              <b>Keo Sarath</b>
              <div style="margin-top:2px"><span style="color:var(--green2);font-weight:700;font-size:10px">✓ CC Máy ủi</span> <small style="color:var(--muted)">· (+855) 88.991.223</small></div>
            </td>
            <td>
              <b>San gạt nền đường giao thông nội đồng NT2</b>
              <small style="display:block;color:var(--muted)">Kế hoạch 3.5 km đường lô nông trường</small>
            </td>
            <td>
              <b>0 L / 140 L</b>
              <small style="display:block;color:var(--muted)">Đã duyệt cấp phiếu dầu 140L</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:7px">
                <span class="progress" style="width:90px"><i style="width:0%"></i></span>
                <b>0%</b>
              </div>
              <small style="display:block;color:var(--muted);margin-top:2px">Chờ Quản đốc duyệt xuất bến</small>
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="status-pill amber">Chờ xuất phát</span>
                <button class="btn btn-primary" style="height:26px;padding:0 10px;font-size:10px">✓ Xuất bến</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card-foot">
      <span>Hiển thị <b>5</b> trên tổng số <b>42</b> lệnh điều xe & vận chuyển trong ca trực hôm nay</span>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="pagination">
          <button>‹</button>
          <button class="active">1</button>
          <button>2</button>
          <button>3</button>
          <button>...</button>
          <button>9</button>
          <button>›</button>
        </div>
        <button class="text-btn" style="font-weight:700">Mở phân hệ Lệnh điều xe →</button>
      </div>
    </div>
  </section>

  <!-- HIỆU SUẤT VẬN HÀNH & ĐIỀU ĐỘ 9 CHỦNG LOẠI XE -->
  <section class="card operation-card">
    <div class="card-head">
      <div>
        <h2>Hiệu suất vận hành theo chu kỳ & Tình trạng điều độ 9 chủng loại xe cơ giới</h2>
        <p>Thống kê tỷ lệ hoàn thành sản lượng kế hoạch vs thực tế theo khoảng ngày, tuần, tháng và cơ cấu 128 phương tiện</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="select-mini">Đơn vị: Sản lượng (Ha / Tấn) <span>⌄</span></button>
        <button class="btn btn-light" style="height:32px;padding:0 12px;font-size:11px">↗ Xuất Excel</button>
      </div>
    </div>

    <!-- THANH LỌC THỜI GIAN THEO KHOẢNG NGÀY, TUẦN, THÁNG -->
    <div class="chart-filter-bar">
      <div class="time-filter-tabs">
        <button class="time-tab active">📅 Theo ngày (Khoảng ngày)</button>
        <button class="time-tab">🗓 Theo tuần</button>
        <button class="time-tab">📆 Theo tháng</button>
      </div>

      <div class="date-range-box">
        <span class="date-icon">📅</span>
        <span class="date-label">Từ:</span>
        <input type="text" class="date-input" value="17/08/2026" />
        <span class="date-arrow">➔</span>
        <span class="date-label">Đến:</span>
        <input type="text" class="date-input" value="23/08/2026" />
        <button class="mini-filter-btn" title="Áp dụng lọc">Lọc</button>
      </div>

      <div class="quick-presets">
        <span style="font-size:10px;color:var(--muted);margin-right:2px">Nhanh:</span>
        <button class="preset-pill">Hôm nay</button>
        <button class="preset-pill active">7 ngày qua</button>
        <button class="preset-pill">Tuần này (W34)</button>
        <button class="preset-pill">Tháng 08/2026</button>
      </div>
    </div>

    <div class="op-split">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <b style="font-size:11px;color:var(--muted)">BIỂU ĐỒ HOÀN THÀNH KẾ HOẠCH THEO NGÀY (17/08 ➔ 23/08/2026)</b>
          <div style="display:flex;gap:12px;font-size:10px">
            <span><i style="width:8px;height:8px;background:#dbe6df;display:inline-block;border-radius:2px;margin-right:4px"></i>Kế hoạch giao</span>
            <span><i style="width:8px;height:8px;background:var(--green2);display:inline-block;border-radius:2px;margin-right:4px"></i>Thực tế đạt</span>
          </div>
        </div>
        <div class="chart-wrap" style="height:210px;padding:10px 0 14px">
          <div class="y-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span></div>
          <div class="bar-chart">
            <div class="bar-group"><i class="bar" style="height:61%"></i><i class="bar primary" style="height:75%"></i><label>T2<small style="display:block;font-size:7px;color:#9aa39f">17/08</small></label></div>
            <div class="bar-group"><i class="bar" style="height:72%"></i><i class="bar primary" style="height:81%"></i><label>T3<small style="display:block;font-size:7px;color:#9aa39f">18/08</small></label></div>
            <div class="bar-group"><i class="bar" style="height:55%"></i><i class="bar primary" style="height:68%"></i><label>T4<small style="display:block;font-size:7px;color:#9aa39f">19/08</small></label></div>
            <div class="bar-group"><i class="bar" style="height:74%"></i><i class="bar primary" style="height:88%"></i><label>T5<small style="display:block;font-size:7px;color:#9aa39f">20/08</small></label></div>
            <div class="bar-group"><i class="bar" style="height:68%"></i><i class="bar primary" style="height:83%"></i><label>T6<small style="display:block;font-size:7px;color:#9aa39f">21/08</small></label></div>
            <div class="bar-group"><i class="bar" style="height:77%"></i><i class="bar primary" style="height:91%"></i><label>T7<small style="display:block;font-size:7px;color:#9aa39f">22/08</small></label></div>
            <div class="bar-group"><i class="bar" style="height:66%"></i><i class="bar primary" style="height:78%"></i><label>CN<small style="display:block;font-size:7px;color:#9aa39f">23/08</small></label></div>
          </div>
        </div>
      </div>

      <div style="overflow-x:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.3px">PHÂN BỔ TRẠNG THÁI 9 CHỦNG LOẠI XE CƠ GIỚI (128 XE)</b>
          <div style="display:flex;gap:8px;font-size:10px">
            <span><i style="width:7px;height:7px;background:var(--green2);display:inline-block;border-radius:50%;margin-right:3px"></i>Đã giao việc</span>
            <span><i style="width:7px;height:7px;background:var(--amber);display:inline-block;border-radius:50%;margin-right:3px"></i>Chờ việc</span>
            <span><i style="width:7px;height:7px;background:var(--red);display:inline-block;border-radius:50%;margin-right:3px"></i>Bảo dưỡng</span>
          </div>
        </div>
        
        <table class="fleet-status-table">
          <thead>
            <tr>
              <th>CHỦNG LOẠI XE</th>
              <th style="text-align:center">TỔNG</th>
              <th style="text-align:center;color:var(--green2)">ĐÃ GIAO VIỆC</th>
              <th style="text-align:center;color:var(--amber)">CHƯA GIAO VIỆC</th>
              <th style="text-align:center;color:var(--red)">BẢO DƯỠNG</th>
              <th style="text-align:center">TỶ LỆ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>🚜 Máy kéo lớn 140HP (John Deere)</b></td>
              <td style="text-align:center"><b>24</b></td>
              <td style="text-align:center"><span class="badge-sm green">18 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">3 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">3 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="18 Chạy / 3 Chờ / 3 BTSC">
                  <span class="bar-active" style="width:75%"></span>
                  <span class="bar-idle" style="width:12.5%"></span>
                  <span class="bar-btsc" style="width:12.5%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>🚜 Máy kéo nhỏ 70-90HP (Kubota/NH)</b></td>
              <td style="text-align:center"><b>38</b></td>
              <td style="text-align:center"><span class="badge-sm green">28 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">6 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">4 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="28 Chạy / 6 Chờ / 4 BTSC">
                  <span class="bar-active" style="width:73.7%"></span>
                  <span class="bar-idle" style="width:15.8%"></span>
                  <span class="bar-btsc" style="width:10.5%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>🚛 Xe tải Howo 4 chân 15T (Chở chuối)</b></td>
              <td style="text-align:center"><b>18</b></td>
              <td style="text-align:center"><span class="badge-sm green">13 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">3 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">2 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="13 Chạy / 3 Chờ / 2 BTSC">
                  <span class="bar-active" style="width:72.2%"></span>
                  <span class="bar-idle" style="width:16.7%"></span>
                  <span class="bar-btsc" style="width:11.1%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>🚚 Xe tải Hino 8T (Nông sản & Vật tư)</b></td>
              <td style="text-align:center"><b>12</b></td>
              <td style="text-align:center"><span class="badge-sm green">8 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">3 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">1 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="8 Chạy / 3 Chờ / 1 BTSC">
                  <span class="bar-active" style="width:66.7%"></span>
                  <span class="bar-idle" style="width:25%"></span>
                  <span class="bar-btsc" style="width:8.3%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>🛻 Xe ben tự đổ 15T (Đất đá & Phân bón)</b></td>
              <td style="text-align:center"><b>6</b></td>
              <td style="text-align:center"><span class="badge-sm green">4 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">1 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">1 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="4 Chạy / 1 Chờ / 1 BTSC">
                  <span class="bar-active" style="width:66.7%"></span>
                  <span class="bar-idle" style="width:16.7%"></span>
                  <span class="bar-btsc" style="width:16.7%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>🌾 Máy gặt đập liên hợp Kubota DC-70</b></td>
              <td style="text-align:center"><b>4</b></td>
              <td style="text-align:center"><span class="badge-sm green">3 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">1 xe</span></td>
              <td style="text-align:center"><span class="badge-sm" style="background:#edf0ee;color:#8c9691">0 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="3 Chạy / 1 Chờ / 0 BTSC">
                  <span class="bar-active" style="width:75%"></span>
                  <span class="bar-idle" style="width:25%"></span>
                  <span class="bar-btsc" style="width:0%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>🏗 Máy đào bánh xích thủy lợi (CAT)</b></td>
              <td style="text-align:center"><b>8</b></td>
              <td style="text-align:center"><span class="badge-sm green">5 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">1 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">2 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="5 Chạy / 1 Chờ / 2 BTSC">
                  <span class="bar-active" style="width:62.5%"></span>
                  <span class="bar-idle" style="width:12.5%"></span>
                  <span class="bar-btsc" style="width:25%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>🚜 Máy ủi đất san gạt mặt bằng (Komatsu)</b></td>
              <td style="text-align:center"><b>6</b></td>
              <td style="text-align:center"><span class="badge-sm green">4 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">1 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">1 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="4 Chạy / 1 Chờ / 1 BTSC">
                  <span class="bar-active" style="width:66.7%"></span>
                  <span class="bar-idle" style="width:16.7%"></span>
                  <span class="bar-btsc" style="width:16.7%"></span>
                </div>
              </td>
            </tr>
            <tr>
              <td><b>⛽ Xe chuyên dùng (Bồn dầu, Téc nước)</b></td>
              <td style="text-align:center"><b>12</b></td>
              <td style="text-align:center"><span class="badge-sm green">9 xe</span></td>
              <td style="text-align:center"><span class="badge-sm amber">2 xe</span></td>
              <td style="text-align:center"><span class="badge-sm red">1 xe</span></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" title="9 Chạy / 2 Chờ / 1 BTSC">
                  <span class="bar-active" style="width:75%"></span>
                  <span class="bar-idle" style="width:16.7%"></span>
                  <span class="bar-btsc" style="width:8.3%"></span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td><b>TỔNG CỘNG (TOÀN KHU LIÊN HỢP)</b></td>
              <td style="text-align:center"><b>128</b></td>
              <td style="text-align:center"><b style="color:var(--green2)">92 xe (71.9%)</b></td>
              <td style="text-align:center"><b style="color:var(--amber)">21 xe (16.4%)</b></td>
              <td style="text-align:center"><b style="color:var(--red)">15 xe (11.7%)</b></td>
              <td style="text-align:center">
                <div class="fleet-multi-bar" style="width:100%">
                  <span class="bar-active" style="width:71.9%"></span>
                  <span class="bar-idle" style="width:16.4%"></span>
                  <span class="bar-btsc" style="width:11.7%"></span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </section>
</div>
'''

# ==========================================
# MODULE B: GIÁM SÁT GPS TRỰC TUYẾN
# ==========================================
PAGES_DATA["pages/B-giam-sat-gps/giam-sat-realtime.html"] = (
    make_head("GIÁM SÁT GPS TRỰC TUYẾN", "Bản đồ GPS Realtime toàn đội xe", "Giám sát vị trí trực tiếp, tốc độ, mức nhiên liệu que đo và phân biệt xe chạy theo lệnh vs xe chạy tự do.", ["↗ Bản đồ toàn màn hình", "⚡ Lệnh khẩn cấp"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả đơn vị", "GPS cập nhật mỗi 30s"]) +
    make_stats([("Xe đang chạy theo lệnh", "58 xe", "Hoạt động có năng suất"), ("Xe chạy tự do / Chuyển bãi", "28 xe", "Tuần tra, cứu hộ"), ("Xe đang dừng đỗ", "21 xe", "Đỗ đúng bãi 18 xe"), ("Cảnh báo vi phạm tốc độ/vùng", "6 xe", "Đẩy thông báo Quản đốc")]) +
    make_map([
        {"code": "XC-JD-024", "sub": "John Deere · Cày ải Lô A12 (Lệnh LSX-018) · Tài xế: Nguyễn Văn Minh · 8 km/h · Dầu 78%", "is_red": False, "left": 22, "top": 35, "marker": "JD24"},
        {"code": "XT-HW-102", "sub": "Howo 4 chân · Chở chuối PH2 (Lệnh LVC-011) · Tài xế: Trần Quốc Huy · 28 km/h · Dầu 65%", "is_red": False, "left": 45, "top": 55, "marker": "HW02"},
        {"code": "XC-KB-053", "sub": "Kubota M7040 · Lên luống Lô B06 · Tài xế: Lê Hoàng Nam · Đang dừng chờ cấp dầu", "is_amber": True, "left": 60, "top": 28, "marker": "KB53"},
        {"code": "XT-HN-079", "sub": "Hino 500 · Cảnh báo vượt tốc 38.5 km/h (Quy định max 30) · Tài xế: Sok Phearith", "is_red": True, "left": 75, "top": 65, "marker": "HN79"},
        {"code": "BT-FR-007", "sub": "Ford Ranger · Xe kỹ thuật tuần tra tự do · Tài xế: Nguyễn Thành Long · 32 km/h", "is_red": False, "left": 35, "top": 70, "marker": "FR07"},
        {"code": "XB-HN-045", "sub": "Xe téc Hino 15m3 · Phun vi sinh Lô CAT-D09 · Tài xế: Phạm Quốc An · 12 km/h", "is_red": False, "left": 80, "top": 32, "marker": "XB45"}
    ], "86 xe đang lăn bánh trên tổng số 128 xe · Tích hợp cảm biến dầu siêu âm & App Lái xe")
)

PAGES_DATA["pages/B-giam-sat-gps/playback-hanh-trinh.html"] = (
    make_head("GIÁM SÁT GPS TRỰC TUYẾN", "Playback hành trình theo ngày / ca", "Xem lại lịch sử di chuyển, biểu đồ vận tốc và các điểm dừng đỗ nổ máy theo mốc thời gian.", ["↗ Xuất KML", "⏵ Bắt đầu phát lại"]) +
    make_filters(["23/08/2026 (Ca 1: 06:00 - 14:00)", "Chọn xe: XC-JD-024 (John Deere 140HP)", "Tốc độ phát: 2x"]) +
    make_stats([("Tổng quãng đường ca lái", "64.8 km", "+12% so hôm qua"), ("Thời gian nổ máy hữu ích", "7h 42p", "Năng suất cày 24 ha"), ("Số lần dừng đỗ tiếp dầu", "3 lần", "Dừng lâu nhất 20p"), ("Vận tốc cao nhất", "26.4 km/h", "Đạt chuẩn an toàn")]) +
    make_map([
        {"code": "Điểm xuất phát (06:15)", "sub": "Bãi xe Đội 1 ➔ Di chuyển ra Lô CN-A12", "is_red": False, "left": 18, "top": 25, "marker": "A"},
        {"code": "Điểm tiếp dầu lưu động (08:30)", "sub": "Xe téc XN-DF-011 cấp 160L dầu tại bờ lô (20p)", "is_amber": True, "left": 38, "top": 45, "marker": "D1"},
        {"code": "Vùng cày ải ziczac (09:00 - 13:30)", "sub": "Cày lật đất sâu 35cm Lô CN-A12 (24 ha hoàn thành)", "is_red": False, "left": 55, "top": 60, "marker": "Lô"},
        {"code": "Điểm kết thúc ca 1 (14:00)", "sub": "Bàn giao máy cho phụ lái ca chiều", "is_red": False, "left": 82, "top": 40, "marker": "B"}
    ], "Lộ trình máy kéo XC-JD-024 ngày 23/08/2026 · Hoàn thành 100% diện tích giao")
)

PAGES_DATA["pages/B-giam-sat-gps/vung-giam-sat-geofence.html"] = (
    make_head("GIÁM SÁT GPS TRỰC TUYẾN", "Quản lý Vùng giám sát (Geofence)", "Thiết lập các ranh giới ảo theo lô/thửa, nông trường, xưởng packhouse và khu vực cấm ban đêm.", ["＋ Vẽ vùng Geofence mới", "⚡ Lưu quy tắc an toàn"]) +
    make_filters(["Tất cả 24 vùng Geofence", "KLH Koun Mom", "Trạng thái: Đang hiệu lực"]) +
    make_stats([("Tổng vùng thiết lập", "24 vùng", "22.500 ha bao phủ"), ("Vùng sản xuất nông trường", "14 vùng", "Tốc độ tối đa 30 km/h"), ("Vùng xưởng & Packhouse", "6 vùng", "Tốc độ giới hạn 15 km/h"), ("Vùng cấm an toàn (Hồ tưới)", "4 vùng", "Báo động SOS khi vào gần bờ kè")]) +
    make_table(
        ["MÃ VÙNG", "TÊN VÙNG GEOFENCE", "LOẠI VÙNG", "DIỆN TÍCH (HA)", "QUY TẮC CẢNH BÁO", "GIỚI HẠN TỐC ĐỘ", "XE TRONG VÙNG", "TRẠNG THÁI"],
        [
            ["<b>ZONE-NT1</b>", "Vùng Nông Trường Chuối 1<small>Phân khu Bắc</small>", "Sản xuất nông nghiệp", "<b>3.200 ha</b>", "Báo động khi xe cày ra khỏi ranh giới", "30 km/h", "<b>34 xe</b>", make_pill("Hiệu lực", "")],
            ["<b>ZONE-PH2</b>", "Nhà Máy Packhouse 2 & Trạm Cân", "Sơ chế & Trạm cân", "<b>12.5 ha</b>", "Cảnh báo quá tốc độ > 15 km/h", "15 km/h", "<b>12 xe</b>", make_pill("Hiệu lực", "")],
            ["<b>ZONE-XUONG</b>", "Xưởng BTSC Trung Tâm & Bãi Đỗ", "Kỹ thuật & Dịch vụ", "<b>8.0 ha</b>", "Theo dõi thời gian dừng sửa chữa", "10 km/h", "<b>15 xe</b>", make_pill("Hiệu lực", "")],
            ["<b>ZONE-KHO-DAU</b>", "Kho Xăng Dầu & Bồn Ngầm T1", "Kiểm soát an toàn PCCC", "<b>3.5 ha</b>", "Cấm xe lạ, cấm nổ máy dừng quá 10p", "5 km/h", "<b>2 xe téc</b>", make_pill("Kiểm soát gắt", "danger")],
            ["<b>ZONE-HO-TUOI3</b>", "Hồ Tưới Thủy Lợi 3 (Vùng cấm)", "Vùng an toàn bờ kè", "<b>45.0 ha</b>", "Báo động đỏ khi xe cách mép kè < 30m", "10 km/h", "<b>0 xe</b>", make_pill("Báo động SOS", "danger")]
        ],
        "Tìm mã vùng, tên khu vực Geofence...",
        "Hiển thị 1–5 trên 24 vùng Geofence"
    )
)

PAGES_DATA["pages/B-giam-sat-gps/canh-bao-toc-do-vung.html"] = (
    make_head("GIÁM SÁT GPS TRỰC TUYẾN", "Cảnh báo Tốc độ & Vi phạm Geofence", "Danh sách sự kiện vi phạm chạy quá tốc độ quy định nông trường và vượt ranh giới làm việc đẩy về Quản đốc.", ["↗ Xuất biên bản vi phạm", "✓ Xác nhận kiểm tra"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả mức độ vi phạm", "Trạng thái: Cần xác minh"]) +
    make_stats([("Vi phạm tốc độ hôm nay", "8 vụ", "Tốc độ cao nhất 38.5 km/h"), ("Rời khỏi vùng Geofence", "4 vụ", "3 vụ do tránh đường ngập"), ("Dừng nổ máy bật lạnh lâu", "2 vụ", "Quá 30 phút lãng phí"), ("Tỷ lệ phản hồi Quản đốc", "94.5%", "Phản hồi dưới 10 phút")]) +
    make_table(
        ["THỜI GIAN", "PHƯƠNG TIỆN & LÁI XE", "HÀNH VI VI PHẠM", "VẬN TỐC / VỊ TRÍ", "NGƯỠNG CHO PHÉP", "GIẢI TRÌNH TÀI XẾ", "XỬ LÝ CỦA QUẢN ĐỐC"],
        [
            ["08:35:00<small>7p trước</small>", "<b>XT-HN-079</b><small>Sok Phearith (Hino 8T)</small>", "<b style='color:var(--red)'>Chạy quá tốc độ quy định</b>", "<b>38.5 km/h</b><small>Trục chính NT2</small>", "Tối đa 30 km/h", "Vội giao chuyến chuối kịp giờ cắt", "<span class='module-pill danger'>Nhắc nhở qua bộ đàm, trừ 2đ KPI</span>"],
            ["07:45:12", "<b>XC-NH-031</b><small>Keo Sarath (New Holland)</small>", "<b style='color:var(--amber)'>Ra khỏi vùng Geofence</b>", "Lô CN-B06 (+1.2 km ngoài vùng)", "Trong ranh giới NT1", "Đi vòng tránh ổ gà ngập sình", "<span class='module-pill'>Hợp lệ (Đường đang sửa)</span>"],
            ["07:15:30", "<b>XT-HW-102</b><small>Trần Quốc Huy (Howo 4 chân)</small>", "<b style='color:var(--amber)'>Dừng nổ máy bật điều hòa 45p</b>", "Bãi xe Packhouse 2", "Tối đa 20 phút", "Chờ công nhân bốc sọt chuối", "<span class='module-pill pending'>Yêu cầu tắt máy khi chờ</span>"],
            ["06:50:00", "<b>XB-HD-062</b><small>Võ Văn Thành (Ben Hyundai)</small>", "<b style='color:var(--red)'>Quá tốc độ khu trạm cân</b>", "<b>24.0 km/h</b><small>Khu vực Packhouse 1</small>", "Tối đa 15 km/h", "Tăng ga leo dốc cầu cân", "<span class='module-pill danger'>Phạt nguội trừ điểm an toàn</span>"]
        ],
        "Tìm biển số xe, tên tài xế, loại vi phạm...",
        "Hiển thị các sự kiện vi phạm tốc độ và vùng Geofence hôm nay"
    )
)

PAGES_DATA["pages/B-giam-sat-gps/nhat-ky-mat-song-offline.html"] = (
    make_head("GIÁM SÁT GPS TRỰC TUYẾN", "Nhật ký Mất sóng & Đồng bộ Offline", "Theo dõi tình trạng mất kết nối GPS/GSM tại các vùng lõm nông trường, lưu bộ nhớ đệm và tự động đồng bộ.", ["↗ Xuất báo cáo kết nối", "🔄 Đồng bộ dữ liệu"]) +
    make_filters(["Hôm nay, 23/08/2026", "Nhà mạng: Metfone / Viettel", "Trạng thái: Đang offline (6 xe)"]) +
    make_stats([("Thiết bị Online tốt", "122 xe", "95.3% kết nối liên tục"), ("Mất kết nối (>2 giờ)", "6 xe", "Khu vực thung lũng Lô C"), ("Bản tin lưu đệm offline", "14.280 gói", "Tự động gửi khi có 4G"), ("Đề xuất trạm BTS Metfone", "2 vị trí", "Phủ sóng vùng lõm")]) +
    make_table(
        ["MÃ PHƯƠNG TIỆN", "CHỦNG LOẠI XE", "LÁI XE ĐIỀU KHIỂN", "THỜI ĐIỂM MẤT SÓNG", "VỊ TRÍ CUỐI CÙNG", "THỜI GIAN OFFLINE", "GÓI TIN ĐỆM", "HÀNH ĐỘNG KỸ THUẬT"],
        [
            ["<b>MU-KM-015</b>", "Máy ủi Komatsu D31P", "Keo Sarath", "06:15:02", "Lô khai hoang MR-01 (Khe suối)", "<b>2h 27p</b>", "450 bản tin", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Cử thợ kiểm tra SIM</button>"],
            ["<b>MD-CT-028</b>", "Máy đào CAT 320D", "Võ Văn Thành", "06:40:15", "Kênh thoát lũ Lô C02", "<b>2h 02p</b>", "380 bản tin", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Đang kiểm tra ăng-ten</button>"],
            ["<b>XC-KB-042</b>", "Máy kéo Kubota M7040", "Đỗ Thanh Hải", "07:10:00", "Vườn ươm giống NG-01", "<b>1h 32p</b>", "220 bản tin", "<span class='module-pill pending'>Đang chờ sóng</span>"],
            ["<b>XT-HN-055</b>", "Xe tải Hino 5T", "Sok Phearith", "07:35:10", "Trục ranh giới Campuchia", "<b>1h 07p</b>", "140 bản tin", "<span class='module-pill pending'>Đang chờ sóng</span>"]
        ],
        "Tìm mã xe, tài xế, vị trí mất sóng...",
        "Hiển thị 4 xe mất kết nối trên 1 giờ"
    )
)

print("Generated Module A and B data.")
