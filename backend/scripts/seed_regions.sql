USE thaco_agri_qlxcg;
SET NAMES utf8mb4;
DELETE FROM catalogs WHERE type = 'REGION';

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_DP', 'DP', 'Khu vực Daun Penh (DP)', 'Vùng Daun Penh, Tỉnh Ratanakiri, Campuchia', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'REGION', 'Ban Giám đốc KV Daun Penh', '0918.111.001', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_LP', 'LP', 'Khu vực Lumphat (LP)', 'Vùng Lumphat, Tỉnh Ratanakiri, Campuchia', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'REGION', 'Ban Giám đốc KV Lumphat', '0918.111.004', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_AD', 'AD', 'Khu vực Andong Meas (AD)', 'Vùng Andong Meas, Tỉnh Ratanakiri, Campuchia', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'REGION', 'Ban Giám đốc KV Andong Meas', '0918.111.008', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_KM', 'KLH', 'Khu vực Văn phòng KLH Koun Mom (KLH)', 'Trung tâm điều hành KLH Koun Mom', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'REGION', 'Ban Giám đốc KLH Koun Mom', '0918.111.000', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_BP', 'BP', 'Khu vực Snoul BP (BP)', 'Vùng BP, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'REGION', 'Ban Giám đốc KV BP', '0918.222.002', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_BSA', 'BSA', 'Khu vực Snoul BSA (BSA)', 'Vùng BSA, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'REGION', 'Ban Giám đốc KV BSA', '0918.222.005', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_ERC', 'ERC', 'Khu vực Snoul ERC (ERC)', 'Vùng ERC, Huyện Snoul, Tỉnh Kratie', 'SNOUL', 'Khu liên hợp Snoul', 'REGION', 'Ban Giám đốc KV ERC', '0918.222.001', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_SN', 'SN', 'Khu vực Văn phòng KLH Snoul (SN)', 'Trung tâm điều hành KLH Snoul', 'SNOUL', 'Khu liên hợp Snoul', 'REGION', 'Ban Giám đốc KLH Snoul', '0918.222.000', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_NSA', 'NSA', 'Khu vực Sanxay NSA (NSA)', 'Vùng NSA, Sanxay, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'REGION', 'Ban Giám đốc KV NSA', '0918.333.001', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_NK', 'NK', 'Khu vực Sanxay NK (NK)', 'Vùng NK, Sanxay, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'REGION', 'Ban Giám đốc KV NK', '0918.333.002', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_PV', 'PV', 'Khu vực Phouvong (PV)', 'Vùng Phouvong, Attapeu, Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'REGION', 'Ban Giám đốc KV PV', '0918.333.003', 'HOAT_DONG', NOW(), NOW());
        

        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('KV_NL', 'NL', 'Khu vực Văn phòng KLH Nam Lào (NL)', 'Trung tâm điều hành KLH Nam Lào', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'REGION', 'Ban Giám đốc KLH Nam Lào', '0918.333.000', 'HOAT_DONG', NOW(), NOW());
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'BE01' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'BE02' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'BE03' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'CAT_DP' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'NM_NHUA_XOP' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'XN_CHUOI_DP1' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'XN_CHUOI_DP2' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'XN_CHUOI_DP3' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'DP'
        WHERE code = 'XN_CHUOI_DP4' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'LP'
        WHERE code = 'BE04' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'LP'
        WHERE code = 'BE05' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'LP'
        WHERE code = 'XN_CHUOI_LP1' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'LP'
        WHERE code = 'XN_CHUOI_LP2' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'LP'
        WHERE code = 'XN_CHUOI_LP3' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'AD'
        WHERE code = 'XN_BO_AD' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'ERC'
        WHERE code = 'BE06' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'BP'
        WHERE code = 'BE07' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'BP'
        WHERE code = 'BE08' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'BP'
        WHERE code = 'BE09' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'BSA'
        WHERE code = 'BE10' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'BSA'
        WHERE code = 'BE11' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'SN'
        WHERE code = 'XN_BO_SN' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'SN'
        WHERE code = 'XN_CS_SN' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'NSA'
        WHERE code = 'BE13' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'NK'
        WHERE code = 'BE14' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'PV'
        WHERE code = 'BE15' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'NL'
        WHERE code = 'G02.BE' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'NL'
        WHERE code = 'G06.21' AND type = 'ENTERPRISE';
        

        UPDATE catalogs 
        SET description = 'NL'
        WHERE code = 'XN_BO_NL' AND type = 'ENTERPRISE';
        