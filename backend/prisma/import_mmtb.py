import openpyxl
import pymysql
import re
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# Database connection settings
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'thaco_agri_qlxcg',
    'charset': 'utf8mb4',
    'autocommit': True
}

excel_path = 'docs/00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx'
wb = openpyxl.load_workbook(excel_path, data_only=True)

print("Connected to Excel workbook:", excel_path)
conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor(pymysql.cursors.DictCursor)

print("Connected to MySQL database 'thaco_agri_qlxcg'.")

# ==============================================================================
# 1. POPULATE 3-LEVEL UNIT HIERARCHY IN CATALOGS
# ==============================================================================
catalogs_clean = [
    # Cấp 1: Khu liên hợp
    ("KLH_KM", "KLH_KM", "Khu liên hợp Koun Mom", "COMPLEX", None, None, "Koun Mom, Rattanakiri, Campuchia", "Ban Quản lý KLH"),
    ("KLH_SN", "KLH_SN", "Khu liên hợp Snuol", "COMPLEX", None, None, "Snuol, Kratie, Campuchia", "Ban Quản lý KLH Snuol"),
    
    # Cấp 2: Khu vực
    ("KV_DP", "KV_DP", "Khu vực Daun Penh (DP)", "REGION", "KLH_KM", "Khu liên hợp Koun Mom", "Daun Penh, Koun Mom", "Ban Giám đốc KV Daun Penh"),
    ("KV_LP", "KV_LP", "Khu vực Lumphat (LP)", "REGION", "KLH_KM", "Khu liên hợp Koun Mom", "Lumphat, Rattanakiri", "Ban Giám đốc KV Lumphat"),
    ("KV_AD", "KV_AD", "Khu vực Andong Meas (AD)", "REGION", "KLH_KM", "Khu liên hợp Koun Mom", "Andong Meas, Rattanakiri", "Ban Giám đốc KV Andong Meas"),
    
    # Cấp 3: Ban/Phòng ban & Xí nghiệp & Đội cơ giới
    ("BAN_CO_GIOI", "BAN_CO_GIOI", "Ban Xe Cơ giới & Quản trị Thiết bị KLH", "DEPARTMENT", "KLH_KM", "Khu liên hợp Koun Mom", "Văn phòng Điều hành KLH", "Tô Thành Thứ"),
    ("TT_BTSC", "TT_BTSC", "Trung tâm Bảo trì Sửa chữa Cơ giới", "DEPARTMENT", "KLH_KM", "Khu liên hợp Koun Mom", "Khu Xưởng Trung tâm KLH", "Nguyễn Ngọc Anh Tú"),
    ("BAN_DIEN_NUOC", "BAN_DIEN_NUOC", "Ban Điện Nước & Trạm Bơm", "DEPARTMENT", "KLH_KM", "Khu liên hợp Koun Mom", "Trạm Bơm & Điện KLH", "Trưởng Ban Điện Nước"),
    ("TONG_KHO", "TONG_KHO", "Tổng kho Vật tư & Phụ tùng KLH", "DEPARTMENT", "KLH_KM", "Khu liên hợp Koun Mom", "Khu Tổng kho KLH", "Phạm Hoàng Long"),
    
    ("CGTC_DP", "CGTC_DP", "Đội Cơ giới Thi công Daun Penh", "TEAM", "KV_DP", "Khu vực Daun Penh (DP)", "Bãi xe Daun Penh", "Đội trưởng Cơ giới"),
    ("CGLD_DP", "CGLD_DP", "Đội Cơ giới Làm đất Daun Penh", "TEAM", "KV_DP", "Khu vực Daun Penh (DP)", "Bãi xe Làm đất DP", "Đội trưởng Làm đất"),
    ("CGTC_LP", "CGTC_LP", "Đội Cơ giới Thi công Lumphat", "TEAM", "KV_LP", "Khu vực Lumphat (LP)", "Bãi xe Lumphat", "Đội trưởng Cơ giới LP"),
    ("CGLD_LP", "CGLD_LP", "Đội Cơ giới Làm đất Lumphat", "TEAM", "KV_LP", "Khu vực Lumphat (LP)", "Bãi xe Làm đất LP", "Đội trưởng Làm đất LP"),
    ("CGTC_AD", "CGTC_AD", "Đội Cơ giới Thi công Andong Meas", "TEAM", "KV_AD", "Khu vực Andong Meas (AD)", "Bãi xe Andong Meas", "Đội trưởng Cơ giới AD"),
    
    ("XN_CHUOI_DP1", "XN_CHUOI_DP1", "Xí nghiệp Chuối 1 (DP1)", "ENTERPRISE", "KV_DP", "Khu vực Daun Penh (DP)", "Nông trường Chuối 1 DP", "Giám đốc XN Chuối 1"),
    ("XN_CHUOI_DP2", "XN_CHUOI_DP2", "Xí nghiệp Chuối 2 (DP2)", "ENTERPRISE", "KV_DP", "Khu vực Daun Penh (DP)", "Nông trường Chuối 2 DP", "Giám đốc XN Chuối 2"),
    ("XN_CHUOI_DP3", "XN_CHUOI_DP3", "Xí nghiệp Chuối 3 (DP3)", "ENTERPRISE", "KV_DP", "Khu vực Daun Penh (DP)", "Nông trường Chuối 3 DP", "Giám đốc XN Chuối 3"),
    ("XN_CHUOI_DP4", "XN_CHUOI_DP4", "Xí nghiệp Chuối 4 (DP4)", "ENTERPRISE", "KV_DP", "Khu vực Daun Penh (DP)", "Nông trường Chuối 4 DP", "Giám đốc XN Chuối 4"),
    ("XN_CHUOI_LP1", "XN_CHUOI_LP1", "Xí nghiệp Chuối Lumphat 1 (LP1)", "ENTERPRISE", "KV_LP", "Khu vực Lumphat (LP)", "Nông trường Chuối 1 LP", "Giám đốc XN Chuối LP1"),
    ("XN_CHUOI_LP2", "XN_CHUOI_LP2", "Xí nghiệp Chuối Lumphat 2 (LP2)", "ENTERPRISE", "KV_LP", "Khu vực Lumphat (LP)", "Nông trường Chuối 2 LP", "Giám đốc XN Chuối LP2"),
    ("XN_CHUOI_LP3", "XN_CHUOI_LP3", "Xí nghiệp Chuối Lumphat 3 (LP3)", "ENTERPRISE", "KV_LP", "Khu vực Lumphat (LP)", "Nông trường Chuối 3 LP", "Giám đốc XN Chuối LP3"),
    ("XN_BO_AD", "XN_BO_AD", "Xí nghiệp Chăn nuôi Bò Andong Meas", "ENTERPRISE", "KV_AD", "Khu vực Andong Meas (AD)", "Trại bò Andong Meas", "Giám đốc XN Bò"),
    ("CAT_DP", "CAT_DP", "Xí nghiệp Cây ăn trái Daun Penh", "ENTERPRISE", "KV_DP", "Khu vực Daun Penh (DP)", "Vùng Cây ăn trái DP", "Giám đốc XN CAT"),
    ("NM_NHUA_XOP", "NM_NHUA_XOP", "Nhà máy Nhựa - Xốp Daun Penh", "ENTERPRISE", "KV_DP", "Khu vực Daun Penh (DP)", "Cụm Công nghiệp DP", "Quản đốc NM")
]

