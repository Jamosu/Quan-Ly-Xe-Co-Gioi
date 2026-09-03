# -*- coding: utf-8 -*-
"""Part 2: Đội xe, Lái xe, Bảo trì - Sửa chữa"""
from mockup_helpers import make_pill, make_stats, make_filters, make_head, make_table, make_kanban, make_calendar, make_map, make_analytics, make_timeline, make_settings

data_part2 = {}

# 5. ĐỘI XE
data_part2["pages/5-doi-xe/danh-sach-xe.html"] = (
    make_head("ĐỘI XE", "Danh sách xe & Máy cơ giới", "Quản lý danh mục toàn bộ 128 phương tiện cơ giới, máy kéo nông nghiệp, xe tải và máy công trình.", ["↗ Xuất Excel", "＋ Thêm phương tiện mới"]) +
    make_filters(["Tất cả đơn vị (128 xe)", "Loại xe: Tất cả", "Trạng thái: Hoạt động"]) +
    make_stats([("Tổng phương tiện", "128 xe", "+4 xe mới tuần này"), ("Đang hoạt động trên đồng", "86 xe", "Tỷ lệ 67.2%"), ("Đang bảo dưỡng / sửa chữa", "15 xe", "11 xe định kỳ · 4 xe hỏng"), ("Mất tín hiệu GPS", "6 xe", "Đang cử thợ kiểm tra")]) +
    make_table(
        ["MÃ PHƯƠNG TIỆN", "CHỦNG LOẠI XE", "ĐƠN VỊ QUẢN LÝ", "TÀI XẾ PHỤ TRÁCH", "ODO / GIỜ MÁY", "MỨC NHIÊN LIỆU", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b><small>VIN: JD6140B-9982</small>", "Máy kéo John Deere 6140B<small>Công suất 140 HP · Năm 2024</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Nguyễn Văn Minh<small>0982.112.334</small>", "<b>2.450 giờ</b><small>+7.5h hôm nay</small>", "<span style='color:var(--green2)'>78% (140L)</span>", make_pill("Đang hoạt động", "")],
            ["<b>XT-HW-102</b><small>Biển: 51C-892.34</small>", "Xe tải Howo 4 chân 371HP<small>Thùng mui bạt 15 tấn · 2023</small>", "Đội Vận tải Nặng<small>KLH Koun Mom</small>", "Trần Quốc Huy<small>0973.224.556</small>", "<b>148.200 km</b><small>+124 km hôm nay</small>", "<span style='color:var(--green2)'>65% (195L)</span>", make_pill("Đang hoạt động", "")],
            ["<b>XC-KB-053</b><small>VIN: KBM7040-4412</small>", "Máy kéo Kubota M7040<small>Công suất 70 HP · Năm 2023</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Lê Hoàng Nam<small>0964.882.119</small>", "<b>3.120 giờ</b><small>+6.0h hôm nay</small>", "<span style='color:var(--amber)'>24% (20L)</span>", make_pill("Đang dừng chờ dầu", "pending")],
            ["<b>XT-HN-079</b><small>Biển: 77C-124.58</small>", "Xe tải Hino 500 (8 tấn)<small>Thùng kín chở chuối · 2022</small>", "Đội Vận tải NT2<small>XN Chuối 2</small>", "Sok Phearith<small>088.334.889</small>", "<b>92.400 km</b><small>Chạy vượt tốc 38km/h</small>", "<span style='color:var(--green2)'>82% (110L)</span>", make_pill("Cảnh báo tốc độ", "danger")],
            ["<b>MG-KB-018</b><small>VIN: DC70G-3319</small>", "Máy gặt đập Kubota DC-70G<small>Gặt ngô & lúa giống · 2024</small>", "Đội Cơ giới 2 (NT2)<small>XN Cây ăn trái</small>", "Phạm Quốc An<small>0912.339.882</small>", "<b>1.150 giờ</b><small>+5.2h hôm nay</small>", "<span style='color:var(--green2)'>90% (80L)</span>", make_pill("Đang hoạt động", "")],
            ["<b>XB-HD-062</b><small>Biển: 60C-556.78</small>", "Xe ben Hyundai HD270 15T<small>Thùng ben chở vật liệu · 2021</small>", "Đội Thi công Thủy lợi<small>KLH Koun Mom</small>", "Keo Sarath<small>097.445.112</small>", "<b>210.500 km</b><small>Đang tại Xưởng BTSC</small>", "<span style='color:var(--muted)'>15% (35L)</span>", make_pill("Đang bảo dưỡng", "pending")]
        ],
        "Tìm mã xe, biển số, loại xe, tài xế...",
        "Hiển thị 1–6 trên 128 phương tiện cơ giới"
    )
)

data_part2["pages/5-doi-xe/phan-xe.html"] = (
    make_head("ĐỘI XE", "Phân xe cho đơn vị", "Quản lý phân bổ và bàn giao phương tiện cơ giới về các Xí nghiệp, Nông trường và Xưởng dịch vụ.", ["↗ Xuất quyết định phân xe", "＋ Bàn giao xe mới"]) +
    make_filters(["Tất cả xí nghiệp", "Đợt phân bổ: Quý 3/2026", "Đã ký biên bản"]) +
    make_stats([("Xe phân về XN Chuối 1", "46 xe", "32 máy kéo · 14 xe tải"), ("Xe phân về XN Chuối 2", "38 xe", "26 máy kéo · 12 xe tải"), ("Xe phân về XN Cây ăn trái", "22 xe", "14 máy kéo · 8 xe téc"), ("Xe dự phòng KLH", "22 xe", "Xưởng BTSC & Đội cứu hộ")]) +
    make_table(
        ["MÃ XE / BIỂN SỐ", "CHỦNG LOẠI PHƯƠNG TIỆN", "ĐƠN VỊ TIẾP NHẬN", "NGÀY BÀN GIAO", "NGƯỜI NHẬN BÀN GIAO", "MỤC ĐÍCH SỬ DỤNG", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b><small>Máy kéo 140HP</small>", "John Deere 6140B (Mới 100%)", "Xí nghiệp Nông trường Chuối 1<small>Đội Cơ giới 1</small>", "01/03/2024", "Nguyễn Văn Minh<small>Tài xế trưởng Đội 1</small>", "Cày ải sâu, bừa đất chuẩn bị trồng chuối", make_pill("Đang sử dụng", "")],
            ["<b>XT-HW-102</b><small>Xe tải Howo 4 chân</small>", "Howo 371HP Thùng Mui Bạt", "Đội Vận Tải Nặng KLH<small>Trực thuộc Ban Vận Hành</small>", "15/06/2023", "Trần Quốc Huy<small>Tổ trưởng Vận tải</small>", "Vận chuyển chuối tươi từ Lô về Packhouse", make_pill("Đang sử dụng", "")],
            ["<b>XB-HN-045</b><small>Xe téc nước 15m3</small>", "Hino 500 Series Téc Phun", "Xí nghiệp Nông trường Cây ăn trái<small>Đội Bảo vệ thực vật</small>", "10/01/2024", "Đỗ Thanh Hải<small>Kỹ thuật viên tưới</small>", "Phun vi sinh, phân bón lá và tưới sầu riêng", make_pill("Đang sử dụng", "")],
            ["<b>MD-CT-028</b><small>Máy đào 0.9m3</small>", "CAT 320D Bánh Xích", "Đội Thi Công Hạ Tầng Thủy Lợi<small>KLH Koun Mom</small>", "20/08/2022", "Võ Văn Thành<small>Lái máy công trình</small>", "Nạo vét kênh mương, đắp đê bao chống lũ", make_pill("Đang sử dụng", "")],
            ["<b>XC-KB-058</b><small>Máy kéo 70HP</small>", "Kubota M7040", "Xí nghiệp Nông trường Chuối 2<small>Đội Cơ giới 2</small>", "18/08/2026", "Sok Phearith<small>Tài xế tiếp nhận</small>", "Lên luống và kéo rơ-moóc chở buồng", make_pill("Mới bàn giao", "")]
        ],
        "Tìm mã xe, đơn vị tiếp nhận, người bàn giao...",
        "Hiển thị 1–5 trên 128 bản ghi phân bổ xe"
    )
)

