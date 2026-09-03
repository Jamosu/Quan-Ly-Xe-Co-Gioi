
    USE thaco_agri_qlxcg;
    SET NAMES utf8mb4;

    UPDATE catalogs SET
        name = 'Khu liên hợp Koun Mom',
        managerName = 'Ban Quản lý KLH Koun Mom',
        phone = '0912.334.556',
        address = 'Huyện Koun Mom, Tỉnh Ratanakiri, Campuchia',
        areaHa = 16340,
        status = 'HOAT_DONG',
        updatedAt = NOW()
    WHERE code = 'KOUN_MOM' AND type = 'COMPLEX';

    UPDATE catalogs SET
        name = 'Khu liên hợp Snoul',
        managerName = 'Ban Quản lý KLH Snoul',
        phone = '0903.345.678',
        address = 'Huyện Snoul, Tỉnh Kratie, Campuchia',
        areaHa = 12770,
        status = 'HOAT_DONG',
        updatedAt = NOW()
    WHERE code = 'SNOUL' AND type = 'COMPLEX';

    UPDATE catalogs SET
        name = 'Khu liên hợp Nam Lào',
        managerName = 'Ban Quản lý KLH Nam Lào',
        phone = '+856 20 555 8888',
        address = 'Tỉnh Attapeu, Nước CHDCND Lào',
        areaHa = 8150,
        status = 'HOAT_DONG',
        updatedAt = NOW()
    WHERE code = 'NAM_LAO' AND type = 'COMPLEX';

    SELECT code, name, managerName, phone, areaHa, status FROM catalogs WHERE type = 'COMPLEX';
    