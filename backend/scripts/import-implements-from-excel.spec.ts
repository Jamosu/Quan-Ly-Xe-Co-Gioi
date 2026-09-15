import { EquipmentUsageMode, VehicleCategory } from '@prisma/client';
import {
  compatibleCategories,
  ExcelImplementRow,
  inferUsageMode,
} from './import-implements-from-excel';

const row = (code: string, name: string): ExcelImplementRow => ({
  code,
  name,
  subType: 'Thiết bị cơ giới',
  unit: 'Ban Cơ Giới',
  condition: '',
  notes: '',
  brand: '',
  model: '',
  origin: '',
  year: null,
  specs: '',
  serial: '',
  fuelQuota: null,
  purchaseCondition: '',
});

describe('workbook implement classification', () => {
  it('maps construction attachments to the correct vehicle type', () => {
    const input = row('CHT-CNA-001', 'Bộ bánh xích gắn máy ủi');
    const mode = inferUsageMode(input);
    expect(mode).toBe(EquipmentUsageMode.ATTACHABLE);
    expect(compatibleCategories(input, mode)).toEqual([VehicleCategory.MAY_UI]);
  });

  it('keeps standalone machinery out of attachment selectors', () => {
    const input = row('TB-001', 'Máy nổ diesel cố định');
    const mode = inferUsageMode(input);
    expect(mode).toBe(EquipmentUsageMode.STANDALONE);
    expect(compatibleCategories(input, mode)).toEqual([]);
  });

  it('blocks unknown equipment until configured', () => {
    const input = row('TB-UNKNOWN', 'Cụm phụ trợ chưa xác định');
    expect(inferUsageMode(input)).toBe(EquipmentUsageMode.UNCLASSIFIED);
  });
});
