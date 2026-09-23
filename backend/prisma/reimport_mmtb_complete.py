# -*- coding: utf-8 -*-
"""
SCRIPT RE-IMPORT MMTB HOÀN CHỈNH
====================================
Mục đích:
1. Đọc TẤT CẢ các sheet xe từ Excel (bao gồm sheet bị bỏ sót)
2. Cập nhật nhân sự quản lý (managerName, managerPhone) từ data thật (ảnh chụp)
3. Import vào MySQL database

Các sheet cần đọc:
- TỔNG KLH + TN: Nguồn chính - tất cả xe (3054 xe)
- 04. XMA: Xe máy 2 bánh (XE_MAY_2_BANH) - bổ sung từ đây
- 05. MPC: Máy phát cỏ (MAY_PHAT_CO) - bổ sung
- 07. MFĐ: Máy phát điện (MAY_PHAT_DIEN) - bổ sung
- THIẾT BỊ ĐIỆN NƯỚC: Máy bơm + điện nước (MAY_BOM + MAY_PHAT_DIEN)
- 03. THIẾT BỊ: Thiết bị phụ trợ
- 06. MCG-MKH: Máy cưa, khoan
"""

import openpyxl
import pymysql
import re
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

# ==============================================================================
# NHÂN SỰ QUẢN LÝ ĐÃ CÓ NGUỒN XÁC MINH
# Không gán tên thay thế cho đơn vị chưa có người quản lý trong dữ liệu nguồn.
# ==============================================================================
UNIT_MANAGERS = {
    # XN Chuối - KV Daun Penh
    'XN Chuối DP1': {'name': 'Thái Cao Lưu', 'phone': '0387783316', 'address': 'Lô 21 DP1'},
    'XN DP1': {'name': 'Thái Cao Lưu', 'phone': '0387783316', 'address': 'Lô 21 DP1'},
    'XN Chuối DP2': {'name': 'Huỳnh Quang Viên', 'phone': '0977623379', 'address': 'Lô 15.6 DP2'},
    'XN DP2': {'name': 'Huỳnh Quang Viên', 'phone': '0977623379', 'address': 'Lô 15.6 DP2'},
    'XN Chuối DP3': {'name': 'Thạch Ngọc Vừng', 'phone': '0975905267', 'address': 'Lô 28 DP3'},
    'XN DP3': {'name': 'Thạch Ngọc Vừng', 'phone': '0975905267', 'address': 'Lô 28 DP3'},
    
    # XN Chuối - KV Lumphat
    'XN Chuối LP1': {'name': 'Nguyễn Ngọc Nhân', 'phone': '0979578112', 'address': 'Lô 7 LP1'},
    'XN LP1': {'name': 'Nguyễn Ngọc Nhân', 'phone': '0979578112', 'address': 'Lô 7 LP1'},
    'XN Chuối LP3': {'name': 'Lê Cao Nghị', 'phone': '0977423100', 'address': 'Lô 2 LP3'},
    'XN LP3': {'name': 'Lê Cao Nghị', 'phone': '0977423100', 'address': 'Lô 2 LP3'},
    
    # XN Bò - KV Andong Meas
    'XN Bò AD': {'name': 'Trần Văn Nam', 'phone': '0971993540', 'address': 'Lô 28 XN Bò'},
    'XN Bò': {'name': 'Trần Văn Nam', 'phone': '0971993540', 'address': 'Lô 28 XN Bò'},
    'Bò AD': {'name': 'Trần Văn Nam', 'phone': '0971993540', 'address': 'Lô 28 XN Bò'},
    
    # Cơ giới Làm đất
    'CGLĐ DP': {'name': 'Nguyễn Tấn Triều', 'phone': '05974160290', 'address': 'Lô 85 DP4'},
    'CGLĐ XN Bò': {'name': 'T.Q.Đ Ngọc Hải', 'phone': '0344302386', 'address': 'Lô 28, 65 XN Bò'},
    'CGLĐ LP': {'name': 'Nguyễn Tấn Triều', 'phone': '05974160290', 'address': 'LP3.5-LP3'},
    
    # Cơ giới Thi công
    'CGTC DP': {'name': 'Phạm Ngọc Hải', 'phone': '0825456565', 'address': 'Lô 85 DP4'},
    'CGTC LP': {'name': 'Đỗ Đức Nghĩa', 'phone': '0971462780', 'address': 'NOCN L.4-LP3'},
    'CGTC AD': {'name': 'Vũ Trung Kiên', 'phone': '0981761677', 'address': 'Lô 73 ADM'},
    
    # B.ĐTXD - Đội Thi Xây Dựng AD (Andong Meas)
    'B.ĐTXD AD': {'name': 'Vũ Trung Kiên', 'phone': '0981761677', 'address': 'Lô 73 ADM'},
    
    # Đơn vị đặc biệt
    'Trạm trộn bê tông': {'name': 'Phạm Nhật Thịnh', 'phone': '0935178908', 'address': 'Trạm trộn DP'},
    'HÀNH CHÍNH KLH': {'name': 'Lê Trần Hoàng Minh', 'phone': '0965509539', 'address': 'Văn Phòng 94'},
    'Hành chính KLH': {'name': 'Lê Trần Hoàng Minh', 'phone': '0965509539', 'address': 'Văn Phòng 94'},
    'Phòng GNVC': {'name': 'Lâm Quốc Cường', 'phone': '0384653979', 'address': 'Tổng kho KLH'},
    
    # Cây ăn trái / Xoài
    'XOÀI AD': {'name': 'Huỳnh Đông Giang', 'phone': '0972283372', 'address': 'Lô 132 XN AD'},
    'Xoài AD': {'name': 'Huỳnh Đông Giang', 'phone': '0972283372', 'address': 'Lô 132 XN AD'},
    'Xoài DP': {'name': 'Hà Văn Nghĩa', 'phone': '0813564564', 'address': 'Lô 136 XN Xoài'},
    'CAT DP': {'name': 'Hà Văn Nghĩa', 'phone': '0813564564', 'address': 'Lô 136 XN Xoài'},
    'BƯỞI AD': {'name': 'Huỳnh Đông Giang', 'phone': '0972283372', 'address': 'Lô 132 XN AD'},
    
    # Ban điện nước
    'Ban điện nước': {'name': 'Trần Đình Phúc', 'phone': '0924518278', 'address': 'Kho điện nước'},
    'Ban Điện Nước KV DP': {'name': 'Trần Đình Phúc', 'phone': '0924518278', 'address': 'Kho điện nước'},
    
    # Xưởng cơ khí
    
    # Tổng kho
    'Tổng kho': {'name': 'Võ Thanh Hiếu', 'phone': '0884281479', 'address': 'Tổng kho KLH'},
    
    # NM Nhựa
    'NM NHỰA -XỐP DP': {'name': 'Nguyễn Xuân Liêm', 'phone': '0762578457', 'address': 'NM Nhựa'},
    
    # Thagricons, Thadicons
    
    # BAN CG-CK
    'BAN CG-CK & SXCN': {'name': 'Đỗ Đức Nghĩa', 'phone': '0971462780', 'address': 'NOCN L.4-LP3'},
    
    # Loại biên (xe thanh lý / chờ xử lý)
    'Loại biên': {'name': 'Nguyễn Ngọc Anh Tú', 'phone': '0965509539', 'address': 'Ban CG KLH'},
    
    # RAT OYD (bên ngoài?)
}

