# -*- coding: utf-8 -*-
"""
Master Builder for THACO AGRI Fleet Management - 11 Clean Modules (A -> K)
Based directly on BRD_QuanLyXeCoGioi_KLH.docx
"""

import os
import shutil
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

from mockup_helpers import (
    make_pill, make_stats, make_filters, make_head, 
    make_table, make_kanban, make_calendar, make_map, 
    make_analytics, make_timeline, make_settings
)

# 11 Clean Modules Definition (A -> K)
MODULES = [
    ('▣', 'Dashboard', 'A-dashboard', [
        ('Dashboard vận hành', 'dashboard-van-hanh.html', '')
    ]),
    ('⌖', 'Giám sát GPS trực tuyến', 'B-giam-sat-gps', [
        ('Bản đồ GPS realtime', 'giam-sat-realtime.html', ''),
        ('Playback hành trình', 'playback-hanh-trinh.html', ''),
        ('Vùng giám sát (Geofence)', 'vung-giam-sat-geofence.html', ''),
        ('Cảnh báo tốc độ & Vùng', 'canh-bao-toc-do-vung.html', ''),
        ('Nhật ký mất sóng offline', 'nhat-ky-mat-song-offline.html', '')
    ]),
    ('▰', 'Quản lý đội xe', 'C-doi-xe', [
        ('Hồ sơ xe', 'ho-so-xe.html', ''),
        ('Phân xe theo đơn vị', 'phan-xe-don-vi.html', ''),
        ('Thiết bị GPS & Cảm biến', 'thiet-bi-gps-cam-bien.html', ''),
        ('Lịch sử biến động xe', 'lich-su-thay-doi-xe.html', '')
    ]),
    ('▦', 'Lệnh điều xe & Vận hành', 'D-lenh-dieu-xe', [
        ('Kế hoạch sản xuất', 'ke-hoach-san-xuat.html', ''),
        ('Lệnh điều xe', 'lenh-dieu-xe.html', ''),
        ('Lệnh vận chuyển nội bộ', 'lenh-van-chuyen.html', ''),
        ('Xác nhận khối lượng & Cân', 'xac-nhan-khoi-luong-phieu-can.html', '')
    ]),
    ('⚒', 'Xưởng BTSC', 'E-xuong-btsc', [
        ('Kế hoạch bảo trì (250h)', 'ke-hoach-bao-tri.html', ''),
        ('Tiếp nhận báo hỏng', 'yeu-cau-sua-chua.html', ''),
        ('Phiếu sửa chữa & Vật tư', 'phieu-sua-chua.html', ''),
        ('Theo dõi tiến độ xưởng', 'theo-doi-sua-chua.html', ''),
        ('Đăng kiểm & Bảo hiểm', 'dang-kiem-bao-hiem.html', '')
    ]),
    ('▥', 'Báo cáo hợp nhất', 'F-bao-cao', [
        ('Báo cáo năng suất xe', 'bao-cao-van-hanh.html', ''),
        ('Hành trình & Vi phạm', 'bao-cao-hanh-trinh-vi-pham.html', ''),
        ('Báo cáo KPI lái xe', 'bao-cao-lai-xe-kpi.html', ''),
        ('Báo cáo tiêu hao nhiên liệu', 'bao-cao-nhien-lieu.html', ''),
        ('Báo cáo chi phí BTSC', 'bao-cao-chi-phi-btsc.html', ''),
        ('So sánh giữa các KLH', 'bao-cao-so-sanh-klh.html', '')
    ]),
    ('⚙', 'Phân quyền hệ thống', 'G-phan-quyen', [
        ('Người dùng & Tài khoản', 'nguoi-dung.html', ''),
        ('Vai trò & Ma trận quyền', 'vai-tro-phan-quyen.html', ''),
        ('Phân quyền theo đơn vị', 'phan-quyen-don-vi.html', ''),
        ('Nhật ký hệ thống (Audit)', 'nhat-ky-he-thong.html', '')
    ]),
    ('▤', 'Danh mục hệ thống', 'H-danh-muc', [
        ('Đơn vị / KLH / Đội xe', 'don-vi-klh-doi-xe.html', ''),
        ('9 Chủng loại xe chuẩn', 'loai-xe-9-chung-loai.html', ''),
        ('Loại công việc & Lệnh', 'loai-cong-viec-loai-lenh.html', ''),
        ('Lô thửa & Tuyến đường', 'lo-thua-tuyen-duong.html', ''),
        ('Vật tư & Phụ tùng BTSC', 'vat-tu-phu-tung.html', ''),
        ('Định mức kỹ thuật', 'dinh-muc-ky-thuat.html', '')
    ]),
    ('♙', 'Quản lý lái xe', 'I-lai-xe', [
        ('Hồ sơ lái xe & Thợ máy', 'ho-so-lai-xe.html', ''),
        ('Phân công lái xe theo ca', 'phan-cong-lai-xe.html', ''),
        ('Quản lý GPLX & Hết hạn', 'quan-ly-gplx.html', ''),
        ('Lịch sử lái xe & Vi phạm', 'lich-su-vi-pham.html', ''),
        ('Bảng xếp hạng thi đua KPI', 'bang-xep-hang-kpi.html', '')
    ]),
    ('⛽', 'Quản lý nhiên liệu', 'J-nhien-lieu', [
        ('Phiếu cấp nhiên liệu', 'phieu-cap-nhien-lieu.html', ''),
        ('Định mức tiêu hao khoán', 'dinh-muc-nhien-lieu.html', ''),
        ('Đối chiếu GPS vs Định mức', 'doi-chieu-tieu-hao.html', ''),
        ('Tồn kho bồn chứa xăng dầu', 'ton-kho-bon-chua.html', ''),
        ('Cảnh báo bất thường sụt dầu', 'canh-bao-bat-thuong-dau.html', '')
    ]),
    ('🔔', 'Cảnh báo & Thông báo', 'K-canh-bao', [
        ('Cảnh báo chưa xử lý (SOS)', 'canh-bao-chua-xu-ly.html', '18'),
        ('Lịch sử cảnh báo', 'lich-su-canh-bao.html', ''),
        ('Cấu hình ngưỡng cảnh báo', 'cau-hinh-nguong-canh-bao.html', ''),
        ('Thống kê tần suất vi phạm', 'thong-ke-canh-bao.html', '')
    ], '18')
]

