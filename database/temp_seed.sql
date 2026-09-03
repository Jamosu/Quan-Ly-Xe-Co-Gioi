USE thaco_agri_qlxcg;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `companies`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `employees`;
TRUNCATE TABLE `vehicles`;
TRUNCATE TABLE `agricultural_implements`;
TRUNCATE TABLE `implement_attachment_logs`;
TRUNCATE TABLE `production_plans`;
TRUNCATE TABLE `production_plot_progresses`;
TRUNCATE TABLE `production_audit_trails`;
TRUNCATE TABLE `dispatch_orders`;
TRUNCATE TABLE `transport_orders`;
TRUNCATE TABLE `feed_raw_materials`;
TRUNCATE TABLE `internal_feed_trips`;
TRUNCATE TABLE `fuel_warehouses`;
TRUNCATE TABLE `fuel_dispense_tickets`;
TRUNCATE TABLE `maintenance_records`;
TRUNCATE TABLE `repair_tickets`;
TRUNCATE TABLE `workshop_owed_part_notes`;
TRUNCATE TABLE `driver_kpis`;
TRUNCATE TABLE `driver_sos_alerts`;
TRUNCATE TABLE `personnel_partners`;

    INSERT INTO `companies` (`code`, `name`, `address`, `field`, `businessLicense`, `charterCapital`, `createdAt`, `updatedAt`)
    VALUES ('THACO_KM', 'Khu Liên Hợp Koun Mom - THACO AGRI', 'Huyện Koun Mom, Tỉnh Ratanakiri, Campuchia', 'Nông nghiệp & Chăn nuôi quy mô lớn', 'GPKD-KM-2019-8899', '5000 Tỷ VNĐ', NOW(3), NOW(3));
    

    INSERT INTO `companies` (`code`, `name`, `address`, `field`, `businessLicense`, `charterCapital`, `createdAt`, `updatedAt`)
    VALUES ('BAN_CG_KM', 'Ban Ô tô Xe máy Cơ giới & PTVC Xếp dỡ', 'Khu văn phòng điều hành trung tâm KLH Koun Mom', 'Quản trị vận hành & kỹ thuật cơ giới', 'GPKD-CG-2020-001', '200 Tỷ VNĐ', NOW(3), NOW(3));
    

    INSERT INTO `companies` (`code`, `name`, `address`, `field`, `businessLicense`, `charterCapital`, `createdAt`, `updatedAt`)
    VALUES ('NT1_CHUOI', 'Xí nghiệp Chuối Nông Trường 1', 'Phân khu Nông trường 1, KLH Koun Mom', 'Trồng trọt & sơ chế chuối xuất khẩu', 'GPKD-NT1-2020-101', '300 Tỷ VNĐ', NOW(3), NOW(3));
    

    INSERT INTO `companies` (`code`, `name`, `address`, `field`, `businessLicense`, `charterCapital`, `createdAt`, `updatedAt`)
    VALUES ('NT2_CHUOI', 'Xí nghiệp Chuối Nông Trường 2', 'Phân khu Nông trường 2, KLH Koun Mom', 'Trồng trọt & sơ chế chuối xuất khẩu', 'GPKD-NT2-2020-102', '300 Tỷ VNĐ', NOW(3), NOW(3));
    

    INSERT INTO `companies` (`code`, `name`, `address`, `field`, `businessLicense`, `charterCapital`, `createdAt`, `updatedAt`)
    VALUES ('XN_BO_THIT', 'Xí nghiệp Chăn Nuôi Bò Thịt & Bò Sinh Sản', 'Khu liên hợp trang trại chăn nuôi Bò Koun Mom', 'Chăn nuôi gia súc & chế biến TMR', 'GPKD-XNB-2021-201', '450 Tỷ VNĐ', NOW(3), NOW(3));
    

    INSERT INTO `companies` (`code`, `name`, `address`, `field`, `businessLicense`, `charterCapital`, `createdAt`, `updatedAt`)
    VALUES ('TT_BTSC_KM', 'Trung Tâm Bảo Trì Sửa Chữa Cơ Giới KLH', 'Khu xưởng kỹ thuật trung tâm Koun Mom', 'Bảo dưỡng, trung tu, đại tu MMTB', 'GPKD-SC-2020-301', '150 Tỷ VNĐ', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (1, 'USR-001', 'admin', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Nguyễn Ngọc Anh Tú', '0908123456', 'SUPER_ADMIN', 'TOAN_KLH', 'DANG_LAM_VIEC', 'HANG_B2', 'B2-7901234', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'VP Điều Hành KLH', 1, 'Ban Lãnh đạo KLH', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (2, 'USR-002', 'dat.tq', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Trần Quốc Đạt', '0908234567', 'DISPATCHER', 'BAN_CO_GIOI', 'DANG_LAM_VIEC', 'HANG_C', 'C-8812345', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Ban Xe Cơ Giới', 1, 'Trưởng Ban Cơ Giới', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (3, 'USR-003', 'im.dv', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Đào Văn Im', '0908345678', 'DISPATCHER', 'BAN_CO_GIOI', 'DANG_LAM_VIEC', 'HANG_C', 'C-8812346', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Phòng CNTT - VHS', 1, 'Chuyên viên CNTT', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (4, 'USR-004', 'long.ct', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Chau Tiểu Long', '0908456789', 'DISPATCHER', 'TOAN_KLH', 'DANG_LAM_VIEC', 'HANG_B2', 'B2-8812347', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Trung tâm Điều hành', 1, 'Điều độ viên trưởng', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (5, 'USR-005', 'gd.nt1', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Lê Văn Hùng', '0908567890', 'FARM_MANAGER', 'NT1', 'DANG_LAM_VIEC', 'HANG_B2', 'B2-8812348', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Văn phòng NT1', 1, 'Giám đốc Nông trường 1', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (6, 'USR-006', 'gd.nt2', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Phan Hoàng Nam', '0908678901', 'FARM_MANAGER', 'NT2', 'DANG_LAM_VIEC', 'HANG_B2', 'B2-8812349', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Văn phòng NT2', 1, 'Giám đốc Nông trường 2', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (7, 'USR-007', 'gd.xnbo', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Trương Đình Quý', '0908789012', 'FARM_MANAGER', 'XN_BO', 'DANG_LAM_VIEC', 'HANG_B2', 'B2-8812350', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Trại Bò Thịt Trung Tâm', 1, 'Giám đốc XN Chăn nuôi Bò', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (8, 'USR-008', 'ql.xuong', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Vũ Mạnh Hùng', '0908890123', 'WORKSHOP_MANAGER', 'TT_BTSC', 'DANG_LAM_VIEC', 'HANG_C', 'C-8812351', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Xưởng Bảo Trì BTSC', 1, 'Quản đốc Trung tâm BTSC', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (9, 'USR-009', 'kho.xangdau', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Bùi Tấn Tài', '0908901234', 'FUEL_STOREKEEPER', 'BAN_CO_GIOI', 'DANG_LAM_VIEC', 'HANG_B2', 'B2-8812352', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Kho Xăng Dầu Trung Tâm T1', 1, 'Thủ kho xăng dầu', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (10, 'TX-001', 'minh.nv', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Nguyễn Văn Minh', '0912111001', 'DRIVER', 'NT1', 'DANG_LAM_VIEC', 'BANG_MAY_NONG_NGHIEP', 'NN-1001', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Lô CN-A12 (NT1)', 1, 'Lái máy kéo cày đất', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (11, 'TX-002', 'huy.tq', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Trần Quốc Huy', '0912111002', 'DRIVER', 'NT1', 'DANG_LAM_VIEC', 'HANG_FC', 'FC-1002', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Tuyến Trục D4 -> Packhouse 2', 1, 'Lái xe tải Howo 4 chân', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (12, 'TX-003', 'nam.lh', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Lê Hoàng Nam', '0912111003', 'DRIVER', 'NT1', 'DANG_LAM_VIEC', 'BANG_MAY_NONG_NGHIEP', 'NN-1003', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Bãi xe Đội Cơ Giới 1', 1, 'Lái máy gặt & bừa Kubota', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (13, 'TX-004', 'hai.dt', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Đỗ Thanh Hải', '0912111004', 'DRIVER', 'NT1', 'DANG_LAM_VIEC', 'HANG_C', 'C-1004', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Lô CAT-C04 (NT1)', 1, 'Lái xe bồn phun tưới', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (14, 'TX-005', 'thanh.vv', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Võ Văn Thành', '0912111005', 'DRIVER', 'NT1', 'DANG_LAM_VIEC', 'HANG_C', 'C-1005', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Kho phân bón NT1', 1, 'Lái xe tải Hino 8T chở phân', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (15, 'TX-006', 'keo.sarath', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Keo Sarath', '0912111006', 'DRIVER', 'NT2', 'DANG_LAM_VIEC', 'HANG_C', 'KH-C-2001', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Lô CN-B06 (NT2)', 1, 'Lái xe ben san gạt & chở đất', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (16, 'TX-007', 'sok.phearith', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Sok Phearith', '0912111007', 'DRIVER', 'NT2', 'DANG_LAM_VIEC', 'HANG_C', 'KH-C-2002', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Packhouse 1', 1, 'Lái xe tải chở chuối', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (17, 'TX-008', 'chan.vibol', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Chan Vibol', '0912111008', 'DRIVER', 'NT2', 'DANG_LAM_VIEC', 'BANG_MAY_NONG_NGHIEP', 'KH-NN-2003', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Lô B08 (NT2)', 1, 'Lái máy kéo John Deere', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (18, 'TX-009', 'an.pq', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Phạm Quốc An', '0912111009', 'DRIVER', 'BAN_CO_GIOI', 'DANG_LAM_VIEC', 'HANG_C', 'C-3001', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Trục chính T1 (Kho dầu -> NT2)', 1, 'Lái xe téc dầu lưu động', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (19, 'TX-010', 'dat.ht', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Huỳnh Tấn Đạt', '0912111010', 'DRIVER', 'TT_BTSC', 'DANG_LAM_VIEC', 'HANG_FC', 'FC-3002', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Xưởng BTSC', 1, 'Lái xe cứu hộ kéo máy', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (20, 'TX-011', 'meng.chenda', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Meng Chenda', '0912111011', 'DRIVER', 'XN_BO', 'DANG_LAM_VIEC', 'HANG_C', 'KH-C-4001', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Lô chuối -> Trại Bò 1', 1, 'Lái xe ben chở phụ phẩm chuối', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (21, 'TX-012', 'heng.sophea', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Heng Sophea', '0912111012', 'DRIVER', 'XN_BO', 'DANG_LAM_VIEC', 'HANG_FC', 'KH-FC-4002', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Trại Bò 1 -> Trung tâm TMR', 1, 'Lái đầu kéo chở thức ăn TMR', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (22, 'TX-013', 'nguyen.duc', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Nguyễn Văn Đức', '0912111013', 'DRIVER', 'XN_BO', 'DANG_LAM_VIEC', 'BANG_MAY_NONG_NGHIEP', 'NN-4003', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Khu đồng cỏ VA06', 1, 'Lái máy cắt cỏ sinh khối', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (23, 'TX-014', 'le.vantoan', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Lê Văn Toàn', '0912111014', 'DRIVER', 'BAN_CO_GIOI', 'DANG_LAM_VIEC', 'HANG_C', 'C-5001', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'SAN_SANG', 'Bãi xe Trung Tâm', 1, 'Lái xe xúc lật nguyên liệu', NOW(3), NOW(3));
    

    INSERT INTO `users` (`id`, `code`, `username`, `passwordHash`, `fullName`, `phone`, `role`, `unit`, `employmentStatus`, `licenseClass`, `licenseNumber`, `licenseExpiryDate`, `healthCheckExpiryDate`, `currentShiftStatus`, `currentLocation`, `isActive`, `notes`, `createdAt`, `updatedAt`)
    VALUES (24, 'TX-015', 'tran.vanphong', '$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2', 'Trần Văn Phong', '0912111015', 'DRIVER', 'TT_BTSC', 'DANG_LAM_VIEC', 'BANG_MAY_NONG_NGHIEP', 'NN-5002', DATE_ADD(NOW(), INTERVAL 2 YEAR), DATE_ADD(NOW(), INTERVAL 6 MONTH), 'DANG_VAN_HANH', 'Xưởng BTSC', 1, 'Thợ máy kiêm lái thử nghiệm', NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (1, 'XC-JD-024', '70A-024.12', 'Máy kéo John Deere 6140B (140HP)', 'MAY_KEO', 'NT1', 10, 12, 'HOAT_DONG', 1450.5, 42.0, 'GREEN', 8450.0, 18.5, 13.5678, 106.8901, 'Nông trường 1 - Lô CN-A12', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (2, 'XC-KB-053', '70A-053.45', 'Máy cày Kubota M7040 (70HP)', 'MAY_CAY', 'NT1', 12, 10, 'HOAT_DONG', 2280.0, 235.0, 'AMBER', 12400.0, 11.2, 13.5712, 106.8955, 'Nông trường 1 - Lô CN-B06', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (3, 'XC-JD-031', '70A-031.88', 'Máy kéo John Deere 6120M (120HP)', 'MAY_KEO', 'NT2', 17, 15, 'HOAT_DONG', 1820.0, 15.0, 'GREEN', 9800.0, 16.8, 13.5822, 106.9102, 'Nông trường 2 - Lô B08', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (4, 'XC-NH-019', '70A-019.67', 'Máy kéo New Holland TD5.110 (110HP)', 'MAY_KEO', 'NT2', 17, 16, 'BAO_DUONG', 2560.0, 262.0, 'RED', 14200.0, 15.5, 13.554, 106.882, 'Xưởng Bảo Trì BTSC', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (5, 'XC-KB-077', '70A-077.90', 'Máy cày Kubota L5018 (50HP)', 'MAY_CAY', 'NT1', 10, 12, 'HOAT_DONG', 980.5, 80.0, 'GREEN', 5200.0, 9.5, 13.5699, 106.8877, 'Nông trường 1 - Lô CN-A05', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (6, 'MG-KB-018', '70A-018.99', 'Máy gặt đập liên hợp Kubota DC-70G', 'MAY_CAY', 'NT1', 12, 10, 'HOAT_DONG', 1120.0, 115.0, 'GREEN', 4600.0, 14.0, 13.5615, 106.879, 'Nông trường 1 - Lô SK-08', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (7, 'XX-CL-008', '70A-008.33', 'Xe xúc đào bánh xích CAT 320D2', 'XE_XUC', 'BAN_CO_GIOI', 23, 24, 'HOAT_DONG', 4120.0, 248.0, 'AMBER', 3200.0, 22.0, 13.55, 106.87, 'Kênh Thủy Lợi Koun Mom', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (8, 'XX-LG-015', '70A-015.44', 'Xe xúc lật LiuGong CLG835H (Gầu 2.0m3)', 'XE_XUC', 'XN_BO', 23, 22, 'HOAT_DONG', 3350.0, 50.0, 'GREEN', 2800.0, 18.0, 13.591, 106.925, 'Trung tâm Chế biến TMR', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (9, 'XN-TY-005', '70A-005.11', 'Xe nâng hàng Toyota 5T (Dầu)', 'XE_NANG', 'NT1', 11, 14, 'HOAT_DONG', 1950.0, 90.0, 'GREEN', 1500.0, 6.5, 13.575, 106.901, 'Packhouse 2 - Nông trường 1', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (10, 'XN-HY-012', '70A-012.22', 'Xe nâng hàng Heli 3.5T (Dầu)', 'XE_NANG', 'NT2', 16, 17, 'HOAT_DONG', 1650.0, 180.0, 'GREEN', 1200.0, 5.8, 13.585, 106.915, 'Packhouse 1 - Nông trường 2', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (11, 'XT-HW-102', '70C-102.88', 'Xe tải thùng Howo 4 chân (Trọng tải 18T)', 'XE_CONTAINER', 'NT1', 11, 14, 'HOAT_DONG', 3890.0, 120.0, 'GREEN', 84500.0, 32.5, 13.572, 106.898, 'Trục đường Trục D4 -> Packhouse 2', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (12, 'XT-HN-079', '70C-079.55', 'Xe tải Hino 500 Series (Trọng tải 8T)', 'XE_BEN', 'NT1', 14, 11, 'HOAT_DONG', 2980.0, 245.0, 'AMBER', 62000.0, 24.0, 13.568, 106.892, 'Kho phân bón NT1 -> Lô CN-B06', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (13, 'XT-HN-055', '70C-055.33', 'Xe tải Hino 300 Series (Trọng tải 5T)', 'XE_BEN', 'NT2', 16, 15, 'HOAT_DONG', 2150.0, 45.0, 'GREEN', 48000.0, 18.5, 13.58, 106.908, 'Kho Phụ liệu -> Packhouse 1', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (14, 'XB-HD-062', '70C-062.77', 'Xe ben Hyundai HD270 (Trọng tải 15T)', 'XE_BEN', 'XN_BO', 15, 20, 'HOAT_DONG', 4520.0, 275.0, 'RED', 92000.0, 34.0, 13.588, 106.919, 'Packhouse 2 -> Trại Bò Thịt 1', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (15, 'XB-HN-045', '70C-045.66', 'Xe bồn Hino téc nước tưới 15m3', 'XE_BON', 'NT1', 13, 10, 'HOAT_DONG', 2670.0, 130.0, 'GREEN', 54000.0, 26.0, 13.565, 106.885, 'Lô CAT-C04 - Nông trường 1', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (16, 'XN-DF-011', '70C-011.99', 'Xe téc cấp dầu lưu động Dongfeng 5000L', 'XE_BON', 'BAN_CO_GIOI', 18, 19, 'HOAT_DONG', 1890.0, 60.0, 'GREEN', 39000.0, 22.0, 13.56, 106.88, 'Đang tiếp dầu lưu động Lô A12', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (17, 'XT-CH-003', '70C-003.12', 'Xe cứu hộ chuyên dụng sàn trượt 8T', 'XE_BAN_TAI', 'TT_BTSC', 19, 24, 'HOAT_DONG', 1240.0, 85.0, 'GREEN', 26000.0, 20.0, 13.554, 106.882, 'Xưởng BTSC (Trực ban cứu hộ)', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (18, 'XB-TH-028', '70C-028.44', 'Xe bán tải kỹ thuật Mazda BT50', 'XE_BAN_TAI', 'BAN_CO_GIOI', 2, 3, 'HOAT_DONG', 1450.0, 110.0, 'GREEN', 52000.0, 8.5, 13.558, 106.885, 'Tuyến tuần tra Nông trường 1 & 2', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (19, 'XT-CN-091', '70C-091.66', 'Đầu kéo Shacman F3000 + Mooc Sàn TMR', 'XE_CONTAINER', 'XN_BO', 21, 20, 'HOAT_DONG', 3100.0, 70.0, 'GREEN', 71000.0, 38.0, 13.593, 106.928, 'Trại Bò 1 -> Trung tâm TMR', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `vehicles` (`id`, `code`, `plate`, `name`, `category`, `unit`, `defaultDriverId`, `secondaryDriverId`, `status`, `totalMachineHours`, `hoursSinceLastService`, `alertTier`, `odoKm`, `fuelRateStandard`, `currentLat`, `currentLng`, `currentLocationName`, `lastGpsUpdate`, `createdAt`, `updatedAt`)
    VALUES (20, 'XC-JD-088', '70A-088.19', 'Máy kéo John Deere 6140B (Số 2)', 'MAY_KEO', 'NT1', 10, 12, 'SUA_CHUA', 3200.0, 280.0, 'RED', 18500.0, 18.5, 13.554, 106.882, 'Xưởng BTSC - Đang chờ phụ tùng', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES (1, 'NC-DC-01', 'Dàn cày 3 chảo ngầm Baldan (Brazil)', 'DAN_CAY', 'NT1', 1, 'ATTACHED', 'GOOD', 'Cày lật ải sâu 40-50cm', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES (2, 'NC-DB-02', 'Dàn bừa đĩa 24 chảo phá lâm TATU', 'DAN_BUA', 'NT1', 2, 'ATTACHED', 'GOOD', 'Bừa tơi đất & san phẳng mặt ruộng', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES (3, 'NC-DX-03', 'Dàn xới xoay lên luống chuối Howard', 'DAN_XOI', 'NT2', 3, 'ATTACHED', 'GOOD', 'Tạo luống cao trồng chuối 2.5m', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES (4, 'NC-DP-04', 'Dàn phun thuốc khử trùng cánh rộng 18m', 'DAN_PHUN_THUOC', 'NT1', 5, 'ATTACHED', 'GOOD', 'Phun xử lý đất trước khi trồng', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES (5, 'NC-RM-05', 'Rơ-moóc ben nông nghiệp 8 tấn tự đổ', 'RO_MOOC', 'NT2', NULL, 'IN_DEPOT', 'GOOD', 'Vận chuyển cây giống & phân bón', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES (6, 'NC-RP-06', 'Dàn rải phân hữu cơ vi sinh 4m3', 'DAN_RAI_PHAN', 'NT1', NULL, 'IN_DEPOT', 'WORN_OUT', 'Bón lót đáy luống trồng mới', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `agricultural_implements` (`id`, `code`, `name`, `category`, `unit`, `currentVehicleId`, `status`, `technicalCondition`, `standardPurpose`, `attachedAt`, `createdAt`, `updatedAt`)
    VALUES (7, 'NC-DC-07', 'Dàn cày 4 chảo cày đất dốc đồi', 'DAN_CAY', 'BAN_CO_GIOI', NULL, 'MAINTENANCE', 'NEED_REPAIR', 'Cày đất khai hoang phân khu mới', NOW(3), NOW(3), NOW(3));
    

INSERT INTO `implement_attachment_logs` (`id`, `vehicleId`, `implementId`, `actorId`, `attachedAt`, `detachedAt`, `startWearMm`, `endWearMm`, `notes`, `createdAt`)
VALUES 
(1, 1, 1, 10, DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, 1.2, 1.8, 'Gắn dàn cày 3 chảo Baldan cày ải Lô CN-A12', NOW(3)),
(2, 2, 2, 12, DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, 0.5, 0.9, 'Gắn dàn bừa đĩa 24 chảo làm tơi đất Lô CN-B06', NOW(3)),
(3, 3, 3, 17, DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, 2.0, 2.3, 'Gắn dàn xới lên luống chuối Lô B08', NOW(3));


    INSERT INTO `production_plans` (`id`, `code`, `title`, `stage`, `unit`, `lotPlot`, `targetAreaHa`, `completedAreaHa`, `assignedVehiclesCount`, `fuelQuotaLiters`, `fuelUsedLiters`, `supervisorId`, `startDate`, `endDate`, `status`, `createdAt`, `updatedAt`)
    VALUES (1, 'KHSX-2608-01', 'Kế hoạch cày ải & làm tơi đất chuối Tuần 34 - Lô CN-A12', 'LAM_DAT', 'NT1', 'Lô CN-A12 (Thửa 01 - 04)', 48.5, 36.2, 4, 1850.0, 1420.0, 5, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 'IN_PROGRESS', NOW(3), NOW(3));
    

    INSERT INTO `production_plans` (`id`, `code`, `title`, `stage`, `unit`, `lotPlot`, `targetAreaHa`, `completedAreaHa`, `assignedVehiclesCount`, `fuelQuotaLiters`, `fuelUsedLiters`, `supervisorId`, `startDate`, `endDate`, `status`, `createdAt`, `updatedAt`)
    VALUES (2, 'KHSX-2608-02', 'Kế hoạch bón lót & lên luống trồng mới chuối Nam Mỹ - Lô CN-B06', 'TRONG_MOI', 'NT1', 'Lô CN-B06 (Thửa 01 - 06)', 62.0, 18.5, 5, 2400.0, 780.0, 5, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 'IN_PROGRESS', NOW(3), NOW(3));
    

    INSERT INTO `production_plans` (`id`, `code`, `title`, `stage`, `unit`, `lotPlot`, `targetAreaHa`, `completedAreaHa`, `assignedVehiclesCount`, `fuelQuotaLiters`, `fuelUsedLiters`, `supervisorId`, `startDate`, `endDate`, `status`, `createdAt`, `updatedAt`)
    VALUES (3, 'KHSX-2608-03', 'Kế hoạch thu hoạch chuối xuất khẩu đợt 3 - Lô CN-C01 & C02', 'THU_HOACH', 'NT2', 'Lô CN-C01 / C02', 55.0, 55.0, 6, 2100.0, 2045.0, 6, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 'COMPLETED', NOW(3), NOW(3));
    

    INSERT INTO `production_plans` (`id`, `code`, `title`, `stage`, `unit`, `lotPlot`, `targetAreaHa`, `completedAreaHa`, `assignedVehiclesCount`, `fuelQuotaLiters`, `fuelUsedLiters`, `supervisorId`, `startDate`, `endDate`, `status`, `createdAt`, `updatedAt`)
    VALUES (4, 'KHSX-2608-04', 'Kế hoạch thu hoạch bắp sinh khối TMR cho trại bò - Lô SK-08', 'THU_HOACH', 'NT1', 'Lô SK-08 (Vùng ngô sinh khối)', 32.0, 24.0, 3, 1200.0, 950.0, 7, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 'IN_PROGRESS', NOW(3), NOW(3));
    

    INSERT INTO `production_plans` (`id`, `code`, `title`, `stage`, `unit`, `lotPlot`, `targetAreaHa`, `completedAreaHa`, `assignedVehiclesCount`, `fuelQuotaLiters`, `fuelUsedLiters`, `supervisorId`, `startDate`, `endDate`, `status`, `createdAt`, `updatedAt`)
    VALUES (5, 'KHSX-2608-05', 'Kế hoạch cày rạch hàng & trồng mới đợt 4 - Nông trường 2', 'TRONG_MOI', 'NT2', 'Lô NT2-D01 -> D04', 40.0, 0.0, 3, 1600.0, 0.0, 6, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), 'PENDING', NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (1, 1, 'Thửa A12-01 (12.0 ha)', 'Cày phá gốc chuối già & lật ải', 12.0, 'HOAN_THANH', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 24.5, 450.0, 10, 1, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (2, 1, 'Thửa A12-02 (12.2 ha)', 'Cày sâu lật đất tầng dưới', 12.2, 'HOAN_THANH', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 25.0, 460.0, 10, 1, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (3, 1, 'Thửa A12-03 (12.0 ha)', 'Bừa phẳng & phay đất', 12.0, 'DANG_THUC_HIEN', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 18.0, 320.0, 12, 2, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (4, 1, 'Thửa A12-04 (12.3 ha)', 'Bừa tơi đất chờ lên luống', 12.3, 'CHUA_THUC_HIEN', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 0.0, 0.0, 12, 2, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (5, 2, 'Thửa B06-01 (10.5 ha)', 'Rải vôi & phân vi sinh đáy luống', 10.5, 'HOAN_THANH', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 16.0, 260.0, 14, 12, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (6, 2, 'Thửa B06-02 (10.0 ha)', 'Lên luống cao 40cm chuẩn bị trồng', 10.0, 'DANG_THUC_HIEN', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 12.0, 210.0, 17, 3, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (7, 2, 'Thửa B06-03 (10.5 ha)', 'Lên luống tạo rãnh thoát nước', 10.5, 'CHUA_THUC_HIEN', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 0.0, 0.0, 17, 3, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (8, 4, 'Thửa SK-08-01 (16.0 ha)', 'Gặt băm cây bắp sinh khối đưa vào sọt', 16.0, 'HOAN_THANH', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 32.0, 520.0, 12, 6, 0, NOW(3), NOW(3));
    

    INSERT INTO `production_plot_progresses` (`id`, `planId`, `plotName`, `taskName`, `areaHa`, `status`, `receivedAt`, `completedAt`, `actualMachineHours`, `actualFuelLiters`, `driverId`, `vehicleId`, `isSettledFinance`, `createdAt`, `updatedAt`)
    VALUES (9, 4, 'Thửa SK-08-02 (16.0 ha)', 'Gặt băm đợt 2 chuyển về hầm ủ TMR', 16.0, 'DANG_THUC_HIEN', DATE_SUB(NOW(), INTERVAL 3 DAY), NOW(3), 18.5, 290.0, 12, 6, 0, NOW(3), NOW(3));
    

INSERT INTO `production_audit_trails` (`id`, `planId`, `actorId`, `action`, `reason`, `approvedBy`, `timestamp`)
VALUES
(1, 1, 5, 'ĐIỀU_CHỈNH_TIẾN_ĐỘ', 'Do mưa lớn kéo dài chiều 21/08, hoãn cày thửa A12-04 sang ngày 24/08 để tránh sa lầy đất', 'Giám đốc NT1 - Lê Văn Hùng', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 2, 5, 'BỔ_SUNG_XE_CƠ_GIỚI', 'Tăng cường máy kéo John Deere XC-JD-031 để đẩy nhanh tiến độ lên luống trước đợt cấp cây giống', 'Trưởng Ban Cơ Giới - Trần Quốc Đạt', DATE_SUB(NOW(), INTERVAL 1 DAY));


    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES (1, 'LĐX-260823-001', 2, 'NT1', 'Điều máy kéo John Deere cày ải đất trồng chuối', 'Bãi xe Đội Cơ Giới 1', 'Lô CN-A12 (NT1)', 1, 10, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 'RUNNING', 0, 'Xuất phát đúng 06:30', NOW(3), NOW(3));
    

    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES (2, 'LĐX-260823-002', 2, 'NT1', 'Điều xe tải Howo chở buồng chuối về Packhouse', 'Packhouse 2', 'Lô CN-A12', 11, 11, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 'RUNNING', 0, 'Chuyến số 3 trong ngày', NOW(3), NOW(3));
    

    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES (3, 'LĐX-260823-003', 5, 'NT1', 'Điều xe bồn Hino chở nước tưới vườn ươm chuối', 'Trạm bơm Hồ Thủy Lợi', 'Lô CAT-C04', 15, 13, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 'RUNNING', 0, 'Phun tưới dặm đợt 2', NOW(3), NOW(3));
    

    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES (4, 'LĐX-260823-004', 6, 'NT2', 'Điều máy kéo Kubota bừa tơi đất lên luống', 'Bãi Cơ Giới NT2', 'Lô B08 (NT2)', 3, 17, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 'APPROVED', 0, 'Chờ bàn giao chìa khóa 08:30', NOW(3), NOW(3));
    

    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES (5, 'LĐX-260823-005', 8, 'TT_BTSC', 'Điều xe cứu hộ kéo máy kéo hỏng về xưởng', 'Xưởng BTSC', 'Lô CN-A05', 17, 19, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 'COMPLETED', 0, 'Đã kéo máy an toàn về xưởng lúc 08:15', NOW(3), NOW(3));
    

    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES (6, 'LĐX-260823-006', 9, 'BAN_CO_GIOI', 'Điều xe téc tiếp nhiên liệu lưu động trên đồng', 'Kho Xăng Dầu T1', 'Lô CN-A12 & Lô SK-08', 16, 18, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 'RUNNING', 0, 'Cấp 2.500 lít dầu cho đội máy cày', NOW(3), NOW(3));
    

    INSERT INTO `dispatch_orders` (`id`, `code`, `requesterId`, `unit`, `purpose`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `returnTime`, `status`, `isDelayed`, `notes`, `createdAt`, `updatedAt`)
    VALUES (7, 'LĐX-260823-007', 7, 'XN_BO', 'Điều xe ben Hyundai chở phụ phẩm chuối về trại bò', 'Packhouse 2', 'Trại Bò Thịt 1', 14, 15, DATE_SUB(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 4 HOUR), 'PENDING', 1, 'Cảnh báo trễ xuất phát 20 phút do chờ cân', NOW(3), NOW(3));
    

    INSERT INTO `transport_orders` (`id`, `code`, `routeType`, `cargoType`, `tonnage`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `arrivalTime`, `speedKmH`, `maxSpeedLimit`, `isRouteDeviated`, `deviationReason`, `status`, `returnCargoName`, `returnTonnage`, `returnDestination`, `returnDriverStatus`, `costSavedVnd`, `createdAt`, `updatedAt`)
    VALUES (1, 'LVC-260823-011', 'ROUND_TRIP', 'Chuối tươi xuất khẩu cắt sáng sớm', 14.2, 'Lô CN-A12', 'Packhouse 2', 11, 11, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), 28.5, 70.0, 0, NULL, 'IN_TRANSIT', 'Thùng carton đóng gói', 3.0, 'Lô CN-A12', 'RETURN_LOADED', 350000.0, NOW(3), NOW(3));
    

    INSERT INTO `transport_orders` (`id`, `code`, `routeType`, `cargoType`, `tonnage`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `arrivalTime`, `speedKmH`, `maxSpeedLimit`, `isRouteDeviated`, `deviationReason`, `status`, `returnCargoName`, `returnTonnage`, `returnDestination`, `returnDriverStatus`, `costSavedVnd`, `createdAt`, `updatedAt`)
    VALUES (2, 'LVC-260823-012', 'ONE_WAY', 'Phân bón vi sinh bón lót', 8.0, 'Kho Phân Bón Trung Tâm', 'Lô CN-B06', 12, 14, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), 24.0, 70.0, 0, NULL, 'DELIVERED', NULL, 0, NULL, 'EMPTY_DISPATCHED', 0.0, NOW(3), NOW(3));
    

    INSERT INTO `transport_orders` (`id`, `code`, `routeType`, `cargoType`, `tonnage`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `arrivalTime`, `speedKmH`, `maxSpeedLimit`, `isRouteDeviated`, `deviationReason`, `status`, `returnCargoName`, `returnTonnage`, `returnDestination`, `returnDriverStatus`, `costSavedVnd`, `createdAt`, `updatedAt`)
    VALUES (3, 'LVC-260823-013', 'ROUND_TRIP', 'Phụ phẩm chuối cắt tỉa băm nhỏ', 15.0, 'Packhouse 2', 'Trại Bò Thịt 1', 14, 15, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), 38.0, 40.0, 1, 'Chạy sai tuyến đường tránh ổ gà tại ngã 3 Kênh T2', 'DEVIATED', 'Phân bò ủ hoai bón vườn', 8.0, 'Lô CN-A12', 'RETURN_LOADED', 520000.0, NOW(3), NOW(3));
    

    INSERT INTO `transport_orders` (`id`, `code`, `routeType`, `cargoType`, `tonnage`, `origin`, `destination`, `vehicleId`, `driverId`, `departureTime`, `arrivalTime`, `speedKmH`, `maxSpeedLimit`, `isRouteDeviated`, `deviationReason`, `status`, `returnCargoName`, `returnTonnage`, `returnDestination`, `returnDriverStatus`, `costSavedVnd`, `createdAt`, `updatedAt`)
    VALUES (4, 'LVC-260823-014', 'ONE_WAY', 'Dầu Diesel DO 0.05S cấp bồn lưu động', 4.2, 'Kho Xăng Dầu T1', 'Bãi Cơ Giới NT2', 16, 18, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), 22.0, 60.0, 0, NULL, 'IN_TRANSIT', NULL, 0, NULL, 'EMPTY_DISPATCHED', 0.0, NOW(3), NOW(3));
    

    INSERT INTO `feed_raw_materials` (`id`, `name`, `groupType`, `moisturePercent`, `isCustomAdded`, `createdById`, `createdAt`, `updatedAt`)
    VALUES (1, 'Phụ phẩm chuối (thân & lá băm)', 'PHU_PHAM_CHUOI', 82.0, 0, 7, NOW(3), NOW(3));
    

    INSERT INTO `feed_raw_materials` (`id`, `name`, `groupType`, `moisturePercent`, `isCustomAdded`, `createdById`, `createdAt`, `updatedAt`)
    VALUES (2, 'Cỏ voi VA06 cắt tươi', 'CO_VOI', 75.0, 0, 7, NOW(3), NOW(3));
    

    INSERT INTO `feed_raw_materials` (`id`, `name`, `groupType`, `moisturePercent`, `isCustomAdded`, `createdById`, `createdAt`, `updatedAt`)
    VALUES (3, 'Bắp ủ chua lên men (Corn Silage)', 'TMR_VO_BEO', 65.0, 0, 7, NOW(3), NOW(3));
    

    INSERT INTO `feed_raw_materials` (`id`, `name`, `groupType`, `moisturePercent`, `isCustomAdded`, `createdById`, `createdAt`, `updatedAt`)
    VALUES (4, 'Bã bia sấy ẩm', 'BA_BIA', 70.0, 0, 7, NOW(3), NOW(3));
    

    INSERT INTO `feed_raw_materials` (`id`, `name`, `groupType`, `moisturePercent`, `isCustomAdded`, `createdById`, `createdAt`, `updatedAt`)
    VALUES (5, 'Cám viên công nghiệp THACO Feed', 'CAM_VIEN', 12.0, 0, 7, NOW(3), NOW(3));
    

    INSERT INTO `feed_raw_materials` (`id`, `name`, `groupType`, `moisturePercent`, `isCustomAdded`, `createdById`, `createdAt`, `updatedAt`)
    VALUES (6, 'Khoáng vi lượng & Premix vitamin', 'KHOANG_PREMIX', 8.0, 0, 7, NOW(3), NOW(3));
    

    INSERT INTO `internal_feed_trips` (`id`, `code`, `materialId`, `vehicleId`, `driverId`, `sourceLocation`, `transferPoint`, `destinationLocation`, `dispatchWeightTons`, `receiveWeightTons`, `weightDiffPercent`, `slaWindowStart`, `slaWindowEnd`, `departureTime`, `completedFeedTime`, `slaStatus`, `delayReason`, `receiverSignature`, `isSettled`, `createdAt`, `updatedAt`)
    VALUES (1, 'TMR-TRIP-260823-01', 1, 14, 15, 'Packhouse 2 (Nông trường 1)', 'Trạm Cân Điện Tử T1', 'Trại Bò Thịt 1 (Hầm ủ số 3)', 15.2, 14.9, 1.97, DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW(3), DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), 'ON_TIME', NULL, 'XN Chăn Nuôi Bò đã ký nhận', 1, NOW(3), NOW(3));
    

    INSERT INTO `internal_feed_trips` (`id`, `code`, `materialId`, `vehicleId`, `driverId`, `sourceLocation`, `transferPoint`, `destinationLocation`, `dispatchWeightTons`, `receiveWeightTons`, `weightDiffPercent`, `slaWindowStart`, `slaWindowEnd`, `departureTime`, `completedFeedTime`, `slaStatus`, `delayReason`, `receiverSignature`, `isSettled`, `createdAt`, `updatedAt`)
    VALUES (2, 'TMR-TRIP-260823-02', 2, 19, 21, 'Cánh đồng cỏ VA06 (Phân khu 3)', 'Trạm Cân Điện Tử T2', 'Trung tâm Chế biến TMR', 18.0, 17.8, 1.11, DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW(3), DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), 'ON_TIME', NULL, 'Thủ kho TMR đã xác nhận', 1, NOW(3), NOW(3));
    

    INSERT INTO `internal_feed_trips` (`id`, `code`, `materialId`, `vehicleId`, `driverId`, `sourceLocation`, `transferPoint`, `destinationLocation`, `dispatchWeightTons`, `receiveWeightTons`, `weightDiffPercent`, `slaWindowStart`, `slaWindowEnd`, `departureTime`, `completedFeedTime`, `slaStatus`, `delayReason`, `receiverSignature`, `isSettled`, `createdAt`, `updatedAt`)
    VALUES (3, 'TMR-TRIP-260823-03', 3, 11, 11, 'Vùng bắp sinh khối Lô SK-08', 'Trạm Cân Điện Tử T1', 'Trại Bò Sinh Sản 2', 14.5, 14.1, 2.76, DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW(3), DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(3), 'DELAYED', 'Xe bị kẹt tại trạm cân do cúp điện tạm thời', 'Tổ trưởng chuồng nuôi ký nhận', 0, NOW(3), NOW(3));
    

    INSERT INTO `fuel_warehouses` (`id`, `name`, `type`, `capacityLiters`, `currentStockLiters`, `unit`, `createdAt`, `updatedAt`)
    VALUES (1, 'Kho Xăng Dầu Trung Tâm T1 (Bồn Cố Định 45.000L)', 'STATIONARY_TANK_45000L', 45000.0, 38500.0, 'BAN_CO_GIOI', NOW(3), NOW(3));
    

    INSERT INTO `fuel_warehouses` (`id`, `name`, `type`, `capacityLiters`, `currentStockLiters`, `unit`, `createdAt`, `updatedAt`)
    VALUES (2, 'Kho Nhiên Liệu Nông Trường 1 (Bồn 45.000L)', 'STATIONARY_TANK_45000L', 45000.0, 41200.0, 'NT1', NOW(3), NOW(3));
    

    INSERT INTO `fuel_warehouses` (`id`, `name`, `type`, `capacityLiters`, `currentStockLiters`, `unit`, `createdAt`, `updatedAt`)
    VALUES (3, 'Kho Nhiên Liệu Nông Trường 2 (Bồn 45.000L)', 'STATIONARY_TANK_45000L', 45000.0, 36800.0, 'NT2', NOW(3), NOW(3));
    

    INSERT INTO `fuel_warehouses` (`id`, `name`, `type`, `capacityLiters`, `currentStockLiters`, `unit`, `createdAt`, `updatedAt`)
    VALUES (4, 'Xe Téc Nhiên Liệu Lưu Động XN-DF-011 (5.000L)', 'MOBILE_TRUCK_5000L', 5000.0, 3400.0, 'BAN_CO_GIOI', NOW(3), NOW(3));
    

    INSERT INTO `fuel_dispense_tickets` (`id`, `ticketCode`, `warehouseId`, `vehicleId`, `driverId`, `dispensedLiters`, `engineOdoHours`, `quotaLiters`, `varianceLiters`, `variancePercent`, `isExcess`, `qrCodePayload`, `operatorId`, `dispensedAt`)
    VALUES (1, 'PKX-260823-001', 1, 1, 10, 180.0, 1450.5, 175.0, 5.0, 2.86, 0, 'QR-PKX-001-XC-JD-024', 9, NOW(3));
    

    INSERT INTO `fuel_dispense_tickets` (`id`, `ticketCode`, `warehouseId`, `vehicleId`, `driverId`, `dispensedLiters`, `engineOdoHours`, `quotaLiters`, `varianceLiters`, `variancePercent`, `isExcess`, `qrCodePayload`, `operatorId`, `dispensedAt`)
    VALUES (2, 'PKX-260823-002', 1, 11, 11, 120.0, 3890.0, 115.0, 5.0, 4.35, 0, 'QR-PKX-002-XT-HW-102', 9, NOW(3));
    

    INSERT INTO `fuel_dispense_tickets` (`id`, `ticketCode`, `warehouseId`, `vehicleId`, `driverId`, `dispensedLiters`, `engineOdoHours`, `quotaLiters`, `varianceLiters`, `variancePercent`, `isExcess`, `qrCodePayload`, `operatorId`, `dispensedAt`)
    VALUES (3, 'PKX-260823-003', 2, 2, 12, 110.0, 2280.0, 95.0, 15.0, 15.79, 1, 'QR-PKX-003-XC-KB-053', 9, NOW(3));
    

    INSERT INTO `fuel_dispense_tickets` (`id`, `ticketCode`, `warehouseId`, `vehicleId`, `driverId`, `dispensedLiters`, `engineOdoHours`, `quotaLiters`, `varianceLiters`, `variancePercent`, `isExcess`, `qrCodePayload`, `operatorId`, `dispensedAt`)
    VALUES (4, 'PKX-260823-004', 3, 3, 17, 160.0, 1820.0, 160.0, 0.0, 0.0, 0, 'QR-PKX-004-XC-JD-031', 9, NOW(3));
    

    INSERT INTO `fuel_dispense_tickets` (`id`, `ticketCode`, `warehouseId`, `vehicleId`, `driverId`, `dispensedLiters`, `engineOdoHours`, `quotaLiters`, `varianceLiters`, `variancePercent`, `isExcess`, `qrCodePayload`, `operatorId`, `dispensedAt`)
    VALUES (5, 'PKX-260823-005', 4, 14, 15, 140.0, 4520.0, 120.0, 20.0, 16.67, 1, 'QR-PKX-005-XB-HD-062', 9, NOW(3));
    

    INSERT INTO `maintenance_records` (`id`, `vehicleId`, `technicianId`, `currentHours`, `hoursToNextService`, `alertTier`, `checklistJson`, `status`, `completedAt`, `createdAt`, `updatedAt`)
    VALUES (1, 1, 8, 1450.5, 208.0, 'GREEN', '{"items": [{"code": "KT01", "name": "Vệ sinh lọc gió động cơ & lọc gió cabin", "status": "PASSED"}, {"code": "KT02", "name": "Kiểm tra mức dầu nhớt động cơ & châm thêm", "status": "PASSED"}, {"code": "KT03", "name": "Bơm mỡ bôi trơn các khớp các-đăng & ắc tay lái", "status": "PASSED"}, {"code": "KT04", "name": "Kiểm tra áp suất lốp & siết lại bu lông bánh xe", "status": "PASSED"}, {"code": "KT05", "name": "Kiểm tra rò rỉ đường ống thủy lực nông cụ", "status": "WARNING"}], "signature": "Vũ Mạnh Hùng (Quản đốc xưởng)"}', 'COMPLETED', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `maintenance_records` (`id`, `vehicleId`, `technicianId`, `currentHours`, `hoursToNextService`, `alertTier`, `checklistJson`, `status`, `completedAt`, `createdAt`, `updatedAt`)
    VALUES (2, 2, 8, 2280.0, 15.0, 'AMBER', '{"items": [{"code": "KT01", "name": "Vệ sinh lọc gió động cơ & lọc gió cabin", "status": "PASSED"}, {"code": "KT02", "name": "Kiểm tra mức dầu nhớt động cơ & châm thêm", "status": "PASSED"}, {"code": "KT03", "name": "Bơm mỡ bôi trơn các khớp các-đăng & ắc tay lái", "status": "PASSED"}, {"code": "KT04", "name": "Kiểm tra áp suất lốp & siết lại bu lông bánh xe", "status": "PASSED"}, {"code": "KT05", "name": "Kiểm tra rò rỉ đường ống thủy lực nông cụ", "status": "WARNING"}], "signature": "Vũ Mạnh Hùng (Quản đốc xưởng)"}', 'SCHEDULED', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `maintenance_records` (`id`, `vehicleId`, `technicianId`, `currentHours`, `hoursToNextService`, `alertTier`, `checklistJson`, `status`, `completedAt`, `createdAt`, `updatedAt`)
    VALUES (3, 4, 8, 2560.0, -12.0, 'RED', '{"items": [{"code": "KT01", "name": "Vệ sinh lọc gió động cơ & lọc gió cabin", "status": "PASSED"}, {"code": "KT02", "name": "Kiểm tra mức dầu nhớt động cơ & châm thêm", "status": "PASSED"}, {"code": "KT03", "name": "Bơm mỡ bôi trơn các khớp các-đăng & ắc tay lái", "status": "PASSED"}, {"code": "KT04", "name": "Kiểm tra áp suất lốp & siết lại bu lông bánh xe", "status": "PASSED"}, {"code": "KT05", "name": "Kiểm tra rò rỉ đường ống thủy lực nông cụ", "status": "WARNING"}], "signature": "Vũ Mạnh Hùng (Quản đốc xưởng)"}', 'IN_SERVICE', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `maintenance_records` (`id`, `vehicleId`, `technicianId`, `currentHours`, `hoursToNextService`, `alertTier`, `checklistJson`, `status`, `completedAt`, `createdAt`, `updatedAt`)
    VALUES (4, 12, 8, 2980.0, 5.0, 'AMBER', '{"items": [{"code": "KT01", "name": "Vệ sinh lọc gió động cơ & lọc gió cabin", "status": "PASSED"}, {"code": "KT02", "name": "Kiểm tra mức dầu nhớt động cơ & châm thêm", "status": "PASSED"}, {"code": "KT03", "name": "Bơm mỡ bôi trơn các khớp các-đăng & ắc tay lái", "status": "PASSED"}, {"code": "KT04", "name": "Kiểm tra áp suất lốp & siết lại bu lông bánh xe", "status": "PASSED"}, {"code": "KT05", "name": "Kiểm tra rò rỉ đường ống thủy lực nông cụ", "status": "WARNING"}], "signature": "Vũ Mạnh Hùng (Quản đốc xưởng)"}', 'SCHEDULED', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `maintenance_records` (`id`, `vehicleId`, `technicianId`, `currentHours`, `hoursToNextService`, `alertTier`, `checklistJson`, `status`, `completedAt`, `createdAt`, `updatedAt`)
    VALUES (5, 14, 8, 4520.0, -25.0, 'RED', '{"items": [{"code": "KT01", "name": "Vệ sinh lọc gió động cơ & lọc gió cabin", "status": "PASSED"}, {"code": "KT02", "name": "Kiểm tra mức dầu nhớt động cơ & châm thêm", "status": "PASSED"}, {"code": "KT03", "name": "Bơm mỡ bôi trơn các khớp các-đăng & ắc tay lái", "status": "PASSED"}, {"code": "KT04", "name": "Kiểm tra áp suất lốp & siết lại bu lông bánh xe", "status": "PASSED"}, {"code": "KT05", "name": "Kiểm tra rò rỉ đường ống thủy lực nông cụ", "status": "WARNING"}], "signature": "Vũ Mạnh Hùng (Quản đốc xưởng)"}', 'SCHEDULED', NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `repair_tickets` (`id`, `code`, `vehicleId`, `reportedByDriverId`, `assignedTechnicianId`, `repairTier`, `issueDescription`, `isGeneratedFromMaintenance`, `maintenanceRecordId`, `status`, `estimatedCostVnd`, `actualCostVnd`, `replacedPartsJson`, `receivedDate`, `completedDate`, `createdAt`, `updatedAt`)
    VALUES (1, 'PSC-2608-001', 20, 10, 8, 'TRUNG_TU', 'Bể phốt bơm thủy lực nâng hạ nông cụ, rỉ dầu hộp số phụ', 0, NULL, 'WAITING_PARTS', 12500000.0, 0.0, '[{"partCode": "VT-LOC-01", "name": "Lọc nhớt động cơ John Deere RE504836", "qty": 1, "unit": "Cái", "priceVnd": 450000}, {"partCode": "VT-DAU-02", "name": "Dầu nhớt động cơ Delo 400 15W40", "qty": 15, "unit": "Lít", "priceVnd": 105000}, {"partCode": "VT-ONG-03", "name": "Ống tuy-ô thủy lực cao áp 2 lớp thép", "qty": 2, "unit": "Sợi", "priceVnd": 680000}]', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `repair_tickets` (`id`, `code`, `vehicleId`, `reportedByDriverId`, `assignedTechnicianId`, `repairTier`, `issueDescription`, `isGeneratedFromMaintenance`, `maintenanceRecordId`, `status`, `estimatedCostVnd`, `actualCostVnd`, `replacedPartsJson`, `receivedDate`, `completedDate`, `createdAt`, `updatedAt`)
    VALUES (2, 'PSC-2608-002', 4, 17, 8, 'TIEU_TU', 'Bảo dưỡng cấp 2 (250h) định kỳ: thay lọc dầu, lọc nhớt, vệ sinh két nước', 1, 1, 'IN_REPAIR', 4800000.0, 4650000.0, '[{"partCode": "VT-LOC-01", "name": "Lọc nhớt động cơ John Deere RE504836", "qty": 1, "unit": "Cái", "priceVnd": 450000}, {"partCode": "VT-DAU-02", "name": "Dầu nhớt động cơ Delo 400 15W40", "qty": 15, "unit": "Lít", "priceVnd": 105000}, {"partCode": "VT-ONG-03", "name": "Ống tuy-ô thủy lực cao áp 2 lớp thép", "qty": 2, "unit": "Sợi", "priceVnd": 680000}]', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `repair_tickets` (`id`, `code`, `vehicleId`, `reportedByDriverId`, `assignedTechnicianId`, `repairTier`, `issueDescription`, `isGeneratedFromMaintenance`, `maintenanceRecordId`, `status`, `estimatedCostVnd`, `actualCostVnd`, `replacedPartsJson`, `receivedDate`, `completedDate`, `createdAt`, `updatedAt`)
    VALUES (3, 'PSC-2608-003', 14, 15, 8, 'SOS_CUU_HO', 'Gãy nhíp sau lá số 3 bên phụ do chở nặng vào cung đường xấu Packhouse', 0, NULL, 'RECEIVED', 6200000.0, 0.0, '[{"partCode": "VT-LOC-01", "name": "Lọc nhớt động cơ John Deere RE504836", "qty": 1, "unit": "Cái", "priceVnd": 450000}, {"partCode": "VT-DAU-02", "name": "Dầu nhớt động cơ Delo 400 15W40", "qty": 15, "unit": "Lít", "priceVnd": 105000}, {"partCode": "VT-ONG-03", "name": "Ống tuy-ô thủy lực cao áp 2 lớp thép", "qty": 2, "unit": "Sợi", "priceVnd": 680000}]', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(3), NOW(3), NOW(3));
    

    INSERT INTO `repair_tickets` (`id`, `code`, `vehicleId`, `reportedByDriverId`, `assignedTechnicianId`, `repairTier`, `issueDescription`, `isGeneratedFromMaintenance`, `maintenanceRecordId`, `status`, `estimatedCostVnd`, `actualCostVnd`, `replacedPartsJson`, `receivedDate`, `completedDate`, `createdAt`, `updatedAt`)
    VALUES (4, 'PSC-2608-004', 6, 12, 8, 'TIEU_TU', 'Mòn lưỡi cắt máy gặt Kubota DC-70G, thay dàn dao cắt hạt', 0, NULL, 'COMPLETED', 3500000.0, 3420000.0, '[{"partCode": "VT-LOC-01", "name": "Lọc nhớt động cơ John Deere RE504836", "qty": 1, "unit": "Cái", "priceVnd": 450000}, {"partCode": "VT-DAU-02", "name": "Dầu nhớt động cơ Delo 400 15W40", "qty": 15, "unit": "Lít", "priceVnd": 105000}, {"partCode": "VT-ONG-03", "name": "Ống tuy-ô thủy lực cao áp 2 lớp thép", "qty": 2, "unit": "Sợi", "priceVnd": 680000}]', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW(3), NOW(3), NOW(3));
    

INSERT INTO `workshop_owed_part_notes` (`id`, `maintenanceRecordId`, `vehicleId`, `missingPartName`, `partCode`, `scheduledRestockDate`, `isResolved`, `resolvedAt`, `technicianNotes`, `createdAt`, `updatedAt`)
VALUES
(1, 3, 4, 'Cụm phốt bơm thủy lực chính John Deere', 'JD-SEAL-889', DATE_ADD(NOW(), INTERVAL 3 DAY), 0, NULL, 'Đã đặt hàng từ Tổng kho TP.HCM, dự kiến về Koun Mom ngày 28/08', NOW(3), NOW(3)),
(2, 2, 2, 'Lọc gió sơ cấp Kubota M7040', 'KB-FL-02', DATE_ADD(NOW(), INTERVAL 2 DAY), 0, NULL, 'Tạm thời dùng lọc cũ thổi sạch bụi tái sử dụng ngắn hạn', NOW(3), NOW(3));


    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (1, 10, '08/2026', 46, 24.5, 680.0, 24.0, 142.5, 25.0, 32.0, 25.0, 98.5, 'HANG_A', 1800000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (2, 11, '08/2026', 52, 25.0, 1850.0, 25.0, 120.0, 23.5, 45.0, 25.0, 98.5, 'HANG_A', 1800000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (3, 12, '08/2026', 38, 22.0, 420.0, 21.0, 135.0, 24.0, 15.0, 23.0, 90.0, 'HANG_B', 1200000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (4, 13, '08/2026', 40, 23.0, 850.0, 23.0, 110.0, 22.0, 20.0, 24.0, 92.0, 'HANG_A', 1500000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (5, 14, '08/2026', 32, 20.0, 1100.0, 22.0, 95.0, 20.0, -10.0, 18.0, 80.0, 'HANG_C', 500000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (6, 15, '08/2026', 44, 24.0, 1420.0, 24.0, 128.0, 24.0, 25.0, 24.5, 96.5, 'HANG_A', 1600000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (7, 16, '08/2026', 36, 21.0, 980.0, 21.5, 105.0, 21.0, 12.0, 22.5, 86.0, 'HANG_B', 1000000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_kpis` (`id`, `driverId`, `monthYear`, `tripsCount`, `tripsScore`, `distanceKm`, `distanceScore`, `machineHours`, `hoursScore`, `fuelSavedLiters`, `fuelScore`, `totalScore`, `rankGrade`, `bonusAmountVnd`, `createdAt`, `updatedAt`)
    VALUES (8, 17, '08/2026', 41, 23.5, 590.0, 23.0, 138.0, 24.5, 28.0, 24.5, 95.5, 'HANG_A', 1500000.0, NOW(3), NOW(3));
    

    INSERT INTO `driver_sos_alerts` (`id`, `driverId`, `vehicleId`, `lat`, `lng`, `lotLocation`, `emergencyType`, `photoUrl`, `description`, `status`, `createdAt`, `updatedAt`)
    VALUES (1, 10, 1, 13.5678, 106.8901, 'Lô CN-A12 (Thửa 03)', 'SA_LAY_RUONG', NULL, 'None', 'Máy kéo bị lún sâu bánh sau bên trái tại rãnh thoát nước sau cơn mưa, cần máy ủi kéo hỗ trợ', NOW(3), NOW(3));
    

    INSERT INTO `driver_sos_alerts` (`id`, `driverId`, `vehicleId`, `lat`, `lng`, `lotLocation`, `emergencyType`, `photoUrl`, `description`, `status`, `createdAt`, `updatedAt`)
    VALUES (2, 11, 11, 13.572, 106.898, 'Trục đường D4 giao kênh chính', 'THUNG_LOP', NULL, 'None', 'Bể lốp đôi bánh sau bên lái do cán phải cọc sắt, đang chở 14 tấn chuối Packhouse 2', NOW(3), NOW(3));
    

    INSERT INTO `driver_sos_alerts` (`id`, `driverId`, `vehicleId`, `lat`, `lng`, `lotLocation`, `emergencyType`, `photoUrl`, `description`, `status`, `createdAt`, `updatedAt`)
    VALUES (3, 15, 14, 13.588, 106.919, 'Đoạn đường dốc Trại Bò 1', 'HONG_MAY', NULL, 'None', 'Gãy nhíp sau lá số 3, xe nghiêng thùng không thể di chuyển an toàn', NOW(3), NOW(3));
    

    INSERT INTO `employees` (`empCode`, `fullName`, `businessUnit`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `phone`, `email`, `createdAt`, `updatedAt`)
    VALUES ('NV-001', 'Nguyễn Ngọc Anh Tú', 'Ban Tổng Giám Đốc', 'KLH Koun Mom', 'Ban Lãnh Đạo', 'Văn Phòng', 'Tổ Quản Trị', 'Phó TGĐ Thường Trực', 'Hoạt động', '0908123456', 'admin@thacoagri.vn', NOW(3), NOW(3));
    

    INSERT INTO `employees` (`empCode`, `fullName`, `businessUnit`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `phone`, `email`, `createdAt`, `updatedAt`)
    VALUES ('NV-002', 'Trần Quốc Đạt', 'Ban Ô tô Xe máy Cơ giới', 'KLH Koun Mom', 'Ban Cơ Giới', 'Đội Cơ Giới Trung Tâm', 'Tổ Kỹ Thuật', 'Trưởng Ban Cơ Giới', 'Hoạt động', '0908234567', 'dat.tq@thacoagri.vn', NOW(3), NOW(3));
    

    INSERT INTO `employees` (`empCode`, `fullName`, `businessUnit`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `phone`, `email`, `createdAt`, `updatedAt`)
    VALUES ('NV-003', 'Lê Văn Hùng', 'Xí nghiệp Chuối Nông Trường 1', 'KLH Koun Mom', 'Nông Trường 1', 'Khối Trồng Trọt', 'Tổ Canh Tác', 'Giám Đốc Nông Trường 1', 'Hoạt động', '0908567890', 'hung.lv@thacoagri.vn', NOW(3), NOW(3));
    

    INSERT INTO `employees` (`empCode`, `fullName`, `businessUnit`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `phone`, `email`, `createdAt`, `updatedAt`)
    VALUES ('NV-004', 'Vũ Mạnh Hùng', 'Trung Tâm BTSC Cơ Giới', 'KLH Koun Mom', 'Trung Tâm BTSC', 'Xưởng Cơ Khí Sửa Chữa', 'Tổ Động Lực', 'Quản Đốc Trung Tâm BTSC', 'Hoạt động', '0908890123', 'hung.vm@thacoagri.vn', NOW(3), NOW(3));
    

    INSERT INTO `employees` (`empCode`, `fullName`, `businessUnit`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `phone`, `email`, `createdAt`, `updatedAt`)
    VALUES ('NV-005', 'Nguyễn Văn Minh', 'Đội Xe Cơ Giới Nông Trường 1', 'KLH Koun Mom', 'Nông Trường 1', 'Đội Cơ Giới 1', 'Tổ Máy Kéo', 'Tài Xế Máy Kéo Trưởng', 'Hoạt động', '0912111001', 'minh.nv@thacoagri.vn', NOW(3), NOW(3));
    

    INSERT INTO `personnel_partners` (`code`, `name`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `createdAt`, `updatedAt`)
    VALUES ('DT-001', 'Công ty TNHH Thiết Bị Nông Nghiệp John Deere Việt Nam', 'KLH Koun Mom', 'Ban Cơ Giới', 'Nhà Cung Cấp MMTB', 'Bảo Trì Hãng', 'Đối Tác Kỹ Thuật & Cung Ứng Phụ Tùng', 'Hoạt động', NOW(3), NOW(3));
    

    INSERT INTO `personnel_partners` (`code`, `name`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `createdAt`, `updatedAt`)
    VALUES ('DT-002', 'Công ty CP Cơ Khí Ô Tô THACO Chu Lai', 'KLH Koun Mom', 'Trung Tâm BTSC', 'Nhà Cung Cấp Xe Chuyên Dụng', 'Đóng Thùng & Rơ Mooc', 'Đối Tác Sản Xuất Phương Tiện Vận Tải', 'Hoạt động', NOW(3), NOW(3));
    

    INSERT INTO `personnel_partners` (`code`, `name`, `complex`, `enterprise`, `farm`, `team`, `position`, `status`, `createdAt`, `updatedAt`)
    VALUES ('DT-003', 'Đại lý Xăng Dầu & Dầu Nhớt Petrolimex Cambodia', 'KLH Koun Mom', 'Kho Xăng Dầu', 'Nhà Cung Ứng Nhiên Liệu', 'Cấp Dầu DO', 'Đối Tác Cung Cấp Xăng Dầu', 'Hoạt động', NOW(3), NOW(3));
    
SET FOREIGN_KEY_CHECKS = 1;
