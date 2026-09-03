# -*- coding: utf-8 -*-
"""
Generator for Module H (Danh mục), Module I (Lái xe), Module J (Nhiên liệu), Module K (Cảnh báo)
Completely removes SMS/Zalo/Email channels and focuses on internal web alerts and dashboard notifications.
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
# MODULE H: DANH MỤC HỆ THỐNG
# ==========================================
PAGES_DATA["pages/H-danh-muc/don-vi-klh-doi-xe.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Đơn vị / KLH / Đội xe", "Cấu trúc tổ chức phân cấp từ Tập đoàn THACO AGRI → Khu Liên Hợp → Xí nghiệp → Đội xe cơ giới.", ["↗ Xuất sơ đồ", "＋ Thêm đơn vị"]) +
    make_filters(["Toàn bộ tập đoàn", "KLH Koun Mom (Rattanakiri)", "Trạng thái: Hoạt động"]) +
    make_stats([("Khu Liên Hợp trực thuộc", "4 KLH", "Koun Mom, Snuol, Ia Puch, HAGL"), ("Xí nghiệp thành viên", "18 Xí nghiệp", "12 Trồng trọt · 6 Chăn nuôi"), ("Đội xe cơ giới", "32 Đội xe", "Cơ giới, Vận tải, Thủy lợi"), ("Tổng diện tích quản lý", "84.000 ha", "Toàn tập đoàn")]) +
    make_table(
        ["MÃ ĐƠN VỊ", "TÊN ĐƠN VỊ / XÍ NGHIỆP", "CẤP QUẢN LÝ", "ĐỊA BÀN HOẠT ĐỘNG", "DIỆN TÍCH (HA)", "SỐ XE PHÂN BỔ", "GIÁM ĐỐC / TRƯỞNG ĐƠN VỊ", "TRẠNG THÁI"],
        [
            ["<b>KLH-KM</b>", "<b>Khu Liên Hợp Koun Mom</b>", "Cấp 1 (Khu Liên Hợp)", "Tỉnh Rattanakiri, Campuchia", "<b>23.000 ha</b>", "<b>128 xe</b>", "Trần Quang Vinh<small>Giám đốc KLH</small>", make_pill("Đang hoạt động", "")],
            ["<b>XN-CHUOI-01</b>", "Xí nghiệp Nông trường Chuối 1 (NT1)", "Cấp 2 (Xí nghiệp)", "Phân khu Bắc Koun Mom", "<b>1.200 ha</b>", "<b>46 xe</b>", "Nguyễn Văn Hải<small>Quản đốc XN</small>", make_pill("Đang hoạt động", "")],
            ["<b>XN-CHUOI-02</b>", "Xí nghiệp Nông trường Chuối 2 (NT2)", "Cấp 2 (Xí nghiệp)", "Phân khu Nam Koun Mom", "<b>950 ha</b>", "<b>38 xe</b>", "Lê Minh Tuấn<small>Quản đốc XN</small>", make_pill("Đang hoạt động", "")],
            ["<b>XN-CAT-03</b>", "Xí nghiệp Nông trường Cây ăn trái", "Cấp 2 (Xí nghiệp)", "Phân khu Đông Koun Mom", "<b>600 ha</b>", "<b>22 xe</b>", "Phạm Hùng Cường<small>Quản đốc XN</small>", make_pill("Đang hoạt động", "")],
            ["<b>ĐX-CG-01</b>", "Đội Xe Cơ giới 1 (Cày bừa NT1)", "Cấp 3 (Đội xe)", "Nông trường Chuối 1", "Trực thuộc NT1", "<b>36 xe</b>", "Nguyễn Văn Minh<small>Tổ trưởng lái máy</small>", make_pill("Đang hoạt động", "")]
        ],
        "Tìm mã đơn vị, tên xí nghiệp, cấp quản lý...",
        "Hiển thị cây cơ cấu tổ chức và đội xe"
    )
)

PAGES_DATA["pages/H-danh-muc/loai-xe-9-chung-loai.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục 9 Chủng loại Xe thực tế", "Chuẩn hóa đúng 9 chủng loại phương tiện cơ giới đang hoạt động thực tế tại Khu liên hợp Koun Mom.", ["↗ Xuất danh mục", "＋ Thêm chủng loại"]) +
    make_filters(["Khớp 9 chủng loại thực tế", "Hãng: John Deere, Kubota, Howo, Hino, CAT", "Đang quản lý"]) +
    make_stats([("9 Chủng loại chuẩn", "100% khớp thực tế", "Máy kéo, máy gặt, xe tải, xe ben, máy đào..."), ("Tổng đầu xe quản lý", "128 xe", "Theo 9 nhóm"), ("Nhiên liệu sử dụng", "Diesel DO 0.05S", "Và Xăng Ron 95-V"), ("Quy chuẩn kỹ thuật", "100% có định mức", "Giờ máy & Nhiên liệu")]) +
    make_table(
        ["STT", "MÃ CHỦNG LOẠI", "TÊN CHỦNG LOẠI XE THỰC TẾ", "HÃNG SẢN XUẤT", "CÔNG SUẤT / TẢI TRỌNG", "ĐỊNH MỨC DẦU CHUẨN", "SỐ LƯỢNG XE", "TRẠNG THÁI"],
        [
            ["1", "<b>LX-MAY-KEO-L</b>", "Máy kéo bánh lốp nông nghiệp (140HP)", "John Deere 6140B (Mỹ / Ấn Độ)", "140 HP (Mã lực)", "18.5 L/ha (Cày) · 4.2 L/h", "<b>24 xe</b>", make_pill("Đang dùng", "")],
            ["2", "<b>LX-MAY-KEO-N</b>", "Máy kéo bánh lốp nông nghiệp (70-90HP)", "Kubota M7040 / New Holland", "70 - 90 HP", "12.0 L/ha (Bừa) · 3.5 L/h", "<b>38 xe</b>", make_pill("Đang dùng", "")],
            ["3", "<b>LX-XE-HOWO-15T</b>", "Xe tải thùng mui bạt Howo 4 chân", "Sinotruk Howo 371HP", "15 Tấn chở chuối buồng", "30.0 L / 100 km", "<b>18 xe</b>", make_pill("Đang dùng", "")],
            ["4", "<b>LX-XE-HINO-8T</b>", "Xe ô tô tải Hino 500 Series", "Hino Motors Nhật Bản", "8 Tấn chở nông sản & vật tư", "22.0 L / 100 km", "<b>12 xe</b>", make_pill("Đang dùng", "")],
            ["5", "<b>LX-XE-BEN-15T</b>", "Xe ben Hyundai HD270 chở đất đá", "Hyundai Hàn Quốc", "15 Tấn chở đất đá, phân rời", "35.0 L / 100 km", "<b>6 xe</b>", make_pill("Đang dùng", "")],
            ["6", "<b>LX-MAY-GAT-DAP</b>", "Máy gặt đập liên hợp Kubota", "Kubota DC-70G", "70 HP thu hoạch bắp sinh khối", "15.0 L / ha", "<b>4 xe</b>", make_pill("Đang dùng", "")],
            ["7", "<b>LX-MAY-DAO-XICH</b>", "Máy đào bánh xích thủy lợi", "Caterpillar CAT 320D", "148 HP · Gầu múc 0.9 m3", "14.5 Lít / Giờ máy", "<b>8 xe</b>", make_pill("Đang dùng", "")],
            ["8", "<b>LX-MAY-UI-DAT</b>", "Máy ủi san gạt mặt bằng", "Komatsu D31P", "85 HP lưỡi ủi nghiêng", "11.0 Lít / Giờ máy", "<b>6 xe</b>", make_pill("Đang dùng", "")],
            ["9", "<b>LX-CHUYEN-DUNG</b>", "Xe chuyên dùng (Téc nước, Xe bồn dầu)", "Hino 15m3 & Dongfeng 5m3", "Téc phun thuốc, cấp dầu lưu động", "5.5 Lít / Giờ máy", "<b>12 xe</b>", make_pill("Đang dùng", "")]
        ],
        "Tìm 9 chủng loại xe thực tế...",
        "Hiển thị đầy đủ 9 chủng loại xe thực tế theo BRD"
    )
)

PAGES_DATA["pages/H-danh-muc/loai-cong-viec-loai-lenh.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Loại công việc & Loại lệnh", "Chuẩn hóa các loại lệnh sản xuất, lệnh vận chuyển, lệnh điều xe công tác và các hạng mục công việc cơ giới.", ["↗ Xuất danh mục", "＋ Thêm loại mới"]) +
    make_filters(["Tất cả nhóm lệnh & công việc", "Áp dụng: Toàn KLH", "Đang hiệu lực"]) +
    make_stats([("Loại lệnh điều động", "4 loại lệnh", "LSX, LVC, LĐX, LCH"), ("Hạng mục công việc nông nghiệp", "24 công việc", "Làm đất, Trồng mới, Thu hoạch"), ("Cấp phê duyệt", "Quản đốc & Điều độ", "100% qua phần mềm"), ("Quy chuẩn mã hóa", "Chuẩn ERP THACO", "Dễ dàng tra cứu")]) +
    make_table(
        ["MÃ LOẠI LỆNH / CV", "TÊN QUY TRÌNH / HẠNG MỤC", "PHÂN LOẠI", "CẤP PHÊ DUYỆT BẮT BUỘC", "ĐỊNH MỨC CA MÁY", "ĐỊNH MỨC DẦU KHOÁN", "TRẠNG THÁI"],
        [
            ["<b>LL-LSX</b>", "Lệnh Sản Xuất Nông Nghiệp<small>Chuỗi Làm đất → Trồng mới → Thu hoạch</small>", "Lệnh sản xuất", "Quản đốc Xí nghiệp Nông trường", "Theo ca máy (8 - 12h)", "18.5 L/ha cày ải", make_pill("Hiệu lực", "")],
            ["<b>LL-LVC</b>", "Lệnh Vận Chuyển Nội Bộ<small>Luồng 3 chặng phụ phẩm & chuối</small>", "Lệnh vận chuyển", "Điều độ viên Trung tâm Vận tải", "Theo chuyến (Km & Tấn)", "30.0 L/100km Howo", make_pill("Hiệu lực", "")],
            ["<b>LL-LĐX</b>", "Lệnh Điều Xe Công Tác & Cứu Hộ", "Lệnh điều động", "Trưởng phòng Quản lý Xe Cơ giới", "Theo đợt công tác", "Theo cự ly thực tế GPS", make_pill("Hiệu lực", "")],
            ["<b>CV-CAY-01</b>", "Cày lật đất sâu 35cm (Dàn 4 chảo)", "Công việc làm đất", "Đội trưởng Cơ giới", "1.2 ha / ca 8 giờ", "18.5 Lít / ha", make_pill("Hiệu lực", "")],
            ["<b>CV-BUA-02</b>", "Bừa phẳng & Lên luống đôi trồng chuối", "Công việc làm đất", "Đội trưởng Cơ giới", "1.8 ha / ca 8 giờ", "12.0 Lít / ha", make_pill("Hiệu lực", "")]
        ],
        "Tìm mã loại lệnh, tên công việc...",
        "Hiển thị danh mục loại lệnh và công việc chuẩn"
    )
)

PAGES_DATA["pages/H-danh-muc/lo-thua-tuyen-duong.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Lô thửa & Tuyến đường", "Quản lý dữ liệu bản đồ GIS lô thửa nông trường và mạng lưới tuyến đường nội bộ quy định tốc độ cho phép.", ["↗ Xuất GIS/KML", "＋ Thêm lô/tuyến"]) +
    make_filters(["Tất cả 186 Lô canh tác & 32 Tuyến đường", "KLH Koun Mom", "Đang canh tác"]) +
    make_stats([("Tổng diện tích 186 Lô thửa", "22.500 ha", "Chuối, Cây ăn trái, Bắp"), ("Chiều dài 32 tuyến đường", "148.5 km", "Trục chính bê tông & cấp phối"), ("Tốc độ tối đa trục chính", "35 km/h", "Đường bê tông rộng 8m"), ("Tốc độ đường bờ lô", "15 km/h", "Đường đất nội đồng")]) +
    make_table(
        ["MÃ LÔ / TUYẾN", "TÊN LÔ THỬA / TUYẾN ĐƯỜNG", "ĐƠN VỊ TRỰC THUỘC", "DIỆN TÍCH / CHIỀU DÀI", "LOẠI CÂY / MẶT ĐƯỜNG", "TỐC ĐỘ GIỚI HẠN", "TRẠNG THÁI"],
        [
            ["<b>LO-CN-A12</b>", "Lô Chuối A12 (Phân khu A)", "Xí nghiệp Chuối 1", "<b>25.5 ha</b>", "Chuối Cavendish Nam Mỹ", "—", make_pill("Đang canh tác", "")],
            ["<b>LO-CN-B06</b>", "Lô Chuối B06 (Phân khu B)", "Xí nghiệp Chuối 1", "<b>32.0 ha</b>", "Chuối Cavendish Nam Mỹ", "—", make_pill("Đang làm đất", "pending")],
            ["<b>LO-CAT-C04</b>", "Lô Sầu Riêng C04", "Xí nghiệp Cây ăn trái", "<b>18.2 ha</b>", "Sầu riêng Musang King & Monthong", "—", make_pill("Đang canh tác", "")],
            ["<b>TD-TC-01</b>", "Đường Trục Chính Bắc Nam", "Ban Vận Hành KLH", "<b>14.2 km</b>", "Bê tông xi măng rộng 8m", "<b style='color:var(--green2)'>35 km/h</b>", make_pill("Lưu thông tốt", "")],
            ["<b>TD-PH-02</b>", "Tuyến Vận Chuyển Chuối Packhouse 2", "Nông trường 1 ➔ PH2", "<b>8.4 km</b>", "Cấp phối sỏi đỏ đầm chặt rộng 6m", "<b style='color:var(--green2)'>25 km/h</b>", make_pill("Lưu thông tốt", "")]
        ],
        "Tìm mã lô, tên tuyến đường...",
        "Hiển thị danh mục lô thửa và tuyến đường nội bộ"
    )
)

PAGES_DATA["pages/H-danh-muc/vat-tu-phu-tung.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Vật tư & Phụ tùng BTSC", "Chuẩn hóa danh mục mã phụ tùng thay thế tiêu chuẩn, dầu nhớt bôi trơn và lốp xe theo quy chuẩn THACO AGRI.", ["↗ Xuất bảng giá vật tư", "＋ Thêm phụ tùng"]) +
    make_filters(["Tất cả 345 mã phụ tùng", "Kho BTSC Trung tâm", "Đang quản lý"]) +
    make_stats([("Tổng mã phụ tùng", "345 mã", "100% chuẩn mã ERP"), ("Nhóm Dầu nhớt bôi trơn", "38 mã", "15W-40, Thủy lực 68, Mỡ bò"), ("Nhóm Lọc & Gioăng phớt", "84 mã", "Donaldson, Kubota, Howo"), ("Nhóm Lốp xe & Cơ khí", "120 mã", "Bridgestone, Maxxis, DRC")]) +
    make_table(
        ["MÃ VẬT TƯ (ERP)", "TÊN PHỤ TÙNG / QUY CÁCH", "NHÓM VẬT TƯ", "HÃNG SẢN XUẤT", "ĐƠN VỊ TÍNH", "XE ÁP DỤNG CHÍNH", "ĐƠN GIÁ (VNĐ)", "TRẠNG THÁI"],
        [
            ["<b>VT-LOC-P550388</b>", "Lọc nhớt động cơ P550388", "Lọc & Lõi lọc", "Donaldson (Mỹ)", "Cái", "Máy kéo John Deere 6140B", "<b>420.000 đ</b>", make_pill("Đang dùng", "")],
            ["<b>VT-DAU-15W40</b>", "Dầu động cơ Diesel 15W-40 CI-4", "Dầu nhờn bôi trơn", "THACO AGRI Lubricants", "Lít", "Toàn bộ máy cày & xe tải", "<b>78.000 đ</b>", make_pill("Đang dùng", "")],
            ["<b>VT-TL-VG68</b>", "Dầu thủy lực chống mài mòn VG 68", "Dầu thủy lực", "Castrol Industrial", "Lít", "Máy đào CAT, Xe ben, Dàn cày", "<b>85.000 đ</b>", make_pill("Đang dùng", "")],
            ["<b>VT-LOP-1200R20</b>", "Lốp ô tô tải nặng 12.00R20", "Lốp & Săm yếm", "Bridgestone Nhật Bản", "Quả", "Howo 4 chân, Hyundai HD270", "<b>7.850.000 đ</b>", make_pill("Đang dùng", "")],
            ["<b>VT-DAO-DC70</b>", "Bộ lưỡi dao cắt đôi máy gặt Kubota", "Phụ tùng nông cụ", "Kubota Chính Hãng", "Bộ", "Máy gặt Kubota DC-70G", "<b>1.250.000 đ</b>", make_pill("Đang dùng", "")]
        ],
        "Tìm mã ERP, tên phụ tùng, loại xe...",
        "Hiển thị danh mục vật tư phụ tùng chuẩn"
    )
)

PAGES_DATA["pages/H-danh-muc/dinh-muc-ky-thuat.html"] = (
    make_head("DANH MỤC HỆ THỐNG", "Danh mục Bảng định mức kỹ thuật", "Bảng định mức năng suất diện tích cày bừa/ca máy, định mức giờ công và tải trọng vận chuyển nội bộ.", ["↗ Xuất sổ tay định mức", "＋ Ban hành định mức mới"]) +
    make_filters(["Bảng định mức năm 2026", "Phê duyệt: Ban Tổng Giám Đốc", "Đang áp dụng"]) +
    make_stats([("Định mức làm đất", "12 quy chuẩn", "Cày, bừa, lên luống"), ("Định mức vận chuyển", "8 quy chuẩn", "Tấn/chuyến & Giờ quay vòng"), ("Định mức bảo trì sửa chữa", "16 quy chuẩn", "Giờ công thợ máy"), ("Chu kỳ rà soát", "Hằng năm", "Theo điều kiện thổ nhưỡng")]) +
    make_table(
        ["MÃ ĐỊNH MỨC", "TÊN BẢNG ĐỊNH MỨC KỸ THUẬT", "ĐỐI TƯỢNG ÁP DỤNG", "ĐỊNH MỨC NĂNG SUẤT / CA", "ĐỊNH MỨC GIỜ CÔNG", "DUNG SAI CHO PHÉP", "NGÀY BAN HÀNH", "TRẠNG THÁI"],
        [
            ["<b>ĐM-KT-01</b>", "Định mức Cày ải sâu 35cm đất thịt", "Máy kéo John Deere 140HP + Chảo cày", "<b>1.2 ha / ca 8 giờ</b>", "8.0 giờ công / ca", "±5% tùy mùa vụ", "01/01/2026", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-KT-02</b>", "Định mức Bừa phẳng & Lên luống đôi", "Máy kéo Kubota 70HP + Dàn bừa", "<b>1.8 ha / ca 8 giờ</b>", "8.0 giờ công / ca", "±5%", "01/01/2026", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-KT-03</b>", "Định mức Vận chuyển chuối tươi Packhouse", "Xe tải Howo 4 chân thùng bạt", "<b>45 Tấn / xe / ngày (3 chuyến)</b>", "Thời gian quay vòng 45p", "±4%", "01/01/2026", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-KT-04</b>", "Định mức Phun thuốc BVTV diện rộng", "Xe téc Hino 15m3 cần phun 18m", "<b>6.0 ha / ca 6 giờ</b>", "6.0 giờ công / ca", "±5%", "01/01/2026", make_pill("Đang áp dụng", "")]
        ],
        "Tìm mã định mức, đối tượng áp dụng...",
        "Hiển thị bảng định mức kỹ thuật năng suất ca máy"
    )
)

# ==========================================
# MODULE I: QUẢN LÝ LÁI XE (MODULE MỚI)
# ==========================================
PAGES_DATA["pages/I-lai-xe/ho-so-lai-xe.html"] = (
    make_head("QUẢN LÝ LÁI XE", "Hồ sơ nhân sự Lái xe & Thợ máy", "Quản lý hồ sơ 96 lái xe và thợ vận hành máy cơ giới (Việt Nam & Campuchia): Họ tên, CCCD/Passport, hạng GPLX.", ["↗ Xuất danh sách nhân sự", "＋ Tiếp nhận lái xe"]) +
    make_filters(["Tất cả 96 nhân sự", "Quốc tịch: VN (54) & Campuchia (42)", "Trạng thái: Đang làm việc"]) +
    make_stats([("Tổng lái xe / thợ máy", "96 nhân sự", "VN 54 · Campuchia 42"), ("Đang trên ca lái", "68 tài xế", "Ca 1 & Ca ngày"), ("Đang nghỉ phép / off", "24 tài xế", "Đúng chế độ luân phiên"), ("GPLX sắp hết hạn (<30 ngày)", "4 hồ sơ", "Cần gia hạn gấp")]) +
    make_table(
        ["MÃ NV", "HỌ VÀ TÊN", "ĐỘI XE TRỰC THUỘC", "HẠNG GPLX / CHỨNG CHỈ", "XE ĐƯỢC PHÂN CÔNG", "SỐ ĐIỆN THOẠI", "TRẠNG THÁI"],
        [
            ["<b>NV-0824</b>", "Nguyễn Văn Minh<small>Tổ trưởng lái máy cày</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Hạng FC + Chứng chỉ Máy kéo<small>Hạn: 12/2028</small>", "<b>XC-JD-024</b><small>John Deere 140HP</small>", "0982.112.334", make_pill("Đang lái ca 1", "")],
            ["<b>NV-0831</b>", "Trần Quốc Huy<small>Tổ trưởng vận tải nặng</small>", "Đội Vận tải Nặng<small>KLH Koun Mom</small>", "Hạng C (Xe tải nặng)<small>Hạn: 08/2027</small>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "0973.224.556", make_pill("Đang trên đường", "")],
            ["<b>NV-0845</b>", "Lê Hoàng Nam<small>Lái máy cơ giới</small>", "Đội Cơ giới 1 (NT1)<small>XN Chuối 1</small>", "Chứng chỉ Vận hành xe Nông nghiệp<small>Vô thời hạn</small>", "<b>XC-KB-053</b><small>Kubota M7040</small>", "0964.882.119", make_pill("Đang làm việc", "")],
            ["<b>NV-KH-012</b>", "Sok Phearith<small>Lái xe tải nông sản</small>", "Đội Vận tải NT2<small>XN Chuối 2</small>", "GPLX Hạng C Campuchia<small>Hạn: 15/09/2026</small>", "<b>XT-HN-079</b><small>Hino 8 tấn</small>", "088.334.889", make_pill("GPLX sắp hết hạn", "pending")],
            ["<b>NV-KH-015</b>", "Keo Sarath<small>Lái máy ủi & máy xúc</small>", "Đội Thi công Thủy lợi<small>KLH Koun Mom</small>", "Chứng chỉ Máy thi công nền<small>Hạn: 2029</small>", "<b>MU-KM-015</b><small>Komatsu D31P</small>", "097.445.112", make_pill("Đang làm việc", "")]
        ],
        "Tìm mã nhân viên, họ tên, số điện thoại, xe...",
        "Hiển thị hồ sơ lái xe và thợ vận hành máy cơ giới"
    )
)

PAGES_DATA["pages/I-lai-xe/phan-cong-lai-xe.html"] = (
    make_head("QUẢN LÝ LÁI XE", "Phân công lái xe theo Ca làm việc", "Bố trí tài xế chính, tài xế phụ và phân ca làm việc (Ca 1: 06h-14h, Ca 2: 14h-22h) cho từng đầu xe.", ["↗ Xuất lịch phân công", "＋ Phân công ca mới"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả các ca", "Đã chốt danh sách"]) +
    make_stats([("Tài xế đã nhận ca", "68 người", "100% đúng giờ"), ("Tài xế dự bị sẵn sàng", "12 người", "Sẵn sàng thay thế"), ("Ca làm việc nhiều nhất", "Ca 1 (06h - 14h)", "48 tài xế"), ("Tỷ lệ có mặt", "100%", "0 vắng không phép")]) +
    make_table(
        ["PHƯƠNG TIỆN CƠ GIỚI", "CHỦNG LOẠI XE", "TÀI XẾ CHÍNH (CA 1)", "TÀI XẾ PHỤ (CA 2)", "KHU VỰC CÔNG TÁC", "NHIỆM VỤ GIAO", "TRẠNG THÁI"],
        [
            ["<b>XC-JD-024</b>", "John Deere 6140B", "<b>Nguyễn Văn Minh</b><small>0982.112.334</small>", "Keo Sarath (Phụ lái)", "Lô CN-A12<small>XN Chuối 1</small>", "Cày lật sâu 35cm đất trồng chuối", make_pill("Đang thực hiện", "")],
            ["<b>XT-HW-102</b>", "Howo 4 chân 15T", "<b>Trần Quốc Huy</b><small>0973.224.556</small>", "Võ Văn Thành (Ca chiều)", "Lô A12 ➔ Packhouse 2", "Chở chuối buồng tươi về nhà sơ chế", make_pill("Đang thực hiện", "")],
            ["<b>XC-KB-053</b>", "Kubota M7040", "<b>Lê Hoàng Nam</b><small>0964.882.119</small>", "Đỗ Thanh Hải (Phụ)", "Lô CN-B06<small>XN Chuối 1</small>", "Lên luống đôi và rạch hàng tra phân", make_pill("Đang thực hiện", "")],
            ["<b>XT-HN-079</b>", "Hino 500 8T", "<b>Sok Phearith</b><small>088.334.889</small>", "Nguyễn Thành Long (Ca 2)", "Kho T1 ➔ Lô B06", "Vận chuyển 8 tấn phân hữu cơ bón lót", make_pill("Đang thực hiện", "")]
        ],
        "Tìm phương tiện, tên tài xế...",
        "Hiển thị phân công tài xế theo từng phương tiện"
    )
)

PAGES_DATA["pages/I-lai-xe/quan-ly-gplx.html"] = (
    make_head("QUẢN LÝ LÁI XE", "Quản lý GPLX & Cảnh báo hết hạn", "Theo dõi thời hạn Giấy phép lái xe (B2, C, FC, Chứng chỉ máy kéo), tự động kiểm tra loại xe được phép điều khiển.", ["↗ Xuất danh sách quá hạn", "＋ Thêm chứng chỉ"]) +
    make_filters(["Tất cả hạng GPLX", "Cảnh báo hạn: Dưới 60 ngày", "Đang theo dõi"]) +
    make_stats([("GPLX hợp lệ", "92 hồ sơ", "95.8% đủ điều kiện"), ("Sắp hết hạn (<30 ngày)", "3 hồ sơ", "Cần gia hạn gấp"), ("Đang làm thủ tục đổi", "1 hồ sơ", "Sở GTVT / MPWT"), ("Quá hạn sử dụng", "0 hồ sơ", "Tuyệt đối an toàn")]) +
    make_table(
        ["MÃ NV / HỌ TÊN", "SỐ GPLX / CHỨNG CHỈ", "HẠNG GPLX", "NƠI CẤP", "NGÀY CẤP", "NGÀY HẾT HẠN", "LOẠI XE ĐƯỢC PHÉP LÁI", "TÌNH TRẠNG HIỆU LỰC"],
        [
            ["<b>NV-KH-012</b><small>Sok Phearith</small>", "<b>KH-C-9921082</b>", "Hạng C (Campuchia)", "MPWT Campuchia", "15/09/2021", "<b style='color:var(--amber)'>15/09/2026 (Còn 22 ngày)</b>", "Xe tải Hino 8T, Xe téc", make_pill("Sắp hết hạn", "pending")],
            ["<b>NV-0852</b><small>Nguyễn Văn Hải</small>", "<b>790182948192</b>", "Hạng C (Việt Nam)", "Sở GTVT Gia Lai", "28/09/2021", "<b style='color:var(--amber)'>28/09/2026 (Còn 35 ngày)</b>", "Xe tải Howo, Xe ben", make_pill("Sắp hết hạn", "pending")],
            ["<b>NV-0824</b><small>Nguyễn Văn Minh</small>", "<b>790124892104</b>", "Hạng FC + Máy kéo", "Sở GTVT TP.HCM", "10/12/2023", "<b style='color:var(--green2)'>10/12/2028</b>", "Máy kéo John Deere, Xe đầu kéo", make_pill("Còn hạn", "")],
            ["<b>NV-0831</b><small>Trần Quốc Huy</small>", "<b>770144928101</b>", "Hạng C (Xe tải)", "Sở GTVT Bình Định", "18/08/2022", "<b style='color:var(--green2)'>18/08/2027</b>", "Xe tải Howo 4 chân", make_pill("Còn hạn", "")]
        ],
        "Tìm họ tên lái xe, số GPLX, hạng bằng...",
        "Hiển thị hồ sơ quản lý bằng lái và chứng chỉ cơ giới"
    )
)

PAGES_DATA["pages/I-lai-xe/lich-su-vi-pham.html"] = (
    make_head("QUẢN LÝ LÁI XE", "Lịch sử lái xe & Nhật ký vi phạm", "Theo dõi tổng số lệnh đã thực hiện, số km chạy, số giờ lái và ghi nhận các biên bản vi phạm tốc độ / rời vùng.", ["↗ Xuất biên bản xử phạt", "🔍 Tra cứu tài xế"]) +
    make_filters(["Tháng 08/2026", "Tất cả mức độ vi phạm", "Trạng thái: Đang xử lý"]) +
    make_stats([("Tổng lệnh hoàn thành", "840 lệnh", "Toàn đội lái xe"), ("Tổng sự kiện vi phạm", "14 vụ", "-6 vụ so tháng trước"), ("Chạy quá tốc độ (>30km/h)", "8 vụ", "Tốc độ cao nhất 38.5 km/h"), ("Dừng nổ máy lâu hao dầu", "2 vụ", "Đã lập biên bản phạt")]) +
    make_table(
        ["MÃ BIÊN BẢN", "THỜI GIAN", "LÁI XE VI PHẠM", "PHƯƠNG TIỆN", "HÀNH VI VI PHẠM", "ĐỊA ĐIỂM", "HÌNH THỨC XỬ LÝ", "TRẠNG THÁI"],
        [
            ["<b>BB-VP-0823-01</b>", "23/08 · 08:35", "<b>Sok Phearith</b><small>NV-KH-012</small>", "<b>XT-HN-079</b><small>Hino 8T</small>", "Chạy quá tốc độ: <b>38.5 km/h</b> (Quy định 30)", "Trục chính NT2", "Nhắc nhở bộ đàm & trừ 2 điểm an toàn", make_pill("Đang xử lý", "pending")],
            ["<b>BB-VP-0822-04</b>", "22/08 · 14:45", "<b>Trần Quốc Huy</b><small>NV-0831</small>", "<b>XT-HW-102</b><small>Howo 4 chân</small>", "Dừng xe nổ máy bật lạnh 45 phút", "Bãi xe Packhouse 2", "Phạt trừ dầu khoán & nhắc nhở", make_pill("Đã xử lý", "")],
            ["<b>BB-VP-0821-02</b>", "21/08 · 11:30", "<b>Keo Sarath</b><small>NV-KH-015</small>", "<b>XB-HD-062</b><small>Ben Hyundai</small>", "Ra khỏi vùng Geofence 1.2km", "Đường tránh ngập", "Giải trình hợp lý do đường sình lầy", make_pill("Đã đóng", "")]
        ],
        "Tìm tên tài xế, mã biên bản, loại vi phạm...",
        "Hiển thị lịch sử vi phạm và chấp hành quy định"
    )
)

PAGES_DATA["pages/I-lai-xe/bang-xep-hang-kpi.html"] = (
    make_head("QUẢN LÝ LÁI XE", "Bảng xếp hạng thi đua Lái xe (KPI)", "Tự động xếp hạng Top lái xe xuất sắc theo điểm KPI tháng từ dữ liệu GPS: 25% Chuyến + 25% Km + 25% Giờ máy + 25% Nhiên liệu.", ["↗ Quyết định khen thưởng", "🏆 Trao thưởng tháng"]) +
    make_filters(["Tháng 08/2026", "Phạm vi: Toàn KLH Koun Mom", "Top 10 Dẫn đầu"]) +
    make_stats([("Top 1 Toàn đoàn", "Nguyễn Văn Minh", "96.5 Điểm · Đội 1"), ("Tiết kiệm dầu cao nhất", "+6.2%", "Tiết kiệm 82L dầu"), ("Tổng tiền thưởng thi đua", "32.400.000 đ", "Trao thưởng ngày 05"), ("Số giờ máy an toàn", "16.420 giờ", "0 tai nạn lao động")]) +
    make_analytics("Xu hướng cạnh tranh điểm thi đua Top 5 tài xế dẫn đầu", "M10 180 C150 120, 300 130, 450 70 S600 50, 690 25", "Top 10", [("Đội Cơ giới 1", "40%"), ("Đội Vận tải Nặng", "30%"), ("Đội Cơ giới 2", "20%"), ("Đội Thủy lợi", "10%")],
        make_table(
            ["THỨ HẠNG", "HỌ VÀ TÊN / MÃ NV", "ĐỘI XE TRỰC THUỘC", "XE ĐIỀU KHIỂN", "SẢN LƯỢNG HOÀN THÀNH", "TIẾT KIỆM NHIÊN LIỆU", "ĐIỂM KPI", "DANH HIỆU"],
            [
                ["<b style='font-size:14px;color:#d97706'>🥇 TOP 1</b>", "<b>Nguyễn Văn Minh</b><small>NV-0824</small>", "Đội Cơ giới 1 (NT1)", "XC-JD-024 (John Deere)", "48.5 ha cày ải (116% KH)", "<b style='color:var(--green2)'>+6.2% (Tiết kiệm 82L)</b>", "<b style='color:var(--green2);font-size:14px'>96.5</b>", "<span class='module-pill'>Bàn tay Vàng Cơ giới</span>"],
                ["<b style='font-size:14px;color:#64748b'>🥈 TOP 2</b>", "<b>Trần Quốc Huy</b><small>NV-0831</small>", "Đội Vận tải Nặng", "XT-HW-102 (Howo 4 chân)", "680 tấn chuối (110% KH)", "<b style='color:var(--green2)'>+4.8% (Tiết kiệm 110L)</b>", "<b style='color:var(--green2);font-size:14px'>94.8</b>", "<span class='module-pill'>Tài xế An toàn Xuất sắc</span>"],
                ["<b style='font-size:14px;color:#b45309'>🥉 TOP 3</b>", "<b>Lê Hoàng Nam</b><small>NV-0845</small>", "Đội Cơ giới 1 (NT1)", "XC-KB-053 (Kubota M7040)", "42.0 ha lên luống (107% KH)", "<b style='color:var(--green2)'>+3.5% (Tiết kiệm 45L)</b>", "<b style='color:var(--green2);font-size:14px'>91.2</b>", "<span class='module-pill'>Chiến sĩ Thi đua</span>"]
            ],
            "Tìm tài xế xếp hạng...",
            "Hiển thị bảng vinh danh Top lái xe xuất sắc"
        )
    )
)

# ==========================================
# MODULE J: QUẢN LÝ NHIÊN LIỆU (MODULE MỚI)
# ==========================================
PAGES_DATA["pages/J-nhien-lieu/phieu-cap-nhien-lieu.html"] = (
    make_head("QUẢN LÝ NHIÊN LIỆU", "Phiếu cấp phát nhiên liệu số hóa", "Ghi nhận phiếu cấp phát dầu Diesel DO 0.05S theo xe / lệnh / ngày tại cột bơm T1 và xe bồn cấp lưu động ngoài đồng.", ["↗ Xuất bảng kê cấp dầu", "＋ Lập phiếu cấp dầu"]) +
    make_filters(["Hôm nay, 23/08/2026", "Tất cả vòi bơm / Trạm cấp", "Đã chốt ca sáng"]) +
    make_stats([("Tổng dầu xuất cấp hôm nay", "3.850 Lít", "+320L so hôm qua"), ("Số lượt xe được đổ dầu", "28 lượt", "Trung bình 137.5 L/xe"), ("Cấp lưu động ngoài đồng", "1.650 Lít", "Xe téc XN-DF-011"), ("Trực cấp tại Kho Trung tâm", "2.200 Lít", "Cột bơm điện tử T1")]) +
    make_table(
        ["MÃ PHIẾU", "THỜI GIAN", "XE NHẬN DẦU", "LÁI XE / NGƯỜI NHẬN", "SỐ LÍT CẤP", "GIỜ MÁY / ODO", "ĐIỂM CẤP DẦU", "THỦ KHO XUẤT"],
        [
            ["<b>PCD-0823-01</b>", "06:15:30", "<b>XC-JD-024</b><small>John Deere 140HP</small>", "Nguyễn Văn Minh<small>Đội Cơ giới 1</small>", "<b style='color:var(--green2);font-size:12px'>160 Lít</b>", "2.450 giờ máy", "Cột bơm T1 (Kho trung tâm)", "Lê Thị Thu Hà"],
            ["<b>PCD-0823-02</b>", "06:30:15", "<b>XT-HW-102</b><small>Howo 4 chân 15T</small>", "Trần Quốc Huy<small>Đội Vận tải Nặng</small>", "<b style='color:var(--green2);font-size:12px'>220 Lít</b>", "148.200 km", "Cột bơm T1 (Kho trung tâm)", "Lê Thị Thu Hà"],
            ["<b>PCD-0823-03</b>", "08:10:00", "<b>XC-KB-053</b><small>Kubota M7040</small>", "Lê Hoàng Nam<small>Đội Cơ giới 1</small>", "<b style='color:var(--green2);font-size:12px'>65 Lít</b>", "3.120 giờ máy", "Xe bồn cấp lưu động tại Lô A12", "Huỳnh Tấn Đạt"],
            ["<b>PCD-0823-04</b>", "08:25:40", "<b>XB-HD-062</b><small>Ben Hyundai HD270</small>", "Keo Sarath<small>Đội Thủy lợi</small>", "<b style='color:var(--green2);font-size:12px'>140 Lít</b>", "210.500 km", "Xe bồn cấp lưu động tại NT2", "Huỳnh Tấn Đạt"]
        ],
        "Tìm mã phiếu, số xe, tên tài xế...",
        "Hiển thị phiếu cấp phát nhiên liệu"
    )
)

PAGES_DATA["pages/J-nhien-lieu/dinh-muc-nhien-lieu.html"] = (
    make_head("QUẢN LÝ NHIÊN LIỆU", "Định mức tiêu hao theo loại xe & tuyến đường", "Bảng quy định định mức tiêu chuẩn nhiên liệu khoán cho từng loại máy móc theo giờ nổ máy, diện tích canh tác và km đường.", ["↗ Xuất quyết định định mức", "＋ Điều chỉnh định mức"]) +
    make_filters(["Áp dụng: Năm 2026", "Tất cả 9 nhóm xe", "Đã duyệt bởi HĐ Kỹ thuật"]) +
    make_stats([("Định mức cày ải sâu", "18.5 Lít / ha", "Máy kéo John Deere 140HP"), ("Định mức bừa phẳng", "12.0 Lít / ha", "Máy kéo Kubota M7040"), ("Định mức xe tải Howo", "30.0 L / 100 km", "Tải trọng bình quân 14T"), ("Định mức xe téc phun", "5.5 Lít / Giờ máy", "Bơm áp lực cao")]) +
    make_table(
        ["MÃ ĐỊNH MỨC", "CHỦNG LOẠI PHƯƠNG TIỆN", "CÔNG VIỆC ÁP DỤNG", "ĐƠN VỊ TÍNH", "ĐỊNH MỨC TIÊU CHUẨN", "DUNG SAI CHO PHÉP", "GHI CHÚ ĐIỀU KIỆN", "TRẠNG THÁI"],
        [
            ["<b>ĐM-CAY-01</b>", "Máy kéo John Deere 6140B (140HP)", "Cày lật đất sâu 35cm (Dàn 4 chảo)", "Lít / Ha", "<b>18.5 Lít</b>", "±5%", "Đất thịt nhẹ, độ ẩm 18-22%", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-BUA-02</b>", "Máy kéo Kubota M7040 (70HP)", "Bừa phẳng & lên luống đôi", "Lít / Ha", "<b>12.0 Lít</b>", "±5%", "Đất đã cày ải, luống cao 40cm", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-HOWO-04</b>", "Xe tải Howo 4 chân 371HP", "Vận chuyển chuối về Packhouse", "Lít / 100 km", "<b>30.0 Lít</b>", "±4%", "Đường cấp phối nông trường", make_pill("Đang áp dụng", "")],
            ["<b>ĐM-TEC-05</b>", "Xe téc Hino 15m3", "Phun thuốc BVTV & tưới cây", "Lít / Giờ máy", "<b>5.5 Lít</b>", "±5%", "Vận hành bơm áp lực cao", make_pill("Đang áp dụng", "")]
        ],
        "Tìm mã định mức, loại xe...",
        "Hiển thị quy chuẩn định mức nhiên liệu"
    )
)

PAGES_DATA["pages/J-nhien-lieu/doi-chieu-tieu-hao.html"] = (
    make_head("QUẢN LÝ NHIÊN LIỆU", "Đối chiếu thực tế GPS vs Định mức khoán", "Tự động so sánh số km GPS/que đo siêu âm DUT-E với định mức khoán để tính thưởng tiết kiệm hoặc xử lý vượt dầu.", ["↗ Xuất bảng đối chiếu", "⚡ Chốt kỳ đối chiếu"]) +
    make_filters(["Kỳ đối chiếu: Tuần 34 (17/08 - 23/08)", "Toàn bộ xí nghiệp", "Đã khớp số"]) +
    make_stats([("Tổng dầu thực tế", "24.520 Lít", "Định mức khoán 25.800 Lít"), ("Tỷ lệ tiết kiệm toàn KLH", "+5.0%", "Tiết kiệm 1.280 Lít dầu"), ("Xe tiết kiệm (>3%)", "74 xe", "Thưởng thi đua 32 tài xế"), ("Xe vượt định mức (>3%)", "6 xe", "Đã yêu cầu giải trình")]) +
    make_analytics("Biểu đồ đối chiếu Dầu thực tế vs Định mức khoán (7 ngày qua)", "M10 170 C100 130, 220 145, 350 90 S520 80, 680 35", "24.520L", [("Tiết kiệm (Dưới ĐM)", "68%"), ("Đúng định mức (±2%)", "24%"), ("Vượt định mức", "8%")],
        make_table(
            ["MÃ XE / TÀI XẾ", "CHỦNG LOẠI", "CÔNG VIỆC THỰC HIỆN", "DIỆN TÍCH / KM", "ĐỊNH MỨC KHOÁN", "THỰC TẾ TIÊU HAO", "CHÊNH LỆCH", "ĐÁNH GIÁ"],
            [
                ["<b>XC-JD-024</b><small>Nguyễn Văn Minh</small>", "John Deere 140HP", "Cày ải Lô CN-A12", "<b>24.0 ha</b>", "444.0 Lít<small>18.5 L/ha</small>", "<b>416.5 Lít</b><small>17.35 L/ha</small>", "<b style='color:var(--green2)'>-27.5 L (-6.2%)</b>", "<span class='module-pill'>Thưởng tiết kiệm</span>"],
                ["<b>XT-HW-102</b><small>Trần Quốc Huy</small>", "Howo 4 chân", "Vận chuyển chuối PH2", "<b>620 km</b>", "186.0 Lít<small>30.0 L/100km</small>", "<b>177.0 Lít</b><small>28.5 L/100km</small>", "<b style='color:var(--green2)'>-9.0 L (-4.8%)</b>", "<span class='module-pill'>Thưởng tiết kiệm</span>"],
                ["<b>XC-KB-053</b><small>Lê Hoàng Nam</small>", "Kubota M7040", "Lên luống Lô B06", "<b>18.2 ha</b>", "218.4 Lít<small>12.0 L/ha</small>", "<b>210.8 Lít</b><small>11.58 L/ha</small>", "<b style='color:var(--green2)'>-7.6 L (-3.5%)</b>", "<span class='module-pill'>Thưởng tiết kiệm</span>"],
                ["<b>XT-HN-079</b><small>Sok Phearith</small>", "Hino 500 8T", "Chở phân bón NT2", "<b>450 km</b>", "99.0 Lít<small>22.0 L/100km</small>", "<b>108.5 Lít</b><small>24.1 L/100km</small>", "<b style='color:var(--red)'>+9.5 L (+9.6%)</b>", "<span class='module-pill danger'>Vượt ĐM (Chạy quá tốc)</span>"]
            ],
            "Tìm mã xe, tài xế, tình trạng tiêu hao...",
            "Hiển thị bảng đối chiếu nhiên liệu thực tế vs định mức khoán"
        )
    )
)

PAGES_DATA["pages/J-nhien-lieu/ton-kho-bon-chua.html"] = (
    make_head("QUẢN LÝ NHIÊN LIỆU", "Quản lý Tồn kho Bồn chứa xăng dầu", "Kiểm soát mức tồn kho dầu Diesel DO 0.05S, xăng và dầu thủy lực tại bồn ngầm trung tâm và trạm vệ tinh.", ["↗ Xuất biên bản kiểm kê", "＋ Nhập hàng về bồn"]) +
    make_filters(["Tất cả 6 bồn chứa", "Chủng loại: Dầu DO 0.05S", "Trạng thái: An toàn"]) +
    make_stats([("Tổng tồn kho Diesel", "84.500 Lít", "Đáp ứng 18 ngày vận hành"), ("Bồn Trung tâm T1 (50m3)", "41.200 Lít", "Tỷ lệ đầy 82.4%"), ("Bồn Nông trường 2 (20m3)", "16.800 Lít", "Tỷ lệ đầy 84.0%"), ("Tồn trên xe téc bồn", "4.500 Lít", "Sẵn sàng cấp ngoài đồng")]) +
    make_table(
        ["MÃ BỒN CHỨA", "TÊN BỒN / VỊ TRÍ", "CHỦNG LOẠI NHIÊN LIỆU", "DUNG TÍCH THIẾT KẾ", "TỒN KHO THỰC TẾ", "TỶ LỆ ĐẦY", "MỨC AN TOÀN", "TRẠNG THÁI"],
        [
            ["<b>BON-TT-01</b>", "Bồn Ngầm Trung Tâm 1<small>Kho Xăng dầu KLH</small>", "Diesel DO 0.05S (Chính)", "<b>50.000 Lít</b>", "<b style='color:var(--green2);font-size:12px'>41.200 Lít</b>", "82.4%", "10.000 Lít", make_pill("An toàn", "")],
            ["<b>BON-NT2-03</b>", "Bồn Nổi Nông Trường 2<small>Bãi Cơ giới XN Chuối 2</small>", "Diesel DO 0.05S (Cấp máy cày)", "<b>20.000 Lít</b>", "<b style='color:var(--green2);font-size:12px'>16.800 Lít</b>", "84.0%", "5.000 Lít", make_pill("An toàn", "")],
            ["<b>BON-XN-DF11</b>", "Xe téc bồn cấp lưu động<small>Dongfeng 5m3 (Biển: 51C-011.89)</small>", "Diesel DO 0.05S", "<b>5.000 Lít</b>", "<b style='color:var(--green2);font-size:12px'>4.500 Lít</b>", "90.0%", "1.000 Lít", make_pill("Đầy bồn", "")],
            ["<b>BON-XANG-05</b>", "Bồn Xăng Ron 95-V<small>Phục vụ xe bán tải & máy cắt cỏ</small>", "Xăng không chì Ron 95-V", "<b>10.000 Lít</b>", "<b style='color:var(--amber);font-size:12px'>2.800 Lít</b>", "28.0%", "3.000 Lít", make_pill("Sắp hết (Cần đặt)", "pending")]
        ],
        "Tìm mã bồn, vị trí...",
        "Hiển thị tình trạng tồn kho các bồn chứa"
    )
)

PAGES_DATA["pages/J-nhien-lieu/canh-bao-bat-thuong-dau.html"] = (
    make_head("QUẢN LÝ NHIÊN LIỆU", "Cảnh báo Tiêu hao Bất thường & Rút dầu", "Phát hiện ngay khi mức dầu sụt giảm đột ngột (>5 Lít/phút) nghi ngờ rút ruột trộm cắp hoặc bục rò rỉ ống dẫn.", ["↗ Xuất biên bản sự cố", "✓ Xác nhận kiểm tra"]) +
    make_filters(["Tháng 08/2026", "Ngưỡng sụt: > 5 Lít/phút", "Đang xử lý"]) +
    make_stats([("Sự kiện sụt dầu bất thường", "4 vụ", "2 vụ rút dầu · 2 vụ rò rỉ"), ("Giá trị nhiên liệu bảo vệ", "18.500.000 đ", "Ngăn chặn thất thoát"), ("Thời gian phát hiện", "< 15 giây", "Nhờ cảm biến que đo DUT-E"), ("Biện pháp xử lý", "Lập biên bản xử phạt", "Chuyển Hội đồng kỷ luật")]) +
    make_table(
        ["MÃ SỰ KIỆN", "THỜI GIAN", "XE PHÁT HIỆN", "LÁI XE ĐIỀU KHIỂN", "MỨC DẦU SỤT GIẢM", "VỊ TRÍ PHÁT SINH", "KẾT LUẬN XÁC MINH", "TRẠNG THÁI"],
        [
            ["<b>SOS-DAU-01</b>", "23/08 · 08:40", "<b>XC-JD-024</b>", "Nguyễn Văn Minh", "<b style='color:var(--red)'>Sụt 15 Lít / 3 phút</b>", "Lô CN-A12 (Gần bờ kênh)", "Ống hồi dầu bị tuột cút nối chảy ra ruộng", make_pill("Đã khắc phục", "")],
            ["<b>SOS-DAU-02</b>", "22/08 · 21:15", "<b>XT-HN-079</b>", "Sok Phearith", "<b style='color:var(--red)'>Sụt 25 Lít / 5 phút</b>", "Bãi đỗ xe đêm NT2", "Phát hiện rút trộm dầu vào can 30L", make_pill("Xử phạt kỷ luật", "danger")],
            ["<b>SOS-DAU-03</b>", "19/08 · 14:20", "<b>XB-HD-062</b>", "Keo Sarath", "<b style='color:var(--amber)'>Sụt 8 Lít / 2 phút</b>", "Trạm Cân số 1", "Rung lắc xe khi lên bàn cân dốc (Báo ảo)", make_pill("Báo ảo (Đã hủy)", "")]
        ],
        "Tìm mã sự kiện, biển số xe...",
        "Hiển thị cảnh báo sụt giảm nhiên liệu bất thường"
    )
)

# ==========================================
# MODULE K: CẢNH BÁO & THÔNG BÁO (KHÔNG CÓ SMS/ZALO/EMAIL)
# ==========================================
PAGES_DATA["pages/K-canh-bao/canh-bao-chua-xu-ly.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Bảng cảnh báo chưa xử lý (SOS Web)", "Hiển thị trực tiếp trên giao diện Web theo 3 mức độ ưu tiên: Khẩn cấp (Đỏ) - Cảnh báo (Vàng) - Nhắc nhở (Xanh).", ["↗ Xuất danh sách", "✓ Xác nhận tất cả"]) +
    make_filters(["Hôm nay, 23/08/2026", "Hiển thị trực tiếp trên Web", "Trạng thái: Đang chờ (18 sự kiện)"]) +
    make_stats([("Cảnh báo Khẩn cấp (Đỏ)", "6 sự kiện", "Sụt dầu, Quá tốc độ cao"), ("Cảnh báo Quan trọng (Vàng)", "8 sự kiện", "Gần hạn BTSC, Geofence"), ("Nhắc nhở Vận hành (Xanh)", "4 sự kiện", "Nổ máy tại chỗ lâu"), ("Thời gian phản hồi TB", "8.5 phút", "Quy định phản hồi <15p")]) +
    make_table(
        ["MỨC ĐỘ", "THỜI GIAN", "PHƯƠNG TIỆN & LÁI XE", "LOẠI CẢNH BÁO", "CHI TIẾT THÔNG SỐ", "VỊ TRÍ PHÁT SINH", "HÀNH ĐỘNG TRỰC TIẾP TRÊN WEB"],
        [
            ["<span class='module-pill danger'>KHẨN CẤP (ĐỎ)</span>", "08:40:12<small>2p trước</small>", "<b>XC-JD-024</b><small>Nguyễn Văn Minh</small>", "<b>Sụt giảm nhiên liệu bất thường</b>", "Mức dầu giảm đột ngột <b>15 Lít / 3 phút</b>", "Lô CN-A12", "<button class='btn btn-primary' style='padding:4px 8px;font-size:9px'>Xác nhận & Kiểm tra</button>"],
            ["<span class='module-pill danger'>KHẨN CẤP (ĐỎ)</span>", "08:35:00<small>7p trước</small>", "<b>XT-HN-079</b><small>Sok Phearith</small>", "<b>Chạy quá tốc độ nông trường</b>", "Vận tốc đạt <b>38.5 km/h</b> (Quy định 30)", "Trục chính NT2", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Ghi nhận vi phạm</button>"],
            ["<span class='module-pill pending'>CẢNH BÁO (VÀNG)</span>", "08:24:18<small>18p trước</small>", "<b>MU-KM-015</b><small>Keo Sarath</small>", "<b>Mất kết nối GPS > 2 giờ</b>", "Mất tín hiệu GSM từ 06:15 sáng", "Lô khai hoang MR-01", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Cử thợ kiểm tra</button>"],
            ["<span class='module-pill'>NHẮC NHỞ (XANH)</span>", "07:55:00<small>47p trước</small>", "<b>XC-KB-053</b><small>Lê Hoàng Nam</small>", "<b>Dừng nổ máy tại chỗ lâu</b>", "Nổ máy <b>42 phút</b> không di chuyển", "Bãi tập kết Lô B06", "<button class='btn btn-light' style='padding:4px 8px;font-size:9px'>Đóng nhắc nhở</button>"]
        ],
        "Tìm mã xe, loại cảnh báo, mức độ...",
        "Hiển thị 18 cảnh báo trực tiếp trên hệ thống Web"
    )
)

PAGES_DATA["pages/K-canh-bao/lich-su-canh-bao.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Nhật ký cảnh báo & Xử lý sự cố", "Lưu trữ toàn bộ các cảnh báo đã xử lý, đã giải trình hoặc bỏ qua; ghi rõ nguyên nhân và người phê duyệt đóng sự cố.", ["↗ Xuất file Audit", "🔍 Tìm theo ngày"]) +
    make_filters(["Tháng 08/2026", "Tất cả đơn vị", "Đã xử lý 100%"]) +
    make_stats([("Tổng sự kiện cảnh báo", "186 sự kiện", "-24% so tháng trước"), ("Đã xử lý & đóng", "182 sự kiện", "Tỷ lệ xử lý 97.8%"), ("Cảnh báo giả / Báo ảo", "4 sự kiện", "Do rung lắc cảm biến"), ("Thời gian xử lý TB", "6.2 phút", "Nhanh hơn mục tiêu 10p")]) +
    make_timeline([
        ("Xác minh xử lý sụt 15 lít dầu xe XC-JD-024", "Điều độ viên liên hệ tài xế kiểm tra: phát hiện lỏng giắc cắm ống hồi dầu, đã siết chặt lại. Không có hiện tượng trộm cắp.", "23/08/2026 · 08:45:00 · Người duyệt đóng: Chau Tiểu Long (Điều độ)", "Xem chi tiết"),
        ("Xử lý xe tải XT-HN-079 chạy tốc độ 38.5 km/h", "Điều độ viên nhắc nhở tài xế Sok Phearith qua bộ đàm nội bộ, lập biên bản trừ 2 điểm thi đua an toàn tháng.", "23/08/2026 · 08:38:00 · Người duyệt: Nguyễn Văn Hải (Quản đốc NT1)", "Xem biên bản"),
        ("Giải trình xe ben XB-HD-062 ra khỏi Geofence", "Tài xế Keo Sarath giải trình đi vòng đường tránh do tuyến chính đang bị sạt lở bờ mương. Quản đốc xác nhận hợp lệ.", "22/08/2026 · 15:40:00 · Người duyệt: Lê Minh Tuấn (Quản đốc NT2)", "Xem biên bản")
    ])
)

PAGES_DATA["pages/K-canh-bao/cau-hinh-nguong-canh-bao.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Cấu hình Ngưỡng cảnh báo Hệ thống", "Thiết lập các thông số kích hoạt cảnh báo trực tiếp trên giao diện Web: tốc độ, geofence, sụt nhiên liệu, nhiệt độ máy.", ["Khôi phục mặc định", "💾 Lưu cấu hình"]) +
    make_filters(["Phạm vi: Toàn KLH Koun Mom", "Quy tắc: Nội bộ hệ thống Web", "Áp dụng ngay"]) +
    make_stats([("Quy tắc đang kích hoạt", "10 quy tắc", "Giám sát 100% tự động"), ("Thời gian quét sự kiện", "Mỗi 10 giây", "Xử lý thời gian thực"), ("Hiển thị cảnh báo", "Popup & Chuông Web", "Âm thanh báo động SOS"), ("Phân quyền nhận cảnh báo", "Theo vai trò", "Quản đốc, Điều phối, Xưởng")]) +
    make_settings("Cấu hình thông số kích hoạt cảnh báo trên giao diện Web", "Các ngưỡng áp dụng cho toàn bộ thiết bị GPS và cảm biến gắn trên dàn xe cơ giới.", [
        {"label": "Ngưỡng cảnh báo quá tốc độ đường nội bộ nông trường (km/h)", "val": "30", "hint": "Hệ thống sẽ hiển thị cảnh báo đỏ trên Web nếu xe chạy quá 30 km/h liên tục 15 giây."},
        {"label": "Ngưỡng cảnh báo quá tốc độ khu vực dân cư & Packhouse (km/h)", "val": "15", "hint": "Khu vực tập trung đông công nhân sơ chế và trạm cân."},
        {"label": "Ngưỡng sụt giảm nhiên liệu bất thường (Lít / phút)", "val": "5.0", "hint": "Nếu mức dầu giảm đột ngột > 5L trong 1 phút khi xe đang dừng máy, kích hoạt chuông SOS báo động trộm dầu."},
        {"label": "Thời gian tối đa dừng xe nổ máy tại chỗ (Phút)", "val": "20", "hint": "Cảnh báo tài xế bật máy lạnh hoặc nổ máy chờ quá lâu gây lãng phí nhiên liệu."},
        {"label": "Ngưỡng nhiệt độ nước làm mát báo động (°C)", "val": "98", "hint": "Cảnh báo tài xế dừng máy ngay để tránh bó kẹt động cơ."},
        {"label": "Âm thanh báo động trên Web khi có sự cố khẩn cấp", "val": "Bật chuông báo động (Còi SOS âm lượng cao)", "hint": "Phát âm thanh cảnh báo trên màn hình máy tính trực ban điều độ."}
    ], ["Quy tắc Tốc độ & Vùng", "Quy tắc Nhiên liệu", "Quy tắc Động cơ & Kỹ thuật", "Cấu hình Âm thanh & Popup Web"])
)

PAGES_DATA["pages/K-canh-bao/thong-ke-canh-bao.html"] = (
    make_head("CẢNH BÁO & THÔNG BÁO", "Báo cáo Thống kê tần suất Vi phạm & Sự cố", "Thống kê số lượng vi phạm tốc độ, sụt nhiên liệu, mất tín hiệu GPS và phân bổ theo từng xí nghiệp / nông trường.", ["↗ Xuất báo cáo Excel", "📊 Phân tích xu hướng"]) +
    make_filters(["Tháng 08/2026", "Tất cả 11 module", "Toàn bộ KLH"]) +
    make_stats([("Tổng sự kiện cảnh báo", "186 sự kiện", "-24% so tháng 7"), ("Vi phạm tốc độ", "84 sự kiện", "Tập trung trục chính NT2"), ("Bất thường nhiên liệu", "22 sự kiện", "Xử lý 100%"), ("Tỷ lệ xử lý đúng hạn", "98.4%", "Thời gian phản hồi < 10p")]) +
    make_analytics("Phân bố số lượng cảnh báo phát sinh theo phân loại sự cố", "M10 180 C130 150, 260 160, 390 90 S520 70, 680 20", "186 vụ", [("Quá tốc độ quy định", "45.2%"), ("Ra khỏi Geofence", "25.8%"), ("Bất thường nhiên liệu", "11.8%"), ("Kỹ thuật máy & GPS", "17.2%")],
        make_table(
            ["NHÓM CẢNH BÁO", "SỐ VỤ PHÁT SINH", "ĐÃ XỬ LÝ ĐÓNG", "LỖI DO TÀI XẾ", "LỖI DO THIẾT BỊ / SÓNG", "SỰ CỐ KỸ THUẬT", "HÀNH ĐỘNG XỬ LÝ CHÍNH"],
            [
                ["<b>Chạy quá tốc độ quy định (>30km/h)</b>", "<b>84 vụ</b>", "84 vụ (100%)", "84 vụ", "0 vụ", "0 vụ", "Nhắc nhở bộ đàm, trừ điểm thi đua KPI"],
                ["<b>Rời khỏi vùng quy định (Geofence)</b>", "<b>48 vụ</b>", "48 vụ (100%)", "32 vụ", "16 vụ (Lệch sóng)", "0 vụ", "Xác minh giải trình tránh đường ngập"],
                ["<b>Cảnh báo sụt giảm nhiên liệu bất thường</b>", "<b>22 vụ</b>", "22 vụ (100%)", "2 vụ (Rút dầu)", "18 vụ (Rung lắc cảm biến)", "2 vụ (Bục ống dầu)", "Lập biên bản xử phạt 2 vụ vi phạm"],
                ["<b>Cảnh báo kỹ thuật động cơ (Nhiệt/Nhớt)</b>", "<b>18 vụ</b>", "18 vụ (100%)", "4 vụ (Thiếu nước)", "6 vụ (Báo ảo)", "8 vụ (Hỏng quạt/bơm)", "Điều thợ kỹ thuật sửa chữa lưu động"],
                ["<b>Mất tín hiệu kết nối GPS > 2 giờ</b>", "<b>14 vụ</b>", "14 vụ (100%)", "0 vụ", "14 vụ (Vùng lõm sóng 4G)", "0 vụ", "Đề xuất Metfone bổ sung trạm BTS"]
            ],
            "Tìm nhóm cảnh báo...",
            "Tổng hợp 5 nhóm cảnh báo an toàn trên toàn hệ thống"
        )
    )
)

print("Generated Module H, I, J, K data.")
