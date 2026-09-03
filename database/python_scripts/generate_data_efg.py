# -*- coding: utf-8 -*-
"""
Generator for Module E (Xưởng BTSC), Module F (Báo cáo), Module G (Phân quyền)
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

from mockup_helpers import (
    make_pill, make_stats, make_filters, make_head, 
    make_table, make_kanban, make_calendar, make_map, 
    make_analytics, make_timeline, make_settings
)

PAGES_DATA = {}

# ==========================================
# MODULE E: XƯỞNG BTSC
# ==========================================
PAGES_DATA["pages/E-xuong-btsc/ke-hoach-bao-tri.html"] = (
    make_head("XƯỞNG BTSC", "Kế hoạch bảo dưỡng theo giờ máy & km", "Bảo dưỡng định kỳ 2 cấp (BDC1 hằng ngày, BDC2 theo giờ máy 50h, 250h, 500h...) theo QĐ 13/2023 THACO AGRI.", ["↗ Xuất kế hoạch", "＋ Lập lịch bảo dưỡng"]) +
    make_filters(["Kỳ bảo trì: Tháng 08/2026", "Cảnh báo mốc: Xanh / Vàng / Đỏ", "Đúng định mức"]) +
    make_stats([("Xe đến hạn bảo dưỡng tuần này", "12 xe", "8 máy kéo · 4 xe tải"), ("Đã hoàn tất bảo dưỡng", "8 xe", "Thời gian TB 4.5h/xe"), ("Cảnh báo Đỏ (Vượt >10% chu kỳ)", "1 xe", "Yêu cầu giải trình"), ("Vật tư dự phòng sẵn sàng", "96.5%", "Đầy đủ lọc nhớt, dầu")]) +
    make_table(
        ["MÃ XE", "CHỦNG LOẠI XE", "CẤP BẢO DƯỠNG", "GIỜ MÁY / KM HIỆN TẠI", "CHU KỲ ĐẾN HẠN", "HẠNG MỤC CẦN THAY THẾ", "KỸ THUẬT VIÊN", "CẢNH BÁO MÀU"],
        [
            ["<b>XC-JD-024</b>", "Máy kéo John Deere 140HP", "<b>BDC2 - Cấp 2 (2.500h)</b>", "<b>2.485 giờ</b><small>18.640 km</small>", "<b>2.500 giờ (Còn 15h)</b><small>20.000 km (Còn 1.360 km)</small>", "Nhớt động cơ 15W-40, Lọc nhớt P550388, Lọc dầu", "Đỗ Thanh Hải", "<span class='module-pill pending'>● VÀNG (Gần đến chu kỳ)</span>"],
            ["<b>XT-HW-102</b>", "Xe tải Howo 4 chân 15T", "<b>BDC2 - Cấp 3 (150.000km)</b>", "<b>149.800 km</b><small>4.993 giờ máy</small>", "<b>150.000 km (Còn 200km)</b><small>5.000 giờ (Còn 7h)</small>", "Nhớt cầu, nhớt hộp số, tán má phanh sau", "Huỳnh Tấn Đạt", "<span class='module-pill pending'>● VÀNG (Gần đến chu kỳ)</span>"],
            ["<b>XC-KB-053</b>", "Máy kéo Kubota M7040", "<b>BDC2 - Cấp 1 (250h)</b>", "<b>3.250 giờ</b><small>24.375 km</small>", "<b>3.250 giờ (Hôm nay)</b><small>25.000 km (Đến hạn)</small>", "Bơm mỡ trục các đăng, thay lọc gió sơ cấp", "Nguyễn Thành Long", "<span class='module-pill'>● XANH (Đang thực hiện)</span>"],
            ["<b>XB-HD-062</b>", "Xe ben Hyundai HD270", "<b>Đại tu gầm & Ben</b>", "<b>210.500 km</b><small>7.016 giờ máy</small>", "<b>210.000 km (Vượt 500km)</b><small>7.000 giờ (Vượt 16h)</small>", "Thay bạc ắc nhíp, phục hồi ty ben thủy lực", "Tổ Gầm Máy", "<span class='module-pill danger'>● ĐỎ (Quá hạn 10% - Cần giải trình)</span>"],
            ["<b>MG-KB-018</b>", "Máy gặt đập Kubota DC-70G", "<b>BDC2 - Cấp 1 (250h)</b>", "<b>1.150 giờ</b><small>8.625 km</small>", "<b>1.200 giờ (Còn 50h)</b><small>9.000 km (Còn 375 km)</small>", "Bảo dưỡng xích tải lúa, thay dao cắt bắp", "Phạm Văn Tới", "<span class='module-pill pending'>● VÀNG (Gần đến chu kỳ)</span>"],
            ["<b>XT-HN-079</b>", "Xe tải Hino 500 (8 tấn)", "<b>BDC2 - Cấp 2 (10.000km)</b>", "<b>92.400 km</b><small>3.080 giờ máy</small>", "<b>95.000 km (Còn 2.600km)</b><small>3.150 giờ (Còn 70h)</small>", "Thay dầu phanh DOT4, kiểm tra áp suất lốp", "Lê Văn Tuấn", "<span class='module-pill'>● XANH (An toàn)</span>"]
        ],
        "Tìm mã xe, cấp bảo dưỡng, KTV...",
        "Hiển thị kế hoạch bảo dưỡng theo quy định THACO AGRI"
    )
)

PAGES_DATA["pages/E-xuong-btsc/yeu-cau-sua-chua.html"] = (
    make_head("XƯỞNG BTSC", "Tiếp nhận yêu cầu sửa chữa (BM09)", "Tiếp nhận báo hỏng sự cố từ App tài xế, chẩn đoán mức độ Nhẹ (≤15p tại chỗ) hay Nặng (chuyển xưởng).", ["↗ Xuất biên bản sự cố", "＋ Tạo yêu cầu sửa chữa"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả mức độ", "Đang xử lý"]) +
    make_stats([("Yêu cầu sự cố trong ngày", "6 sự cố", "Tiếp nhận từ App tài xế"), ("Sự cố nhẹ (Xử lý tại chỗ ≤15p)", "4 vụ", "Đã cử thợ lưu động"), ("Sự cố nặng (Chuyển xưởng)", "2 xe", "Cần cẩu kéo xe"), ("Thời gian xử lý TB", "1.8 giờ/vụ", "Đạt chuẩn cam kết SLA")]) +
    make_kanban([
        ("1. Tiếp nhận báo hỏng mới", "2", [
            {"id": "BM09-0823-01", "title": "Bục ống dầu thủy lực dàn cày 4 chảo", "subtitle": "XC-NH-031 · Lô CN-B06 · Tài xế Keo Sarath báo qua App", "tag": "Sự cố nặng", "pill_type": "danger", "time": "08:15"},
            {"id": "BM09-0823-02", "title": "Thủng lốp sau bên phụ xe Howo", "subtitle": "XT-HW-108 · Bãi Packhouse 2 · Cần thay lốp sơ cua", "tag": "Sự cố nhẹ", "pill_type": "", "time": "08:30"}
        ]),
        ("2. Đã cử thợ xử lý tại chỗ", "3", [
            {"id": "BM09-0823-03", "title": "Đứt dây curoa máy phát điện", "subtitle": "XC-KB-042 · Lô A12 · KTV Đỗ Thanh Hải đang xử lý", "tag": "Đang sửa", "pill_type": "pending", "time": "07:45"},
            {"id": "BM09-0823-04", "title": "Kẹt van chia dầu ben xe Howo", "subtitle": "XT-HW-105 · Huỳnh Tấn Đạt đang kiểm tra bơm", "tag": "Đang sửa", "pill_type": "", "time": "08:00"}
        ]),
        ("3. Đang đại tu tại Xưởng", "4", [
            {"id": "BM09-0822-08", "title": "Hỏng bơm cao áp heo dầu (Denso)", "subtitle": "XC-JD-019 · Lập báo cáo bảo hành NCC (BM03)", "tag": "Chờ NCC", "pill_type": "pending", "time": "Hôm qua"},
            {"id": "BM09-0822-09", "title": "Cháy lá côn đĩa ly hợp máy cày", "subtitle": "XC-NH-028 · Đang tán đĩa côn mới tại xưởng", "tag": "Đang lắp ráp", "pill_type": "", "time": "Hôm qua"}
        ]),
        ("4. Đã nghiệm thu & Bàn giao", "6", [
            {"id": "BM09-0823-05", "title": "Thay ắc quy GS 12V-120Ah", "subtitle": "XT-HN-079 · Đã bàn giao lại Đội Vận tải NT2", "tag": "Hoàn tất", "pill_type": "", "time": "07:30"},
            {"id": "BM09-0822-07", "title": "Hàn gia cố khung càng dàn bừa", "subtitle": "Dàn bừa DB-24 · Nghiệm thu đạt chuẩn kỹ thuật", "tag": "Hoàn tất", "pill_type": "", "time": "06:30"}
        ])
    ])
)

PAGES_DATA["pages/E-xuong-btsc/phieu-sua-chua.html"] = (
    make_head("XƯỞNG BTSC", "Phiếu sửa chữa & Xuất vật tư (BM02)", "Lập phiếu giao việc thợ máy, phân luồng sửa chữa nội bộ / bảo hành NCC (BM03) và xuất kho phụ tùng.", ["↗ Xuất phiếu giao việc", "＋ Tạo phiếu BM02"]) +
    make_filters(["Tháng 08/2026", "Tất cả tổ kỹ thuật", "Trạng thái: Đang thực hiện"]) +
    make_stats([("Phiếu giao việc đang mở", "8 phiếu", "4 bảo dưỡng · 4 sửa chữa"), ("Chi phí vật tư xuất kho", "28.500.000 đ", "Lọc, lốp, ty ben"), ("Giờ công thợ máy", "64 giờ công", "Thực tế 58 giờ"), ("Thời gian hoàn thành đúng hạn", "94.2%", "Vượt mục tiêu 90%")]) +
    make_table(
        ["SỐ PHIẾU BM02", "XE SỬA CHỮA", "HẠNG MỤC CÔNG VIỆC", "PHÂN LUỒNG SỬA CHỮA", "KỸ THUẬT VIÊN", "VẬT TƯ XUẤT KHO", "CHI PHÍ DỰ KIẾN", "TRẠNG THÁI"],
        [
            ["<b>PSC-0823-01</b>", "<b>XC-JD-024</b><small>John Deere</small>", "Bảo dưỡng cấp 2 (2.500h)", "Nội bộ Xưởng BTSC", "Đỗ Thanh Hải", "Lọc nhớt P550388, 18L nhớt 15W-40, Lọc dầu", "<b>3.250.000 đ</b>", make_pill("Đang thực hiện", "")],
            ["<b>PSC-0823-02</b>", "<b>XC-NH-031</b><small>New Holland</small>", "Bấm lại 2 đầu ống tuy-ô thủy lực", "Nội bộ Xưởng BTSC", "Huỳnh Tấn Đạt", "2 đầu cút thủy lực ren 3/4 + 4m ống 2SN", "<b>1.450.000 đ</b>", make_pill("Đang thực hiện", "")],
            ["<b>PSC-0822-05</b>", "<b>XC-JD-019</b><small>John Deere</small>", "Bảo hành bơm cao áp kim phun", "<b style='color:var(--amber)'>Bảo hành NCC (BM03)</b>", "Tổ Động cơ", "Gửi trả nhà cung cấp Denso kiểm định", "<b>Bảo hành 0 đ</b>", make_pill("Chờ NCC", "pending")],
            ["<b>PSC-0822-06</b>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "Tán má phanh 4 bánh sau", "Nội bộ Xưởng BTSC", "Nguyễn Thành Long", "8 bộ má phanh Howo, 2 bầu phanh lốc-kê", "<b>4.600.000 đ</b>", make_pill("Đang thực hiện", "")]
        ],
        "Tìm số phiếu BM02, mã xe, KTV...",
        "Hiển thị các phiếu sửa chữa và xuất vật tư phụ tùng"
    )
)

PAGES_DATA["pages/E-xuong-btsc/theo-doi-sua-chua.html"] = (
    make_head("XƯỞNG BTSC", "Theo dõi tiến độ xưởng & Tiêu hao bất thường", "Theo dõi tiến độ sửa chữa, cảnh báo trễ hạn và theo dõi tiêu hao nhiên liệu bất thường gắn liền với sự cố máy móc.", ["↗ Xem luồng xưởng", "＋ Tiếp nhận xe"]) +
    make_filters(["Hôm nay, 23/08/2026", "Xưởng BTSC Trung tâm", "Trưởng xưởng: Lê Minh Tâm"]) +
    make_stats([("Xe đang nằm xưởng", "11 xe", "7 bảo dưỡng · 4 sửa chữa"), ("Thời gian dừng máy TB", "14.5 giờ/xe", "Giảm 3.2h so tháng 7"), ("Xe có hao dầu bất thường", "2 xe", "Hỏng kim phun & kẹt phanh"), ("Năng suất thợ máy", "98.5%", "14 thợ đang làm việc")]) +
    make_kanban([
        ("1. Đang chẩn đoán hư hỏng", "3", [
            {"id": "TD-01", "title": "Khảo sát tiếng kêu cầu sau máy kéo", "subtitle": "XC-KB-058 · Tiếp nhận 08:10 · KTV: Đỗ Thanh Hải", "tag": "Đo độ rơ", "pill_type": "pending", "time": "08:10"},
            {"id": "TD-02", "title": "Khói đen & hao dầu bất thường (+18%)", "subtitle": "MU-KM-015 · Đo áp buồng đốt & test kim phun", "tag": "Hao dầu sự cố", "pill_type": "danger", "time": "08:25"}
        ]),
        ("2. Chờ xuất kho phụ tùng", "2", [
            {"id": "TD-03", "title": "Chờ gioăng phớt đại tu hộp số", "subtitle": "XC-JD-019 · Chờ thủ kho xuất phụ tùng chính hãng", "tag": "Chờ soạn hàng", "pill_type": "pending", "time": "07:45"},
            {"id": "TD-04", "title": "Chờ 2 lốp Howo 12.00R20 Bridgestone", "subtitle": "XT-HW-108 · Chờ điều chuyển từ kho trung tâm", "tag": "Chờ lốp", "pill_type": "pending", "time": "08:00"}
        ]),
        ("3. Đang lắp ráp & Sửa chữa", "4", [
            {"id": "TD-05", "title": "Bảo dưỡng cấp 2 máy kéo John Deere", "subtitle": "XC-JD-024 · Đang thay nhớt và siết lực bu lông", "tag": "Đạt 60%", "pill_type": "", "time": "08:30"},
            {"id": "TD-06", "title": "Phục hồi hệ thống phanh xe Howo", "subtitle": "XT-HW-102 · Đang tán đinh nhôm má phanh mới", "tag": "Đạt 75%", "pill_type": "", "time": "08:15"}
        ]),
        ("4. Nghiệm thu & Bàn giao", "2", [
            {"id": "TD-07", "title": "Chạy thử tải máy gặt Kubota DC-70G", "subtitle": "MG-KB-018 · Chạy thử 30 phút không tải đạt chuẩn", "tag": "Đạt chuẩn", "pill_type": "", "time": "07:50"},
            {"id": "TD-08", "title": "Bàn giao xe téc nước Hino 15m3", "subtitle": "XB-HN-045 · BP. Vận hành đã ký nhận nghiệm thu", "tag": "Bàn giao", "pill_type": "", "time": "08:20"}
        ])
    ])
)

PAGES_DATA["pages/E-xuong-btsc/dang-kiem-bao-hiem.html"] = (
    make_head("XƯỞNG BTSC", "Quản lý Đăng kiểm & Bảo hiểm xe", "Theo dõi thời hạn kiểm định kỹ thuật an toàn và hợp đồng bảo hiểm TNDS / vật chất thân vỏ xe cơ giới.", ["↗ Xuất danh sách đến hạn", "＋ Thêm hồ sơ mới"]) +
    make_filters(["Tất cả 48 xe ô tô tải & téc", "Cảnh báo hạn: Dưới 45 ngày", "Đang theo dõi"]) +
    make_stats([("Xe còn hạn đăng kiểm", "46 xe", "Tỷ lệ 95.8%"), ("Sắp đến hạn đăng kiểm (<30 ngày)", "2 xe", "Đã đặt lịch TT 81-02D"), ("Bảo hiểm còn hiệu lực", "128 xe", "100% phương tiện"), ("Sắp tái tục bảo hiểm (<30 ngày)", "4 hợp đồng", "PJICO & Bảo Việt")]) +
    make_table(
        ["BIỂN SỐ XE / MÃ", "CHỦNG LOẠI PHƯƠNG TIỆN", "ĐƠN VỊ QUẢN LÝ", "HẠN ĐĂNG KIỂM", "TRUNG TÂM KIỂM ĐỊNH", "HẠN BẢO HIỂM TNDS / THÂN VỎ", "CÔNG TY BẢO HIỂM", "TRẠNG THÁI"],
        [
            ["<b>51C-892.34</b><small>XT-HW-102</small>", "Xe tải Howo 4 chân 15T", "Đội Vận tải Nặng", "<b style='color:var(--amber)'>15/09/2026 (Còn 22 ngày)</b>", "TTĐK 81-02D Gia Lai", "20/11/2026", "Bảo Việt TP.HCM", make_pill("Sắp hết hạn ĐK", "pending")],
            ["<b>77C-124.58</b><small>XT-HN-079</small>", "Xe tải Hino 500 (8 tấn)", "Đội Vận tải NT2", "<b style='color:var(--green2)'>24/08/2026 (Đang khám)</b>", "TTĐK 77-01S Bình Định", "<b style='color:var(--amber)'>28/09/2026 (Còn 35 ngày)</b>", "PVI Bình Định", make_pill("Đang khám xe", "")],
            ["<b>XC-JD-024</b><small>John Deere</small>", "Máy kéo nông nghiệp 140HP", "Xí nghiệp Chuối 1", "Kiểm định an toàn: 10/2027", "TT Kiểm định Máy NN", "<b style='color:var(--amber)'>15/09/2026 (Còn 22 ngày)</b>", "PJICO Gia Lai", make_pill("Sắp tái tục BH", "pending")],
            ["<b>60C-556.78</b><small>XB-HD-062</small>", "Xe ben Hyundai HD270 15T", "Đội Thi công Thủy lợi", "10/11/2026", "TTĐK 60-01S Đồng Nai", "15/01/2027", "Bảo Việt", make_pill("Còn hạn", "")]
        ],
        "Tìm biển số xe, trung tâm đăng kiểm, bảo hiểm...",
        "Hiển thị theo dõi thời hạn đăng kiểm và bảo hiểm phương tiện"
    )
)

# ==========================================
# MODULE F: BÁO CÁO HỢP NHẤT
# ==========================================
PAGES_DATA["pages/F-bao-cao/bao-cao-van-hanh.html"] = (
    make_head("BÁO CÁO HỢP NHẤT", "Báo cáo Năng suất & Vận hành xe", "Báo cáo tổng hợp số lệnh hoàn thành, số km lăn bánh, số giờ nổ máy thực tế và năng suất cày bừa/vận chuyển.", ["↗ Xuất Excel", "↗ Xuất PDF"]) +
    make_filters(["Tháng 08/2026", "Tất cả xí nghiệp", "Tổng hợp tháng"]) +
    make_stats([("Tổng phương tiện huy động", "128 xe", "Tỷ lệ sẵn sàng 91.5%"), ("Tổng giờ máy hoạt động", "18.450 giờ", "Vượt 6.2% kế hoạch"), ("Diện tích cày bừa hoàn thành", "1.820 ha", "Đạt 102% chỉ tiêu vụ"), ("Khối lượng vận chuyển", "8.950 tấn", "Chuối buồng & phụ phẩm")]) +
    make_analytics("Biến động số lượng phương tiện hoạt động theo ngày trong tháng 08/2026", "M10 160 C120 130, 250 145, 380 90 S540 75, 680 30", "128 xe", [("Đang hoạt động", "67.2%"), ("Dự phòng / Dừng", "16.4%"), ("Bảo trì sửa chữa", "11.7%"), ("Mất tín hiệu", "4.7%")],
        make_table(
            ["ĐƠN VỊ / XÍ NGHIỆP", "TỔNG SỐ XE", "XE HOẠT ĐỘNG", "GIỜ MÁY NỔ (H)", "DIỆN TÍCH (HA)", "VẬN CHUYỂN (TẤN)", "HIỆU SUẤT KHAI THÁC", "ĐÁNH GIÁ"],
            [
                ["<b>Xí nghiệp Chuối 1</b>", "46 xe", "36 xe", "<b>6.850 h</b>", "<b>820.5 ha</b>", "3.850 T", "<b style='color:var(--green2)'>94.5%</b>", "<span class='module-pill'>Xuất sắc</span>"],
                ["<b>Xí nghiệp Chuối 2</b>", "38 xe", "28 xe", "<b>5.420 h</b>", "<b>610.0 ha</b>", "2.900 T", "<b style='color:var(--green2)'>91.2%</b>", "<span class='module-pill'>Đạt kế hoạch</span>"],
                ["<b>Xí nghiệp Cây ăn trái</b>", "22 xe", "16 xe", "<b>3.180 h</b>", "<b>389.5 ha</b>", "1.450 T", "<b style='color:var(--green2)'>88.6%</b>", "<span class='module-pill'>Đạt kế hoạch</span>"],
                ["<b>Đội Thi công Thủy lợi</b>", "22 xe", "14 xe", "<b>3.000 h</b>", "14.2 km kênh", "750 T", "<b style='color:var(--green2)'>86.0%</b>", "<span class='module-pill'>Đạt kế hoạch</span>"]
            ],
            "Tìm đơn vị, chỉ tiêu...",
            "Tổng hợp 4 đơn vị sản xuất chính"
        )
    )
)

PAGES_DATA["pages/F-bao-cao/bao-cao-hanh-trinh-vi-pham.html"] = (
    make_head("BÁO CÁO HỢP NHẤT", "Báo cáo Hành trình & Vi phạm GPS", "Thống kê tổng quãng đường di chuyển (km), số lần chạy quá tốc độ, ra ngoài vùng Geofence và dừng bất thường.", ["↗ Xuất Excel", "🔍 Lọc theo phương tiện"]) +
    make_filters(["Tháng 08/2026", "Nhóm: Xe tải & Xe khách", "Dữ liệu GPS chuẩn"]) +
    make_stats([("Tổng quãng đường lăn bánh", "148.500 km", "+8.4% so tháng 7"), ("Quãng đường có tải", "112.400 km", "Tỷ lệ chạy tải 75.7%"), ("Vi phạm quá tốc độ (>30km/h)", "84 vụ", "Giảm 24% so tháng 7"), ("Vi phạm ra ngoài Geofence", "48 vụ", "Đã giải trình 100%")]) +
    make_analytics("Xu hướng quãng đường lăn bánh hàng tuần (Km)", "M10 180 C110 140, 230 150, 360 100 S510 85, 680 40", "148.5k km", [("Chạy có hàng (Có tải)", "75.7%"), ("Chạy quay đầu (Không tải)", "24.3%")],
        make_table(
            ["MÃ XE / BIỂN SỐ", "CHỦNG LOẠI XE", "LÁI XE CHÍNH", "TỔNG KM", "KM CÓ TẢI", "GIỜ MÁY NỔ", "VI PHẠM TỐC ĐỘ", "VI PHẠM GEOFENCE"],
            [
                ["<b>51C-892.34</b><small>XT-HW-102</small>", "Howo 4 chân 15T", "Trần Quốc Huy", "<b>4.850 km</b>", "3.920 km (80.8%)", "185 h", "2 lần", "0 lần"],
                ["<b>77C-124.58</b><small>XT-HN-079</small>", "Hino 500 (8T)", "Sok Phearith", "<b>3.920 km</b>", "2.980 km (76.0%)", "162 h", "6 lần (Cần nhắc nhở)", "1 lần"],
                ["<b>60C-556.78</b><small>XB-HD-062</small>", "Ben Hyundai HD270", "Keo Sarath", "<b>3.450 km</b>", "2.650 km (76.8%)", "154 h", "1 lần", "2 lần"],
                ["<b>81C-098.45</b><small>BT-FR-007</small>", "Ford Ranger 4x4", "Nguyễn Thành Long", "<b>5.200 km</b>", "Tuần tra", "170 h", "0 lần", "0 lần"]
            ],
            "Tìm biển số xe, tên tài xế...",
            "Hiển thị báo cáo hành trình và vi phạm"
        )
    )
)

PAGES_DATA["pages/F-bao-cao/bao-cao-lai-xe-kpi.html"] = (
    make_head("BÁO CÁO HỢP NHẤT", "Báo cáo Tổng hợp KPI & Lương thưởng", "Báo cáo KPI theo công thức chuẩn BRD: Điểm KPI = 25% Chuyến + 25% Km + 25% Giờ máy + 25% Tiết kiệm nhiên liệu.", ["↗ Xuất bảng lương KPI", "🏆 Bảng vinh danh"]) +
    make_filters(["Kỳ đánh giá: Tháng 08/2026", "Tất cả 96 tài xế", "Dữ liệu tự động từ GPS"]) +
    make_stats([("Điểm KPI trung bình", "92.4 / 100", "+3.2 điểm so tháng 7"), ("Tài xế Loại A (Xuất sắc)", "38 người", "Thưởng 100% năng suất"), ("Tài xế Loại B (Khá)", "46 người", "Thưởng 80% năng suất"), ("Tổng tiền thưởng tiết kiệm dầu", "32.400.000 đ", "Làm lợi 57.7 tr cho KLH")]) +
    make_analytics("Phân bổ xếp hạng KPI tài xế tháng 08/2026", "M10 180 C140 130, 260 140, 390 80 S530 65, 680 25", "96 người", [("Loại A (Xuất sắc)", "39.5%"), ("Loại B (Khá)", "47.9%"), ("Loại C (Trung bình)", "12.6%")],
        make_table(
            ["MÃ NV / HỌ TÊN", "ĐỘI XE TRỰC THUỘC", "SỐ CHUYẾN (25%)", "KM CHẠY (25%)", "GIỜ MÁY (25%)", "TIẾT KIỆM DẦU (25%)", "TỔNG ĐIỂM KPI", "TIỀN THƯỞNG"],
            [
                ["<b>NV-0824</b><small>Nguyễn Văn Minh</small>", "Đội Cơ giới 1 (NT1)", "24 ca máy (95đ)", "640 km (96đ)", "186h (98đ)", "<b style='color:var(--green2)'>+6.2% (97đ)</b>", "<b style='color:var(--green2);font-size:13px'>96.5 (Loại A)</b>", "<b>4.200.000 đ</b>"],
                ["<b>NV-0831</b><small>Trần Quốc Huy</small>", "Đội Vận tải Nặng", "34 chuyến (96đ)", "4.850 km (95đ)", "210h (94đ)", "<b style='color:var(--green2)'>+4.8% (94đ)</b>", "<b style='color:var(--green2);font-size:13px'>94.8 (Loại A)</b>", "<b>3.800.000 đ</b>"],
                ["<b>NV-0845</b><small>Lê Hoàng Nam</small>", "Đội Cơ giới 1 (NT1)", "22 ca máy (90đ)", "520 km (92đ)", "172h (91đ)", "<b style='color:var(--green2)'>+3.5% (92đ)</b>", "<b style='color:var(--green2);font-size:13px'>91.2 (Loại A)</b>", "<b>3.200.000 đ</b>"],
                ["<b>NV-KH-012</b><small>Sok Phearith</small>", "Đội Vận tải NT2", "20 chuyến (80đ)", "3.920 km (82đ)", "155h (75đ)", "<b style='color:var(--red)'>-2.4% (75đ)</b>", "<b style='color:#ae7117;font-size:13px'>78.0 (Loại C)</b>", "<b>1.200.000 đ</b>"]
            ],
            "Tìm tên lái xe, mã nhân viên...",
            "Hiển thị bảng đánh giá KPI 4 thành phần chuẩn BRD"
        )
    )
)

PAGES_DATA["pages/F-bao-cao/bao-cao-nhien-lieu.html"] = (
    make_head("BÁO CÁO HỢP NHẤT", "Báo cáo Tiêu hao & Chi phí Nhiên liệu", "Đối chiếu tổng lượng dầu cấp phát từ kho/xe bồn với lượng dầu tiêu hao đo bằng cảm biến que đo siêu âm GPS.", ["↗ Xuất báo cáo nhiên liệu", "📊 Xem biểu đồ tiêu hao"]) +
    make_filters(["Tháng 08/2026", "Chủng loại: Diesel DO 0.05S", "Khớp số liệu trạm"]) +
    make_stats([("Tổng dầu xuất cấp tháng", "52.400 Lít", "Định mức khoán 55.150 Lít"), ("Tổng dầu tiết kiệm", "2.750 Lít", "Tỷ lệ tiết kiệm +4.98%"), ("Giá trị làm lợi cho KLH", "57.750.000 đ", "Tính giá 21.000 đ/L"), ("Độ chính xác cảm biến GPS", "99.2%", "So khớp que đo bồn ngầm")]) +
    make_analytics("Xu hướng tiêu thụ nhiên liệu Diesel thực tế vs Định mức qua các tuần", "M10 160 C120 130, 250 140, 370 85 S510 65, 680 30", "52.4k L", [("Đội Cơ giới 1", "42.5%"), ("Đội Vận tải Nặng", "32.0%"), ("Đội Cơ giới 2", "18.5%"), ("Đội Thủy lợi", "7.0%")],
        make_table(
            ["ĐƠN VỊ / ĐỘI XE", "SỐ XE", "DIỆN TÍCH / KM THỰC HIỆN", "ĐỊNH MỨC KHOÁN (L)", "TIÊU THỤ THỰC TẾ (L)", "CHÊNH LỆCH (LÍT)", "TỶ LỆ TIẾT KIỆM", "ĐÁNH GIÁ"],
            [
                ["<b>Đội Xe Cơ giới 1 (NT1)</b>", "36 xe", "820.5 ha cày bừa", "23.400 Lít", "<b>22.250 Lít</b>", "<b style='color:var(--green2)'>-1.150 L</b>", "<b style='color:var(--green2)'>+4.91%</b>", "<span class='module-pill'>Thưởng tập thể</span>"],
                ["<b>Đội Xe Vận tải Nặng</b>", "16 xe", "42.500 km vận chuyển", "17.200 Lít", "<b>16.380 Lít</b>", "<b style='color:var(--green2)'>-820 L</b>", "<b style='color:var(--green2)'>+4.76%</b>", "<span class='module-pill'>Thưởng tập thể</span>"],
                ["<b>Đội Xe Cơ giới 2 (NT2)</b>", "24 xe", "610.0 ha lên luống", "10.800 Lít", "<b>10.150 Lít</b>", "<b style='color:var(--green2)'>-650 L</b>", "<b style='color:var(--green2)'>+6.01%</b>", "<span class='module-pill'>Thưởng tập thể</span>"],
                ["<b>Đội Thi công Thủy lợi</b>", "10 xe", "14.2 km kênh đào", "3.750 Lít", "<b>3.620 Lít</b>", "<b style='color:var(--green2)'>-130 L</b>", "<b style='color:var(--green2)'>+3.46%</b>", "<span class='module-pill'>Đạt định mức</span>"]
            ],
            "Tìm đội xe, đơn vị sản xuất...",
            "Tổng hợp số liệu tiêu hao nhiên liệu toàn KLH"
        )
    )
)

PAGES_DATA["pages/F-bao-cao/bao-cao-chi-phi-btsc.html"] = (
    make_head("BÁO CÁO HỢP NHẤT", "Báo cáo Chi phí Bảo trì & Sửa chữa", "Tổng hợp chi phí thay thế phụ tùng, dầu nhớt bôi trơn, giờ công thợ máy và thời gian dừng xe hỏng (Downtime).", ["↗ Xuất báo cáo tài chính BTSC", "📊 Phân tích chi phí"]) +
    make_filters(["Tháng 08/2026", "Xưởng BTSC Trung tâm", "Đã quyết toán"]) +
    make_stats([("Tổng chi phí BTSC tháng", "142.500.000 đ", "Đạt 94.0% ngân sách"), ("Chi phí vật tư phụ tùng", "98.200.000 đ", "Lọc, lốp, phớt ben"), ("Chi phí dầu nhớt bôi trơn", "32.300.000 đ", "Nhớt 15W-40 & Thủy lực"), ("Chi phí gia công ngoài", "12.000.000 đ", "Tiện cơ khí & ép tuy-ô")]) +
    make_analytics("Cơ cấu chi phí bảo trì sửa chữa theo nhóm xe (VNĐ)", "M10 170 C130 145, 250 155, 380 90 S520 70, 680 30", "142.5 tr", [("Máy kéo John Deere/Kubota", "45.2%"), ("Xe tải Howo & Ben Hyundai", "35.8%"), ("Máy công trình đào/ủi", "19.0%")],
        make_table(
            ["NHÓM PHƯƠNG TIỆN", "SỐ LƯỢT BTSC", "CHI PHÍ PHỤ TÙNG", "CHI PHÍ DẦU NHỚT", "TỔNG CHI PHÍ (VNĐ)", "GIỜ DỪNG MÁY", "BÌNH QUÂN / XE"],
            [
                ["<b>Máy kéo nông nghiệp (62 xe)</b>", "24 lượt", "42.500.000 đ", "21.900.000 đ", "<b>64.400.000 đ</b>", "96 giờ máy", "<b>1.038.000 đ / xe</b>"],
                ["<b>Xe ô tô tải & Ben (36 xe)</b>", "14 lượt", "38.200.000 đ", "7.800.000 đ", "<b>46.000.000 đ</b>", "68 giờ xe", "<b>1.277.000 đ / xe</b>"],
                ["<b>Máy công trình đào/ủi (18 xe)</b>", "6 lượt", "14.500.000 đ", "2.600.000 đ", "<b>17.100.000 đ</b>", "42 giờ máy", "<b>950.000 đ / xe</b>"],
                ["<b>Xe chuyên dùng & Téc (12 xe)</b>", "4 lượt", "3.000.000 đ", "2.000.000 đ", "<b>5.000.000 đ</b>", "18 giờ xe", "<b>416.000 đ / xe</b>"]
            ],
            "Tìm nhóm xe, chi phí...",
            "Tổng hợp chi phí 4 nhóm phương tiện cơ giới"
        )
    )
)

PAGES_DATA["pages/F-bao-cao/bao-cao-so-sanh-klh.html"] = (
    make_head("BÁO CÁO HỢP NHẤT", "Báo cáo So sánh giữa các KLH & Xí nghiệp", "So sánh đối sánh năng lực huy động xe, tỷ lệ tiêu hao dầu và năng suất làm việc giữa KLH Koun Mom, KLH Snuol.", ["↗ Xuất Excel so sánh", "📊 Biểu đồ Benchmark"]) +
    make_filters(["Năm 2026", "Phạm vi: KLH Koun Mom vs KLH Snuol", "Dữ liệu hợp nhất"]) +
    make_stats([("Tổng xe toàn tập đoàn", "240 xe", "Koun Mom 128 · Snuol 112"), ("Tỷ lệ sẵn sàng TB", "91.2%", "Koun Mom dẫn đầu 91.5%"), ("Năng suất cày bừa bình quân", "1.25 ha/ca", "Tương đương giữa 2 KLH"), ("Tỷ lệ tiết kiệm dầu", "+4.8%", "Vượt chỉ tiêu tập đoàn 3%")]) +
    make_analytics("So sánh năng suất và tiêu hao nhiên liệu giữa các Khu Liên Hợp", "M10 170 C120 140, 240 150, 360 90 S520 75, 680 30", "240 xe", [("KLH Koun Mom (Rattanakiri)", "53.3%"), ("KLH Snuol (Kratie)", "46.7%")],
        make_table(
            ["KHU LIÊN HỢP / ĐƠN VỊ", "TỔNG SỐ XE", "DIỆN TÍCH LÀM ĐẤT (HA)", "VẬN CHUYỂN (TẤN)", "TIÊU HAO DẦU THỰC TẾ (L)", "TỶ LỆ TIẾT KIỆM", "HỆ SỐ SẴN SÀNG (AVAILABILITY)", "XẾP HẠNG"],
            [
                ["<b>KLH Koun Mom (Campuchia)</b>", "128 xe", "<b>1.820.5 ha</b>", "<b>8.950 T</b>", "52.400 Lít", "<b style='color:var(--green2)'>+4.98%</b>", "<b style='color:var(--green2)'>91.5%</b>", "<span class='module-pill'>Top 1 Tập đoàn</span>"],
                ["<b>KLH Snuol (Kratie, Campuchia)</b>", "112 xe", "<b>1.540.0 ha</b>", "<b>7.420 T</b>", "46.200 Lít", "<b style='color:var(--green2)'>+4.62%</b>", "<b style='color:var(--green2)'>90.8%</b>", "<span class='module-pill'>Top 2 Tập đoàn</span>"],
                ["<b>KLH Ia Puch (Gia Lai, VN)</b>", "45 xe", "<b>620.0 ha</b>", "<b>2.850 T</b>", "18.100 Lít", "<b style='color:var(--green2)'>+4.10%</b>", "<b style='color:var(--green2)'>89.5%</b>", "<span class='module-pill'>Đạt chỉ tiêu</span>"]
            ],
            "Tìm tên Khu Liên Hợp, chỉ số...",
            "So sánh hiệu suất các tổ hợp nông nghiệp THACO AGRI"
        )
    )
)

# ==========================================
# MODULE G: PHÂN QUYỀN HỆ THỐNG
# ==========================================
PAGES_DATA["pages/G-phan-quyen/nguoi-dung.html"] = (
    make_head("PHÂN QUYỀN HỆ THỐNG", "Quản lý Người dùng & Tài khoản SSO", "Quản lý danh sách tài khoản cán bộ, quản đốc, điều độ viên; hỗ trợ tích hợp SSO/LDAP THACO AGRI.", ["↗ Xuất danh sách", "＋ Thêm người dùng mới"]) +
    make_filters(["Tất cả 45 tài khoản", "Đơn vị: KLH Koun Mom", "Trạng thái: Đang hoạt động"]) +
    make_stats([("Tổng tài khoản hệ thống", "45 tài khoản", "100% xác thực SSO THACO"), ("Đang Online làm việc", "18 tài khoản", "Điều độ, quản đốc, thủ kho"), ("Tài khoản quản trị (Admin)", "3 tài khoản", "Phòng CNTT THACO AGRI"), ("Bảo mật mật khẩu", "2FA OTP", "Bắt buộc đổi 90 ngày")]) +
    make_table(
        ["MÃ NV / USERNAME", "HỌ VÀ TÊN", "EMAIL DOANH NGHIỆP", "VAI TRÒ TRUY CẬP", "ĐƠN VỊ CÔNG TÁC", "ĐĂNG NHẬP CUỐI", "IP TRUY CẬP", "TRẠNG THÁI"],
        [
            ["<b>long.chautieu</b><small>NV-IT-001</small>", "<b>Chau Tiểu Long</b><small>Chuyên viên Quản trị Hệ thống</small>", "long.chautieu@thacoagri.com.vn", "<b style='color:var(--green2)'>Quản trị hệ thống (Admin)</b>", "Phòng CNTT THACO AGRI", "23/08/2026 · 08:42:16", "10.20.15.88", make_pill("Online", "")],
            ["<b>vinh.tranquang</b><small>NV-BGD-001</small>", "<b>Trần Quang Vinh</b><small>Giám đốc Vận hành KLH</small>", "vinh.tranquang@thacoagri.com.vn", "Ban Giám Đốc KLH (Xem toàn quyền)", "Ban Giám Đốc KLH Koun Mom", "23/08/2026 · 07:15:30", "10.20.15.10", make_pill("Offline", "")],
            ["<b>minh.nguyenvan</b><small>NV-0824</small>", "<b>Nguyễn Văn Minh</b><small>Tổ trưởng Đội Cơ giới 1</small>", "minh.nguyenvan@thacoagri.com.vn", "Điều phối viên & Đội trưởng Xe", "Xí nghiệp Chuối 1", "23/08/2026 · 05:45:10", "10.20.18.24", make_pill("Online", "")],
            ["<b>tam.leminh</b><small>NV-BTSC-001</small>", "<b>Lê Minh Tâm</b><small>Trưởng xưởng BTSC Trung tâm</small>", "tam.leminh@thacoagri.com.vn", "Quản lý Bảo trì - Sửa chữa & Kho", "Xưởng BTSC Trung tâm", "23/08/2026 · 07:30:45", "10.20.16.12", make_pill("Online", "")],
            ["<b>ha.lethithu</b><small>NV-KHO-002</small>", "<b>Lê Thị Thu Hà</b><small>Thủ kho Xăng dầu T1</small>", "ha.lethithu@thacoagri.com.vn", "Thủ kho Nhiên liệu & Cấp phát", "Kho Xăng dầu Trung tâm", "23/08/2026 · 06:10:00", "10.20.17.05", make_pill("Online", "")]
        ],
        "Tìm username, họ tên, email, vai trò...",
        "Hiển thị 1–5 trên 45 người dùng"
    )
)

PAGES_DATA["pages/G-phan-quyen/vai-tro-phan-quyen.html"] = (
    make_head("PHÂN QUYỀN HỆ THỐNG", "Vai trò & Ma trận phân quyền (RBAC)", "Cấu hình ma trận 6 nhóm quyền: Quản trị, Quản đốc, Điều phối, Lái xe, Kế toán, Xưởng; phân quyền báo cáo & cảnh báo.", ["Khôi phục mặc định", "💾 Lưu phân quyền"]) +
    make_filters(["Nhóm vai trò: 6 nhóm chuẩn", "Áp dụng: Toàn hệ thống", "Phân quyền chi tiết (RBAC)"]) +
    make_stats([("Tổng nhóm vai trò", "6 nhóm quyền", "Admin, Giám đốc, Quản đốc, Điều phối, Kế toán, Xưởng"), ("Quyền xem báo cáo nhiên liệu", "Phân cấp", "Kế toán, Giám đốc, Quản đốc"), ("Quyền xử lý cảnh báo", "Phân theo vai trò", "Điều phối, Quản đốc, Trưởng xưởng"), ("Quyền tạo lệnh điều xe", "Xí nghiệp chủ động", "Theo kế hoạch phân bổ")]) +
    make_settings("Cấu hình ma trận quyền cho nhóm [Quản đốc Nông trường]", "Thiết lập quyền hạn tạo lệnh sản xuất, phân bổ máy cày, duyệt nghiệm thu diện tích và xem báo cáo.", [
        {"label": "Tên nhóm quyền", "val": "Quản đốc Xí nghiệp Nông trường", "hint": "Nhóm chịu trách nhiệm trực tiếp điều hành sản xuất tại Nông trường 1 & 2."},
        {"label": "Quyền lập kế hoạch & Lệnh sản xuất", "val": "Được tạo kế hoạch tuần/ngày, tạo lệnh cày bừa, duyệt nghiệm thu khối lượng GPS", "hint": "Được phép điều chỉnh kế hoạch khi có mưa dông kèm lưu vết Audit."},
        {"label": "Quyền xem báo cáo nhiên liệu", "val": "Được xem báo cáo đối chiếu tiêu hao nhiên liệu của đội xe trực thuộc đơn vị", "hint": "Không được duyệt phiếu xuất nhập kho bồn xăng dầu trung tâm."},
        {"label": "Quyền tiếp nhận & Xử lý cảnh báo", "val": "Tiếp nhận cảnh báo vi phạm tốc độ, cảnh báo ra khỏi Geofence của tài xế đơn vị", "hint": "Được quyền xác nhận giải trình và đóng cảnh báo hợp lệ."},
        {"label": "Quyền xuất dữ liệu", "val": "Được xuất file Excel báo cáo sản xuất, năng suất ca máy theo lô thửa", "hint": "Không được xóa dữ liệu lịch sử hệ thống."}
    ], ["Quản trị viên (Admin)", "Ban Giám Đốc KLH", "Quản đốc Nông trường", "Điều phối viên Vận tải", "Kế toán Nhiên liệu", "Trưởng xưởng BTSC"])
)

PAGES_DATA["pages/G-phan-quyen/phan-quyen-don-vi.html"] = (
    make_head("PHÂN QUYỀN HỆ THỐNG", "Phân quyền dữ liệu theo Đơn vị", "Thiết lập nguyên tắc độc lập dữ liệu theo BRD: Mỗi xí nghiệp chỉ xem và thao tác dữ liệu đội xe của đơn vị mình.", ["Khôi phục mặc định", "💾 Lưu phân quyền đơn vị"]) +
    make_filters(["Chọn tài khoản: hai.nguyenvan (Quản đốc XN Chuối 1)", "Cây đơn vị KLH Koun Mom", "Đang hiệu lực"]) +
    make_stats([("Đơn vị được phân quyền", "Xí nghiệp Chuối 1", "Toàn quyền quản lý 46 xe"), ("Lô thửa được giám sát", "84 Lô canh tác", "Phân khu A & B"), ("Trạm nhiên liệu được duyệt", "Cột bơm T1 & Bồn NT1", "Duyệt cấp dầu máy cày"), ("Quyền xem đơn vị khác", "Chỉ xem tổng quan", "Không can thiệp lệnh xe")]) +
    make_settings("Phân quyền phạm vi dữ liệu cho Quản đốc Nông trường Chuối 1", "Chỉ định danh mục xí nghiệp, đội xe và lô thửa mà tài khoản được quyền thao tác trực tiếp.", [
        {"label": "Tài khoản cán bộ", "val": "hai.nguyenvan (Nguyễn Văn Hải - Quản đốc XN Chuối 1)", "hint": "Mã nhân sự: NV-QD-001."},
        {"label": "Khu Liên Hợp trực thuộc", "val": "Khu Liên Hợp Koun Mom (Campuchia)", "hint": "Phạm vi cấp 1."},
        {"label": "Xí nghiệp được phân công phụ trách chính", "val": "Xí nghiệp Nông trường Chuối 1 (NT1)", "hint": "Được toàn quyền tạo Lệnh sản xuất, duyệt nghiệm thu diện tích cày bừa."},
        {"label": "Đội xe cơ giới được quyền điều động", "val": "Đội Xe Cơ giới 1 (36 xe) + Đội Xe BVTV 1 (6 xe)", "hint": "Các đội xe trực tiếp phục vụ Nông trường 1."},
        {"label": "Giới hạn xem dữ liệu ngoài phạm vi", "val": "Chỉ đọc (Read-only) dữ liệu bản đồ toàn KLH để phối hợp tránh trùng lịch", "hint": "Không thể duyệt lệnh cho Xí nghiệp Chuối 2 hoặc XN Cây ăn trái."}
    ], ["Phân quyền KLH", "Phân quyền Xí nghiệp", "Phân quyền Đội xe", "Phân quyền Lô thửa"])
)

PAGES_DATA["pages/G-phan-quyen/nhat-ky-he-thong.html"] = (
    make_head("PHÂN QUYỀN HỆ THỐNG", "Nhật ký hệ thống (Audit Trail)", "Lưu vết toàn bộ thao tác điều xe, cấp dầu, bảo trì, sửa định mức và thay đổi kế hoạch sản xuất theo thời gian thực.", ["↗ Xuất nhật ký Audit", "🔍 Lọc theo người dùng"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả giao dịch", "Dữ liệu lưu trữ vĩnh viễn"]) +
    make_stats([("Tổng sự kiện trong ngày", "342 sự kiện", "Giao dịch hệ thống"), ("Thao tác điều xe & Cấp dầu", "285 thao tác", "Lệnh LSX, LVC, PCD"), ("Thay đổi kế hoạch sản xuất", "4 thao tác", "Do thời tiết mưa"), ("Đăng nhập / Đăng xuất", "48 lượt", "100% IP nội bộ hợp lệ")]) +
    make_timeline([
        ("Người dùng minh.nguyenvan tạo mới Lệnh Sản Xuất LSX-0823-018", "Phát hành lệnh cày lật đất sâu 35cm tại Lô CN-A12 (24.0 ha) cho xe John Deere XC-JD-024.", "23/08/2026 · 06:00:22 · IP: 10.20.18.24 · Nguyễn Văn Minh (Tổ trưởng)", "Xem nội dung lệnh"),
        ("Người dùng ha.lethithu xuất phiếu cấp dầu PCD-0823-01", "Xác nhận xuất 160 Lít dầu Diesel DO 0.05S từ Cột bơm T1 cho xe máy kéo John Deere XC-JD-024.", "23/08/2026 · 06:15:30 · IP: 10.20.17.05 · Lê Thị Thu Hà (Thủ kho)", "Xem phiếu xuất"),
        ("Người dùng hai.nguyenvan điều chỉnh kế hoạch do mưa dông", "Hoãn cày rạch hàng Lô CAT-D09 từ 14:00 sang ca sáng 24/08. Kèm ảnh chụp hiện trường mặt ruộng sình lầy.", "23/08/2026 · 14:20:10 · IP: 10.20.18.10 · Nguyễn Văn Hải (Quản đốc)", "Xem minh chứng"),
        ("Người dùng tam.leminh duyệt nghiệm thu Phiếu sửa chữa BM02-0821", "Ký duyệt hoàn tất sửa chữa thay bộ dao cắt đôi máy gặt Kubota DC-70G (MG-KB-018).", "22/08/2026 · 17:00:45 · IP: 10.20.16.12 · Lê Minh Tâm (Trưởng xưởng)", "Xem biên bản nghiệm thu")
    ])
)

print("Generated Module E, F, G data.")
