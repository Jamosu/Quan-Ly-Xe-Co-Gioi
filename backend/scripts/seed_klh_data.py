import sys
import subprocess
sys.stdout.reconfigure(encoding='utf-8')

sql_statements = """
USE thaco_agri_qlxcg;

-- 1. Clean up and standardize COMPLEX in catalogs table
DELETE FROM catalogs WHERE type = 'COMPLEX';

INSERT INTO catalogs (id, code, name, type, address, managerName, status, createdAt, updatedAt)
VALUES 
('KLH_KM', 'KOUN_MOM', 'Khu liên hợp Koun Mom', 'COMPLEX', 'Huyện Koun Mom, Tỉnh Ratanakiri, Campuchia', 'Ban Quản lý KLH Koun Mom', 'HOAT_DONG', NOW(3), NOW(3)),
('KLH_SN', 'SNOUL', 'Khu liên hợp Snoul', 'COMPLEX', 'Huyện Snoul, Tỉnh Kratie, Campuchia', 'Ban Quản lý KLH Snoul', 'HOAT_DONG', NOW(3), NOW(3)),
('KLH_NL', 'NAM_LAO', 'Khu liên hợp Nam Lào', 'COMPLEX', 'Tỉnh Attapeu, CHDCND Lào', 'Ban Quản lý KLH Nam Lào', 'HOAT_DONG', NOW(3), NOW(3));

-- 2. Distribute vehicles realistically across the 3 complexes based on regionCode / allocation
UPDATE vehicles SET complexCode = 'KOUN_MOM' WHERE regionCode = 'DP';
UPDATE vehicles SET complexCode = 'SNOUL' WHERE regionCode = 'AD';
UPDATE vehicles SET complexCode = 'NAM_LAO' WHERE regionCode = 'LP';

-- For regionCode = 'KLH' or NULL, distribute evenly
UPDATE vehicles SET complexCode = 'KOUN_MOM' WHERE (regionCode = 'KLH' OR regionCode IS NULL) AND (id % 3 = 0);
UPDATE vehicles SET complexCode = 'SNOUL' WHERE (regionCode = 'KLH' OR regionCode IS NULL) AND (id % 3 = 1);
UPDATE vehicles SET complexCode = 'NAM_LAO' WHERE (regionCode = 'KLH' OR regionCode IS NULL) AND (id % 3 = 2);

-- Verify results
SELECT id, code, name, type FROM catalogs WHERE type = 'COMPLEX';
SELECT complexCode, count(*) as vehicle_count FROM vehicles GROUP BY complexCode;
"""

cmd = [r'C:\xampp\mysql\bin\mysql.exe', '-u', 'root', '--default-character-set=utf8mb4', '-e', sql_statements]
res = subprocess.run(cmd, capture_output=True)
print("STDOUT:")
print(res.stdout.decode('utf-8', errors='replace'))
if res.stderr:
    print("STDERR:")
    print(res.stderr.decode('utf-8', errors='replace'))
