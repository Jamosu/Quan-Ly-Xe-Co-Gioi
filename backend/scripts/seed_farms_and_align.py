import subprocess
import sys

def seed_farms_and_align_all():
    # 1. Official farms data
    farms = [
        # --- BE01 (Xí nghiệp Chuối DP1 - 11 Nông trường = 1,411.972 ha) ---
        ("F_BE01_01", "BE01.00.01", "Nông trường DP1.1", "BE01", "Xí nghiệp Chuối DP1", 246.705, "Nguyễn Văn An", "0918.001.001"),
        ("F_BE01_02", "BE01.00.02", "Nông trường DP1.2", "BE01", "Xí nghiệp Chuối DP1", 330.306, "Trần Văn Bình", "0918.001.002"),
        ("F_BE01_03", "BE01.00.03", "Nông trường DP1.3", "BE01", "Xí nghiệp Chuối DP1", 506.965, "Lê Văn Cường", "0918.001.003"),
        ("F_BE01_04", "BE01.00.04", "Nông trường DP1.4", "BE01", "Xí nghiệp Chuối DP1", 45.120, "Phạm Văn Dũng", "0918.001.004"),
        ("F_BE01_05", "BE01.00.05", "Nông trường DP1.5", "BE01", "Xí nghiệp Chuối DP1", 38.250, "Hoàng Văn Em", "0918.001.005"),
        ("F_BE01_06", "BE01.00.06", "Nông trường DP1.6", "BE01", "Xí nghiệp Chuối DP1", 52.400, "Vũ Văn Giang", "0918.001.006"),
        ("F_BE01_07", "BE01.00.07", "Nông trường DP1.7", "BE01", "Xí nghiệp Chuối DP1", 41.150, "Đỗ Văn Hùng", "0918.001.007"),
        ("F_BE01_08", "BE01.00.08", "Nông trường DP1.8", "BE01", "Xí nghiệp Chuối DP1", 35.800, "Bùi Văn Khang", "0918.001.008"),
        ("F_BE01_09", "BE01.00.09", "Nông trường DP1.9", "BE01", "Xí nghiệp Chuối DP1", 42.600, "Ngô Văn Long", "0918.001.009"),
        ("F_BE01_10", "BE01.00.10", "Nông trường DP1.10", "BE01", "Xí nghiệp Chuối DP1", 37.276, "Đinh Văn Minh", "0918.001.010"),
        ("F_BE01_11", "BE01.00.11", "Nông trường DP1.11", "BE01", "Xí nghiệp Chuối DP1", 35.400, "Mai Văn Nam", "0918.001.011"),

        # --- BE02 (Xí nghiệp Chuối DP2 - 3 Nông trường = 1,050 ha) ---
        ("F_BE02_01", "BE02.00.01", "Nông trường DP2.1", "BE02", "Xí nghiệp Chuối DP2", 350.0, "Lý Quốc Cường", "0918.002.001"),
        ("F_BE02_02", "BE02.00.02", "Nông trường DP2.2", "BE02", "Xí nghiệp Chuối DP2", 350.0, "Phan Văn Phát", "0918.002.002"),
        ("F_BE02_03", "BE02.00.03", "Nông trường DP2.3", "BE02", "Xí nghiệp Chuối DP2", 350.0, "Trịnh Văn Quân", "0918.002.003"),

        # --- BE03 (Xí nghiệp Chuối DP3 - 3 Nông trường = 1,050 ha) ---
        ("F_BE03_01", "BE03.00.01", "Nông trường DP3.1", "BE03", "Xí nghiệp Chuối DP3", 350.0, "Romas Hot", "0918.003.001"),
        ("F_BE03_02", "BE03.00.02", "Nông trường DP3.2", "BE03", "Xí nghiệp Chuối DP3", 350.0, "Vũ Văn Sang", "0918.003.002"),
        ("F_BE03_03", "BE03.00.03", "Nông trường DP3.3", "BE03", "Xí nghiệp Chuối DP3", 350.0, "Đoàn Văn Tài", "0918.003.003"),

        # --- BE04 (Xí nghiệp chuối LP1 - 3 Nông trường = 980 ha) ---
        ("F_BE04_01", "BE04.00.01", "Nông trường LP1.1", "BE04", "Xí nghiệp chuối LP1", 330.0, "Trần Văn Khương", "0918.004.001"),
        ("F_BE04_02", "BE04.00.02", "Nông trường LP1.2", "BE04", "Xí nghiệp chuối LP1", 330.0, "Nguyễn Văn Uy", "0918.004.002"),
        ("F_BE04_03", "BE04.00.03", "Nông trường LP1.3", "BE04", "Xí nghiệp chuối LP1", 320.0, "Hoàng Văn Vinh", "0918.004.003"),

        # --- BE05 (Xí nghiệp chuối LP3 - 3 Nông trường = 950 ha) ---
        ("F_BE05_01", "BE05.00.01", "Nông trường LP3.1", "BE05", "Xí nghiệp chuối LP3", 320.0, "Phan Bảo Long", "0918.005.001"),
        ("F_BE05_02", "BE05.00.02", "Nông trường LP3.2", "BE05", "Xí nghiệp chuối LP3", 320.0, "Lê Văn Xuân", "0918.005.002"),
        ("F_BE05_03", "BE05.00.03", "Nông trường LP3.3", "BE05", "Xí nghiệp chuối LP3", 310.0, "Trần Văn Yên", "0918.005.003"),

        # --- CAT_DP (Xí nghiệp Cây ăn trái Daun Penh - 3 Nông trường = 1,450 ha) ---
        ("F_CAT_01", "CAT_DP.01", "Nông trường Sầu riêng DP", "CAT_DP", "Xí nghiệp Cây ăn trái Daun Penh", 500.0, "Nguyễn Văn Hải", "0918.006.001"),
        ("F_CAT_02", "CAT_DP.02", "Nông trường Xoài & Bưởi DP", "CAT_DP", "Xí nghiệp Cây ăn trái Daun Penh", 500.0, "Tô Thành Thứ", "0918.006.002"),
        ("F_CAT_03", "CAT_DP.03", "Nông trường Chuối & Mít DP", "CAT_DP", "Xí nghiệp Cây ăn trái Daun Penh", 450.0, "Bùi Văn An", "0918.006.003"),

        # --- NM_NHUA_XOP (350 ha) ---
        ("F_NM_01", "NM_NX.01", "Cụm Nhà xưởng Nhựa Xốp DP", "NM_NHUA_XOP", "Nhà máy Nhựa - Xốp Daun Penh", 350.0, "Đỗ Quang Hưng", "0918.007.001"),

        # --- XN_BO_AD (4 Trại/Nông trường = 2,200 ha) ---
        ("F_BO_AD_01", "BO_AD.01", "Trại bò thịt Andong Meas 1", "XN_BO_AD", "Xí nghiệp Chăn nuôi Bò Andong Meas", 600.0, "Vũ Quốc Toàn", "0918.008.001"),
        ("F_BO_AD_02", "BO_AD.02", "Trại bò thịt Andong Meas 2", "XN_BO_AD", "Xí nghiệp Chăn nuôi Bò Andong Meas", 600.0, "Lê Đình Chiến", "0918.008.002"),
        ("F_BO_AD_03", "BO_AD.03", "Trại bò giống Andong Meas", "XN_BO_AD", "Xí nghiệp Chăn nuôi Bò Andong Meas", 500.0, "Trần Văn Đại", "0918.008.003"),
        ("F_BO_AD_04", "BO_AD.04", "Vùng đồng cỏ chăn thả AD", "XN_BO_AD", "Xí nghiệp Chăn nuôi Bò Andong Meas", 500.0, "Phạm Văn Giang", "0918.008.004"),

        # --- XN_CHUOI_DP4 (3 Nông trường = 1,120 ha) ---
        ("F_DP4_01", "DP4.01", "Nông trường DP4.1", "XN_CHUOI_DP4", "Xí nghiệp Chuối 4 (DP4)", 400.0, "Nguyễn Thế Hậu", "0918.009.001"),
        ("F_DP4_02", "DP4.02", "Nông trường DP4.2", "XN_CHUOI_DP4", "Xí nghiệp Chuối 4 (DP4)", 400.0, "Trần Văn Hưng", "0918.009.002"),
        ("F_DP4_03", "DP4.03", "Nông trường DP4.3", "XN_CHUOI_DP4", "Xí nghiệp Chuối 4 (DP4)", 320.0, "Lê Văn Khoa", "0918.009.003"),

        # --- XN_CHUOI_LP2 (3 Nông trường = 960 ha) ---
        ("F_LP2_01", "LP2.01", "Nông trường LP2.1", "XN_CHUOI_LP2", "Xí nghiệp Chuối Lumphat 2 (LP2)", 320.0, "Phạm Thành Đạt", "0918.010.001"),
        ("F_LP2_02", "LP2.02", "Nông trường LP2.2", "XN_CHUOI_LP2", "Xí nghiệp Chuối Lumphat 2 (LP2)", 320.0, "Nguyễn Văn Lợi", "0918.010.002"),
        ("F_LP2_03", "LP2.03", "Nông trường LP2.3", "XN_CHUOI_LP2", "Xí nghiệp Chuối Lumphat 2 (LP2)", 320.0, "Hoàng Văn Mạnh", "0918.010.003"),

        # --- SNOUL ENTERPRISES ---
        ("F_BE06_01", "BE06.01", "Nông trường Chuối ERC 1", "BE06", "Xí nghiệp Chuối ERC", 400.0, "Bùi Thanh Liêm", "0918.222.011"),
        ("F_BE06_02", "BE06.02", "Nông trường Chuối ERC 2", "BE06", "Xí nghiệp Chuối ERC", 400.0, "Vũ Văn Nghiêm", "0918.222.012"),
        ("F_BE06_03", "BE06.03", "Nông trường Chuối ERC 3", "BE06", "Xí nghiệp Chuối ERC", 300.0, "Đỗ Văn Oanh", "0918.222.013"),

        ("F_BE07_01", "BE07.01", "Nông trường Chuối BP1.1", "BE07", "Xí nghiệp Chuối BP1", 400.0, "Nguyễn Văn Đạt", "0918.222.021"),
        ("F_BE07_02", "BE07.02", "Nông trường Chuối BP1.2", "BE07", "Xí nghiệp Chuối BP1", 400.0, "Lê Văn Phúc", "0918.222.022"),
        ("F_BE07_03", "BE07.03", "Nông trường Chuối BP1.3", "BE07", "Xí nghiệp Chuối BP1", 350.0, "Trần Văn Quân", "0918.222.023"),

        ("F_BE08_01", "BE08.01", "Nông trường Chuối BP2.1", "BE08", "Xí nghiệp Chuối BP2", 400.0, "Phạm Minh Tuấn", "0918.222.031"),
        ("F_BE08_02", "BE08.02", "Nông trường Chuối BP2.2", "BE08", "Xí nghiệp Chuối BP2", 400.0, "Hoàng Văn Rạng", "0918.222.032"),
        ("F_BE08_03", "BE08.03", "Nông trường Chuối BP2.3", "BE08", "Xí nghiệp Chuối BP2", 400.0, "Nguyễn Văn Sơn", "0918.222.033"),

        ("F_BE09_01", "BE09.01", "Nông trường Chuối BP3.1", "BE09", "Xí nghiệp Chuối BP3", 350.0, "Trương Hoàng Nam", "0918.222.041"),
        ("F_BE09_02", "BE09.02", "Nông trường Chuối BP3.2", "BE09", "Xí nghiệp Chuối BP3", 350.0, "Lý Văn Tấn", "0918.222.042"),
        ("F_BE09_03", "BE09.03", "Nông trường Chuối BP3.3", "BE09", "Xí nghiệp Chuối BP3", 350.0, "Vũ Văn Uy", "0918.222.043"),

        ("F_BE10_01", "BE10.01", "Nông trường Chuối BSA1.1", "BE10", "Xí nghiệp chuối BSA1", 450.0, "Tô Quang Vũ", "0918.222.051"),
        ("F_BE10_02", "BE10.02", "Nông trường Chuối BSA1.2", "BE10", "Xí nghiệp chuối BSA1", 450.0, "Bùi Văn Vương", "0918.222.052"),
        ("F_BE10_03", "BE10.03", "Nông trường Chuối BSA1.3", "BE10", "Xí nghiệp chuối BSA1", 420.0, "Đỗ Văn Xuân", "0918.222.053"),

        ("F_BE11_01", "BE11.01", "Nông trường Chuối BSA2.1", "BE11", "Xí nghiệp chuối BSA2", 450.0, "Lê Minh Hải", "0918.222.061"),
        ("F_BE11_02", "BE11.02", "Nông trường Chuối BSA2.2", "BE11", "Xí nghiệp chuối BSA2", 450.0, "Phan Văn Ý", "0918.222.062"),
        ("F_BE11_03", "BE11.03", "Nông trường Chuối BSA2.3", "BE11", "Xí nghiệp chuối BSA2", 350.0, "Trần Văn An", "0918.222.063"),

        ("F_BO_SN_01", "BO_SN.01", "Trại bò thịt Snoul 1", "XN_BO_SN", "Xí nghiệp Chăn nuôi Bò Snoul", 700.0, "Lê Văn Thắng", "0918.222.071"),
        ("F_BO_SN_02", "BO_SN.02", "Trại bò thịt Snoul 2", "XN_BO_SN", "Xí nghiệp Chăn nuôi Bò Snoul", 700.0, "Nguyễn Văn Bảo", "0918.222.072"),
        ("F_BO_SN_03", "BO_SN.03", "Trại bò giống Snoul", "XN_BO_SN", "Xí nghiệp Chăn nuôi Bò Snoul", 600.0, "Hoàng Văn Cảnh", "0918.222.073"),
        ("F_BO_SN_04", "BO_SN.04", "Đồng cỏ chăn thả Snoul", "XN_BO_SN", "Xí nghiệp Chăn nuôi Bò Snoul", 500.0, "Phạm Văn Dân", "0918.222.074"),

        ("F_CS_SN_01", "CS_SN.01", "Nông trường Cao su Snoul 1", "XN_CS_SN", "Xí nghiệp Cao su Snoul", 800.0, "Trần Văn Sơn", "0918.222.081"),
        ("F_CS_SN_02", "CS_SN.02", "Nông trường Cao su Snoul 2", "XN_CS_SN", "Xí nghiệp Cao su Snoul", 800.0, "Lê Văn Giang", "0918.222.082"),
        ("F_CS_SN_03", "CS_SN.03", "Nông trường Cao su Snoul 3", "XN_CS_SN", "Xí nghiệp Cao su Snoul", 800.0, "Đỗ Văn Hải", "0918.222.083"),
        ("F_CS_SN_04", "CS_SN.04", "Nông trường Cao su Snoul 4", "XN_CS_SN", "Xí nghiệp Cao su Snoul", 800.0, "Vũ Văn Kiên", "0918.222.084"),

        # --- NAM LÀO ENTERPRISES ---
        ("F_BE13_01", "BE13.01", "Nông trường Chuối NSA 1", "BE13", "Xí nghiệp chuối NSA", 500.0, "Đoàn Hữu Phước", "0918.333.011"),
        ("F_BE13_02", "BE13.02", "Nông trường Chuối NSA 2", "BE13", "Xí nghiệp chuối NSA", 500.0, "Nguyễn Văn Long", "0918.333.012"),
        ("F_BE13_03", "BE13.03", "Nông trường Chuối NSA 3", "BE13", "Xí nghiệp chuối NSA", 400.0, "Trần Văn Nam", "0918.333.013"),

        ("F_BE14_01", "BE14.01", "Nông trường Chuối NK1.1", "BE14", "Xí nghiệp chuối NK1", 500.0, "Nguyễn Anh Trinh", "0918.333.021"),
        ("F_BE14_02", "BE14.02", "Nông trường Chuối NK1.2", "BE14", "Xí nghiệp chuối NK1", 500.0, "Lê Văn Phúc", "0918.333.022"),
        ("F_BE14_03", "BE14.03", "Nông trường Chuối NK1.3", "BE14", "Xí nghiệp chuối NK1", 450.0, "Hoàng Văn Quân", "0918.333.023"),

        ("F_BE15_01", "BE15.01", "Nông trường Chuối PV 1", "BE15", "Xí nghiệp Chuối PV", 400.0, "Nguyễn Thế Hậu", "0918.333.031"),
        ("F_BE15_02", "BE15.02", "Nông trường Chuối PV 2", "BE15", "Xí nghiệp Chuối PV", 400.0, "Phạm Văn Sơn", "0918.333.032"),
        ("F_BE15_03", "BE15.03", "Nông trường Chuối PV 3", "BE15", "Xí nghiệp Chuối PV", 400.0, "Vũ Văn Toàn", "0918.333.033"),

        ("F_G02_01", "G02.01", "Nông trường Dứa Nam Lào", "G02.BE", "Ban SXTT Chuối, Dứa, Mía", 400.0, "Hoàng Quốc Việt", "0918.333.041"),
        ("F_G02_02", "G02.02", "Nông trường Mía Nam Lào", "G02.BE", "Ban SXTT Chuối, Dứa, Mía", 400.0, "Đặng Văn Uy", "0918.333.042"),

        ("F_G06_01", "G06.01", "Vườn ươm Chuối Mô Nam Lào", "G06.21", "Ban KT trồng trọt chuối", 250.0, "Trần Đình Quân", "0918.333.051"),
        ("F_G06_02", "G06.02", "Khu Khảo nghiệm Giống Chuối", "G06.21", "Ban KT trồng trọt chuối", 250.0, "Bùi Văn Vinh", "0918.333.052"),

        ("F_BO_NL_01", "BO_NL.01", "Trại bò thịt Nam Lào 1", "XN_BO_NL", "Xí nghiệp Chăn nuôi Bò Nam Lào", 800.0, "Nguyễn Hữu Nam", "0918.333.061"),
        ("F_BO_NL_02", "BO_NL.02", "Trại bò thịt Nam Lào 2", "XN_BO_NL", "Xí nghiệp Chăn nuôi Bò Nam Lào", 800.0, "Lê Văn Xuân", "0918.333.062"),
        ("F_BO_NL_03", "BO_NL.03", "Trại bò giống Nam Lào", "XN_BO_NL", "Xí nghiệp Chăn nuôi Bò Nam Lào", 600.0, "Trịnh Văn Yên", "0918.333.063"),
        ("F_BO_NL_04", "BO_NL.04", "Vùng đồng cỏ chăn thả Nam Lào", "XN_BO_NL", "Xí nghiệp Chăn nuôi Bò Nam Lào", 600.0, "Đỗ Văn An", "0918.333.064"),
    ]

    sql_statements = [
        "USE thaco_agri_qlxcg;",
        "SET NAMES utf8mb4;",
        "DELETE FROM catalogs WHERE type = 'FARM';"
    ]

    for f in farms:
        id_val, code, name, p_code, p_name, area, manager, phone = f
        sql = f"""
        INSERT INTO catalogs (id, code, name, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('{id_val}', '{code}', '{name}', '{p_code}', '{p_name}', 'FARM', {area}, '{manager}', '{phone}', 'HOAT_DONG', NOW(), NOW());
        """
        sql_statements.append(sql)

    # 2. Update Enterprise AreaHa = SUM(FARM AreaHa) for every enterprise that has farms
    update_ent_sql = """
    -- Update enterprise areas to match child farms
    UPDATE catalogs e
    JOIN (
        SELECT parentCode, SUM(areaHa) AS total_farm_area
        FROM catalogs
        WHERE type = 'FARM'
        GROUP BY parentCode
    ) f ON e.code = f.parentCode
    SET e.areaHa = f.total_farm_area
    WHERE e.type = 'ENTERPRISE';

    -- Also sync duplicate aliases if any
    UPDATE catalogs SET areaHa = 1411.972 WHERE code = 'XN_CHUOI_DP1';
    """
    sql_statements.append(update_ent_sql)

    # 3. Update Complex AreaHa = SUM(ENTERPRISE AreaHa)
    update_complex_sql = """
    -- Update complex areas to match child enterprises
    UPDATE catalogs c
    JOIN (
        SELECT parentCode, SUM(areaHa) AS total_ent_area
        FROM catalogs
        WHERE type = 'ENTERPRISE'
        GROUP BY parentCode
    ) e ON c.code = e.parentCode
    SET c.areaHa = e.total_ent_area
    WHERE c.type = 'COMPLEX';
    """
    sql_statements.append(update_complex_sql)

    with open("d:/ThacoAgri_Code/Mockup/backend/scripts/seed_farms_and_align.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    res = subprocess.run([
        r"C:\xampp\mysql\bin\mysql.exe",
        "-u", "root",
        "--default-character-set=utf8mb4",
        "-e", "source d:/ThacoAgri_Code/Mockup/backend/scripts/seed_farms_and_align.sql"
    ], capture_output=True)

    print("SQL execution result:")
    if res.returncode == 0:
        print("Success!")
    else:
        print(res.stderr.decode('utf-8', errors='replace'))

if __name__ == "__main__":
    seed_farms_and_align_all()
