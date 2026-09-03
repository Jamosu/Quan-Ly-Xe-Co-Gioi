# -*- coding: utf-8 -*-
"""Part 4: Danh mục & Quản trị hệ thống"""
from mockup_helpers import make_pill, make_stats, make_filters, make_head, make_table, make_kanban, make_calendar, make_map, make_analytics, make_timeline, make_settings

data_part4 = {}

# 11. DANH MỤC
data_part4["pages/11-danh-muc/don-vi-klh.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Đơn vị & Khu Liên Hợp", "Quản lý cơ cấu tổ chức Khu Liên Hợp, Xí nghiệp Nông trường, Xí nghiệp Chăn nuôi và Xưởng dịch vụ.", ["↗ Xuất sơ đồ", "＋ Thêm đơn vị mới"]) +
    make_filters(["Tập đoàn THACO AGRI", "Khu vực: Campuchia & Việt Nam", "Trạng thái: Hoạt động"]) +
    make_stats([("Tổng Khu Liên Hợp", "4 KLH", "Koun Mom, Snuol, Ia Puch, HAGL"), ("Xí nghiệp trực thuộc", "18 Xí nghiệp", "12 Trồng trọt · 6 Chăn nuôi"), ("Tổng diện tích quản lý", "84.000 ha", "Toàn tập đoàn"), ("Tổng nhân sự cơ giới", "450 CBNV", "Lái xe, kỹ thuật viên")]) +
    make_table(
        ["MÃ ĐƠN VỊ", "TÊN ĐƠN VỊ / XÍ NGHIỆP", "TRỰC THUỘC", "ĐỊA BÀN HOẠT ĐỘNG", "DIỆN TÍCH QUẢN LÝ", "SỐ XE PHÂN BỔ", "GIÁM ĐỐC / TRƯỞNG ĐƠN VỊ", "TRẠNG THÁI"],
        [
            ["<b>KLH-KM</b>", "<b>Khu Liên Hợp Koun Mom</b><small>Tổ hợp Nông nghiệp Công nghệ cao</small>", "Tập đoàn THACO AGRI", "Tỉnh Rattanakiri, Campuchia", "<b>23.000 ha</b>", "<b>128 xe</b>", "Trần Quang Vinh<small>Giám đốc KLH</small>", make_pill("Đang hoạt động", "")],
            ["<b>XN-CHUOI-01</b>", "Xí nghiệp Nông trường Chuối 1<small>Chuyên canh chuối Nam Mỹ</small>", "KLH Koun Mom", "Phân khu Bắc Koun Mom", "<b>1.200 ha</b>", "<b>46 xe</b>", "Nguyễn Văn Hải<small>Quản đốc XN</small>", make_pill("Đang hoạt động", "")],
            ["<b>XN-CHUOI-02</b>", "Xí nghiệp Nông trường Chuối 2<small>Chuyên canh chuối xuất khẩu</small>", "KLH Koun Mom", "Phân khu Nam Koun Mom", "<b>950 ha</b>", "<b>38 xe</b>", "Lê Minh Tuấn<small>Quản đốc XN</small>", make_pill("Đang hoạt động", "")],
            ["<b>XN-CAT-03</b>", "Xí nghiệp Nông trường Cây ăn trái<small>Sầu riêng Musang King, Mít, Xoài</small>", "KLH Koun Mom", "Phân khu Đông Koun Mom", "<b>600 ha</b>", "<b>22 xe</b>", "Phạm Hùng Cường<small>Quản đốc XN</small>", make_pill("Đang hoạt động", "")],
            ["<b>XUONG-BTSC-01</b>", "Xưởng Bảo trì - Sửa chữa Trung tâm<small>Dịch vụ cơ giới & đại tu thiết bị</small>", "KLH Koun Mom", "Khu Trung tâm Kỹ thuật", "Khu dịch vụ", "<b>22 xe hỗ trợ</b>", "Lê Minh Tâm<small>Trưởng xưởng</small>", make_pill("Đang hoạt động", "")]
        ],
        "Tìm mã đơn vị, tên xí nghiệp, người phụ trách...",
        "Hiển thị 1–5 trên 18 đơn vị thành viên"
    )
)

data_part4["pages/11-danh-muc/doi-xe.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Đội xe cơ giới", "Quản lý cơ cấu các Đội xe cơ giới nông nghiệp, Đội vận tải nặng và Đội thi công công trình thủy lợi.", ["↗ Xuất danh sách", "＋ Thêm đội xe mới"]) +
    make_filters(["Tất cả đội xe (8 đội)", "KLH Koun Mom", "Trạng thái: Hoạt động"]) +
    make_stats([("Tổng số đội xe", "8 đội xe", "Toàn KLH Koun Mom"), ("Phương tiện quản lý", "128 xe", "Trung bình 16 xe/đội"), ("Lái xe & Thợ máy", "96 nhân sự", "100% biên chế"), ("Hệ số sẵn sàng TB", "91.4%", "Vận hành ổn định")]) +
    make_table(
        ["MÃ ĐỘI XE", "TÊN ĐỘI XE CƠ GIỚI", "TRỰC THUỘC ĐƠN VỊ", "SỐ LƯỢNG XE", "CHỦNG LOẠI XE CHÍNH", "ĐỘI TRƯỞNG / QUẢN LÝ", "SỐ ĐIỆN THOẠI", "TRẠNG THÁI"],
        [
            ["<b>ĐX-CG-01</b>", "<b>Đội Xe Cơ giới 1 (NT1)</b><small>Chuyên cày bừa làm đất</small>", "Xí nghiệp Chuối 1", "<b>36 xe</b>", "Máy kéo John Deere 6140B, Kubota M7040", "Nguyễn Văn Minh<small>Tổ trưởng lái máy</small>", "0982.112.334", make_pill("Đang hoạt động", "")],
            ["<b>ĐX-VTN-01</b>", "<b>Đội Xe Vận tải Nặng</b><small>Chuyên chở chuối xuất khẩu</small>", "Ban Vận hành KLH", "<b>16 xe</b>", "Xe tải Howo 4 chân 371HP, Hino 500", "Trần Quốc Huy<small>Tổ trưởng vận tải</small>", "0973.224.556", make_pill("Đang hoạt động", "")],
            ["<b>ĐX-CG-02</b>", "<b>Đội Xe Cơ giới 2 (NT2)</b><small>Chuyên làm đất & lên luống</small>", "Xí nghiệp Chuối 2", "<b>24 xe</b>", "Máy kéo Kubota M7040, New Holland", "Lê Hoàng Nam<small>Tổ trưởng cơ giới</small>", "0964.882.119", make_pill("Đang hoạt động", "")],
            ["<b>ĐX-TL-01</b>", "<b>Đội Thi công Thủy lợi & Cứu hộ</b><small>Đào mương, đắp đập, cứu hộ</small>", "Phòng Kỹ thuật KLH", "<b>14 xe</b>", "Máy đào CAT 320D, Máy ủi Komatsu, Xe cẩu", "Võ Văn Thành<small>Tổ trưởng máy thi công</small>", "0918.445.667", make_pill("Đang hoạt động", "")],
            ["<b>ĐX-BVTV-01</b>", "<b>Đội Xe Bảo vệ Thực vật</b><small>Phun thuốc & tưới nước dinh dưỡng</small>", "Xí nghiệp Chuối 1 & 2", "<b>10 xe</b>", "Xe téc Hino 15m3, Dàn phun tự hành", "Phạm Quốc An<small>Tổ trưởng phun thuốc</small>", "0912.339.882", make_pill("Đang hoạt động", "")]
        ],
        "Tìm mã đội xe, tên đội trưởng...",
        "Hiển thị 5 đội xe cơ giới nòng cốt"
    )
)

