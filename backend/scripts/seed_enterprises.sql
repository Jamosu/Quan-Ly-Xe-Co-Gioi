USE thaco_agri_qlxcg;

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE01', 'BE01', 'Xí nghiệp Chuối DP1', 'Vùng Daun Penh, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1100, 'Vũ Đức Thịnh', '0918.111.001', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE02', 'BE02', 'Xí nghiệp Chuối DP2', 'Vùng Daun Penh, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1050, 'Lý Quốc Cường', '0918.111.002', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE03', 'BE03', 'Xí nghiệp Chuối DP3', 'Vùng Daun Penh, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1050, 'Romas Hot', '0918.111.003', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE04', 'BE04', 'Xí nghiệp chuối LP1', 'Vùng Lumphat, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 980, 'Trần Văn Khương', '0918.111.004', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE05', 'BE05', 'Xí nghiệp chuối LP3', 'Vùng Lumphat, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 950, 'Phan Bảo Long', '0918.111.005', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('CAT_DP', 'CAT_DP', 'Xí nghiệp Cây ăn trái Daun Penh', 'Vùng Cây ăn trái DP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1450, 'Nguyễn Văn Hải', '0918.111.006', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('NM_NHUA_XOP', 'NM_NHUA_XOP', 'Nhà máy Nhựa - Xốp Daun Penh', 'Cụm Công nghiệp DP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 350, 'Đỗ Quang Hưng', '0918.111.007', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_BO_AD', 'XN_BO_AD', 'Xí nghiệp Chăn nuôi Bò Andong Meas', 'Trại bò Andong Meas, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 2200, 'Vũ Quốc Toàn', '0918.111.008', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CHUOI_DP1', 'XN_CHUOI_DP1', 'Xí nghiệp Chuối 1 (DP1)', 'Nông trường Chuối 1 DP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1100, 'Vũ Đức Thịnh', '0918.111.001', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CHUOI_DP2', 'XN_CHUOI_DP2', 'Xí nghiệp Chuối 2 (DP2)', 'Nông trường Chuối 2 DP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1050, 'Lý Quốc Cường', '0918.111.002', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CHUOI_DP3', 'XN_CHUOI_DP3', 'Xí nghiệp Chuối 3 (DP3)', 'Nông trường Chuối 3 DP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1050, 'Romas Hot', '0918.111.003', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CHUOI_DP4', 'XN_CHUOI_DP4', 'Xí nghiệp Chuối 4 (DP4)', 'Nông trường Chuối 4 DP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 1120, 'Nguyễn Thế Hậu', '0918.111.009', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CHUOI_LP1', 'XN_CHUOI_LP1', 'Xí nghiệp Chuối Lumphat 1 (LP1)', 'Nông trường Chuối 1 LP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 980, 'Trần Văn Khương', '0918.111.004', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CHUOI_LP2', 'XN_CHUOI_LP2', 'Xí nghiệp Chuối Lumphat 2 (LP2)', 'Nông trường Chuối 2 LP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 960, 'Phạm Thành Đạt', '0918.111.010', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CHUOI_LP3', 'XN_CHUOI_LP3', 'Xí nghiệp Chuối Lumphat 3 (LP3)', 'Nông trường Chuối 3 LP, KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'ENTERPRISE', 950, 'Phan Bảo Long', '0918.111.005', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE06', 'BE06', 'Xí nghiệp Chuối ERC', 'Vùng ERC, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 1100, 'Bùi Thanh Liêm', '0918.222.001', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE07', 'BE07', 'Xí nghiệp Chuối BP1', 'Vùng BP, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 1150, 'Nguyễn Văn Đạt', '0918.222.002', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE08', 'BE08', 'Xí nghiệp Chuối BP2', 'Vùng BP, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 1200, 'Phạm Minh Tuấn', '0918.222.003', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE09', 'BE09', 'Xí nghiệp Chuối BP3', 'Vùng BP, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 1050, 'Trương Hoàng Nam', '0918.222.004', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE10', 'BE10', 'Xí nghiệp chuối BSA1', 'Vùng BSA, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 1320, 'Tô Quang Vũ', '0918.222.005', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE11', 'BE11', 'Xí nghiệp chuối BSA2', 'Vùng BSA, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 1250, 'Lê Minh Hải', '0918.222.006', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_BO_SN', 'XN_BO_SN', 'Xí nghiệp Chăn nuôi Bò Snoul', 'Khu chăn nuôi Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 2500, 'Lê Văn Thắng', '0918.222.007', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_CS_SN', 'XN_CS_SN', 'Xí nghiệp Cao su Snoul', 'Nông trường Cao su Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'ENTERPRISE', 3200, 'Trần Văn Sơn', '0918.222.008', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE13', 'BE13', 'Xí nghiệp chuối NSA', 'Vùng NSA, Sanxay, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'ENTERPRISE', 1400, 'Đoàn Hữu Phước', '0918.333.001', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE14', 'BE14', 'Xí nghiệp chuối NK1', 'Vùng NK, Sanxay, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'ENTERPRISE', 1450, 'Nguyễn Anh Trinh', '0918.333.002', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('BE15', 'BE15', 'Xí nghiệp Chuối PV', 'Vùng Phouvong, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'ENTERPRISE', 1200, 'Nguyễn Thế Hậu', '0918.333.003', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('G02.BE', 'G02.BE', 'Ban SXTT Chuối, Dứa, Mía', 'Khu chuyên canh cây trồng, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'ENTERPRISE', 800, 'Hoàng Quốc Việt', '0918.333.004', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('G06.21', 'G06.21', 'Ban KT trồng trọt chuối', 'Khu kỹ thuật nông nghiệp, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'ENTERPRISE', 500, 'Trần Đình Quân', '0918.333.005', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('XN_BO_NL', 'XN_BO_NL', 'Xí nghiệp Chăn nuôi Bò Nam Lào', 'Trại bò Attapeu, Nam Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'ENTERPRISE', 2800, 'Nguyễn Hữu Nam', '0918.333.006', 'HOAT_DONG', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            code = VALUES(code),
            name = VALUES(name),
            address = VALUES(address),
            parentCode = VALUES(parentCode),
            parentName = VALUES(parentName),
            type = 'ENTERPRISE',
            areaHa = VALUES(areaHa),
            managerName = VALUES(managerName),
            phone = VALUES(phone),
            status = 'HOAT_DONG',
            updatedAt = NOW();
        