catalog_upsert_sql = """
INSERT INTO catalogs (id, code, name, type, parentCode, parentName, address, managerName, status, createdUser, updatedUser, createdAt, updatedAt)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'HOAT_DONG', 'system_admin', 'system_admin', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    type = VALUES(type),
    parentCode = VALUES(parentCode),
    parentName = VALUES(parentName),
    address = VALUES(address),
    managerName = VALUES(managerName),
    status = 'HOAT_DONG',
    updatedAt = NOW();
"""

cursor.execute("DELETE FROM catalogs WHERE id LIKE 'farm-upload-%' OR id LIKE 'plot-upload-%'")
for cat in catalogs_clean:
    cursor.execute(catalog_upsert_sql, cat)

print(f"-> Seeded/Updated {len(catalogs_clean)} organization units in 3 levels.")

# Companies
companies_clean = [
    (1, 'THACO AGRI', 'Công ty Cổ phần Nông nghiệp Trường Hải (THACO AGRI)', 'Khu công nghiệp Tam Hiệp, xã Núi Thành, TP. Đà Nẵng', 'Quản trị Nông nghiệp, Cơ giới hóa & Chăn nuôi quy mô lớn', '4000778899', '15,000,000,000,000 VND'),
    (2, 'KOUN_MOM_AGRI', 'Công ty TNHH Nông nghiệp Koun Mom (Campuchia)', 'Huyện Koun Mom, Tỉnh Ratanakiri, Vương quốc Campuchia', 'Trồng trọt Chuối xuất khẩu, Cây ăn trái & Chăn nuôi Bò thịt công nghệ cao', 'KH-098234-KM', '500,000,000 USD'),
    (3, 'SNUOL_AGRI', 'Công ty TNHH Nông nghiệp Snuol (Campuchia)', 'Huyện Snuol, Tỉnh Kratie, Vương quốc Campuchia', 'Khu Liên Hợp Cây Ăn Trái, Cỏ voi trạm TMR & Chăn nuôi Bò', 'KH-112344-SN', '350,000,000 USD')
]

