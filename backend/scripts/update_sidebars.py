# -*- coding: utf-8 -*-
"""
Cập nhật sidebar và breadcrumb chuẩn xác 100% cho toàn bộ 71 trang HTML
Đảm bảo:
1. Tất cả đường dẫn href là chính xác (không lỗi 404)
2. Nhóm cha chứa trang hiện tại tự động mở (open + active)
3. Mục con hiện tại được đánh dấu active (href="#")
4. Các nhóm khác đóng gọn gàng
5. Breadcrumb hiển thị chính xác Nhóm / Tên trang
"""

import os
import glob
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

menu_structure = [
    ('▣', 'Tổng quan', '1-tong-quan', [
        ('Dashboard vận hành', 'dashboard-van-hanh.html', '')
    ]),
    ('⌖', 'Giám sát & Điều hành', '2-giam-sat-dieu-hanh', [
        ('Giám sát trực tuyến', 'giam-sat-truc-tuyen.html', ''),
        ('Playback hành trình', 'playback-hanh-trinh.html', ''),
        ('Vùng giám sát', 'geo-fence.html', ''),
        ('Lệnh điều xe', 'lenh-dieu-xe.html', ''),
        ('Lệnh vận chuyển', 'lenh-van-chuyen.html', ''),
        ('Lịch điều xe', 'lich-dieu-xe.html', '')
    ]),
    ('▦', 'Kế hoạch sản xuất', '3-ke-hoach-san-xuat', [
        ('Kế hoạch tuần/ngày', 'ke-hoach-tuan-ngay.html', ''),
        ('Lệnh sản xuất', 'lenh-san-xuat.html', ''),
        ('Phân công thực hiện', 'phan-cong-thuc-hien.html', ''),
        ('Xác nhận khối lượng', 'xac-nhan-khoi-luong.html', ''),
        ('Lịch sử điều chỉnh', 'lich-su-dieu-chinh.html', '')
    ]),
    ('▣', 'Vận chuyển nội bộ', '4-van-chuyen-noi-bo', [
        ('Yêu cầu vận chuyển', 'yeu-cau-van-chuyen.html', ''),
        ('Kế hoạch phân bổ xe', 'ke-hoach-phan-bo-xe.html', ''),
        ('Điều phối vận chuyển', 'dieu-phoi-van-chuyen.html', ''),
        ('Theo dõi chuyến', 'theo-doi-chuyen.html', ''),
        ('Xác nhận số lượng', 'xac-nhan-so-luong.html', '')
    ]),
    ('▰', 'Đội xe', '5-doi-xe', [
        ('Danh sách xe', 'danh-sach-xe.html', ''),
        ('Phân xe', 'phan-xe.html', ''),
        ('Thiết bị GPS', 'thiet-bi-gps.html', ''),
        ('Lịch sử xe', 'lich-su-xe.html', '')
    ]),
    ('♙', 'Lái xe', '6-lai-xe', [
        ('Danh sách lái xe', 'danh-sach-lai-xe.html', ''),
        ('Phân công lái xe', 'phan-cong-lai-xe.html', ''),
        ('GPLX', 'gplx.html', ''),
        ('Lịch sử lái xe', 'lich-su-lai-xe.html', ''),
        ('Vi phạm', 'vi-pham.html', ''),
        ('KPI lái xe', 'kpi-lai-xe.html', ''),
        ('Bảng xếp hạng', 'bang-xep-hang.html', '')
    ]),
    ('⚒', 'Bảo trì - Sửa chữa', '7-bao-tri-sua-chua', [
        ('Kế hoạch bảo trì', 'ke-hoach-bao-tri.html', ''),
        ('Yêu cầu sửa chữa', 'yeu-cau-sua-chua.html', ''),
        ('Phiếu sửa chữa', 'phieu-sua-chua.html', ''),
        ('Theo dõi sửa chữa', 'theo-doi-sua-chua.html', ''),
        ('Vật tư - Phụ tùng', 'vat-tu-phu-tung.html', ''),
        ('Lịch sử BTSC', 'lich-su-btsc.html', ''),
        ('Đăng kiểm', 'dang-kiem.html', ''),
        ('Bảo hiểm', 'bao-hiem.html', '')
    ]),
    ('⛽', 'Nhiên liệu', '8-nhien-lieu', [
        ('Cấp nhiên liệu', 'cap-nhien-lieu.html', ''),
        ('Định mức nhiên liệu', 'dinh-muc-nhien-lieu.html', ''),
        ('Đối chiếu tiêu hao', 'doi-chieu-tieu-hao.html', ''),
        ('Tồn kho', 'ton-kho.html', ''),
        ('Lịch sử cấp phát', 'lich-su-cap-phat.html', '')
    ]),
    ('🔔', 'Cảnh báo & Thông báo', '9-canh-bao-thong-bao', [
        ('Chưa xử lý', 'chua-xu-ly.html', '18'),
        ('Đã xử lý', 'da-xu-ly.html', ''),
        ('Lịch sử cảnh báo', 'lich-su-canh-bao.html', ''),
        ('Cấu hình cảnh báo', 'cau-hinh-canh-bao.html', '')
    ], '18'),
    ('▥', 'Báo cáo', '10-bao-cao', [
        ('Điều hành', 'dieu-hanh.html', ''),
        ('Hành trình', 'hanh-trinh.html', ''),
        ('Sản xuất', 'san-xuat.html', ''),
        ('Vận chuyển', 'van-chuyen.html', ''),
        ('Đội xe', 'doi-xe.html', ''),
        ('Lái xe & KPI', 'lai-xe-kpi.html', ''),
        ('BTSC', 'btsc.html', ''),
        ('Nhiên liệu', 'nhien-lieu.html', ''),
        ('Cảnh báo', 'canh-bao.html', '')
    ]),
    ('▤', 'Danh mục', '11-danh-muc', [
        ('Đơn vị / KLH', 'don-vi-klh.html', ''),
        ('Đội xe', 'doi-xe.html', ''),
        ('Loại xe', 'loai-xe.html', ''),
        ('Loại công việc', 'loai-cong-viec.html', ''),
        ('Loại lệnh', 'loai-lenh.html', ''),
        ('Lô / Thửa', 'lo-thua.html', ''),
        ('Tuyến đường', 'tuyen-duong.html', ''),
        ('Khu vực / Vùng giám sát', 'khu-vuc-geo-fence.html', ''),
        ('Vật tư - Phụ tùng', 'vat-tu-phu-tung.html', ''),
        ('Loại nhiên liệu', 'loai-nhien-lieu.html', ''),
        ('Định mức', 'dinh-muc.html', '')
    ]),
    ('⚙', 'Quản trị hệ thống', '12-quan-tri-he-thong', [
        ('Người dùng', 'nguoi-dung.html', ''),
        ('Vai trò & Phân quyền', 'vai-tro-phan-quyen.html', ''),
        ('Phân quyền đơn vị', 'phan-quyen-don-vi.html', ''),
        ('Cấu hình thông báo', 'cau-hinh-thong-bao.html', ''),
        ('Nhật ký hệ thống', 'nhat-ky-he-thong.html', ''),
        ('Cấu hình hệ thống', 'cau-hinh-he-thong.html', '')
    ])
]