data_part4["pages/11-danh-muc/loai-xe.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Chủng loại xe", "Phân loại các nhóm máy kéo cơ giới nông nghiệp, ô tô tải, máy công trình và thiết bị nông cụ.", ["↗ Xuất danh mục", "＋ Thêm chủng loại"]) +
    make_filters(["Tất cả nhóm loại xe", "Hãng SX: John Deere, Kubota, Howo, Hino", "Đang sử dụng"]) +
    make_stats([("Chủng loại đã định nghĩa", "24 nhóm loại", "100% chuẩn hóa mã"), ("Máy kéo nông nghiệp", "8 chủng loại", "Công suất 70 - 140 HP"), ("Xe tải & Xe chuyên dùng", "10 chủng loại", "Tải trọng 5 - 15 Tấn"), ("Máy công trình đào ủi", "6 chủng loại", "Bánh xích chuyên dụng")]) +
    make_table(
        ["MÃ LOẠI XE", "TÊN CHỦNG LOẠI XE", "HÃNG SẢN XUẤT", "CÔNG SUẤT / TẢI TRỌNG", "NHIÊN LIỆU SỬ DỤNG", "ĐỊNH MỨC TIÊU HAO CHUẨN", "SỐ XE ĐANG DÙNG", "TRẠNG THÁI"],
        [
            ["<b>LX-JD-6140B</b>", "Máy kéo bánh lốp John Deere 6140B", "John Deere (Mỹ / SX Ấn Độ)", "140 HP (Mã lực)", "Diesel DO 0.05S", "18.5 L/ha (Cày) · 4.2 L/h (Chạy)", "<b>24 chiếc</b>", make_pill("Đang hoạt động", "")],
            ["<b>LX-KB-M7040</b>", "Máy kéo nông nghiệp Kubota M7040", "Kubota (Nhật Bản / Thái Lan)", "70 HP (Mã lực)", "Diesel DO 0.05S", "12.0 L/ha (Bừa) · 3.5 L/h", "<b>28 chiếc</b>", make_pill("Đang hoạt động", "")],
            ["<b>LX-HW-371</b>", "Xe tải thùng mui bạt Howo 4 chân", "Sinotruk Howo (Trung Quốc)", "371 HP · Tải trọng 15 Tấn", "Diesel DO 0.05S", "30.0 L / 100 km", "<b>18 chiếc</b>", make_pill("Đang hoạt động", "")],
            ["<b>LX-HN-500</b>", "Xe ô tô tải Hino 500 Series", "Hino Motors (Nhật Bản)", "260 HP · Tải trọng 8 Tấn", "Diesel DO 0.05S", "22.0 L / 100 km", "<b>12 chiếc</b>", make_pill("Đang hoạt động", "")],
            ["<b>LX-CT-320D</b>", "Máy đào bánh xích Caterpillar CAT 320D", "Caterpillar (Mỹ)", "148 HP · Gầu múc 0.9 m3", "Diesel DO 0.05S", "14.5 Lít / Giờ máy", "<b>8 chiếc</b>", make_pill("Đang hoạt động", "")]
        ],
        "Tìm mã loại xe, hãng sản xuất, công suất...",
        "Hiển thị 1–5 trên 24 chủng loại phương tiện"
    )
)

data_part4["pages/11-danh-muc/loai-cong-viec.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Loại công việc cơ giới", "Chuẩn hóa các hạng mục công việc làm đất, chăm sóc cây, bảo vệ thực vật và thu hoạch nông sản.", ["↗ Xuất bảng công việc", "＋ Thêm công việc mới"]) +
    make_filters(["Tất cả giai đoạn canh tác", "Cây trồng: Chuối & Cây ăn trái", "Áp dụng định mức 2026"]) +
    make_stats([("Tổng mã công việc", "48 công việc", "Chuẩn hóa quy trình"), ("Làm đất & chuẩn bị", "16 công việc", "Cày, bừa, rạch hàng, lên luống"), ("Chăm sóc & BVTV", "18 công việc", "Phun vi sinh, bón lót, tưới"), ("Thu hoạch & Vận chuyển", "14 công việc", "Cắt chuối, đóng gói, chở hàng")]) +
    make_table(
        ["MÃ CÔNG VIỆC", "TÊN HẠNG MỤC CÔNG VIỆC", "GIAI ĐOẠN CANH TÁC", "MÁY MÓC PHÙ HỢP", "NÔNG CỤ GẮN KÈM", "ĐỊNH MỨC CA MÁY", "ĐƠN GIÁ KHOÁN (VNĐ/HA)", "TRẠNG THÁI"],
        [
            ["<b>CV-CAY-01</b>", "Cày lật đất sâu 35 - 40 cm", "Chuẩn bị đất trồng mới", "Máy kéo John Deere 140HP", "Dàn cày 4 chảo đĩa xoay", "1.2 ha / ca 8h", "<b>650.000 đ/ha</b>", make_pill("Hiệu lực", "")],
            ["<b>CV-BUA-02</b>", "Bừa phẳng đất & nghiền nhỏ gốc rạ", "Chuẩn bị đất", "Máy kéo Kubota 70HP", "Dàn bừa đĩa răng cưa 24 đĩa", "2.0 ha / ca 8h", "<b>420.000 đ/ha</b>", make_pill("Hiệu lực", "")],
            ["<b>CV-LUONG-03</b>", "Lên luống đôi thoát nước trồng chuối", "Lên luống kỹ thuật", "Máy kéo Kubota / New Holland", "Dàn vun luống tạo rãnh", "1.8 ha / ca 8h", "<b>510.000 đ/ha</b>", make_pill("Hiệu lực", "")],
            ["<b>CV-PHUN-04</b>", "Phun chế phẩm sinh học & phân bón lá", "Chăm sóc định kỳ", "Xe téc Hino 15m3", "Cần phun cánh tay đòn 18m", "6.0 ha / ca 6h", "<b>280.000 đ/ha</b>", make_pill("Hiệu lực", "")],
            ["<b>CV-VC-05</b>", "Vận chuyển buồng chuối về Packhouse", "Thu hoạch & sơ chế", "Xe tải Howo 4 chân", "Thùng mui bạt có giá treo sọt", "45 tấn / xe / ngày", "<b>95.000 đ/tấn</b>", make_pill("Hiệu lực", "")]
        ],
        "Tìm mã công việc, tên hạng mục, máy móc...",
        "Hiển thị 1–5 trên 48 hạng mục công việc chuẩn"
    )
)

