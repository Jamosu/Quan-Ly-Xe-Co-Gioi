import subprocess

def run_query(sql):
    res = subprocess.run(
        [r'C:\xampp\mysql\bin\mysql.exe', '-u', 'root', '-e', f'USE thaco_agri_qlxcg; {sql}'],
        capture_output=True, text=True, encoding='utf-8'
    )
    return res.stdout

print(run_query("""
SELECT table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = 'thaco_agri_qlxcg' 
ORDER BY table_name;
"""))
