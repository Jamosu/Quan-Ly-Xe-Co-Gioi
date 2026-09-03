import subprocess
import sys

def seed_regions_and_link():
    regions = [
        # --- KOUN MOM ---
        ("KV_DP", "DP", "Khu vực Daun Penh (DP)", "Vùng Daun Penh, Tỉnh Ratanakiri, Campuchia", "KOUN_MOM", "Khu liên hợp Koun Mom", "Ban Giám đốc KV Daun Penh", "0918.111.001"),
        ("KV_LP", "LP", "Khu vực Lumphat (LP)", "Vùng Lumphat, Tỉnh Ratanakiri, Campuchia", "KOUN_MOM", "Khu liên hợp Koun Mom", "Ban Giám đốc KV Lumphat", "0918.111.004"),
        ("KV_AD", "AD", "Khu vực Andong Meas (AD)", "Vùng Andong Meas, Tỉnh Ratanakiri, Campuchia", "KOUN_MOM", "Khu liên hợp Koun Mom", "Ban Giám đốc KV Andong Meas", "0918.111.008"),
        ("KV_KM", "KLH", "Khu vực Văn phòng KLH Koun Mom (KLH)", "Trung tâm điều hành KLH Koun Mom", "KOUN_MOM", "Khu liên hợp Koun Mom", "Ban Giám đốc KLH Koun Mom", "0918.111.000"),

        # --- SNOUL ---
        ("KV_BP", "BP", "Khu vực Snoul BP (BP)", "Vùng BP, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", "Ban Giám đốc KV BP", "0918.222.002"),
        ("KV_BSA", "BSA", "Khu vực Snoul BSA (BSA)", "Vùng BSA, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", "Ban Giám đốc KV BSA", "0918.222.005"),
        ("KV_ERC", "ERC", "Khu vực Snoul ERC (ERC)", "Vùng ERC, Huyện Snoul, Tỉnh Kratie", "SNOUL", "Khu liên hợp Snoul", "Ban Giám đốc KV ERC", "0918.222.001"),
        ("KV_SN", "SN", "Khu vực Văn phòng KLH Snoul (SN)", "Trung tâm điều hành KLH Snoul", "SNOUL", "Khu liên hợp Snoul", "Ban Giám đốc KLH Snoul", "0918.222.000"),

        # --- NAM LÀO ---
        ("KV_NSA", "NSA", "Khu vực Sanxay NSA (NSA)", "Vùng NSA, Sanxay, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", "Ban Giám đốc KV NSA", "0918.333.001"),
        ("KV_NK", "NK", "Khu vực Sanxay NK (NK)", "Vùng NK, Sanxay, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", "Ban Giám đốc KV NK", "0918.333.002"),
        ("KV_PV", "PV", "Khu vực Phouvong (PV)", "Vùng Phouvong, Attapeu, Lào", "NAM_LAO", "Khu liên hợp Nam Lào", "Ban Giám đốc KV PV", "0918.333.003"),
        ("KV_NL", "NL", "Khu vực Văn phòng KLH Nam Lào (NL)", "Trung tâm điều hành KLH Nam Lào", "NAM_LAO", "Khu liên hợp Nam Lào", "Ban Giám đốc KLH Nam Lào", "0918.333.000"),
    ]

    enterprise_region_map = {
        # DP
        "BE01": ("DP", "Khu vực Daun Penh (DP)"),
        "BE02": ("DP", "Khu vực Daun Penh (DP)"),
        "BE03": ("DP", "Khu vực Daun Penh (DP)"),
        "CAT_DP": ("DP", "Khu vực Daun Penh (DP)"),
        "NM_NHUA_XOP": ("DP", "Khu vực Daun Penh (DP)"),
        "XN_CHUOI_DP1": ("DP", "Khu vực Daun Penh (DP)"),
        "XN_CHUOI_DP2": ("DP", "Khu vực Daun Penh (DP)"),
        "XN_CHUOI_DP3": ("DP", "Khu vực Daun Penh (DP)"),
        "XN_CHUOI_DP4": ("DP", "Khu vực Daun Penh (DP)"),

        # LP
        "BE04": ("LP", "Khu vực Lumphat (LP)"),
        "BE05": ("LP", "Khu vực Lumphat (LP)"),
        "XN_CHUOI_LP1": ("LP", "Khu vực Lumphat (LP)"),
        "XN_CHUOI_LP2": ("LP", "Khu vực Lumphat (LP)"),
        "XN_CHUOI_LP3": ("LP", "Khu vực Lumphat (LP)"),

        # AD
        "XN_BO_AD": ("AD", "Khu vực Andong Meas (AD)"),

        # Snoul
        "BE06": ("ERC", "Khu vực Snoul ERC (ERC)"),
        "BE07": ("BP", "Khu vực Snoul BP (BP)"),
        "BE08": ("BP", "Khu vực Snoul BP (BP)"),
        "BE09": ("BP", "Khu vực Snoul BP (BP)"),
        "BE10": ("BSA", "Khu vực Snoul BSA (BSA)"),
        "BE11": ("BSA", "Khu vực Snoul BSA (BSA)"),
        "XN_BO_SN": ("SN", "Khu vực Văn phòng KLH Snoul (SN)"),
        "XN_CS_SN": ("SN", "Khu vực Văn phòng KLH Snoul (SN)"),

        # Nam Lào
        "BE13": ("NSA", "Khu vực Sanxay NSA (NSA)"),
        "BE14": ("NK", "Khu vực Sanxay NK (NK)"),
        "BE15": ("PV", "Khu vực Phouvong (PV)"),
        "G02.BE": ("NL", "Khu vực Văn phòng KLH Nam Lào (NL)"),
        "G06.21": ("NL", "Khu vực Văn phòng KLH Nam Lào (NL)"),
        "XN_BO_NL": ("NL", "Khu vực Văn phòng KLH Nam Lào (NL)"),
    }

    sql_statements = [
        "USE thaco_agri_qlxcg;",
        "SET NAMES utf8mb4;",
        "DELETE FROM catalogs WHERE type = 'REGION';"
    ]

    for r in regions:
        id_val, code, name, address, p_code, p_name, manager, phone = r
        sql = f"""
        INSERT INTO catalogs (id, code, name, address, parentCode, parentName, type, managerName, phone, status, createdAt, updatedAt)
        VALUES ('{id_val}', '{code}', '{name}', '{address}', '{p_code}', '{p_name}', 'REGION', '{manager}', '{phone}', 'HOAT_DONG', NOW(), NOW());
        """
        sql_statements.append(sql)

    # Update enterprises to set address/description with region
    for ent_code, (reg_code, reg_name) in enterprise_region_map.items():
        sql = f"""
        UPDATE catalogs 
        SET description = '{reg_code}'
        WHERE code = '{ent_code}' AND type = 'ENTERPRISE';
        """
        sql_statements.append(sql)

    with open("d:/ThacoAgri_Code/Mockup/backend/scripts/seed_regions.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(sql_statements))

    res = subprocess.run([
        r"C:\xampp\mysql\bin\mysql.exe",
        "-u", "root",
        "--default-character-set=utf8mb4",
        "-e", "source d:/ThacoAgri_Code/Mockup/backend/scripts/seed_regions.sql"
    ], capture_output=True)

    if res.returncode == 0:
        print("Successfully seeded REGION records in MySQL!")
    else:
        print("Error seeding regions:", res.stderr.decode('utf-8', errors='replace'))

if __name__ == "__main__":
    seed_regions_and_link()