data_part4["pages/11-danh-muc/loai-lenh.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Loại lệnh điều động", "Quy định các loại lệnh sản xuất, lệnh vận chuyển, lệnh công tác và luồng phê duyệt tương ứng.", ["↗ Xuất quy trình duyệt", "＋ Thêm loại lệnh"]) +
    make_filters(["Tất cả quy trình lệnh", "Cấp duyệt: Trưởng phòng / Giám đốc", "Đang áp dụng"]) +
    make_stats([("Tổng loại lệnh", "6 loại lệnh", "100% số hóa qua App"), ("Lệnh sản xuất nông nghiệp", "Chiếm 52%", "Duyệt bởi Quản đốc XN"), ("Lệnh vận chuyển nội bộ", "Chiếm 34%", "Duyệt bởi Điều độ viên"), ("Lệnh cứu hộ & Kỹ thuật", "Chiếm 14%", "Duyệt bởi Trưởng xưởng")]) +
    make_table(
        ["MÃ LOẠI LỆNH", "TÊN LOẠI LỆNH ĐIỀU ĐỘNG", "TIỀN TỐ MÃ LỆNH", "CẤP PHÊ DUYỆT BẮT BUỘC", "THỜI GIAN HIỆU LỰC", "YÊU CẦU ĐO GPS", "MÔ TẢ NGHIỆP VỤ", "TRẠNG THÁI"],
        [
            ["<b>LL-LSX</b>", "<b>Lệnh Sản Xuất Nông Nghiệp</b>", "LSX-YYMMDD-xxx", "Quản đốc Xí nghiệp Nông trường", "Theo ca máy (8 - 12h)", "<b>Bắt buộc (Đo diện tích)</b>", "Giao việc cày, bừa, rạch hàng, bón phân, phun thuốc", make_pill("Hiệu lực", "")],
            ["<b>LL-LVC</b>", "<b>Lệnh Vận Chuyển Nội Bộ</b>", "LVC-YYMMDD-xxx", "Điều độ viên Trung tâm Vận tải", "Theo chuyến / Ngày", "<b>Bắt buộc (Đo Km & Cân)</b>", "Vận chuyển chuối, phân bón, cây giống, phụ phẩm", make_pill("Hiệu lực", "")],
            ["<b>LL-LĐX</b>", "<b>Lệnh Điều Xe Công Tác / Khẩn</b>", "LĐX-YYMMDD-xxx", "Trưởng phòng Quản lý Xe Cơ giới", "Theo đợt công tác", "<b>Bắt buộc (Lộ trình GPS)</b>", "Điều xe đưa đón công nhân, tuần tra, chở đoàn khách", make_pill("Hiệu lực", "")],
            ["<b>LL-LCH</b>", "<b>Lệnh Cứu Hộ & Kỹ Thuật</b>", "LCH-YYMMDD-xxx", "Trưởng xưởng Bảo trì Sửa chữa", "Ngay lập tức (Khẩn cấp)", "<b>Bắt buộc (Vị trí sự cố)</b>", "Điều xe cẩu, xe sửa chữa lưu động cứu pan máy kéo", make_pill("Hiệu lực", "")],
            ["<b>LL-LCL</b>", "<b>Lệnh Cấp Nhiên Liệu Lưu Động</b>", "LCL-YYMMDD-xxx", "Kế toán trưởng / Quản đốc Xăng dầu", "Theo ca cấp dầu", "<b>Bắt buộc (Đo lít bồn)</b>", "Điều xe téc bồn đi bơm dầu trực tiếp ngoài đồng", make_pill("Hiệu lực", "")]
        ],
        "Tìm mã loại lệnh, cấp phê duyệt...",
        "Hiển thị 5 loại lệnh điều động chuẩn"
    )
)

data_part4["pages/11-danh-muc/lo-thua.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Lô / Thửa canh tác", "Quản lý dữ liệu tọa độ ranh giới, diện tích (ha), loại đất và loại cây trồng của từng lô thửa tại KLH.", ["↗ Xuất tọa độ GIS", "＋ Thêm lô thửa mới"]) +
    make_filters(["Tất cả xí nghiệp (186 Lô)", "Cây trồng: Chuối, Sầu riêng, Mít", "Đang canh tác"]) +
    make_stats([("Tổng diện tích đo vẽ GIS", "22.500 ha", "186 Lô canh tác"), ("Lô trồng Chuối Nam Mỹ", "84 Lô (3.200 ha)", "Nông trường 1 & 2"), ("Lô Cây ăn trái (Sầu riêng, Mít)", "42 Lô (1.450 ha)", "Nông trường CAT"), ("Lô Trồng cỏ & Bắp chăn nuôi", "60 Lô (2.800 ha)", "Phục vụ Trại Bò")]) +
    make_table(
        ["MÃ LÔ THỬA", "TÊN LÔ CANH TÁC", "XÍ NGHIỆP TRỰC THUỘC", "DIỆN TÍCH (HA)", "LOẠI CÂY TRỒNG", "LOẠI ĐẤT & ĐỊA HÌNH", "HỆ THỐNG TƯỚI", "TRẠNG THÁI"],
        [
            ["<b>LO-CN-A12</b>", "Lô Chuối A12<small>Phân khu A - Nông trường 1</small>", "Xí nghiệp Chuối 1", "<b>25.5 ha</b>", "Chuối Cavendish Nam Mỹ", "Đất thịt nhẹ, bằng phẳng", "Tưới nhỏ giọt Israel + Cáp treo", make_pill("Đang canh tác", "")],
            ["<b>LO-CN-B06</b>", "Lô Chuối B06<small>Phân khu B - Nông trường 1</small>", "Xí nghiệp Chuối 1", "<b>32.0 ha</b>", "Chuối Cavendish Nam Mỹ", "Đất phù sa cổ, ráo nước", "Tưới phun sương tự động", make_pill("Đang làm đất", "pending")],
            ["<b>LO-CAT-C04</b>", "Lô Sầu Riêng C04<small>Nông trường Cây ăn trái</small>", "Xí nghiệp Cây ăn trái", "<b>18.2 ha</b>", "Sầu riêng Musang King & Monthong", "Đất đỏ bazan, dốc nhẹ 3°", "Tưới gốc bù áp cục bộ", make_pill("Đang canh tác", "")],
            ["<b>LO-CAT-D09</b>", "Lô Xoài & Mít D09<small>Nông trường Cây ăn trái</small>", "Xí nghiệp Cây ăn trái", "<b>22.8 ha</b>", "Mít ruột đỏ & Xoài Keo", "Đất thịt pha sét nhẹ", "Tưới tự động van điện từ", make_pill("Đang canh tác", "")],
            ["<b>LO-SK-08</b>", "Lô Bắp Sinh Khối 08<small>Vùng thức ăn chăn nuôi</small>", "Xí nghiệp Chăn nuôi Bò", "<b>45.0 ha</b>", "Bắp sinh khối F1 NK7328", "Đất bãi bồi ven suối", "Tưới súng bắn bán kính lớn", make_pill("Đang canh tác", "")]
        ],
        "Tìm mã lô, tên lô, xí nghiệp, loại cây...",
        "Hiển thị 1–5 trên 186 lô thửa canh tác"
    )
)

