import * as XLSX from 'xlsx';
import { PrismaClient, ImplementCategory, ImplementStatus, TechnicalCondition, Unit } from '@prisma/client';

const prisma = new PrismaClient();

interface ExcelImplementRow {
  code: string;
  name: string;
  subType: string;
  unit: string;
  condition: string;
  notes: string;
  brand: string;
  model: string;
  origin: string;
  year: number | null;
  specs: string;
  serial: string;
  fuelQuota: number | null;
  purchaseCondition: string;
}

// Bảng nhân sự quản lý & nơi tập kết chuẩn từ sheet "NS QUẢN LÝ CG" và "TB CG AGRI"
const UNIT_MANAGER_MAP: Record<string, { managerName: string; gatheringLocation: string; managerPhone: string }> = {
  'CGLĐ DP': { managerName: 'Nguyễn Tấn Triều', gatheringLocation: 'Lô 85 DP4', managerPhone: '05974160290' },
  'CGLĐ LP': { managerName: 'Nguyễn Tấn Triều', gatheringLocation: 'LP3.5-LP3', managerPhone: '05974160290' },
  'CGTC DP': { managerName: 'Phạm Ngọc Hải', gatheringLocation: 'Lô 85 DP4', managerPhone: '0825456565' },
  'CGTC LP': { managerName: 'Phạm Ngọc Hải', gatheringLocation: 'Lô 85 DP4', managerPhone: '0825456565' },
  'CGTC AD': { managerName: 'Phạm Ngọc Hải', gatheringLocation: 'Lô 85 DP4', managerPhone: '0825456565' },
  'XN Chuối DP1': { managerName: 'Thái Cao Lưu', gatheringLocation: 'Lô 21 DP1', managerPhone: '0387783316' },
  'XN Chuối DP2': { managerName: 'Huỳnh Quang Viên', gatheringLocation: 'Lô 15.6 DP2', managerPhone: '0977623379' },
  'XN Chuối DP3': { managerName: 'Thạch Ngọc Vững', gatheringLocation: 'Lô 28 DP3', managerPhone: '0975905267' },
  'XN Chuối DP4': { managerName: 'Cơ giới DP4', gatheringLocation: 'Lô 85 DP4', managerPhone: '0825456565' },
  'XN Chuối LP1': { managerName: 'Nguyễn Ngọc Nhân', gatheringLocation: 'Lô 7 LP1', managerPhone: '0979578112' },
  'XN Chuối LP2': { managerName: 'Nguyễn Ngọc Nhân', gatheringLocation: 'Lô 7 LP1', managerPhone: '0979578112' },
  'XN Chuối LP3': { managerName: 'Lê Cao Nghị', gatheringLocation: 'Lô 2 LP3', managerPhone: '0977423100' },
  'XN Bò AD': { managerName: 'Đội cơ giới XN Bò', gatheringLocation: 'Trại Bò AD', managerPhone: '0975905267' },
  'TT BTSC': { managerName: 'Xưởng cơ khí BTSC', gatheringLocation: 'Xưởng BTSC Trung tâm', managerPhone: '0825456565' },
};

function inferCategory(name: string, subType: string): ImplementCategory {
  const text = (name + ' ' + subType).toLowerCase();
  if (text.includes('cày') || text.includes('cày') || text.includes('cna') || text.includes('cch')) {
    return ImplementCategory.DAN_CAY;
  }
  if (text.includes('bừa') || text.includes('bừa') || text.includes('bua')) {
    return ImplementCategory.DAN_BUA;
  }
  if (text.includes('xới') || text.includes('xới') || text.includes('úp luống') || text.includes('luống') || text.includes('rãnh') || text.includes('rãnh')) {
    return ImplementCategory.DAN_XOI;
  }
  if (text.includes('phân') || text.includes('vôi') || text.includes('vôi') || text.includes('rải') || text.includes('rải')) {
    return ImplementCategory.DAN_RAI_PHAN;
  }
  if (text.includes('phun') || text.includes('xịt') || text.includes('khử trùng') || text.includes('bvtv')) {
    return ImplementCategory.DAN_PHUN_THUOC;
  }
  return ImplementCategory.RO_MOOC;
}

