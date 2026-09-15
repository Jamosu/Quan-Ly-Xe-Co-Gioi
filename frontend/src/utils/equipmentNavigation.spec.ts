import { buildAttachedEquipmentUrl, parseEquipmentTab } from './equipmentNavigation';

describe('equipment deep links', () => {
  it('builds a shareable attached-equipment filter for a vehicle', () => {
    expect(buildAttachedEquipmentUrl(3219)).toBe('/doi-xe/thiet-bi?tab=attached&vehicleId=3219');
  });

  it('rejects unsupported tab values', () => {
    expect(parseEquipmentTab('attached')).toBe('attached');
    expect(parseEquipmentTab('repair')).toBe('repair');
    expect(parseEquipmentTab('maintenance')).toBe('maintenance');
    expect(parseEquipmentTab('unknown')).toBe('all');
  });
});