PAGES_DATA = {}

# Import Module A & B data from generator_data_ab.py
import generate_data_ab
PAGES_DATA.update(generate_data_ab.PAGES_DATA)

# ==========================================
# MODULE C: QUẢN LÝ ĐỘI XE
# ==========================================
PAGES_DATA["pages/C-doi-xe/ho-so-xe.html"] = (
    make_head("QUẢN LÝ ĐỘI XE", "Hồ sơ xe", "Quản lý 128 xe theo đúng 9 chủng loại thực tế: Biển số, số VIN, năm SX, tải trọng, ODO/giờ máy và định mức nhiên liệu.", ["↗ Xuất Excel", "＋ Thêm xe mới"]) +
    make_filters(["Tất cả đơn vị (128 xe)", "Khớp 9 chủng loại thực tế", "Trạng thái: Hoạt động"]) +
    make_stats([("Tổng phương tiện", "128 xe", "+4 xe mới tuần này"), ("Đang hoạt động trên đồng", "86 xe", "Tỷ lệ 67.2%"), ("Đang bảo dưỡng / sửa chữa", "15 xe", "11 định kỳ · 4 xe hỏng"), ("Mất tín hiệu GPS", "6 xe", "Đang cử thợ kiểm tra")]) +
    make_table(
        ["MÃ PHƯƠNG TIỆN", "CHỦNG LOẠI (9 LOẠI CHUẨN)", "ĐƠN VỊ QUẢN LÝ", "TÀI XẾ PHỤ TRÁCH (TỪ I)", "ODO / GIỜ MÁY", "ĐỊNH MỨC DẦU (TỪ J)", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b><small>VIN: JD6140B-9982</small>", "1. Máy kéo John Deere 140HP<small>Nông nghiệp cày bừa · 2024</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Nguyễn Văn Minh<small>GPLX Hạng FC / Máy kéo</small>", "<b>2.450 giờ</b><small>+7.5h hôm nay</small>", "<b>18.5 L/ha</b><small>Dầu 78% (140L)</small>", make_pill("Đang hoạt động", "")],
            ["<b>XT-HW-102</b><small>Biển: 51C-892.34</small>", "2. Xe tải Howo 4 chân 371HP<small>Thùng mui bạt 15 tấn · 2023</small>", "Đội Vận tải Nặng<small>KLH Koun Mom</small>", "Trần Quốc Huy<small>GPLX Hạng C</small>", "<b>148.200 km</b><small>+124 km hôm nay</small>", "<b>30.0 L/100km</b><small>Dầu 65% (195L)</small>", make_pill("Đang hoạt động", "")],
            ["<b>XC-KB-053</b><small>VIN: KBM7040-4412</small>", "3. Máy kéo Kubota M7040<small>Lên luống & xới đất · 2023</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Lê Hoàng Nam<small>CC Vận hành Cơ giới</small>", "<b>3.120 giờ</b><small>+6.0h hôm nay</small>", "<b>12.0 L/ha</b><small>Dầu 24% (20L)</small>", make_pill("Đang dừng chờ dầu", "pending")],
            ["<b>XT-HN-079</b><small>Biển: 77C-124.58</small>", "4. Xe tải Hino 500 (8 tấn)<small>Chở chuối & phân bón · 2022</small>", "Đội Vận tải NT2<small>XN Chuối 2</small>", "Sok Phearith<small>GPLX Hạng C Campuchia</small>", "<b>92.400 km</b><small>Cảnh báo tốc độ 38km/h</small>", "<b>22.0 L/100km</b><small>Dầu 82% (110L)</small>", make_pill("Cảnh báo tốc độ", "danger")],
            ["<b>MG-KB-018</b><small>VIN: DC70G-3319</small>", "5. Máy gặt đập Kubota DC-70G<small>Thu hoạch bắp sinh khối · 2024</small>", "Đội Cơ giới 2 (NT2)<small>XN Cây ăn trái</small>", "Phạm Quốc An<small>CC Vận hành gặt</small>", "<b>1.150 giờ</b><small>+5.2h hôm nay</small>", "<b>15.0 L/ha</b><small>Dầu 90% (80L)</small>", make_pill("Đang hoạt động", "")],
            ["<b>XB-HD-062</b><small>Biển: 60C-556.78</small>", "6. Xe ben Hyundai HD270 15T<small>Chở đất đá & phân rời · 2021</small>", "Đội Thi công Thủy lợi<small>KLH Koun Mom</small>", "Keo Sarath<small>CC Lái máy thi công</small>", "<b>210.500 km</b><small>Tại Xưởng BTSC</small>", "<b>35.0 L/100km</b><small>Dầu 15% (35L)</small>", make_pill("Đang bảo dưỡng", "pending")]
        ],
        "Tìm mã xe, biển số, chủng loại, tài xế...",
        "Hiển thị 1–6 trên 128 phương tiện cơ giới"
    )
)