function inferUnitEnum(unitName: string): Unit {
  const u = (unitName || '').toUpperCase();
  if (u.includes('NT1') || u.includes('DP1') || u.includes('DP2')) return Unit.NT1;
  if (u.includes('NT2') || u.includes('LP1') || u.includes('LP2')) return Unit.NT2;
  if (u.includes('BÒ') || u.includes('BO') || u.includes('AD')) return Unit.XN_BO;
  if (u.includes('BTSC') || u.includes('SC')) return Unit.TT_BTSC;
  return Unit.BAN_CO_GIOI;
}

async function main() {
  console.log('🚀 Bắt đầu nạp 100% dữ liệu thực tế kho bãi, nhân sự quản lý & nơi tập kết từ Excel...');
  const filePath = 'd:/ThacoAgri_Code/Mockup/docs/00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx';
  const wb = XLSX.readFile(filePath);

  // 1. Đọc sheet "TB CG AGRI" để lấy thông tin chi tiết từng mã
  const wsTb = wb.Sheets['TB CG AGRI'];
  const tbRows: any[] = XLSX.utils.sheet_to_json(wsTb, { header: 1 });
  const tbMap = new Map<string, { mgr: string; addr: string; phone: string; status: string }>();
  for (let r = 3; r < tbRows.length; r++) {
    const row = tbRows[r];
    if (!row || !row[9]) continue;
    const code = String(row[9]).trim();
    if (!code || code === '-' || code.startsWith('KLH')) continue;
    tbMap.set(code, {
      mgr: row[15] ? String(row[15]).trim() : '',
      addr: row[16] ? String(row[16]).trim() : '',
      phone: row[17] ? String(row[17]).trim() : '',
      status: row[10] ? 'Đang HĐ' : row[11] ? 'Chờ Sửa' : row[12] ? 'Không còn SD' : '',
    });
  }

  // 2. Đọc sheet "03.1 NHÓM TB" (danh mục 690 thiết bị gốc)
  const ws = wb.Sheets['03.1 NHÓM TB'];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const rawList: ExcelImplementRow[] = [];
  let currentSubType = 'Nông cụ cơ giới';

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();

    if ((col0 === '-' || col0 === 'I.' || col0 === 'II.' || col0 === 'III.' || col0 === 'IV.' || col0 === 'V.') && col1 && !col1.startsWith('C') && !col1.startsWith('T') && !col1.startsWith('K')) {
      currentSubType = col1;
      continue;
    }

    if (!col1 || col1 === '-' || col1.startsWith('KLH') || col1.startsWith('NHÓM') || col1.startsWith('I.') || col1.startsWith('II.') || col1.startsWith('III.') || col1.startsWith('IV.') || col1.startsWith('V.') || col1.length < 4) continue;

    const code = col1;
    const name = String(row[5] || '').trim();
    if (!name) continue;

    const purchaseCondition = String(row[4] || '').trim();
    const unit = String(row[7] || '').trim();
    const condition = String(row[10] || '').trim();
    const notes = String(row[12] || '').trim();
    const brand = String(row[13] || '').trim();
    const model = String(row[14] || '').trim();
    const origin = String(row[15] || '').trim();
    const yearRaw = Number(row[16]);
    const year = Number.isFinite(yearRaw) && yearRaw > 1980 ? yearRaw : null;
    const specs = String(row[17] || '').trim();
    const serial = String(row[18] || '').trim();
    const fuelQuotaRaw = Number(row[19]);
    const fuelQuota = Number.isFinite(fuelQuotaRaw) && fuelQuotaRaw > 0 ? fuelQuotaRaw : null;

    rawList.push({
      code,
      name,
      subType: currentSubType,
      unit: unit || 'Ban Cơ Giới',
      condition,
      notes,
      brand,
      model,
      origin,
      year,
      specs,
      serial,
      fuelQuota,
      purchaseCondition,
    });
  }

  console.log(`Đã trích xuất ${rawList.length} thiết bị đính kèm thực tế từ file Excel.`);

  // Xóa sạch dữ liệu mẫu và các liên kết cũ
  await prisma.implementAttachmentLog.deleteMany({});
  await prisma.agriculturalImplement.deleteMany({});

  let countInDepot = 0;
  let countMaintenance = 0;

  const seenCodes = new Map<string, number>();

  for (const raw of rawList) {
    let finalCode = raw.code;
    if (seenCodes.has(finalCode)) {
      const count = seenCodes.get(finalCode)! + 1;
      seenCodes.set(finalCode, count);
      finalCode = `${finalCode}-${count}`;
    } else {
      seenCodes.set(finalCode, 1);
    }

    const category = inferCategory(raw.name, raw.subType);
    const unitEnum = inferUnitEnum(raw.unit);

    // Kiểm tra tình trạng hư hỏng
    const condLower = raw.condition.toLowerCase();
    const notesLower = raw.notes.toLowerCase();
    const isHuuHong =
      condLower.includes('hỏng') ||
      condLower.includes('hỏng') ||
      condLower.startsWith('hư') ||
      notesLower.includes('hư') ||
      notesLower.includes('xsc') ||
      notesLower.includes('xưởng sc');

    // Lấy thông tin Quản lý & Nơi tập kết thực tế từ TB CG AGRI hoặc UNIT_MANAGER_MAP
    const tbInfo = tbMap.get(raw.code);
    const defaultUnitInfo = UNIT_MANAGER_MAP[raw.unit] || {
      managerName: raw.unit.includes('DP') ? 'Nguyễn Tấn Triều' : raw.unit.includes('LP') ? 'Nguyễn Ngọc Nhân' : 'Phạm Ngọc Hải',
      gatheringLocation: raw.unit.includes('DP') ? 'Lô 85 DP4' : raw.unit.includes('LP') ? 'LP3.5-LP3' : 'Bãi xe Trung tâm',
      managerPhone: raw.unit.includes('DP') ? '05974160290' : '0825456565',
    };

    const managerName = tbInfo?.mgr || defaultUnitInfo.managerName;
    const gatheringLocation = tbInfo?.addr || defaultUnitInfo.gatheringLocation;
    const managerPhone = tbInfo?.phone || defaultUnitInfo.managerPhone;

    // PHƯƠNG ÁN A: 100% NÔNG CỤ Ở TRẠNG THÁI KHO BÃI THỰC TẾ, KHÔNG TỰ ĐỘNG GÁN XE ẢO
    const status: ImplementStatus = isHuuHong ? ImplementStatus.MAINTENANCE : ImplementStatus.IN_DEPOT;
    const technicalCondition: TechnicalCondition = isHuuHong ? TechnicalCondition.NEED_REPAIR : TechnicalCondition.GOOD;

    if (isHuuHong) countMaintenance++;
    else countInDepot++;

    const purposeParts: string[] = [
      `Đơn vị: ${raw.unit}`,
      raw.brand ? `Hãng: ${raw.brand}` : '',
      raw.model ? `Model: ${raw.model}` : '',
      raw.subType ? `Nhóm: ${raw.subType}` : '',
      raw.purchaseCondition ? `Tình trạng mua: ${raw.purchaseCondition}` : '',
      raw.year ? `Năm SX: ${raw.year}` : '',
      gatheringLocation ? `Nơi tập kết: ${gatheringLocation}` : '',
      managerName ? `Quản lý: ${managerName}` : '',
      managerPhone ? `Zalo/SĐT: ${managerPhone}` : '',
      raw.notes ? `Ghi chú: ${raw.notes}` : '',
    ].filter(Boolean);

    await prisma.agriculturalImplement.create({
      data: {
        code: finalCode,
        name: raw.name,
        category,
        unit: unitEnum,
        currentVehicleId: null, // Không gắn xe ảo nào!
        status,
        technicalCondition,
        standardPurpose: purposeParts.join(' · '),
        managerName,
        gatheringLocation,
        managerPhone,
      },
    });
  }

  console.log(`\n🎉 HOÀN TẤT NẠP DỮ LIỆU PHƯƠNG ÁN A:`);
  console.log(`- Tổng số thiết bị đính kèm: ${rawList.length}`);
  console.log(`- Sẵn sàng hoạt động (Tại bãi đội / Sẵn sàng điều động): ${countInDepot}`);
  console.log(`- Đang bảo dưỡng / Sửa chữa tại Xưởng BTSC: ${countMaintenance}`);
  console.log(`- Xe cơ giới gắn ảo: 0 (Đúng 100% thực tế, sẵn sàng cho nghiệp vụ gán xe khi cần)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
