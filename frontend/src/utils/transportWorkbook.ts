import * as XLSX from 'xlsx';
import type { ImportWorkbookPayload } from '../types';

export async function readTransportWorkbook(file: File): Promise<ImportWorkbookPayload> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const checksum = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  const workbook = XLSX.read(buffer, { type: 'array', raw: false, cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Workbook không có sheet dữ liệu.');
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<Array<string | number | null>>(sheet, { header: 1, defval: null, raw: false });
  const headerIndex = matrix.findIndex((row) => String(row[0] ?? '').trim().toLocaleUpperCase('vi-VN') === 'STT');
  if (headerIndex < 0) throw new Error('Không tìm thấy dòng tiêu đề bắt đầu bằng STT.');
  const rows = matrix.slice(headerIndex).map((values, index) => ({ rowNumber: headerIndex + index + 1, values: Array.from({ length: 16 }, (_, column) => values[column] ?? null) }));
  const merges = (sheet['!merges'] ?? []).map((range) => XLSX.utils.encode_range(range));
  return { fileName: file.name, sheetName, checksum, rows, merges };
}
