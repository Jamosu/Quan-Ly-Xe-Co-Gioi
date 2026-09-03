import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const outputDir = path.resolve(process.argv[2] || '../backend/FileTemplate_mau');
fs.mkdirSync(outputDir, { recursive: true });

const templates = [
  {
    filename: 'Template__CongTy.xlsx',
    sheetName: 'DLN CÔNG TY',
    title: 'DỮ LIỆU NỀN CÔNG TY',
    headers: ['Mã công ty', 'Tên công ty', 'Địa chỉ', 'Lĩnh vực hoạt động', 'Giấy phép kinh doanh', 'Vốn điều lệ'],
    instructions: ['<Text> - <Bắt buộc nhập *>', '<Text> - <Bắt buộc nhập *>', '<Text>', '<Text>', '<Text>', '<Text>'],
  },
  {
    filename: 'Template__KhuLienHop.xlsx',
    sheetName: 'DLN KHU LIÊN HỢP',
    title: 'DỮ LIỆU NỀN KHU LIÊN HỢP',
    headers: ['Mã khu liên hợp', 'Tên khu liên hợp', 'Mã hệ thống', 'Người quản lý', 'Điện thoại', 'Mô tả', 'Trạng thái'],
    instructions: ['<Text> - <Bắt buộc nhập *>', '<Text> - <Bắt buộc nhập *>', '<Text>', '<Text>', '<Text>', '<Text>', '<HOAT_DONG hoặc TAM_DUNG>'],
  },
  {
    filename: 'Template__PhongBan.xlsx',
    sheetName: 'DLN PHÒNG BAN',
    title: 'DỮ LIỆU NỀN PHÒNG BAN',
    headers: ['Mã phòng ban', 'Tên phòng ban', 'Thuộc đơn vị', 'Người quản lý', 'Điện thoại', 'Mô tả', 'Trạng thái'],
    instructions: ['<Text> - <Bắt buộc nhập *>', '<Text> - <Bắt buộc nhập *>', '<Nhập đúng mã Công ty hoặc KLH>', '<Text>', '<Text>', '<Text>', '<HOAT_DONG hoặc TAM_DUNG>'],
  },
  {
    filename: 'Template__XiNghiep.xlsx',
    sheetName: 'DLN XÍ NGHIỆP',
    title: 'DỮ LIỆU NỀN XÍ NGHIỆP',
    headers: ['Mã xí nghiệp', 'Tên xí nghiệp', 'Thuộc khu liên hợp', 'Địa chỉ', 'Người quản lý', 'Điện thoại', 'Diện tích quy hoạch(ha)', 'Mô tả', 'Trạng thái'],
    instructions: ['<Text> - <Bắt buộc nhập *>', '<Text> - <Bắt buộc nhập *>', '<Nhập đúng mã khu liên hợp>', '<Text>', '<Text>', '<Text>', '<Số>', '<Text>', '<HOAT_DONG hoặc TAM_DUNG>'],
  },
  {
    filename: 'Template__Doi.xlsx',
    sheetName: 'DLN ĐỘI',
    title: 'DỮ LIỆU NỀN ĐỘI',
    headers: ['Mã đội', 'Tên đội', 'Thuộc nông trường', 'Người quản lý', 'Điện thoại', 'Mô tả', 'Trạng thái'],
    instructions: ['<Text> - <Bắt buộc nhập *>', '<Text> - <Bắt buộc nhập *>', '<Nhập đúng mã nông trường>', '<Text>', '<Text>', '<Text>', '<HOAT_DONG hoặc TAM_DUNG>'],
  },
];

for (const template of templates) {
  const blankRows = Array.from({ length: 20 }, () => template.headers.map(() => ''));
  const rows = [
    [template.title, ...template.headers.slice(1).map(() => '')],
    template.headers.map(() => ''),
    template.headers,
    template.instructions,
    ...blankRows,
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: template.headers.length - 1 } }];
  worksheet['!cols'] = template.headers.map((header, index) => ({
    wch: Math.min(38, Math.max(index < 2 ? 22 : 18, header.length + 5, template.instructions[index].length / 2)),
  }));
  worksheet['!rows'] = [{ hpt: 24 }, { hpt: 8 }, { hpt: 22 }, { hpt: 48 }];
  worksheet['!autofilter'] = { ref: `A3:${XLSX.utils.encode_col(template.headers.length - 1)}24` };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, template.sheetName);
  XLSX.writeFile(workbook, path.join(outputDir, template.filename), { compression: true });
}

console.log(`Generated ${templates.length} catalog templates in ${outputDir}`);
