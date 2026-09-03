import type { CatalogItem, CompanyEntity } from '../data/catalogData';

export type CatalogTabId =
  | 'cong-ty'
  | 'phong-ban'
  | 'khu-lien-hop'
  | 'xi-nghiep'
  | 'nong-truong'
  | 'doi'
  | 'danh-muc-lo'
  | 'danh-muc-thua'
  | 'chuc-danh';

export type CatalogTypeName =
  | 'COMPANY'
  | 'COMPLEX'
  | 'DEPARTMENT'
  | 'ENTERPRISE'
  | 'FARM'
  | 'TEAM'
  | 'PLOT'
  | 'LAND_PARCEL'
  | 'POSITION';

export type GenericCatalogTabId =
  | 'cong-ty'
  | 'phong-ban'
  | 'khu-lien-hop'
  | 'xi-nghiep'
  | 'doi'
  | 'chuc-danh';

export const catalogTabMeta: Record<
  CatalogTabId,
  { type: CatalogTypeName; label: string; storageKey: string }
> = {
  'cong-ty': { type: 'COMPANY', label: 'Công ty', storageKey: 'catalogs_companies' },
  'phong-ban': { type: 'DEPARTMENT', label: 'Phòng ban', storageKey: 'catalogs_departments' },
  'khu-lien-hop': { type: 'COMPLEX', label: 'Khu liên hợp', storageKey: 'catalogs_complexes' },
  'xi-nghiep': { type: 'ENTERPRISE', label: 'Xí nghiệp', storageKey: 'catalogs_enterprises' },
  'nong-truong': { type: 'FARM', label: 'Nông trường', storageKey: 'catalogs_farms' },
  'doi': { type: 'TEAM', label: 'Đội', storageKey: 'catalogs_teams' },
  'danh-muc-lo': { type: 'PLOT', label: 'Lô', storageKey: 'catalogs_plots' },
  'danh-muc-thua': { type: 'LAND_PARCEL', label: 'Thửa', storageKey: 'catalogs_land_parcels' },
  'chuc-danh': { type: 'POSITION', label: 'Chức danh', storageKey: 'catalogs_positions' },
};

type ParentRecord = Pick<CatalogItem, 'code' | 'name'> | Pick<CompanyEntity, 'code' | 'name'>;

export interface CatalogImportContext {
  companies: CompanyEntity[];
  complexes: CatalogItem[];
  enterprises: CatalogItem[];
  farms: CatalogItem[];
}

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const findColumn = (headers: unknown[], aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => {
    const normalized = normalizeHeader(header);
    return normalizedAliases.some((alias) => normalized === alias || normalized.includes(alias));
  });
};

const valueAt = (row: unknown[], index: number) =>
  index >= 0 ? String(row[index] ?? '').trim() : '';

