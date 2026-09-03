import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

# The exact hash for password "123456"
correct_hash = "$2b$10$yP/T0VYLb7hNTKwcrvceAOD1PrRdTIf4FGRA7ivzluxQD9MMJJEq2"

sql = f"USE thaco_agri_qlxcg; UPDATE users SET passwordHash = '{correct_hash}';"

res = subprocess.run(
    [r'C:\xampp\mysql\bin\mysql.exe', '--default-character-set=utf8mb4', '-u', 'root', '-e', sql],
    capture_output=True
)

print("Updated password hashes. Output:", res.stdout.decode('utf-8', errors='replace'))

# Verify
res2 = subprocess.run(
    [r'C:\xampp\mysql\bin\mysql.exe', '--default-character-set=utf8mb4', '-u', 'root', '-e', 'USE thaco_agri_qlxcg; SELECT id, username, passwordHash FROM users LIMIT 3;'],
    capture_output=True
)
print("Verification:")
print(res2.stdout.decode('utf-8', errors='replace'))
