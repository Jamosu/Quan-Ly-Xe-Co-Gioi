# -*- coding: utf-8 -*-
"""
Database Seeder for THACO AGRI - Quản Lý Xe Cơ Giới (KLH Koun Mom)
Populates MySQL database `thaco_agri_qlxcg` with full realistic data adhering to BRD:
- 13 Core Business Modules
- Full RACI Roles & Units (KLH Koun Mom, Ban Cơ Giới, NT1, NT2, XN Bò, TT BTSC)
- 9 Vehicle Categories, Agricultural Implements, Production Plans (Làm đất -> Trồng mới -> Thu hoạch)
- Dispatch & Transport Orders, Feed Trips (3-step loop), Fuel Tickets, Maintenance (250h), Repair (8-step), KPIs, SOS Alerts.
"""

import sys
import json
import datetime
import subprocess
import random

sys.stdout.reconfigure(encoding='utf-8')

def run_sql_batch(statements):
    sql_script = "USE thaco_agri_qlxcg;\nSET FOREIGN_KEY_CHECKS = 0;\n" + "\n".join(statements) + "\nSET FOREIGN_KEY_CHECKS = 1;\n"
    with open("temp_seed.sql", "w", encoding="utf-8") as f:
        f.write(sql_script)
    
    res = subprocess.run(
        [r'C:\xampp\mysql\bin\mysql.exe', '--default-character-set=utf8mb4', '-u', 'root'],
        input=sql_script.encode('utf-8'),
        capture_output=True
    )
    if res.returncode != 0:
        print("SQL Error:", res.stderr.decode('utf-8', errors='replace'))
    else:
        print("Batch executed successfully.")

print("Starting THACO AGRI QLXCG MySQL Seeder...")

statements = []

# 1. TRUNCATE EXISTING TABLES (except preserve if needed, clean seed)
tables_to_clear = [
    'companies', 'users', 'employees', 'vehicles', 'agricultural_implements',
    'implement_attachment_logs', 'production_plans', 'production_plot_progresses',
    'production_audit_trails', 'dispatch_orders', 'transport_orders', 'feed_raw_materials',
    'internal_feed_trips', 'fuel_warehouses', 'fuel_dispense_tickets', 'maintenance_records',
    'repair_tickets', 'workshop_owed_part_notes', 'driver_kpis', 'driver_sos_alerts',
    'personnel_partners'
]
for t in tables_to_clear:
    statements.append(f"TRUNCATE TABLE `{t}`;")

# 2. COMPANIES
companies_data = [
    ("THACO_KM", "Khu Liên Hợp Koun Mom - THACO AGRI", "Huyện Koun Mom, Tỉnh Ratanakiri, Campuchia", "Nông nghiệp & Chăn nuôi quy mô lớn", "GPKD-KM-2019-8899", "5000 Tỷ VNĐ"),
    ("BAN_CG_KM", "Ban Ô tô Xe máy Cơ giới & PTVC Xếp dỡ", "Khu văn phòng điều hành trung tâm KLH Koun Mom", "Quản trị vận hành & kỹ thuật cơ giới", "GPKD-CG-2020-001", "200 Tỷ VNĐ"),
    ("NT1_CHUOI", "Xí nghiệp Chuối Nông Trường 1", "Phân khu Nông trường 1, KLH Koun Mom", "Trồng trọt & sơ chế chuối xuất khẩu", "GPKD-NT1-2020-101", "300 Tỷ VNĐ"),
    ("NT2_CHUOI", "Xí nghiệp Chuối Nông Trường 2", "Phân khu Nông trường 2, KLH Koun Mom", "Trồng trọt & sơ chế chuối xuất khẩu", "GPKD-NT2-2020-102", "300 Tỷ VNĐ"),
    ("XN_BO_THIT", "Xí nghiệp Chăn Nuôi Bò Thịt & Bò Sinh Sản", "Khu liên hợp trang trại chăn nuôi Bò Koun Mom", "Chăn nuôi gia súc & chế biến TMR", "GPKD-XNB-2021-201", "450 Tỷ VNĐ"),
    ("TT_BTSC_KM", "Trung Tâm Bảo Trì Sửa Chữa Cơ Giới KLH", "Khu xưởng kỹ thuật trung tâm Koun Mom", "Bảo dưỡng, trung tu, đại tu MMTB", "GPKD-SC-2020-301", "150 Tỷ VNĐ")
]
for c in companies_data:
    statements.append(f"""
    INSERT INTO `companies` (`code`, `name`, `address`, `field`, `businessLicense`, `charterCapital`, `createdAt`, `updatedAt`)
    VALUES ('{c[0]}', '{c[1]}', '{c[2]}', '{c[3]}', '{c[4]}', '{c[5]}', NOW(3), NOW(3));
    """)