data_part2["pages/5-doi-xe/thiet-bi-gps.html"] = (
    make_head("ĐỘI XE", "Thiết bị GPS & Cảm biến", "Quản lý danh mục thiết bị định vị GPS 4G, cảm biến mức nhiên liệu và cảm biến vòng tua PTO.", ["↗ Xuất danh sách SIM", "＋ Gán thiết bị mới"]) +
    make_filters(["Nhà mạng: Metfone / Viettel", "Tất cả thiết bị (128 xe)", "Trạng thái: Online"]) +
    make_stats([("GPS đang Online", "122 thiết bị", "95.3% kết nối tốt"), ("Mất kết nối (>2h)", "6 thiết bị", "Khu vực sóng yếu Lô C"), ("Cảm biến nhiên liệu", "118 bộ", "Sai số < 1%"), ("Hạn gói cước 4G", "100% còn hạn", "Gia hạn tự động hàng năm")]) +
    make_table(
        ["MÃ THIẾT BỊ / IMEI", "XE ĐƯỢC GẮN", "LOẠI THIẾT BỊ & CẢM BIẾN", "SỐ SIM / NHÀ MẠNG", "TÍN HIỆU GPS", "CẬP NHẬT CUỐI", "TRẠNG THÁI"],
        [
            ["<b>IMEI: 864291048821901</b><small>Model: TMS-T90 4G</small>", "<b>XC-JD-024</b><small>John Deere 6140B</small>", "GPS 4G + Cảm biến dầu siêu âm DUT-E + PTO Sensor", "088.992.3312<small>Metfone Campuchia</small>", "<b style='color:var(--green2)'>● Rất tốt (18 Vệ tinh)</b>", "23/08/2026 · 08:42:15", make_pill("Online", "")],
            ["<b>IMEI: 864291048821902</b><small>Model: TMS-T90 4G</small>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "GPS 4G + Cảm biến mức dầu 2 bình + Camera hành trình", "088.992.3314<small>Metfone Campuchia</small>", "<b style='color:var(--green2)'>● Tốt (16 Vệ tinh)</b>", "23/08/2026 · 08:42:10", make_pill("Online", "")],
            ["<b>IMEI: 864291048821903</b><small>Model: TMS-T90 4G</small>", "<b>XC-KB-053</b><small>Kubota M7040</small>", "GPS 4G + Cảm biến dầu", "097.334.5511<small>Viettel Roaming</small>", "<b style='color:var(--green2)'>● Tốt (14 Vệ tinh)</b>", "23/08/2026 · 08:41:50", make_pill("Online", "")],
            ["<b>IMEI: 864291048821904</b><small>Model: TMS-T90 4G</small>", "<b>XT-HN-079</b><small>Hino 500</small>", "GPS 4G + Cảm biến tốc độ", "088.992.3320<small>Metfone Campuchia</small>", "<b style='color:var(--green2)'>● Tốt (15 Vệ tinh)</b>", "23/08/2026 · 08:42:18", make_pill("Online", "")],
            ["<b>IMEI: 864291048821905</b><small>Model: TMS-T90 4G</small>", "<b>MU-KM-015</b><small>Komatsu D31P</small>", "GPS 4G chống nước IP67", "088.992.3388<small>Metfone Campuchia</small>", "<b style='color:var(--red)'>✕ Mất tín hiệu (2h)</b>", "23/08/2026 · 06:15:02", make_pill("Mất kết nối", "danger")]
        ],
        "Tìm số IMEI, mã xe, số điện thoại SIM...",
        "Hiển thị 1–5 trên 128 thiết bị GPS"
    )
)

data_part2["pages/5-doi-xe/lich-su-xe.html"] = (
    make_head("ĐỘI XE", "Lịch sử phương tiện", "Nhật ký truy vết toàn bộ vòng đời phương tiện từ lúc tiếp nhận, phân công, sửa chữa và thay thế phụ tùng.", ["↗ Xuất lý lịch xe", "🔍 Tra cứu số VIN"]) +
    make_filters(["Chọn xe: XC-JD-024 (John Deere)", "Toàn bộ thời gian (2024 - 2026)", "Đã xác thực dữ liệu"]) +
    make_stats([("Tổng giờ máy tích lũy", "2.450 giờ", "Bảo dưỡng 5 lần"), ("Tổng nhiên liệu tiêu thụ", "45.320 lít", "Trung bình 18.5 L/h"), ("Số lần sửa chữa lớn", "0 lần", "Đạt chuẩn vận hành"), ("Chi phí bảo dưỡng lũy kế", "38.500.000 đ", "Đúng định mức chi phí")]) +
    make_timeline([
        ("Bảo dưỡng định kỳ Cấp 2 (2.000 giờ máy)", "Thay toàn bộ lọc nhớt P550388, 18 lít dầu động cơ 15W-40, lọc nhiên liệu sơ cấp và xúc rửa két nước làm mát.", "15/07/2026 · Xưởng BTSC Trung tâm · KTV Đỗ Thanh Hải", "Xem biên bản BTSC"),
        ("Bàn giao tài xế chính mới", "Phân công anh Nguyễn Văn Minh tiếp nhận quản lý và vận hành chính máy kéo XC-JD-024 thay cho anh Lê Hoàng Nam chuyển công tác.", "01/04/2026 · Đội Xe Cơ giới 1 · Quản đốc ký duyệt", "Xem biên bản giao xe"),
        ("Bảo dưỡng định kỳ Cấp 1 (1.000 giờ máy)", "Thay nhớt động cơ, bơm mỡ các đăng, kiểm tra áp suất lốp và xiết lại bu lông dàn đĩa cày.", "10/11/2025 · Xưởng BTSC Trung tâm · KTV Huỳnh Tấn Đạt", "Xem phiếu thay dầu"),
        ("Cân chỉnh cảm biến đo dầu siêu âm", "Hiệu chuẩn lại que đo dầu siêu âm DUT-E trên bình 180 lít đảm bảo độ chính xác 99.5%.", "05/06/2025 · Phòng Kỹ thuật Số THACO AGRI", "Xem chứng chỉ"),
        ("Tiếp nhận xe mới từ THACO Chu Lai", "Bàn giao xe máy kéo mới 100% nguyên chiếc từ nhà máy THACO Chu Lai chuyển sang KLH Koun Mom.", "01/03/2024 · Ban Giám đốc KLH Koun Mom", "Xem hồ sơ gốc")
    ])
)

# 6. LÁI XE
data_part2["pages/6-lai-xe/danh-sach-lai-xe.html"] = (
    make_head("LÁI XE", "Danh sách lái xe", "Quản lý hồ sơ nhân sự đội ngũ lái xe tải, thợ vận hành máy kéo cơ giới và lái máy công trình.", ["↗ Xuất danh sách nhân sự", "＋ Tiếp nhận lái xe"]) +
    make_filters(["Tất cả đội xe (96 nhân sự)", "Quốc tịch: VN & Campuchia", "Trạng thái: Đang làm việc"]) +
    make_stats([("Tổng số lái xe / thợ máy", "96 nhân sự", "VN 54 · Campuchia 42"), ("Đang trên ca lái", "68 tài xế", "Ca 1 & Ca ngày"), ("Đang nghỉ phép / ca off", "24 tài xế", "Đúng chế độ luân phiên"), ("GPLX sắp hết hạn (<30 ngày)", "4 hồ sơ", "Cần gia hạn gấp")]) +
    make_table(
        ["MÃ NV", "HỌ VÀ TÊN", "ĐỘI XE TRỰC THUỘC", "HẠNG GPLX / CHỨNG CHỈ", "XE ĐƯỢC PHÂN CÔNG", "SỐ ĐIỆN THOẠI", "TRẠNG THÁI"],
        [
            ["<b>NV-0824</b>", "Nguyễn Văn Minh<small>Tổ trưởng lái máy kéo</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Hạng FC + Chứng chỉ Máy kéo<small>Hạn: 12/2028</small>", "<b>XC-JD-024</b><small>John Deere 6140B</small>", "0982.112.334<small>Viettel</small>", make_pill("Đang lái ca 1", "")],
            ["<b>NV-0831</b>", "Trần Quốc Huy<small>Tổ trưởng vận tải nặng</small>", "Đội Vận tải Nặng<small>KLH Koun Mom</small>", "Hạng C (Xe tải nặng)<small>Hạn: 08/2027</small>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "0973.224.556<small>Viettel</small>", make_pill("Đang trên đường", "")],
            ["<b>NV-0845</b>", "Lê Hoàng Nam<small>Lái máy cơ giới</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Chứng chỉ Vận hành xe Nông nghiệp<small>Vô thời hạn</small>", "<b>XC-KB-053</b><small>Kubota M7040</small>", "0964.882.119<small>Viettel</small>", make_pill("Đang làm việc", "")],
            ["<b>NV-KH-012</b>", "Sok Phearith<small>Lái xe tải nông sản</small>", "Đội Vận tải NT2<small>XN Chuối 2</small>", "GPLX Hạng C Campuchia<small>Hạn: 15/09/2026</small>", "<b>XT-HN-079</b><small>Hino 8 tấn</small>", "088.334.889<small>Metfone</small>", make_pill("GPLX sắp hết hạn", "pending")],
            ["<b>NV-KH-015</b>", "Keo Sarath<small>Lái máy ủi & máy xúc</small>", "Đội Thi công Thủy lợi<small>KLH Koun Mom</small>", "Chứng chỉ Máy thi công nền<small>Hạn: 2029</small>", "<b>MU-KM-015</b><small>Komatsu D31P</small>", "097.445.112<small>Metfone</small>", make_pill("Đang làm việc", "")],
            ["<b>NV-0856</b>", "Phạm Quốc An<small>Lái xe téc phun thuốc</small>", "Đội Bảo vệ thực vật<small>XN Chuối 1</small>", "Hạng C + Chứng chỉ An toàn Hóa chất<small>Hạn: 05/2027</small>", "<b>XB-HN-045</b><small>Hino Téc Nước</small>", "0912.339.882<small>VinaPhone</small>", make_pill("Đang lái ca sáng", "")]
        ],
        "Tìm mã nhân viên, họ tên, số điện thoại, xe...",
        "Hiển thị 1–6 trên 96 lái xe"
    )
)

data_part2["pages/6-lai-xe/phan-cong-lai-xe.html"] = (
    make_head("LÁI XE", "Phân công lái xe", "Bố trí tài xế chính, tài xế phụ và phân ca làm việc cho từng phương tiện cơ giới hàng ngày.", ["↗ Xuất lịch phân công", "＋ Phân công ca mới"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả các ca (Ca 1 / Ca 2)", "Đã chốt danh sách"]) +
    make_stats([("Tài xế đã nhận ca", "68 người", "100% đúng giờ"), ("Tài xế phụ / dự bị", "12 người", "Sẵn sàng thay thế"), ("Ca làm việc nhiều nhất", "Ca 1 (06h - 14h)", "48 tài xế"), ("Hiệu suất có mặt", "100%", "Không có nghỉ không phép")]) +
    make_table(
        ["PHƯƠNG TIỆN CƠ GIỚI", "CHỦNG LOẠI", "TÀI XẾ CHÍNH (CA 1)", "TÀI XẾ PHỤ / CA 2", "KHU VỰC CÔNG TÁC", "NHIỆM VỤ GIAO", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b>", "John Deere 6140B", "<b>Nguyễn Văn Minh</b><small>0982.112.334</small>", "Keo Sarath (Phụ lái)<small>097.445.112</small>", "Lô CN-A12<small>XN Chuối 1</small>", "Cày lật đất sâu 35cm chuẩn bị trồng chuối", make_pill("Đang thực hiện", "")],
            ["<b>XT-HW-102</b>", "Howo 4 chân 15T", "<b>Trần Quốc Huy</b><small>0973.224.556</small>", "Võ Văn Thành (Ca chiều)<small>0918.445.667</small>", "Lô A12 ➔ Packhouse 2", "Chở chuối buồng tươi về nhà sơ chế", make_pill("Đang thực hiện", "")],
            ["<b>XC-KB-053</b>", "Kubota M7040", "<b>Lê Hoàng Nam</b><small>0964.882.119</small>", "Đỗ Thanh Hải (Phụ)", "Lô CN-B06<small>XN Chuối 1</small>", "Lên luống đôi và rạch hàng tra phân", make_pill("Đang thực hiện", "")],
            ["<b>XT-HN-079</b>", "Hino 500 8T", "<b>Sok Phearith</b><small>088.334.889</small>", "Nguyễn Thành Long (Ca 2)", "Kho T1 ➔ Lô B06", "Vận chuyển 8 tấn phân hữu cơ bón lót", make_pill("Đang thực hiện", "")],
            ["<b>XB-HN-045</b>", "Xe bồn Hino 15m3", "<b>Phạm Quốc An</b><small>0912.339.882</small>", "Huỳnh Tấn Đạt (Phụ)", "Lô CN-A08<small>XN Chuối 1</small>", "Phun chế phẩm sinh học cải tạo đất", make_pill("Đang thực hiện", "")]
        ],
        "Tìm phương tiện, tên lái xe chính, khu vực...",
        "Hiển thị 1–5 trên 68 phân công phương tiện"
    )
)

data_part2["pages/6-lai-xe/gplx.html"] = (
    make_head("LÁI XE", "Quản lý GPLX & Chứng chỉ", "Theo dõi thời hạn Giấy phép lái xe, Chứng chỉ vận hành xe máy chuyên dùng và cảnh báo hết hạn.", ["↗ Xuất danh sách quá hạn", "＋ Thêm chứng chỉ mới"]) +
    make_filters(["Tất cả hạng GPLX (B2, C, D, FC, Máy kéo)", "Cảnh báo hạn: Dưới 60 ngày", "Đang theo dõi"]) +
    make_stats([("GPLX hợp lệ", "92 hồ sơ", "95.8% đủ điều kiện"), ("Sắp hết hạn (<30 ngày)", "3 hồ sơ", "Đã gửi thông báo nhắc"), ("Đang làm thủ tục đổi", "1 hồ sơ", "Sở GTVT / MPWT"), ("Quá hạn sử dụng", "0 hồ sơ", "0% vi phạm")]) +
    make_table(
        ["MÃ NV / HỌ TÊN", "SỐ GPLX / CHỨNG CHỈ", "HẠNG GPLX", "NƠI CẤP", "NGÀY CẤP", "NGÀY HẾT HẠN", "TÌNH TRẠNG HIỆU LỰC"],
        [
            ["<b>NV-KH-012</b><small>Sok Phearith</small>", "<b>KH-C-9921082</b><small>GPLX Ô tô Tải</small>", "Hạng C (Campuchia)", "Bộ Giao thông Công chánh Campuchia", "15/09/2021", "<b style='color:var(--amber)'>15/09/2026 (Còn 22 ngày)</b>", make_pill("Sắp hết hạn", "pending")],
            ["<b>NV-0852</b><small>Nguyễn Văn Hải</small>", "<b>790182948192</b><small>GPLX Hạng C</small>", "Hạng C (Việt Nam)", "Sở Giao thông Vận tải Gia Lai", "28/09/2021", "<b style='color:var(--amber)'>28/09/2026 (Còn 35 ngày)</b>", make_pill("Sắp hết hạn", "pending")],
            ["<b>NV-0824</b><small>Nguyễn Văn Minh</small>", "<b>790124892104</b><small>GPLX Hạng FC</small>", "Hạng FC (Đầu kéo)", "Sở Giao thông Vận tải TP.HCM", "10/12/2023", "<b style='color:var(--green2)'>10/12/2028</b>", make_pill("Còn hạn", "")],
            ["<b>NV-0831</b><small>Trần Quốc Huy</small>", "<b>770144928101</b><small>GPLX Hạng C</small>", "Hạng C (Xe tải)", "Sở Giao thông Vận tải Bình Định", "18/08/2022", "<b style='color:var(--green2)'>18/08/2027</b>", make_pill("Còn hạn", "")],
            ["<b>NV-0845</b><small>Lê Hoàng Nam</small>", "<b>CC-NN-2022-09</b><small>Chứng chỉ Máy kéo</small>", "Vận hành Cơ giới NN", "Trường CĐ Cơ giới Nông nghiệp", "15/06/2022", "<b style='color:var(--green2)'>Vô thời hạn</b>", make_pill("Hợp lệ", "")]
        ],
        "Tìm họ tên tài xế, số bằng lái, hạng GPLX...",
        "Hiển thị 1–5 trên 96 hồ sơ GPLX"
    )
)

data_part2["pages/6-lai-xe/lich-su-lai-xe.html"] = (
    make_head("LÁI XE", "Lịch sử lái xe & Công tác", "Nhật ký quá trình làm việc, số km đã chạy, số giờ máy tích lũy và khen thưởng vi phạm của tài xế.", ["↗ Xuất phiếu công tác", "🔍 Tra cứu tài xế"]) +
    make_filters(["Chọn lái xe: Nguyễn Văn Minh (NV-0824)", "Năm 2026", "Đã xác thực điều độ"]) +
    make_stats([("Tổng giờ máy tích lũy", "1.240 giờ", "Vượt 12% định mức"), ("Tổng diện tích cày bừa", "340 ha", "Đạt chuẩn chất lượng 100%"), ("Vi phạm quy định", "0 lần", "Lái xe an toàn 5 sao"), ("Thưởng tiết kiệm nhiên liệu", "4.200.000 đ", "Tiết kiệm 680 lít dầu")]) +
    make_timeline([
        ("Vinh danh Tài xế Xuất sắc Tháng 07/2026", "Đạt danh hiệu Top 1 Thợ máy cơ giới tiêu biểu KLH Koun Mom với 186 giờ máy hữu ích và tiết kiệm 6.2% nhiên liệu.", "05/08/2026 · Ban Giám đốc KLH Koun Mom trao tặng", "Xem quyết định"),
        ("Hoàn thành chiến dịch làm đất vụ Chuối 2", "Hoàn thành 85 ha cày lật đất sâu 35cm tại Nông trường 1 đúng tiến độ trước mùa mưa 5 ngày.", "25/07/2026 · Quản đốc XN Chuối 1 nghiệm thu", "Xem biên bản"),
        ("Tham gia khóa tập huấn An toàn Lao động & GPS", "Hoàn thành khóa đào tạo vận hành hệ thống định vị GPS 4G và quy trình an toàn máy nông cụ cơ giới.", "15/05/2026 · Phòng An toàn Lao động THACO AGRI", "Xem chứng nhận"),
        ("Bàn giao tiếp nhận máy kéo mới John Deere 6140B", "Ký nhận bàn giao máy kéo mới từ Xưởng Cơ giới Trung tâm và thực hiện chạy rà 50 giờ đầu.", "01/03/2024 · Hội đồng Bàn giao Thiết bị", "Xem biên bản"),
        ("Tiếp nhận công tác tại KLH Koun Mom", "Ký hợp đồng lao động chính thức vị trí Thợ lái máy kéo Nông nghiệp Đội Cơ giới 1.", "15/01/2024 · Phòng Nhân sự THACO AGRI", "Xem hợp đồng")
    ])
)

data_part2["pages/6-lai-xe/vi-pham.html"] = (
    make_head("LÁI XE", "Nhật ký vi phạm vận hành", "Ghi nhận và xử lý các lỗi vi phạm tốc độ quy định nông trường, rời vùng giám sát và nổ máy dừng xe lãng phí.", ["↗ Xuất biên bản xử phạt", "＋ Lập biên bản vi phạm"]) +
    make_filters(["Tháng 08/2026", "Tất cả mức độ vi phạm", "Trạng thái: Đang xử lý"]) +
    make_stats([("Tổng sự kiện vi phạm", "14 vụ", "-6 vụ so với tháng trước"), ("Chạy quá tốc độ (>30km/h)", "8 vụ", "Tốc độ cao nhất 42km/h"), ("Ra khỏi vùng quy định", "4 vụ", "Đều có giải trình hợp lý"), ("Dừng xe nổ máy bật điều hòa (>30p)", "2 vụ", "Gây hao dầu không cần thiết")]) +
    make_table(
        ["MÃ BIÊN BẢN", "THỜI GIAN VI PHẠM", "LÁI XE VI PHẠM", "PHƯƠNG TIỆN", "HÀNH VI VI PHẠM", "ĐỊA ĐIỂM XẢY RA", "HÌNH THỨC XỬ LÝ", "TRẠNG THÁI"],
        [
            ["<b>BB-VP-260823-01</b>", "23/08/2026 · 08:12", "<b>Sok Phearith</b><small>NV-KH-012</small>", "<b>XT-HN-079</b><small>Hino 8 tấn</small>", "Chạy quá tốc độ: <b>38 km/h</b><small>Quy định tối đa 30 km/h</small>", "Trục đường chính NT2<small>Khu vực gần nhà dân</small>", "Nhắc nhở qua bộ đàm & trừ 2 điểm an toàn", make_pill("Đang xử lý", "pending")],
            ["<b>BB-VP-260822-04</b>", "22/08/2026 · 14:45", "<b>Trần Quốc Huy</b><small>NV-0831</small>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "Dừng xe nổ máy bật lạnh 45 phút<small>Hao hụt 3.2L dầu vô ích</small>", "Bãi xe Packhouse 2<small>Chờ bốc hàng</small>", "Phạt trừ dầu khoán & lập biên bản", make_pill("Đã xử lý", "")],
            ["<b>BB-VP-260821-02</b>", "21/08/2026 · 11:30", "<b>Keo Sarath</b><small>NV-KH-015</small>", "<b>XB-HD-062</b><small>Ben Hyundai</small>", "Rời khỏi vùng quy định Geo-fence<small>Đi ra ngoài ranh giới 1.2km</small>", "Đường vành đai giáp biên<small>Đi đường tránh ổ gà</small>", "Giải trình hợp lý do đường lầy lội", make_pill("Đã đóng", "")],
            ["<b>BB-VP-260819-01</b>", "19/08/2026 · 09:20", "<b>Lê Hoàng Nam</b><small>NV-0845</small>", "<b>XC-KB-053</b><small>Kubota M7040</small>", "Không đeo dây đai an toàn khi cày", "Lô CN-B06<small>Đội An toàn tuần tra phát hiện</small>", "Phạt cảnh cáo nội bộ", make_pill("Đã xử lý", "")],
            ["<b>BB-VP-260818-03</b>", "18/08/2026 · 16:10", "<b>Phạm Quốc An</b><small>NV-0856</small>", "<b>XB-HN-045</b><small>Hino Téc Nước</small>", "Chạy quá tốc độ: <b>35 km/h</b>", "Đoạn qua cổng trạm cân T1", "Trừ điểm thi đua tháng", make_pill("Đã xử lý", "")]
        ],
        "Tìm mã biên bản, tên tài xế, biển số xe...",
        "Hiển thị 1–5 trên 14 biên bản vi phạm"
    )
)

data_part2["pages/6-lai-xe/kpi-lai-xe.html"] = (
    make_head("LÁI XE", "KPI & Đánh giá hiệu suất", "Bảng đánh giá chỉ số hiệu quả công việc KPI của tài xế theo giờ máy hữu ích, sản lượng diện tích và tiết kiệm nhiên liệu.", ["↗ Xuất bảng chấm công KPI", "⚡ Tính điểm tự động"]) +
    make_filters(["Kỳ đánh giá: Tháng 08/2026", "Tất cả đội xe", "Xếp loại: A, B, C, D"]) +
    make_stats([("Điểm KPI trung bình", "92.4 / 100", "+3.2 điểm so tháng trước"), ("Tài xế Loại A (Xuất sắc)", "38 người", "Tỷ lệ 39.5%"), ("Tài xế Loại B (Khá)", "46 người", "Tỷ lệ 47.9%"), ("Tài xế Loại C (Cần cải thiện)", "12 người", "Cần đào tạo lại")]) +
    make_analytics("Biến động điểm KPI trung bình toàn đội xe (6 tháng gần nhất)", "M10 160 C120 140, 240 155, 360 110 S500 85, 680 40", "96", [("Loại A (Xuất sắc)", "39.5%"), ("Loại B (Khá)", "47.9%"), ("Loại C (TB)", "12.6%")],
        make_table(
            ["MÃ NV / HỌ TÊN", "ĐỘI XE TRỰC THUỘC", "GIỜ MÁY HỮU ÍCH", "SẢN LƯỢNG DIỆN TÍCH / TẤN", "TIẾT KIỆM NHIÊN LIỆU", "ĐIỂM AN TOÀN", "TỔNG ĐIỂM KPI", "XẾP LOẠI"],
            [
                ["<b>NV-0824</b><small>Nguyễn Văn Minh</small>", "Đội Cơ giới 1", "<b>186 giờ</b><small>116% định mức</small>", "<b>48.5 ha</b> cày ải sâu", "<b style='color:var(--green2)'>+6.2%</b> (Tiết kiệm 82L)", "<b>98 / 100</b>", "<b style='color:var(--green2);font-size:12px'>96.5</b>", "<span class='module-pill'>Loại A (Xuất sắc)</span>"],
                ["<b>NV-0831</b><small>Trần Quốc Huy</small>", "Đội Vận tải Nặng", "<b>210 giờ</b><small>110% định mức</small>", "<b>680 tấn</b> chuối vận chuyển", "<b style='color:var(--green2)'>+4.8%</b> (Tiết kiệm 110L)", "<b>95 / 100</b>", "<b style='color:var(--green2);font-size:12px'>94.8</b>", "<span class='module-pill'>Loại A (Xuất sắc)</span>"],
                ["<b>NV-0845</b><small>Lê Hoàng Nam</small>", "Đội Cơ giới 1", "<b>172 giờ</b><small>107% định mức</small>", "<b>42.0 ha</b> lên luống", "<b style='color:var(--green2)'>+3.5%</b> (Tiết kiệm 45L)", "<b>92 / 100</b>", "<b style='color:var(--green2);font-size:12px'>91.2</b>", "<span class='module-pill'>Loại A (Xuất sắc)</span>"],
                ["<b>NV-KH-015</b><small>Keo Sarath</small>", "Đội Thi công Thủy lợi", "<b>165 giờ</b><small>103% định mức</small>", "<b>3.200 m3</b> đất đào đắp", "<b style='color:var(--green2)'>+1.2%</b>", "<b>90 / 100</b>", "<b style='color:var(--green2);font-size:12px'>88.5</b>", "<span class='module-pill'>Loại B (Khá)</span>"],
                ["<b>NV-KH-012</b><small>Sok Phearith</small>", "Đội Vận tải NT2", "<b>155 giờ</b><small>97% định mức</small>", "<b>410 tấn</b> hàng chuyển", "<b style='color:var(--red)'>-2.4%</b> (Vượt 38L)", "<b>82 / 100</b>", "<b style='color:#ae7117;font-size:12px'>78.0</b>", "<span class='module-pill pending'>Loại C (Trung bình)</span>"]
            ],
            "Tìm họ tên lái xe, mã nhân viên, xếp loại...",
            "Hiển thị 1–5 trên 96 bảng đánh giá KPI"
        )
    )
)

data_part2["pages/6-lai-xe/bang-xep-hang.html"] = (
    make_head("LÁI XE", "Bảng xếp hạng thi đua", "Vinh danh Top các tài xế và thợ máy có thành tích xuất sắc nhất trong phong trào Lái xe An toàn & Tiết kiệm.", ["↗ Xuất quyết định khen thưởng", "🏆 Trao thưởng tháng"]) +
    make_filters(["Tháng 08/2026", "Phạm vi: Toàn KLH Koun Mom", "Top 10 Dẫn đầu"]) +
    make_stats([("Top 1 Toàn đoàn", "Nguyễn Văn Minh", "96.5 Điểm · Đội 1"), ("Tỷ lệ tiết kiệm dầu cao nhất", "+6.2%", "Tiết kiệm 82 lít dầu"), ("Tổng tiền thưởng thi đua", "32.000.000 đ", "Trao thưởng ngày 05"), ("Số giờ máy an toàn", "16.420 giờ", "0 tai nạn lao động")]) +
    make_analytics("Xu hướng cạnh tranh điểm thi đua Top 5 tài xế dẫn đầu", "M10 180 C150 120, 300 130, 450 70 S600 50, 690 25", "Top 10", [("Đội Cơ giới 1", "40%"), ("Đội Vận tải Nặng", "30%"), ("Đội Cơ giới 2", "20%"), ("Đội Thủy lợi", "10%")],
        make_table(
            ["THỨ HẠNG", "HỌ VÀ TÊN / MÃ NV", "ĐỘI XE TRỰC THUỘC", "XE ĐIỀU KHIỂN", "SẢN LƯỢNG HOÀN THÀNH", "TIẾT KIỆM NHIÊN LIỆU", "ĐIỂM THI ĐUA", "DANH HIỆU"],
            [
                ["<b style='font-size:14px;color:#d97706'>🥇 TOP 1</b>", "<b>Nguyễn Văn Minh</b><small>NV-0824</small>", "Đội Cơ giới 1 (NT1)", "XC-JD-024 (John Deere)", "48.5 ha cày ải (116% KH)", "<b style='color:var(--green2)'>+6.2%</b>", "<b style='color:var(--green2);font-size:14px'>96.5</b>", "<span class='module-pill'>Bàn tay Vàng Cơ giới</span>"],
                ["<b style='font-size:14px;color:#64748b'>🥈 TOP 2</b>", "<b>Trần Quốc Huy</b><small>NV-0831</small>", "Đội Vận tải Nặng", "XT-HW-102 (Howo 4 chân)", "680 tấn chuối (110% KH)", "<b style='color:var(--green2)'>+4.8%</b>", "<b style='color:var(--green2);font-size:14px'>94.8</b>", "<span class='module-pill'>Tài xế An toàn Xuất sắc</span>"],
                ["<b style='font-size:14px;color:#b45309'>🥉 TOP 3</b>", "<b>Lê Hoàng Nam</b><small>NV-0845</small>", "Đội Cơ giới 1 (NT1)", "XC-KB-053 (Kubota M7040)", "42.0 ha lên luống (107% KH)", "<b style='color:var(--green2)'>+3.5%</b>", "<b style='color:var(--green2);font-size:14px'>91.2</b>", "<span class='module-pill'>Chiến sĩ Thi đua</span>"],
                ["<b>#4</b>", "<b>Võ Văn Thành</b><small>NV-0848</small>", "Đội Vận tải NT1", "XT-HN-079 (Hino 8T)", "520 tấn phân bón (105% KH)", "<b style='color:var(--green2)'>+2.8%</b>", "<b style='font-size:14px'>89.6</b>", "<span class='module-pill'>Lao động Tiên tiến</span>"],
                ["<b>#5</b>", "<b>Keo Sarath</b><small>NV-KH-015</small>", "Đội Thi công Thủy lợi", "MU-KM-015 (Komatsu D31P)", "3.200 m3 đào đắp (103% KH)", "<b style='color:var(--green2)'>+1.2%</b>", "<b style='font-size:14px'>88.5</b>", "<span class='module-pill'>Lao động Tiên tiến</span>"]
            ],
            "Tìm tài xế xếp hạng, mã nhân viên...",
            "Hiển thị Top 5 tài xế dẫn đầu bảng xếp hạng"
        )
    )
)

# 7. BẢO TRÌ - SỬA CHỮA
data_part2["pages/7-bao-tri-sua-chua/ke-hoach-bao-tri.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Kế hoạch bảo trì định kỳ", "Theo dõi lịch bảo dưỡng cấp 1 (250h), cấp 2 (500h), cấp 3 (1000h) và đại tu cho toàn bộ đội xe.", ["↗ Xuất kế hoạch bảo trì", "＋ Thêm lịch bảo dưỡng"]) +
    make_filters(["Kỳ bảo trì: Tháng 08/2026", "Tất cả cấp bảo dưỡng", "Trạng thái: Đúng hạn"]) +
    make_stats([("Xe đến hạn bảo dưỡng tuần này", "12 phương tiện", "8 máy kéo · 4 xe tải"), ("Đã hoàn tất bảo dưỡng", "8 phương tiện", "Thời gian TB 4.5h/xe"), ("Đang bảo dưỡng tại xưởng", "3 phương tiện", "Xưởng BTSC Trung tâm"), ("Vật tư phụ tùng sẵn có", "96.5%", "Đầy đủ lọc, nhớt, mỡ")]) +
    make_table(
        ["MÃ PHƯƠNG TIỆN", "CHỦNG LOẠI XE", "CẤP BẢO DƯỠNG", "GIỜ MÁY / ODO HIỆN TẠI", "GIỜ MÁY ĐẾN HẠN", "HẠNG MỤC CẦN THAY THẾ", "KỸ THUẬT VIÊN", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b><small>John Deere 6140B</small>", "Máy kéo nông nghiệp", "<b>Cấp 2 (500 giờ)</b>", "<b>2.485 giờ</b>", "<b>2.500 giờ (Còn 15h)</b>", "Nhớt động cơ 15W-40, Lọc nhớt P550388, Lọc dầu", "Đỗ Thanh Hải<small>Thợ bậc 4/7</small>", make_pill("Sắp đến hạn", "pending")],
            ["<b>XT-HW-102</b><small>Howo 4 chân</small>", "Xe tải nặng 15T", "<b>Cấp 3 (20.000 km)</b>", "<b>149.800 km</b>", "<b>150.000 km (Còn 200km)</b>", "Nhớt cầu, nhớt hộp số, kiểm tra phanh & lốp xe", "Huỳnh Tấn Đạt<small>KTV Gầm máy</small>", make_pill("Sắp đến hạn", "pending")],
            ["<b>XC-KB-053</b><small>Kubota M7040</small>", "Máy kéo nông nghiệp", "<b>Cấp 1 (250 giờ)</b>", "<b>3.250 giờ</b>", "<b>3.250 giờ (Đến hạn hôm nay)</b>", "Bơm mỡ trục các đăng, thay lọc gió sơ cấp", "Nguyễn Thành Long<small>KTV Cơ giới</small>", make_pill("Đang thực hiện", "")],
            ["<b>XB-HD-062</b><small>Hyundai HD270</small>", "Xe ben chở đất đá", "<b>Đại tu gầm xích</b>", "<b>210.500 km</b>", "<b>210.000 km (Quá 500km)</b>", "Thay bạc ắc nhíp, phục hồi pít-tông ben thủy lực", "Tổ BTSC Gầm Nặng<small>Xưởng Trung tâm</small>", make_pill("Đang sửa chữa", "danger")],
            ["<b>MG-KB-018</b><small>Kubota DC-70G</small>", "Máy gặt đập liên hợp", "<b>Bảo dưỡng trước mùa vụ</b>", "<b>1.150 giờ</b>", "<b>1.150 giờ</b>", "Mài dao cắt, tăng xích truyền động, thay vòng bi", "Đỗ Thanh Hải<small>KTV Máy nông cụ</small>", make_pill("Đã hoàn tất", "")]
        ],
        "Tìm mã xe, chủng loại, cấp bảo dưỡng, KTV...",
        "Hiển thị 1–5 trên 12 kế hoạch bảo trì"
    )
)

data_part2["pages/7-bao-tri-sua-chua/yeu-cau-sua-chua.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Yêu cầu sửa chữa đột xuất", "Tiếp nhận các phiếu báo hỏng hóc sự cố phát sinh tại đồng ruộng và điều động cứu hộ kỹ thuật.", ["↗ Xuất báo cáo sự cố", "＋ Tạo yêu cầu sửa chữa"]) +
    make_filters(["Hôm nay, 23/08/2026", "Mức độ khẩn cấp: Tất cả", "Đang xử lý"]) +
    make_stats([("Yêu cầu sự cố trong ngày", "6 sự cố", "-2 vụ so hôm qua"), ("Xử lý lưu động tại đồng", "4 vụ", "Khắc phục dưới 60 phút"), ("Kéo về xưởng trung tâm", "2 xe", "Cần cẩu chuyên dùng"), ("Thời gian khắc phục TB", "1.8 giờ/vụ", "Đạt chuẩn SLA 2.0h")]) +
    make_kanban([
        ("Mới báo sự cố", "2", [
            {"id": "YCSC-0823-01", "title": "Bục ống dầu thủy lực dàn cày", "subtitle": "XC-NH-031 · Lô CN-B06 · Báo lúc 08:15", "tag": "Khẩn cấp", "pill_type": "danger", "time": "08:15"},
            {"id": "YCSC-0823-02", "title": "Thủng lốp sau xe ben chở cát", "subtitle": "XB-HD-064 · Tuyến Trục D4 · Cần vá lốp", "tag": "Bình thường", "pill_type": "", "time": "08:30"}
        ]),
        ("Đã cử thợ lưu động", "3", [
            {"id": "YCSC-0823-03", "title": "Đứt dây curoa máy phát điện", "subtitle": "XC-KB-042 · Lô A12 · Đỗ Thanh Hải đang đến", "tag": "Đang di chuyển", "pill_type": "pending", "time": "07:45"},
            {"id": "YCSC-0823-04", "title": "Kẹt van chia dầu ben xe Howo", "subtitle": "XT-HW-105 · Packhouse 2 · Huỳnh Tấn Đạt xử lý", "tag": "Đang sửa chữa", "pill_type": "", "time": "08:00"}
        ]),
        ("Đang sửa tại Xưởng", "4", [
            {"id": "YCSC-0822-08", "title": "Hỏng bơm cao áp (Heo dầu)", "subtitle": "XC-JD-019 · Xưởng BTSC · Chờ phụ tùng Denso", "tag": "Chờ vật tư", "pill_type": "pending", "time": "Hôm qua"},
            {"id": "YCSC-0822-09", "title": "Cháy lá côn ly hợp máy cày", "subtitle": "XC-NH-028 · Đang ép tán đĩa ly hợp mới", "tag": "Đang lắp ráp", "pill_type": "", "time": "Hôm qua"}
        ]),
        ("Đã sửa xong & Nghiệm thu", "6", [
            {"id": "YCSC-0823-05", "title": "Thay bình ắc quy GS 12V-120Ah", "subtitle": "XT-HN-079 · Đã nổ máy bình thường lúc 07:30", "tag": "Hoàn tất", "pill_type": "", "time": "07:30"},
            {"id": "YCSC-0822-07", "title": "Hàn gia cố khung càng dàn bừa", "subtitle": "Dàn bừa DB-24 · Đã bàn giao lại Đội 1", "tag": "Hoàn tất", "pill_type": "", "time": "06:30"}
        ])
    ])
)

data_part2["pages/7-bao-tri-sua-chua/phieu-sua-chua.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Phiếu giao việc sửa chữa", "Lập và theo dõi chi tiết phiếu giao việc cho thợ máy, danh mục phụ tùng thay thế và giờ công định mức.", ["↗ Xuất phiếu giao việc", "＋ Lập phiếu sửa chữa"]) +
    make_filters(["Tháng 08/2026", "Tất cả tổ kỹ thuật", "Trạng thái: Đang thực hiện"]) +
    make_stats([("Phiếu giao việc đang mở", "8 phiếu", "4 phiếu bảo dưỡng · 4 sửa chữa"), ("Tổng giờ công định mức", "64 giờ công", "Thực tế 58 giờ"), ("Chi phí phụ tùng xuất kho", "28.500.000 đ", "Đúng định mức vật tư"), ("Thời gian hoàn thành đúng hạn", "94.2%", "Vượt mục tiêu 90%")]) +
    make_table(
        ["SỐ PHIẾU", "XE SỬA CHỮA", "HẠNG MỤC CÔNG VIỆC", "KỸ THUẬT VIÊN CHÍNH", "VẬT TƯ THAY THẾ", "CHI PHÍ DỰ KIẾN", "THỜI GIAN DỰ KIẾN", "TRẠNG THÁI"],
        [
            ["<b>PSC-0823-01</b><small>Tạo 08:00</small>", "<b>XC-JD-024</b><small>John Deere</small>", "Bảo dưỡng cấp 2 (500 giờ máy)<small>Thay nhớt, lọc và kiểm tra</small>", "Đỗ Thanh Hải<small>Thợ bậc 4/7</small>", "Lọc nhớt P550388, 18L nhớt 15W-40, Lọc dầu", "<b>3.250.000 đ</b>", "4.0 giờ<small>Xong trước 12:00</small>", make_pill("Đang thực hiện", "")],
            ["<b>PSC-0823-02</b><small>Tạo 08:30</small>", "<b>XC-NH-031</b><small>New Holland</small>", "Ép lại đầu ống tuy-ô thủy lực cẩu dàn cày<small>Khắc phục xì dầu áp cao</small>", "Huỳnh Tấn Đạt<small>Thợ thủy lực</small>", "2 đầu bấm cút thủy lực ren 3/4 + 4m ống 2SN", "<b>1.450.000 đ</b>", "2.0 giờ<small>Xong trước 10:30</small>", make_pill("Đang thực hiện", "")],
            ["<b>PSC-0822-05</b><small>Tạo hôm qua</small>", "<b>XB-HD-062</b><small>Ben Hyundai</small>", "Phục hồi ty ben thủy lực 3 tầng<small>Thay toàn bộ phớt ben</small>", "Tổ Gầm Máy<small>Xưởng Trung tâm</small>", "Bộ phớt ben Hyundai chính hãng, 35L dầu thủy lực 68", "<b>8.900.000 đ</b>", "1.5 ngày<small>Giao xe 24/08</small>", make_pill("Chờ phụ tùng", "pending")],
            ["<b>PSC-0822-06</b><small>Tạo hôm qua</small>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "Bảo dưỡng hệ thống phanh khí nén<small>Tán má phanh 4 bánh sau</small>", "Nguyễn Thành Long<small>Thợ gầm</small>", "8 bộ má phanh Howo, 2 bầu phanh lốc-kê", "<b>4.600.000 đ</b>", "6.0 giờ<small>Xong chiều nay</small>", make_pill("Đang thực hiện", "")],
            ["<b>PSC-0821-03</b><small>Tạo 21/08</small>", "<b>MG-KB-018</b><small>Máy gặt Kubota</small>", "Thay dao cắt và cân chỉnh sàng rung", "Đỗ Thanh Hải<small>Thợ máy nông cụ</small>", "Bộ dao cắt đôi Kubota DC70, 4 bạc đạn đũa", "<b>2.800.000 đ</b>", "Đã nghiệm thu", make_pill("Hoàn thành", "")]
        ],
        "Tìm số phiếu, mã xe, hạng mục sửa chữa, KTV...",
        "Hiển thị 1–5 trên 8 phiếu giao việc sửa chữa"
    )
)

data_part2["pages/7-bao-tri-sua-chua/theo-doi-sua-chua.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Theo dõi tiến độ sửa chữa", "Bảng Kanban trực quan theo dõi tiến độ từng phương tiện qua các giai đoạn từ tiếp nhận đến bàn giao.", ["↗ Xem luồng xưởng", "＋ Tiếp nhận xe"]) +
    make_filters(["Hôm nay, 23/08/2026", "Khu vực: Xưởng BTSC Trung tâm", "Trưởng xưởng: Lê Minh Tâm"]) +
    make_stats([("Xe đang nằm xưởng", "11 xe", "7 xe bảo dưỡng · 4 xe sửa"), ("Đúng tiến độ cam kết", "91.0%", "1 xe chậm do chờ nhập phụ tùng"), ("Thời gian dừng máy TB", "14.5 giờ/xe", "Giảm 3.2h so tháng trước"), ("Năng suất thợ máy", "98.5%", "14 thợ máy đang làm việc")]) +
    make_kanban([
        ("1. Chờ chẩn đoán & Khảo sát", "3", [
            {"id": "TDSC-01", "title": "Khảo sát máy kéo phát tiếng kêu lạ ở cầu sau", "subtitle": "XC-KB-058 · Tiếp nhận lúc 08:10 · Thợ: Đỗ Thanh Hải", "tag": "Đang đo độ rơ", "pill_type": "pending", "time": "08:10"},
            {"id": "TDSC-02", "title": "Kiểm tra khói đen máy ủi Komatsu", "subtitle": "MU-KM-015 · Đo áp suất buồng đốt và kim phun", "tag": "Chẩn đoán", "pill_type": "", "time": "08:25"}
        ]),
        ("2. Chờ xuất kho phụ tùng", "2", [
            {"id": "TDSC-03", "title": "Chờ xuất bộ gioăng phớt đại tu hộp số", "subtitle": "XC-JD-019 · Đã duyệt phiếu xuất kho · Chờ thủ kho soạn", "tag": "Chờ soạn hàng", "pill_type": "pending", "time": "07:45"},
            {"id": "TDSC-04", "title": "Chờ lốp xe Howo 12.00R20 Bridgestone", "subtitle": "XT-HW-108 · Chờ xe vận chuyển từ kho trung tâm", "tag": "Vận chuyển", "pill_type": "pending", "time": "08:00"}
        ]),
        ("3. Đang gia công & Lắp ráp", "4", [
            {"id": "TDSC-05", "title": "Bảo dưỡng cấp 2 xe máy kéo John Deere", "subtitle": "XC-JD-024 · Đang thay nhớt và siết lực bu lông", "tag": "Tiến độ 60%", "pill_type": "", "time": "08:30"},
            {"id": "TDSC-06", "title": "Phục hồi hệ thống phanh xe tải Howo", "subtitle": "XT-HW-102 · Đang tán đinh nhôm má phanh mới", "tag": "Tiến độ 75%", "pill_type": "", "time": "08:15"}
        ]),
        ("4. Chạy thử & Bàn giao", "2", [
            {"id": "TDSC-07", "title": "Chạy thử tải máy gặt Kubota DC-70G", "subtitle": "MG-KB-018 · Chạy thử 30 phút không tải trên bãi", "tag": "Đạt chuẩn", "pill_type": "", "time": "07:50"},
            {"id": "TDSC-08", "title": "Bàn giao xe bồn phun thuốc Hino 15m3", "subtitle": "XB-HN-045 · Đã ký biên bản giao nhận cho Đội 1", "tag": "Đã bàn giao", "pill_type": "", "time": "08:20"}
        ])
    ])
)

data_part2["pages/7-bao-tri-sua-chua/vat-tu-phu-tung.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Vật tư - Phụ tùng kho", "Quản lý danh mục phụ tùng thay thế, dầu mỡ nhờn bôi trơn và mức tồn kho an toàn phục vụ sửa chữa.", ["↗ Xuất phiếu xuất kho", "＋ Nhập phụ tùng mới"]) +
    make_filters(["Kho Trung tâm BTSC", "Nhóm: Lọc nhớt, Lốp, Dầu mỡ", "Trạng thái: Đủ tồn kho"]) +
    make_stats([("Tổng mã phụ tùng", "345 mã", "Giá trị tồn 1.85 tỷ đ"), ("Mã dưới mức tồn an toàn", "6 mã", "Đang đặt hàng bổ sung"), ("Số lượt xuất kho hôm nay", "18 lượt", "Phục vụ 6 ca sửa chữa"), ("Tỷ lệ đáp ứng phụ tùng", "97.8%", "Đảm bảo xe không chờ lâu")]) +
    make_table(
        ["MÃ PHỤ TÙNG", "TÊN PHỤ TÙNG / QUY CÁCH", "CHỦNG LOẠI XE ÁP DỤNG", "ĐƠN VỊ TÍNH", "TỒN KHO THỰC TẾ", "MỨC AN TOÀN", "ĐƠN GIÁ (VNĐ)", "TRẠNG THÁI"],
        [
            ["<b>VT-LOC-01</b><small>P550388 Donalson</small>", "Lọc nhớt động cơ John Deere<small>Chính hãng Donaldson Mỹ</small>", "Máy kéo John Deere 6140B", "Cái", "<b>28</b>", "15", "420.000 đ", make_pill("Đủ tồn kho", "")],
            ["<b>VT-DAU-02</b><small>15W-40 CI-4</small>", "Dầu nhớt động cơ Diesel THACO AGRI<small>Phuy 209 Lít chuyên dụng</small>", "Toàn bộ máy kéo & xe tải", "Lít", "<b>1.450</b>", "800", "78.000 đ", make_pill("Đủ tồn kho", "")],
            ["<b>VT-TL-03</b><small>ISO VG 68</small>", "Dầu thủy lực Castrol Hyspin 68<small>Phuy 209 Lít chịu nhiệt cao</small>", "Máy đào, xe ben, dàn cày", "Lít", "<b>850</b>", "400", "85.000 đ", make_pill("Đủ tồn kho", "")],
            ["<b>VT-LOP-04</b><small>12.00R20 Bridgestone</small>", "Lốp xe tải nặng có săm yếm<small>18 lớp bố chịu tải đá dăm</small>", "Xe tải Howo, Hyundai HD270", "Quả", "<b>4</b>", "8", "7.850.000 đ", make_pill("Dưới mức an toàn", "pending")],
            ["<b>VT-DAO-05</b><small>DC70-CUT-01</small>", "Lưỡi dao cắt máy gặt đập Kubota<small>Thép hợp kim chống mài mòn</small>", "Máy gặt Kubota DC-70G", "Bộ", "<b>12</b>", "5", "1.250.000 đ", make_pill("Đủ tồn kho", "")],
            ["<b>VT-CUROA-06</b><small>Bando B-85</small>", "Dây curoa truyền động búa đập", "Máy gặt & Máy băm cỏ", "Sợi", "<b>2</b>", "6", "380.000 đ", make_pill("Cần nhập gấp", "danger")]
        ],
        "Tìm mã vật tư, tên phụ tùng, loại xe...",
        "Hiển thị 1–6 trên 345 mã phụ tùng"
    )
)

data_part2["pages/7-bao-tri-sua-chua/lich-su-btsc.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Lịch sử bảo trì - sửa chữa", "Nhật ký lưu trữ toàn bộ các lần bảo dưỡng, thay thế phụ tùng và chi phí kỹ thuật của đội xe.", ["↗ Xuất sổ theo dõi", "🔍 Lọc theo xe"]) +
    make_filters(["Tháng 08/2026", "Tất cả xí nghiệp", "Đã thanh quyết toán"]) +
    make_stats([("Tổng lượt BTSC trong tháng", "48 lượt", "34 bảo dưỡng · 14 sửa chữa"), ("Tổng chi phí phụ tùng", "142.500.000 đ", "Đạt 94% ngân sách"), ("Thời gian xe dừng TB", "5.2 giờ/lần", "Nhanh hơn 1.2h so tháng 7"), ("Đánh giá chất lượng", "100% đạt chuẩn", "0 xe bị hỏng lại trong 30 ngày")]) +
    make_timeline([
        ("Hoàn thành bảo dưỡng cấp 2 xe máy kéo XC-JD-024", "Thay nhớt động cơ, lọc nhớt, lọc dầu sơ cấp và xúc rửa két nước làm mát. Tổng chi phí: 3.250.000 đ.", "23/08/2026 · 11:30 · KTV Đỗ Thanh Hải · Xưởng Trung tâm", "Xem hóa đơn"),
        ("Sửa chữa lưu động bục ống dầu thủy lực xe XC-NH-031", "Bấm lại 2 đầu ống cút thủy lực chịu áp cao 350 bar tại Lô CN-B06. Xe tiếp tục cày lúc 10:30. Chi phí: 1.450.000 đ.", "23/08/2026 · 10:15 · KTV Huỳnh Tấn Đạt", "Xem biên bản hiện trường"),
        ("Đại tu hệ thống phanh xe Howo XT-HW-102", "Tán má phanh 4 bánh sau, thay 2 bầu phanh lốc-kê Wabco và thay dầu phanh DOT4. Tổng chi phí: 4.600.000 đ.", "22/08/2026 · 16:00 · Tổ Gầm Máy Xưởng", "Xem chi tiết"),
        ("Thay lốp mới xe ben chở đá XB-HD-062", "Thay 2 quả lốp Bridgestone 12.00R20 trục sau bên phụ do chém đá rách hông lốp. Chi phí: 15.700.000 đ.", "20/08/2026 · 14:00 · KTV Tổ Lốp", "Xem biên bản hỏng lốp"),
        ("Bảo dưỡng định kỳ trước mùa gặt cho máy gặt DC-70G", "Thay bộ dao cắt, tăng xích truyền động, thay 4 vòng bi sàng rung và bơm mỡ toàn bộ gối đỡ. Chi phí: 2.800.000 đ.", "18/08/2026 · 17:00 · KTV Đỗ Thanh Hải", "Xem biên bản nghiệm thu")
    ])
)