for comp in companies_clean:
    cursor.execute("""
    INSERT INTO companies (id, code, name, address, field, businessLicense, charterCapital, createdAt, updatedAt)
    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        address = VALUES(address),
        field = VALUES(field),
        businessLicense = VALUES(businessLicense),
        charterCapital = VALUES(charterCapital),
        updatedAt = NOW();
    """, comp)

print("-> Seeded 3 Company entities.")

# ==============================================================================
# 2. HELPER FUNCTIONS FOR VEHICLE IMPORT
# ==============================================================================
def is_valid_vehicle_code(code, name, r):
    if not code or len(code) < 3:
        return False
    c = code.strip()
    c_upper = c.upper()
    
    if c_upper in ['MÃ MMTB', 'MÃ MMTB MỚI', 'MÃ MMTB CŨ', 'TT', 'STT', 'NONE', '1', '2', '3', 'TỔNG CỘNG', 'TỔNG'] or 'MÃ MMTB' in c_upper:
        return False
    if any(h in c_upper for h in [
        'CƠ GIỚI THI CÔNG', 'CƠ GIỚI LÀM ĐẤT', 'CƠ GIỚI SẢN XUẤT',
        'XÍ NGHIỆP CHUỐI', 'XÍ NGHIỆP BÒ', 'XÍ NGHIỆP CÂY ĂN TRÁI', 'XÍ NGHIỆP',
        'SẢN XUẤT TRỒNG TRỌT', 'BAN ĐIỆN NƯỚC', 'BAN CƠ GIỚI', 'BAN KT', 'BAN QUẢN LÝ',
        'XE TẢI BÀN', 'XE BAN:', 'THIẾT BỊ', 'NÔNG TRƯỜNG', 'KHU LIÊN HỢP', 'KHU VỰC',
        'TRUNG TÂM', 'TỔNG KHO', 'TRẠM TRỘN', 'VƯỜN TĂNG GIA', 'XƯỞNG CƠ KHÍ'
    ]):
        return False
    
    if not any(char.isdigit() for char in c) and '-' not in c and len(c.split()) > 1:
        return False
        
    return True

