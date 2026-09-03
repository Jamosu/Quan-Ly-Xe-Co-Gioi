import re

with open('frontend/src/data/catalogData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

mock_regions_code = """
export const mockRegions: CatalogItem[] = [
  // --- KLH KOUN MOM ---
  { id: 'KV_DP', code: 'DP', name: 'Khu vực Daun Penh (DP)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Vùng Daun Penh, Tỉnh Ratanakiri, Campuchia', managerName: 'Ban Giám đốc KV Daun Penh', phone: '0918.111.001', status: 'HOAT_DONG', description: 'Cụm các xí nghiệp trồng chuối & cây ăn trái Daun Penh', createdAt: '01-01-2026' },
  { id: 'KV_LP', code: 'LP', name: 'Khu vực Lumphat (LP)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Vùng Lumphat, Tỉnh Ratanakiri, Campuchia', managerName: 'Ban Giám đốc KV Lumphat', phone: '0918.111.004', status: 'HOAT_DONG', description: 'Cụm các xí nghiệp chuối Lumphat', createdAt: '01-01-2026' },
  { id: 'KV_AD', code: 'AD', name: 'Khu vực Andong Meas (AD)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Vùng Andong Meas, Tỉnh Ratanakiri, Campuchia', managerName: 'Ban Giám đốc KV Andong Meas', phone: '0918.111.008', status: 'HOAT_DONG', description: 'Khu vực chăn nuôi bò Andong Meas', createdAt: '01-01-2026' },
  { id: 'KV_KM', code: 'KLH', name: 'Khu vực Văn phòng KLH Koun Mom (KLH)', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'REGION', address: 'Trung tâm điều hành KLH Koun Mom', managerName: 'Ban Giám đốc KLH Koun Mom', phone: '0918.111.000', status: 'HOAT_DONG', description: 'Khối cơ quan & hạ tầng dùng chung KLH Koun Mom', createdAt: '01-01-2026' },

  // --- KLH SNOUL ---
  { id: 'KV_BP', code: 'BP', name: 'Khu vực Snoul BP (BP)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Vùng BP, Huyện Snoul, Tỉnh Kratie', managerName: 'Ban Giám đốc KV BP', phone: '0918.222.002', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối BP Snoul', createdAt: '01-01-2026' },
  { id: 'KV_BSA', code: 'BSA', name: 'Khu vực Snoul BSA (BSA)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Vùng BSA, Huyện Snoul, Tỉnh Kratie', managerName: 'Ban Giám đốc KV BSA', phone: '0918.222.005', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối BSA Snoul', createdAt: '01-01-2026' },
  { id: 'KV_ERC', code: 'ERC', name: 'Khu vực Snoul ERC (ERC)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Vùng ERC, Huyện Snoul, Tỉnh Kratie', managerName: 'Ban Giám đốc KV ERC', phone: '0918.222.001', status: 'HOAT_DONG', description: 'Xí nghiệp chuối ERC Snoul', createdAt: '01-01-2026' },
  { id: 'KV_SN', code: 'SN', name: 'Khu vực Văn phòng KLH Snoul (SN)', parentCode: 'SNOUL', parentName: 'Khu liên hợp Snoul', type: 'REGION', address: 'Trung tâm điều hành KLH Snoul', managerName: 'Ban Giám đốc KLH Snoul', phone: '0918.222.000', status: 'HOAT_DONG', description: 'Khối cơ quan & hạ tầng dùng chung KLH Snoul', createdAt: '01-01-2026' },

  // --- KLH NAM LÀO ---
  { id: 'KV_NSA', code: 'NSA', name: 'Khu vực Sanxay NSA (NSA)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Vùng NSA, Sanxay, Attapeu, Lào', managerName: 'Ban Giám đốc KV NSA', phone: '0918.333.001', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối NSA Nam Lào', createdAt: '01-01-2026' },
  { id: 'KV_NK', code: 'NK', name: 'Khu vực Sanxay NK (NK)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Vùng NK, Sanxay, Attapeu, Lào', managerName: 'Ban Giám đốc KV NK', phone: '0918.333.002', status: 'HOAT_DONG', description: 'Cụm xí nghiệp chuối NK Nam Lào', createdAt: '01-01-2026' },
  { id: 'KV_PV', code: 'PV', name: 'Khu vực Phouvong (PV)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Vùng Phouvong, Attapeu, Lào', managerName: 'Ban Giám đốc KV PV', phone: '0918.333.003', status: 'HOAT_DONG', description: 'Xí nghiệp chuối Phouvong Nam Lào', createdAt: '01-01-2026' },
  { id: 'KV_NL', code: 'NL', name: 'Khu vực Văn phòng KLH Nam Lào (NL)', parentCode: 'NAM_LAO', parentName: 'Khu liên hợp Nam Lào', type: 'REGION', address: 'Trung tâm điều hành KLH Nam Lào', managerName: 'Ban Giám đốc KLH Nam Lào', phone: '0918.333.000', status: 'HOAT_DONG', description: 'Khối cơ quan & hạ tầng dùng chung KLH Nam Lào', createdAt: '01-01-2026' },
];
"""

if 'mockRegions' not in content:
    content = content.replace('export const mockDepartments:', mock_regions_code + '\nexport const mockDepartments:')
    with open('frontend/src/data/catalogData.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added mockRegions to catalogData.ts")
else:
    print("mockRegions already present")