data_part2["pages/7-bao-tri-sua-chua/dang-kiem.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Quản lý Đăng kiểm", "Theo dõi thời hạn kiểm định an toàn kỹ thuật và bảo vệ môi trường cho các loại xe ô tô tải, xe téc và xe chuyên dùng.", ["↗ Xuất danh sách đến hạn", "＋ Thêm hồ sơ đăng kiểm"]) +
    make_filters(["Tất cả phương tiện ô tô (48 xe)", "Cảnh báo hạn: Dưới 45 ngày", "Đang theo dõi"]) +
    make_stats([("Xe còn hạn đăng kiểm", "46 xe", "Tỷ lệ 95.8%"), ("Sắp đến hạn (<30 ngày)", "2 xe", "Đã đặt lịch Trung tâm 81-02D"), ("Đang kiểm định hôm nay", "1 xe", "Xe tải Hino XT-HN-079"), ("Hết hạn đăng kiểm", "0 xe", "Tuyệt đối an toàn")]) +
    make_table(
        ["BIỂN SỐ XE / MÃ PHƯƠNG TIỆN", "CHỦNG LOẠI PHƯƠNG TIỆN", "ĐƠN VỊ QUẢN LÝ", "TRUNG TÂM KIỂM ĐỊNH", "NGÀY ĐĂNG KIỂM GẦN NHẤT", "NGÀY HẾT HẠN", "SỐ TEM KIỂM ĐỊNH", "TRẠNG THÁI"],
        [
            ["<b>51C-892.34</b><small>XT-HW-102</small>", "Xe tải Howo 4 chân 15T<small>Năm SX: 2023</small>", "Đội Vận tải Nặng<small>KLH Koun Mom</small>", "Trung tâm ĐK 81-02D Gia Lai", "15/09/2025", "<b style='color:var(--amber)'>15/09/2026 (Còn 22 ngày)</b>", "KD-9982012", make_pill("Sắp đến hạn", "pending")],
            ["<b>77C-124.58</b><small>XT-HN-079</small>", "Xe tải Hino 500 (8 tấn)<small>Năm SX: 2022</small>", "Đội Vận tải NT2<small>XN Chuối 2</small>", "Trung tâm ĐK 77-01S Bình Định", "24/08/2025", "<b style='color:var(--green2)'>24/08/2026 (Đang đi khám)</b>", "KD-8819024", make_pill("Đang khám xe", "")],
            ["<b>60C-556.78</b><small>XB-HD-062</small>", "Xe ben Hyundai HD270 15T<small>Năm SX: 2021</small>", "Đội Thi công Thủy lợi<small>KLH Koun Mom</small>", "Trung tâm ĐK 60-01S Đồng Nai", "10/11/2025", "<b style='color:var(--green2)'>10/11/2026</b>", "KD-7712901", make_pill("Còn hạn", "")],
            ["<b>51D-334.12</b><small>XB-HN-045</small>", "Xe téc phun nước Hino 15m3<small>Năm SX: 2024</small>", "Đội BVTV Nông trường 1", "Trung tâm ĐK 81-02D Gia Lai", "20/01/2026", "<b style='color:var(--green2)'>20/01/2027</b>", "KD-1102948", make_pill("Còn hạn", "")],
            ["<b>81C-098.45</b><small>BT-FR-007</small>", "Xe bán tải Ford Ranger 4x4<small>Xe tuần tra kỹ thuật</small>", "Phòng Kỹ thuật KLH", "Trung tâm ĐK 81-01S Gia Lai", "05/04/2026", "<b style='color:var(--green2)'>05/04/2027</b>", "KD-5591028", make_pill("Còn hạn", "")]
        ],
        "Tìm biển số xe, mã xe, trung tâm đăng kiểm...",
        "Hiển thị 1–5 trên 48 phương tiện ô tô"
    )
)

