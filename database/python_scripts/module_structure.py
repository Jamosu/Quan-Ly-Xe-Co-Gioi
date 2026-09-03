# -*- coding: utf-8 -*-
"""
Module structure without A, B, C, D prefixes, with logical operational flow:
Operations first, followed by Reports, Master Data, and System Administration at the bottom.
"""

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
        ('Hồ sơ thiết bị', 'ho-so-thiet-bi.html', ''),
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
    ('♙', 'Quản lý lái xe', 'I-lai-xe', [
        ('Hồ sơ lái xe & Thợ máy', 'ho-so-lai-xe.html', ''),
        ('Phân công lái xe theo ca', 'phan-cong-lai-xe.html', ''),
        ('Quản lý GPLX & Hết hạn', 'quan-ly-gplx.html', ''),
        ('Lịch sử lái xe & Vi phạm', 'lich-su-vi-pham.html', ''),
        ('Bảng xếp hạng thi đua KPI', 'bang-xep-hang-kpi.html', '')
    ]),
    ('⚒', 'Xưởng BTSC', 'E-xuong-btsc', [
        ('Kế hoạch bảo trì (250h)', 'ke-hoach-bao-tri.html', ''),
        ('Tiếp nhận báo hỏng', 'yeu-cau-sua-chua.html', ''),
        ('Phiếu sửa chữa & Vật tư', 'phieu-sua-chua.html', ''),
        ('Theo dõi tiến độ xưởng', 'theo-doi-sua-chua.html', ''),
        ('Đăng kiểm & Bảo hiểm', 'dang-kiem-bao-hiem.html', '')
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
    ], '18'),
    ('▥', 'Báo cáo hợp nhất', 'F-bao-cao', [
        ('Báo cáo năng suất xe', 'bao-cao-van-hanh.html', ''),
        ('Hành trình & Vi phạm', 'bao-cao-hanh-trinh-vi-pham.html', ''),
        ('Báo cáo KPI lái xe', 'bao-cao-lai-xe-kpi.html', ''),
        ('Báo cáo tiêu hao nhiên liệu', 'bao-cao-nhien-lieu.html', ''),
        ('Báo cáo chi phí BTSC', 'bao-cao-chi-phi-btsc.html', ''),
        ('So sánh giữa các KLH', 'bao-cao-so-sanh-klh.html', '')
    ]),
    ('▤', 'Danh mục hệ thống', 'H-danh-muc', [
        ('Đơn vị / KLH / Đội xe', 'don-vi-klh-doi-xe.html', ''),
        ('9 Chủng loại xe chuẩn', 'loai-xe-9-chung-loai.html', ''),
        ('Loại công việc & Lệnh', 'loai-cong-viec-loai-lenh.html', ''),
        ('Lô thửa & Tuyến đường', 'lo-thua-tuyen-duong.html', ''),
        ('Vật tư & Phụ tùng BTSC', 'vat-tu-phu-tung.html', ''),
        ('Định mức kỹ thuật', 'dinh-muc-ky-thuat.html', '')
    ]),
    ('⚙', 'Phân quyền hệ thống', 'G-phan-quyen', [
        ('Người dùng & Tài khoản', 'nguoi-dung.html', ''),
        ('Vai trò & Ma trận quyền', 'vai-tro-phan-quyen.html', ''),
        ('Phân quyền theo đơn vị', 'phan-quyen-don-vi.html', ''),
        ('Nhật ký hệ thống (Audit)', 'nhat-ky-he-thong.html', '')
    ])
]