data_part4["pages/11-danh-muc/tuyen-duong.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Tuyến đường nội bộ", "Quản lý mạng lưới đường trục chính bê tông, đường cấp phối nội đồng và quy định tốc độ tối đa cho phép.", ["↗ Xuất bản đồ giao thông", "＋ Thêm tuyến đường"]) +
    make_filters(["Toàn bộ mạng lưới đường (32 tuyến)", "Cấp đường: Trục chính & Nhánh", "Đang khai thác"]) +
    make_stats([("Tổng chiều dài mạng lưới", "148.5 km", "Phủ kín 23.000 ha"), ("Đường trục chính rải nhựa/bê tông", "42.0 km", "Tốc độ max 35 km/h"), ("Đường cấp phối sỏi đỏ nội đồng", "86.5 km", "Tốc độ max 25 km/h"), ("Đường mương bờ lô", "20.0 km", "Tốc độ max 15 km/h")]) +
    make_table(
        ["MÃ TUYẾN ĐƯỜNG", "TÊN TUYẾN ĐƯỜNG", "ĐIỂM ĐẦU ➔ ĐIỂM CUỐI", "CHIỀU DÀI (KM)", "KẾT CẤU MẶT ĐƯỜNG", "TỐC ĐỘ GIỚI HẠN", "TẢI TRỌNG CHO PHÉP", "TRẠNG THÁI"],
        [
            ["<b>TD-TC-01</b>", "<b>Đường Trục Chính Bắc Nam</b><small>Tuyến huyết mạch số 1</small>", "Cổng Chính KLH ➔ Trung tâm NT2", "<b>14.2 km</b>", "Bê tông xi măng rộng 8m", "<b style='color:var(--green2)'>35 km/h</b>", "<b>30 Tấn</b>", make_pill("Lưu thông tốt", "")],
            ["<b>TD-PH-02</b>", "<b>Tuyến Vận Chuyển Chuối PH2</b><small>Tuyến chuyên dụng xe Howo</small>", "Lô CN-A12 ➔ Nhà máy Packhouse 2", "<b>8.4 km</b>", "Cấp phối sỏi đầm chặt rộng 6m", "<b style='color:var(--green2)'>25 km/h</b>", "<b>25 Tấn</b>", make_pill("Lưu thông tốt", "")],
            ["<b>TD-CAT-03</b>", "<b>Tuyến Vành Đai Cây Ăn Trái</b><small>Trục kết nối vùng đồi</small>", "Ngã ba Kho Lạnh ➔ Vườn Sầu riêng C", "<b>6.5 km</b>", "Sỏi đỏ đồi lu lèn rộng 5m", "<b style='color:var(--green2)'>25 km/h</b>", "<b>18 Tấn</b>", make_pill("Lưu thông tốt", "")],
            ["<b>TD-D4-04</b>", "<b>Đường Lô Nội Đồng D4</b><small>Đường bờ mương phục vụ máy cày</small>", "Trục chính NT2 ➔ Cụm Lô D01-D10", "<b>4.2 km</b>", "Đường đất cấp phối nội đồng", "<b style='color:var(--amber)'>15 km/h</b>", "<b>15 Tấn</b>", make_pill("Hạn chế tốc độ", "pending")],
            ["<b>TD-TL-05</b>", "<b>Tuyến Đê Bao Hồ Thủy Lợi 3</b><small>Đường đê chắn lũ</small>", "Trạm bơm số 1 ➔ Đập tràn Thủy lợi", "<b>3.8 km</b>", "Bê tông mặt đê rộng 4.5m", "<b style='color:var(--green2)'>20 km/h</b>", "<b>10 Tấn</b>", make_pill("Lưu thông tốt", "")]
        ],
        "Tìm mã tuyến đường, điểm đi, điểm đến...",
        "Hiển thị 1–5 trên 32 tuyến đường nội bộ"
    )
)

data_part4["pages/11-danh-muc/khu-vuc-geo-fence.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Vùng giám sát (Geo-fence)", "Khai báo tọa độ đa giác (Polygon) các khu vực nông trường, trạm xăng, xưởng sửa chữa và vùng cấm.", ["↗ Xuất tọa độ WKT/KML", "＋ Vẽ vùng mới"]) +
    make_filters(["Tất cả 24 vùng Geo-fence", "Phân loại: Vùng làm việc, Vùng cấm, Vùng hạn chế tốc độ", "Đang hiệu lực"]) +
    make_stats([("Tổng số vùng giám sát", "24 vùng", "22.500 ha bao phủ"), ("Vùng an toàn sản xuất", "14 vùng", "Nông trường, Packhouse"), ("Vùng giới hạn tốc độ (<15km/h)", "6 vùng", "Khu nhà xưởng & trạm cân"), ("Vùng cấm xâm nhập ban đêm", "4 vùng", "Kho xăng dầu & Hồ nước sâu")]) +
    make_table(
        ["MÃ VÙNG", "TÊN KHU VỰC VÙNG GIÁM SÁT", "LOẠI VÙNG", "DIỆN TÍCH (HA)", "QUY TẮC CẢNH BÁO", "TỐC ĐỘ GIỚI HẠN", "SỐ XE ĐANG TRONG VÙNG", "TRẠNG THÁI"],
        [
            ["<b>ZONE-NT1</b>", "<b>Vùng Nông Trường Chuối 1</b><small>Toàn bộ phân khu canh tác NT1</small>", "Vùng sản xuất nông nghiệp", "<b>3.200 ha</b>", "Cảnh báo khi xe cơ giới ra ngoài vùng", "30 km/h", "<b>34 xe</b>", make_pill("Đang hiệu lực", "")],
            ["<b>ZONE-PH2</b>", "<b>Khu Vực Nhà Máy Packhouse 2</b><small>Xưởng đóng gói & Trạm cân</small>", "Vùng sơ chế & Trạm cân", "<b>12.5 ha</b>", "Cảnh báo vượt tốc độ > 15 km/h", "15 km/h", "<b>12 xe</b>", make_pill("Đang hiệu lực", "")],
            ["<b>ZONE-XUONG</b>", "<b>Khu Vực Xưởng BTSC Trung Tâm</b><small>Bãi đỗ xe & Xưởng cơ giới</small>", "Khu kỹ thuật & Dịch vụ", "<b>8.0 ha</b>", "Theo dõi thời gian xe dừng sửa chữa", "10 km/h", "<b>15 xe</b>", make_pill("Đang hiệu lực", "")],
            ["<b>ZONE-KHO-XANG</b>", "<b>Vùng Kho Xăng Dầu & Bồn Ngầm T1</b><small>Khu vực an toàn PCCC cấp 1</small>", "Vùng kiểm soát nghiêm ngặt", "<b>3.5 ha</b>", "Cấm xe lạ, cấm nổ máy không phép", "5 km/h", "<b>2 xe téc</b>", make_pill("Kiểm soát gắt", "danger")],
            ["<b>ZONE-HO-NUOC</b>", "<b>Vùng Hồ Tưới Thủy Lợi 3</b><small>Vùng nước sâu nguy hiểm</small>", "Vùng cảnh báo an toàn bờ kè", "<b>45.0 ha</b>", "Báo động đỏ khi xe lại gần mép kè < 30m", "10 km/h", "<b>0 xe</b>", make_pill("Báo động SOS", "danger")]
        ],
        "Tìm mã vùng, tên khu vực, loại quy tắc...",
        "Hiển thị 1–5 trên 24 vùng Geo-fence"
    )
)