def get_manager_info(dvsd):
    """Lấy thông tin nhân sự quản lý dựa vào đơn vị sử dụng"""
    if not dvsd:
        return None, None
    dvsd_stripped = dvsd.strip()
    # Tìm match chính xác trước
    if dvsd_stripped in UNIT_MANAGERS:
        info = UNIT_MANAGERS[dvsd_stripped]
        return info['name'], info['phone']
    # Tìm match gần đúng
    dvsd_upper = dvsd_stripped.upper()
    for key, info in UNIT_MANAGERS.items():
        if key.upper() in dvsd_upper or dvsd_upper in key.upper():
            return info['name'], info['phone']
    return None, None

# ==============================================================================
# KẾT NỐI DATABASE
# ==============================================================================
DB_CONFIG = {
    'host': '10.23.1.250',
    'port': 3308,
    'user': 'root',
    'password': 'Thaco@123',
    'database': 'mvms_db',
    'charset': 'utf8mb4',
    'autocommit': True
}

excel_path = r'D:\ThacoAgri_Code\Mockup\docs\00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx'
wb = openpyxl.load_workbook(excel_path, data_only=True)

print("Đang mở kết nối database...")
conn = pymysql.connect(**DB_CONFIG)
cursor = conn.cursor(pymysql.cursors.DictCursor)
print("✓ Kết nối database thành công!")

