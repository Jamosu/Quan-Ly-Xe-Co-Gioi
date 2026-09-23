import os
import pymysql
import datetime
from decimal import Decimal

def dump_database(output_path):
    print(f"Connecting to production database mvms_db...")
    conn = pymysql.connect(
        host='10.23.1.250',
        port=3308,
        user='root',
        password='Thaco@123',
        database='mvms_db',
        charset='utf8mb4'
    )
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES;")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Found {len(tables)} tables to dump.")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- ========================================================\n")
        f.write(f"-- PRODUCTION DATABASE DUMP: mvms_db\n")
        f.write(f"-- Exported at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- Server: 10.23.1.250:3308\n")
        f.write("-- ========================================================\n\n")
        f.write("SET NAMES utf8mb4;\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
        f.write("SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n\n")

        for table in tables:
            print(f"Dumping table: {table}...")
            f.write(f"\n-- --------------------------------------------------------\n")
            f.write(f"-- Table structure for table `{table}`\n")
            f.write(f"-- --------------------------------------------------------\n\n")
            f.write(f"DROP TABLE IF EXISTS `{table}`;\n")

            cursor.execute(f"SHOW CREATE TABLE `{table}`;")
            create_stmt = cursor.fetchone()[1]
            f.write(f"{create_stmt};\n\n")

            cursor.execute(f"SELECT * FROM `{table}`;")
            rows = cursor.fetchall()
            if rows:
                cursor.execute(f"DESCRIBE `{table}`;")
                cols = [f"`{col[0]}`" for col in cursor.fetchall()]
                cols_str = ", ".join(cols)

                f.write(f"-- Dumping data for table `{table}` ({len(rows)} rows)\n\n")
                
                # Chunk inserts by 100 rows
                chunk_size = 100
                for i in range(0, len(rows), chunk_size):
                    chunk = rows[i:i + chunk_size]
                    value_strs = []
                    for row in chunk:
                        row_vals = []
                        for val in row:
                            if val is None:
                                row_vals.append("NULL")
                            elif isinstance(val, (int, float, Decimal)):
                                row_vals.append(str(val))
                            elif isinstance(val, bool):
                                row_vals.append("1" if val else "0")
                            elif isinstance(val, (datetime.datetime, datetime.date, datetime.time)):
                                row_vals.append(f"'{val}'")
                            elif isinstance(val, (bytes, bytearray)):
                                row_vals.append(f"0x{val.hex()}")
                            else:
                                escaped_val = str(val).replace('\\', '\\\\').replace("'", "''").replace('\r', '\\r').replace('\n', '\\n')
                                row_vals.append(f"'{escaped_val}'")
                        value_strs.append(f"({', '.join(row_vals)})")
                    f.write(f"INSERT INTO `{table}` ({cols_str}) VALUES\n  " + ",\n  ".join(value_strs) + ";\n")
                f.write("\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")
        f.write("-- DUMP COMPLETED\n")

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nDump complete: {output_path} ({file_size_mb:.2f} MB)")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    target = os.path.abspath(r"D:\ThacoAgri_Code\Mockup\database\production_data_dump.sql")
    dump_database(target)
    
    # Also copy to backend/prisma/production_data_dump.sql if useful
    backend_target = os.path.abspath(r"D:\ThacoAgri_Code\Mockup\backend\prisma\production_data_dump.sql")
    import shutil
    shutil.copyfile(target, backend_target)
    print(f"Copied dump to backend target: {backend_target}")