data_part4["pages/11-danh-muc/vat-tu-phu-tung.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Vật tư - Phụ tùng chuẩn", "Chuẩn hóa mã danh điểm phụ tùng cơ giới, dầu mỡ nhờn, lốp xe và nông cụ phục vụ toàn bộ tập đoàn.", ["↗ Xuất bảng giá vật tư", "＋ Thêm phụ tùng"]) +
    make_filters(["Tất cả nhóm phụ tùng (345 mã)", "Xuất xứ: Mỹ, Nhật Bản, Châu Âu, VN", "Đang quản lý"]) +
    make_stats([("Tổng mã phụ tùng", "345 mã", "100% chuẩn mã ERP"), ("Nhóm Dầu mỡ & Hóa chất", "38 mã", "Castrol, Mobil, Petrolimex"), ("Nhóm Lọc & Gioăng phớt", "84 mã", "Donaldson, Mann, Sakura"), ("Nhóm Lốp xe & Cơ khí gầm", "120 mã", "Bridgestone, DRC, Maxxis")]) +
    make_table(
        ["MÃ VẬT TƯ (ERP)", "TÊN PHỤ TÙNG / THÔNG SỐ", "NHÓM VẬT TƯ", "HÃNG SẢN XUẤT", "ĐƠN VỊ TÍNH", "XE ÁP DỤNG CHÍNH", "ĐƠN GIÁ CHUẨN (VNĐ)", "TRẠNG THÁI"],
        [
            ["<b>VT-LOC-P550388</b>", "Lọc nhớt động cơ cao cấp P550388", "Lọc & Lõi lọc", "Donaldson (Mỹ)", "Cái", "John Deere 6140B", "<b>420.000 đ</b>", make_pill("Đang sử dụng", "")],
            ["<b>VT-DAU-15W40</b>", "Dầu động cơ Diesel THACO 15W-40 CI-4", "Dầu nhờn bôi trơn", "THACO AGRI Lubricants", "Lít", "Toàn bộ máy cày & xe tải", "<b>78.000 đ</b>", make_pill("Đang sử dụng", "")],
            ["<b>VT-TL-VG68</b>", "Dầu thủy lực chống mài mòn Hyspin 68", "Dầu thủy lực", "Castrol Industrial", "Lít", "Máy đào CAT, Xe ben, Dàn cày", "<b>85.000 đ</b>", make_pill("Đang sử dụng", "")],
            ["<b>VT-LOP-1200R20</b>", "Lốp ô tô tải nặng 12.00R20 R150", "Lốp & Săm yếm", "Bridgestone Nhật Bản", "Quả", "Howo 4 chân, Hyundai HD270", "<b>7.850.000 đ</b>", make_pill("Đang sử dụng", "")],
            ["<b>VT-DAO-DC70</b>", "Bộ lưỡi dao cắt đôi máy gặt Kubota", "Phụ tùng nông cụ", "Kubota Chính Hãng", "Bộ", "Máy gặt Kubota DC-70G", "<b>1.250.000 đ</b>", make_pill("Đang sử dụng", "")]
        ],
        "Tìm mã ERP, tên phụ tùng, hãng SX...",
        "Hiển thị 1–5 trên 345 mã phụ tùng chuẩn"
    )
)

data_part4["pages/11-danh-muc/loai-nhien-lieu.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Loại nhiên liệu & Dầu nhớt", "Danh mục chuẩn các chủng loại xăng, dầu Diesel, dầu thủy lực, dầu cầu hộp số và mỡ bôi trơn.", ["↗ Xuất danh mục", "＋ Thêm loại nhiên liệu"]) +
    make_filters(["Tất cả nhiên liệu & dầu nhờn", "Nhà cung cấp: Petrolimex, Castrol", "Đang lưu kho"]) +
    make_stats([("Chủng loại nhiên liệu chính", "6 loại", "Diesel, Xăng, Dầu nhờn"), ("Mức tiêu thụ Diesel TB/ngày", "2.270 Lít", "Cung cấp cho 128 xe"), ("Dung tích bồn ngầm tổng", "110.000 Lít", "Trữ lượng an toàn"), ("Tiêu chuẩn khí thải", "Euro 4 / Euro 5", "Bảo vệ môi trường")]) +
    make_table(
        ["MÃ NHIÊN LIỆU", "TÊN LOẠI NHIÊN LIỆU / DẦU NHỚT", "TIÊU CHUẨN KỸ THUẬT", "ĐƠN VỊ TÍNH", "ĐƠN GIÁ HIỆN HÀNH", "NHÀ CUNG CẤP CHÍNH", "ỨNG DỤNG CHO LOẠI XE", "TRẠNG THÁI"],
        [
            ["<b>NL-DO-005S</b>", "<b>Dầu Diesel DO 0.05S-II</b><small>Nhiên liệu chính toàn đội xe</small>", "TCVN 5689:2018 (Hàm lượng lưu huỳnh < 500 ppm)", "Lít", "<b>21.500 đ</b>", "Petrolimex Gia Lai", "Toàn bộ máy kéo, xe tải, xe ben, máy đào", make_pill("Hiệu lực", "")],
            ["<b>NL-RON-95V</b>", "<b>Xăng không chì RON 95-V</b><small>Xăng cao cấp khí thải sạch</small>", "TCVN 6776:2018 (Euro 5)", "Lít", "<b>23.200 đ</b>", "Petrolimex Gia Lai", "Xe bán tải Ford Ranger, Máy cắt cỏ, Máy bơm", make_pill("Hiệu lực", "")],
            ["<b>NL-NHOT-15W40</b>", "<b>Dầu nhớt động cơ Diesel 15W-40</b><small>Cấp chất lượng API CI-4/SL</small>", "SAE 15W-40, API CI-4", "Lít", "<b>78.000 đ</b>", "THACO Chu Lai", "Động cơ máy cày John Deere, Howo, Kubota", make_pill("Hiệu lực", "")],
            ["<b>NL-THUY-LUC-68</b>", "<b>Dầu thủy lực Castrol Hyspin VG 68</b><small>Chống tạo bọt & chịu cực áp</small>", "ISO VG 68, DIN 51524 Part 2", "Lít", "<b>85.000 đ</b>", "Castrol BP Petco", "Bơm thủy lực máy đào CAT, ty ben dàn cày", make_pill("Hiệu lực", "")],
            ["<b>NL-MO-EP2</b>", "<b>Mỡ bôi trơn chịu nhiệt Lithium EP-2</b><small>Mỡ bò chịu cực áp màu vàng</small>", "NLGI Grade 2, Kháng nước tốt", "Kg", "<b>120.000 đ</b>", "Mobil Mobilgrease", "Gối đỡ trục các đăng, ắc nhíp, bi may-ơ", make_pill("Hiệu lực", "")]
        ],
        "Tìm mã nhiên liệu, tên loại dầu, tiêu chuẩn...",
        "Hiển thị 5 loại nhiên liệu & dầu mỡ chủ lực"
    )
)