# ==============================================================================
# HÀM PHÂN LOẠI XE
# ==============================================================================
def classify_category(code, name):
    c = (code or "").upper()
    n = (name or "").upper()
    
    # MAY_DAO
    if any(k in c for k in ['MĐA', 'MDA', 'PC40', 'PC50', 'PC55', 'PC128', 'PC200', 'PC228', 'PW160', 'PW200', 'SH210', 'SH130', 'SK200', 'SK250', 'DX140', 'U35', 'CAT 303', 'CAT 305', 'CHT-MĐA', 'MĐA-']) or \
       'MÁY ĐÀO' in n or 'M.ĐÀO' in n or 'ĐÀO BÁNH' in n or 'ĐÀO XÍCH' in n:
        return 'MAY_DAO', 'MAY_CONG_TRINH'
        
    # MAY_UI
    if any(k in c for k in ['MUI', 'D31', 'D60', 'D65', 'D85', 'CHT-MUI']) or 'MÁY ỦI' in n or 'M.ỦI' in n or 'ỦI SAN' in n:
        return 'MAY_UI', 'MAY_CONG_TRINH'
        
    # MAY_SAN
    if any(k in c for k in ['-BAN-', 'BAN-', '-MBS-', 'GD605', 'GD511', '705A', 'MBS', 'CHT-BAN', 'CHT-XBN', 'XLU-']) or \
       'MÁY SAN' in n or 'XE BAN' in n or 'MÁY BAN' in n or 'SAN GẠT' in n:
        if 'LU' not in n and 'XLU' not in c:
            return 'MAY_SAN', 'MAY_CONG_TRINH'
        
    # MAY_LU
    if any(k in c for k in ['MLU', 'XLU', 'BW211', 'YZ14', 'SV521', 'R2S', 'DYNAPAC', 'CHT-XLU']) or \
       'MÁY LU' in n or 'XE LU' in n or 'LU RUNG' in n or 'LU TĨNH' in n or 'LU BÁNH' in n:
        return 'MAY_LU', 'MAY_CONG_TRINH'
        
    # MAY_XUC_LAT
    if any(k in c for k in ['MXL', 'WA200', 'WA320', 'ZL50', 'LG835', 'CLG835', 'CHT-XUC']) or 'XÚC LẬT' in n:
        return 'MAY_XUC_LAT', 'MAY_CONG_TRINH'

    # MAY_SAN (sau khi check lu)
    if any(k in c for k in ['-BAN-', 'CHT-BAN', 'GD605', 'GD511', 'MBS', 'CHT-MBS']) or \
       'MÁY SAN' in n or 'MÁY BAN' in n or 'SAN GẠT' in n:
        return 'MAY_SAN', 'MAY_CONG_TRINH'
        
    # MAY_GAT_DAP
    if any(k in c for k in ['MG-', 'MG_', 'DC-70', 'DC70', 'DC-60', 'DC-93']) or 'MÁY GẶT' in n or 'GẶT ĐẬP' in n:
        return 'MAY_GAT_DAP', 'MAY_NONG_NGHIEP'
        
    # MAY_KEO / MAY_CAY
    if any(k in c for k in ['MK-', 'MKE', 'MKX', '6140B', '5075E', 'M7040', 'M6040', 'M9540', 'TT4.90', 'TS6000', 'CT65', 'CT55', 'ISEKI', 'YANMAR', 'LOVOL', 'MOROOKA']) or \
       'MÁY KÉO' in n or 'MÁY CÀY' in n or 'CÀY BÁNH XÍCH' in n or 'KÉO BÁNH XÍCH' in n or 'THIẾT BỊ CƠ GIỚI LÀM ĐẤT' in n:
        return 'MAY_KEO', 'MAY_NONG_NGHIEP'
    
    # Nông cụ đính kèm máy kéo
    if any(k in c for k in ['CNA', 'BDU', 'CMĐ', 'CMD', 'RVO', 'ĐTL', 'DTL', 'RML', 'BLC', 'ĐBC', 'RBX', 'SMRM', 'MOOC']) or \
       'DÀN CÀY' in n or 'DÀN BỪA' in n or 'DÀN XỚI' in n or 'NÔNG CỤ' in n or 'RƠ MOÓC' in n or 'RƠ-MOÓC' in n or \
       'GẮP LÁ' in n or 'BÁNH LỒNG' in n or 'RÙA BÁNH XÍCH' in n or 'THIẾT BỊ CƠ GIỚI' in n or \
       'SƠ MI RƠ MOÓC' in n or 'SƠ MI' in n or 'RO MOÓC' in n:
        return 'THIET_BI_NONG_CU', 'THIET_BI_PHU_TRO'
        
    # XE_CONTAINER
    if any(k in c for k in ['XCT', 'CONT', 'TT261', 'SHACMAN', 'A7-', 'CHT-XCT']) or 'CONTAINER' in n or 'ĐẦU KÉO' in n:
        return 'XE_CONTAINER', 'XE_VAN_TAI_CONG_VU'
        
    # XE_BON
    if any(k in c for k in ['XBN', 'XBO', 'CHT-XBN', 'CHT-BON', 'TÉC', 'TEC']) or \
       'XE BỒN' in n or 'TÉC NƯỚC' in n or 'BỒN DẦU' in n or 'TƯỚI NƯỚC' in n or 'XE CẤP DẦU' in n:
        return 'XE_BON', 'XE_VAN_TAI_CONG_VU'
        
    # XE_BEN  
    if any(k in c for k in ['HD270', 'XTA', 'CHT-XTA', 'FD150', 'FC150', 'TXD600']) or 'XE BEN' in n or 'TẢI BEN' in n or 'XE BAN' in n:
        return 'XE_BEN', 'XE_VAN_TAI_CONG_VU'
        
    # XE_BAN_TAI
    if any(k in c for k in ['RANGER', 'BT-50', 'BT50', 'HILUX', 'D-MAX', 'NAVARA', 'XBT']) or 'BÁN TẢI' in n:
        return 'XE_BAN_TAI', 'XE_VAN_TAI_CONG_VU'
        
    # XE_CONG_VU
    if any(k in c for k in ['XCV', 'INNOVA', 'FORTUNER', 'COUNTY', 'SOLATI', 'TRANSIT', 'COUNTY']) or \
       'CÔNG VỤ' in n or 'ĐƯA ĐÓN' in n or 'XE ĐÔ' in n or '7 CHỖ' in n or '16 CHỖ' in n or \
       'XE CỨU THƯƠNG' in n or 'XE CẤP CỨU' in n or 'XE ĐÔNG LẠNH' in n or 'XE CHỞ RÁC' in n:
        return 'XE_CONG_VU', 'XE_VAN_TAI_CONG_VU'
    
    # XE_NANG
    if any(k in c for k in ['XN-', 'FD30', 'FD35', 'FD50', 'CĐ18', 'HELI', 'CHT-XN', 'XD1-XN']) or 'XE NÂNG' in n:
        return 'XE_NANG', 'THIET_BI_PHU_TRO'
        
    # MAY_PHAT_DIEN
    if any(k in c for k in ['MFĐ', 'MFD', 'MPY', 'FPT', 'GENSET', 'DENYO', 'CUMMINS', 'DCA', 'KDP-MFĐ', 'KLP-MFĐ', 'KAD-MFĐ', 'DNP-MFĐ']) or \
       'PHÁT ĐIỆN' in n or 'M.PHÁT ĐIỆN' in n or 'MÁY PHÁT ĐIỆN' in n:
        return 'MAY_PHAT_DIEN', 'THIET_BI_PHU_TRO'
        
    # MAY_PHAT_CO
    if any(k in c for k in ['MPC', 'CG411', 'SRM-', 'XD1-MPC', 'XD2-MPC', 'XD3-MPC', 'KDP-MPC', 'KLP-MPC', 'KAD-MPC']) or \
       'PHÁT CỎ' in n or 'CẮT CỎ' in n or 'MÁY PHÁT CỎ' in n or 'MÁY CẮT CỎ' in n:
        return 'MAY_PHAT_CO', 'THIET_BI_PHU_TRO'
        
    # MAY_CUA
    if any(k in c for k in ['MCG', 'STIHL', 'HUSQVARNA', 'MS381', 'MS250', 'MCG-MKH', 'KDP-MCG', 'KLP-MCG']) or \
       'MÁY CƯA' in n or 'CƯA GỖ' in n or 'CƯA XÍCH' in n or 'MÁY KHOAN' in n:
        return 'MAY_CUA', 'THIET_BI_PHU_TRO'
        
    # MAY_BOM
    if any(k in c for k in ['MBT', 'BOM', 'BƠM', 'DNP-MBT']) or \
       'MÁY BƠM' in n or 'BƠM NƯỚC' in n or 'CHỐNG NGẬP' in n or 'BƠM ĐIỆN' in n:
        return 'MAY_BOM', 'THIET_BI_PHU_TRO'
        
    # XE_MAY_2_BANH
    if any(k in c for k in ['XMA', 'WAVE', 'HONDA', 'SIRIUS', 'BLADE', 'XD1-XMA', 'XD2-XMA', 'XD3-XMA', 'KDP-XMA', 'KLP-XMA', 'KAD-XMA']) or \
       'XE MÁY' in n or 'XE MÁY 2 BÁNH' in n or 'XE MÁY THU HOẠCH' in n:
        return 'XE_MAY_2_BANH', 'THIET_BI_PHU_TRO'
        
    # XE_TAI (Xe tải thùng chở hàng)
    if any(k in c for k in ['HOWO', 'HINO', 'FRONTIER', 'TCD', 'OLLIN', 'AUMAN', 'XTE', 'KIA', 'LIBERO', 'VEAM', 'ISUZU']) or \
       'XE TẢI' in n or 'TẢI THÙNG' in n or 'TẢI MUI BẠT' in n or 'XE KIA' in n or 'LIBERO' in n:
        return 'XE_TAI', 'XE_VAN_TAI_CONG_VU'
        
    # XE_CHUYEN_DUNG (default cho xe chuyên dùng)
    if 'XE CẨU' in n or 'CẨU' in n:
        return 'XE_CONG_VU', 'XE_VAN_TAI_CONG_VU'
    
    # Default
    return 'XE_CHUYEN_DUNG', 'XE_VAN_TAI_CONG_VU'

