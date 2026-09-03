# -*- coding: utf-8 -*-
"""
THACO AGRI - KLH Koun Mom
Complete Mock Data Builder & Injector for all 71 Mockup Pages and app.js
"""

import os
import re
import glob

# Master database of mock data tailored specifically to THACO AGRI - KLH Koun Mom
PAGES_DATA = {
    # =========================================================================
    # 1. TỔNG QUAN
    # =========================================================================
    "1-tong-quan/dashboard-van-hanh": {
        "parent": "Tổng quan",
        "title": "Dashboard vận hành",
        "eyebrow": "TRUNG TÂM ĐIỀU HÀNH",
        "header_title": "Chào buổi sáng, anh Long!",
        "header_desc": "Theo dõi toàn cảnh hoạt động đội xe cơ giới tại Khu liên hợp Koun Mom (Campuchia).",
        "stats": [
            ("▰", "green", "Tổng phương tiện", "128 xe", "+4 xe mới"),
            ("↗", "blue", "Đang hoạt động", "86 xe", "67,2% công suất"),
            ("Ⅱ", "amber", "Đang dừng / Chờ việc", "21 xe", "16,4%"),
            ("⚒", "red", "Đang bảo dưỡng / Sửa chữa", "15 xe", "11,7%"),
            ("!", "gray", "Mất kết nối GPS", "6 xe", "4,7% kiểm tra")
        ],
        "type": "dashboard"
    },

    # =========================================================================
    # 2. GIÁM SÁT & ĐIỀU HÀNH
    # =========================================================================
    "2-giam-sat-dieu-hanh/giam-sat-truc-tuyen": {
        "parent": "Giám sát & Điều hành",
        "title": "Giám sát trực tuyến",
        "eyebrow": "GIÁM SÁT & ĐIỀU HÀNH",
        "header_title": "Giám sát trực tuyến",
        "header_desc": "Theo dõi vị trí, tốc độ và trạng thái 128 phương tiện cơ giới theo thời gian thực (chu kỳ 30s).",
        "stats": [
            ("Tổng xe GPS", "128", "100% gắn thiết bị"),
            ("Đang di chuyển / Làm việc", "86", "67.2% hoạt động"),
            ("Dừng nổ máy / Đỗ", "21", "16.4%"),
            ("Mất tín hiệu / Offline", "6", "Cần kiểm tra thiết bị")
        ],
        "type": "map",
        "vehicles": [
            {"code": "MK-JD-024", "model": "Máy kéo John Deere 5075E", "status": "Đang cày ngầm · 16 km/h", "loc": "Lô A12 - Nông trường 1", "driver": "Nguyễn Văn Minh", "tag": "green", "pos": (22, 35)},
            {"code": "XT-HN-102", "model": "Xe tải Hino 500 FG", "status": "Vận chuyển bã chuối · 36 km/h", "loc": "Tuyến TĐ-02 → Trại Bò 1", "driver": "Trần Quốc Huy", "tag": "green", "pos": (54, 48)},
            {"code": "XB-HW-079", "model": "Xe ben Howo 371", "status": "Cảnh báo vượt tốc 44 km/h", "loc": "Tuyến vành đai Nông trường 2", "driver": "Lê Hoàng Nam", "tag": "red", "pos": (72, 28)},
            {"code": "MK-KB-053", "model": "Máy kéo Kubota M7040", "status": "Dừng nổ máy không tải 22p", "loc": "Lô B05 - Nông trường 2", "driver": "Phạm Quốc An", "tag": "amber", "pos": (38, 62)},
            {"code": "MG-KB-012", "model": "Máy gặt cỏ Kubota DC-70", "status": "Thu hoạch cỏ Mulato · 8 km/h", "loc": "Cánh đồng cỏ Lô C04", "driver": "Võ Văn Thành", "tag": "green", "pos": (65, 75)},
            {"code": "MTH-CL-005", "model": "Máy thu hoạch ngô Claas 850", "status": "Mất tín hiệu GPS 18p", "loc": "Khu vực đồi NT3", "driver": "Đặng Văn Hùng", "tag": "gray", "pos": (85, 40)}
        ]
    },

    "2-giam-sat-dieu-hanh/playback-hanh-trinh": {
        "parent": "Giám sát & Điều hành",
        "title": "Playback hành trình",
        "eyebrow": "GIÁM SÁT & ĐIỀU HÀNH",
        "header_title": "Playback hành trình",
        "header_desc": "Mô phỏng lại toàn bộ lộ trình di chuyển, tốc độ và các điểm dừng đỗ của phương tiện trong ngày.",
        "stats": [
            ("Xe tra cứu", "XT-HN-102", "Xe tải Hino 500"),
            ("Tổng quãng đường", "64,8 km", "Trong ca làm việc"),
            ("Thời gian nổ máy", "6 giờ 45 phút", "Vận hành thực tế"),
            ("Số điểm dừng", "5 điểm", "Tổng dừng 1h 12p")
        ],
        "type": "map",
        "vehicles": [
            {"code": "XT-HN-102 (Điểm 1)", "model": "06:15 Xuất bến", "status": "Gara Ban Xe máy Koun Mom", "loc": "Km 0 - Vận tốc 0 km/h", "driver": "Trần Quốc Huy", "tag": "blue", "pos": (15, 30)},
            {"code": "XT-HN-102 (Điểm 2)", "model": "07:00 Nhận bã chuối", "status": "Xưởng Đóng Gói NT1 - Lô A08", "loc": "Dừng bốc hàng 32 phút", "driver": "Trần Quốc Huy", "tag": "amber", "pos": (35, 45)},
            {"code": "XT-HN-102 (Điểm 3)", "model": "08:15 Trạm cân KM0", "status": "Cân tổng tải 16.450 kg", "loc": "Dừng kiểm tra 6 phút", "driver": "Trần Quốc Huy", "tag": "blue", "pos": (50, 52)},
            {"code": "XT-HN-102 (Điểm 4)", "model": "09:30 Xí nghiệp Bò 1", "status": "Giao bã chuối tại Silo B1", "loc": "Dừng xả hàng 28 phút", "driver": "Trần Quốc Huy", "tag": "green", "pos": (75, 68)},
            {"code": "XT-HN-102 (Điểm 5)", "model": "11:20 Về Nhà máy TĂCN", "status": "Nhận cám hỗn hợp TMR", "loc": "Đang vận hành bình thường", "driver": "Trần Quốc Huy", "tag": "green", "pos": (88, 35)}
        ]
    },

    "2-giam-sat-dieu-hanh/geo-fence": {
        "parent": "Giám sát & Điều hành",
        "title": "Vùng giám sát",
        "eyebrow": "GIÁM SÁT & ĐIỀU HÀNH",
        "header_title": "Vùng giám sát (Geo-fence)",
        "header_desc": "Quản lý ranh giới địa lý các Nông trường, Xí nghiệp chăn nuôi, Khu chế biến và cảnh báo ra/vào vùng.",
        "stats": [
            ("Tổng vùng số hóa", "24 vùng", "Diện tích 4.200 ha"),
            ("Phương tiện trong vùng", "122 xe", "Hợp lệ 95.3%"),
            ("Xe ra ngoài vùng", "2 xe", "Cảnh báo tức thời"),
            ("Lượt vi phạm hôm nay", "3 lượt", "Đã gửi thông báo")
        ],
        "type": "map",
        "vehicles": [
            {"code": "VÙNG-NT1", "model": "Nông trường Chuối 1", "status": "1.200 ha · 28 xe đang hoạt động", "loc": "Lô A01 đến A24", "driver": "Quản đốc: Nguyễn Hữu Thành", "tag": "green", "pos": (25, 30)},
            {"code": "VÙNG-NT2", "model": "Nông trường Chuối 2", "status": "1.500 ha · 32 xe đang hoạt động", "loc": "Lô B01 đến B30", "driver": "Quản đốc: Trần Văn Nam", "tag": "green", "pos": (50, 40)},
            {"code": "VÙNG-CO-NT3", "model": "Cánh đồng cỏ Chăn nuôi", "status": "800 ha · 14 máy gặt/kéo", "loc": "Lô C01 đến C20", "driver": "Đội trưởng: Lê Văn Hùng", "tag": "green", "pos": (70, 65)},
            {"code": "VÙNG-XN-BO1", "model": "Xí nghiệp Chăn nuôi Bò 1", "status": "350 ha · 12 xe trung chuyển", "loc": "Khu chuồng trại & Silo A/B", "driver": "GĐ: Phạm Văn Đức", "tag": "blue", "pos": (80, 25)},
            {"code": "VÙNG-KHO-BTSC", "model": "Trung tâm BTSC & Kho Dầu", "status": "15 ha · 15 xe bảo dưỡng/bơm dầu", "loc": "Km 0 Trung tâm Điều hành", "driver": "Trưởng TT: Lê Văn Nam", "tag": "amber", "pos": (35, 75)}
        ]
    },

    "2-giam-sat-dieu-hanh/lenh-dieu-xe": {
        "parent": "Giám sát & Điều hành",
        "title": "Lệnh điều xe",
        "eyebrow": "GIÁM SÁT & ĐIỀU HÀNH",
        "header_title": "Lệnh điều xe",
        "header_desc": "Số hóa quy trình tạo, duyệt và điều phối phương tiện cơ giới phục vụ sản xuất và vận chuyển.",
        "stats": [
            ("Tổng lệnh hôm nay", "42 lệnh", "+8 lệnh so hôm qua"),
            ("Đang thực hiện", "18 lệnh", "Đúng tiến độ"),
            ("Chờ phê duyệt", "6 lệnh", "Ưu tiên ca chiều"),
            ("Hoàn thành nghiệm thu", "18 lệnh", "Đạt 100% khối lượng")
        ],
        "type": "kanban",
        "columns": [
            ("Mới tiếp nhận", "6", [
                ("LĐX-2608-038", "Điều máy kéo cày lót Lô A18", "MK-JD-024 · Nguyễn Văn Minh", "15%", "07:30 · NT1 Chuối"),
                ("LĐX-2608-039", "Điều xe bồn tưới dặm Lô B04", "XBN-014 · Huỳnh Minh Trí", "10%", "07:45 · NT2 Chuối"),
                ("LĐX-2608-040", "Điều máy xúc đào khơi rãnh", "MĐ-CAT-008 · Bùi Đức Thắng", "0%", "08:00 · Kênh T1")
            ]),
            ("Đã duyệt & Giao việc", "8", [
                ("LĐX-2608-031", "Chở 20 tấn bã chuối về Trại Bò 1", "XT-HN-102 · Trần Quốc Huy", "35%", "06:30 · Tuyến TĐ-02"),
                ("LĐX-2608-032", "Cày ngầm sâu 60cm Lô A12 (15 ha)", "MK-JD-042 · Lê Hoàng Nam", "40%", "06:00 · Đội Cơ giới 1"),
                ("LĐX-2608-033", "Cắt cỏ Mulato Lô C04 chuyển Silo", "MG-KB-012 · Võ Văn Thành", "30%", "06:15 · Đội Cỏ")
            ]),
            ("Đang thực hiện", "10", [
                ("LĐX-2608-024", "Vận chuyển phân chuồng hoai mục", "XB-AU-065 · Phạm Quốc An", "75%", "08:15 · Trại Bò 1 → Lô B08"),
                ("LĐX-2608-025", "Lên luống trồng chuối giống mới", "MK-NH-018 · Đặng Văn Hùng", "80%", "07:00 · Lô A15 NT1"),
                ("LĐX-2608-026", "Phun thuốc BVTV tự hành Lô B02", "MK-KB-053 · Vũ Đình Trọng", "65%", "06:45 · NT2 Chuối")
            ]),
            ("Chờ nghiệm thu / Xong", "18", [
                ("LĐX-2608-015", "Cày phá lâm Lô A10 (22 ha)", "MK-JD-024 · Nguyễn Văn Minh", "100%", "Đã hoàn thành 22.1 ha"),
                ("LĐX-2608-016", "Chở 4 chuyến thức ăn TMR chuồng C", "XT-IS-088 · Hoàng Hải Đăng", "100%", "Đã ký biên bản giao"),
                ("LĐX-2608-017", "San gạt mặt bằng kho lạnh KM0", "XX-LG-019 · Ngô Văn Tài", "100%", "Nghiệm thu đạt yêu cầu")
            ])
        ]
    },

    "2-giam-sat-dieu-hanh/lenh-van-chuyen": {
        "parent": "Giám sát & Điều hành",
        "title": "Lệnh vận chuyển",
        "eyebrow": "GIÁM SÁT & ĐIỀU HÀNH",
        "header_title": "Lệnh vận chuyển & Giám sát lộ trình",
        "header_desc": "Điều phối xe tải, xe ben chở nông sản, thức ăn gia súc, phân bón và giám sát tốc độ di chuyển.",
        "stats": [
            ("Tổng khối lượng hôm nay", "340 tấn", "+12% so kế hoạch"),
            ("Chuyến đang chạy", "14 chuyến", "Tốc độ TB: 28 km/h"),
            ("Chuyến đúng giờ", "98,2%", "Vận hành an toàn"),
            ("Cảnh báo lệch tuyến", "1 trường hợp", "Đã nhắc nhở tài xế")
        ],
        "type": "kanban",
        "columns": [
            ("Chờ điều xe", "4", [
                ("LVC-2608-051", "Chở 15 tấn chuối loại 1 về Kho Lạnh", "XT-HN-102 · Chờ tài xế nhận", "0%", "Xuất phát: 13:30"),
                ("LVC-2608-052", "Vận chuyển 24 tấn ngô ủ chua", "XB-HW-079 · Đã phân bổ xe", "0%", "Xuất phát: 14:00"),
                ("LVC-2608-053", "Chở 10 téc nước sinh hoạt cụm NT3", "XBN-014 · Chờ bốc nước", "0%", "Xuất phát: 14:15")
            ]),
            ("Đang bốc hàng", "5", [
                ("LVC-2608-045", "Bốc bã thân chuối tại Xưởng Đóng Gói 1", "XT-IS-088 · Hoàng Hải Đăng", "25%", "Đã bốc 8/12 tấn"),
                ("LVC-2608-046", "Xúc phân hữu cơ tại Trại Bò 2", "XB-AU-065 · Phạm Quốc An", "30%", "Đã xúc 14/18 tấn"),
                ("LVC-2608-047", "Bốc cỏ tươi vừa cắt tại Lô C04", "XT-HN-105 · Đỗ Văn Cường", "40%", "Đã bốc 9/10 tấn")
            ]),
            ("Đang trên đường", "8", [
                ("LVC-2608-038", "Chở TMR về Trại Bò Thịt Khu B", "XT-HN-102 · Trần Quốc Huy", "68%", "Tốc độ 32 km/h · Tuyến TĐ-02"),
                ("LVC-2608-039", "Chuyển phân chuồng ra Lô A16 NT1", "XB-HW-079 · Lê Hoàng Nam", "75%", "Tốc độ 29 km/h · Tuyến TĐ-01"),
                ("LVC-2608-040", "Chở chuối xuất khẩu ra Cửa khẩu", "XT-IS-088 · Nguyễn Tiến Dũng", "85%", "Tốc độ 42 km/h · Quốc lộ")
            ]),
            ("Đã giao & Nghiệm thu", "16", [
                ("LVC-2608-028", "Giao 32 tấn thức ăn Silo Trại Bò 1", "XT-HN-102 · Trần Quốc Huy", "100%", "Trọng lượng trạm cân: 32.150 kg"),
                ("LVC-2608-029", "Giao 40 tấn phân lót Lô B08", "XB-AU-065 · Phạm Quốc An", "100%", "Nghiệm thu đủ 4 chuyến"),
                ("LVC-2608-030", "Giao 18 tấn bao bì thùng carton", "XT-TH-012 · Vũ Văn Cảnh", "100%", "Đã ký nhận đủ số lượng")
            ])
        ]
    },

    "2-giam-sat-dieu-hanh/lich-dieu-xe": {
        "parent": "Giám sát & Điều hành",
        "title": "Lịch điều xe",
        "eyebrow": "GIÁM SÁT & ĐIỀU HÀNH",
        "header_title": "Lịch điều xe theo tuần",
        "header_desc": "Kế hoạch phân bổ ca làm việc, phương tiện và tài xế từ Thứ 2 đến Chủ nhật.",
        "stats": [
            ("Tổng ca xe trong tuần", "186 ca", "Tỷ lệ lấp đầy 94%"),
            ("Ca ban ngày (06:00-17:30)", "162 ca", "Chiếm 87%"),
            ("Ca trực đêm / Khẩn cấp", "24 ca", "Chiếm 13%"),
            ("Tài xế phân ca", "48 tài xế", "Đủ định mức giờ công")
        ],
        "type": "calendar",
        "days": [
            ("Thứ hai 17/08", [("Cày ngầm Lô A12 (20 ha)", "MK-JD-024 · Nguyễn Văn Minh", "06:00 – 11:30"), ("Chở bã chuối → Trại Bò", "XT-HN-102 · Trần Quốc Huy", "13:00 – 17:30")]),
            ("Thứ ba 18/08", [("Lên luống trồng mới Lô A14", "MK-NH-018 · Đặng Văn Hùng", "06:00 – 11:30"), ("Thu hoạch cỏ Mulato Lô C02", "MG-KB-012 · Võ Văn Thành", "13:00 – 17:30")]),
            ("Thứ tư 19/08", [("Phun thuốc BVTV Lô B05", "MK-KB-053 · Vũ Đình Trọng", "05:30 – 10:00"), ("Chở phân hữu cơ ra Lô B08", "XB-AU-065 · Phạm Quốc An", "13:00 – 17:30")]),
            ("Thứ năm 20/08", [("Cày phá lâm Lô A18", "MK-JD-042 · Lê Hoàng Nam", "06:00 – 11:30"), ("Chở thức ăn TMR Silo B", "XT-IS-088 · Hoàng Hải Đăng", "13:00 – 17:30")]),
            ("Thứ sáu 21/08", [("Thu hoạch chuối buồng NT1", "XT-HN-102 · Trần Quốc Huy", "06:00 – 11:30"), ("Cắt ngô sinh khối Lô C09", "MTH-CL-005 · Nguyễn Tiến Dũng", "13:00 – 17:30")]),
            ("Thứ bảy 22/08", [("Bảo dưỡng cấp 1 (BDC1)", "Tất cả đội xe cơ giới", "07:00 – 11:30"), ("San gạt đường gom Lô A", "MĐ-CAT-008 · Bùi Đức Thắng", "13:00 – 17:00")]),
            ("Chủ nhật 23/08", [("Trực cấp nước tưới vườn", "XBN-014 · Huỳnh Minh Trí", "07:00 – 17:00"), ("Trực vận chuyển khẩn cấp", "XT-HN-102 · Trần Quốc Huy", "Cả ngày")])
        ]
    },

    # =========================================================================
    # 3. KẾ HOẠCH SẢN XUẤT
    # =========================================================================
    "3-ke-hoach-san-xuat/ke-hoach-tuan-ngay": {
        "parent": "Kế hoạch sản xuất",
        "title": "Kế hoạch tuần/ngày",
        "eyebrow": "KẾ HOẠCH SẢN XUẤT",
        "header_title": "Kế hoạch sản xuất tuần / ngày",
        "header_desc": "Kế hoạch sản xuất theo chuỗi Làm đất → Trồng mới → Chăm sóc → Thu hoạch tại các nông trường.",
        "stats": [
            ("Kế hoạch làm đất", "85 ha", "Đạt 92% tiến độ"),
            ("Kế hoạch trồng mới", "40 ha", "Chuối Nam Mỹ cấy mô"),
            ("Kế hoạch thu hoạch", "450 tấn", "Chuối + Cỏ Mulato"),
            ("Phương tiện huy động", "36 máy", "Sẵn sàng 100%")
        ],
        "type": "calendar",
        "days": [
            ("Thứ hai 17/08", [("Cày ngầm sâu 60cm Lô A18 (25 ha)", "Đội Máy kéo 1 · 3 xe", "06:00 – 17:30"), ("Đào rãnh thoát nước Lô B10", "Đội Xúc đào · 2 máy", "07:00 – 16:30")]),
            ("Thứ ba 18/08", [("Bừa đất & lên luống Lô A18", "Đội Máy kéo 1 · 2 xe", "06:00 – 17:30"), ("Bón phân lót hữu cơ Lô A16 (12 ha)", "Đội Cơ giới 2 · 4 xe", "07:00 – 17:00")]),
            ("Thứ tư 19/08", [("Trồng chuối giống mới Lô A16", "Nhân công + Xe rải giống", "06:30 – 17:00"), ("Cắt cỏ tươi Lô C04 (120 tấn)", "Máy gặt DC-70 · 2 máy", "06:00 – 12:00")]),
            ("Thứ năm 20/08", [("Phun thuốc phòng rệp sáp Lô B04-B06", "Xe phun tự hành · 2 xe", "05:30 – 10:30"), ("Xới xáo gốc chuối 3 tháng tuổi", "Máy kéo nhỏ Kubota · 3 xe", "13:00 – 17:30")]),
            ("Thứ sáu 21/08", [("Thu hoạch buồng xuất khẩu Lô C01", "Đội Thu hoạch · 4 xe tải", "06:00 – 15:30"), ("Băm cỏ ngô sinh khối chuyển Trại Bò", "Máy Claas 850 · 1 máy", "07:00 – 17:00")]),
            ("Thứ bảy 22/08", [("Vệ sinh đồng ruộng & Gara máy", "Toàn bộ nhân viên tổ cơ giới", "07:00 – 11:30"), ("Kiểm tra hệ thống tưới nhỏ giọt", "Tổ kỹ thuật nông trường", "13:00 – 17:00")]),
            ("Chủ nhật 23/08", [("Nghỉ luân phiên / Trực sự cố", "Tổ trực ban cơ giới KM", "07:00 – 17:00"), ("Bơm nước hồ chứa trung tâm", "Trạm bơm số 2", "06:00 – 18:00")])
        ]
    },

    "3-ke-hoach-san-xuat/lenh-san-xuat": {
        "parent": "Kế hoạch sản xuất",
        "title": "Lệnh sản xuất",
        "eyebrow": "KẾ HOẠCH SẢN XUẤT",
        "header_title": "Lệnh sản xuất nông trường",
        "header_desc": "Quản lý tiến độ chuỗi sản xuất 3 giai đoạn: Làm đất → Trồng mới → Thu hoạch gắn với xe cơ giới.",
        "stats": [
            ("Lệnh đang chạy", "24 lệnh", "Trên 3 nông trường"),
            ("Diện tích làm đất", "68 / 85 ha", "Tiến độ 80.0%"),
            ("Diện tích trồng mới", "28 / 40 ha", "Tiến độ 70.0%"),
            ("Sản lượng thu hoạch", "380 / 450 tấn", "Tiến độ 84.4%")
        ],
        "type": "kanban",
        "columns": [
            ("1. Giai đoạn Làm đất", "6", [
                ("LSX-LD-041", "Cày ngầm sâu 60cm Lô A18 (25 ha)", "MK-JD-024 · Nguyễn Văn Minh", "88%", "Đã cày 22/25 ha"),
                ("LSX-LD-042", "Bừa phẳng mặt ruộng Lô A19 (20 ha)", "MK-JD-042 · Lê Hoàng Nam", "50%", "Đã bừa 10/20 ha"),
                ("LSX-LD-043", "Lên luống cao 35cm Lô A20 (18 ha)", "MK-NH-018 · Đặng Văn Hùng", "25%", "Đã lên luống 4.5 ha")
            ]),
            ("2. Giai đoạn Trồng mới", "5", [
                ("LSX-TM-019", "Trồng chuối Nam Mỹ cấy mô Lô A16 (12 ha)", "Tổ Trồng 1 · Xe rải giống 018", "75%", "Đã trồng 9/12 ha"),
                ("LSX-TM-020", "Bón lót vi sinh hữu cơ Lô A17 (15 ha)", "XB-AU-065 · Phạm Quốc An", "90%", "Đã bón 13.5 ha"),
                ("LSX-TM-021", "Lắp đặt ống tưới nhỏ giọt Lô A17", "Tổ Kỹ thuật Nông trường 1", "40%", "Hoàn thành 6/15 ha")
            ]),
            ("3. Chăm sóc & BVTV", "7", [
                ("LSX-CS-033", "Phun phòng ngừa rệp sáp Lô B04 (30 ha)", "MK-KB-053 · Vũ Đình Trọng", "100%", "Đã phun đủ diện tích"),
                ("LSX-CS-034", "Bón phân đợt 2 vườn chuối 6 tháng", "MK-JD-024 · Nguyễn Văn Minh", "60%", "Đang thực hiện Lô B06"),
                ("LSX-CS-035", "Cắt tỉa chồi và dọn lá già Lô B02", "Tổ Chăm sóc NT2", "80%", "Đạt 24/30 ha")
            ]),
            ("4. Giai đoạn Thu hoạch", "6", [
                ("LSX-TH-028", "Thu hoạch buồng chuối xuất khẩu Lô C01 (180 tấn)", "Tổ Cắt + 3 Xe tải Hino", "72%", "Đã chuyển 130 tấn về xưởng"),
                ("LSX-TH-029", "Thu hoạch cỏ Mulato Lô C04 (120 tấn)", "MG-KB-012 · Võ Văn Thành", "100%", "Đã cân nhập kho 124.5 tấn"),
                ("LSX-TH-030", "Băm ngô sinh khối Lô C09 (150 tấn)", "MTH-CL-005 · Nguyễn Tiến Dũng", "60%", "Đã chuyển 90 tấn về Silo")
            ])
        ]
    },

    "3-ke-hoach-san-xuat/phan-cong-thuc-hien": {
        "parent": "Kế hoạch sản xuất",
        "title": "Phân công thực hiện",
        "eyebrow": "KẾ HOẠCH SẢN XUẤT",
        "header_title": "Phân công tổ đội cơ giới",
        "header_desc": "Giao nhiệm vụ và định mức sản lượng cho từng tổ cơ giới, máy kéo và tài xế.",
        "stats": [
            ("Tổng tổ cơ giới", "6 tổ", "Toàn KLH Koun Mom"),
            ("Tổng nhân sự vận hành", "52 người", "Lái máy & phụ xe"),
            ("Thiết bị sẵn sàng", "91,4%", "4 máy đang BDC2"),
            ("Hiệu suất giao việc", "96%", "Không chồng chéo lệnh")
        ],
        "type": "kanban",
        "columns": [
            ("Tổ Cơ giới NT1 (Chuối)", "8", [
                ("PC-NT1-01", "Phụ trách làm đất Lô A18-A20", "MK-JD-024, MK-JD-042 · 4 tài xế", "85%", "Định mức: 45 ha"),
                ("PC-NT1-02", "Phụ trách tưới & bón phân lót", "XBN-014, XB-AU-065 · 3 tài xế", "70%", "Định mức: 30 ha")
            ]),
            ("Tổ Cơ giới NT2 (Chuối)", "7", [
                ("PC-NT2-01", "Phun thuốc BVTV tự hành Lô B", "MK-KB-053 · 2 tài xế", "90%", "Định mức: 60 ha"),
                ("PC-NT2-02", "Xới đất & bón thúc chuối", "MK-NH-018 · 2 tài xế", "65%", "Định mức: 35 ha")
            ]),
            ("Tổ Thu hoạch Cỏ & Ngô", "6", [
                ("PC-TH-01", "Gặt cỏ Mulato chuyển Silo", "MG-KB-012 · Võ Văn Thành", "95%", "Định mức: 120 tấn/ngày"),
                ("PC-TH-02", "Băm ngô sinh khối Claas", "MTH-CL-005 · Nguyễn Tiến Dũng", "60%", "Định mức: 150 tấn/ngày")
            ]),
            ("Tổ Cơ giới nặng & Thủy lợi", "5", [
                ("PC-CGN-01", "Đào đắp kênh mương phân lô", "MĐ-CAT-008 · Bùi Đức Thắng", "80%", "Định mức: 1.200 m rãnh"),
                ("PC-CGN-02", "San ủi mặt bằng xưởng mới", "XX-LG-019 · Ngô Văn Tài", "100%", "Định mức: 2.500 m²")
            ])
        ]
    },

    "3-ke-hoach-san-xuat/xac-nhan-khoi-luong": {
        "parent": "Kế hoạch sản xuất",
        "title": "Xác nhận khối lượng",
        "eyebrow": "KẾ HOẠCH SẢN XUẤT",
        "header_title": "Xác nhận khối lượng hoàn thành",
        "header_desc": "Đối chiếu khối lượng kế hoạch giao với dữ liệu diện tích/giờ máy đo đạc từ GPS thực tế.",
        "stats": [
            ("Lệnh đã hoàn thành", "38 lệnh", "Cần xác nhận hôm nay"),
            ("Khối lượng GPS khớp", "35 lệnh", "Sai lệch < 2%"),
            ("Khối lượng chênh lệch", "3 lệnh", "Cần khảo sát lại"),
            ("Đã duyệt thanh toán", "32 lệnh", "Chuyển kế toán")
        ],
        "type": "table",
        "columns": ["MÃ LỆNH", "HẠNG MỤC CÔNG VIỆC", "PHƯƠNG TIỆN / TÀI XẾ", "KẾ HOẠCH", "GPS ĐO ĐẠC", "NGHIỆM THU", "TỶ LỆ", "TRẠNG THÁI"],
        "rows": [
            ("LSX-LD-041", "Cày ngầm sâu 60cm Lô A18", "MK-JD-024 · Nguyễn Văn Minh", "25.0 ha", "24.8 ha", "24.8 ha", "99.2%", "Đã duyệt", "success"),
            ("LSX-TH-029", "Cắt cỏ Mulato Lô C04", "MG-KB-012 · Võ Văn Thành", "120.0 tấn", "124.5 tấn", "124.5 tấn", "103.7%", "Đã duyệt", "success"),
            ("LSX-TM-019", "Trồng chuối giống mới Lô A16", "MK-NH-018 · Đặng Văn Hùng", "12.0 ha", "11.6 ha", "11.6 ha", "96.7%", "Chờ xác nhận", "pending"),
            ("LSX-CS-033", "Phun BVTV tự hành Lô B04", "MK-KB-053 · Vũ Đình Trọng", "30.0 ha", "30.0 ha", "30.0 ha", "100.0%", "Đã duyệt", "success"),
            ("LSX-LD-042", "Bừa phẳng mặt ruộng Lô A19", "MK-JD-042 · Lê Hoàng Nam", "20.0 ha", "18.5 ha", "18.5 ha", "92.5%", "Đang thực hiện", "info"),
            ("LSX-CGN-08", "Đào mương thoát nước Kênh T1", "MĐ-CAT-008 · Bùi Đức Thắng", "1.200 m", "1.250 m", "1.250 m", "104.2%", "Đã duyệt", "success"),
            ("LSX-TH-030", "Băm ngô sinh khối Lô C09", "MTH-CL-005 · Nguyễn Tiến Dũng", "150.0 tấn", "148.0 tấn", "148.0 tấn", "98.7%", "Chờ xác nhận", "pending")
        ]
    },

    "3-ke-hoach-san-xuat/lich-su-dieu-chinh": {
        "parent": "Kế hoạch sản xuất",
        "title": "Lịch sử điều chỉnh",
        "eyebrow": "KẾ HOẠCH SẢN XUẤT",
        "header_title": "Lịch sử điều chỉnh kế hoạch (Audit Trail)",
        "header_desc": "Lưu vết toàn bộ thay đổi về diện tích, định mức, phương tiện, lý do và người phê duyệt.",
        "stats": [
            ("Tổng lần điều chỉnh", "14 lượt", "Trong tháng 08/2026"),
            ("Điều chỉnh do thời tiết", "6 lượt", "Mưa lớn hoãn cày"),
            ("Điều chỉnh phương tiện", "5 lượt", "Thay thế do bảo dưỡng"),
            ("Tỷ lệ duyệt thay đổi", "100%", "Đúng thẩm quyền GĐ")
        ],
        "type": "timeline",
        "events": [
            ("Điều chỉnh diện tích cày Lô A18", "Tăng diện tích từ 22 ha lên 25 ha do mở rộng thêm phần đất giáp bờ đồi Nông trường 1.", "23/08/2026 · 09:15 · bởi Nguyễn Hữu Thành (GĐ NT1)"),
            ("Thay đổi xe cày thực hiện lệnh LSX-TM-019", "Chuyển từ xe MK-JD-024 sang MK-NH-018 do xe JD-024 đến hạn bảo dưỡng BDC2 (chu kỳ 250 giờ).", "22/08/2026 · 14:30 · bởi Trần Văn Hải (Trưởng ban Xe máy)"),
            ("Tạm hoãn phun thuốc trừ sâu Lô B04", "Hoãn ca phun chiều do trời mưa dông lúc 14:15, dời lịch sang sáng sớm 05:30 ngày 23/08.", "21/08/2026 · 15:00 · bởi Vũ Đình Trọng (Đội trưởng NT2)"),
            ("Cấp bổ sung nhiên liệu cho máy băm Claas", "Duyệt bổ sung 120 lít dầu DO cho lệnh LSX-TH-030 do đất ẩm làm tăng tải trọng máy băm.", "20/08/2026 · 10:45 · bởi Chau Tiểu Long (Quản trị hệ thống)"),
            ("Gia hạn thời gian thu hoạch buồng Lô C01", "Gia hạn thêm 1 ngày do xưởng đóng gói chuối tăng công suất xuất khẩu sang thị trường Trung Quốc.", "19/08/2026 · 16:20 · bởi Phạm Văn Đức (GĐ XN Chế biến)")
        ]
    }
};

print(f"Loaded {len(PAGES_DATA)} base configurations...")