data_part4["pages/11-danh-muc/dinh-muc.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Bảng định mức kỹ thuật", "Bảng tổng hợp toàn bộ các định mức diện tích cày bừa/ca máy, định mức dầu khoán và định mức vận tải.", ["↗ Xuất sổ tay định mức", "＋ Ban hành định mức mới"]) +
    make_filters(["Bảng định mức năm 2026", "Phê duyệt: Ban Tổng Giám Đốc", "Đang áp dụng"]) +
    make_stats([("Tổng định mức ban hành", "36 bảng định mức", "100% đo đạc thực tế"), ("Định mức làm đất", "12 quy chuẩn", "Cày, bừa, lên luống"), ("Định mức vận chuyển", "8 quy chuẩn", "Lít/100km & Tấn/chuyến"), ("Định mức bảo trì sửa chữa", "16 quy chuẩn", "Giờ công & phụ tùng")]) +
    make_table(
        ["MÃ ĐỊNH MỨC", "TÊN BẢNG ĐỊNH MỨC KỸ THUẬT", "ĐỐI TƯỢNG ÁP DỤNG", "ĐỊNH MỨC NĂNG SUẤT / CA", "ĐỊNH MỨC DẦU KHOÁN", "DUNG SAI CHO PHÉP", "NGÀY BAN HÀNH", "TRẠNG THÁI"],
        [
            ["<b>ĐM-KT-01</b>", "Định mức Cày ải sâu 35cm đất thịt", "Máy kéo John Deere 140HP + Chảo cày", "<b>1.2 ha / ca 8 giờ</b>", "<b>18.5 Lít / ha</b>", "±5% tùy mùa vụ", "01/01/2026", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-KT-02</b>", "Định mức Bừa phẳng & Lên luống đôi", "Máy kéo Kubota 70HP + Dàn bừa", "<b>1.8 ha / ca 8 giờ</b>", "<b>12.0 Lít / ha</b>", "±5%", "01/01/2026", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-KT-03</b>", "Định mức Vận chuyển chuối tươi Packhouse", "Xe tải Howo 4 chân thùng bạt", "<b>45 Tấn / xe / ngày (3 chuyến)</b>", "<b>30.0 Lít / 100 km</b>", "±4%", "01/01/2026", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-KT-04</b>", "Định mức Phun thuốc BVTV diện rộng", "Xe téc Hino 15m3 cần phun 18m", "<b>6.0 ha / ca 6 giờ</b>", "<b>5.5 Lít / Giờ máy</b>", "±5%", "01/01/2026", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-KT-05</b>", "Định mức Đào đắp kênh mương thủy lợi", "Máy đào bánh xích CAT 320D", "<b>350 m3 đất / ca 8 giờ</b>", "<b>14.5 Lít / Giờ máy</b>", "±6%", "01/01/2026", make_pill("Đang áp dụng", "")]
        ],
        "Tìm mã định mức, đối tượng áp dụng...",
        "Hiển thị 1–5 trên 36 quy chuẩn định mức"
    )
)

# 12. QUẢN TRỊ HỆ THỐNG
data_part4["pages/12-quan-tri-he-thong/nguoi-dung.html"] = (
    make_head("QUẢN TRỊ HỆ THỐNG", "Quản lý Người dùng & Tài khoản", "Quản lý danh sách tài khoản cán bộ quản lý, điều độ viên, thủ kho và nhân sự kỹ thuật đăng nhập hệ thống.", ["↗ Xuất danh sách", "＋ Thêm người dùng mới"]) +
    make_filters(["Tất cả người dùng (45 tài khoản)", "Đơn vị: KLH Koun Mom", "Trạng thái: Đang hoạt động"]) +
    make_stats([("Tổng tài khoản hệ thống", "45 tài khoản", "100% xác thực SSO THACO"), ("Đang Online làm việc", "18 tài khoản", "Điều độ, quản đốc, thủ kho"), ("Tài khoản quản trị (Admin)", "3 tài khoản", "Phòng CNTT THACO AGRI"), ("Tài khoản bị khóa", "0 tài khoản", "Bảo mật an toàn 100%")]) +
    make_table(
        ["MÃ NV / USERNAME", "HỌ VÀ TÊN", "EMAIL DOANH NGHIỆP", "VAI TRÒ TRUY CẬP", "ĐƠN VỊ CÔNG TÁC", "ĐĂNG NHẬP CUỐI", "IP TRUY CẬP", "TRẠNG THÁI"],
        [
            ["<b>long.chautieu</b><small>NV-IT-001</small>", "<b>Chau Tiểu Long</b><small>Chuyên viên Quản trị Hệ thống</small>", "long.chautieu@thacoagri.com.vn", "<b style='color:var(--green2)'>Quản trị viên Hệ thống (Admin)</b>", "Phòng CNTT THACO AGRI", "23/08/2026 · 08:42:16", "10.20.15.88", make_pill("Online", "")],
            ["<b>vinh.tranquang</b><small>NV-BGD-001</small>", "<b>Trần Quang Vinh</b><small>Giám đốc Vận hành KLH</small>", "vinh.tranquang@thacoagri.com.vn", "Ban Giám Đốc KLH (Xem toàn quyền)", "Ban Giám Đốc KLH Koun Mom", "23/08/2026 · 07:15:30", "10.20.15.10", make_pill("Offline", "")],
            ["<b>minh.nguyenvan</b><small>NV-0824</small>", "<b>Nguyễn Văn Minh</b><small>Tổ trưởng Đội Xe Cơ giới 1</small>", "minh.nguyenvan@thacoagri.com.vn", "Điều độ viên & Đội trưởng Xe", "Xí nghiệp Chuối 1", "23/08/2026 · 05:45:10", "10.20.18.24", make_pill("Online", "")],
            ["<b>tam.leminh</b><small>NV-BTSC-001</small>", "<b>Lê Minh Tâm</b><small>Trưởng xưởng BTSC Trung tâm</small>", "tam.leminh@thacoagri.com.vn", "Quản lý Bảo trì - Sửa chữa & Kho", "Xưởng BTSC Trung tâm", "23/08/2026 · 07:30:45", "10.20.16.12", make_pill("Online", "")],
            ["<b>ha.lethithu</b><small>NV-KHO-002</small>", "<b>Lê Thị Thu Hà</b><small>Thủ kho Xăng dầu T1</small>", "ha.lethithu@thacoagri.com.vn", "Thủ kho Nhiên liệu & Cấp phát", "Kho Xăng dầu Trung tâm", "23/08/2026 · 06:10:00", "10.20.17.05", make_pill("Online", "")]
        ],
        "Tìm username, họ tên, email, vai trò...",
        "Hiển thị 1–5 trên 45 người dùng"
    )
)

