import sys
import subprocess
sys.stdout.reconfigure(encoding='utf-8')

cmd = [r'C:\xampp\mysql\bin\mysql.exe', '-u', 'root', '--default-character-set=utf8mb4', '-e',
       "USE thaco_agri_qlxcg; SELECT id, code, name, type FROM catalogs WHERE type='COMPLEX'; SELECT complexCode, count(*) as cnt FROM vehicles GROUP BY complexCode;"]

res = subprocess.run(cmd, capture_output=True)
print(res.stdout.decode('utf-8', errors='replace'))
