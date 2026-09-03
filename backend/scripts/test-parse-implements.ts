import * as XLSX from 'xlsx';
import { PrismaClient, ImplementCategory, Unit, ImplementStatus, TechnicalCondition } from '@prisma/client';

const prisma = new PrismaClient();

function mapCategory(name: string, subType: string = ''): ImplementCategory {
  const text = (name + ' ' + subType).toLowerCase();
  if (text.includes('cày') || text.includes('cày') || text.includes('cna') || text.includes('cch')) {
    return ImplementCategory.DAN_CAY;
  }
  if (text.includes('bừa') || text.includes('bừa') || text.includes('cbd') || text.includes('chảo đôi')) {
    return ImplementCategory.DAN_BUA;
  }
  if (text.includes('xới') || text.includes('xới') || text.includes('phay') || text.includes('băm') || text.includes('cuộn cỏ')) {
    return ImplementCategory.DAN_XOI;
  }
  if (text.includes('rải') || text.includes('rải') || text.includes('phân') || text.includes('vôi') || text.includes('bón') || text.includes('bón')) {
    return ImplementCategory.DAN_RAI_PHAN;
  }
  if (text.includes('mooc') || text.includes('moóc') || text.includes('móc') || text.includes('rmc') || text.includes('smr') || text.includes('clethon') || text.includes('trailer')) {
    return ImplementCategory.RO_MOOC;
  }
  if (text.includes('phun') || text.includes('khử khuẩn') || text.includes('súng phun') || text.includes('cao áp')) {
    return ImplementCategory.DAN_PHUN_THUOC;
  }
  if (text.includes('luống') || text.includes('rãnh') || text.includes('rảnh') || text.includes('gắp') || text.includes('tỉa') || text.includes('gieo')) {
    return ImplementCategory.DAN_XOI;
  }
  return ImplementCategory.RO_MOOC; // Default for heavy equipment attachments
}

function mapUnit(unitStr: string = ''): Unit {
  const u = unitStr.toUpperCase();
  if (u.includes('DP') || u.includes('DAUN PENH')) return Unit.NT1;
  if (u.includes('LP') || u.includes('LUMPHAT')) return Unit.NT2;
  if (u.includes('BÒ') || u.includes('BÒ') || u.includes('XB1') || u.includes('AD')) return Unit.XN_BO;
  if (u.includes('BTSC') || u.includes('CƠ KHÍ') || u.includes('CO KHI')) return Unit.TT_BTSC;
  if (u.includes('BAN CƠ GIỚI') || u.includes('GNVC') || u.includes('HÀNH CHÍNH') || u.includes('ĐIỆN NƯỚC') || u.includes('THAGRICONS')) return Unit.BAN_CO_GIOI;
  return Unit.TOAN_KLH;
}

export async function testParsing() {
  const filePath = 'd:/ThacoAgri_Code/Mockup/docs/00. DANH MỤC MMTB THUỘC KLH KOUN MOM.xlsx';
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets['03.1 NHÓM TB'];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log('Total rows in 03.1 NHÓM TB:', rows.length);

  let currentGroup = '';
  const parsedItems: any[] = [];
  const seenCodes = new Set<string>();

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    // Detect group headers
    if (typeof r[0] === 'string' && (r[0].startsWith('I') || r[0].startsWith('-') || r[0].startsWith('II'))) {
      currentGroup = (r[1] || r[0]).toString().trim();
      continue;
    }

    const code = (r[1] || '').toString().trim();
    if (!code || code === '-' || code.startsWith('KLH') || code === 'Mã MMTB mới') continue;
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);

    const oldCode = (r[2] || '').toString().trim();
    const alias = (r[3] || '').toString().trim();
    const condition = (r[4] || '').toString().trim();
    const name = (r[5] || '').toString().trim();
    const subType = (r[6] || '').toString().trim();
    const unitName = (r[7] || '').toString().trim();
    const statusText = (r[10] || '').toString().trim();
    const note = (r[12] || '').toString().trim();
    const brand = (r[13] || '').toString().trim();
    const model = (r[14] || '').toString().trim();

    if (!name) continue;

    const isUnassignedGroup = currentGroup.toUpperCase().includes('CHỜ PHÂN BỔ') || 
                              currentGroup.toUpperCase().includes('ĐIỀU CHUYỂN') ||
                              unitName.toUpperCase().includes('CHỜ') ||
                              note.toUpperCase().includes('DỰ PHÒNG');

    const isMaintenance = statusText.toLowerCase().includes('sửa') || 
                          statusText.toLowerCase().includes('hỏng') || 
                          statusText.toLowerCase().includes('hư');

    parsedItems.push({
      code,
      oldCode,
      alias,
      condition,
      name,
      subType: subType !== 'Búa đục' ? subType : (currentGroup || 'Nông cụ cơ giới'),
      unitName: unitName || 'Ban Cơ giới KLH',
      unitEnum: mapUnit(unitName),
      category: mapCategory(name, subType),
      isUnassigned: isUnassignedGroup,
      isMaintenance,
      brand,
      model,
      note,
    });
  }

  console.log('Successfully parsed real implements:', parsedItems.length);
  const byCategory: Record<string, number> = {};
  parsedItems.forEach(x => { byCategory[x.category] = (byCategory[x.category] || 0) + 1; });
  console.log('By Category:', byCategory);

  const unassignedCount = parsedItems.filter(x => x.isUnassigned).length;
  const maintenanceCount = parsedItems.filter(x => x.isMaintenance).length;
  console.log('Unassigned (chưa gắn):', unassignedCount);
  console.log('Maintenance (sửa chữa):', maintenanceCount);
  console.log('Active (đang dùng):', parsedItems.length - unassignedCount - maintenanceCount);
}

testParsing().catch(console.error).finally(() => prisma.$disconnect());
