# -*- coding: utf-8 -*-
"""Part 1: Giám sát & Điều hành, Kế hoạch sản xuất, Vận chuyển nội bộ"""
from mockup_helpers import make_pill, make_stats, make_filters, make_head, make_table, make_kanban, make_calendar, make_map, make_analytics, make_timeline, make_settings

data_part1 = {}

# 2. GIÁM SÁT & ĐIỀU HÀNH
data_part1["pages/2-giam-sat-dieu-hanh/giam-sat-truc-tuyen.html"] = (
    make_head("GIÁM SÁT & ĐIỀU HÀNH", "Giám sát trực tuyến", "Theo dõi vị trí GPS, trạng thái động cơ và tốc độ thời gian thực của toàn bộ đội xe.", ["↗ Xem bản đồ lớn", "＋ Lệnh khẩn cấp"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả đội xe", "Trực tiếp GPS (10s)"]) +
    make_stats([("Đang nổ máy làm việc", "58 xe", "Hoạt động 45.3%"), ("Đang di chuyển", "28 xe", "Vận tốc TB 18 km/h"), ("Đang dừng đỗ", "21 xe", "Đỗ đúng bãi 18 xe"), ("Cảnh báo vi phạm", "6 xe", "2 xe quá tốc độ")]) +
    make_map([
        {"code": "XC-JD-024", "sub": "John Deere 6140B · Cày ải Lô CN-A12 · 8 km/h", "is_red": False, "left": 22, "top": 35, "marker": "JD24"},
        {"code": "XT-HW-102", "sub": "Xe tải Howo 4 chân · Vận chuyển buồng Packhouse 2 · 28 km/h", "is_red": False, "left": 45, "top": 55, "marker": "HW02"},
        {"code": "XC-KB-053", "sub": "Kubota M7040 · Lên luống Lô CN-B06 · Đang dừng", "is_amber": True, "left": 60, "top": 28, "marker": "KB53"},
        {"code": "XT-HN-079", "sub": "Hino 500 · Cảnh báo vượt tốc độ 38 km/h (Quy định 30)", "is_red": True, "left": 75, "top": 65, "marker": "HN79"},
        {"code": "MG-KB-018", "sub": "Máy gặt Kubota DC-70G · Thu hoạch Lô C08 · 6 km/h", "is_red": False, "left": 35, "top": 70, "marker": "MG18"},
        {"code": "XB-HN-045", "sub": "Xe bồn Hino 15m3 · Phun thuốc Lô CAT-D09 · 12 km/h", "is_red": False, "left": 80, "top": 32, "marker": "XB45"}
    ], "86 phương tiện đang hoạt động trên tổng số 128 xe · Cập nhật GPS mỗi 10 giây")
)

data_part1["pages/2-giam-sat-dieu-hanh/playback-hanh-trinh.html"] = (
    make_head("GIÁM SÁT & ĐIỀU HÀNH", "Playback hành trình", "Xem lại lịch sử di chuyển, biểu đồ vận tốc và các điểm dừng đỗ theo mốc thời gian.", ["↗ Xuất file KML", "⏵ Bắt đầu phát lại"]) +
    make_filters(["23/08/2026 (06:00 - 17:30)", "Chọn xe: XC-JD-024 (John Deere)", "Tốc độ phát: 2x"]) +
    make_stats([("Tổng quãng đường", "64.8 km", "+12% so với hôm qua"), ("Thời gian nổ máy", "7h 42p", "Hữu ích 6h 30p"), ("Điểm dừng đỗ", "5 lần", "Dừng lâu nhất 35p"), ("Vận tốc cao nhất", "26.4 km/h", "Đạt chuẩn an toàn")]) +
    make_map([
        {"code": "XC-JD-024 (Bắt đầu 06:15)", "sub": "Xuất phát từ Xưởng BTSC -> Lô CN-A12", "is_red": False, "left": 18, "top": 25, "marker": "A"},
        {"code": "Điểm dừng 1 (08:30)", "sub": "Tiếp nhiên liệu lưu động tại Lô A12 (20 phút)", "is_amber": True, "left": 38, "top": 45, "marker": "D1"},
        {"code": "Đang cày ải (10:00 - 15:30)", "sub": "Di chuyển ziczac trong Lô CN-A12 (24.2 ha)", "is_red": False, "left": 55, "top": 60, "marker": "Lô"},
        {"code": "Điểm kết thúc (17:15)", "sub": "Về Bãi đỗ xe Đội Cơ giới 1", "is_red": False, "left": 82, "top": 40, "marker": "B"}
    ], "Lộ trình xe XC-JD-024 ngày 23/08/2026 · Đã hoàn thành 64.8 km")
)

data_part1["pages/2-giam-sat-dieu-hanh/geo-fence.html"] = (
    make_head("GIÁM SÁT & ĐIỀU HÀNH", "Vùng giám sát (Geo-fence)", "Thiết lập và kiểm soát vùng an toàn, vùng giới hạn tốc độ và vùng cấm hoạt động ban đêm.", ["＋ Tạo vùng mới", "⚡ Áp dụng quy tắc"]) +
    make_filters(["Tất cả vùng giám sát (24 vùng)", "KLH Koun Mom", "Trạng thái: Đang hiệu lực"]) +
    make_stats([("Tổng vùng thiết lập", "24 vùng", "22.500 ha bao phủ"), ("Xe trong vùng", "74 xe", "86% đúng tuyến"), ("Cảnh báo rời vùng", "3 sự kiện", "Đã xác nhận 2"), ("Vùng kiểm soát tốc độ", "8 vùng", "Giới hạn 20-30 km/h")]) +
    make_map([
        {"code": "Vùng Nông trường 1 (Zone-NT1)", "sub": "Diện tích 3.200 ha · 34 xe đang hoạt động", "is_red": False, "left": 25, "top": 30, "marker": "Z1"},
        {"code": "Vùng Nông trường 2 (Zone-NT2)", "sub": "Diện tích 2.800 ha · 28 xe đang hoạt động", "is_red": False, "left": 65, "top": 40, "marker": "Z2"},
        {"code": "Vùng Nhà máy Packhouse (Zone-PH)", "sub": "Giới hạn tốc độ 15 km/h · 12 xe tải chở chuối", "is_red": False, "left": 45, "top": 70, "marker": "PH"},
        {"code": "Vùng Hồ Thủy Lợi (Zone-Danger)", "sub": "Cấm xe cơ giới lại gần bờ kè dưới 50m", "is_red": True, "left": 80, "top": 20, "marker": "!"}
    ], "Bản đồ phân vùng Geo-fence KLH Koun Mom · 24 phân khu trực quan")
)

data_part1["pages/2-giam-sat-dieu-hanh/lenh-dieu-xe.html"] = (
    make_head("GIÁM SÁT & ĐIỀU HÀNH", "Lệnh điều xe", "Quản lý luân chuyển và điều động phương tiện cơ giới phục vụ sản xuất và vận chuyển.", ["↗ Xuất bảng kê", "＋ Lập lệnh điều xe"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả loại lệnh", "Đã đồng bộ điều độ"]) +
    make_stats([("Tổng lệnh trong ngày", "42 lệnh", "+6 so với kế hoạch"), ("Đang thực hiện", "26 lệnh", "Tiến độ 68%"), ("Chờ xuất phát", "8 lệnh", "Đã bàn giao chìa khóa"), ("Hoàn thành", "8 lệnh", "Đúng giờ 100%")]) +
    make_kanban([
        ("Chờ điều động", "8", [
            {"id": "LĐX-260823-031", "title": "Điều xe bồn Hino chở nước tưới", "subtitle": "XB-HN-045 · Đỗ Thanh Hải · Lô CAT-C04", "tag": "Chờ xuất bến", "pill_type": "pending", "time": "08:30"},
            {"id": "LĐX-260823-032", "title": "Điều máy ủi san gạt đường lô NT2", "subtitle": "MU-KM-015 · Keo Sarath · Trục D4", "tag": "Đã phê duyệt", "pill_type": "", "time": "09:00"}
        ]),
        ("Đã xuất phát / Đang đi", "12", [
            {"id": "LĐX-260823-024", "title": "Điều máy kéo cày ải đất trồng chuối", "subtitle": "XC-JD-024 · Nguyễn Văn Minh · Lô CN-A12", "tag": "Đang di chuyển", "pill_type": "", "time": "06:45"},
            {"id": "LĐX-260823-025", "title": "Điều xe tải Howo chở buồng chuối", "subtitle": "XT-HW-102 · Trần Quốc Huy · Packhouse 2", "tag": "Đang đến bãi", "pill_type": "", "time": "07:15"}
        ]),
        ("Đang thực hiện tại hiện trường", "14", [
            {"id": "LĐX-260823-018", "title": "Máy gặt Kubota thu hoạch ngô sinh khối", "subtitle": "MG-KB-018 · Lê Hoàng Nam · Lô SK-08", "tag": "Tiến độ 72%", "pill_type": "", "time": "07:30"},
            {"id": "LĐX-260823-019", "title": "Xe téc phun thuốc phòng trừ sâu bệnh", "subtitle": "XB-HN-088 · Phạm Quốc An · Lô CN-B06", "tag": "Tiến độ 55%", "pill_type": "", "time": "08:00"}
        ]),
        ("Hoàn thành / Nghiệm thu", "8", [
            {"id": "LĐX-260823-009", "title": "Cứu hộ kéo máy kéo hỏng về xưởng", "subtitle": "XT-CH-003 · Huỳnh Tấn Đạt · Xưởng BTSC", "tag": "Đã nghiệm thu", "pill_type": "", "time": "08:15"},
            {"id": "LĐX-260823-010", "title": "Vận chuyển phân hữu cơ bón lót", "subtitle": "XT-HN-079 · Võ Văn Thành · Lô A04", "tag": "Hoàn tất 100%", "pill_type": "", "time": "08:20"}
        ])
    ])
)

data_part1["pages/2-giam-sat-dieu-hanh/lenh-van-chuyen.html"] = (
    make_head("GIÁM SÁT & ĐIỀU HÀNH", "Lệnh vận chuyển", "Theo dõi điều phối các chuyến xe vận chuyển chuối buồng, vật tư, phân bón và thành phẩm.", ["↗ Xuất vận đơn", "＋ Tạo lệnh vận chuyển"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tuyến đường: Nội bộ KLH", "Trạng thái: Tất cả"]) +
    make_stats([("Tổng khối lượng (tấn)", "345.5 T", "Kế hoạch 380 T"), ("Số chuyến hoàn thành", "48 chuyến", "Trung bình 7.2 T/chuyến"), ("Đang trên đường", "16 xe", "Packhouse 1 & 2"), ("Thời gian quay vòng", "42 phút", "Nhanh hơn 8p")]) +
    make_table(
        ["MÃ VẬN ĐƠN", "LOẠI HÀNG HÓA", "XE & TÀI XẾ", "TUYẾN VẬN CHUYỂN", "KHỐI LƯỢNG", "TRẠNG THÁI"],
        [
            ["<b>LVC-260823-011</b><small>Tạo lúc 06:30</small>", "Chuối tươi xuất khẩu<small>Hàng cắt sáng sớm</small>", "<b>XT-HW-102</b><small>Trần Quốc Huy (Howo 4 chân)</small>", "Lô CN-A12 ➔ Packhouse 2<small>Cự ly 8.4 km</small>", "<b>14.2 tấn</b><small>320 sọt buồng</small>", make_pill("Đang vận chuyển", "")],
            ["<b>LVC-260823-012</b><small>Tạo lúc 07:15</small>", "Phân hữu cơ vi sinh<small>Phục vụ bón lót</small>", "<b>XT-HN-079</b><small>Võ Văn Thành (Hino 8 tấn)</small>", "Kho Trung tâm ➔ Lô CN-B06<small>Cự ly 4.5 km</small>", "<b>8.0 tấn</b><small>160 bao</small>", make_pill("Đang bốc hàng", "pending")],
            ["<b>LVC-260823-013</b><small>Tạo lúc 07:45</small>", "Túi bọc buồng & Xốp chuối<small>Vật tư đóng gói</small>", "<b>XT-HN-055</b><small>Sok Phearith (Hino 5 tấn)</small>", "Kho Phụ liệu ➔ Packhouse 1<small>Cự ly 3.2 km</small>", "<b>3.5 tấn</b><small>50 kiện</small>", make_pill("Đã giao hàng", "")],
            ["<b>LVC-260823-014</b><small>Tạo lúc 08:00</small>", "Chuối phụ phẩm (Cám chăn nuôi)<small>Chuyển trại bò</small>", "<b>XB-HD-062</b><small>Keo Sarath (Ben Hyundai)</small>", "Packhouse 2 ➔ Trại Bò Thịt 1<small>Cự ly 12.0 km</small>", "<b>15.0 tấn</b><small>Hàng rời</small>", make_pill("Chờ xuất bến", "pending")],
            ["<b>LVC-260823-015</b><small>Tạo lúc 08:20</small>", "Dầu Diesel DO 0.05S<small>Cấp bồn lưu động</small>", "<b>XN-DF-011</b><small>Phạm Quốc An (Xe téc dầu)</small>", "Kho Xăng dầu T1 ➔ Bãi Cơ giới NT2<small>Cự ly 6.8 km</small>", "<b>4.500 lít</b><small>Đầy téc</small>", make_pill("Đang vận chuyển", "")]
        ],
        "Tìm mã vận đơn, biển số xe, tài xế...",
        "Hiển thị 1–5 trên 48 chuyến vận chuyển"
    )
)

data_part1["pages/2-giam-sat-dieu-hanh/lich-dieu-xe.html"] = (
    make_head("GIÁM SÁT & ĐIỀU HÀNH", "Lịch điều xe", "Kế hoạch phân ca và bố trí phương tiện cơ giới theo tuần từ 17/08 đến 23/08/2026.", ["↗ In lịch tuần", "＋ Thêm ca điều xe"]) +
    make_filters(["Tuần 34 (17/08 - 23/08/2026)", "Toàn bộ xí nghiệp", "Đã chốt lịch"]) +
    make_stats([("Tổng ca máy đăng ký", "168 ca", "24 ca/ngày"), ("Ca làm đất & chuẩn bị", "72 ca", "42.8% tổng ca"), ("Ca thu hoạch chuối", "56 ca", "Ưu tiên sáng sớm"), ("Ca vận tải & tiếp liệu", "40 ca", "Phân bổ đều 2 ca")]) +
    make_calendar("17 – 23 tháng 08, 2026", [
        ("Thứ hai 17/08", [
            {"title": "Cày lật đất Lô CN-A12", "sub": "XC-JD-024 · Nguyễn Văn Minh", "time": "06:00 – 14:00 (Ca 1)"},
            {"title": "Chở chuối Packhouse 1", "sub": "XT-HW-102 · Trần Quốc Huy", "time": "07:00 – 16:30 (Ca ngày)"}
        ]),
        ("Thứ ba 18/08", [
            {"title": "Bừa phẳng & lên luống", "sub": "XC-KB-053 · Lê Hoàng Nam", "time": "06:30 – 14:30 (Ca 1)"},
            {"title": "Tưới nước Lô CAT-C04", "sub": "XB-HN-045 · Đỗ Thanh Hải", "time": "13:00 – 21:00 (Ca 2)"}
        ]),
        ("Thứ tư 19/08", [
            {"title": "Phun thuốc BVTV diện rộng", "sub": "XB-HN-088 · Phạm Quốc An", "time": "05:00 – 11:00 (Ca sáng sớm)"},
            {"title": "Chở phân hữu cơ NT2", "sub": "XT-HN-079 · Võ Văn Thành", "time": "07:30 – 17:00 (Ca ngày)"}
        ]),
        ("Thứ năm 20/08", [
            {"title": "Thu hoạch chuối Packhouse 2", "sub": "XT-HW-102 · Trần Quốc Huy", "time": "06:00 – 15:30 (Ca 1)"},
            {"title": "Bảo dưỡng định kỳ 500h", "sub": "XC-JD-024 · Xưởng BTSC", "time": "13:30 – 17:30 (Bảo dưỡng)"}
        ]),
        ("Thứ sáu 21/08", [
            {"title": "Rạch hàng bón phân lót", "sub": "XC-NH-031 · Sok Phearith", "time": "06:30 – 14:30 (Ca 1)"},
            {"title": "San gạt mặt bằng đường Lô B", "sub": "MU-KM-015 · Keo Sarath", "time": "07:00 – 16:00 (Ca ngày)"}
        ]),
        ("Thứ bảy 22/08", [
            {"title": "Thu hoạch ngô Lô SK-08", "sub": "MG-KB-018 · Lê Hoàng Nam", "time": "06:00 – 12:00 (Ca 1)"},
            {"title": "Vận chuyển chuối xuất khẩu", "sub": "XT-HW-102 · Trần Quốc Huy", "time": "07:30 – 17:30 (Ca ngày)"}
        ]),
        ("Chủ nhật 23/08", [
            {"title": "Tiếp nhiên liệu các đội xe", "sub": "XN-DF-011 · Phạm Quốc An", "time": "06:00 – 12:00 (Ca sáng)"},
            {"title": "Trực cứu hộ kỹ thuật", "sub": "XT-CH-003 · Huỳnh Tấn Đạt", "time": "24/24 (Trực ban)"}
        ])
    ])
)

# 3. KẾ HOẠCH SẢN XUẤT
data_part1["pages/3-ke-hoach-san-xuat/ke-hoach-tuan-ngay.html"] = (
    make_head("KẾ HOẠCH SẢN XUẤT", "Kế hoạch tuần/ngày", "Kế hoạch huy động máy móc cơ giới phục vụ làm đất, chăm sóc và thu hoạch nông nghiệp.", ["↗ Xuất kế hoạch", "＋ Lập kế hoạch mới"]) +
    make_filters(["Tuần 34 (17/08 - 23/08/2026)", "Xí nghiệp Chuối 1 & 2", "Đã duyệt ban giám đốc"]) +
    make_stats([("Tổng diện tích giao (ha)", "185.0 ha", "Đạt 92.5% kế hoạch"), ("Định mức ca máy", "240 giờ máy", "Trung bình 8h/xe/ngày"), ("Máy móc huy động", "32 đầu máy", "Máy kéo, máy gặt, xe ben"), ("Mức tiêu hao dầu dự kiến", "3.420 lít", "18.5 L/ha chuẩn")]) +
    make_calendar("Kế hoạch sản xuất Tuần 34 · KLH Koun Mom", [
        ("Thứ hai 17/08", [
            {"title": "Cày ải sâu 35cm - Lô CN-A12", "sub": "Kế hoạch 12 ha · 2 máy John Deere", "time": "Mục tiêu: Hoàn tất 100%"},
            {"title": "Phun vi sinh cải tạo đất", "sub": "Lô CN-A08 · Xe téc XB-HN-045", "time": "Mục tiêu: 15 ha"}
        ]),
        ("Thứ ba 18/08", [
            {"title": "Bừa phẳng & lên luống trồng chuối", "sub": "Lô CN-B06 · 3 máy Kubota M7040", "time": "Mục tiêu: 10 ha luống đôi"},
            {"title": "Vận chuyển cây giống từ vườn ươm", "sub": "3 xe tải Hino · 12.000 cây chuối", "time": "Giao về NT1"}
        ]),
        ("Thứ tư 19/08", [
            {"title": "Cày rạch hàng tra phân hữu cơ", "sub": "Lô CN-B06 · Máy kéo New Holland", "time": "Mục tiêu: 8.5 ha"},
            {"title": "Cắt cỏ trục đường lô chống cháy", "sub": "2 máy kéo gắn dàn cắt cỏ", "time": "Trục chính NT1"}
        ]),
        ("Thứ năm 20/08", [
            {"title": "Đào mương thoát nước mưa", "sub": "Lô C02 · Máy đào bánh xích CAT 320D", "time": "Khối lượng: 450 mét mương"},
            {"title": "Bảo dưỡng máy móc giữa tuần", "sub": "Tổ lưu động Xưởng BTSC", "time": "Kiểm tra 8 máy cày"}
        ]),
        ("Thứ sáu 21/08", [
            {"title": "Cày lật đất chuẩn bị trồng đợt 2", "sub": "Lô CAT-D09 · 2 máy John Deere", "time": "Mục tiêu: 14 ha"},
            {"title": "Phun dinh dưỡng qua lá", "sub": "Lô CN-A01 đến A04 · 2 xe bồn", "time": "Mục tiêu: 22 ha chuối"}
        ]),
        ("Thứ bảy 22/08", [
            {"title": "Thu hoạch bắp sinh khối thức ăn gia súc", "sub": "Lô SK-08 · Máy gặt Kubota DC-70G", "time": "Mục tiêu: 120 tấn bắp"},
            {"title": "Chở bắp về hố ủ chua Trại Bò", "sub": "4 xe ben Hyundai HD270", "time": "Quay vòng liên tục"}
        ]),
        ("Chủ nhật 23/08", [
            {"title": "Tổng vệ sinh máy nông cụ & xịt rửa", "sub": "Tất cả tài xế Đội 1 & Đội 2", "time": "Bãi rửa xe trung tâm"},
            {"title": "Giao ban nghiệm thu tuần", "sub": "Ban Quản đốc Xí nghiệp Cơ giới", "time": "16:00 tại Hội trường NT1"}
        ])
    ])
)

data_part1["pages/3-ke-hoach-san-xuat/lenh-san-xuat.html"] = (
    make_head("KẾ HOẠCH SẢN XUẤT", "Lệnh sản xuất", "Phát hành và quản lý các lệnh sản xuất cày, bừa, làm đất, gieo trồng và thu hoạch.", ["↗ Xuất biểu mẫu", "＋ Tạo lệnh sản xuất"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả xí nghiệp", "Đang chạy"]) +
    make_stats([("Lệnh đang hiệu lực", "28 lệnh", "Hoàn thành 14 lệnh"), ("Diện tích đang làm", "112.5 ha", "Tiến độ đạt 74%"), ("Giờ máy thực hiện", "192 giờ", "Định mức 210h"), ("Tiết kiệm nhiên liệu", "+5.2%", "Dưới định mức khoán")]) +
    make_kanban([
        ("Tiếp nhận / Giao việc", "6", [
            {"id": "LSX-260823-01", "title": "Cày ải sâu đất cát pha", "subtitle": "Lô CN-A14 (15.0 ha) · John Deere 6140B", "tag": "Chờ giao máy", "pill_type": "pending", "time": "06:00"},
            {"id": "LSX-260823-02", "title": "Bừa ngấu san phẳng mặt lô", "subtitle": "Lô CN-B02 (12.5 ha) · Kubota M7040", "tag": "Đã nhận lệnh", "pill_type": "", "time": "06:30"}
        ]),
        ("Đang triển khai trên đồng", "14", [
            {"id": "LSX-260823-03", "title": "Lên luống đôi trồng chuối mô", "subtitle": "Lô CN-A12 (24.0 ha) · XC-JD-024 (Nguyễn Văn Minh)", "tag": "Đạt 72%", "pill_type": "", "time": "07:00"},
            {"id": "LSX-260823-04", "title": "Phun chế phẩm sinh học Trichoderma", "subtitle": "Lô CN-A08 (18.0 ha) · XB-HN-045 (Phạm Quốc An)", "tag": "Đạt 85%", "pill_type": "", "time": "07:30"}
        ]),
        ("Chờ nghiệm thu khối lượng", "5", [
            {"id": "LSX-260823-05", "title": "Cày rạch hàng bón lót vi sinh", "subtitle": "Lô CN-C04 (10.0 ha) · XC-NH-031 (Sok Phearith)", "tag": "Đã xong 100%", "pill_type": "", "time": "11:30"},
            {"id": "LSX-260823-06", "title": "Đào rãnh thoát nước phụ", "subtitle": "Lô CAT-D09 (800m) · MD-CT-028 (Võ Văn Thành)", "tag": "Chờ đo đạc", "pill_type": "pending", "time": "12:00"}
        ]),
        ("Đã nghiệm thu / Lưu trữ", "8", [
            {"id": "LSX-260822-18", "title": "Cày vỡ đất hoang mở rộng NT2", "subtitle": "Lô MR-01 (30.0 ha) · Tổ máy 4 xe John Deere", "tag": "Đạt chất lượng", "pill_type": "", "time": "Hôm qua"},
            {"id": "LSX-260822-19", "title": "Thu hoạch ngô hạt giống", "subtitle": "Lô SK-06 (18.0 ha) · MG-KB-018 (Lê Hoàng Nam)", "tag": "Đã nhập kho", "pill_type": "", "time": "Hôm qua"}
        ])
    ])
)

data_part1["pages/3-ke-hoach-san-xuat/phan-cong-thuc-hien.html"] = (
    make_head("KẾ HOẠCH SẢN XUẤT", "Phân công thực hiện", "Bố trí ghép cặp lái xe, đầu máy kéo/xe tải và dàn nông cụ cơ giới đính kèm.", ["↗ Xuất bảng phân công", "＋ Phân công ca máy"]) +
    make_filters(["Hôm nay, 23/08/2026", "Đội Cơ giới 1 & 2", "Trạng thái: Đã duyệt"]) +
    make_stats([("Lái xe đã phân công", "42 tài xế", "100% quân số có mặt"), ("Đầu máy ghép nối", "38 phương tiện", "32 máy kéo + 6 xe tải"), ("Nông cụ gắn kèm", "38 bộ", "Chảo cày, dàn bừa, thùng bồn"), ("Thời gian xuất quân", "05:45 sáng", "Đúng giờ 100%")]) +
    make_kanban([
        ("Đội Xe Cơ Giới 1 (NT1)", "18", [
            {"id": "PC-01", "title": "Máy kéo JD 6140B + Dàn cày 4 chảo", "subtitle": "Tài xế chính: Nguyễn Văn Minh · Phụ lái: Keo Sarath", "tag": "Lô CN-A12", "pill_type": "", "time": "06:00 - 14:00"},
            {"id": "PC-02", "title": "Máy kéo Kubota M7040 + Dàn bừa 24 chảo", "subtitle": "Tài xế: Lê Hoàng Nam · Lô CN-B06", "tag": "Lô CN-B06", "pill_type": "", "time": "06:00 - 14:00"}
        ]),
        ("Đội Xe Cơ Giới 2 (NT2)", "14", [
            {"id": "PC-03", "title": "Máy kéo New Holland + Dàn lên luống", "subtitle": "Tài xế: Sok Phearith · Lô CAT-D09", "tag": "Lô CAT-D09", "pill_type": "", "time": "06:30 - 14:30"},
            {"id": "PC-04", "title": "Xe téc Hino 15m3 + Dàn phun cần 18m", "subtitle": "Tài xế: Phạm Quốc An · Lô CN-A08", "tag": "Lô CN-A08", "pill_type": "", "time": "05:30 - 11:30"}
        ]),
        ("Đội Xe Vận Tải Nặng", "6", [
            {"id": "PC-05", "title": "Xe tải Howo 4 chân + Thùng mui bạt", "subtitle": "Tài xế: Trần Quốc Huy · Chở chuối Packhouse 2", "tag": "Tuyến NT1 - PH2", "pill_type": "", "time": "07:00 - 17:00"},
            {"id": "PC-06", "title": "Xe ben Hyundai HD270 15T", "subtitle": "Tài xế: Võ Văn Thành · Chở phân bón bãi ủ", "tag": "Kho ➔ Lô A12", "pill_type": "", "time": "07:00 - 17:00"}
        ]),
        ("Đội Xe Thi Công & BTSC", "4", [
            {"id": "PC-07", "title": "Máy đào bánh xích CAT 320D + Gầu múc 0.9m3", "subtitle": "Thợ máy: Đỗ Thanh Hải · Nạo vét kênh T3", "tag": "Kênh T3", "pill_type": "", "time": "07:00 - 16:30"},
            {"id": "PC-08", "title": "Xe bồn cấp dầu Dongfeng 5m3", "subtitle": "Tài xế kiêm thủ kho: Huỳnh Tấn Đạt", "tag": "Cấp lưu động", "pill_type": "", "time": "06:00 - 18:00"}
        ])
    ])
)

data_part1["pages/3-ke-hoach-san-xuat/xac-nhan-khoi-luong.html"] = (
    make_head("KẾ HOẠCH SẢN XUẤT", "Xác nhận khối lượng", "Nghiệm thu diện tích cày bừa, giờ máy nổ thực tế qua GPS và chất lượng hoàn thành.", ["↗ Xuất biên bản", "✓ Phê duyệt nghiệm thu"]) +
    make_filters(["Kỳ nghiệm thu: 16/08 - 23/08", "Đơn vị: Toàn KLH", "Trạng thái: Chờ duyệt"]) +
    make_stats([("Diện tích hoàn thành", "182.4 ha", "Đạt 98.6% kế hoạch"), ("Sai lệch đo GPS", "±1.2%", "Độ chính xác cao"), ("Giờ máy nghiệm thu", "1.420 giờ", "Trung bình 7.8h/ha"), ("Tỷ lệ đạt chuẩn kỹ thuật", "99.2%", "Chỉ 1.5 ha cày lại")]) +
    make_table(
        ["MÃ LỆNH / XE", "CÔNG VIỆC THỰC HIỆN", "VỊ TRÍ LÔ THỬA", "DIỆN TÍCH / KHỐI LƯỢNG", "GIỜ MÁY GPS", "ĐÁNH GIÁ KỸ THUẬT", "TRẠNG THÁI"],
        [
            ["<b>LSX-260823-03</b><small>XC-JD-024 (Nguyễn Văn Minh)</small>", "Cày lật đất sâu 35cm<small>Chảo cày 4 đĩa</small>", "Lô CN-A12<small>XN Chuối 1</small>", "<b>24.0 ha</b><small>Giao 24.0 ha</small>", "<b>18.5 giờ</b><small>0.77 h/ha</small>", "<b style='color:var(--green2)'>Đạt độ sâu & tơi xốp</b>", make_pill("Đã duyệt", "")],
            ["<b>LSX-260823-04</b><small>XC-KB-053 (Lê Hoàng Nam)</small>", "Bừa phẳng & lên luống đôi<small>Dàn bừa đĩa</small>", "Lô CN-B06<small>XN Chuối 1</small>", "<b>18.2 ha</b><small>Giao 18.0 ha (+0.2)</small>", "<b>14.2 giờ</b><small>0.78 h/ha</small>", "<b style='color:var(--green2)'>Luống thẳng, rãnh sâu</b>", make_pill("Đã duyệt", "")],
            ["<b>LSX-260823-05</b><small>XB-HN-045 (Phạm Quốc An)</small>", "Phun vi sinh cải tạo đất<small>Bồn 15m3 cần phun 18m</small>", "Lô CN-A08<small>XN Chuối 1</small>", "<b>15.0 ha</b><small>Giao 15.0 ha</small>", "<b>6.0 giờ</b><small>Phun đều tán</small>", "<b style='color:var(--green2)'>Phun đúng nồng độ</b>", make_pill("Đã duyệt", "")],
            ["<b>LSX-260823-06</b><small>XC-NH-031 (Sok Phearith)</small>", "Cày rạch hàng bón lót<small>Dàn rạch 2 hàng</small>", "Lô CAT-D09<small>XN Cây ăn trái</small>", "<b>10.5 ha</b><small>Giao 12.0 ha (Mưa ngắt)</small>", "<b>9.0 giờ</b><small>Tạm dừng ca chiều</small>", "<b style='color:var(--amber)'>Còn tồn 1.5 ha dở dang</b>", make_pill("Chờ nghiệm thu bù", "pending")],
            ["<b>LSX-260823-07</b><small>MD-CT-028 (Võ Văn Thành)</small>", "Đào kênh thoát lũ nội đồng<small>Gầu đào 0.9m3</small>", "Kênh T3 - Lô C02<small>Thủy lợi KLH</small>", "<b>650 mét</b><small>Giao 600 mét</small>", "<b>16.0 giờ</b><small>Khối lượng đào 1.800m3</small>", "<b style='color:var(--green2)'>Đúng cao độ thiết kế</b>", make_pill("Đã duyệt", "")]
        ],
        "Tìm mã lệnh sản xuất, số xe, tên lô thửa...",
        "Hiển thị 1–5 trên 28 biên bản nghiệm thu"
    )
)

data_part1["pages/3-ke-hoach-san-xuat/lich-su-dieu-chinh.html"] = (
    make_head("KẾ HOẠCH SẢN XUẤT", "Lịch sử điều chỉnh", "Nhật ký truy vết các lần sửa đổi kế hoạch sản xuất, thay đổi máy móc và điều phối khẩn cấp.", ["↗ Xuất nhật ký", "🔍 Tìm theo ngày"]) +
    make_filters(["Tháng 08/2026", "Tất cả lý do điều chỉnh", "Đã ghi nhận Audit Trail"]) +
    make_stats([("Tổng lần điều chỉnh", "18 lần", "Do thời tiết mưa 12 lần"), ("Đổi phương tiện", "8 ca", "Do sự cố hỏng vặt"), ("Chuyển đổi lô canh tác", "6 lần", "Ưu tiên vụ mùa"), ("Người điều chỉnh", "Quản đốc & Điều độ", "100% có phê duyệt")]) +
    make_timeline([
        ("Điều chỉnh hoãn lệnh cày do mưa dông lớn", "Lệnh LSX-260823-06 tại Lô CAT-D09 tạm dừng cày rạch hàng từ 14:00. Diện tích 1.5 ha còn lại chuyển sang ca sáng 24/08.", "23/08/2026 · 14:20 · Người duyệt: Nguyễn Văn Hải (Quản đốc XN Cây ăn trái)", "Xem biên bản"),
        ("Thay thế đầu máy kéo do thủng lốp", "Thay thế máy kéo XC-NH-031 bằng máy kéo dự phòng XC-KB-042 để tiếp tục công việc tại Lô CN-B06.", "23/08/2026 · 09:15 · Người duyệt: Lê Minh Tâm (Trưởng phòng Cơ giới)", "Chi tiết xe"),
        ("Bổ sung thêm 2 xe Howo vận chuyển chuối", "Do sản lượng cắt chuối tại Nông trường 1 tăng đột biến 35 tấn, điều động thêm 2 xe Howo từ Đội Xe Nặng.", "22/08/2026 · 10:30 · Người duyệt: Trần Quang Vinh (Giám đốc Vận hành KLH)", "Xem lệnh điều"),
        ("Điều chỉnh định mức tiêu hao nhiên liệu cày đất sét cứng", "Nâng định mức từ 18.5 L/ha lên 20.0 L/ha đối với Lô đất mới khai hoang MR-01 do tầng đất cứng và nhiều rễ cây.", "21/08/2026 · 16:45 · Người duyệt: Hội đồng Kỹ thuật KLH Koun Mom", "Xem quyết định"),
        ("Chuyển đổi công việc từ bừa sang đào mương khẩn cấp", "Điều động máy đào CAT 320D từ việc tạo cảnh quan sang nạo vét kênh tiêu nước chống ngập úng Nông trường 2.", "20/08/2026 · 08:00 · Người duyệt: Ban Quản đốc KLH", "Xem lệnh khẩn")
    ])
)

# 4. VẬN CHUYỂN NỘI BỘ
data_part1["pages/4-van-chuyen-noi-bo/yeu-cau-van-chuyen.html"] = (
    make_head("VẬN CHUYỂN NỘI BỘ", "Yêu cầu vận chuyển", "Tiếp nhận các yêu cầu điều xe chở chuối buồng, phân bón, thuốc BVTV từ các nông trường.", ["↗ Xuất tổng hợp", "＋ Gửi yêu cầu vận chuyển"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả nông trường", "Đang chờ điều phối"]) +
    make_stats([("Yêu cầu trong ngày", "36 phiếu", "+8 phiếu buổi sáng"), ("Đã đáp ứng xếp xe", "28 phiếu", "Tỷ lệ đáp ứng 77.8%"), ("Đang bốc hàng tại bãi", "6 điểm", "Ưu tiên Packhouse 1 & 2"), ("Khối lượng yêu cầu", "420 tấn", "Chuối 310T · Vật tư 110T")]) +
    make_kanban([
        ("Yêu cầu mới gửi", "8", [
            {"id": "YCC-260823-01", "title": "Cần 3 xe tải chở 45 tấn chuối cắt sớm", "subtitle": "Nông trường 1 (Lô A12) ➔ Packhouse 2 · Cần xe lúc 09:00", "tag": "Ưu tiên cao", "pill_type": "danger", "time": "08:10"},
            {"id": "YCC-260823-02", "title": "Chở 20 tấn phân vi sinh từ kho trung tâm", "subtitle": "Kho T1 ➔ Bãi tập kết Lô B06 · Cần xe lúc 10:30", "tag": "Bình thường", "pill_type": "", "time": "08:25"}
        ]),
        ("Đã xếp xe & Phân tài", "12", [
            {"id": "YCC-260823-03", "title": "Vận chuyển 15 tấn chuối phụ phẩm đi trại bò", "subtitle": "Packhouse 1 ➔ Trại Bò Thịt · Đã phân xe XB-HD-062", "tag": "Đã điều xe", "pill_type": "", "time": "08:30"},
            {"id": "YCC-260823-04", "title": "Chuyển 5.000 cây chuối giống ra đồng", "subtitle": "Vườn ươm ➔ Lô A14 · Đã phân xe XT-HN-055", "tag": "Đã điều xe", "pill_type": "", "time": "08:45"}
        ]),
        ("Đang vận chuyển", "10", [
            {"id": "YCC-260823-05", "title": "Chở 14 tấn chuối buồng xuất khẩu", "subtitle": "Lô A04 ➔ Packhouse 2 · Xe XT-HW-102 (Trần Quốc Huy)", "tag": "Trên đường", "pill_type": "", "time": "07:30"},
            {"id": "YCC-260823-06", "title": "Cấp 4.000 lít dầu Diesel cho trạm NT2", "subtitle": "Kho Xăng dầu ➔ NT2 · Xe téc XN-DF-011 (Phạm Quốc An)", "tag": "Gần đến nơi", "pill_type": "", "time": "08:00"}
        ]),
        ("Đã giao hàng hoàn tất", "6", [
            {"id": "YCC-260823-07", "title": "Giao 200 cuộn dây nilon chằng chuối", "subtitle": "Kho Vật tư ➔ Đội Bảo vệ thực vật NT1", "tag": "Đã ký nhận", "pill_type": "", "time": "07:45"},
            {"id": "YCC-260823-08", "title": "Chở 12 tấn sầu riêng thu hoạch sớm", "subtitle": "Nông trường CAT ➔ Kho Lạnh Trung tâm", "tag": "Đã lưu kho", "pill_type": "", "time": "08:15"}
        ])
    ])
)

data_part1["pages/4-van-chuyen-noi-bo/ke-hoach-phan-bo-xe.html"] = (
    make_head("VẬN CHUYỂN NỘI BỘ", "Kế hoạch phân bổ xe", "Phân bổ số lượng đầu xe tải, xe ben, xe kéo chuyên dụng cho từng xí nghiệp và tuyến đường.", ["↗ Xuất ma trận phân bổ", "＋ Lập kế hoạch mới"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả các đội xe", "Trạng thái: Đang chạy"]) +
    make_stats([("Xe tải thùng Howo/Hino", "24 xe", "Phân bổ chở chuối 18 xe"), ("Xe ben chở vật liệu", "8 xe", "Phân bón & đất đá"), ("Xe téc nước & hóa chất", "6 xe", "Phục vụ tưới & phun"), ("Hiệu suất sử dụng xe", "91.5%", "Vượt chỉ tiêu 85%")]) +
    make_table(
        ["ĐƠN VỊ / XÍ NGHIỆP", "LOẠI XE PHÂN BỔ", "SỐ LƯỢNG XE", "TUYẾN VẬN HÀNH CHÍNH", "TẢI TRỌNG TRUNG BÌNH", "TRƯỞNG ĐỘI XE", "TRẠNG THÁI"],
        [
            ["<b>Xí nghiệp Chuối 1</b><small>Diện tích canh tác 1.200 ha</small>", "Xe tải Howo 4 chân (371 HP)<small>Thùng mui bạt chở sọt chuối</small>", "<b>10 xe</b><small>XT-HW-101 đến 110</small>", "Lô A01-A20 ➔ Packhouse 1 & 2<small>Cự ly 5 - 9 km</small>", "<b>14.0 tấn / chuyến</b>", "Nguyễn Văn Minh<small>0982.112.334</small>", make_pill("Đang hoạt động", "")],
            ["<b>Xí nghiệp Chuối 2</b><small>Diện tích canh tác 950 ha</small>", "Xe tải Hino 500 (8 tấn)<small>Chở nông sản & vật tư</small>", "<b>8 xe</b><small>XT-HN-071 đến 078</small>", "Lô B01-B15 ➔ Packhouse 2<small>Cự ly 6 - 11 km</small>", "<b>8.5 tấn / chuyến</b>", "Trần Quốc Huy<small>0973.224.556</small>", make_pill("Đang hoạt động", "")],
            ["<b>Xí nghiệp Cây ăn trái</b><small>Sầu riêng, mít, xoài (600 ha)</small>", "Xe tải Hino 5 tấn có bửng nâng<small>Chở trái cây nhẹ, chống dập</small>", "<b>4 xe</b><small>XT-HN-051 đến 054</small>", "Vườn cây ➔ Nhà sơ chế Packhouse CAT<small>Cự ly 4 km</small>", "<b>5.0 tấn / chuyến</b>", "Sok Phearith<small>088.334.889</small>", make_pill("Đang hoạt động", "")],
            ["<b>Nhà máy Sản xuất Phân bón</b><small>Công suất 200 tấn/ngày</small>", "Xe ben Hyundai HD270 15T<small>Thùng ben chở phân rời</small>", "<b>6 xe</b><small>XB-HD-061 đến 066</small>", "Nhà máy ủ phân ➔ Bãi tập kết lô<small>Cự ly 3 - 8 km</small>", "<b>15.0 tấn / chuyến</b>", "Võ Văn Thành<small>0918.445.667</small>", make_pill("Đang hoạt động", "")],
            ["<b>Đội Thi công Công trình & Cứu hộ</b><small>Xưởng Cơ giới Trung tâm</small>", "Xe đầu kéo chuyên dùng & Xe cẩu<small>Chở máy cày, máy gặt, máy ủi</small>", "<b>2 xe đầu kéo</b><small>DK-HD-001, DK-HD-002</small>", "Xưởng BTSC ➔ Hiện trường toàn KLH<small>Cự ly toàn vùng</small>", "<b>30.0 tấn / chuyến</b>", "Huỳnh Tấn Đạt<small>0903.778.990</small>", make_pill("Trực sẵn sàng", "")]
        ],
        "Tìm đơn vị, loại xe, tuyến đường...",
        "Hiển thị 5 đơn vị phân bổ xe cơ giới"
    )
)

data_part1["pages/4-van-chuyen-noi-bo/dieu-phoi-van-chuyen.html"] = (
    make_head("VẬN CHUYỂN NỘI BỘ", "Điều phối vận chuyển", "Bảng điều phối trực quan luồng phương tiện vận tải theo thời gian thực tại các trạm cân & Packhouse.", ["↗ Xem sơ đồ bãi", "＋ Điều xe khẩn"]) +
    make_filters(["Hôm nay, 23/08/2026", "Điểm đến: Packhouse 1 & 2", "Trực ban điều độ: Chau Tiểu Long"]) +
    make_stats([("Chuyến đang điều phối", "24 chuyến", "18 chuyến chuối tươi"), ("Tồn bốc tại vườn", "45 tấn", "Cần thêm 3 xe"), ("Tồn chờ bốc tại Packhouse", "2 xe", "Thời gian chờ 8 phút"), ("Thời gian bốc dỡ TB", "22 phút/xe", "Nhanh hơn quy chuẩn 5p")]) +
    make_kanban([
        ("Đang xếp hàng tại Lô / Vườn", "6", [
            {"id": "ĐP-01", "title": "Bốc 320 sọt chuối buồng", "subtitle": "Lô CN-A12 · Xe XT-HW-102 (Trần Quốc Huy)", "tag": "Đã bốc 60%", "pill_type": "", "time": "08:15"},
            {"id": "ĐP-02", "title": "Bốc 160 bao phân vi sinh", "subtitle": "Kho T1 · Xe XT-HN-079 (Võ Văn Thành)", "tag": "Bắt đầu bốc", "pill_type": "pending", "time": "08:25"}
        ]),
        ("Đang chạy trên đường", "10", [
            {"id": "ĐP-03", "title": "Chở chuối về Packhouse 2", "subtitle": "Trục chính NT1 · Xe XT-HW-104 (Lê Hoàng Nam) · 28 km/h", "tag": "Dự kiến đến 08:45", "pill_type": "", "time": "08:05"},
            {"id": "ĐP-04", "title": "Chở sầu riêng về Kho Lạnh", "subtitle": "Trục NT-CAT · Xe XT-HN-051 (Sok Phearith) · 25 km/h", "tag": "Dự kiến đến 08:50", "pill_type": "", "time": "08:10"}
        ]),
        ("Đang cân hàng & Dỡ hàng", "4", [
            {"id": "ĐP-05", "title": "Cân tổng tải tại Trạm Cân T1", "subtitle": "Trạm Cân 1 · Xe XT-HW-101 (Phạm Quốc An)", "tag": "Tổng tải 28.4T", "pill_type": "", "time": "08:20"},
            {"id": "ĐP-06", "title": "Dỡ sọt chuối vào dây chuyền Packhouse 1", "subtitle": "Cửa nhập số 3 · Xe XT-HW-103 (Đỗ Thanh Hải)", "tag": "Đang dỡ hàng", "pill_type": "", "time": "08:10"}
        ]),
        ("Hoàn tất / Quay đầu chuyến mới", "8", [
            {"id": "ĐP-07", "title": "Cân bì & Xuất phiếu cân điện tử", "subtitle": "Trạm Cân 2 · Xe XT-HW-105 · Tải tịnh 14.1 tấn", "tag": "Đã chốt phiếu", "pill_type": "", "time": "08:05"},
            {"id": "ĐP-08", "title": "Quay đầu về Lô A15 bốc chuyến 2", "subtitle": "Xe XT-HN-072 · Tài xế Keo Sarath", "tag": "Đang quay đầu", "pill_type": "", "time": "08:18"}
        ])
    ])
)

data_part1["pages/4-van-chuyen-noi-bo/theo-doi-chuyen.html"] = (
    make_head("VẬN CHUYỂN NỘI BỘ", "Theo dõi chuyến xe", "Bản đồ theo dõi các đoàn xe vận tải chuyên dụng di chuyển giữa các nông trường và nhà máy đóng gói.", ["↗ Toàn màn hình", "⚡ Cảnh báo chậm chuyến"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tuyến đường chính", "GPS trực tiếp"]) +
    make_stats([("Xe đang lăn bánh", "16 xe", "Vận tốc TB 24 km/h"), ("Đúng lộ trình", "100%", "0 xe lệch tuyến"), ("Chuyến hoàn thành hôm nay", "48 chuyến", "Khối lượng 345 tấn"), ("Tiêu hao nhiên liệu TB", "28.5 L/100km", "Chuẩn định mức 30L")]) +
    make_map([
        {"code": "XT-HW-102 (Chở 14T chuối)", "sub": "Đang trên đường trục chính NT1 -> Packhouse 2 · 28 km/h", "is_red": False, "left": 28, "top": 40, "marker": "HW02"},
        {"code": "XT-HN-079 (Chở 8T phân bón)", "sub": "Kho T1 -> Lô CN-B06 · Vận tốc 22 km/h", "is_red": False, "left": 52, "top": 30, "marker": "HN79"},
        {"code": "XB-HD-062 (Chở 15T cám bã)", "sub": "Packhouse 2 -> Trại Bò · Vận tốc 32 km/h", "is_red": False, "left": 72, "top": 62, "marker": "HD62"},
        {"code": "XT-HW-101 (Đang chờ tại trạm cân)", "sub": "Trạm cân số 1 · Cân xe lúc 08:35 (Đã dừng 6 phút)", "is_amber": True, "left": 40, "top": 75, "marker": "TC1"},
        {"code": "XN-DF-011 (Xe bồn cấp dầu)", "sub": "Đang cấp dầu lưu động tại Bãi đỗ Lô A12", "is_red": False, "left": 18, "top": 20, "marker": "DF11"}
    ], "Giám sát 16 xe vận chuyển nội bộ đang hoạt động · Cập nhật vị trí GPS mỗi 10 giây")
)

data_part1["pages/4-van-chuyen-noi-bo/xac-nhan-so-luong.html"] = (
    make_head("VẬN CHUYỂN NỘI BỘ", "Xác nhận số lượng (Phiếu cân)", "Đối chiếu số lượng buồng chuối, số sọt, trọng lượng qua trạm cân điện tử và chữ ký nghiệm thu.", ["↗ Xuất báo cáo cân", "＋ Tạo phiếu cân"]) +
    make_filters(["Hôm nay, 23/08/2026", "Trạm Cân số 1 & 2", "Trạng thái: Đã cân"]) +
    make_stats([("Tổng khối lượng cân hôm nay", "345.5 Tấn", "34 phiếu cân hoàn tất"), ("Trọng lượng chuối tịnh", "285.2 Tấn", "Tỷ lệ hao hụt 0.3%"), ("Khối lượng phân & vật tư", "60.3 Tấn", "100% khớp hóa đơn"), ("Độ chính xác cảm biến cân", "99.98%", "Đã hiệu chuẩn 15/08")]) +
    make_table(
        ["SỐ PHIẾU CÂN", "PHƯƠNG TIỆN & LÁI XE", "LOẠI HÀNG HÓA", "TỔNG TRỌNG (TẤN)", "TRỌNG BÌ (TẤN)", "TRỌNG TỊNH (TẤN)", "ĐIỂM GIAO / NHẬN", "TRẠNG THÁI"],
        [
            ["<b>PC-260823-088</b><small>08:15:22 · Cân 1</small>", "<b>XT-HW-102</b><small>Trần Quốc Huy (Howo)</small>", "Chuối buồng tươi<small>320 sọt nhựa</small>", "<b>28.45 T</b>", "<b>14.25 T</b>", "<b style='color:var(--green2)'>14.20 T</b>", "Lô A12 ➔ Packhouse 2", make_pill("Đã xác nhận", "")],
            ["<b>PC-260823-089</b><small>08:22:10 · Cân 2</small>", "<b>XT-HW-104</b><small>Lê Hoàng Nam (Howo)</small>", "Chuối buồng tươi<small>315 sọt nhựa</small>", "<b>28.10 T</b>", "<b>14.20 T</b>", "<b style='color:var(--green2)'>13.90 T</b>", "Lô A08 ➔ Packhouse 2", make_pill("Đã xác nhận", "")],
            ["<b>PC-260823-090</b><small>08:30:45 · Cân 1</small>", "<b>XT-HN-079</b><small>Võ Văn Thành (Hino)</small>", "Phân hữu cơ vi sinh<small>160 bao 50kg</small>", "<b>14.80 T</b>", "<b>6.80 T</b>", "<b style='color:var(--green2)'>8.00 T</b>", "Kho T1 ➔ Lô B06", make_pill("Đã xác nhận", "")],
            ["<b>PC-260823-091</b><small>08:38:00 · Cân 2</small>", "<b>XB-HD-062</b><small>Keo Sarath (Ben HD)</small>", "Chuối phụ phẩm dập<small>Hàng rời bã chuối</small>", "<b>26.50 T</b>", "<b>11.50 T</b>", "<b style='color:var(--green2)'>15.00 T</b>", "Packhouse 1 ➔ Trại Bò 1", make_pill("Đã xác nhận", "")],
            ["<b>PC-260823-092</b><small>08:44:15 · Cân 1</small>", "<b>XT-HN-051</b><small>Sok Phearith (Hino)</small>", "Sầu riêng Ri6 tuyển chọn<small>120 sọt sầu riêng</small>", "<b>10.20 T</b>", "<b>5.10 T</b>", "<b style='color:var(--green2)'>5.10 T</b>", "Lô CAT-C04 ➔ Kho Lạnh", make_pill("Chờ thủ kho ký", "pending")]
        ],
        "Tìm số phiếu cân, biển số xe, tên hàng...",
        "Hiển thị 1–5 trên 34 phiếu cân điện tử"
    )
)

print("Part 1 data defined successfully:", len(data_part1), "pages.")