# 3. USERS (Full RACI roles and Drivers)
# Role enum: 'SUPER_ADMIN','DISPATCHER','FARM_MANAGER','WORKSHOP_MANAGER','FUEL_STOREKEEPER','DRIVER'
# Unit enum: 'NT1','NT2','XN_BO','TT_BTSC','BAN_CO_GIOI','TOAN_KLH'
# LicenseClass: 'BANG_MAY_NONG_NGHIEP','HANG_C','HANG_FC','HANG_B2','HANG_D'
users_data = [
    # Quản lý & Lãnh đạo
    (1, "USR-001", "admin", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Nguyễn Ngọc Anh Tú", "0908123456", "SUPER_ADMIN", "TOAN_KLH", "DANG_LAM_VIEC", "HANG_B2", "B2-7901234", "SAN_SANG", "VP Điều Hành KLH", 1, "Ban Lãnh đạo KLH"),
    (2, "USR-002", "dat.tq", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Trần Quốc Đạt", "0908234567", "DISPATCHER", "BAN_CO_GIOI", "DANG_LAM_VIEC", "HANG_C", "C-8812345", "SAN_SANG", "Ban Xe Cơ Giới", 1, "Trưởng Ban Cơ Giới"),
    (3, "USR-003", "im.dv", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Đào Văn Im", "0908345678", "DISPATCHER", "BAN_CO_GIOI", "DANG_LAM_VIEC", "HANG_C", "C-8812346", "SAN_SANG", "Phòng CNTT - VHS", 1, "Chuyên viên CNTT"),
    (4, "USR-004", "long.ct", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Chau Tiểu Long", "0908456789", "DISPATCHER", "TOAN_KLH", "DANG_LAM_VIEC", "HANG_B2", "B2-8812347", "SAN_SANG", "Trung tâm Điều hành", 1, "Điều độ viên trưởng"),
    (5, "USR-005", "gd.nt1", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Lê Văn Hùng", "0908567890", "FARM_MANAGER", "NT1", "DANG_LAM_VIEC", "HANG_B2", "B2-8812348", "SAN_SANG", "Văn phòng NT1", 1, "Giám đốc Nông trường 1"),
    (6, "USR-006", "gd.nt2", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Phan Hoàng Nam", "0908678901", "FARM_MANAGER", "NT2", "DANG_LAM_VIEC", "HANG_B2", "B2-8812349", "SAN_SANG", "Văn phòng NT2", 1, "Giám đốc Nông trường 2"),
    (7, "USR-007", "gd.xnbo", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Trương Đình Quý", "0908789012", "FARM_MANAGER", "XN_BO", "DANG_LAM_VIEC", "HANG_B2", "B2-8812350", "SAN_SANG", "Trại Bò Thịt Trung Tâm", 1, "Giám đốc XN Chăn nuôi Bò"),
    (8, "USR-008", "ql.xuong", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Vũ Mạnh Hùng", "0908890123", "WORKSHOP_MANAGER", "TT_BTSC", "DANG_LAM_VIEC", "HANG_C", "C-8812351", "SAN_SANG", "Xưởng Bảo Trì BTSC", 1, "Quản đốc Trung tâm BTSC"),
    (9, "USR-009", "kho.xangdau", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Bùi Tấn Tài", "0908901234", "FUEL_STOREKEEPER", "BAN_CO_GIOI", "DANG_LAM_VIEC", "HANG_B2", "B2-8812352", "SAN_SANG", "Kho Xăng Dầu Trung Tâm T1", 1, "Thủ kho xăng dầu"),

    # Tài xế nông trường 1
    (10, "TX-001", "minh.nv", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Nguyễn Văn Minh", "0912111001", "DRIVER", "NT1", "DANG_LAM_VIEC", "BANG_MAY_NONG_NGHIEP", "NN-1001", "DANG_VAN_HANH", "Lô CN-A12 (NT1)", 1, "Lái máy kéo cày đất"),
    (11, "TX-002", "huy.tq", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Trần Quốc Huy", "0912111002", "DRIVER", "NT1", "DANG_LAM_VIEC", "HANG_FC", "FC-1002", "DANG_VAN_HANH", "Tuyến Trục D4 -> Packhouse 2", 1, "Lái xe tải Howo 4 chân"),
    (12, "TX-003", "nam.lh", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Lê Hoàng Nam", "0912111003", "DRIVER", "NT1", "DANG_LAM_VIEC", "BANG_MAY_NONG_NGHIEP", "NN-1003", "SAN_SANG", "Bãi xe Đội Cơ Giới 1", 1, "Lái máy gặt & bừa Kubota"),
    (13, "TX-004", "hai.dt", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Đỗ Thanh Hải", "0912111004", "DRIVER", "NT1", "DANG_LAM_VIEC", "HANG_C", "C-1004", "DANG_VAN_HANH", "Lô CAT-C04 (NT1)", 1, "Lái xe bồn phun tưới"),
    (14, "TX-005", "thanh.vv", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Võ Văn Thành", "0912111005", "DRIVER", "NT1", "DANG_LAM_VIEC", "HANG_C", "C-1005", "SAN_SANG", "Kho phân bón NT1", 1, "Lái xe tải Hino 8T chở phân"),

    # Tài xế Nông trường 2 & Campuchia local
    (15, "TX-006", "keo.sarath", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Keo Sarath", "0912111006", "DRIVER", "NT2", "DANG_LAM_VIEC", "HANG_C", "KH-C-2001", "DANG_VAN_HANH", "Lô CN-B06 (NT2)", 1, "Lái xe ben san gạt & chở đất"),
    (16, "TX-007", "sok.phearith", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Sok Phearith", "0912111007", "DRIVER", "NT2", "DANG_LAM_VIEC", "HANG_C", "KH-C-2002", "SAN_SANG", "Packhouse 1", 1, "Lái xe tải chở chuối"),
    (17, "TX-008", "chan.vibol", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Chan Vibol", "0912111008", "DRIVER", "NT2", "DANG_LAM_VIEC", "BANG_MAY_NONG_NGHIEP", "KH-NN-2003", "DANG_VAN_HANH", "Lô B08 (NT2)", 1, "Lái máy kéo John Deere"),
    (18, "TX-009", "an.pq", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Phạm Quốc An", "0912111009", "DRIVER", "BAN_CO_GIOI", "DANG_LAM_VIEC", "HANG_C", "C-3001", "DANG_VAN_HANH", "Trục chính T1 (Kho dầu -> NT2)", 1, "Lái xe téc dầu lưu động"),
    (19, "TX-010", "dat.ht", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Huỳnh Tấn Đạt", "0912111010", "DRIVER", "TT_BTSC", "DANG_LAM_VIEC", "HANG_FC", "FC-3002", "SAN_SANG", "Xưởng BTSC", 1, "Lái xe cứu hộ kéo máy"),

    # Tài xế XN Chăn nuôi bò & TMR
    (20, "TX-011", "meng.chenda", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Meng Chenda", "0912111011", "DRIVER", "XN_BO", "DANG_LAM_VIEC", "HANG_C", "KH-C-4001", "DANG_VAN_HANH", "Lô chuối -> Trại Bò 1", 1, "Lái xe ben chở phụ phẩm chuối"),
    (21, "TX-012", "heng.sophea", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Heng Sophea", "0912111012", "DRIVER", "XN_BO", "DANG_LAM_VIEC", "HANG_FC", "KH-FC-4002", "DANG_VAN_HANH", "Trại Bò 1 -> Trung tâm TMR", 1, "Lái đầu kéo chở thức ăn TMR"),
    (22, "TX-013", "nguyen.duc", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Nguyễn Văn Đức", "0912111013", "DRIVER", "XN_BO", "DANG_LAM_VIEC", "BANG_MAY_NONG_NGHIEP", "NN-4003", "SAN_SANG", "Khu đồng cỏ VA06", 1, "Lái máy cắt cỏ sinh khối"),
    (23, "TX-014", "le.vantoan", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Lê Văn Toàn", "0912111014", "DRIVER", "BAN_CO_GIOI", "DANG_LAM_VIEC", "HANG_C", "C-5001", "SAN_SANG", "Bãi xe Trung Tâm", 1, "Lái xe xúc lật nguyên liệu"),
    (24, "TX-015", "tran.vanphong", "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2", "Trần Văn Phong", "0912111015", "DRIVER", "TT_BTSC", "DANG_LAM_VIEC", "BANG_MAY_NONG_NGHIEP", "NN-5002", "DANG_VAN_HANH", "Xưởng BTSC", 1, "Thợ máy kiêm lái thử nghiệm"),
]

for u in users_data:
    statements.append(f"""
    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES ({u[0]}, '{u[1]}', '{u[2]}', '{u[3]}', '{u[4]}', '{u[5]}', '{u[6]}', '{u[7]}', '{u[8]}', '{u[9]}', '{u[10]}', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), '{u[11]}', '{u[12]}', {u[13]}, '{u[14]}', NOW(3), NOW(3));
    """)

# 4. VEHICLES (Spanning all 9 categories defined in BRD)
# Categories: 'MAY_CAY','MAY_KEO','XE_BEN','XE_BON','XE_XUC','XE_NANG','XE_BAN_TAI','XE_CONTAINER'
# AlertTier: 'GREEN' (chu kỳ xa), 'AMBER' (sắp đến hạn 250h), 'RED' (quá hạn)
# Units: NT1, NT2, XN_BO, TT_BTSC, BAN_CO_GIOI, TOAN_KLH
vehicles_data = [
    # Máy cày & Máy kéo (Làm đất, trồng mới)
    (1, "XC-JD-024", "70A-024.12", "Máy kéo John Deere 6140B (140HP)", "MAY_KEO", "NT1", 10, 12, "HOAT_DONG", 1450.5, 42.0, "GREEN", 8450.0, 18.5, 13.5678, 106.8901, "Nông trường 1 - Lô CN-A12"),
    (2, "XC-KB-053", "70A-053.45", "Máy cày Kubota M7040 (70HP)", "MAY_CAY", "NT1", 12, 10, "HOAT_DONG", 2280.0, 235.0, "AMBER", 12400.0, 11.2, 13.5712, 106.8955, "Nông trường 1 - Lô CN-B06"),
    (3, "XC-JD-031", "70A-031.88", "Máy kéo John Deere 6120M (120HP)", "MAY_KEO", "NT2", 17, 15, "HOAT_DONG", 1820.0, 15.0, "GREEN", 9800.0, 16.8, 13.5822, 106.9102, "Nông trường 2 - Lô B08"),
    (4, "XC-NH-019", "70A-019.67", "Máy kéo New Holland TD5.110 (110HP)", "MAY_KEO", "NT2", 17, 16, "BAO_DUONG", 2560.0, 262.0, "RED", 14200.0, 15.5, 13.5540, 106.8820, "Xưởng Bảo Trì BTSC"),
    (5, "XC-KB-077", "70A-077.90", "Máy cày Kubota L5018 (50HP)", "MAY_CAY", "NT1", 10, 12, "HOAT_DONG", 980.5, 80.0, "GREEN", 5200.0, 9.5, 13.5699, 106.8877, "Nông trường 1 - Lô CN-A05"),

    # Máy gặt & Xe xúc
    (6, "MG-KB-018", "70A-018.99", "Máy gặt đập liên hợp Kubota DC-70G", "MAY_CAY", "NT1", 12, 10, "HOAT_DONG", 1120.0, 115.0, "GREEN", 4600.0, 14.0, 13.5615, 106.8790, "Nông trường 1 - Lô SK-08"),
    (7, "XX-CL-008", "70A-008.33", "Xe xúc đào bánh xích CAT 320D2", "XE_XUC", "BAN_CO_GIOI", 23, 24, "HOAT_DONG", 4120.0, 248.0, "AMBER", 3200.0, 22.0, 13.5500, 106.8700, "Kênh Thủy Lợi Koun Mom"),
    (8, "XX-LG-015", "70A-015.44", "Xe xúc lật LiuGong CLG835H (Gầu 2.0m3)", "XE_XUC", "XN_BO", 23, 22, "HOAT_DONG", 3350.0, 50.0, "GREEN", 2800.0, 18.0, 13.5910, 106.9250, "Trung tâm Chế biến TMR"),
    (9, "XN-TY-005", "70A-005.11", "Xe nâng hàng Toyota 5T (Dầu)", "XE_NANG", "NT1", 11, 14, "HOAT_DONG", 1950.0, 90.0, "GREEN", 1500.0, 6.5, 13.5750, 106.9010, "Packhouse 2 - Nông trường 1"),
    (10, "XN-HY-012", "70A-012.22", "Xe nâng hàng Heli 3.5T (Dầu)", "XE_NANG", "NT2", 16, 17, "HOAT_DONG", 1650.0, 180.0, "GREEN", 1200.0, 5.8, 13.5850, 106.9150, "Packhouse 1 - Nông trường 2"),

    # Xe tải vận chuyển, xe ben, xe bồn
    (11, "XT-HW-102", "70C-102.88", "Xe tải thùng Howo 4 chân (Trọng tải 18T)", "XE_CONTAINER", "NT1", 11, 14, "HOAT_DONG", 3890.0, 120.0, "GREEN", 84500.0, 32.5, 13.5720, 106.8980, "Trục đường Trục D4 -> Packhouse 2"),
    (12, "XT-HN-079", "70C-079.55", "Xe tải Hino 500 Series (Trọng tải 8T)", "XE_BEN", "NT1", 14, 11, "HOAT_DONG", 2980.0, 245.0, "AMBER", 62000.0, 24.0, 13.5680, 106.8920, "Kho phân bón NT1 -> Lô CN-B06"),
    (13, "XT-HN-055", "70C-055.33", "Xe tải Hino 300 Series (Trọng tải 5T)", "XE_BEN", "NT2", 16, 15, "HOAT_DONG", 2150.0, 45.0, "GREEN", 48000.0, 18.5, 13.5800, 106.9080, "Kho Phụ liệu -> Packhouse 1"),
    (14, "XB-HD-062", "70C-062.77", "Xe ben Hyundai HD270 (Trọng tải 15T)", "XE_BEN", "XN_BO", 15, 20, "HOAT_DONG", 4520.0, 275.0, "RED", 92000.0, 34.0, 13.5880, 106.9190, "Packhouse 2 -> Trại Bò Thịt 1"),
    (15, "XB-HN-045", "70C-045.66", "Xe bồn Hino téc nước tưới 15m3", "XE_BON", "NT1", 13, 10, "HOAT_DONG", 2670.0, 130.0, "GREEN", 54000.0, 26.0, 13.5650, 106.8850, "Lô CAT-C04 - Nông trường 1"),
    (16, "XN-DF-011", "70C-011.99", "Xe téc cấp dầu lưu động Dongfeng 5000L", "XE_BON", "BAN_CO_GIOI", 18, 19, "HOAT_DONG", 1890.0, 60.0, "GREEN", 39000.0, 22.0, 13.5600, 106.8800, "Đang tiếp dầu lưu động Lô A12"),
    (17, "XT-CH-003", "70C-003.12", "Xe cứu hộ chuyên dụng sàn trượt 8T", "XE_BAN_TAI", "TT_BTSC", 19, 24, "HOAT_DONG", 1240.0, 85.0, "GREEN", 26000.0, 20.0, 13.5540, 106.8820, "Xưởng BTSC (Trực ban cứu hộ)"),
    (18, "XB-TH-028", "70C-028.44", "Xe bán tải kỹ thuật Mazda BT50", "XE_BAN_TAI", "BAN_CO_GIOI", 2, 3, "HOAT_DONG", 1450.0, 110.0, "GREEN", 52000.0, 8.5, 13.5580, 106.8850, "Tuyến tuần tra Nông trường 1 & 2"),
    (19, "XT-CN-091", "70C-091.66", "Đầu kéo Shacman F3000 + Mooc Sàn TMR", "XE_CONTAINER", "XN_BO", 21, 20, "HOAT_DONG", 3100.0, 70.0, "GREEN", 71000.0, 38.0, 13.5930, 106.9280, "Trại Bò 1 -> Trung tâm TMR"),
    (20, "XC-JD-088", "70A-088.19", "Máy kéo John Deere 6140B (Số 2)", "MAY_KEO", "NT1", 10, 12, "SUA_CHUA", 3200.0, 280.0, "RED", 18500.0, 18.5, 13.5540, 106.8820, "Xưởng BTSC - Đang chờ phụ tùng")
]

for v in vehicles_data:
    statements.append(f"""
    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES ({v[0]}, '{v[1]}', '{v[2]}', '{v[3]}', '{v[4]}', '{v[5]}', {v[6]}, {v[7]}, '{v[8]}', {v[9]}, {v[10]}, '{v[11]}', {v[12]}, {v[13]}, {v[14]}, {v[15]}, '{v[16]}', NOW(3), NOW(3), NOW(3));
    """)

# 5. AGRICULTURAL IMPLEMENTS (Nông cụ gắn kèm máy kéo)
# Categories: 'DAN_CAY','DAN_BUA','DAN_XOI','DAN_RAI_PHAN','RO_MOOC','DAN_PHUN_THUOC'
# Status: 'ATTACHED','IN_DEPOT','MAINTENANCE'
implements_data = [
    (1, "NC-DC-01", "Dàn cày 3 chảo ngầm Baldan (Brazil)", "DAN_CAY", "NT1", 1, "ATTACHED", "GOOD", "Cày lật ải sâu 40-50cm"),
    (2, "NC-DB-02", "Dàn bừa đĩa 24 chảo phá lâm TATU", "DAN_BUA", "NT1", 2, "ATTACHED", "GOOD", "Bừa tơi đất & san phẳng mặt ruộng"),
    (3, "NC-DX-03", "Dàn xới xoay lên luống chuối Howard", "DAN_XOI", "NT2", 3, "ATTACHED", "GOOD", "Tạo luống cao trồng chuối 2.5m"),
    (4, "NC-DP-04", "Dàn phun thuốc khử trùng cánh rộng 18m", "DAN_PHUN_THUOC", "NT1", 5, "ATTACHED", "GOOD", "Phun xử lý đất trước khi trồng"),
    (5, "NC-RM-05", "Rơ-moóc ben nông nghiệp 8 tấn tự đổ", "RO_MOOC", "NT2", None, "IN_DEPOT", "GOOD", "Vận chuyển cây giống & phân bón"),
    (6, "NC-RP-06", "Dàn rải phân hữu cơ vi sinh 4m3", "DAN_RAI_PHAN", "NT1", None, "IN_DEPOT", "WORN_OUT", "Bón lót đáy luống trồng mới"),
    (7, "NC-DC-07", "Dàn cày 4 chảo cày đất dốc đồi", "DAN_CAY", "BAN_CO_GIOI", None, "MAINTENANCE", "NEED_REPAIR", "Cày đất khai hoang phân khu mới")
]
for im in implements_data:
    vh_id = im[5] if im[5] is not None else "NULL"
    statements.append(f"""
    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES ({im[0]}, '{im[1]}', '{im[2]}', '{im[3]}', '{im[4]}', {vh_id}, '{im[6]}', '{im[7]}', '{im[8]}', NOW(3), NOW(3), NOW(3));
    """)

# 6. IMPLEMENT ATTACHMENT LOGS
statements.append(f"""
INSERT INTO `implement_attachment_logs` (`id`, `vehicleId`, `implementId`, `actorId`, `attachedAt`, `detachedAt`, `startWearMm`, `endWearMm`, `notes`, `createdAt`)
VALUES 
(1, 1, 1, 10, DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, 1.2, 1.8, 'Gắn dàn cày 3 chảo Baldan cày ải Lô CN-A12', NOW(3)),
(2, 2, 2, 12, DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, 0.5, 0.9, 'Gắn dàn bừa đĩa 24 chảo làm tơi đất Lô CN-B06', NOW(3)),
(3, 3, 3, 17, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, 2.0, 2.3, 'Gắn dàn xới lên luống chuối Lô B08', NOW(3));
""")

# 7. PRODUCTION PLANS (Theo chuỗi Làm đất -> Trồng mới -> Thu hoạch)
# Stages: 'LAM_DAT','TRONG_MOI','THU_HOACH'
# Status: 'PENDING','IN_PROGRESS','PAUSED','COMPLETED'
prod_plans_data = [
    (1, "KHSX-2608-01", "Kế hoạch cày ải & làm tơi đất chuối Tuần 34 - Lô CN-A12", "LAM_DAT", "NT1", "Lô CN-A12 (Thửa 01 - 04)", 48.5, 36.2, 4, 1850.0, 1420.0, 5, "IN_PROGRESS"),
    (2, "KHSX-2608-02", "Kế hoạch bón lót & lên luống trồng mới chuối Nam Mỹ - Lô CN-B06", "TRONG_MOI", "NT1", "Lô CN-B06 (Thửa 01 - 06)", 62.0, 18.5, 5, 2400.0, 780.0, 5, "IN_PROGRESS"),
    (3, "KHSX-2608-03", "Kế hoạch thu hoạch chuối xuất khẩu đợt 3 - Lô CN-C01 & C02", "THU_HOACH", "NT2", "Lô CN-C01 / C02", 55.0, 55.0, 6, 2100.0, 2045.0, 6, "COMPLETED"),
    (4, "KHSX-2608-04", "Kế hoạch thu hoạch bắp sinh khối TMR cho trại bò - Lô SK-08", "THU_HOACH", "NT1", "Lô SK-08 (Vùng ngô sinh khối)", 32.0, 24.0, 3, 1200.0, 950.0, 7, "IN_PROGRESS"),
    (5, "KHSX-2608-05", "Kế hoạch cày rạch hàng & trồng mới đợt 4 - Nông trường 2", "TRONG_MOI", "NT2", "Lô NT2-D01 -> D04", 40.0, 0.0, 3, 1600.0, 0.0, 6, "PENDING")
]
for p in prod_plans_data:
    statements.append(f"""
    INSERT INTO `production_plans` (`id`, `code`, `title`, `stage`, `unit`, `lotPlot`, `targetAreaHa`, `completedAreaHa`, `assignedVehiclesCount`, `fuelQuotaLiters`, `fuelUsedLiters`, `supervisorId`, `startDate`, `endDate`, `status`, `createdAt`, `updatedAt`)
    VALUES ({p[0]}, '{p[1]}', '{p[2]}', '{p[3]}', '{p[4]}', '{p[5]}', {p[6]}, {p[7]}, {p[8]}, {p[9]}, {p[10]}, {p[11]}, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), '{p[12]}', NOW(3), NOW(3));
    """)

# 8. PRODUCTION PLOT PROGRESSES (Tiến độ từng lô/thửa)
plot_progress_data = [
    (1, 1, "Thửa A12-01 (12.0 ha)", "Cày phá gốc chuối già & lật ải", 12.0, "HOAN_THANH", 24.5, 450.0, 10, 1),
    (2, 1, "Thửa A12-02 (12.2 ha)", "Cày sâu lật đất tầng dưới", 12.2, "HOAN_THANH", 25.0, 460.0, 10, 1),
    (3, 1, "Thửa A12-03 (12.0 ha)", "Bừa phẳng & phay đất", 12.0, "DANG_THUC_HIEN", 18.0, 320.0, 12, 2),
    (4, 1, "Thửa A12-04 (12.3 ha)", "Bừa tơi đất chờ lên luống", 12.3, "CHUA_THUC_HIEN", 0.0, 0.0, 12, 2),
    (5, 2, "Thửa B06-01 (10.5 ha)", "Rải vôi & phân vi sinh đáy luống", 10.5, "HOAN_THANH", 16.0, 260.0, 14, 12),
    (6, 2, "Thửa B06-02 (10.0 ha)", "Lên luống cao 40cm chuẩn bị trồng", 10.0, "DANG_THUC_HIEN", 12.0, 210.0, 17, 3),
    (7, 2, "Thửa B06-03 (10.5 ha)", "Lên luống tạo rãnh thoát nước", 10.5, "CHUA_THUC_HIEN", 0.0, 0.0, 17, 3),
    (8, 4, "Thửa SK-08-01 (16.0 ha)", "Gặt băm cây bắp sinh khối đưa vào sọt", 16.0, "HOAN_THANH", 32.0, 520.0, 12, 6),
    (9, 4, "Thửa SK-08-02 (16.0 ha)", "Gặt băm đợt 2 chuyển về hầm ủ TMR", 16.0, "DANG_THUC_HIEN", 18.5, 290.0, 12, 6)
]
for pg in plot_progress_data:
    statements.append(f"""
    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES ({pg[0]}, {pg[1]}, '{pg[2]}', '{pg[3]}', {pg[4]}, '{pg[5]}', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), {pg[6]}, {pg[7]}, {pg[8]}, {pg[9]}, 0, NOW(3), NOW(3));
    """)

# 9. PRODUCTION AUDIT TRAILS (Lưu vết thay đổi kế hoạch sản xuất)
statements.append(f"""
INSERT INTO `production_audit_trails` (`id`, `planId`, `actorId`, `action`, `reason`, `approvedBy`, `timestamp`)
VALUES
(1, 1, 5, 'ĐIỀU_CHỈNH_TIẾN_ĐỘ', 'Do mưa lớn kéo dài chiều 21/08, hoãn cày thửa A12-04 sang ngày 24/08 để tránh sa lầy đất', 'Giám đốc NT1 - Lê Văn Hùng', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 2, 5, 'BỔ_SUNG_XE_CƠ_GIỚI', 'Tăng cường máy kéo John Deere XC-JD-031 để đẩy nhanh tiến độ lên luống trước đợt cấp cây giống', 'Trưởng Ban Cơ Giới - Trần Quốc Đạt', DATE_SUB(NOW(), INTERVAL 1 DAY));
""")

# 10. DISPATCH ORDERS (Lệnh điều xe số hóa)
# Status: 'PENDING','APPROVED','RUNNING','COMPLETED','REJECTED'
dispatch_orders_data = [
    (1, "LĐX-260823-001", 2, "NT1", "Điều máy kéo John Deere cày ải đất trồng chuối", "Bãi xe Đội Cơ Giới 1", "Lô CN-A12 (NT1)", 1, 10, "RUNNING", 0, "Xuất phát đúng 06:30"),
    (2, "LĐX-260823-002", 2, "NT1", "Điều xe tải Howo chở buồng chuối về Packhouse", "Packhouse 2", "Lô CN-A12", 11, 11, "RUNNING", 0, "Chuyến số 3 trong ngày"),
    (3, "LĐX-260823-003", 5, "NT1", "Điều xe bồn Hino chở nước tưới vườn ươm chuối", "Trạm bơm Hồ Thủy Lợi", "Lô CAT-C04", 15, 13, "RUNNING", 0, "Phun tưới dặm đợt 2"),
    (4, "LĐX-260823-004", 6, "NT2", "Điều máy kéo Kubota bừa tơi đất lên luống", "Bãi Cơ Giới NT2", "Lô B08 (NT2)", 3, 17, "APPROVED", 0, "Chờ bàn giao chìa khóa 08:30"),
    (5, "LĐX-260823-005", 8, "TT_BTSC", "Điều xe cứu hộ kéo máy kéo hỏng về xưởng", "Xưởng BTSC", "Lô CN-A05", 17, 19, "COMPLETED", 0, "Đã kéo máy an toàn về xưởng lúc 08:15"),
    (6, "LĐX-260823-006", 9, "BAN_CO_GIOI", "Điều xe téc tiếp nhiên liệu lưu động trên đồng", "Kho Xăng Dầu T1", "Lô CN-A12 & Lô SK-08", 16, 18, "RUNNING", 0, "Cấp 2.500 lít dầu cho đội máy cày"),
    (7, "LĐX-260823-007", 7, "XN_BO", "Điều xe ben Hyundai chở phụ phẩm chuối về trại bò", "Packhouse 2", "Trại Bò Thịt 1", 14, 15, "PENDING", 1, "Cảnh báo trễ xuất phát 20 phút do chờ cân")
]
for d in dispatch_orders_data:
    statements.append(f"""
    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES ({d[0]}, '{d[1]}', {d[2]}, '{d[3]}', '{d[4]}', '{d[5]}', '{d[6]}', {d[7]}, {d[8]}, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), '{d[9]}', {d[10]}, '{d[11]}', NOW(3), NOW(3));
    """)

# 11. TRANSPORT ORDERS (Lệnh vận chuyển & Giám sát lộ trình, giảm rỗng chiều về)
transport_orders_data = [
    (1, "LVC-260823-011", "ROUND_TRIP", "Chuối tươi xuất khẩu cắt sáng sớm", 14.2, "Lô CN-A12", "Packhouse 2", 11, 11, 28.5, 70.0, 0, None, "IN_TRANSIT", "Thùng carton đóng gói", 3.0, "Lô CN-A12", "RETURN_LOADED", 350000.0),
    (2, "LVC-260823-012", "ONE_WAY", "Phân bón vi sinh bón lót", 8.0, "Kho Phân Bón Trung Tâm", "Lô CN-B06", 12, 14, 24.0, 70.0, 0, None, "DELIVERED", None, 0, None, "EMPTY_DISPATCHED", 0.0),
    (3, "LVC-260823-013", "ROUND_TRIP", "Phụ phẩm chuối cắt tỉa băm nhỏ", 15.0, "Packhouse 2", "Trại Bò Thịt 1", 14, 15, 38.0, 40.0, 1, "Chạy sai tuyến đường tránh ổ gà tại ngã 3 Kênh T2", "DEVIATED", "Phân bò ủ hoai bón vườn", 8.0, "Lô CN-A12", "RETURN_LOADED", 520000.0),
    (4, "LVC-260823-014", "ONE_WAY", "Dầu Diesel DO 0.05S cấp bồn lưu động", 4.2, "Kho Xăng Dầu T1", "Bãi Cơ Giới NT2", 16, 18, 22.0, 60.0, 0, None, "IN_TRANSIT", None, 0, None, "EMPTY_DISPATCHED", 0.0)
]
for t in transport_orders_data:
    dev_reason = f"'{t[12]}'" if t[12] else "NULL"
    status_val = t[13]
    ret_cargo = f"'{t[14]}'" if t[14] else "NULL"
    ret_dest = f"'{t[16]}'" if t[16] else "NULL"
    statements.append(f"""
    INSERT INTO `transport_orders` (`id`, `code`, `routeType`, `cargoType`, `tonnage`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `arrivalTime`, `speedKmH`, `maxSpeedLimit`, `isRouteDeviated`, `deviationReason`, `status`, `returnCargoName`, `returnTonnage`, `returnDestination`, `returnDriverStatus`, `costSavedVnd`, `createdAt`, `updatedAt`)
    VALUES ({t[0]}, '{t[1]}', '{t[2]}', '{t[3]}', {t[4]}, '{t[5]}', '{t[6]}', {t[7]}, {t[8]}, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), {t[9]}, {t[10]}, {t[11]}, {dev_reason}, '{status_val}', {ret_cargo}, {t[15]}, {ret_dest}, '{t[17]}', {t[18]}, NOW(3), NOW(3));
    """)

# 12. FEED RAW MATERIALS (Nguyên liệu chế biến thức ăn TMR chăn nuôi bò)
feed_mats = [
    (1, "Phụ phẩm chuối (thân & lá băm)", "PHU_PHAM_CHUOI", 82.0, 0, 7),
    (2, "Cỏ voi VA06 cắt tươi", "CO_VOI", 75.0, 0, 7),
    (3, "Bắp ủ chua lên men (Corn Silage)", "TMR_VO_BEO", 65.0, 0, 7),
    (4, "Bã bia sấy ẩm", "BA_BIA", 70.0, 0, 7),
    (5, "Cám viên công nghiệp THACO Feed", "CAM_VIEN", 12.0, 0, 7),
    (6, "Khoáng vi lượng & Premix vitamin", "KHOANG_PREMIX", 8.0, 0, 7)
]
for fm in feed_mats:
    statements.append(f"""
    INSERT INTO `feed_raw_materials` (`id`, `name`, `groupType`, `moisturePercent`, `isCustomAdded`, `createdById`, `createdAt`, `updatedAt`)
    VALUES ({fm[0]}, '{fm[1]}', '{fm[2]}', {fm[3]}, {fm[4]}, {fm[5]}, NOW(3), NOW(3));
    """)

# 13. INTERNAL FEED TRIPS (Luồng 3 chặng: Nông trường -> Trại Bò -> Trung tâm TMR)
feed_trips_data = [
    (1, "TMR-TRIP-260823-01", 1, 14, 15, "Packhouse 2 (Nông trường 1)", "Trạm Cân Điện Tử T1", "Trại Bò Thịt 1 (Hầm ủ số 3)", 15.2, 14.9, 1.97, "ON_TIME", None, "XN Chăn Nuôi Bò đã ký nhận", 1),
    (2, "TMR-TRIP-260823-02", 2, 19, 21, "Cánh đồng cỏ VA06 (Phân khu 3)", "Trạm Cân Điện Tử T2", "Trung tâm Chế biến TMR", 18.0, 17.8, 1.11, "ON_TIME", None, "Thủ kho TMR đã xác nhận", 1),
    (3, "TMR-TRIP-260823-03", 3, 11, 11, "Vùng bắp sinh khối Lô SK-08", "Trạm Cân Điện Tử T1", "Trại Bò Sinh Sản 2", 14.5, 14.1, 2.76, "DELAYED", "Xe bị kẹt tại trạm cân do cúp điện tạm thời", "Tổ trưởng chuồng nuôi ký nhận", 0)
]
for ft in feed_trips_data:
    delay_r = f"'{ft[12]}'" if ft[12] else "NULL"
    statements.append(f"""
    INSERT INTO `internal_feed_trips` (`id`, `code`, `materialId`, `vehicleId`, `driverId`, `sourceLocation`, `transferPoint`, `destinationLocation`, `dispatchWeightTons`, `receiveWeightTons`, `weightDiffPercent`, `slaWindowStart`, `slaWindowEnd`, `departureTime`, `completedFeedTime`, `slaStatus`, `delayReason`, `receiverSignature`, `isSettled`, `createdAt`, `updatedAt`)
    VALUES ({ft[0]}, '{ft[1]}', {ft[2]}, {ft[3]}, {ft[4]}, '{ft[5]}', '{ft[6]}', '{ft[7]}', {ft[8]}, {ft[9]}, {ft[10]}, DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW(3), DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), '{ft[11]}', {delay_r}, '{ft[13]}', {ft[14]}, NOW(3), NOW(3));
    """)

# 14. FUEL WAREHOUSES & DISPENSE TICKETS
fuel_warehouses_data = [
    (1, "Kho Xăng Dầu Trung Tâm T1 (Bồn Cố Định 45.000L)", "STATIONARY_TANK_45000L", 45000.0, 38500.0, "BAN_CO_GIOI"),
    (2, "Kho Nhiên Liệu Nông Trường 1 (Bồn 45.000L)", "STATIONARY_TANK_45000L", 45000.0, 41200.0, "NT1"),
    (3, "Kho Nhiên Liệu Nông Trường 2 (Bồn 45.000L)", "STATIONARY_TANK_45000L", 45000.0, 36800.0, "NT2"),
    (4, "Xe Téc Nhiên Liệu Lưu Động XN-DF-011 (5.000L)", "MOBILE_TRUCK_5000L", 5000.0, 3400.0, "BAN_CO_GIOI")
]
for fw in fuel_warehouses_data:
    statements.append(f"""
    INSERT INTO `fuel_warehouses` (`id`, `name`, `type`, `capacityLiters`, `currentStockLiters`, `unit`, `createdAt`, `updatedAt`)
    VALUES ({fw[0]}, '{fw[1]}', '{fw[2]}', {fw[3]}, {fw[4]}, '{fw[5]}', NOW(3), NOW(3));
    """)

fuel_tickets_data = [
    (1, "PKX-260823-001", 1, 1, 10, 180.0, 1450.5, 175.0, 5.0, 2.86, 0, "QR-PKX-001-XC-JD-024", 9),
    (2, "PKX-260823-002", 1, 11, 11, 120.0, 3890.0, 115.0, 5.0, 4.35, 0, "QR-PKX-002-XT-HW-102", 9),
    (3, "PKX-260823-003", 2, 2, 12, 110.0, 2280.0, 95.0, 15.0, 15.79, 1, "QR-PKX-003-XC-KB-053", 9), # Vượt định mức >10%
    (4, "PKX-260823-004", 3, 3, 17, 160.0, 1820.0, 160.0, 0.0, 0.0, 0, "QR-PKX-004-XC-JD-031", 9),
    (5, "PKX-260823-005", 4, 14, 15, 140.0, 4520.0, 120.0, 20.0, 16.67, 1, "QR-PKX-005-XB-HD-062", 9) # Vượt định mức
]
for ftk in fuel_tickets_data:
    statements.append(f"""
    INSERT INTO `fuel_dispense_tickets` (`id`, `ticketCode`, `warehouseId`, `vehicleId`, `driverId`, `dispensedLiters`, `engineOdoHours`, `quotaLiters`, `varianceLiters`, `variancePercent`, `isExcess`, `qrCodePayload`, `operatorId`, `dispensedAt`)
    VALUES ({ftk[0]}, '{ftk[1]}', {ftk[2]}, {ftk[3]}, {ftk[4]}, {ftk[5]}, {ftk[6]}, {ftk[7]}, {ftk[8]}, {ftk[9]}, {ftk[10]}, '{ftk[11]}', {ftk[12]}, NOW(3));
    """)

# 15. MAINTENANCE RECORDS (Bảo dưỡng 2 cấp: BDC1 hằng ngày & BDC2 250h/500h/750h/1000h)
# Checklist JSON theo Quy định 13/2023 THACO AGRI
checklist_sample = json.dumps({
    "items": [
        {"code": "KT01", "name": "Vệ sinh lọc gió động cơ & lọc gió cabin", "status": "PASSED"},
        {"code": "KT02", "name": "Kiểm tra mức dầu nhớt động cơ & châm thêm", "status": "PASSED"},
        {"code": "KT03", "name": "Bơm mỡ bôi trơn các khớp các-đăng & ắc tay lái", "status": "PASSED"},
        {"code": "KT04", "name": "Kiểm tra áp suất lốp & siết lại bu lông bánh xe", "status": "PASSED"},
        {"code": "KT05", "name": "Kiểm tra rò rỉ đường ống thủy lực nông cụ", "status": "WARNING"}
    ],
    "signature": "Vũ Mạnh Hùng (Quản đốc xưởng)"
}, ensure_ascii=False)

maintenance_records_data = [
    (1, 1, 8, 1450.5, 208.0, "GREEN", checklist_sample, "COMPLETED"),
    (2, 2, 8, 2280.0, 15.0, "AMBER", checklist_sample, "SCHEDULED"),
    (3, 4, 8, 2560.0, -12.0, "RED", checklist_sample, "IN_SERVICE"), # Quá hạn 12h
    (4, 12, 8, 2980.0, 5.0, "AMBER", checklist_sample, "SCHEDULED"),
    (5, 14, 8, 4520.0, -25.0, "RED", checklist_sample, "SCHEDULED") # Quá hạn 25h
]
for m in maintenance_records_data:
    esc_json = m[6].replace("'", "''")
    statements.append(f"""
    INSERT INTO `maintenance_records` (`id`, `vehicleId`, `technicianId`, `currentHours`, `hoursToNextService`, `alertTier`, `checklistJson`, `status`, `completedAt`, `createdAt`, `updatedAt`)
    VALUES ({m[0]}, {m[1]}, {m[2]}, {m[3]}, {m[4]}, '{m[5]}', '{esc_json}', '{m[7]}', NOW(3), NOW(3), NOW(3));
    """)

# 16. REPAIR TICKETS (Quy trình sửa chữa 8 bước QT.VPĐH.KTCN/06 & Biểu mẫu BM01, BM02, BM09...)
# Tiers: 'TIEU_TU','TRUNG_TU','DAI_TU','SOS_CUU_HO'
# Status: 'RECEIVED','IN_REPAIR','WAITING_PARTS','COMPLETED'
repair_parts_1 = json.dumps([
    {"partCode": "VT-LOC-01", "name": "Lọc nhớt động cơ John Deere RE504836", "qty": 1, "unit": "Cái", "priceVnd": 450000},
    {"partCode": "VT-DAU-02", "name": "Dầu nhớt động cơ Delo 400 15W40", "qty": 15, "unit": "Lít", "priceVnd": 105000},
    {"partCode": "VT-ONG-03", "name": "Ống tuy-ô thủy lực cao áp 2 lớp thép", "qty": 2, "unit": "Sợi", "priceVnd": 680000}
], ensure_ascii=False)

repair_tickets_data = [
    (1, "PSC-2608-001", 20, 10, 8, "TRUNG_TU", "Bể phốt bơm thủy lực nâng hạ nông cụ, rỉ dầu hộp số phụ", 0, None, "WAITING_PARTS", 12500000.0, 0.0, repair_parts_1),
    (2, "PSC-2608-002", 4, 17, 8, "TIEU_TU", "Bảo dưỡng cấp 2 (250h) định kỳ: thay lọc dầu, lọc nhớt, vệ sinh két nước", 1, 3, "IN_REPAIR", 4800000.0, 4650000.0, repair_parts_1),
    (3, "PSC-2608-003", 14, 15, 8, "SOS_CUU_HO", "Gãy nhíp sau lá số 3 bên phụ do chở nặng vào cung đường xấu Packhouse", 0, None, "RECEIVED", 6200000.0, 0.0, repair_parts_1),
    (4, "PSC-2608-004", 6, 12, 8, "TIEU_TU", "Mòn lưỡi cắt máy gặt Kubota DC-70G, thay dàn dao cắt hạt", 0, None, "COMPLETED", 3500000.0, 3420000.0, repair_parts_1)
]
for r in repair_tickets_data:
    m_id = r[7] if r[7] else "NULL"
    esc_parts = r[12].replace("'", "''")
    statements.append(f"""
    INSERT INTO `repair_tickets` (`id`, `code`, `vehicleId`, `reportedByDriverId`, `assignedTechnicianId`, `repairTier`, `issueDescription`, `isGeneratedFromMaintenance`, `maintenanceRecordId`, `status`, `estimatedCostVnd`, `actualCostVnd`, `replacedPartsJson`, `receivedDate`, `completedDate`, `createdAt`, `updatedAt`)
    VALUES ({r[0]}, '{r[1]}', {r[2]}, {r[3]}, {r[4]}, '{r[5]}', '{r[6]}', {r[7]}, {m_id}, '{r[9]}', {r[10]}, {r[11]}, '{esc_parts}', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(3), NOW(3), NOW(3));
    """)

# 17. WORKSHOP OWED PART NOTES (Sổ nợ phụ tùng)
statements.append(f"""
INSERT INTO `workshop_owed_part_notes` (`id`, `maintenanceRecordId`, `vehicleId`, `missingPartName`, `partCode`, `scheduledRestockDate`, `isResolved`, `resolvedAt`, `technicianNotes`, `createdAt`, `updatedAt`)
VALUES
(1, 3, 4, 'Cụm phốt bơm thủy lực chính John Deere', 'JD-SEAL-889', DATE_ADD(NOW(), INTERVAL 3 DAY), 0, NULL, 'Đã đặt hàng từ Tổng kho TP.HCM, dự kiến về Koun Mom ngày 28/08', NOW(3), NOW(3)),
(2, 2, 2, 'Lọc gió sơ cấp Kubota M7040', 'KB-FL-02', DATE_ADD(NOW(), INTERVAL 2 DAY), 0, NULL, 'Tạm thời dùng lọc cũ thổi sạch bụi tái sử dụng ngắn hạn', NOW(3), NOW(3));
""")

# 18. DRIVER KPIS (Công thức 4 thành phần 25% * 4 = 100 điểm)
# Trips (25%) + Km (25%) + Hours (25%) + Fuel (25%)
kpis_data = [
    (1, 10, "08/2026", 46, 24.5, 680.0, 24.0, 142.5, 25.0, 32.0, 25.0, 98.5, "HANG_A", 1800000.0),
    (2, 11, "08/2026", 52, 25.0, 1850.0, 25.0, 120.0, 23.5, 45.0, 25.0, 98.5, "HANG_A", 1800000.0),
    (3, 12, "08/2026", 38, 22.0, 420.0, 21.0, 135.0, 24.0, 15.0, 23.0, 90.0, "HANG_B", 1200000.0),
    (4, 13, "08/2026", 40, 23.0, 850.0, 23.0, 110.0, 22.0, 20.0, 24.0, 92.0, "HANG_A", 1500000.0),
    (5, 14, "08/2026", 32, 20.0, 1100.0, 22.0, 95.0, 20.0, -10.0, 18.0, 80.0, "HANG_C", 500000.0),
    (6, 15, "08/2026", 44, 24.0, 1420.0, 24.0, 128.0, 24.0, 25.0, 24.5, 96.5, "HANG_A", 1600000.0),
    (7, 16, "08/2026", 36, 21.0, 980.0, 21.5, 105.0, 21.0, 12.0, 22.5, 86.0, "HANG_B", 1000000.0),
    (8, 17, "08/2026", 41, 23.5, 590.0, 23.0, 138.0, 24.5, 28.0, 24.5, 95.5, "HANG_A", 1500000.0)
]
for k in kpis_data:
    statements.append(f"""
    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES ({k[0]}, {k[1]}, '{k[2]}', {k[3]}, {k[4]}, {k[5]}, {k[6]}, {k[7]}, {k[8]}, {k[9]}, {k[10]}, {k[11]}, '{k[12]}', {k[13]}, NOW(3), NOW(3));
    """)

# 19. DRIVER SOS ALERTS (Báo sự cố khẩn cấp từ App tài xế)
# EmergencyType: 'HONG_MAY','THUNG_LOP','SA_LAY_RUONG','TAI_NAN','HET_DAU_DOT_XUAT'
# Status: 'PENDING','DISPATCHED','RESOLVED'
sos_alerts_data = [
    (1, 10, 1, 13.5678, 106.8901, "Lô CN-A12 (Thửa 03)", "SA_LAY_RUONG", None, "Máy kéo bị lún sâu bánh sau bên trái tại rãnh thoát nước sau cơn mưa, cần máy ủi kéo hỗ trợ", "RESOLVED"),
    (2, 11, 11, 13.5720, 106.8980, "Trục đường D4 giao kênh chính", "THUNG_LOP", None, "Bể lốp đôi bánh sau bên lái do cán phải cọc sắt, đang chở 14 tấn chuối Packhouse 2", "DISPATCHED"),
    (3, 15, 14, 13.5880, 106.9190, "Đoạn đường dốc Trại Bò 1", "HONG_MAY", None, "Gãy nhíp sau lá số 3, xe nghiêng thùng không thể di chuyển an toàn", "PENDING")
]
for s in sos_alerts_data:
    statements.append(f"""
    INSERT INTO `driver_sos_alerts` (`id`, `driverId`, `vehicleId`, `lat`, `lng`, `lotLocation`, `emergencyType`, `photoUrl`, `description`, `status`, `createdAt`, `updatedAt`)
    VALUES ({s[0]}, {s[1]}, {s[2]}, {s[3]}, {s[4]}, '{s[5]}', '{s[6]}', NULL, '{s[7]}', '{s[8]}', NOW(3), NOW(3));
    """)

# 20. EMPLOYEES & PERSONNEL PARTNERS
employees_data = [
    ("NV-001", "Nguyễn Ngọc Anh Tú", "Ban Tổng Giám Đốc", "KLH Koun Mom", "Ban Lãnh Đạo", "Văn Phòng", "Tổ Quản Trị", "Phó TGĐ Thường Trực", "0908123456", "admin@thacoagri.vn"),
    ("NV-002", "Trần Quốc Đạt", "Ban Ô tô Xe máy Cơ giới", "KLH Koun Mom", "Ban Cơ Giới", "Đội Cơ Giới Trung Tâm", "Tổ Kỹ Thuật", "Trưởng Ban Cơ Giới", "0908234567", "dat.tq@thacoagri.vn"),
    ("NV-003", "Lê Văn Hùng", "Xí nghiệp Chuối Nông Trường 1", "KLH Koun Mom", "Nông Trường 1", "Khối Trồng Trọt", "Tổ Canh Tác", "Giám Đốc Nông Trường 1", "0908567890", "hung.lv@thacoagri.vn"),
    ("NV-004", "Vũ Mạnh Hùng", "Trung Tâm BTSC Cơ Giới", "KLH Koun Mom", "Trung Tâm BTSC", "Xưởng Cơ Khí Sửa Chữa", "Tổ Động Lực", "Quản Đốc Trung Tâm BTSC", "0908890123", "hung.vm@thacoagri.vn"),
    ("NV-005", "Nguyễn Văn Minh", "Đội Xe Cơ Giới Nông Trường 1", "KLH Koun Mom", "Nông Trường 1", "Đội Cơ Giới 1", "Tổ Máy Kéo", "Tài Xế Máy Kéo Trưởng", "0912111001", "minh.nv@thacoagri.vn")
]
for emp in employees_data:
    statements.append(f"""
    INSERT INTO `employees` (`empCode`, `fullName`, `businessUnit`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `phone`, `email`, `createdAt`, `updatedAt`)
    VALUES ('{emp[0]}', '{emp[1]}', '{emp[2]}', '{emp[3]}', '{emp[4]}', '{emp[5]}', '{emp[6]}', '{emp[7]}', 'Hoạt động', '{emp[8]}', '{emp[9]}', NOW(3), NOW(3));
    """)

personnel_partners_data = [
    ("DT-001", "Công ty TNHH Thiết Bị Nông Nghiệp John Deere Việt Nam", "KLH Koun Mom", "Ban Cơ Giới", "Nhà Cung Cấp MMTB", "Bảo Trì Hãng", "Đối Tác Kỹ Thuật & Cung Ứng Phụ Tùng"),
    ("DT-002", "Công ty CP Cơ Khí Ô Tô THACO Chu Lai", "KLH Koun Mom", "Trung Tâm BTSC", "Nhà Cung Cấp Xe Chuyên Dụng", "Đóng Thùng & Rơ Mooc", "Đối Tác Sản Xuất Phương Tiện Vận Tải"),
    ("DT-003", "Đại lý Xăng Dầu & Dầu Nhớt Petrolimex Cambodia", "KLH Koun Mom", "Kho Xăng Dầu", "Nhà Cung Ứng Nhiên Liệu", "Cấp Dầu DO", "Đối Tác Cung Cấp Xăng Dầu")
]
for p in personnel_partners_data:
    statements.append(f"""
    INSERT INTO `personnel_partners` (`code`, `name`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `createdAt`, `updatedAt`)
    VALUES ('{p[0]}', '{p[1]}', '{p[2]}', '{p[3]}', '{p[4]}', '{p[5]}', '{p[6]}', 'Hoạt động', NOW(3), NOW(3));
    """)

print(f"Prepared {len(statements)} SQL statements. Executing batch into MySQL...")
run_sql_batch(statements)
print("Seeding completed successfully!")
