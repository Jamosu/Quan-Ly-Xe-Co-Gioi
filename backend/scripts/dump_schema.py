import subprocess

def run_query(sql):
    res = subprocess.run(
        [r'C:\xampp\mysql\bin\mysql.exe', '--default-character-set=utf8mb4', '-u', 'root', '-e', f'USE thaco_agri_qlxcg; {sql}'],
        capture_output=True
    )
    return res.stdout.decode('utf-8', errors='replace')

tables = [
    'companies', 'users', 'employees', 'vehicles', 'agricultural_implements',
    'implement_attachment_logs', 'production_plans', 'production_plot_progresses',
    'production_audit_trails', 'dispatch_orders', 'transport_orders', 'feed_raw_materials',
    'internal_feed_trips', 'fuel_warehouses', 'fuel_dispense_tickets', 'maintenance_records',
    'repair_tickets', 'workshop_owed_part_notes', 'driver_kpis', 'driver_sos_alerts',
    'catalogs', 'personnel_partners'
]

with open('schema_dump.sql', 'w', encoding='utf-8') as f:
    for t in tables:
        f.write(f"\n-- ================= TABLE: {t} ================\n")
        f.write(run_query(f"SHOW CREATE TABLE {t};"))
        f.write("\n")

print("Dumped schema to schema_dump.sql")
