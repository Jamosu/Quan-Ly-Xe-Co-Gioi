import subprocess
import sys

def run():
    enterprises = [
        # --- KLH KOUN MOM ---
        ("BE01", "BE01", "Xí nghiệp Chuối DP1", "Vùng Daun Penh, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1100, "Vũ Đức Thịnh", "0918.111.001"),
        ("BE02", "BE02", "Xí nghiệp Chuối DP2", "Vùng Daun Penh, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1050, "Lý Quốc Cường", "0918.111.002"),
        ("BE03", "BE03", "Xí nghiệp Chuối DP3", "Vùng Daun Penh, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1050, "Romas Hot", "0918.111.003"),
        ("BE04", "BE04", "Xí nghiệp chuối LP1", "Vùng Lumphat, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 980, "Trần Văn Khương", "0918.111.004"),
        ("BE05", "BE05", "Xí nghiệp chuối LP3", "Vùng Lumphat, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 950, "Phan Bảo Long", "0918.111.005"),
        ("CAT_DP", "CAT_DP", "Xí nghiệp Cây ăn trái Daun Penh", "Vùng Cây ăn trái DP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1450, "Nguyễn Văn Hải", "0918.111.006"),
        ("NM_NHUA_XOP", "NM_NHUA_XOP", "Nhà máy Nhựa - Xốp Daun Penh", "Cụm Công nghiệp DP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 350, "Đỗ Quang Hưng", "0918.111.007"),
        ("XN_BO_AD", "XN_BO_AD", "Xí nghiệp Chăn nuôi Bò Andong Meas", "Trại bò Andong Meas, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 2200, "Vũ Quốc Toàn", "0918.111.008"),
        ("XN_CHUOI_DP1", "XN_CHUOI_DP1", "Xí nghiệp Chuối 1 (DP1)", "Nông trường Chuối 1 DP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1100, "Vũ Đức Thịnh", "0918.111.001"),
        ("XN_CHUOI_DP2", "XN_CHUOI_DP2", "Xí nghiệp Chuối 2 (DP2)", "Nông trường Chuối 2 DP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1050, "Lý Quốc Cường", "0918.111.002"),
        ("XN_CHUOI_DP3", "XN_CHUOI_DP3", "Xí nghiệp Chuối 3 (DP3)", "Nông trường Chuối 3 DP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1050, "Romas Hot", "0918.111.003"),
        ("XN_CHUOI_DP4", "XN_CHUOI_DP4", "Xí nghiệp Chuối 4 (DP4)", "Nông trường Chuối 4 DP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 1120, "Nguyễn Thế Hậu", "0918.111.009"),
        ("XN_CHUOI_LP1", "XN_CHUOI_LP1", "Xí nghiệp Chuối Lumphat 1 (LP1)", "Nông trường Chuối 1 LP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 980, "Trần Văn Khương", "0918.111.004"),
        ("XN_CHUOI_LP2", "XN_CHUOI_LP2", "Xí nghiệp Chuối Lumphat 2 (LP2)", "Nông trường Chuối 2 LP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 960, "Phạm Thành Đạt", "0918.111.010"),
        ("XN_CHUOI_LP3", "XN_CHUOI_LP3", "Xí nghiệp Chuối Lumphat 3 (LP3)", "Nông trường Chuối 3 LP, KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", 950, "Phan Bảo Long", "0918.111.005"),

        # --- KLH SNOUL ---
        ("BE06", "BE06", "Xí nghiệp Chuối ERC", "Vùng ERC, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 1100, "Bùi Thanh Liêm", "0918.222.001"),
        ("BE07", "BE07", "Xí nghiệp Chuối BP1", "Vùng BP, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 1150, "Nguyễn Văn Đạt", "0918.222.002"),
        ("BE08", "BE08", "Xí nghiệp Chuối BP2", "Vùng BP, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 1200, "Phạm Minh Tuấn", "0918.222.003"),
        ("BE09", "BE09", "Xí nghiệp Chuối BP3", "Vùng BP, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 1050, "Trương Hoàng Nam", "0918.222.004"),
        ("BE10", "BE10", "Xí nghiệp chuối BSA1", "Vùng BSA, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 1320, "Tô Quang Vũ", "0918.222.005"),
        ("BE11", "BE11", "Xí nghiệp chuối BSA2", "Vùng BSA, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 1250, "Lê Minh Hải", "0918.222.006"),
        ("XN_BO_SN", "XN_BO_SN", "Xí nghiệp Chăn nuôi Bò Snoul", "Khu chăn nuôi Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 2500, "Lê Văn Thắng", "0918.222.007"),
        ("XN_CS_SN", "XN_CS_SN", "Xí nghiệp Cao su Snoul", "Nông trường Cao su Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", 3200, "Trần Văn Sơn", "0918.222.008"),

        # --- KLH NAM LÀO ---
        ("BE13", "BE13", "Xí nghiệp chuối NSA", "Vùng NSA, Sanxay, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", 1400, "Đoàn Hữu Phước", "0918.333.001"),
        ("BE14", "BE14", "Xí nghiệp chuối NK1", "Vùng NK, Sanxay, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", 1450, "Nguyễn Anh Trinh", "0918.333.002"),
        ("BE15", "BE15", "Xí nghiệp Chuối PV", "Vùng Phouvong, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", 1200, "Nguyễn Thế Hậu", "0918.333.003"),
        ("G02.BE", "G02.BE", "Ban SXTT Chuối, Dứa, Mía", "Khu chuyên canh cây trồng, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", 800, "Hoàng Quốc Việt", "0918.333.004"),
        ("G06.21", "G06.21", "Ban KT trồng trọt chuối", "Khu kỹ thuật nông nghiệp, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", 500, "Trần Đình Quân", "0918.333.005"),
        ("XN_BO_NL", "XN_BO_NL", "Xí nghiệp Chăn nuôi Bò Nam Lào", "Trại bò Attapeu, Nam Lào", "NAM_LAO", "Khu liên hợp Nam Lào", 2800, "Nguyễn Hữu Nam", "0918.333.006"),
    ]

    sql_statements = ["USE thaco_agri_qlxcg;"]
    for ent in enterprises:
        id_val, code, name, address, p_code, p_name, area, manager, phone = ent
        sql = f"""
        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, areaHa, managerName, phone, status, createdAt, updatedAt)
        VALUES ('{id_val}', '{code}', '{name}', '{address}', '{p_code}', '{p_name}', 'ENTERPRISE', {area}, '{manager}', '{phone}', 'HOAT_DONG', NOW(), NOW())
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
        """
        sql_statements.append(sql)

    full_sql = "\n".join(sql_statements)
    with open("d:/ThacoAgri_Code/Mockup/backend/scripts/seed_enterprises.sql", "w", encoding="utf-8") as f:
        f.write(full_sql)

    res = subprocess.run([
        r"C:\xampp\mysql\bin\mysql.exe",
        "-u", "root",
        "--default-character-set=utf8mb4",
        "-e", "source d:/ThacoAgri_Code/Mockup/backend/scripts/seed_enterprises.sql"
    ], capture_output=True)
    print("STDOUT:", res.stdout.decode('utf-8', errors='replace'))
    print("STDERR:", res.stderr.decode('utf-8', errors='replace'))
    print("Exit code:", res.returncode)

if __name__ == "__main__":
    run()