def classify_category(code, name):
    c = (code or "").upper()
    n = (name or "").upper()
    
    # 1. MAY_DAO (Excavators)
    if any(k in c for k in ['MĐA', 'MDA', 'CAT 3', 'PC40', 'PC50', 'PC55', 'PC128', 'PC200', 'PC228', 'PW160', 'PW200', 'SH210', 'SH130', 'SK200', 'SK250', 'DX140', 'U35', 'CAT 303', 'CAT 305']) or \
       'MÁY ĐÀO' in n or 'M.ĐÀO' in n or 'ĐÀO BÁNH' in n or 'ĐÀO XÍCH' in n:
        return 'MAY_DAO'
        
    # 2. MAY_UI (Bulldozers)
    if any(k in c for k in ['MUI', 'D31', 'D60', 'D65', 'D85']) or 'MÁY ỦI' in n or 'M.ỦI' in n or 'ỦI SAN' in n:
        return 'MAY_UI'
        
    # 3. MAY_SAN (Graders / Ban)
    if any(k in c for k in ['-BAN-', 'BAN-', '-MBS-', 'GD605', 'GD511', '705A', 'MBS']) or \
       'MÁY SAN' in n or 'XE BAN' in n or 'MÁY BAN' in n or 'SAN GẠT' in n:
        return 'MAY_SAN'
        
    # 4. MAY_LU (Rollers)
    if any(k in c for k in ['MLU', 'XLU', 'BW211', 'YZ14', 'SV521', 'R2S', 'DYNAPAC']) or \
       'MÁY LU' in n or 'XE LU' in n or 'LU RUNG' in n or 'LU TĨNH' in n or 'LU BÁNH' in n:
        return 'MAY_LU'
        
    # 5. MAY_XUC_LAT (Wheel Loaders)
    if any(k in c for k in ['MXL', 'WA200', 'WA320', 'ZL50', 'LG835', 'CLG835']) or 'XÚC LẬT' in n:
        return 'MAY_XUC_LAT'
        
    # 6. MAY_GAT_DAP (Combine Harvesters)
    if any(k in c for k in ['MG-', 'MG_', 'DC-70', 'DC70', 'DC-60', 'DC-93']) or 'MÁY GẶT' in n or 'GẶT ĐẬP' in n:
        return 'MAY_GAT_DAP'
        
    # 7. MAY_KEO (Agricultural Tractors)
    if any(k in c for k in ['MK-', 'MKE', 'MKX', '6140B', '5075E', 'M7040', 'M6040', 'M9540', 'TT4.90', 'TS6000', 'CT65', 'CT55', 'ISEKI', 'YANMAR', 'LOVOL', 'MOROOKA']) or \
       'MÁY KÉO' in n or 'MÁY CÀY' in n or 'CÀY BÁNH XÍCH' in n or 'KÉO BÁNH XÍCH' in n:
        return 'MAY_KEO'
        
    # 8. XE_CONTAINER (Container Trucks / Tractors)
    if any(k in c for k in ['XCT', 'CONT', 'TT261', 'SHACMAN', 'A7-']) or 'CONTAINER' in n or 'ĐẦU KÉO' in n:
        return 'XE_CONTAINER'
        
    # 9. XE_BON (Tankers)
    if any(k in c for k in ['XBN', 'XBO', 'BON', 'TÉC', 'TEC']) or 'XE BỒN' in n or 'TÉC NƯỚC' in n or 'BỒN DẦU' in n or 'TƯỚI NƯỚC' in n:
        return 'XE_BON'
        
    # 10. XE_BEN (Dump Trucks)
    if any(k in c for k in ['HD270', 'XB-', 'BEN', 'FD150', 'FC150', 'TXD600']) or 'XE BEN' in n or 'TẢI BEN' in n:
        return 'XE_BEN'
        
    # 11. XE_BAN_TAI (Pickups)
    if any(k in c for k in ['RANGER', 'BT-50', 'BT50', 'HILUX', 'D-MAX', 'NAVARA', 'XBT']) or 'BÁN TẢI' in n:
        return 'XE_BAN_TAI'
        
    # 12. XE_CONG_VU (Passenger / Service Cars)
    if any(k in c for k in ['XCV', 'CONG VU', 'INNOVA', 'FORTUNER', 'COUNTY', 'SOLATI']) or 'CÔNG VỤ' in n or 'ĐƯA ĐÓN' in n or '7 CHỖ' in n or '16 CHỖ' in n:
        return 'XE_CONG_VU'
        
    # 13. XE_TAI (Cargo Trucks)
    if any(k in c for k in ['HOWO', 'HINO', 'FRONTIER', 'TCD', 'XTA', 'XT-', 'OLLIN', 'AUMAN']) or 'XE TẢI' in n or 'TẢI THÙNG' in n or 'TẢI MUI BẠT' in n or 'TẢI BÀN' in n:
        return 'XE_TAI'
        
    # 14. XE_NANG (Forklifts)
    if any(k in c for k in ['XN-', 'NÂNG', 'FD30', 'FD35', 'FD50', 'CĐ18', 'HELI']) or 'XE NÂNG' in n:
        return 'XE_NANG'
        
    # 15. MAY_PHAT_DIEN (Generators)
    if any(k in c for k in ['MFĐ', 'MFD', 'MPY', 'FPT', 'GENSET', 'DENYO', 'CUMMINS', 'DCA']) or 'PHÁT ĐIỆN' in n or 'M.PHÁT ĐIỆN' in n:
        return 'MAY_PHAT_DIEN'
        
    # 16. MAY_PHAT_CO (Brush Cutters)
    if any(k in c for k in ['MPC', 'CG411', 'SRM-']) or 'PHÁT CỎ' in n or 'CẮT CỎ' in n or 'MÁY PHÁT CỎ' in n:
        return 'MAY_PHAT_CO'
        
    # 17. MAY_CUA (Chainsaws)
    if any(k in c for k in ['MCG', 'STIHL', 'HUSQVARNA', 'MS381', 'MS250']) or 'MÁY CƯA' in n or 'CƯA GỖ' in n or 'CƯA XÍCH' in n:
        return 'MAY_CUA'
        
    # 18. MAY_BOM (Water Pumps)
    if any(k in c for k in ['MBT', 'BOM', 'BƠM']) or 'MÁY BƠM' in n or 'BƠM NƯỚC' in n or 'CHỐNG NGẬP' in n:
        return 'MAY_BOM'
        
    # 19. XE_MAY_2_BANH (Motorbikes)
    if any(k in c for k in ['XMA', 'WAVE', 'HONDA', 'SIRIUS', 'BLADE']) or 'XE MÁY' in n:
        return 'XE_MAY_2_BANH'
        
    # 20. THIET_BI_NONG_CU (Implements & Trailers)
    if any(k in c for k in ['CNA', 'BDU', 'CMĐ', 'CMD', 'RVO', 'ĐTL', 'DTL', 'DC-', 'DB-', 'RML', 'BLC', 'ĐBC', 'RBX', 'SMRM', 'MOOC']) or \
       'DÀN CÀY' in n or 'DÀN BỪA' in n or 'DÀN XỚI' in n or 'NÔNG CỤ' in n or 'RƠ MOÓC' in n or 'RƠ-MOÓC' in n or 'THIẾT BỊ' in n or 'GẮP LÁ' in n or 'BÁNH LỒNG' in n or 'RÙA BÁNH XÍCH' in n:
        return 'THIET_BI_NONG_CU'
        
    # 21. XE_CHUYEN_DUNG (Other Specialized Equipment)
    return 'XE_CHUYEN_DUNG'