data_part2["pages/7-bao-tri-sua-chua/bao-hiem.html"] = (
    make_head("BẢO TRÌ - SỬA CHỮA", "Quản lý Bảo hiểm phương tiện", "Theo dõi hợp đồng Bảo hiểm bắt buộc TNDS và Bảo hiểm vật chất thân vỏ cho toàn bộ xe máy cơ giới.", ["↗ Xuất báo cáo hợp đồng", "＋ Thêm hợp đồng bảo hiểm"]) +
    make_filters(["Tất cả phương tiện (128 xe)", "Nhà bảo hiểm: PJICO / Bảo Việt", "Trạng thái: Còn hiệu lực"]) +
    make_stats([("Hợp đồng còn hiệu lực", "128 phương tiện", "100% được bảo hiểm"), ("Bảo hiểm vật chất thân vỏ", "86 phương tiện", "Xe mới dưới 5 năm"), ("Sắp đến hạn tái tục (<30 ngày)", "4 hợp đồng", "Đang lập tờ trình gia hạn"), ("Tổng phí bảo hiểm năm", "485.000.000 đ", "Đã duyệt ngân sách")]) +
    make_table(
        ["MÃ XE / BIỂN SỐ", "CHỦNG LOẠI XE", "CÔNG TY BẢO HIỂM", "SỐ HỢP ĐỒNG BẢO HIỂM", "LOẠI HÌNH BẢO HIỂM", "GIÁ TRỊ BẢO HIỂM", "NGÀY HẾT HẠN", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b><small>Máy kéo John Deere</small>", "Máy kéo cơ giới 140HP", "Bảo hiểm PJICO Gia Lai", "<b>HD-PJ-2025-0824</b>", "TNDS + Vật chất xe máy cơ giới", "<b>1.450.000.000 đ</b>", "<b style='color:var(--amber)'>15/09/2026 (Còn 22 ngày)</b>", make_pill("Sắp tái tục", "pending")],
            ["<b>51C-892.34</b><small>XT-HW-102</small>", "Xe tải Howo 4 chân 15T", "Bảo hiểm Bảo Việt TP.HCM", "<b>HD-BV-2025-1102</b>", "TNDS Bắt buộc + Vật chất 100%", "<b>1.200.000.000 đ</b>", "<b style='color:var(--green2)'>20/11/2026</b>", make_pill("Còn hiệu lực", "")],
            ["<b>XC-KB-053</b><small>Máy kéo Kubota</small>", "Máy kéo Kubota M7040", "Bảo hiểm PJICO Gia Lai", "<b>HD-PJ-2025-0912</b>", "TNDS Chủ máy cơ giới", "<b>650.000.000 đ</b>", "<b style='color:var(--green2)'>10/12/2026</b>", make_pill("Còn hiệu lực", "")],
            ["<b>77C-124.58</b><small>XT-HN-079</small>", "Xe tải Hino 500 8T", "Bảo hiểm PVI Bình Định", "<b>HD-PVI-2025-0456</b>", "TNDS + Vật chất thân vỏ", "<b>890.000.000 đ</b>", "<b style='color:var(--amber)'>28/09/2026 (Còn 35 ngày)</b>", make_pill("Sắp tái tục", "pending")],
            ["<b>60C-556.78</b><small>XB-HD-062</small>", "Xe ben Hyundai HD270", "Bảo hiểm Bảo Việt", "<b>HD-BV-2025-0678</b>", "TNDS Bắt buộc", "<b>950.000.000 đ</b>", "<b style='color:var(--green2)'>15/01/2027</b>", make_pill("Còn hiệu lực", "")]
        ],
        "Tìm mã xe, biển số, số hợp đồng bảo hiểm...",
        "Hiển thị 1–5 trên 128 phương tiện có bảo hiểm"
    )
)

print("Part 2 data defined successfully:", len(data_part2), "pages.")