data_part4["pages/12-quan-tri-he-thong/vai-tro-phan-quyen.html"] = (
    make_head("QUẢN TRỊ HỆ THỐNG", "Vai trò & Phân quyền chức năng", "Thiết lập ma trận phân quyền truy cập, quyền tạo lệnh, duyệt kế hoạch, nghiệm thu và xuất báo cáo.", ["Khôi phục mặc định", "💾 Lưu phân quyền"]) +
    make_filters(["Nhóm vai trò: 6 nhóm", "Áp dụng: Toàn hệ thống", "Phân quyền chi tiết (RBAC)"]) +
    make_stats([("Tổng nhóm vai trò", "6 nhóm quyền", "Admin, Giám đốc, Điều độ, Quản đốc, Thủ kho, Lái xe"), ("Quyền hạn chức năng", "148 quyền", "Xem, Thêm, Sửa, Xóa, Duyệt"), ("Người dùng được gán quyền", "45 người", "100% đúng ma trận"), ("Chính sách bảo mật", "Mật khẩu 2 lớp (OTP)", "Bắt buộc đổi 90 ngày")]) +
    make_settings("Cấu hình ma trận phân quyền theo vai trò", "Thiết lập quyền truy cập cho nhóm [Điều độ viên Vận tải & Cơ giới]", [
        {"label": "Tên nhóm quyền", "val": "Điều độ viên Vận tải & Cơ giới KLH", "hint": "Nhóm quyền phụ trách lập lệnh điều xe, giám sát GPS và theo dõi chuyến."},
        {"label": "Phạm vi dữ liệu được phép xem", "val": "Toàn bộ phương tiện và tài xế trong KLH Koun Mom", "hint": "Không được xem dữ liệu tài chính chi tiết của các KLH khác."},
        {"label": "Quyền lập & Phê duyệt lệnh", "val": "Được tạo mới Lệnh Điều Xe (LĐX), Lệnh Vận Chuyển (LVC) và Phân ca lái xe", "hint": "Lệnh Sản Xuất diện tích lớn (>20ha) phải chuyển Quản đốc duyệt."},
        {"label": "Quyền xác nhận & Nghiệm thu", "val": "Xác nhận số lượng phiếu cân, xác nhận hoàn thành chuyến xe vận chuyển", "hint": "Có quyền đính kèm biên bản sự cố hiện trường."},
        {"label": "Quyền xuất báo cáo & Dữ liệu", "val": "Được xuất file Excel báo cáo điều hành, báo cáo hành trình GPS", "hint": "Không được chỉnh sửa cấu hình hệ thống và danh mục dùng chung."}
    ], ["Quản trị viên (Admin)", "Ban Giám Đốc KLH", "Quản đốc Xí nghiệp", "Điều độ viên Vận tải", "Trưởng xưởng BTSC", "Thủ kho Nhiên liệu"])
)

data_part4["pages/12-quan-tri-he-thong/phan-quyen-don-vi.html"] = (
    make_head("QUẢN TRỊ HỆ THỐNG", "Phân quyền dữ liệu theo Đơn vị", "Thiết lập cây phân cấp dữ liệu và giới hạn phạm vi hiển thị thông tin phương tiện theo từng Xí nghiệp Nông trường.", ["Khôi phục mặc định", "💾 Lưu phân quyền đơn vị"]) +
    make_filters(["Chọn người dùng: Nguyễn Văn Hải (Quản đốc XN Chuối 1)", "Cây đơn vị KLH Koun Mom", "Đang hiệu lực"]) +
    make_stats([("Đơn vị được phân quyền", "Xí nghiệp Chuối 1", "Toàn quyền quản lý 46 xe"), ("Lô thửa được giám sát", "84 Lô canh tác", "Phân khu A & B"), ("Trạm nhiên liệu được duyệt", "Cột bơm T1 & Bồn NT1", "Duyệt cấp dầu máy cày"), ("Quyền xem các đơn vị khác", "Chỉ xem tổng quan", "Không can thiệp lệnh xe")]) +
    make_settings("Phân quyền dữ liệu cho Quản đốc Xí nghiệp Nông trường Chuối 1", "Chỉ định danh mục xí nghiệp, đội xe và lô thửa mà tài khoản được quyền thao tác trực tiếp.", [
        {"label": "Tài khoản cán bộ", "val": "hai.nguyenvan (Nguyễn Văn Hải - Quản đốc XN Chuối 1)", "hint": "Mã nhân sự: NV-QD-001."},
        {"label": "Khu Liên Hợp trực thuộc", "val": "Khu Liên Hợp Koun Mom (Campuchia)", "hint": "Phạm vi cấp 1."},
        {"label": "Xí nghiệp được phân công phụ trách chính", "val": "Xí nghiệp Nông trường Chuối 1 (NT1)", "hint": "Được toàn quyền tạo Lệnh sản xuất, duyệt nghiệm thu diện tích cày bừa."},
        {"label": "Đội xe cơ giới được quyền điều động", "val": "Đội Xe Cơ giới 1 (36 xe) + Đội Xe BVTV 1 (6 xe)", "hint": "Các đội xe trực tiếp phục vụ Nông trường 1."},
        {"label": "Giới hạn xem dữ liệu ngoài phạm vi", "val": "Chỉ đọc (Read-only) dữ liệu bản đồ toàn KLH để phối hợp tránh trùng lịch", "hint": "Không thể duyệt lệnh cho Xí nghiệp Chuối 2 hoặc XN Cây ăn trái."}
    ], ["Phân quyền KLH", "Phân quyền Xí nghiệp", "Phân quyền Đội xe", "Phân quyền Lô thửa"])
)

data_part4["pages/12-quan-tri-he-thong/cau-hinh-thong-bao.html"] = (
    make_head("QUẢN TRỊ HỆ THỐNG", "Cấu hình kênh thông báo tự động", "Thiết lập máy chủ gửi tin nhắn SMS Brandname, Telegram Bot, Zalo OA và App Push Notification cho tài xế.", ["Kiểm tra kết nối", "💾 Lưu cấu hình"]) +
    make_filters(["Môi trường: Production", "Tất cả kênh thông báo", "Trạng thái: Sẵn sàng"]) +
    make_stats([("Kênh Telegram Bot", "Hoạt động (100%)", "Kênh Ban Giám Đốc KLH"), ("Kênh Zalo OA Doanh Nghiệp", "Hoạt động (100%)", "Gửi tin nhắc nhở tài xế"), ("Kênh SMS Brandname THACO", "Hoạt động (100%)", "Gửi mã OTP & Khẩn cấp"), ("Thời gian trễ gửi tin", "< 1.5 giây", "Độ tin cậy 99.9%")]) +
    make_settings("Thiết lập thông số kết nối API Gateway thông báo", "Cấu hình API Key, Webhook Token và kịch bản gửi tin tự động khi phát sinh sự cố.", [
        {"label": "Telegram Bot Token (Ban Chỉ Đạo Vận Hành)", "val": "bot6892019284:AAH99xKk2819_ThacoAgriKM_Alert", "hint": "Bot tự động gửi tin nhắn báo cáo khẩn về nhóm Telegram Giám Đốc KLH."},
        {"label": "Telegram Group Chat ID nhận sự cố khẩn cấp", "val": "-1001892019482 (Nhóm Trực Ban Điều Độ Koun Mom)", "hint": "Nhận tin khi có cảnh báo đỏ: Rút trộm dầu, Quá tốc độ, Mất tín hiệu xe."},
        {"label": "Zalo Official Account (OA) Secret Key", "val": "zalo_oa_sec_88921048821901_thacoagri", "hint": "Dùng gửi thông báo lệnh điều xe mới và nhắc nhở thời hạn GPLX cho lái xe."},
        {"label": "SMS Brandname Sender ID", "val": "THACO AGRI", "hint": "Tên thương hiệu hiển thị trên tin nhắn SMS của nhà mạng Viettel / Metfone."},
        {"label": "Tần suất gửi tin nhắc nhở lặp lại (Phút)", "val": "10", "hint": "Nếu cảnh báo chưa được điều độ viên ấn xác nhận sau 10 phút, gửi lại lần 2."}
    ], ["Cấu hình Telegram Bot", "Cấu hình Zalo OA", "Cấu hình SMS Gateway", "Mẫu tin nhắn (Templates)"])
)