def detect_region(dvsd):
    d = (dvsd or "").upper()
    if 'DP' in d or 'DAUN PENH' in d or 'DAUPENH' in d:
        return 'DP'
    elif 'LP' in d or 'LUMPHAT' in d:
        return 'LP'
    elif 'AD' in d or 'ANDONG' in d:
        return 'AD'
    elif 'SNOUL' in d or 'SN' == d:
        return 'SN'
    return 'KLH'

def parse_float(val):
    if val is None: return None
    try:
        s = str(val).replace(',', '').strip()
        m = re.search(r'([0-9]+(?:\.[0-9]+)?)', s)
        return float(m.group(1)) if m else None
    except: return None

def parse_date(val):
    if not val: return None
    if isinstance(val, datetime): return val
    s = str(val).strip()
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d/%m/%y'):
        try: return datetime.strptime(s, fmt)
        except: pass
    return None

def is_valid_code(code):
    if not code: return False
    c = str(code).strip()
    if len(c) < 3: return False
    c_upper = c.upper()
    invalid = ['MÃ MMTB', 'STT', 'TT', 'TỔNG CỘNG', 'TỔNG', 'NONE', 'HEADER', 'KHU VỰC', 'DAUNPENH', 'LUMPHAT', 'ANDONG']
    for inv in invalid:
        if inv in c_upper: return False
    # Phải có số hoặc dấu gạch ngang
    if not any(ch.isdigit() for ch in c) and '-' not in c:
        return False
    # Không phải số đơn thuần
    try:
        float(c.replace(',', ''))
        return False
    except: pass
    return True

# ==============================================================================
# ĐỌC DỮ LIỆU TỪ EXCEL - TẤT CẢ SHEET
# ==============================================================================
all_records = {}

# 1. Sheet chính: TỔNG KLH + TN (3054 xe)
print("\n[1] Đọc sheet 'TỔNG KLH + TN'...")
if 'TỔNG KLH + TN' in wb.sheetnames:
    ws = wb['TỔNG KLH + TN']
    count = 0
    for r in ws.iter_rows(min_row=3, values_only=True):
        code = str(r[0]).strip() if r[0] else None
        if not is_valid_code(code): continue
        
        name = str(r[1]).strip() if len(r) > 1 and r[1] else code
        dvsd = str(r[2]).strip() if len(r) > 2 and r[2] else ''
        manufacturer = str(r[3]).strip() if len(r) > 3 and r[3] else None
        origin = str(r[4]).strip() if len(r) > 4 and r[4] else None
        mfg_year = None
        if len(r) > 5 and r[5]:
            try: mfg_year = int(float(str(r[5])))
            except: pass
        model_name = str(r[6]).strip() if len(r) > 6 and r[6] else None
        power_hp = str(r[7]).strip() if len(r) > 7 and r[7] else None
        frame_no = str(r[8]).strip() if len(r) > 8 and r[8] else None
        engine_no = str(r[9]).strip() if len(r) > 9 and r[9] else None
        quota_rate = parse_float(r[10]) if len(r) > 10 else None
        contract_status = str(r[11]).strip() if len(r) > 11 and r[11] else 'KLH'
        
        manager_name, manager_phone = get_manager_info(dvsd)
        
        all_records[code] = {
            'code': code, 'name': name, 'dvsd': dvsd,
            'manufacturer': manufacturer, 'origin': origin,
            'mfg_year': mfg_year, 'model_name': model_name, 'power_hp': power_hp,
            'frame_no': frame_no, 'engine_no': engine_no, 'quota_rate': quota_rate,
            'contract_status': contract_status,
            'manager_name': manager_name, 'manager_phone': manager_phone,
            'source_sheet': 'TỔNG KLH + TN'
        }
        count += 1
    print(f"   ✓ {count} bản ghi")

