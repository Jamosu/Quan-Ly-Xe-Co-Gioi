import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ManagerAddressInfo {
  managerName?: string | null;
  currentLocationName?: string | null;
  managerPhone?: string | null;
  totalMachineHours?: number | null;
  odoKm?: number | null;
}

async function main() {
  console.log('🚀 Bắt đầu đồng bộ thông tin Nhân sự quản lý & Địa chỉ nơi tập kết từ file Excel...');
  const filePath = 'd:/ThacoAgri_Code/Mockup/docs/00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx';
  const wb = XLSX.readFile(filePath);

  const infoMap = new Map<string, ManagerAddressInfo>();

  function parseNumber(val: any): number | null {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (!val) return null;
    const str = String(val).replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
    if (!str) return null;
    const n = Number(str[0]);
    return Number.isFinite(n) ? n : null;
  }

  function readSheet(
    sheetName: string,
    codeCol: number,
    mgrCol: number | null,
    addrCol: number | null,
    phoneCol: number | null,
    hoursCol: number | null,
    kmCol: number | null,
    startRow: number,
  ) {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Đọc sheet "${sheetName}": ${rows.length} dòng.`);

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[codeCol]) continue;
      const code = String(row[codeCol]).trim();
      if (!code || code === '-' || code.startsWith('KLH') || code === 'Mã MMTB' || code === 'MÃ MMTB MỚI') continue;

      const mgr = mgrCol !== null && row[mgrCol] ? String(row[mgrCol]).trim() : null;
      const addr = addrCol !== null && row[addrCol] ? String(row[addrCol]).trim() : null;
      const phone = phoneCol !== null && row[phoneCol] ? String(row[phoneCol]).trim() : null;
      const hours = hoursCol !== null ? parseNumber(row[hoursCol]) : null;
      const km = kmCol !== null ? parseNumber(row[kmCol]) : null;

      if (mgr || addr || phone || hours !== null || km !== null) {
        const existing = infoMap.get(code) || {};
        infoMap.set(code, {
          managerName: mgr || existing.managerName || null,
          currentLocationName: addr || existing.currentLocationName || null,
          managerPhone: phone || existing.managerPhone || null,
          totalMachineHours: hours !== null ? hours : (existing.totalMachineHours ?? null),
          odoKm: km !== null ? km : (existing.odoKm ?? null),
        });
      }
    }
  }

  // 1. Sheet "XE & MÁY CG AGRI"
  readSheet('XE & MÁY CG AGRI', 12, 22, 23, 24, 16, 15, 3);

  // 2. Sheet "TB CG AGRI"
  readSheet('TB CG AGRI', 9, 15, 16, 17, null, null, 3);

  // 3. Sheet "07. MFĐ"
  readSheet('07. MFĐ', 1, null, 16, null, null, null, 3);

  // 4. Sheet "THIẾT BỊ ĐIỆN NƯỚC"
  readSheet('THIẾT BỊ ĐIỆN NƯỚC', 1, null, 16, null, null, null, 3);

  console.log(`Đã tổng hợp ${infoMap.size} xe/thiết bị có thông tin Quản lý / Nơi tập kết / SĐT.`);

  // Cập nhật trực tiếp vào database MySQL qua raw query hoặc prisma
  let updatedCount = 0;
  for (const [code, info] of infoMap.entries()) {
    const updateParts: string[] = [];
    const params: any[] = [];

    if (info.managerName) {
      updateParts.push('managerName = ?');
      params.push(info.managerName);
    }
    if (info.currentLocationName) {
      updateParts.push('currentLocationName = ?');
      params.push(info.currentLocationName);
    }
    if (info.managerPhone) {
      updateParts.push('managerPhone = ?');
      params.push(info.managerPhone);
    }
    if (info.totalMachineHours !== null && info.totalMachineHours !== undefined) {
      updateParts.push('totalMachineHours = ?');
      params.push(info.totalMachineHours);
    }
    if (info.odoKm !== null && info.odoKm !== undefined) {
      updateParts.push('odoKm = ?');
      params.push(info.odoKm);
    }

    if (updateParts.length > 0) {
      params.push(code);
      const sql = `UPDATE vehicles SET ${updateParts.join(', ')} WHERE code = ?`;
      const res: any = await prisma.$executeRawUnsafe(sql, ...params);
      if (res > 0) {
        updatedCount += res;
      }
    }
  }

  console.log(`✅ Đã cập nhật thành công thông tin Quản lý & Nơi tập kết cho ${updatedCount} xe cơ giới trong database!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