PAGES_DATA["pages/C-doi-xe/ho-so-thiet-bi.html"] = (
    make_head("QUẢN LÝ ĐỘI XE", "Hồ sơ thiết bị & Nông cụ cơ giới", "Quản lý 215 bộ máy móc thiết bị (MMTB), dàn cày, dàn bừa, rơ-moóc, đầu cắt gặt và thiết bị chuyên dùng.", ["↗ Xuất danh mục MMTB", "＋ Thêm thiết bị mới"]) +
    make_filters(["Tất cả nông cụ & MMTB (215 bộ)", "Phân loại: Dàn cày / Dàn bừa / Rơ-moóc / Đầu gặt", "Trạng thái: Đang lắp trên xe"]) +
    make_stats([("Tổng MMTB & Nông cụ", "215 bộ", "+12 bộ nhập mới vụ này"), ("Đang gắn trên xe hoạt động", "142 bộ", "Gắn kèm máy kéo & gặt"), ("Dự phòng tại bãi đội", "58 bộ", "Sẵn sàng thay thế"), ("Đang bảo dưỡng / Thay dao", "15 bộ", "Tại Xưởng BTSC")]) +
    make_table(
        ["MÃ THIẾT BỊ / NÔNG CỤ", "TÊN THIẾT BỊ & MODEL", "CHỦNG LOẠI MMTB", "XE ĐANG GẮN KÈM", "ĐƠN VỊ QUẢN LÝ", "NGÀY ĐƯA VÀO SD", "TÌNH TRẠNG KỸ THUẬT", "TRẠNG THÁI"],
        [
            ["<b>TB-DC-4C-01</b><small>SN: JD-PLOW-4X35</small>", "Dàn cày 4 chảo lật đất sâu 35cm<small>Hãng John Deere · Bản rộng 1.4m</small>", "Dàn cày nông nghiệp", "<b>XC-JD-024</b><small>John Deere 140HP</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "01/03/2024", "Chảo cày đạt 92% độ bén", make_pill("Đang gắn trên xe", "")],
            ["<b>TB-DB-24D-05</b><small>SN: KB-DISC-24D</small>", "Dàn bừa đĩa 24 chảo xới phẳng<small>Hãng Kubota · Đường kính đĩa 560mm</small>", "Dàn bừa nông nghiệp", "<b>XC-KB-053</b><small>Kubota M7040</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "15/06/2023", "Bạc đạn trục bừa tốt", make_pill("Đang gắn trên xe", "")],
            ["<b>TB-RM-5T-12</b><small>SN: THACO-TR-5T</small>", "Rơ-moóc kéo chở buồng chuối 5 tấn<small>Thùng có thanh treo chuyên dụng</small>", "Rơ-moóc chuyên dùng", "<b>XC-KB-058</b><small>Kubota M7040</small>", "Đội Cơ giới 2 (NT2)<small>XN Chuối 2</small>", "10/01/2024", "Hệ thống phanh dầu tốt", make_pill("Đang gắn trên xe", "")],
            ["<b>TB-DC-GAT-02</b><small>SN: DC70-HEAD-02</small>", "Đầu gặt cắt bắp sinh khối DC-70G<small>Bộ lưỡi cắt đôi + guồng gom</small>", "Đầu cắt thu hoạch", "<b>MG-KB-018</b><small>Kubota DC-70G</small>", "Đội Cơ giới 2 (NT2)<small>XN Cây ăn trái</small>", "20/08/2024", "Mới thay bộ dao đôi", make_pill("Đang gắn trên xe", "")],
            ["<b>TB-DP-18M-03</b><small>SN: HINO-SPRAY-18M</small>", "Dàn cần phun thuốc BVTV 18 mét<small>36 béc phun áp lực chống nhỏ giọt</small>", "Dàn phun chuyên dùng", "<b>XB-HN-045</b><small>Hino 15m3</small>", "Xí nghiệp Cây ăn trái", "12/02/2024", "Áp lực béc phun chuẩn", make_pill("Đang gắn trên xe", "")],
            ["<b>TB-GAU-09-08</b><small>SN: CAT-BUCKET-09</small>", "Gầu múc đào đất 0.9m3 răng hợp kim<small>Thép chịu mài mòn Hardox 450</small>", "Nông cụ thi công", "<b>MD-CT-028</b><small>CAT 320D</small>", "Đội Thi công Thủy lợi", "20/08/2022", "Răng gầu mòn 15%", make_pill("Đang gắn trên xe", "")],
            ["<b>TB-LL-DOI-04</b><small>SN: BEDDER-DB-04</small>", "Dàn lên luống đôi trồng chuối<small>Tạo rãnh sâu 40cm, luống rộng 1.2m</small>", "Dàn lên luống", "— <small>(Tại bãi Đội 1)</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "05/04/2024", "Sẵn sàng sử dụng", make_pill("Dự phòng tại bãi", "pending")]
        ],
        "Tìm mã thiết bị, tên MMTB, xe gắn kèm...",
        "Hiển thị 1–7 trên 215 thiết bị và nông cụ cơ giới"
    )
)

PAGES_DATA["pages/C-doi-xe/phan-xe-don-vi.html"] = (
    make_head("QUẢN LÝ ĐỘI XE", "Phân xe theo Đơn vị & Gán tài xế", "Phân bổ xe về các Xí nghiệp Nông trường và gán lái xe phụ trách chính cho từng phương tiện.", ["↗ Xuất quyết định phân xe", "＋ Bàn giao xe mới"]) +
    make_filters(["Tất cả xí nghiệp", "Đợt phân bổ: Quý 3/2026", "Đã ký biên bản"]) +
    make_stats([("Xe phân về XN Chuối 1", "46 xe", "32 máy kéo · 14 xe tải"), ("Xe phân về XN Chuối 2", "38 xe", "26 máy kéo · 12 xe tải"), ("Xe phân về XN Cây ăn trái", "22 xe", "14 máy kéo · 8 xe téc"), ("Xe dự phòng & Cứu hộ KLH", "22 xe", "Xưởng BTSC Trung tâm")]) +
    make_table(
        ["MÃ XE / BIỂN SỐ", "CHỦNG LOẠI XE", "ĐƠN VỊ TIẾP NHẬN", "LÁI XE CHÍNH ĐƯỢC GÁN", "NGÀY BÀN GIAO", "MỤC ĐÍCH SỬ DỤNG", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b>", "Máy kéo John Deere 140HP", "Xí nghiệp Chuối 1 (Đội 1)", "<b>Nguyễn Văn Minh</b><small>NV-0824</small>", "01/03/2024", "Cày lật sâu 35cm đất trồng chuối", make_pill("Đang sử dụng", "")],
            ["<b>XT-HW-102</b>", "Xe tải Howo 4 chân 15T", "Đội Vận Tải Nặng KLH", "<b>Trần Quốc Huy</b><small>NV-0831</small>", "15/06/2023", "Vận chuyển chuối về Packhouse 2", make_pill("Đang sử dụng", "")],
            ["<b>XB-HN-045</b>", "Xe téc Hino phun thuốc 15m3", "Xí nghiệp Cây ăn trái", "<b>Phạm Quốc An</b><small>NV-0856</small>", "10/01/2024", "Phun vi sinh cải tạo đất & tưới sầu riêng", make_pill("Đang sử dụng", "")],
            ["<b>MD-CT-028</b>", "Máy đào bánh xích CAT 320D", "Đội Thi Công Thủy Lợi", "<b>Võ Văn Thành</b><small>NV-0848</small>", "20/08/2022", "Đào mương tiêu thoát lũ chống ngập", make_pill("Đang sử dụng", "")],
            ["<b>XC-KB-058</b>", "Máy kéo Kubota M7040", "Xí nghiệp Chuối 2 (Đội 2)", "<b>Sok Phearith</b><small>NV-KH-012</small>", "18/08/2026", "Lên luống và kéo rơ-moóc buồng chuối", make_pill("Mới bàn giao", "")]
        ],
        "Tìm mã xe, đơn vị tiếp nhận, tên lái xe...",
        "Hiển thị 1–5 trên 128 bản ghi phân bổ"
    )
)

PAGES_DATA["pages/C-doi-xe/thiet-bi-gps-cam-bien.html"] = (
    make_head("QUẢN LÝ ĐỘI XE", "Thiết bị GPS & Cảm biến que đo", "Quản lý thiết bị định vị GPS 4G TMS-T90, cảm biến nhiên liệu que đo siêu âm DUT-E và cảm biến PTO.", ["↗ Xuất danh sách SIM", "＋ Gán thiết bị mới"]) +
    make_filters(["Nhà mạng: Metfone / Viettel", "Tất cả 128 thiết bị", "Trạng thái: Online (122 xe)"]) +
    make_stats([("GPS đang Online", "122 thiết bị", "95.3% kết nối tốt"), ("Mất kết nối (>2h)", "6 thiết bị", "Khu vực sóng yếu Lô C"), ("Cảm biến que đo dầu siêu âm", "118 bộ", "Sai số < 1%"), ("Cảm biến vòng tua PTO", "62 bộ", "Đo giờ máy nông cụ thực")]) +
    make_table(
        ["MÃ THIẾT BỊ / IMEI", "XE GẮN KÈM", "LOẠI THIẾT BỊ & CẢM BIẾN", "SỐ SIM / NHÀ MẠNG", "TÍN HIỆU GPS", "CẬP NHẬT CUỐI", "TRẠNG THÁI"],
        [
            ["<b>IMEI: 864291048821901</b><small>Model: TMS-T90 4G</small>", "<b>XC-JD-024</b><small>John Deere 6140B</small>", "GPS 4G + Cảm biến dầu DUT-E + PTO Sensor", "088.992.3312<small>Metfone Campuchia</small>", "<b style='color:var(--green2)'>● Rất tốt (18 Vệ tinh)</b>", "23/08/2026 · 08:42:15", make_pill("Online", "")],
            ["<b>IMEI: 864291048821902</b><small>Model: TMS-T90 4G</small>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "GPS 4G + Cảm biến mức dầu 2 bình + Camera", "088.992.3314<small>Metfone Campuchia</small>", "<b style='color:var(--green2)'>● Tốt (16 Vệ tinh)</b>", "23/08/2026 · 08:42:10", make_pill("Online", "")],
            ["<b>IMEI: 864291048821903</b><small>Model: TMS-T90 4G</small>", "<b>XC-KB-053</b><small>Kubota M7040</small>", "GPS 4G + Cảm biến dầu", "097.334.5511<small>Viettel Roaming</small>", "<b style='color:var(--green2)'>● Tốt (14 Vệ tinh)</b>", "23/08/2026 · 08:41:50", make_pill("Online", "")],
            ["<b>IMEI: 864291048821905</b><small>Model: TMS-T90 4G</small>", "<b>MU-KM-015</b><small>Komatsu D31P</small>", "GPS 4G chống nước IP67", "088.992.3388<small>Metfone Campuchia</small>", "<b style='color:var(--red)'>✕ Mất tín hiệu (2h)</b>", "23/08/2026 · 06:15:02", make_pill("Mất kết nối", "danger")]
        ],
        "Tìm số IMEI, mã xe, số SIM...",
        "Hiển thị 1–4 trên 128 thiết bị GPS & cảm biến"
    )
)

PAGES_DATA["pages/C-doi-xe/lich-su-thay-doi-xe.html"] = (
    make_head("QUẢN LÝ ĐỘI XE", "Lịch sử biến động & Thay đổi xe", "Nhật ký truy vết toàn bộ quá trình bàn giao, chuyển xí nghiệp, thay đổi tài xế phụ trách và hoán cải nông cụ.", ["↗ Xuất sổ lý lịch", "🔍 Tra cứu số VIN"]) +
    make_filters(["Chọn xe: XC-JD-024 (John Deere)", "Toàn bộ thời gian (2024 - 2026)", "Đã xác thực dữ liệu"]) +
    make_stats([("Tổng giờ máy tích lũy", "2.450 giờ", "Bảo dưỡng 5 lần"), ("Số lần chuyển giao đơn vị", "1 lần", "Đội 2 ➔ Đội 1"), ("Đổi tài xế phụ trách", "1 lần", "Lê Hoàng Nam ➔ Nguyễn Văn Minh"), ("Tình trạng hồ sơ", "100% hợp lệ", "Đủ kiểm định & bảo hiểm")]) +
    make_timeline([
        ("Bảo dưỡng định kỳ Cấp 2 (2.000 giờ máy)", "Thay toàn bộ lọc nhớt P550388, 18L dầu động cơ 15W-40, lọc nhiên liệu sơ cấp và xúc rửa két nước làm mát.", "15/07/2026 · Xưởng BTSC Trung tâm · KTV Đỗ Thanh Hải", "Xem biên bản BTSC"),
        ("Bàn giao tài xế chính mới", "Phân công anh Nguyễn Văn Minh tiếp nhận quản lý và vận hành chính máy kéo XC-JD-024 thay cho anh Lê Hoàng Nam chuyển công tác.", "01/04/2026 · Đội Xe Cơ giới 1 · Quản đốc ký duyệt", "Xem biên bản giao xe"),
        ("Lắp đặt cảm biến que đo dầu siêu âm DUT-E", "Hiệu chuẩn que đo dầu siêu âm trên bình 180 lít đảm bảo độ chính xác 99.5%.", "05/06/2025 · Phòng Kỹ thuật Số THACO AGRI", "Xem chứng chỉ"),
        ("Tiếp nhận xe mới từ THACO Chu Lai", "Bàn giao xe máy kéo mới 100% nguyên chiếc từ nhà máy THACO Chu Lai chuyển sang KLH Koun Mom.", "01/03/2024 · Ban Giám đốc KLH Koun Mom", "Xem hồ sơ gốc")
    ])
)

# ==========================================
# MODULE D: LỆNH ĐIỀU XE & VẬN HÀNH
# ==========================================
PAGES_DATA["pages/D-lenh-dieu-xe/ke-hoach-san-xuat.html"] = (
    make_head("LỆNH ĐIỀU XE & VẬN HÀNH", "Kế hoạch sản xuất tuần / ngày", "Lập và theo dõi kế hoạch huy động xe cơ giới theo chuỗi cố định: Làm đất → Trồng mới → Thu hoạch.", ["↗ Xuất kế hoạch", "＋ Lập kế hoạch mới"]) +
    make_filters(["Tuần 34 (17/08 - 23/08/2026)", "Xí nghiệp Chuối 1 & 2", "Đã duyệt ban giám đốc"]) +
    make_stats([("Tổng diện tích giao (ha)", "185.0 ha", "Đạt 92.5% kế hoạch"), ("Định mức ca máy", "240 giờ máy", "Trung bình 8h/xe/ngày"), ("Máy móc huy động", "32 đầu máy", "Máy kéo, máy gặt, xe ben"), ("Tiêu hao dầu dự kiến", "3.420 lít", "18.5 L/ha chuẩn khoán")]) +
    make_calendar("Kế hoạch sản xuất Tuần 34 · Chuỗi Làm đất → Trồng mới → Thu hoạch", [
        ("Thứ hai 17/08", [
            {"title": "1. Làm đất: Cày ải sâu 35cm (Lô A12)", "sub": "Kế hoạch 12 ha · 2 máy John Deere 140HP", "time": "Mục tiêu: 100% diện tích"},
            {"title": "Phun vi sinh cải tạo đất Lô A08", "sub": "Lô CN-A08 · Xe téc XB-HN-045", "time": "Mục tiêu: 15 ha"}
        ]),
        ("Thứ ba 18/08", [
            {"title": "1. Làm đất: Bừa phẳng & Lên luống đôi", "sub": "Lô CN-B06 · 3 máy Kubota M7040", "time": "Mục tiêu: 10 ha luống đôi"},
            {"title": "2. Trồng mới: Vận chuyển cây chuối giống", "sub": "3 xe tải Hino · 12.000 cây giống", "time": "Giao về Nông trường 1"}
        ]),
        ("Thứ tư 19/08", [
            {"title": "1. Làm đất: Cày rạch hàng bón lót", "sub": "Lô CN-B06 · Máy kéo New Holland", "time": "Mục tiêu: 8.5 ha"},
            {"title": "Cắt cỏ trục đường lô chống cháy", "sub": "2 máy kéo gắn dàn cắt cỏ", "time": "Trục chính NT1"}
        ]),
        ("Thứ năm 20/08", [
            {"title": "Đào mương thoát nước mưa Lô C02", "sub": "Máy đào bánh xích CAT 320D", "time": "Khối lượng: 450m mương"},
            {"title": "Bảo dưỡng máy móc giữa tuần", "sub": "Tổ lưu động Xưởng BTSC", "time": "Kiểm tra 8 máy cày"}
        ]),
        ("Thứ sáu 21/08", [
            {"title": "1. Làm đất: Cày lật đất chuẩn bị đợt 2", "sub": "Lô CAT-D09 · 2 máy John Deere", "time": "Mục tiêu: 14 ha"},
            {"title": "Phun dinh dưỡng qua lá chuối", "sub": "Lô CN-A01 đến A04 · 2 xe bồn", "time": "Mục tiêu: 22 ha chuối"}
        ]),
        ("Thứ bảy 22/08", [
            {"title": "3. Thu hoạch: Cắt bắp sinh khối", "sub": "Lô SK-08 · Máy gặt Kubota DC-70G", "time": "Mục tiêu: 120 tấn bắp"},
            {"title": "Chở bắp về hố ủ chua Trại Bò", "sub": "4 xe ben Hyundai HD270", "time": "Quay vòng 8 chuyến"}
        ]),
        ("Chủ nhật 23/08", [
            {"title": "Tổng vệ sinh máy nông cụ & xịt rửa", "sub": "Tất cả tài xế Đội 1 & Đội 2", "time": "Bãi rửa xe trung tâm"},
            {"title": "Giao ban nghiệm thu tuần", "sub": "Ban Quản đốc Xí nghiệp Cơ giới", "time": "16:00 tại Hội trường NT1"}
        ])
    ])
)

PAGES_DATA["pages/D-lenh-dieu-xe/lenh-dieu-xe.html"] = (
    make_head("LỆNH ĐIỀU XE & VẬN HÀNH", "Quản lý Lệnh điều xe số hóa", "Quy trình tạo → duyệt → giao → xác nhận; tự động kiểm tra GPLX phù hợp và cấp dầu theo lệnh.", ["↗ Xuất bảng kê lệnh", "＋ Lập lệnh điều xe"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả loại lệnh", "Đã đồng bộ điều độ"]) +
    make_stats([("Tổng lệnh trong ngày", "42 lệnh", "+6 so với kế hoạch"), ("Đang thực hiện trên đồng", "26 lệnh", "Tiến độ đạt 68%"), ("Chờ xuất phát", "8 lệnh", "Đã kiểm tra GPLX hợp lệ"), ("Lệnh quá giờ / Cảnh báo", "2 lệnh", "Đẩy thông báo Quản đốc")]) +
    make_kanban([
        ("1. Chờ duyệt & Phân công", "8", [
            {"id": "LĐX-0823-031", "title": "Điều xe bồn Hino chở nước tưới", "subtitle": "XB-HN-045 · Tài xế: Đỗ Thanh Hải (GPLX Hạng C ✓)", "tag": "Chờ xuất bến", "pill_type": "pending", "time": "08:30"},
            {"id": "LĐX-0823-032", "title": "Điều máy ủi san gạt đường lô NT2", "subtitle": "MU-KM-015 · Tài xế: Keo Sarath (CC Máy ủi ✓)", "tag": "Đã duyệt", "pill_type": "", "time": "09:00"}
        ]),
        ("2. Đã giao / Đang di chuyển", "12", [
            {"id": "LĐX-0823-024", "title": "Điều máy kéo cày ải đất trồng chuối", "subtitle": "XC-JD-024 · Nguyễn Văn Minh (GPLX FC ✓) · Cấp 160L dầu", "tag": "Đang chạy", "pill_type": "", "time": "06:45"},
            {"id": "LĐX-0823-025", "title": "Điều xe tải Howo chở buồng chuối", "subtitle": "XT-HW-102 · Trần Quốc Huy (GPLX C ✓) · Cấp 220L dầu", "tag": "Đến bãi", "pill_type": "", "time": "07:15"}
        ]),
        ("3. Đang làm việc tại Lô / Thửa", "14", [
            {"id": "LĐX-0823-018", "title": "Máy gặt Kubota thu hoạch ngô sinh khối", "subtitle": "MG-KB-018 · Lê Hoàng Nam · Lô SK-08", "tag": "Đạt 72%", "pill_type": "", "time": "07:30"},
            {"id": "LĐX-0823-019", "title": "Xe téc phun thuốc phòng trừ sâu bệnh", "subtitle": "XB-HN-088 · Phạm Quốc An · Lô CN-B06", "tag": "Đạt 55%", "pill_type": "", "time": "08:00"}
        ]),
        ("4. Hoàn tất & Nghiệm thu", "8", [
            {"id": "LĐX-0823-009", "title": "Cứu hộ kéo máy kéo hỏng về xưởng", "subtitle": "XT-CH-003 · Huỳnh Tấn Đạt · Xưởng BTSC", "tag": "Nghiệm thu", "pill_type": "", "time": "08:15"},
            {"id": "LĐX-0823-010", "title": "Vận chuyển phân hữu cơ bón lót", "subtitle": "XT-HN-079 · Võ Văn Thành · Lô A04", "tag": "Xong 100%", "pill_type": "", "time": "08:20"}
        ])
    ])
)

PAGES_DATA["pages/D-lenh-dieu-xe/lenh-van-chuyen.html"] = (
    make_head("LỆNH ĐIỀU XE & VẬN HÀNH", "Lệnh vận chuyển nội bộ luồng 3 chặng", "Điều phối luồng vận chuyển theo BRD: Xí nghiệp (phụ phẩm) → Xí nghiệp Bò → Trung tâm chế biến thức ăn.", ["↗ Xuất vận đơn", "＋ Lập lệnh vận chuyển"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tuyến: Nội bộ KLH", "GPS kiểm tra đúng tuyến"]) +
    make_stats([("Tổng khối lượng vận chuyển", "345.5 Tấn", "34 chuyến xe Howo & Hino"), ("Chuối buồng về Packhouse", "285.2 Tấn", "Đúng lộ trình 100%"), ("Phụ phẩm về Trại Bò", "60.3 Tấn", "Luồng 3 chặng hoàn tất"), ("Cảnh báo lệch tuyến", "0 xe", "Xe chạy đúng đường quy định")]) +
    make_table(
        ["MÃ VẬN ĐƠN", "LOẠI HÀNG HÓA", "XE & TÀI XẾ", "LUỒNG VẬN CHUYỂN (3 CHẶNG)", "KHỐI LƯỢNG (TẤN)", "CẤP DẦU LỆNH (L)", "TRẠNG THÁI"],
        [
            ["<b>LVC-0823-011</b>", "Chuối tươi xuất khẩu<small>320 sọt buồng</small>", "<b>XT-HW-102</b><small>Trần Quốc Huy (Howo 15T)</small>", "Lô CN-A12 ➔ Nhà máy Packhouse 2<small>Cự ly 8.4 km</small>", "<b>14.20 T</b>", "45 Lít", make_pill("Đang vận chuyển", "")],
            ["<b>LVC-0823-012</b>", "Phân hữu cơ bón lót<small>160 bao 50kg</small>", "<b>XT-HN-079</b><small>Võ Văn Thành (Hino 8T)</small>", "Kho Trung tâm ➔ Lô CN-B06<small>Cự ly 4.5 km</small>", "<b>8.00 T</b>", "25 Lít", make_pill("Đang bốc hàng", "pending")],
            ["<b>LVC-0823-013</b>", "Chuối dập phụ phẩm<small>Chế biến thức ăn bò</small>", "<b>XB-HD-062</b><small>Keo Sarath (Ben Hyundai)</small>", "Packhouse 1 ➔ XN Bò ➔ TT Chế biến<small>Luồng 3 chặng chuẩn BRD</small>", "<b>15.00 T</b>", "50 Lít", make_pill("Đã giao hàng", "")],
            ["<b>LVC-0823-014</b>", "Thân bắp tươi sinh khối<small>Thức ăn xanh ủ chua</small>", "<b>XT-HW-104</b><small>Lê Hoàng Nam (Howo 15T)</small>", "Lô SK-08 ➔ Trại Bò Thịt 1 ➔ Hố ủ<small>Luồng 3 chặng chuẩn BRD</small>", "<b>13.90 T</b>", "40 Lít", make_pill("Đang vận chuyển", "")]
        ],
        "Tìm mã vận đơn, loại hàng, lái xe...",
        "Hiển thị các chuyến vận chuyển nội bộ luồng 3 chặng"
    )
)

PAGES_DATA["pages/D-lenh-dieu-xe/xac-nhan-khoi-luong-phieu-can.html"] = (
    make_head("LỆNH ĐIỀU XE & VẬN HÀNH", "Xác nhận khối lượng GPS & Phiếu cân", "Nghiệm thu diện tích cày bừa đo vẽ qua GPS và phiếu cân điện tử tổng tải/trọng bì/trọng tịnh.", ["↗ Xuất biên bản nghiệm thu", "✓ Phê duyệt khối lượng"]) +
    make_filters(["Kỳ nghiệm thu: 17/08 - 23/08", "Trạm Cân 1 & 2", "Đã chốt số liệu"]) +
    make_stats([("Diện tích cày bừa nghiệm thu", "182.4 ha", "Sai lệch GPS < 1.2%"), ("Khối lượng cân qua trạm", "345.5 Tấn", "34 phiếu cân điện tử"), ("Tỷ lệ hao hụt vận chuyển", "0.22%", "Dưới chuẩn cho phép 0.5%"), ("Độ chính xác cảm biến cân", "99.98%", "Đã kiểm định đo lường")]) +
    make_table(
        ["SỐ PHIẾU CÂN / LỆNH", "XE & TÀI XẾ", "LOẠI HÀNG / CÔNG VIỆC", "TỔNG TẢI (T)", "TRỌNG BÌ (T)", "TRỌNG TỊNH (T) / DIỆN TÍCH (HA)", "ĐIỂM NHẬN ➔ ĐIỂM GIAO", "TRẠNG THÁI"],
        [
            ["<b>PC-0823-088</b><small>LVC-0823-011</small>", "<b>XT-HW-102</b><small>Trần Quốc Huy</small>", "Chuối buồng xuất khẩu (320 sọt)", "28.45 T", "14.25 T", "<b style='color:var(--green2)'>14.20 Tấn</b>", "Lô A12 ➔ Packhouse 2", make_pill("Đã xác nhận", "")],
            ["<b>PC-0823-089</b><small>LVC-0823-014</small>", "<b>XT-HW-104</b><small>Lê Hoàng Nam</small>", "Bắp sinh khối chăn nuôi", "28.10 T", "14.20 T", "<b style='color:var(--green2)'>13.90 Tấn</b>", "Lô SK-08 ➔ Trại Bò 1", make_pill("Đã xác nhận", "")],
            ["<b>LSX-0823-018</b><small>Đo GPS vệ tinh</small>", "<b>XC-JD-024</b><small>Nguyễn Văn Minh</small>", "Cày lật đất sâu 35cm Lô A12", "—", "—", "<b style='color:var(--green2)'>24.00 Ha (18.5 giờ máy)</b>", "Lô CN-A12 (XN Chuối 1)", make_pill("Đã nghiệm thu", "")],
            ["<b>LSX-0823-019</b><small>Đo GPS vệ tinh</small>", "<b>XC-KB-053</b><small>Lê Hoàng Nam</small>", "Bừa phẳng & lên luống đôi", "—", "—", "<b style='color:var(--green2)'>18.20 Ha (14.2 giờ máy)</b>", "Lô CN-B06 (XN Chuối 1)", make_pill("Đã nghiệm thu", "")]
        ],
        "Tìm số phiếu cân, mã lệnh, số xe...",
        "Hiển thị biên bản nghiệm thu diện tích GPS và phiếu cân điện tử"
    )
)

print("Generated Module C and D data.")