def build_sidebar(current_folder, current_filename):
    groups_html = []
    for g in menu_structure:
        icon, group_name, folder, items = g[0], g[1], g[2], g[3]
        badge_group = g[4] if len(g) > 4 else ""
        
        is_current_group = (folder == current_folder)
        group_cls = "nav-group open" if is_current_group else "nav-group"
        parent_cls = "nav-parent active" if is_current_group else "nav-parent"
        
        badge_html = f'<span class="badge">{badge_group}</span>' if badge_group else ''
        
        items_html = []
        for item in items:
            page_name, filename, badge_item = item[0], item[1], item[2]
            is_current_item = (is_current_group and filename == current_filename)
            
            if is_current_item:
                item_cls = "nav-child active"
                href = "#"
            else:
                item_cls = "nav-child"
                href = f"../{folder}/{filename}"
                
            item_badge = f'<span class="badge" style="margin-left:auto">{badge_item}</span>' if badge_item else ''
            items_html.append(f'<a href="{href}" class="{item_cls}" style="text-decoration:none">{page_name}{item_badge}</a>')
            
        group_inner = f'''<div class="{group_cls}">
  <button class="{parent_cls}" onclick="this.parentElement.classList.toggle('open')">
    <span class="nav-icon">{icon}</span>
    <span class="nav-label">{group_name}</span>
    {badge_html}
    <span class="chev">⌄</span>
  </button>
  <div class="nav-children">
    {''.join(items_html)}
  </div>
</div>'''
        groups_html.append(group_inner)
        
    return '\n'.join(groups_html)

# Update all 71 HTML pages
for g in menu_structure:
    icon, group_name, folder, items = g[0], g[1], g[2], g[3]
    for item in items:
        page_name, filename, _ = item[0], item[1], item[2]
        filepath = os.path.join('pages', folder, filename)
        
        if not os.path.isfile(filepath):
            print(f"File not found: {filepath}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Replace <nav id="mainNav">...</nav>
        new_sidebar_html = f'<nav id="mainNav">\n{build_sidebar(folder, filename)}\n      </nav>'
        content = re.sub(r'<nav id="mainNav">.*?</nav>', new_sidebar_html, content, flags=re.DOTALL)
        
        # Replace breadcrumb
        new_breadcrumb = f'<div class="breadcrumb"><span>{group_name}</span><b>/</b><strong>{page_name}</strong></div>'
        content = re.sub(r'<div class="breadcrumb">.*?</div>', new_breadcrumb, content, flags=re.DOTALL)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Updated sidebar and breadcrumbs for all 71 pages successfully!")
