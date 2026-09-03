import subprocess
import json

def run_query(sql):
    res = subprocess.run(
        [r'C:\xampp\mysql\bin\mysql.exe', '-u', 'root', '-e', f'USE thaco_agri_qlxcg; {sql}'],
        capture_output=True, text=True, encoding='utf-8'
    )
    return res.stdout

print("=== EXISTING TABLES & ROWS ===")
print(run_query("SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'thaco_agri_qlxcg';"))

tables = [
    'companies', 'users', 'employees', 'vehicles', 'agricultural_implements',
    'implement_attachment_logs', 'production_plans', 'production_plot_progresses',
    'production_audit_trails', 'dispatch_orders', 'transport_orders', 'feed_raw_materials',
    'internal_feed_trips', 'fuel_warehouses', 'fuel_dispense_tickets', 'maintenance_records',
    'repair_tickets', 'workshop_owed_part_notes', 'driver_kpis', 'driver_sos_alerts',
    'catalogs', 'personnel_partners'
]

for t in tables:
    print(f"\n--- Table: {t} ---")
    print(run_query(f"DESCRIBE {t};"))