def detect_unit_and_region(dvsd):
    d = (dvsd or "").upper()
    region = 'KLH'
    unit = 'BAN_CO_GIOI'
    
    if 'DP' in d or 'DAUPENH' in d or 'DAUN PENH' in d or 'DAUNPENH' in d:
        region = 'DP'
    elif 'LP' in d or 'LUMPHAT' in d:
        region = 'LP'
    elif 'AD' in d or 'ANDONG' in d or 'ANDONGMEAS' in d:
        region = 'AD'
        
    if 'NT1' in d or 'DP1' in d or 'CHUỐI 1' in d or 'CHUỐI DP1' in d or 'CHUỐI DP1' in d:
        unit = 'NT1'
    elif 'NT2' in d or 'DP2' in d or 'CHUỐI 2' in d or 'CHUỐI DP2' in d or 'CHUỐI DP2' in d:
        unit = 'NT2'
    elif 'BÒ' in d or 'BO' in d or 'XN BÒ' in d:
        unit = 'XN_BO'
    elif 'BTSC' in d or 'BẢO TRÌ' in d or 'XƯỞNG' in d:
        unit = 'TT_BTSC'
    elif 'BAN CG' in d or 'CƠ GIỚI' in d or 'CGTC' in d or 'CGLĐ' in d:
        unit = 'BAN_CO_GIOI'
    else:
        unit = 'TOAN_KLH'
        
    return unit, region

