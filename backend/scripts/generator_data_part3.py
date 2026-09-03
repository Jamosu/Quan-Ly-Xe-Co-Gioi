# -*- coding: utf-8 -*-
"""Part 3: Nhiên liệu, Cảnh báo & Thông báo, Báo cáo"""
from mockup_helpers import make_pill, make_stats, make_filters, make_head, make_table, make_kanban, make_calendar, make_map, make_analytics, make_timeline, make_settings

data_part3 = {}

# 8. NHIÊN LIỆU
data_part3["pages/8-nhien-lieu/cap-nhien-lieu.html"] = (
    make_head("NHIÊN LIỆU", "Nhật ký cấp phát nhiên liệu", "Ghi nhận phiếu cấp phát dầu Diesel DO 0.05S và xăng tại trạm xăng cố định và xe bồn cấp lưu động ngoài đồng.", ["↗ Xuất bảng kê cấp dầu", "＋ Lập phiếu cấp dầu"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả vòi bơm / Trạm cấp", "Đã chốt ca sáng"]) +
    make_stats([("Tổng dầu xuất cấp hôm nay", "3.850 Lít", "+320L so hôm qua"), ("Số lượt xe được đổ dầu", "28 lượt", "Trung bình 137.5 L/xe"), ("Cấp lưu động ngoài đồng", "1.650 Lít", "Xe téc XN-DF-011"), ("Trực cấp tại Kho Trung tâm", "2.200 Lít", "Cột bơm điện tử T1")]) +
    make_table(
        ["MÃ PHIẾU CẤP", "THỜI GIAN", "XE NHẬN DẦU", "LÁI XE / NGƯỜI NHẬN", "SỐ LÍT CẤP", "GIỜ MÁY / ODO", "ĐIỂM CẤP DẦU", "THỦ KHO XUẤT"],
        [
            ["<b>PCD-0823-01</b>", "06:15:30", "<b>XC-JD-024</b><small>John Deere 6140B</small>", "Nguyễn Văn Minh<small>Đội Cơ giới 1</small>", "<b style='color:var(--green2);font-size:12px'>160 Lít</b>", "2.450 giờ máy", "Cột bơm T1 (Kho trung tâm)", "Lê Thị Thu Hà<small>Thủ kho</small>"],
            ["<b>PCD-0823-02</b>", "06:30:15", "<b>XT-HW-102</b><small>Howo 4 chân 15T</small>", "Trần Quốc Huy<small>Đội Vận tải Nặng</small>", "<b style='color:var(--green2);font-size:12px'>220 Lít</b>", "148.200 km", "Cột bơm T1 (Kho trung tâm)", "Lê Thị Thu Hà<small>Thủ kho</small>"],
            ["<b>PCD-0823-03</b>", "08:10:00", "<b>XC-KB-053</b><small>Kubota M7040</small>", "Lê Hoàng Nam<small>Đội Cơ giới 1</small>", "<b style='color:var(--green2);font-size:12px'>65 Lít</b>", "3.120 giờ máy", "Xe bồn cấp lưu động tại Lô A12", "Huỳnh Tấn Đạt<small>Lái xe bồn</small>"],
            ["<b>PCD-0823-04</b>", "08:25:40", "<b>XB-HD-062</b><small>Ben Hyundai HD270</small>", "Keo Sarath<small>Đội Thủy lợi</small>", "<b style='color:var(--green2);font-size:12px'>140 Lít</b>", "210.500 km", "Xe bồn cấp lưu động tại NT2", "Huỳnh Tấn Đạt<small>Lái xe bồn</small>"],
            ["<b>PCD-0823-05</b>", "08:40:12", "<b>XB-HN-045</b><small>Xe téc nước Hino</small>", "Phạm Quốc An<small>Đội BVTV</small>", "<b style='color:var(--green2);font-size:12px'>110 Lít</b>", "92.400 km", "Cột bơm T1 (Kho trung tâm)", "Lê Thị Thu Hà<small>Thủ kho</small>"]
        ],
        "Tìm mã phiếu, số xe, tên tài xế, điểm cấp...",
        "Hiển thị 1–5 trên 28 phiếu cấp phát dầu"
    )
)

data_part3["pages/8-nhien-lieu/dinh-muc-nhien-lieu.html"] = (
    make_head("NHIÊN LIỆU", "Định mức tiêu hao nhiên liệu", "Bảng quy định định mức tiêu chuẩn nhiên liệu khoán cho từng loại máy móc theo giờ nổ máy và diện tích canh tác.", ["↗ Xuất quyết định định mức", "＋ Điều chỉnh định mức"]) +
    make_filters(["Áp dụng: Năm 2026", "Tất cả nhóm phương tiện", "Đã duyệt bởi HĐ Kỹ thuật"]) +
    make_stats([("Định mức cày ải sâu (L/ha)", "18.5 Lít/ha", "Đất thịt pha cát NT1"), ("Định mức bừa phẳng (L/ha)", "12.0 Lít/ha", "Dàn bừa đĩa 24 chảo"), ("Định mức máy kéo (L/giờ)", "4.2 Lít/giờ", "Chạy không tải 1.8 L/h"), ("Định mức xe tải Howo (L/100km)", "30.0 Lít/100km", "Tải trọng bình quân 14T")]) +
    make_table(
        ["MÃ ĐỊNH MỨC", "CHỦNG LOẠI PHƯƠNG TIỆN", "CÔNG VIỆC ÁP DỤNG", "ĐƠN VỊ TÍNH", "ĐỊNH MỨC TIÊU CHUẨN", "DUNG SAI CHO PHÉP", "GHI CHÚ ĐIỀU KIỆN ĐẤT", "TRẠNG THÁI"],
        [
            ["<b>ĐM-CAY-01</b>", "Máy kéo John Deere 6140B (140HP)", "Cày lật đất sâu 35cm (Dàn 4 chảo)", "Lít / Ha", "<b>18.5 Lít</b>", "±5%", "Đất thịt nhẹ, độ ẩm 18-22%", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-BUA-02</b>", "Máy kéo Kubota M7040 (70HP)", "Bừa phẳng & lên luống đôi trồng chuối", "Lít / Ha", "<b>12.0 Lít</b>", "±5%", "Đất đã cày ải, luống cao 40cm", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-GAT-03</b>", "Máy gặt đập Kubota DC-70G", "Thu hoạch bắp sinh khối & lúa giống", "Lít / Ha", "<b>15.0 Lít</b>", "±6%", "Độ ẩm ruộng bình thường", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-HOWO-04</b>", "Xe tải Howo 4 chân 371HP", "Vận chuyển chuối buồng về Packhouse", "Lít / 100 km", "<b>30.0 Lít</b>", "±4%", "Đường cấp phối nông trường", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-TEC-05</b>", "Xe téc Hino 15m3", "Phun thuốc BVTV & tưới cây", "Lít / Giờ máy", "<b>5.5 Lít</b>", "±5%", "Vận hành bơm áp lực cao", make_pill("Đang áp dụng", "")]
        ],
        "Tìm mã định mức, loại xe, công việc...",
        "Hiển thị 1–5 trên 24 quy chuẩn định mức nhiên liệu"
    )
)

data_part3["pages/8-nhien-lieu/doi-chieu-tieu-hao.html"] = (
    make_head("NHIÊN LIỆU", "Đối chiếu tiêu hao thực tế", "So sánh lượng dầu thực tế tiêu thụ (qua cảm biến GPS siêu âm) với định mức khoán để tính thưởng / phạt.", ["↗ Xuất bảng đối chiếu", "⚡ Chốt kỳ đối chiếu"]) +
    make_filters(["Kỳ đối chiếu: Tuần 34 (17/08 - 23/08)", "Toàn bộ xí nghiệp", "Trạng thái: Đã khớp số"]) +
    make_stats([("Tổng dầu thực tế", "24.520 Lít", "Định mức 25.800 Lít"), ("Tỷ lệ tiết kiệm toàn KLH", "+5.0%", "Tiết kiệm 1.280 Lít dầu"), ("Xe tiết kiệm (>3%)", "74 xe", "Thưởng thi đua 32 tài xế"), ("Xe vượt định mức (>3%)", "6 xe", "Đã yêu cầu giải trình")]) +
    make_analytics("Biểu đồ đối chiếu Dầu thực tế vs Định mức khoán (7 ngày qua)", "M10 170 C100 130, 220 145, 350 90 S520 80, 680 35", "24.520L", [("Tiết kiệm (Dưới ĐM)", "68%"), ("Đúng định mức (±2%)", "24%"), ("Vượt định mức", "8%")],
        make_table(
            ["MÃ XE / TÀI XẾ", "CHỦNG LOẠI", "CÔNG VIỆC THỰC HIỆN", "DIỆN TÍCH / KM", "ĐỊNH MỨC KHOÁN", "THỰC TẾ TIÊU HAO", "CHÊNH LỆCH", "ĐÁNH GIÁ"],
            [
                ["<b>XC-JD-024</b><small>Nguyễn Văn Minh</small>", "John Deere 6140B", "Cày ải Lô CN-A12", "<b>24.0 ha</b>", "444.0 Lít<small>18.5 L/ha</small>", "<b>416.5 Lít</b><small>17.35 L/ha</small>", "<b style='color:var(--green2)'>-27.5 L (-6.2%)</b>", "<span class='module-pill'>Thưởng tiết kiệm</span>"],
                ["<b>XT-HW-102</b><small>Trần Quốc Huy</small>", "Howo 4 chân", "Vận chuyển chuối PH2", "<b>620 km</b>", "186.0 Lít<small>30.0 L/100km</small>", "<b>177.0 Lít</b><small>28.5 L/100km</small>", "<b style='color:var(--green2)'>-9.0 L (-4.8%)</b>", "<span class='module-pill'>Thưởng tiết kiệm</span>"],
                ["<b>XC-KB-053</b><small>Lê Hoàng Nam</small>", "Kubota M7040", "Lên luống Lô B06", "<b>18.2 ha</b>", "218.4 Lít<small>12.0 L/ha</small>", "<b>210.8 Lít</b><small>11.58 L/ha</small>", "<b style='color:var(--green2)'>-7.6 L (-3.5%)</b>", "<span class='module-pill'>Thưởng tiết kiệm</span>"],
                ["<b>XT-HN-079</b><small>Sok Phearith</small>", "Hino 500 8T", "Chở phân bón NT2", "<b>450 km</b>", "99.0 Lít<small>22.0 L/100km</small>", "<b>108.5 Lít</b><small>24.1 L/100km</small>", "<b style='color:var(--red)'>+9.5 L (+9.6%)</b>", "<span class='module-pill danger'>Vượt ĐM (Chạy vượt tốc)</span>"],
                ["<b>XB-HD-062</b><small>Keo Sarath</small>", "Ben Hyundai", "Chở vật liệu làm đường", "<b>380 km</b>", "133.0 Lít<small>35.0 L/100km</small>", "<b>134.2 Lít</b><small>35.3 L/100km</small>", "<b style='color:var(--amber)'>+1.2 L (+0.9%)</b>", "<span class='module-pill pending'>Đạt chuẩn (±1%)</span>"]
            ],
            "Tìm mã xe, tài xế, tình trạng tiêu hao...",
            "Hiển thị 1–5 trên 86 phương tiện đối chiếu"
        )
    )
)

data_part3["pages/8-nhien-lieu/ton-kho.html"] = (
    make_head("NHIÊN LIỆU", "Quản lý Tồn kho & Bồn chứa", "Kiểm soát lượng tồn kho dầu Diesel DO 0.05S, xăng và dầu thủy lực tại các bồn chứa trung tâm và trạm vệ tinh.", ["↗ Xuất biên bản kiểm kê", "＋ Nhập hàng về bồn"]) +
    make_filters(["Tất cả bồn chứa (6 bồn)", "Chủng loại: Dầu DO 0.05S", "Trạng thái: An toàn"]) +
    make_stats([("Tổng tồn kho Diesel", "84.500 Lít", "Đáp ứng 18 ngày vận hành"), ("Bồn Trung tâm T1 (50m3)", "41.200 Lít", "Tỷ lệ đầy 82.4%"), ("Bồn Nông trường 2 (20m3)", "16.800 Lít", "Tỷ lệ đầy 84.0%"), ("Tồn trên xe bồn lưu động", "4.500 Lít", "Sẵn sàng cấp ngoài đồng")]) +
    make_table(
        ["MÃ BỒN CHỨA", "TÊN BỒN / VỊ TRÍ", "CHỦNG LOẠI NHIÊN LIỆU", "DUNG TÍCH THIẾT KẾ", "TỒN KHO THỰC TẾ", "TỶ LỆ ĐẦY", "MỨC AN TOÀN TỐI THIỂU", "TRẠNG THÁI"],
        [
            ["<b>BON-TT-01</b>", "Bồn Ngầm Trung Tâm 1<small>Kho Xăng dầu Trung tâm KLH</small>", "Diesel DO 0.05S (Chính)", "<b>50.000 Lít</b>", "<b style='color:var(--green2);font-size:12px'>41.200 Lít</b>", "82.4%", "10.000 Lít", make_pill("An toàn", "")],
            ["<b>BON-TT-02</b>", "Bồn Ngầm Trung Tâm 2<small>Kho Xăng dầu Trung tâm KLH</small>", "Diesel DO 0.05S (Dự phòng)", "<b>30.000 Lít</b>", "<b style='color:var(--green2);font-size:12px'>22.000 Lít</b>", "73.3%", "8.000 Lít", make_pill("An toàn", "")],
            ["<b>BON-NT2-03</b>", "Bồn Nổi Nông Trường 2<small>Bãi Cơ giới Xí nghiệp Chuối 2</small>", "Diesel DO 0.05S (Cấp máy cày)", "<b>20.000 Lít</b>", "<b style='color:var(--green2);font-size:12px'>16.800 Lít</b>", "84.0%", "5.000 Lít", make_pill("An toàn", "")],
            ["<b>BON-XN-DF11</b>", "Xe téc bồn cấp lưu động<small>Dongfeng 5m3 (Biển: 51C-011.89)</small>", "Diesel DO 0.05S", "<b>5.000 Lít</b>", "<b style='color:var(--green2);font-size:12px'>4.500 Lít</b>", "90.0%", "1.000 Lít", make_pill("Đầy bồn", "")],
            ["<b>BON-XANG-05</b>", "Bồn Xăng Ron 95-V<small>Phục vụ xe bán tải & máy cắt cỏ</small>", "Xăng không chì Ron 95-V", "<b>10.000 Lít</b>", "<b style='color:var(--amber);font-size:12px'>2.800 Lít</b>", "28.0%", "3.000 Lít", make_pill("Sắp hết (Đặt hàng)", "pending")]
        ],
        "Tìm mã bồn, vị trí, loại nhiên liệu...",
        "Hiển thị 5 bồn chứa nhiên liệu chính"
    )
)

data_part3["pages/8-nhien-lieu/lich-su-cap-phat.html"] = (
    make_head("NHIÊN LIỆU", "Lịch sử nhập xuất nhiên liệu", "Nhật ký truy vết toàn bộ các đợt nhập dầu từ xe téc Petrolimex và các ca xuất cấp cho phương tiện.", ["↗ Xuất sổ nhật ký", "🔍 Tìm theo ngày"]) +
    make_filters(["Tháng 08/2026", "Tất cả giao dịch Nhập / Xuất", "Đã chốt sổ kế toán"]) +
    make_stats([("Tổng lượng nhập kho", "60.000 Lít", "3 chuyến xe bồn 20m3"), ("Tổng lượng xuất cấp", "52.400 Lít", "Bình quân 2.270 L/ngày"), ("Hao hụt tự nhiên", "0.12%", "Dưới chuẩn 0.25%"), ("Chênh lệch sổ sách vs đo", "0 Lít", "Khớp 100% que đo điện tử")]) +
    make_timeline([
        ("Nhập bồn ngầm 20.000 Lít Diesel DO 0.05S", "Xe téc Petrolimex Gia Lai biển số 81C-182.90 nhập hàng tại Bồn Trung tâm T1. Tỷ trọng 0.842, nhiệt độ 28°C. Không có tạp chất.", "22/08/2026 · 15:30 · Thủ kho Lê Thị Thu Hà · Kế toán trưởng nghiệm thu", "Xem phiếu nhập kho"),
        ("Xuất cấp lưu động ca chiều cho Đội Cơ giới 1", "Xe téc XN-DF-011 xuất 1.200 lít dầu cấp cho 8 máy kéo đang cày đất tại Lô CN-A12.", "22/08/2026 · 13:45 · Thủ kho kiêm tài xế Huỳnh Tấn Đạt", "Xem danh sách xe"),
        ("Kiểm kê bồn ngầm định kỳ giữa tháng", "Đo thể tích bằng thước đo điện tử kết hợp thả que đo thủ công. Bồn T1: 24.500L, Bồn T2: 12.000L. Khớp 100% dữ liệu cảm biến.", "15/08/2026 · 17:00 · Ban Kiểm kê KLH", "Xem biên bản kiểm kê"),
        ("Nhập bồn ngầm 20.000 Lít Diesel DO 0.05S", "Nhập đợt 2 trong tháng phục vụ cao điểm làm đất trước mùa mưa.", "10/08/2026 · 09:00 · Petrolimex bàn giao", "Xem phiếu nhập"),
        ("Nhập 10.000 Lít Xăng Ron 95-V", "Nhập xăng phục vụ toàn bộ dàn xe bán tải tuần tra và máy nông cụ cầm tay.", "02/08/2026 · 14:00 · Kho Xăng Dầu T1", "Xem phiếu nhập")
    ])
)

# 9. CẢNH BÁO & THÔNG BÁO
data_part3["pages/9-canh-bao-thong-bao/chua-xu-ly.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Cảnh báo chưa xử lý", "Danh sách các sự cố sụt dầu bất thường, vượt tốc độ, ra khỏi vùng giám sát và cảnh báo kỹ thuật động cơ đang chờ xử lý.", ["↗ Xuất danh sách cảnh báo", "✓ Xác nhận tất cả"]) +
    make_filters(["Hôm nay, 23/08/2026", "Mức độ: Nghiêm trọng & Cảnh báo", "Trạng thái: Đang chờ (18 sự kiện)"]) +
    make_stats([("Cảnh báo nghiêm trọng (SOS)", "6 sự kiện", "Cần xử lý ngay"), ("Cảnh báo tốc độ / vùng", "8 sự kiện", "Đã gửi tin nhắc tài xế"), ("Cảnh báo kỹ thuật máy", "4 sự kiện", "Nhiệt độ nước & nhớt"), ("Thời gian chờ xử lý TB", "8.5 phút", "Quy định phản hồi <15p")]) +
    make_table(
        ["MỨC ĐỘ", "THỜI GIAN PHÁT SINH", "PHƯƠNG TIỆN & LÁI XE", "LOẠI CẢNH BÁO", "CHI TIẾT THÔNG SỐ CẢNH BÁO", "VỊ TRÍ PHÁT SINH", "HÀNH ĐỘNG XỬ LÝ"],
        [
            ["<span class='module-pill danger'>KHẨN CẤP</span>", "08:40:12 (2p trước)", "<b>XC-JD-024</b><small>Nguyễn Văn Minh</small>", "<b>Sụt giảm nhiên liệu bất thường</b>", "Mức dầu giảm đột ngột <b>15 Lít trong 3 phút</b> khi xe đang dừng", "Lô CN-A12<small>Gần bờ kênh</small>", "<button class='btn btn-primary' style='padding:4px 8px;font-size:9px'>📞 Gọi tài xế ngay</button>"],
            ["<span class='module-pill danger'>KHẨN CẤP</span>", "08:35:00 (7p trước)", "<b>XT-HN-079</b><small>Sok Phearith</small>", "<b>Chạy quá tốc độ quy định</b>", "Vận tốc đạt <b>38.5 km/h</b> (Quy định tối đa 30 km/h)", "Trục đường chính NT2<small>Khu vực trường học</small>", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Nhắc nhở bộ đàm</button>"],
            ["<span class='module-pill pending'>CẢNH BÁO</span>", "08:24:18 (18p trước)", "<b>MU-KM-015</b><small>Keo Sarath</small>", "<b>Mất kết nối GPS > 2 giờ</b>", "Mất tín hiệu GSM/GPS từ 06:15 sáng", "Lô khai hoang MR-01<small>Vùng giáp ranh</small>", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Cử thợ kiểm tra</button>"],
            ["<span class='module-pill pending'>CẢNH BÁO</span>", "08:15:30 (27p trước)", "<b>XB-HD-062</b><small>Võ Văn Thành</small>", "<b>Nhiệt độ nước làm mát quá cao</b>", "Nhiệt độ đạt <b>99°C</b> (Ngưỡng an toàn 95°C)", "Đoạn dốc đập tràn hồ tưới", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Yêu cầu dừng xe</button>"],
            ["<span class='module-pill'>NHẮC NHỞ</span>", "07:55:00 (47p trước)", "<b>XC-KB-053</b><small>Lê Hoàng Nam</small>", "<b>Dừng xe nổ máy lâu</b>", "Nổ máy tại chỗ <b>42 phút</b> không di chuyển", "Bãi tập kết Lô B06", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Tắt máy tiết kiệm</button>"]
        ],
        "Tìm mã xe, loại cảnh báo, tài xế...",
        "Hiển thị 1–5 trên 18 cảnh báo chưa xử lý"
    )
)

data_part3["pages/9-canh-bao-thong-bao/da-xu-ly.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Cảnh báo đã xử lý", "Lịch sử các cảnh báo đã được trung tâm điều độ xác minh, xử lý thành công và ghi chú nguyên nhân.", ["↗ Xuất báo cáo xử lý", "🔍 Lọc theo loại sự cố"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả mức độ", "Trạng thái: Đã hoàn tất"]) +
    make_stats([("Cảnh báo đã xử lý", "42 sự kiện", "100% có biên bản"), ("Thời gian xử lý TB", "6.2 phút", "Nhanh hơn mục tiêu 10p"), ("Sự cố kỹ thuật thực tế", "8 vụ", "Đã khắc phục xong"), ("Cảnh báo giả / Sai số", "4 vụ", "Do rung lắc cảm biến")]) +
    make_table(
        ["MÃ SỰ KIỆN", "THỜI GIAN", "PHƯƠNG TIỆN & TÀI XẾ", "LOẠI CẢNH BÁO", "NGUYÊN NHÂN XÁC MINH", "BIỆN PHÁP KHẮC PHỤC", "NGƯỜI XỬ LÝ", "TRẠNG THÁI"],
        [
            ["<b>CB-0823-11</b>", "07:30:15", "<b>XT-HW-102</b><small>Trần Quốc Huy</small>", "Vượt tốc độ (34 km/h)", "Tài xế tăng ga vượt dốc cầu cạn", "Đã nhắc nhở giảm tốc qua bộ đàm", "Chau Tiểu Long<small>Điều độ viên</small>", make_pill("Đã đóng", "")],
            ["<b>CB-0823-12</b>", "06:45:00", "<b>XC-NH-031</b><small>Sok Phearith</small>", "Rời khỏi vùng quy định", "Đi vòng tránh đoạn đường bị ngập sình", "Xác nhận đúng lộ trình thực địa", "Chau Tiểu Long<small>Điều độ viên</small>", make_pill("Hợp lệ", "")],
            ["<b>CB-0822-45</b>", "Hôm qua 16:20", "<b>XB-HN-045</b><small>Phạm Quốc An</small>", "Áp suất nhớt máy thấp", "Cảm biến báo ảo do lỏng giắc cắm", "KTV Đỗ Thanh Hải đã cắm lại giắc", "Lê Minh Tâm<small>Trưởng xưởng</small>", make_pill("Đã sửa", "")],
            ["<b>CB-0822-42</b>", "Hôm qua 14:10", "<b>XC-JD-019</b><small>Đỗ Thanh Hải</small>", "Cảnh báo đến hạn bảo dưỡng 2.000h", "Xe đã chạy đủ 2.000 giờ máy", "Đã đưa vào xưởng bảo dưỡng cấp 2", "Nguyễn Văn Hải<small>Quản đốc</small>", make_pill("Đã bảo dưỡng", "")],
            ["<b>CB-0822-38</b>", "Hôm qua 11:05", "<b>XT-HN-055</b><small>Keo Sarath</small>", "Dừng xe bật máy lạnh lâu", "Chờ công nhân bốc chuối tại packhouse", "Đã hướng dẫn tắt máy khi chờ trên 15p", "Chau Tiểu Long<small>Điều độ viên</small>", make_pill("Đã nhắc nhở", "")]
        ],
        "Tìm mã sự kiện, số xe, người xử lý...",
        "Hiển thị 1–5 trên 42 cảnh báo đã xử lý"
    )
)

data_part3["pages/9-canh-bao-thong-bao/lich-su-canh-bao.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Nhật ký cảnh báo toàn hệ thống", "Lưu trữ toàn bộ dữ liệu cảnh báo vi phạm hành trình, nhiên liệu và an toàn phương tiện phục vụ thanh tra.", ["↗ Xuất file Excel Audit", "🔍 Tìm kiếm nâng cao"]) +
    make_filters(["Tháng 08/2026", "Tất cả xí nghiệp", "Đã xác thực Audit Trail"]) +
    make_stats([("Tổng sự kiện cảnh báo", "186 sự kiện", "-24% so tháng trước"), ("Vi phạm tốc độ", "84 sự kiện", "Giảm mạnh nhờ phạt nguội"), ("Cảnh báo nhiên liệu", "22 sự kiện", "Phát hiện 2 vụ rút dầu"), ("Cảnh báo vùng Geo-fence", "48 sự kiện", "Chủ yếu do né đường ngập")]) +
    make_timeline([
        ("Phát hiện bất thường sụt 15 lít dầu xe XC-JD-024", "Cảm biến nhiên liệu sóng siêu âm DUT-E ghi nhận mức dầu giảm từ 155L xuống 140L trong 3 phút. Điều độ viên đã liên hệ tài xế kiểm tra đường ống và khóa bình dầu.", "23/08/2026 · 08:40:12 · Hệ thống Cảnh báo Tự động · Chau Tiểu Long xử lý", "Xem đồ thị dầu"),
        ("Cảnh báo xe tải XT-HN-079 chạy tốc độ 38.5 km/h", "Xe vượt tốc độ cho phép 30km/h trên trục đường chính Nông trường 2. Hệ thống tự động gửi tin nhắn cảnh báo đến Zalo tài xế Sok Phearith.", "23/08/2026 · 08:35:00 · Hệ thống GPS Speed Guard", "Xem vị trí bản đồ"),
        ("Xe ben XB-HD-062 báo quá nhiệt nước làm mát 99°C", "Cảm biến nhiệt độ động cơ kích hoạt cảnh báo đỏ. Kỹ thuật viên hướng dẫn tài xế dừng xe kiểm tra dây curoa quạt gió và bổ sung nước làm mát.", "23/08/2026 · 08:15:30 · Cảm biến OBD-II", "Xem dữ liệu ECU"),
        ("Xe máy kéo XC-KB-042 ra khỏi vùng quy định Lô CN-B06", "Phương tiện di chuyển ra ngoài ranh giới nông trường 1.5 km hướng về phía trạm sửa chữa lưu động.", "22/08/2026 · 15:40:00 · Hệ thống Geo-Fence", "Xem vùng ranh giới"),
        ("Khôi phục tín hiệu GPS xe máy ủi MU-KM-015", "Thiết bị định vị 4G kết nối lại thành công sau 45 phút mất sóng trong khu vực thung lũng khe suối.", "21/08/2026 · 17:10:00 · Gateway Server", "Xem trạng thái mạng")
    ])
)

data_part3["pages/9-canh-bao-thong-bao/cau-hinh-canh-bao.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Cấu hình ngưỡng cảnh báo", "Thiết lập các ngưỡng kích hoạt cảnh báo tốc độ, sụt nhiên liệu, thời gian dừng đỗ và kênh nhận thông báo.", ["Khôi phục mặc định", "💾 Lưu cấu hình"]) +
    make_filters(["Phạm vi: Toàn KLH Koun Mom", "Quy tắc: Tiêu chuẩn 2026", "Áp dụng ngay"]) +
    make_stats([("Quy tắc đang bật", "12 quy tắc", "100% tự động giám sát"), ("Kênh thông báo Zalo Bot", "Đang kết nối", "Gửi tin dưới 2 giây"), ("Kênh thông báo Telegram", "Đang kết nối", "Kênh Ban Giám Đốc"), ("Ngưỡng tốc độ chung", "30 km/h", "Đường nội bộ nông trường")]) +
    make_settings("Cấu hình ngưỡng cảnh báo an toàn & Nhiên liệu", "Các thông số áp dụng cho toàn bộ thiết bị định vị GPS và cảm biến gắn trên dàn xe cơ giới.", [
        {"label": "Ngưỡng cảnh báo quá tốc độ đường nội bộ (km/h)", "val": "30", "hint": "Hệ thống sẽ báo động nếu xe chạy vượt quá tốc độ này liên tục 15 giây."},
        {"label": "Ngưỡng cảnh báo quá tốc độ khu vực dân cư / Packhouse (km/h)", "val": "15", "hint": "Áp dụng nghiêm ngặt cho vùng có đông công nhân và trạm cân."},
        {"label": "Ngưỡng sụt giảm nhiên liệu bất thường (Lít / phút)", "val": "5.0", "hint": "Nếu mức dầu giảm đột ngột > 5L trong vòng 1 phút khi xe đang dừng máy, kích hoạt SOS trộm dầu."},
        {"label": "Thời gian tối đa nổ máy dừng xe tại chỗ (Phút)", "val": "20", "hint": "Cảnh báo tài xế bật máy lạnh hoặc nổ máy chờ quá lâu gây lãng phí nhiên liệu."},
        {"label": "Ngưỡng nhiệt độ nước làm mát báo động (°C)", "val": "98", "hint": "Yêu cầu tài xế dừng máy ngay lập tức để tránh bó kẹt pít-tông động cơ."},
        {"label": "Danh sách số điện thoại nhận SMS khẩn cấp (Phân cách bởi dấu phẩy)", "val": "0982112334, 0973224556, 0903778990", "hint": "Gửi SMS đến Giám đốc KLH và Trưởng xưởng khi có sự cố nghiêm trọng."}
    ], ["Quy tắc Tốc độ & Vùng", "Quy tắc Nhiên liệu", "Quy tắc Động cơ & Kỹ thuật", "Kênh thông báo (Telegram/Zalo)"])
)

# 10. BÁO CÁO
data_part3["pages/10-bao-cao/dieu-hanh.html"] = (
    make_head("BÁO CÁO", "Báo cáo tổng hợp điều hành", "Báo cáo toàn cảnh tình hình huy động xe cơ giới, tỷ lệ hoàn thành kế hoạch và hiệu suất khai thác toàn KLH.", ["↗ Xuất file Excel", "↗ Xuất báo cáo PDF"]) +
    make_filters(["Tháng 08/2026", "Tất cả xí nghiệp", "Tổng hợp tháng"]) +
    make_stats([("Tổng phương tiện huy động", "128 xe", "Tỷ lệ sẵn sàng 91.5%"), ("Tổng giờ máy hoạt động", "18.450 giờ", "Vượt 6.2% kế hoạch"), ("Tổng diện tích hoàn thành", "1.820 ha", "Đạt 102% chỉ tiêu vụ"), ("Tổng khối lượng vận chuyển", "8.950 tấn", "Chuối, phân bón, vật tư")]) +
    make_analytics("Biến động số lượng phương tiện hoạt động theo ngày trong tháng 08/2026", "M10 160 C120 130, 250 145, 380 90 S540 75, 680 30", "128 xe", [("Đang hoạt động", "67.2%"), ("Dự phòng / Dừng", "16.4%"), ("Bảo trì sửa chữa", "11.7%"), ("Mất tín hiệu", "4.7%")],
        make_table(
            ["ĐƠN VỊ / XÍ NGHIỆP", "TỔNG SỐ XE", "XE HOẠT ĐỘNG", "GIỜ MÁY NỔ (H)", "DIỆN TÍCH HOÀN THÀNH (HA)", "VẬN CHUYỂN (TẤN)", "HIỆU SUẤT KHAI THÁC", "ĐÁNH GIÁ"],
            [
                ["<b>Xí nghiệp Chuối 1</b><small>KLH Koun Mom</small>", "46 xe", "<b>36 xe</b>", "<b>6.850 h</b>", "<b>820.5 ha</b>", "3.850 T", "<b style='color:var(--green2)'>94.5%</b>", "<span class='module-pill'>Hoàn thành xuất sắc</span>"],
                ["<b>Xí nghiệp Chuối 2</b><small>KLH Koun Mom</small>", "38 xe", "<b>28 xe</b>", "<b>5.420 h</b>", "<b>610.0 ha</b>", "2.900 T", "<b style='color:var(--green2)'>91.2%</b>", "<span class='module-pill'>Đạt kế hoạch</span>"],
                ["<b>Xí nghiệp Cây ăn trái</b><small>Sầu riêng & Mít</small>", "22 xe", "<b>16 xe</b>", "<b>3.180 h</b>", "<b>389.5 ha</b>", "1.450 T", "<b style='color:var(--green2)'>88.6%</b>", "<span class='module-pill'>Đạt kế hoạch</span>"],
                ["<b>Đội Thi công Thủy lợi & Cứu hộ</b>", "22 xe", "<b>14 xe</b>", "<b>3.000 h</b>", "<b>14.2 km kênh</b>", "750 T", "<b style='color:var(--green2)'>86.0%</b>", "<span class='module-pill'>Đạt kế hoạch</span>"]
            ],
            "Tìm đơn vị, chỉ tiêu báo cáo...",
            "Tổng hợp số liệu 4 đơn vị sản xuất chính"
        )
    )
)

data_part3["pages/10-bao-cao/hanh-trinh.html"] = (
    make_head("BÁO CÁO", "Báo cáo hành trình & Km lăn bánh", "Thống kê tổng quãng đường di chuyển (km), số giờ nổ máy thực tế, số giờ làm việc hữu ích và thời gian dừng đỗ.", ["↗ Xuất Excel chi tiết", "🔍 Lọc theo phương tiện"]) +
    make_filters(["Tháng 08/2026", "Nhóm: Xe tải & Xe khách", "Dữ liệu GPS chuẩn"]) +
    make_stats([("Tổng quãng đường lăn bánh", "148.500 km", "+8.4% so tháng 7"), ("Quãng đường có tải", "112.400 km", "Tỷ lệ chạy tải 75.7%"), ("Vận tốc trung bình toàn đoàn", "24.2 km/h", "Đúng chuẩn an toàn"), ("Số lần vi phạm tốc độ", "14 lần", "Giảm 65% so cùng kỳ")]) +
    make_analytics("Xu hướng quãng đường lăn bánh hàng tuần (Km)", "M10 180 C110 140, 230 150, 360 100 S510 85, 680 40", "148.5k km", [("Chạy có hàng (Có tải)", "75.7%"), ("Chạy quay đầu (Không tải)", "24.3%")],
        make_table(
            ["MÃ XE / BIỂN SỐ", "CHỦNG LOẠI XE", "LÁI XE CHÍNH", "TỔNG KM (KM)", "KM CÓ TẢI (KM)", "GIỜ NỔ MÁY (H)", "VẬN TỐC TB (KM/H)", "SỐ LẦN DỪNG ĐỖ"],
            [
                ["<b>51C-892.34</b><small>XT-HW-102</small>", "Howo 4 chân 15T", "Trần Quốc Huy", "<b>4.850 km</b>", "3.920 km (80.8%)", "185 h", "26.2 km/h", "142 lần"],
                ["<b>77C-124.58</b><small>XT-HN-079</small>", "Hino 500 (8T)", "Sok Phearith", "<b>3.920 km</b>", "2.980 km (76.0%)", "162 h", "24.1 km/h", "118 lần"],
                ["<b>60C-556.78</b><small>XB-HD-062</small>", "Ben Hyundai HD270", "Keo Sarath", "<b>3.450 km</b>", "2.650 km (76.8%)", "154 h", "22.4 km/h", "98 lần"],
                ["<b>51D-334.12</b><small>XB-HN-045</small>", "Téc nước Hino 15m3", "Phạm Quốc An", "<b>2.180 km</b>", "1.850 km (84.8%)", "142 h", "18.5 km/h", "86 lần"],
                ["<b>81C-098.45</b><small>BT-FR-007</small>", "Ford Ranger 4x4", "Nguyễn Thành Long", "<b>5.200 km</b>", "Tuần tra nông trường", "170 h", "32.0 km/h", "165 lần"]
            ],
            "Tìm biển số xe, tên tài xế...",
            "Hiển thị 1–5 trên 48 xe ô tô vận tải"
        )
    )
)

data_part3["pages/10-bao-cao/san-xuat.html"] = (
    make_head("BÁO CÁO", "Báo cáo sản lượng làm đất & Cơ giới hóa", "Báo cáo tổng hợp diện tích cày, bừa, lên luống, gieo trồng và thu hoạch cơ giới theo từng nông trường.", ["↗ Xuất bảng sản lượng", "📊 Xem biểu đồ tiến độ"]) +
    make_filters(["Vụ Mùa 2026", "Cây trồng: Chuối & Cây ăn trái", "Nghiệm thu đạt chuẩn"]) +
    make_stats([("Tổng diện tích làm đất", "1.820 ha", "Đạt 101.1% kế hoạch"), ("Diện tích cày lật sâu 35cm", "950 ha", "28 máy kéo tham gia"), ("Diện tích lên luống đôi", "620 ha", "Chuẩn bị trồng chuối"), ("Sản lượng bắp sinh khối", "3.450 tấn", "Cung cấp cho Trại Bò")]) +
    make_analytics("Sản lượng diện tích làm đất hoàn thành theo tuần (Ha)", "M10 190 C130 160, 240 140, 360 85 S500 65, 680 20", "1.820 ha", [("XN Chuối 1", "45.1%"), ("XN Chuối 2", "33.5%"), ("XN Cây ăn trái", "21.4%")],
        make_table(
            ["NÔNG TRƯỜNG / LÔ THỬA", "HẠNG MỤC CÔNG VIỆC", "MÁY MÓC THỰC HIỆN", "KẾ HOẠCH GIAO (HA)", "THỰC TẾ HOÀN THÀNH", "TỶ LỆ ĐẠT", "ĐÁNH GIÁ CHẤT LƯỢNG"],
            [
                ["<b>Nông trường 1</b><small>Lô CN-A01 đến A20</small>", "Cày ải sâu 35cm & Bừa san phẳng", "Tổ máy kéo John Deere & Kubota", "800.0 ha", "<b>820.5 ha</b>", "<b style='color:var(--green2)'>102.5%</b>", "Độ sâu chuẩn, tơi xốp đạt 100%"],
                ["<b>Nông trường 2</b><small>Lô CN-B01 đến B15</small>", "Bừa ngấu & Lên luống đôi thoát nước", "Tổ máy kéo Kubota M7040", "600.0 ha", "<b>610.0 ha</b>", "<b style='color:var(--green2)'>101.6%</b>", "Luống thẳng, đúng thiết kế"],
                ["<b>Nông trường Cây ăn trái</b><small>Lô Sầu riêng CAT-C</small>", "Xới gốc, rạch rãnh bón phân hữu cơ", "Máy kéo New Holland TT4.90", "380.0 ha", "<b>389.5 ha</b>", "<b style='color:var(--green2)'>102.5%</b>", "Không đứt rễ cây ăn trái"],
                ["<b>Khu vực mở rộng NT2</b><small>Lô khai hoang MR-01</small>", "Rà rễ cây & San ủi mặt bằng", "Máy ủi Komatsu D31P & CAT 320D", "50.0 ha", "<b>48.0 ha</b>", "<b style='color:var(--amber)'>96.0%</b>", "Đang tiếp tục hoàn thiện"]
            ],
            "Tìm tên nông trường, hạng mục công việc...",
            "Tổng hợp số liệu sản xuất toàn KLH"
        )
    )
)

data_part3["pages/10-bao-cao/van-chuyen.html"] = (
    make_head("BÁO CÁO", "Báo cáo sản lượng vận chuyển nội bộ", "Thống kê tổng số tấn hàng hóa, số chuyến vận chuyển chuối buồng, phân bón, vật tư và thời gian quay vòng.", ["↗ Xuất báo cáo vận chuyển", "🔍 Tra cứu phiếu cân"]) +
    make_filters(["Tháng 08/2026", "Tất cả loại hàng", "Dữ liệu trạm cân"]) +
    make_stats([("Tổng khối lượng vận chuyển", "8.950 Tấn", "+12.5% so tháng trước"), ("Khối lượng chuối buồng", "6.420 Tấn", "458 chuyến xe Howo"), ("Khối lượng phân bón & vật tư", "2.530 Tấn", "316 chuyến xe tải"), ("Hao hụt vận chuyển", "0.22%", "Dưới định mức 0.5%")]) +
    make_analytics("Sản lượng tấn hàng vận chuyển theo tuần (Tấn)", "M10 175 C120 150, 240 135, 370 80 S520 60, 680 25", "8.950 T", [("Chuối tươi Packhouse", "71.7%"), ("Phân bón & Thức ăn", "18.5%"), ("Vật tư đóng gói", "9.8%")],
        make_table(
            ["LOẠI HÀNG HÓA", "TUYẾN VẬN CHUYỂN CHÍNH", "SỐ CHUYẾN XE", "KHỐI LƯỢNG TỊNH (TẤN)", "TRỌNG LƯỢNG TB / CHUYẾN", "XE THỰC HIỆN CHỦ YẾU", "ĐÁNH GIÁ TIẾN ĐỘ"],
            [
                ["<b>Chuối tươi xuất khẩu</b><small>Buồng chuối bọc túi xốp</small>", "Vườn cắt NT1 & NT2 ➔ Packhouse 1, 2", "<b>458 chuyến</b>", "<b>6.420 Tấn</b>", "14.0 Tấn / chuyến", "Xe tải Howo 4 chân 371HP", "<span class='module-pill'>Đúng tiến độ sơ chế</span>"],
                ["<b>Phân hữu cơ vi sinh</b><small>Bao 50kg & phân rời</small>", "Nhà máy ủ phân ➔ Bãi tập kết Lô", "<b>210 chuyến</b>", "<b>1.680 Tấn</b>", "8.0 Tấn / chuyến", "Xe tải Hino 8T & Ben HD270", "<span class='module-pill'>Đáp ứng kịp thời vụ</span>"],
                ["<b>Chuối phụ phẩm (Cám chăn nuôi)</b><small>Chuối dập, cuống chuối</small>", "Packhouse 1 & 2 ➔ Trại Bò Thịt", "<b>68 chuyến</b>", "<b>650 Tấn</b>", "9.5 Tấn / chuyến", "Xe ben Hyundai HD270", "<span class='module-pill'>Không tồn đọng bãi</span>"],
                ["<b>Vật tư, túi bọc & thùng carton</b><small>Phụ liệu đóng gói xuất khẩu</small>", "Kho Phụ liệu ➔ Các xưởng Packhouse", "<b>38 chuyến</b>", "<b>200 Tấn</b>", "5.2 Tấn / chuyến", "Xe tải Hino 5T có bửng nâng", "<span class='module-pill'>Đầy đủ vật tư</span>"]
            ],
            "Tìm loại hàng hóa, tuyến đường...",
            "Tổng hợp 4 nhóm hàng vận chuyển chính"
        )
    )
)

data_part3["pages/10-bao-cao/doi-xe.html"] = (
    make_head("BÁO CÁO", "Báo cáo năng lực & Tình trạng đội xe", "Đánh giá hệ số sẵn sàng hoạt động (Availability rate), tỷ lệ xe hư hỏng dừng máy và cơ cấu chủng loại phương tiện.", ["↗ Xuất báo cáo đội xe", "📊 Xem biểu đồ cơ cấu"]) +
    make_filters(["Hiện tại: 23/08/2026", "Tất cả 128 phương tiện", "Toàn bộ KLH"]) +
    make_stats([("Hệ số sẵn sàng (Availability)", "91.4%", "Mục tiêu > 88%"), ("Hệ số sử dụng (Utilization)", "78.2%", "86 xe đang lăn bánh"), ("Tỷ lệ xe dừng sửa chữa", "8.6%", "11 xe tại xưởng"), ("Tuổi thọ trung bình của xe", "2.8 năm", "Dàn xe mới, hiện đại")]) +
    make_analytics("Tỷ lệ phân bổ hiện trạng 128 phương tiện cơ giới", "M10 160 C120 140, 240 150, 360 95 S500 70, 680 35", "128 xe", [("Máy kéo nông nghiệp", "48.4%"), ("Xe tải & Xe ben", "28.1%"), ("Máy công trình", "14.1%"), ("Xe bồn & Khác", "9.4%")],
        make_table(
            ["NHÓM PHƯƠNG TIỆN", "TỔNG ĐẦU XE", "ĐANG HOẠT ĐỘNG", "ĐANG DỰ PHÒNG", "ĐANG BẢO DƯỠNG", "HỎNG CHỜ SỬA", "HỆ SỐ SẴN SÀNG", "HIỆU SUẤT KHAI THÁC"],
            [
                ["<b>Máy kéo nông nghiệp</b><small>John Deere, Kubota, New Holland</small>", "<b>62 xe</b>", "48 xe", "8 xe", "4 xe", "2 xe", "<b style='color:var(--green2)'>90.3%</b>", "<b>84.2%</b> (Ca máy đạt chuẩn)"],
                ["<b>Xe ô tô tải & Xe ben nặng</b><small>Howo 4 chân, Hino, Hyundai</small>", "<b>36 xe</b>", "26 xe", "6 xe", "3 xe", "1 xe", "<b style='color:var(--green2)'>91.6%</b>", "<b>82.5%</b> (Quay vòng tốt)"],
                ["<b>Máy công trình & Thủy lợi</b><small>Máy đào CAT, Máy ủi Komatsu</small>", "<b>18 xe</b>", "14 xe", "2 xe", "1 xe", "1 xe", "<b style='color:var(--green2)'>88.9%</b>", "<b>77.8%</b> (Nạo vét kênh)"],
                ["<b>Xe bồn & Phương tiện chuyên dùng</b><small>Téc nước, téc dầu, xe cẩu</small>", "<b>12 xe</b>", "10 xe", "1 xe", "1 xe", "0 xe", "<b style='color:var(--green2)'>91.7%</b>", "<b>90.0%</b> (Cấp liệu liên tục)"]
            ],
            "Tìm nhóm phương tiện, chủng loại xe...",
            "Tổng hợp 4 nhóm phương tiện cơ giới"
        )
    )
)

data_part3["pages/10-bao-cao/lai-xe-kpi.html"] = (
    make_head("BÁO CÁO", "Báo cáo tổng hợp KPI & Chấm công", "Báo cáo tổng hợp số ngày công, giờ máy hữu ích, sản lượng diện tích, tỷ lệ tiết kiệm nhiên liệu và xếp loại thi đua.", ["↗ Xuất bảng lương KPI", "🔍 Tra cứu tài xế"]) +
    make_filters(["Kỳ tính lương: Tháng 08/2026", "Tất cả đội xe (96 tài xế)", "Đã chốt công"]) +
    make_stats([("Tổng giờ máy toàn đội", "16.420 giờ", "Trung bình 171h/tài xế"), ("Tài xế xếp loại A", "38 người", "Thưởng năng suất 100%"), ("Tài xế xếp loại B", "46 người", "Thưởng năng suất 80%"), ("Tổng thưởng tiết kiệm dầu", "32.400.000 đ", "Khuyến khích lái xe an toàn")]) +
    make_analytics("Phân bổ xếp hạng KPI tài xế tháng 08/2026", "M10 180 C140 130, 260 140, 390 80 S530 65, 680 25", "96 người", [("Loại A (Xuất sắc)", "39.5%"), ("Loại B (Khá)", "47.9%"), ("Loại C (Trung bình)", "12.6%")],
        make_table(
            ["MÃ NV / HỌ TÊN", "ĐỘI XE TRỰC THUỘC", "NGÀY CÔNG", "GIỜ MÁY HỮU ÍCH", "SẢN LƯỢNG QUY ĐỔI", "TIẾT KIỆM NHIÊN LIỆU", "TỔNG ĐIỂM KPI", "TIỀN THƯỞNG KPI"],
            [
                ["<b>NV-0824</b><small>Nguyễn Văn Minh</small>", "Đội Cơ giới 1 (NT1)", "26 công", "<b>186 giờ</b>", "48.5 ha cày ải sâu", "<b style='color:var(--green2)'>+6.2% (Tiết kiệm 82L)</b>", "<b style='color:var(--green2)'>96.5 (Loại A)</b>", "<b>4.200.000 đ</b>"],
                ["<b>NV-0831</b><small>Trần Quốc Huy</small>", "Đội Vận tải Nặng", "26 công", "<b>210 giờ</b>", "680 tấn chuối PH2", "<b style='color:var(--green2)'>+4.8% (Tiết kiệm 110L)</b>", "<b style='color:var(--green2)'>94.8 (Loại A)</b>", "<b>3.800.000 đ</b>"],
                ["<b>NV-0845</b><small>Lê Hoàng Nam</small>", "Đội Cơ giới 1 (NT1)", "25 công", "<b>172 giờ</b>", "42.0 ha lên luống", "<b style='color:var(--green2)'>+3.5% (Tiết kiệm 45L)</b>", "<b style='color:var(--green2)'>91.2 (Loại A)</b>", "<b>3.200.000 đ</b>"],
                ["<b>NV-KH-015</b><small>Keo Sarath</small>", "Đội Thi công Thủy lợi", "26 công", "<b>165 giờ</b>", "3.200 m3 đào đắp", "<b style='color:var(--green2)'>+1.2% (Đạt định mức)</b>", "<b>88.5 (Loại B)</b>", "<b>2.500.000 đ</b>"],
                ["<b>NV-KH-012</b><small>Sok Phearith</small>", "Đội Vận tải NT2", "24 công", "<b>155 giờ</b>", "410 tấn hàng chuyển", "<b style='color:var(--red)'>-2.4% (Vượt định mức)</b>", "<b>78.0 (Loại C)</b>", "<b>1.200.000 đ</b>"]
            ],
            "Tìm tên tài xế, mã nhân viên, đội xe...",
            "Hiển thị 1–5 trên 96 bảng KPI tài xế"
        )
    )
)

data_part3["pages/10-bao-cao/btsc.html"] = (
    make_head("BÁO CÁO", "Báo cáo chi phí Bảo trì & Sửa chữa", "Tổng hợp chi phí thay thế vật tư phụ tùng, dầu nhớt, giờ công thợ và thời gian dừng máy sự cố (Downtime).", ["↗ Xuất báo cáo tài chính BTSC", "📊 Phân tích chi phí"]) +
    make_filters(["Tháng 08/2026", "Tất cả xưởng & tổ kỹ thuật", "Đã quyết toán"]) +
    make_stats([("Tổng chi phí BTSC tháng", "142.500.000 đ", "Đạt 94.0% ngân sách"), ("Chi phí vật tư phụ tùng", "98.200.000 đ", "Lọc, lốp, phớt ben"), ("Chi phí dầu nhớt bôi trơn", "32.300.000 đ", "Nhớt 15W-40 & Thủy lực"), ("Chi phí nhân công & khác", "12.000.000 đ", "Gia công cơ khí ngoài")]) +
    make_analytics("Cơ cấu chi phí bảo trì sửa chữa theo nhóm xe (VNĐ)", "M10 170 C130 145, 250 155, 380 90 S520 70, 680 30", "142.5 tr", [("Máy kéo John Deere/Kubota", "45.2%"), ("Xe tải Howo & Ben Hyundai", "35.8%"), ("Máy công trình đào/ủi", "19.0%")],
        make_table(
            ["NHÓM PHƯƠNG TIỆN", "SỐ LƯỢT BTSC", "CHI PHÍ PHỤ TÙNG", "CHI PHÍ DẦU NHỚT", "TỔNG CHI PHÍ (VNĐ)", "TỔNG GIỜ DỪNG MÁY", "CHI PHÍ BÌNH QUÂN / XE"],
            [
                ["<b>Máy kéo nông nghiệp (62 xe)</b>", "24 lượt", "42.500.000 đ", "21.900.000 đ", "<b>64.400.000 đ</b>", "96 giờ máy", "<b>1.038.000 đ / xe</b>"],
                ["<b>Xe ô tô tải & Ben (36 xe)</b>", "14 lượt", "38.200.000 đ", "7.800.000 đ", "<b>46.000.000 đ</b>", "68 giờ xe", "<b>1.277.000 đ / xe</b>"],
                ["<b>Máy công trình & Thủy lợi (18 xe)</b>", "6 lượt", "14.500.000 đ", "2.600.000 đ", "<b>17.100.000 đ</b>", "42 giờ máy", "<b>950.000 đ / xe</b>"],
                ["<b>Xe chuyên dùng & Téc (12 xe)</b>", "4 lượt", "3.000.000 đ", "2.000.000 đ", "<b>5.000.000 đ</b>", "18 giờ xe", "<b>416.000 đ / xe</b>"]
            ],
            "Tìm nhóm xe, hạng mục chi phí...",
            "Tổng hợp chi phí 4 nhóm phương tiện"
        )
    )
)

data_part3["pages/10-bao-cao/nhien-lieu.html"] = (
    make_head("BÁO CÁO", "Báo cáo tổng hợp tiêu hao nhiên liệu", "Báo cáo tổng lượng dầu Diesel xuất cấp, lượng tiêu thụ thực tế theo ca máy và tỷ lệ tiết kiệm/vượt định mức toàn KLH.", ["↗ Xuất báo cáo nhiên liệu", "📊 Xem biểu đồ tiêu hao"]) +
    make_filters(["Tháng 08/2026", "Chủng loại: Diesel DO 0.05S", "Khớp số liệu trạm"]) +
    make_stats([("Tổng dầu tiêu thụ tháng", "52.400 Lít", "Định mức 55.150 Lít"), ("Tổng dầu tiết kiệm", "2.750 Lít", "Tỷ lệ tiết kiệm +4.98%"), ("Giá trị làm lợi cho KLH", "57.750.000 đ", "Tính theo giá 21.000đ/L"), ("Độ chính xác cảm biến GPS", "99.2%", "So với que đo bồn")]) +
    make_analytics("Xu hướng tiêu thụ nhiên liệu Diesel thực tế vs Định mức qua các tuần", "M10 160 C120 130, 250 140, 370 85 S510 65, 680 30", "52.4k L", [("Đội Cơ giới 1", "42.5%"), ("Đội Vận tải Nặng", "32.0%"), ("Đội Cơ giới 2", "18.5%"), ("Đội Thủy lợi", "7.0%")],
        make_table(
            ["ĐƠN VỊ / ĐỘI XE", "SỐ XE HOẠT ĐỘNG", "SẢN LƯỢNG DIỆN TÍCH / KM", "ĐỊNH MỨC KHOÁN (L)", "TIÊU THỤ THỰC TẾ (L)", "CHÊNH LỆCH (LÍT)", "TỶ LỆ TIẾT KIỆM", "ĐÁNH GIÁ"],
            [
                ["<b>Đội Xe Cơ giới 1 (NT1)</b><small>Xí nghiệp Chuối 1</small>", "36 xe", "820.5 ha cày bừa", "23.400 Lít", "<b>22.250 Lít</b>", "<b style='color:var(--green2)'>-1.150 L</b>", "<b style='color:var(--green2)'>+4.91%</b>", "<span class='module-pill'>Thưởng tập thể</span>"],
                ["<b>Đội Xe Vận tải Nặng</b><small>Ban Vận hành KLH</small>", "16 xe", "42.500 km vận chuyển", "17.200 Lít", "<b>16.380 Lít</b>", "<b style='color:var(--green2)'>-820 L</b>", "<b style='color:var(--green2)'>+4.76%</b>", "<span class='module-pill'>Thưởng tập thể</span>"],
                ["<b>Đội Xe Cơ giới 2 (NT2)</b><small>Xí nghiệp Chuối 2</small>", "24 xe", "610.0 ha lên luống", "10.800 Lít", "<b>10.150 Lít</b>", "<b style='color:var(--green2)'>-650 L</b>", "<b style='color:var(--green2)'>+6.01%</b>", "<span class='module-pill'>Thưởng tập thể</span>"],
                ["<b>Đội Thi công Thủy lợi</b><small>KLH Koun Mom</small>", "10 xe", "14.2 km kênh đào", "3.750 Lít", "<b>3.620 Lít</b>", "<b style='color:var(--green2)'>-130 L</b>", "<b style='color:var(--green2)'>+3.46%</b>", "<span class='module-pill'>Đạt định mức</span>"]
            ],
            "Tìm tên đội xe, đơn vị sản xuất...",
            "Tổng hợp số liệu tiêu hao toàn KLH"
        )
    )
)

data_part3["pages/10-bao-cao/canh-bao.html"] = (
    make_head("BÁO CÁO", "Báo cáo phân tích cảnh báo & Vi phạm", "Thống kê tần suất xuất hiện các lỗi vi phạm tốc độ, sụt nhiên liệu, mất tín hiệu GPS và lỗi kỹ thuật động cơ.", ["↗ Xuất báo cáo vi phạm", "📊 Xem biểu đồ lỗi"]) +
    make_filters(["Tháng 08/2026", "Tất cả nhóm cảnh báo", "Toàn bộ KLH"]) +
    make_stats([("Tổng sự kiện cảnh báo", "186 sự kiện", "-24% so tháng 7"), ("Cảnh báo vi phạm tốc độ", "84 sự kiện", "Tập trung trục chính NT2"), ("Cảnh báo sụt dầu bất thường", "22 sự kiện", "Xử lý 100%"), ("Tỷ lệ xử lý đúng hạn", "98.4%", "Thời gian phản hồi < 10p")]) +
    make_analytics("Phân bố số lượng cảnh báo phát sinh theo phân loại", "M10 180 C130 150, 260 160, 390 90 S520 70, 680 20", "186 vụ", [("Quá tốc độ quy định", "45.2%"), ("Ra khỏi Geo-fence", "25.8%"), ("Bất thường nhiên liệu", "11.8%"), ("Kỹ thuật máy & GPS", "17.2%")],
        make_table(
            ["NHÓM CẢNH BÁO", "SỐ VỤ PHÁT SINH", "ĐÃ XỬ LÝ XÁC MINH", "LỖI DO TÀI XẾ", "LỖI DO THIẾT BỊ / SÓNG", "SỰ CỐ KỸ THUẬT THỰC TẾ", "HÌNH THỨC XỬ LÝ CHÍNH"],
            [
                ["<b>Chạy quá tốc độ quy định (>30km/h)</b>", "<b>84 vụ</b>", "84 vụ (100%)", "84 vụ", "0 vụ", "0 vụ", "Nhắc nhở qua bộ đàm, trừ điểm thi đua"],
                ["<b>Rời khỏi vùng quy định (Geo-fence)</b>", "<b>48 vụ</b>", "48 vụ (100%)", "32 vụ", "16 vụ (Lệch sóng)", "0 vụ", "Xác minh giải trình tránh ngập lụt"],
                ["<b>Cảnh báo sụt giảm nhiên liệu bất thường</b>", "<b>22 vụ</b>", "22 vụ (100%)", "2 vụ (Hút dầu)", "18 vụ (Rung lắc cảm biến)", "2 vụ (Bục ống dầu)", "Lập biên bản xử phạt 2 vụ vi phạm"],
                ["<b>Cảnh báo kỹ thuật động cơ (Nhiệt/Nhớt)</b>", "<b>18 vụ</b>", "18 vụ (100%)", "4 vụ (Thiếu nước mát)", "6 vụ (Cảm biến báo ảo)", "8 vụ (Hỏng quạt/bơm)", "Điều thợ kỹ thuật sửa chữa lưu động"],
                ["<b>Mất tín hiệu kết nối GPS > 2 giờ</b>", "<b>14 vụ</b>", "14 vụ (100%)", "0 vụ", "14 vụ (Vùng lõm sóng 4G)", "0 vụ", "Đề xuất nhà mạng Metfone tăng trạm BTS"]
            ],
            "Tìm nhóm cảnh báo, hình thức xử lý...",
            "Tổng hợp 5 nhóm cảnh báo an toàn"
        )
    )
)

print("Part 3 data defined successfully:", len(data_part3), "pages.")