data_part4["pages/12-quan-tri-he-thong/nhat-ky-he-thong.html"] = (
    make_head("QUẢN TRỊ HỆ THỐNG", "Nhật ký hệ thống (Audit Trail)", "Truy vết toàn bộ các hành động đăng nhập, tạo lệnh, sửa định mức, xóa dữ liệu và thay đổi cấu hình.", ["↗ Xuất file nhật ký", "🔍 Lọc theo người dùng"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả module", "Ghi nhận 100% sự kiện"]) +
    make_stats([("Tổng sự kiện trong ngày", "342 sự kiện", "Giao dịch hệ thống"), ("Thao tác tạo mới / cập nhật", "285 thao tác", "Lệnh điều xe, cấp dầu"), ("Thao tác đăng nhập / đăng xuất", "48 lượt", "100% IP hợp lệ"), ("Cảnh báo truy cập bất thường", "0 cảnh báo", "Hệ thống an toàn")]) +
    make_timeline([
        ("Người dùng long.chautieu cập nhật ngưỡng cảnh báo tốc độ", "Điều chỉnh ngưỡng cảnh báo tốc độ khu vực dân cư Packhouse 2 từ 20 km/h xuống 15 km/h theo chỉ đạo an toàn mới.", "23/08/2026 · 08:30:15 · IP: 10.20.15.88 · Chau Tiểu Long (Admin)", "Xem chi tiết thay đổi"),
        ("Người dùng minh.nguyenvan tạo mới Lệnh Sản Xuất LSX-260823-03", "Phát hành lệnh cày lật đất sâu 35cm tại Lô CN-A12 (24.0 ha) cho xe John Deere XC-JD-024.", "23/08/2026 · 06:00:22 · IP: 10.20.18.24 · Nguyễn Văn Minh (Tổ trưởng)", "Xem nội dung lệnh"),
        ("Người dùng ha.lethithu xuất phiếu cấp dầu PCD-0823-01", "Xác nhận xuất 160 Lít dầu Diesel DO 0.05S từ Cột bơm T1 cho xe máy kéo John Deere XC-JD-024.", "23/08/2026 · 06:15:30 · IP: 10.20.17.05 · Lê Thị Thu Hà (Thủ kho)", "Xem phiếu xuất"),
        ("Người dùng tam.leminh duyệt nghiệm thu Phiếu sửa chữa PSC-0821-03", "Ký duyệt hoàn tất sửa chữa thay bộ dao cắt đôi máy gặt Kubota DC-70G (MG-KB-018).", "22/08/2026 · 17:00:45 · IP: 10.20.16.12 · Lê Minh Tâm (Trưởng xưởng)", "Xem biên bản nghiệm thu"),
        ("Đăng nhập thành công từ thiết bị mới", "Người dùng vinh.tranquang đăng nhập thành công vào ứng dụng Quản lý Điều hành trên iPad Pro.", "22/08/2026 · 07:15:30 · IP: 10.20.15.10 · Trần Quang Vinh (Giám đốc KLH)", "Xem thông tin thiết bị")
    ])
)

data_part4["pages/12-quan-tri-he-thong/cau-hinh-he-thong.html"] = (
    make_head("QUẢN TRỊ HỆ THỐNG", "Cấu hình tham số hệ thống", "Cài đặt các thông số vận hành máy chủ, chu kỳ đồng bộ dữ liệu GPS, kết nối MQTT Broker và sao lưu tự động.", ["Khôi phục mặc định", "💾 Lưu thiết lập hệ thống"]) +
    make_filters(["Môi trường: Production (KLH Koun Mom)", "Phiên bản: 1.0.0", "Hệ thống ổn định"]) +
    make_stats([("Trạng thái MQTT Broker", "Online (2.450 msg/s)", "Đồng bộ GPS 128 xe"), ("Dung lượng Cơ sở dữ liệu", "42.8 GB", "PostgreSQL + TimescaleDB"), ("Sao lưu tự động (Backup)", "02:00 sáng hàng ngày", "Lưu trữ đám mây an toàn"), ("Thời gian Uptime máy chủ", "99.98%", "Hoạt động liên tục 180 ngày")]) +
    make_settings("Cài đặt thông số kết nối & Chu kỳ đồng bộ GPS", "Các thiết lập kỹ thuật nền tảng cho hệ thống Fleet Management THACO AGRI.", [
        {"label": "Chu kỳ nhận dữ liệu GPS khi xe đang di chuyển / nổ máy (Giây)", "val": "10", "hint": "Tần suất truyền bản tin tọa độ, tốc độ, mức dầu từ hộp đen về máy chủ."},
        {"label": "Chu kỳ nhận dữ liệu GPS khi xe tắt máy / dừng đỗ (Phút)", "val": "5", "hint": "Giúp tiết kiệm ắc quy phương tiện và giảm tải băng thông 4G."},
        {"label": "Địa chỉ MQTT Broker Gateway tiếp nhận dữ liệu thiết bị", "val": "mqtt://gps-gateway.thacoagri.com.vn:1883", "hint": "Giao thức truyền nhận dữ liệu IoT thời gian thực."},
        {"label": "Ngưỡng lọc nhiễu GPS khi dừng xe (Bán kính mét)", "val": "15", "hint": "Loại bỏ hiện tượng trôi dạt tọa độ GPS khi xe đang đỗ một chỗ."},
        {"label": "Thời gian tự động đăng xuất tài khoản khi không thao tác (Phút)", "val": "30", "hint": "Đảm bảo an toàn bảo mật khi cán bộ rời khỏi máy tính làm việc."}
    ], ["Thông số GPS & Thiết bị", "Cơ sở dữ liệu & Sao lưu", "Bảo mật & Phiên đăng nhập", "Máy chủ MQTT & API"])
)

print("Part 4 data defined successfully:", len(data_part4), "pages.")