# 2. Sheet 02. MM-KLH - Bổ sung chi tiết (plate, bravo, purchase condition, allocation date)
print("[2] Đọc sheet '02. MM-KLH' (bổ sung chi tiết)...")
if '02. MM-KLH' in wb.sheetnames:
    ws = wb['02. MM-KLH']
    count_new = 0
    count_update = 0
    for r in ws.iter_rows(min_row=3, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if not is_valid_code(code): continue
        
        old_code = str(r[2]).strip() if len(r) > 2 and r[2] and str(r[2]) != 'None' else None
        bravo_code = str(r[3]).strip() if len(r) > 3 and r[3] and str(r[3]) != 'None' else None
        plate = str(r[4]).strip() if len(r) > 4 and r[4] and str(r[4]) != 'None' else None
        purchase_cond = str(r[5]).strip() if len(r) > 5 and r[5] else None
        name = str(r[6]).strip() if len(r) > 6 and r[6] else code
        dvsd = str(r[8]).strip() if len(r) > 8 and r[8] else ''
        alloc_date = parse_date(r[9]) if len(r) > 9 else None
        cond_status = str(r[10]).strip() if len(r) > 10 and r[10] else 'Bình thường'
        transfer_hist = str(r[12]).strip() if len(r) > 12 and r[12] else None
        manufacturer = str(r[13]).strip() if len(r) > 13 and r[13] else None
        origin = str(r[14]).strip() if len(r) > 14 and r[14] else None
        mfg_year = None
        if len(r) > 15 and r[15]:
            try: mfg_year = int(float(str(r[15])))
            except: pass
        model_name = str(r[16]).strip() if len(r) > 16 and r[16] else None
        power_hp = str(r[17]).strip() if len(r) > 17 and r[17] else None
        frame_no = str(r[18]).strip() if len(r) > 18 and r[18] else None
        engine_no = str(r[19]).strip() if len(r) > 19 and r[19] else None
        quota_rate = parse_float(r[20]) if len(r) > 20 else None
        supplier = str(r[22]).strip() if len(r) > 22 and r[22] else None
        notes = str(r[23]).strip() if len(r) > 23 and r[23] else None
        
        manager_name, manager_phone = get_manager_info(dvsd)
        
        if code in all_records:
            # Cập nhật với info chi tiết hơn
            rec = all_records[code]
            rec.update({
                'old_code': old_code, 'bravo_code': bravo_code, 'plate': plate,
                'purchase_cond': purchase_cond, 'alloc_date': alloc_date,
                'cond_status': cond_status, 'transfer_hist': transfer_hist,
                'supplier': supplier, 'notes': notes
            })
            if dvsd: rec['dvsd'] = dvsd
            if manufacturer: rec['manufacturer'] = manufacturer
            if origin: rec['origin'] = origin
            if mfg_year: rec['mfg_year'] = mfg_year
            if model_name: rec['model_name'] = model_name
            if frame_no: rec['frame_no'] = frame_no
            if engine_no: rec['engine_no'] = engine_no
            if manager_name: rec['manager_name'] = manager_name
            if manager_phone: rec['manager_phone'] = manager_phone
            count_update += 1
        else:
            all_records[code] = {
                'code': code, 'old_code': old_code, 'bravo_code': bravo_code,
                'plate': plate, 'purchase_cond': purchase_cond, 'name': name,
                'dvsd': dvsd, 'alloc_date': alloc_date, 'cond_status': cond_status,
                'transfer_hist': transfer_hist, 'manufacturer': manufacturer,
                'origin': origin, 'mfg_year': mfg_year, 'model_name': model_name,
                'power_hp': power_hp, 'frame_no': frame_no, 'engine_no': engine_no,
                'quota_rate': quota_rate, 'supplier': supplier, 'notes': notes,
                'manager_name': manager_name, 'manager_phone': manager_phone,
                'source_sheet': '02. MM-KLH'
            }
            count_new += 1
    print(f"   ✓ {count_new} mới, {count_update} cập nhật")

# 3. Sheet 04. XMA - Xe máy 2 bánh
print("[3] Đọc sheet '04. XMA' (xe máy 2 bánh)...")
if '04. XMA' in wb.sheetnames:
    ws = wb['04. XMA']
    count = 0
    for r in ws.iter_rows(min_row=3, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if not is_valid_code(code): continue
        if code in all_records: continue  # Đã có
        
        name = str(r[4]).strip() if len(r) > 4 and r[4] else 'Xe máy thu hoạch'
        dvsd = str(r[5]).strip() if len(r) > 5 and r[5] else ''
        alloc_date = parse_date(r[6]) if len(r) > 6 else None
        cond_status = str(r[7]).strip() if len(r) > 7 and r[7] else 'Bình thường'
        manufacturer = str(r[9]).strip() if len(r) > 9 and r[9] else 'HONDA'
        origin = str(r[10]).strip() if len(r) > 10 and r[10] else 'VIỆT NAM'
        mfg_year = None
        if len(r) > 11 and r[11]:
            try: mfg_year = int(float(str(r[11])))
            except: pass
        model_name = str(r[12]).strip() if len(r) > 12 and r[12] else 'WAVE A'
        power_hp = str(r[13]).strip() if len(r) > 13 and r[13] else '110cc'
        frame_no = str(r[14]).strip() if len(r) > 14 and r[14] else None
        engine_no = str(r[15]).strip() if len(r) > 15 and r[15] else None
        quota_rate = parse_float(r[16]) if len(r) > 16 else 0.5
        
        manager_name, manager_phone = get_manager_info(dvsd)
        
        all_records[code] = {
            'code': code, 'name': name, 'dvsd': dvsd, 'alloc_date': alloc_date,
            'cond_status': cond_status, 'manufacturer': manufacturer, 'origin': origin,
            'mfg_year': mfg_year, 'model_name': model_name, 'power_hp': power_hp,
            'frame_no': frame_no, 'engine_no': engine_no, 'quota_rate': quota_rate,
            'manager_name': manager_name, 'manager_phone': manager_phone,
            'source_sheet': '04. XMA', 'override_category': 'XE_MAY_2_BANH'
        }
        count += 1
    print(f"   ✓ {count} bản ghi mới")

# 4. Sheet 05. MPC - Máy phát cỏ
print("[4] Đọc sheet '05. MPC' (máy phát cỏ)...")
if '05. MPC' in wb.sheetnames:
    ws = wb['05. MPC']
    count = 0
    for r in ws.iter_rows(min_row=3, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if not is_valid_code(code): continue
        if code in all_records: continue
        
        name = str(r[4]).strip() if len(r) > 4 and r[4] else 'Máy phát cỏ'
        dvsd = str(r[5]).strip() if len(r) > 5 and r[5] else ''
        alloc_date = parse_date(r[6]) if len(r) > 6 else None
        cond_status = str(r[7]).strip() if len(r) > 7 and r[7] else 'Bình thường'
        manufacturer = str(r[9]).strip() if len(r) > 9 and r[9] else None
        origin = str(r[10]).strip() if len(r) > 10 and r[10] else None
        mfg_year = None
        if len(r) > 11 and r[11]:
            try: mfg_year = int(float(str(r[11])))
            except: pass
        model_name = str(r[12]).strip() if len(r) > 12 and r[12] else None
        
        manager_name, manager_phone = get_manager_info(dvsd)
        
        all_records[code] = {
            'code': code, 'name': name, 'dvsd': dvsd, 'alloc_date': alloc_date,
            'cond_status': cond_status, 'manufacturer': manufacturer, 'origin': origin,
            'mfg_year': mfg_year, 'model_name': model_name,
            'manager_name': manager_name, 'manager_phone': manager_phone,
            'source_sheet': '05. MPC', 'override_category': 'MAY_PHAT_CO'
        }
        count += 1
    print(f"   ✓ {count} bản ghi mới")

# 5. Sheet 07. MFĐ - Máy phát điện
print("[5] Đọc sheet '07. MFĐ' (máy phát điện)...")
if '07. MFĐ' in wb.sheetnames:
    ws = wb['07. MFĐ']
    count = 0
    for r in ws.iter_rows(min_row=4, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if not is_valid_code(code): continue
        if code in all_records: continue
        
        name = str(r[4]).strip() if len(r) > 4 and r[4] else 'Máy phát điện'
        frame_engine = str(r[5]).strip() if len(r) > 5 and r[5] else None
        dvsd = str(r[6]).strip() if len(r) > 6 and r[6] else ''
        model_name = str(r[7]).strip() if len(r) > 7 and r[7] else None
        manufacturer = str(r[8]).strip() if len(r) > 8 and r[8] else None
        mfg_year = None
        if len(r) > 9 and r[9]:
            try: mfg_year = int(float(str(r[9])))
            except: pass
        origin = str(r[10]).strip() if len(r) > 10 and r[10] else None
        power_hp = str(r[11]).strip() if len(r) > 11 and r[11] else None
        quota_rate = parse_float(r[12]) if len(r) > 12 else None
        alloc_date = parse_date(r[13]) if len(r) > 13 else None
        cond_status = str(r[14]).strip() if len(r) > 14 and r[14] else 'Bình thường'
        notes = str(r[15]).strip() if len(r) > 15 and r[15] else None
        
        manager_name, manager_phone = get_manager_info(dvsd)
        
        all_records[code] = {
            'code': code, 'name': name, 'dvsd': dvsd, 'alloc_date': alloc_date,
            'cond_status': cond_status, 'manufacturer': manufacturer, 'origin': origin,
            'mfg_year': mfg_year, 'model_name': model_name, 'power_hp': power_hp,
            'frame_no': frame_engine, 'quota_rate': quota_rate, 'notes': notes,
            'manager_name': manager_name, 'manager_phone': manager_phone,
            'source_sheet': '07. MFĐ', 'override_category': 'MAY_PHAT_DIEN'
        }
        count += 1
    print(f"   ✓ {count} bản ghi mới")

# 6. Sheet THIẾT BỊ ĐIỆN NƯỚC - Máy bơm, thiết bị điện nước
print("[6] Đọc sheet 'THIẾT BỊ ĐIỆN NƯỚC'...")
if 'THIẾT BỊ ĐIỆN NƯỚC' in wb.sheetnames:
    ws = wb['THIẾT BỊ ĐIỆN NƯỚC']
    count = 0
    for r in ws.iter_rows(min_row=4, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if not is_valid_code(code): continue
        if code in all_records: continue
        
        name = str(r[4]).strip() if len(r) > 4 and r[4] else 'Thiết bị điện nước'
        frame_engine = str(r[5]).strip() if len(r) > 5 and r[5] else None
        dvsd = str(r[6]).strip() if len(r) > 6 and r[6] else 'Ban điện nước'
        model_name = str(r[7]).strip() if len(r) > 7 and r[7] else None
        manufacturer = str(r[8]).strip() if len(r) > 8 and r[8] else None
        mfg_year = None
        if len(r) > 9 and r[9]:
            try: mfg_year = int(float(str(r[9])))
            except: pass
        origin = str(r[10]).strip() if len(r) > 10 and r[10] else None
        power_hp = str(r[11]).strip() if len(r) > 11 and r[11] else None
        quota_rate = parse_float(r[12]) if len(r) > 12 else None
        alloc_date = parse_date(r[13]) if len(r) > 13 else None
        cond_status = str(r[14]).strip() if len(r) > 14 and r[14] else 'Bình thường'
        notes = str(r[15]).strip() if len(r) > 15 and r[15] else None
        
        manager_name, manager_phone = get_manager_info(dvsd)
        
        # Xác định category
        if 'BƠM' in name.upper() or 'MBT' in code.upper():
            override_cat = 'MAY_BOM'
        elif 'PHÁT ĐIỆN' in name.upper() or 'MFĐ' in code.upper():
            override_cat = 'MAY_PHAT_DIEN'
        else:
            override_cat = 'MAY_PHAT_DIEN'  # Default cho thiết bị điện
        
        all_records[code] = {
            'code': code, 'name': name, 'dvsd': dvsd, 'alloc_date': alloc_date,
            'cond_status': cond_status, 'manufacturer': manufacturer, 'origin': origin,
            'mfg_year': mfg_year, 'model_name': model_name, 'power_hp': power_hp,
            'frame_no': frame_engine, 'quota_rate': quota_rate, 'notes': notes,
            'manager_name': manager_name, 'manager_phone': manager_phone,
            'source_sheet': 'THIẾT BỊ ĐIỆN NƯỚC', 'override_category': override_cat
        }
        count += 1
    print(f"   ✓ {count} bản ghi mới")

# 7. Sheet 06. MCG-MKH - Máy cưa, máy khoan
print("[7] Đọc sheet '06. MCG-MKH'...")
if '06. MCG-MKH' in wb.sheetnames:
    ws = wb['06. MCG-MKH']
    count = 0
    for r in ws.iter_rows(min_row=3, values_only=True):
        code = str(r[1]).strip() if len(r) > 1 and r[1] else None
        if not is_valid_code(code): continue
        if code in all_records: continue
        
        name = str(r[4]).strip() if len(r) > 4 and r[4] else 'Máy cưa'
        dvsd = str(r[5]).strip() if len(r) > 5 and r[5] else ''
        manufacturer = str(r[9]).strip() if len(r) > 9 and r[9] else None
        model_name = str(r[12]).strip() if len(r) > 12 and r[12] else None
        
        manager_name, manager_phone = get_manager_info(dvsd)
        
        all_records[code] = {
            'code': code, 'name': name, 'dvsd': dvsd,
            'manufacturer': manufacturer, 'model_name': model_name,
            'cond_status': 'Bình thường',
            'manager_name': manager_name, 'manager_phone': manager_phone,
            'source_sheet': '06. MCG-MKH', 'override_category': 'MAY_CUA'
        }
        count += 1
    print(f"   ✓ {count} bản ghi mới")

print(f"\n✓ TỔNG CỘNG: {len(all_records)} bản ghi unique từ tất cả sheet")

# ==============================================================================
# THỐNG KÊ TRƯỚC KHI INSERT
# ==============================================================================
category_stats = {}
for code, r in all_records.items():
    override_cat = r.get('override_category')
    if override_cat:
        cat = override_cat
    else:
        cat, _ = classify_category(r['code'], r['name'])
    category_stats[cat] = category_stats.get(cat, 0) + 1

print("\n=== PHÂN LOẠI DỰ KIẾN ===")
group_map = {
    'MAY_CONG_TRINH': ['MAY_DAO', 'MAY_UI', 'MAY_SAN', 'MAY_LU', 'MAY_XUC_LAT', 'XE_XUC'],
    'MAY_NONG_NGHIEP': ['MAY_CAY', 'MAY_KEO', 'MAY_GAT_DAP'],
    'XE_VAN_TAI_CONG_VU': ['XE_TAI', 'XE_BEN', 'XE_BON', 'XE_CONTAINER', 'XE_BAN_TAI', 'XE_CHUYEN_DUNG', 'XE_CONG_VU', 'XE_CHO_NGUOI'],
    'THIET_BI_PHU_TRO': ['XE_NANG', 'MAY_PHAT_DIEN', 'MAY_PHAT_CO', 'MAY_CUA', 'MAY_BOM', 'XE_MAY_2_BANH', 'THIET_BI_NONG_CU']
}
group_totals = {}
for group, cats in group_map.items():
    total = sum(category_stats.get(c, 0) for c in cats)
    group_totals[group] = total

for group, cats in group_map.items():
    total = group_totals[group]
    label = {'MAY_CONG_TRINH': 'Máy công trình', 'MAY_NONG_NGHIEP': 'Máy nông nghiệp', 
             'XE_VAN_TAI_CONG_VU': 'Vận tải & công vụ', 'THIET_BI_PHU_TRO': 'Thiết bị phụ trợ'}[group]
    print(f"  {label}: {total}")
    for cat in cats:
        if category_stats.get(cat, 0) > 0:
            print(f"    - {cat}: {category_stats.get(cat, 0)}")

grand_total = sum(group_totals.values())
print(f"\n  TỔNG: {grand_total}")

# ==============================================================================
# THỰC HIỆN UPSERT VÀO DATABASE
# ==============================================================================
print("\nBắt đầu import vào database...")

UPSERT_SQL = """
INSERT INTO vehicles (
    code, oldCode, bravoCode, plate, purchaseCondition,
    name, category, assetGroup, unit, complexCode, assignedUnitCode, regionCode,
    allocationDate, conditionStatus, transferHistory, manufacturer, origin,
    manufactureYear, modelName, powerHp, frameNumber, engineNumber,
    fuelQuotaRate, fuelQuotaUnit, fuelTankCapacity, supplier, notes,
    assetCode, contractStatus, companyOwner,
    status, managerName, managerPhone,
    totalMachineHours, hoursSinceLastService, alertTier, odoKm,
    fuelRateStandard, currentLat, currentLng, currentLocationName, lastGpsUpdate,
    createdAt, updatedAt
) VALUES (
    %s, %s, %s, %s, %s,
    %s, %s, %s, 'KOUN_MOM', 'KOUN_MOM', %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s,
    %s, %s, 'THACO AGRI',
    %s, %s, %s,
    0, 0, 'GREEN', 0,
    %s, 13.5678, 106.8901, %s, NULL,
    NOW(), NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    assetGroup = VALUES(assetGroup),
    assignedUnitCode = VALUES(assignedUnitCode),
    regionCode = VALUES(regionCode),
    manufacturer = VALUES(manufacturer),
    origin = VALUES(origin),
    manufactureYear = VALUES(manufactureYear),
    modelName = VALUES(modelName),
    powerHp = VALUES(powerHp),
    frameNumber = VALUES(frameNumber),
    engineNumber = VALUES(engineNumber),
    fuelQuotaRate = VALUES(fuelQuotaRate),
    fuelQuotaUnit = VALUES(fuelQuotaUnit),
    managerName = VALUES(managerName),
    managerPhone = VALUES(managerPhone),
    updatedAt = NOW();
"""

inserted = 0
errors = 0

for code, r in all_records.items():
    try:
        # Phân loại
        override_cat = r.get('override_category')
        if override_cat:
            category = override_cat
            # Xác định asset group dựa trên category
            if override_cat in ['MAY_DAO', 'MAY_UI', 'MAY_SAN', 'MAY_LU', 'MAY_XUC_LAT']:
                asset_group = 'MAY_CONG_TRINH'
            elif override_cat in ['MAY_KEO', 'MAY_GAT_DAP', 'MAY_CAY']:
                asset_group = 'MAY_NONG_NGHIEP'
            elif override_cat in ['XE_NANG', 'MAY_PHAT_DIEN', 'MAY_PHAT_CO', 'MAY_CUA', 'MAY_BOM', 'XE_MAY_2_BANH', 'THIET_BI_NONG_CU']:
                asset_group = 'THIET_BI_PHU_TRO'
            else:
                asset_group = 'XE_VAN_TAI_CONG_VU'
        else:
            category, asset_group = classify_category(r['code'], r['name'])
        
        # Fuel quota
        dvsd = r.get('dvsd', '')
        quota_rate = r.get('quota_rate')
        if quota_rate and quota_rate > 0:
            if category in ['XE_TAI', 'XE_BEN', 'XE_BON', 'XE_CONTAINER', 'XE_BAN_TAI', 'XE_CONG_VU']:
                quota_unit = 'L_PER_KM'
            elif category in ['MAY_KEO', 'MAY_GAT_DAP', 'THIET_BI_NONG_CU']:
                quota_unit = 'L_PER_HA'
            else:
                quota_unit = 'L_PER_HOUR'
        else:
            quota_rate = 12.5
            quota_unit = 'L_PER_HOUR'
        
        # Status
        cond = r.get('cond_status', 'Bình thường') or 'Bình thường'
        if 'hỏng' in cond.lower() or 'hư' in cond.lower() or 'sửa' in cond.lower():
            status = 'SUA_CHUA'
        elif 'bảo dưỡng' in cond.lower():
            status = 'BAO_DUONG'
        elif 'chờ' in cond.lower():
            status = 'CHO_PHAN_CONG'
        else:
            status = 'HOAT_DONG'
        
        region_code = detect_region(dvsd)
        loc_name = f"{dvsd} - KLH Koun Mom" if dvsd else 'Khu liên hợp Koun Mom'
        
        params = (
            r['code'], r.get('old_code'), r.get('bravo_code'), r.get('plate'), r.get('purchase_cond'),
            r['name'], category, asset_group, r.get('dvsd'), region_code,
            r.get('alloc_date'), r.get('cond_status', 'Bình thường'), r.get('transfer_hist'),
            r.get('manufacturer'), r.get('origin'),
            r.get('mfg_year'), r.get('model_name'), r.get('power_hp'),
            r.get('frame_no'), r.get('engine_no'),
            quota_rate, quota_unit, r.get('tank_capacity'), r.get('supplier'), r.get('notes'),
            r.get('asset_code'), r.get('contract_status', 'KLH'),
            status, r.get('manager_name'), r.get('manager_phone'),
            quota_rate, loc_name
        )
        
        cursor.execute(UPSERT_SQL, params)
        inserted += 1
        
        if inserted % 100 == 0:
            print(f"   ... {inserted}/{len(all_records)} bản ghi")
    except Exception as e:
        print(f"   ✗ Lỗi {code}: {e}")
        errors += 1

print(f"\n{'='*60}")
print(f"✓ HOÀN THÀNH IMPORT!")
print(f"  - Đã xử lý: {inserted} bản ghi")
print(f"  - Lỗi: {errors} bản ghi")
print(f"{'='*60}")

# Verify final counts
cursor.execute("SELECT COUNT(*) as total FROM vehicles")
total = cursor.fetchone()['total']
print(f"\n✓ Tổng số xe trong database: {total}")

cursor.execute("SELECT assetGroup, COUNT(*) as cnt FROM vehicles GROUP BY assetGroup")
groups = cursor.fetchall()
for g in groups:
    print(f"   {g['assetGroup']}: {g['cnt']}")

cursor.close()
conn.close()