def parse_quota(quota_val, category):
    q_str = str(quota_val or "").strip()
    match = re.search(r'([0-9]+(?:\.[0-9]+)?)', q_str)
    rate = float(match.group(1)) if match else 12.5
    
    unit_enum = 'L_PER_HOUR'
    if 'KM' in q_str.upper() or '100' in q_str or category in ['XE_TAI', 'XE_BEN', 'XE_BON', 'XE_CONTAINER', 'XE_BAN_TAI', 'XE_CONG_VU']:
        unit_enum = 'L_PER_KM'
    elif 'HA' in q_str.upper() or category in ['MAY_KEO', 'MAY_GAT_DAP', 'THIET_BI_NONG_CU']:
        unit_enum = 'L_PER_HA'
    else:
        unit_enum = 'L_PER_HOUR'
        
    return rate, unit_enum

def parse_float(val):
    if val is None:
        return None
    try:
        s = str(val).replace(',', '').strip()
        match = re.search(r'([0-9]+(?:\.[0-9]+)?)', s)
        return float(match.group(1)) if match else None
    except:
        return None

def parse_date(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d/%m/%y'):
        try:
            return datetime.strptime(s, fmt)
        except:
            pass
    return None

# ==============================================================================
# 3. BUILD COMPREHENSIVE DICTIONARY FROM EXCEL SHEETS
# ==============================================================================
master_records = {}

if '02. MM-KLH' in wb.sheetnames:
    ws_mm = wb['02. MM-KLH']
    for r in ws_mm.iter_rows(min_row=3, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if not is_valid_vehicle_code(code, str(r[6]) if len(r) > 6 else '', r):
            continue
            
        old_code = str(r[2]).strip() if len(r) > 2 and r[2] and str(r[2]) != 'None' else None
        bravo_code = str(r[3]).strip() if len(r) > 3 and r[3] and str(r[3]) != 'None' else None
        plate = str(r[4]).strip() if len(r) > 4 and r[4] and str(r[4]) != 'None' else None
        purchase_cond = str(r[5]).strip() if len(r) > 5 and r[5] and str(r[5]) != 'None' else None
        name = str(r[6]).strip() if len(r) > 6 and r[6] and str(r[6]) != 'None' else code
        dvsd = str(r[8]).strip() if len(r) > 8 and r[8] and str(r[8]) != 'None' else ""
        alloc_date = parse_date(r[9]) if len(r) > 9 else None
        cond_status = str(r[10]).strip() if len(r) > 10 and r[10] and str(r[10]) != 'None' else "Bình thường"
        transfer_hist = str(r[12]).strip() if len(r) > 12 and r[12] and str(r[12]) != 'None' else None
        manufacturer = str(r[13]).strip() if len(r) > 13 and r[13] and str(r[13]) != 'None' else None
        origin = str(r[14]).strip() if len(r) > 14 and r[14] and str(r[14]) != 'None' else None
        
        mfg_year = None
        if len(r) > 15 and r[15]:
            try:
                mfg_year = int(float(str(r[15]).strip()))
            except:
                pass
                
        model_name = str(r[16]).strip() if len(r) > 16 and r[16] and str(r[16]) != 'None' else None
        power_hp = str(r[17]).strip() if len(r) > 17 and r[17] and str(r[17]) != 'None' else None
        frame_no = str(r[18]).strip() if len(r) > 18 and r[18] and str(r[18]) != 'None' else None
        engine_no = str(r[19]).strip() if len(r) > 19 and r[19] and str(r[19]) != 'None' else None
        quota_rate = parse_float(r[20]) if len(r) > 20 else None
        tank_capacity = parse_float(r[21]) if len(r) > 21 else None
        supplier = str(r[22]).strip() if len(r) > 22 and r[22] and str(r[22]) != 'None' else None
        notes = str(r[23]).strip() if len(r) > 23 and r[23] and str(r[23]) != 'None' else None
        image_url = str(r[24]).strip() if len(r) > 24 and r[24] and str(r[24]) != 'None' else None
        
        master_records[code] = {
            "code": code,
            "oldCode": old_code,
            "bravoCode": bravo_code,
            "plate": plate,
            "purchaseCondition": purchase_cond,
            "name": name,
            "assignedUnitCode": dvsd,
            "allocationDate": alloc_date,
            "conditionStatus": cond_status,
            "transferHistory": transfer_hist,
            "manufacturer": manufacturer,
            "origin": origin,
            "manufactureYear": mfg_year,
            "modelName": model_name,
            "powerHp": power_hp,
            "frameNumber": frame_no,
            "engineNumber": engine_no,
            "fuelQuotaRate": quota_rate,
            "fuelTankCapacity": tank_capacity,
            "supplier": supplier,
            "notes": notes,
            "imageUrl": image_url
        }

if 'TỔNG KLH + TN' in wb.sheetnames:
    ws_all = wb['TỔNG KLH + TN']
    for r in ws_all.iter_rows(min_row=3, values_only=True):
        code = str(r[0]).strip() if len(r) > 0 and r[0] else None
        name = str(r[1]).strip() if len(r) > 1 and r[1] else code
        if not is_valid_vehicle_code(code, name, r):
            continue
            
        rec = master_records.get(code, {})
        rec["code"] = code
        if not rec.get("name") or rec.get("name") == code:
            rec["name"] = name
        if not rec.get("assignedUnitCode"):
            rec["assignedUnitCode"] = str(r[2]).strip() if len(r) > 2 and r[2] else ""
        if not rec.get("manufacturer"):
            rec["manufacturer"] = str(r[3]).strip() if len(r) > 3 and r[3] else None
        if not rec.get("origin"):
            rec["origin"] = str(r[4]).strip() if len(r) > 4 and r[4] else None
        if not rec.get("manufactureYear") and len(r) > 5 and r[5]:
            try:
                rec["manufactureYear"] = int(float(str(r[5]).strip()))
            except:
                pass
        if not rec.get("modelName"):
            rec["modelName"] = str(r[6]).strip() if len(r) > 6 and r[6] else None
        if not rec.get("powerHp"):
            rec["powerHp"] = str(r[7]).strip() if len(r) > 7 and r[7] else None
        if not rec.get("frameNumber"):
            rec["frameNumber"] = str(r[8]).strip() if len(r) > 8 and r[8] else None
        if not rec.get("engineNumber"):
            rec["engineNumber"] = str(r[9]).strip() if len(r) > 9 and r[9] else None
        if not rec.get("fuelQuotaRate") and len(r) > 10:
            rec["fuelQuotaRate"] = parse_float(r[10])
        if not rec.get("contractStatus"):
            rec["contractStatus"] = str(r[11]).strip() if len(r) > 11 and r[11] else "KLH"

        master_records[code] = rec

if '02.1 NHÓM XE & MÁY' in wb.sheetnames:
    ws_nhom = wb['02.1 NHÓM XE & MÁY']
    for r in ws_nhom.iter_rows(min_row=3, values_only=True):
        code = None
        for v in r[:3]:
            if v and '-' in str(v) and len(str(v)) >= 5 and len(str(v)) <= 25:
                code = str(v).strip()
                break
        if code and code in master_records:
            asset = str(r[5]).strip() if len(r) > 5 and r[5] and str(r[5]) != 'None' else None
            master_records[code]["assetCode"] = asset

if '08. ĐKĐK' in wb.sheetnames:
    ws_dk = wb['08. ĐKĐK']
    for r in ws_dk.iter_rows(min_row=3, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if code and code in master_records:
            expiry = parse_date(r[13]) if len(r) > 13 else None
            master_records[code]["inspectionExpiryDate"] = expiry

if 'XE & MÁY CG AGRI' in wb.sheetnames:
    ws_agri = wb['XE & MÁY CG AGRI']
    for r in ws_agri.iter_rows(min_row=3, values_only=True):
        code = None
        for v in r[7:14]:
            if v and '-' in str(v) and len(str(v)) >= 5:
                code = str(v).strip()
                break
        if code and code in master_records:
            owner = str(r[16]).strip() if len(r) > 16 and r[16] and str(r[16]) != 'None' else "THACO AGRI"
            odo = parse_float(r[15]) if len(r) > 15 else 0.0
            hours = parse_float(r[16]) if len(r) > 16 else 0.0
            master_records[code]["companyOwner"] = owner
            master_records[code]["odoKm"] = odo or 0.0
            master_records[code]["totalMachineHours"] = hours or 0.0

print(f"-> Consolidated {len(master_records)} clean MMTB records.")

# ==============================================================================
# 4. INSERT / UPDATE ALL CLEAN 23 FIELDS INTO MYSQL 'VEHICLES' TABLE
# ==============================================================================
vehicle_sql = """
INSERT INTO vehicles (
    code, oldCode, bravoCode, plate, purchaseCondition,
    name, category, unit, assignedUnitCode, regionCode,
    allocationDate, conditionStatus, transferHistory, manufacturer, origin,
    manufactureYear, modelName, powerHp, frameNumber, engineNumber,
    fuelQuotaRate, fuelQuotaUnit, fuelTankCapacity, supplier, notes,
    imageUrl, assetCode, contractStatus, companyOwner, inspectionExpiryDate,
    status, totalMachineHours, hoursSinceLastService, alertTier, odoKm,
    fuelRateStandard, currentLat, currentLng, currentLocationName, lastGpsUpdate,
    createdAt, updatedAt
) VALUES (
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, 0, 'GREEN', %s,
    %s, 13.5678, 106.8901, %s, NULL,
    NOW(), NOW()
)
ON DUPLICATE KEY UPDATE
    oldCode = VALUES(oldCode),
    bravoCode = VALUES(bravoCode),
    plate = VALUES(plate),
    purchaseCondition = VALUES(purchaseCondition),
    name = VALUES(name),
    category = VALUES(category),
    unit = VALUES(unit),
    assignedUnitCode = VALUES(assignedUnitCode),
    regionCode = VALUES(regionCode),
    allocationDate = VALUES(allocationDate),
    conditionStatus = VALUES(conditionStatus),
    transferHistory = VALUES(transferHistory),
    manufacturer = VALUES(manufacturer),
    origin = VALUES(origin),
    manufactureYear = VALUES(manufactureYear),
    modelName = VALUES(modelName),
    powerHp = VALUES(powerHp),
    frameNumber = VALUES(frameNumber),
    engineNumber = VALUES(engineNumber),
    fuelQuotaRate = VALUES(fuelQuotaRate),
    fuelQuotaUnit = VALUES(fuelQuotaUnit),
    fuelTankCapacity = VALUES(fuelTankCapacity),
    supplier = VALUES(supplier),
    notes = VALUES(notes),
    imageUrl = VALUES(imageUrl),
    assetCode = VALUES(assetCode),
    contractStatus = VALUES(contractStatus),
    companyOwner = VALUES(companyOwner),
    inspectionExpiryDate = VALUES(inspectionExpiryDate),
    updatedAt = NOW();
"""

inserted_count = 0
for code, r in master_records.items():
    category = classify_category(r["code"], r["name"])
    quota_rate, quota_unit = parse_quota(r.get("fuelQuotaRate"), category)
    unit_enum, region_code = detect_unit_and_region(r.get("assignedUnitCode"))
    
    status = 'HOAT_DONG'
    cond_status = r.get("conditionStatus") or "Bình thường"
    if 'hỏng' in cond_status.lower() or 'hư' in cond_status.lower() or 'sửa' in cond_status.lower():
        status = 'SUA_CHUA'

    location_desc = f"{r.get('assignedUnitCode')} - {region_code}" if r.get("assignedUnitCode") else "Khu liên hợp Koun Mom"

    params = (
        r["code"], r.get("oldCode"), r.get("bravoCode"), r.get("plate"), r.get("purchaseCondition"),
        r["name"], category, unit_enum, r.get("assignedUnitCode"), region_code,
        r.get("allocationDate"), cond_status, r.get("transferHistory"), r.get("manufacturer"), r.get("origin"),
        r.get("manufactureYear"), r.get("modelName"), r.get("powerHp"), r.get("frameNumber"), r.get("engineNumber"),
        quota_rate, quota_unit, r.get("fuelTankCapacity"), r.get("supplier"), r.get("notes"),
        r.get("imageUrl"), r.get("assetCode"), r.get("contractStatus", "KLH"), r.get("companyOwner", "THACO AGRI"), r.get("inspectionExpiryDate"),
        status, r.get("totalMachineHours", 0.0), r.get("odoKm", 0.0),
        quota_rate, location_desc
    )

    try:
        cursor.execute(vehicle_sql, params)
        inserted_count += 1
    except Exception as e:
        print(f"Error saving {code}: {e}")

print(f"\n=======================================================")
print(f"-> Successfully processed {inserted_count} clean MMTB records into MySQL database!")
print(f"=======================================================")

cursor.close()
conn.close()
