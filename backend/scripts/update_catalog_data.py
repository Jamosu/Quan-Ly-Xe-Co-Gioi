import json
import re

def update():
    with open('d:/ThacoAgri_Code/Mockup/frontend/src/data/farms_seed.json', 'r', encoding='utf-8') as f:
        farms = json.load(f)

    with open('d:/ThacoAgri_Code/Mockup/frontend/src/data/catalogData.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update BE01 areaHa to 1411.972
    content = content.replace("code: 'BE01', name: 'Xí nghiệp Chuối DP1', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'ENTERPRISE', address: 'Vùng Daun Penh, KLH Koun Mom', managerName: 'Vũ Đức Thịnh', phone: '0918.111.001', areaHa: 1100", "code: 'BE01', name: 'Xí nghiệp Chuối DP1', parentCode: 'KOUN_MOM', parentName: 'Khu liên hợp Koun Mom', type: 'ENTERPRISE', address: 'Vùng Daun Penh, KLH Koun Mom', managerName: 'Vũ Đức Thịnh', phone: '0918.111.001', areaHa: 1411.972")

    # 2. Update KOUN_MOM areaHa to 16963.944
    content = content.replace("areaHa: 16340", "areaHa: 16963.944")

    # 3. Replace mockFarms
    farms_ts = 'export const mockFarms: CatalogItem[] = ' + json.dumps(farms, ensure_ascii=False, indent=2) + ';\n'
    content = re.sub(r'export const mockFarms: CatalogItem\[\] = \[\];', farms_ts, content)

    with open('d:/ThacoAgri_Code/Mockup/frontend/src/data/catalogData.ts', 'w', encoding='utf-8') as f:
        f.write(content)

    print('Updated catalogData.ts successfully!')

if __name__ == '__main__':
    update()
