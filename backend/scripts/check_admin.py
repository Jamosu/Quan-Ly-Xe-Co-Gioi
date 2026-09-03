import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

res = subprocess.run(
    [r'C:\xampp\mysql\bin\mysql.exe', '--default-character-set=utf8mb4', '-u', 'root', '-e', 'USE thaco_agri_qlxcg; SELECT id, username, fullName, passwordHash, isActive FROM users WHERE username=\'admin\';'],
    capture_output=True
)
print(res.stdout.decode('utf-8', errors='replace'))