const numberAt = (row: unknown[], index: number) => {
  if (index < 0 || row[index] === '' || row[index] === null || row[index] === undefined) return undefined;
  const parsed = Number(String(row[index]).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveParent = (rawValue: string, records: ParentRecord[]) => {
  const raw = rawValue.trim();
  const codeFromLabel = raw.includes(' - ') ? raw.split(' - ')[0].trim() : raw;
  const match = records.find(
    (record) => record.code.toLowerCase() === codeFromLabel.toLowerCase() || record.name.toLowerCase() === raw.toLowerCase(),
  );
  return {
    parentCode: match?.code || codeFromLabel || undefined,
    parentName: match?.name || (raw.includes(' - ') ? raw.split(' - ').slice(1).join(' - ').trim() : raw) || undefined,
  };
};

const definitions = {
  'cong-ty': {
    code: ['Mã công ty'],
    name: ['Tên công ty'],
  },
  'khu-lien-hop': {
    code: ['Mã khu liên hợp'],
    name: ['Tên khu liên hợp'],
  },
  'phong-ban': {
    code: ['Mã phòng ban'],
    name: ['Tên phòng ban'],
  },
  'xi-nghiep': {
    code: ['Mã xí nghiệp'],
    name: ['Tên xí nghiệp'],
  },
  doi: {
    code: ['Mã đội'],
    name: ['Tên đội'],
  },
  'chuc-danh': {
    code: ['Mã chức danh', 'Mã'],
    name: ['Tên chức danh', 'Tên'],
  },
} as const;

export async function parseGenericCatalogWorkbook(
  tab: GenericCatalogTabId,
  file: File,
  context: CatalogImportContext,
): Promise<Array<CatalogItem | CompanyEntity>> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName =
    workbook.SheetNames.find(
      (name) =>
        name.toLowerCase().includes('chuc') ||
        name.toLowerCase().includes('dln') ||
        name.toLowerCase().includes('data')
    ) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '' });
  const definition = definitions[tab];
  const headerRowIndex = rows.findIndex((row) =>
    Array.isArray(row) && findColumn(row, [...definition.code]) >= 0 && findColumn(row, [...definition.name]) >= 0,
  );
  if (headerRowIndex < 0) {
    throw new Error(`Không tìm thấy cột ${definition.code[0]} và ${definition.name[0]} trong file`);
  }

  const headers = rows[headerRowIndex];
  const codeIndex = findColumn(headers, [...definition.code]);
  const nameIndex = findColumn(headers, [...definition.name]);
  const indexes = {
    address: findColumn(headers, ['Địa chỉ']),
    field: findColumn(headers, ['Lĩnh vực hoạt động', 'Lĩnh vực']),
    businessLicense: findColumn(headers, ['Giấy phép kinh doanh']),
    charterCapital: findColumn(headers, ['Vốn điều lệ']),
    systemId: findColumn(headers, ['Mã hệ thống']),
    parent: findColumn(headers, ['Thuộc đơn vị', 'Thuộc khu liên hợp', 'Thuộc nông trường']),
    managerName: findColumn(headers, ['Người quản lý']),
    phone: findColumn(headers, ['Điện thoại']),
    areaHa: findColumn(headers, ['Diện tích quy hoạch']),
    description: findColumn(headers, ['Mô tả nhiệm vụ & Chức năng', 'Mô tả nhiệm vụ', 'Mô tả chức năng', 'Mô tả']),
    status: findColumn(headers, ['Trạng thái']),
  };

  const records: Array<CatalogItem | CompanyEntity> = [];
  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;
    const code = valueAt(row, codeIndex);
    const name = valueAt(row, nameIndex);
    if (!code || !name || code.startsWith('<') || name.startsWith('<')) continue;

    if (tab === 'cong-ty') {
      records.push({
        id: Date.now() + rowIndex,
        code,
        name,
        address: valueAt(row, indexes.address),
        field: valueAt(row, indexes.field),
        businessLicense: valueAt(row, indexes.businessLicense),
        charterCapital: valueAt(row, indexes.charterCapital),
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    if (tab === 'chuc-danh') {
      const statusValue = normalizeHeader(valueAt(row, indexes.status));
      records.push({
        id: `POS_${code}_${Date.now() + rowIndex}`,
        code,
        name,
        type: 'POSITION',
        description: valueAt(row, indexes.description) || undefined,
        status: statusValue.includes('tam') || statusValue.includes('khong') ? 'TAM_DUNG' : 'HOAT_DONG',
        createdAt: new Date().toISOString().slice(0, 10),
        createdDate: new Date().toISOString().slice(0, 10),
        createdUser: 'admin',
      });
      continue;
    }

    const type = catalogTabMeta[tab].type as Exclude<CatalogTypeName, 'COMPANY'>;
    let parentRecords: ParentRecord[] = [];
    if (tab === 'phong-ban') parentRecords = [...context.companies, ...context.complexes];
    if (tab === 'xi-nghiep') parentRecords = context.complexes;
    if (tab === 'doi') parentRecords = context.farms;
    const parent = resolveParent(valueAt(row, indexes.parent), parentRecords);
    const statusValue = normalizeHeader(valueAt(row, indexes.status));
    records.push({
      id: `catalog-${type.toLowerCase()}-${code}`,
      code,
      name,
      type,
      ...parent,
      systemId: valueAt(row, indexes.systemId) || undefined,
      address: valueAt(row, indexes.address) || undefined,
      managerName: valueAt(row, indexes.managerName) || undefined,
      phone: valueAt(row, indexes.phone) || undefined,
      areaHa: numberAt(row, indexes.areaHa),
      description: valueAt(row, indexes.description) || undefined,
      status: statusValue.includes('tam') || statusValue.includes('khong') ? 'TAM_DUNG' : 'HOAT_DONG',
      createdUser: 'admin',
      createdDate: new Date().toISOString().slice(0, 10),
      updatedUser: 'admin',
      updatedDate: new Date().toISOString().slice(0, 10),
    });
  }

  if (records.length === 0) {
    throw new Error('File không có dòng dữ liệu hợp lệ. Hãy nhập dữ liệu bên dưới dòng hướng dẫn.');
  }
  return records;
}

export async function exportGenericCatalogWorkbook(
  tab: GenericCatalogTabId,
  records: Array<CatalogItem | CompanyEntity>,
) {
  const label = catalogTabMeta[tab].label;

  // Dedicated template-style export for Chức danh matching Template__CongTy.xlsx with Yellow Header & Huong_Dan sheet
  if (tab === 'chuc-danh') {
    const ExcelJSModule = await import('exceljs');
    const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as any;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'THACO AGRI';

    // Sheet 1: DLN CHỨC DANH
    const ws1 = workbook.addWorksheet('DLN CHỨC DANH');
    ws1.columns = [
      { key: 'code', width: 25 },
      { key: 'name', width: 35 },
      { key: 'description', width: 45 },
      { key: 'status', width: 28 },
    ];

    // Row 1: Title
    ws1.addRow(['DỮ LIỆU NỀN CHỨC DANH']);
    ws1.mergeCells('A1:D1');
    const titleCell = ws1.getCell('A1');
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0A321A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    ws1.getRow(1).height = 28;

    // Row 2: Blank
    ws1.addRow([]);
    ws1.getRow(2).height = 15;

    // Row 3: Headers (YELLOW BACKGROUND #FFFF00 matching Template__CongTy.xlsx)
    const headerRow = ws1.addRow(['Mã chức danh', 'Tên chức danh', 'Mô tả nhiệm vụ & Chức năng', 'Trạng thái']);
    headerRow.height = 32;
    headerRow.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' }, // Pure Yellow matching Template__CongTy.xlsx
      };
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      };
    });

    // Row 4: Format hints (GREY BACKGROUND #F2F2F2)
    const hintRow = ws1.addRow(['<Text> - <Bắt buộc nhập *>', '<Text> - <Bắt buộc nhập *>', '<Text>', '<HOAT_DONG hoặc TAM_DUNG>']);
    hintRow.height = 38;
    hintRow.eachCell((cell: any) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
      cell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      };
    });

    // Rows 5+: Data rows
    (records as CatalogItem[]).forEach((item) => {
      const row = ws1.addRow([
        item.code,
        item.name,
        item.description || '',
        item.status === 'TAM_DUNG' ? 'TAM_DUNG' : 'HOAT_DONG',
      ]);
      row.height = 22;
      row.eachCell((cell: any) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Sheet 2: Huong_Dan
    const ws2 = workbook.addWorksheet('Huong_Dan');
    ws2.columns = [
      { key: 'title', width: 25 },
      { key: 'content', width: 90 },
    ];
    ws2.addRow(['TEMPLATE IMPORT THACO AGRI', 'DỮ LIỆU NỀN CHỨC DANH']);
    ws2.getRow(1).height = 28;
    ws2.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0A321A' } };
    ws2.getCell('B1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0A321A' } };

    ws2.addRow([]);
    const guides = [
      ['1. Quy định chung', 'Không chỉnh sửa hoặc xóa dòng tiêu đề 1, 2, 3, 4. Dữ liệu bắt đầu nhập từ dòng 5.'],
      ['2. Cột bắt buộc (*)', 'Các cột có màu vàng ở dòng tiêu đề (Mã chức danh, Tên chức danh) là bắt buộc phải có.'],
      ['3. Trạng thái', 'Nhập HOAT_DONG (Đang hoạt động) hoặc TAM_DUNG (Tạm dừng). Mặc định là HOAT_DONG.'],
      ['4. Tên Sheet dữ liệu', 'Sheet dữ liệu chính phải đặt tên là "DLN CHỨC DANH".'],
      ['5. Lưu file', 'Lưu file dưới định dạng .xlsx hoặc .xls trước khi upload lên hệ thống.'],
    ];
    guides.forEach(([title, content]) => {
      const r = ws2.addRow([title, content]);
      r.height = 22;
      r.getCell(1).font = { name: 'Arial', size: 10, bold: true };
      r.getCell(2).font = { name: 'Arial', size: 10 };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_Sach_Chuc_Danh_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const XLSX = await import('xlsx');

  const data = records.map((record, index) => {
    if (tab === 'cong-ty') {
      const company = record as CompanyEntity;
      return {
        STT: index + 1,
        'Mã công ty': company.code,
        'Tên công ty': company.name,
        'Địa chỉ': company.address,
        'Lĩnh vực hoạt động': company.field,
        'Giấy phép kinh doanh': company.businessLicense,
        'Vốn điều lệ': company.charterCapital,
      };
    }
    const item = record as CatalogItem;
    return {
      STT: index + 1,
      Mã: item.code,
      Tên: item.name,
      'Đơn vị trực thuộc': item.parentName || '',
      'Mã hệ thống': item.systemId || '',
      'Địa chỉ': item.address || '',
      'Người quản lý': item.managerName || '',
      'Điện thoại': item.phone || '',
      'Diện tích (ha)': item.areaHa ?? '',
      'Mô tả': item.description || '',
      'Trạng thái': item.status === 'HOAT_DONG' ? 'Hoạt động' : 'Tạm dừng',
    };
  });
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, label.slice(0, 31));
  XLSX.writeFile(workbook, `Danh_Sach_${label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
