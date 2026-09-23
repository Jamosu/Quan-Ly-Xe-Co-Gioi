import { readdirSync } from 'fs';
import { resolve } from 'path';
import { readImplementWorkbook } from '../import-implements-from-excel';
import { partitionVehicleCandidates } from '../import-vehicles-from-excel';
import { resolveVehicleIdentities } from './identity-resolution';
import { classifyWorkbookSources, readVehicleWorkbook } from './workbook-reader';

describe('vehicle/equipment workbook classification', () => {
  it('distinguishes dedicated vehicle, equipment and conflicting sources', () => {
    expect(classifyWorkbookSources(['03.1 NHÓM TB'])).toBe('EQUIPMENT');
    expect(classifyWorkbookSources(['02.1 NHÓM XE MÁY'])).toBe('VEHICLE');
    expect(classifyWorkbookSources(['03.1 NHÓM TB', '02.1 NHÓM XE MÁY'])).toBe('CONFLICT');
    expect(classifyWorkbookSources(['DANH MỤC'])).toBe('GENERAL');
  });

  it('excludes workbook implements from vehicles and stays idempotent', () => {
    const docs = resolve(__dirname, '../../../docs');
    const workbookName = readdirSync(docs).find((name) => name.startsWith('00.') && name.toUpperCase().includes('KOUN MOM') && name.endsWith('.xlsx'));
    expect(workbookName).toBeDefined();
    const workbookPath = resolve(docs, workbookName!);
    const resolved = resolveVehicleIdentities(readVehicleWorkbook(workbookPath).records);
    const implementCodes = new Set(readImplementWorkbook(workbookPath).rows.map((row) => row.code));

    const first = partitionVehicleCandidates(resolved.vehicles, implementCodes);
    const second = partitionVehicleCandidates(resolved.vehicles, implementCodes);

    expect(first.excludedEquipment).toHaveLength(682);
    expect(first.classificationConflicts).toHaveLength(0);
    expect(first.accepted.some((vehicle) => implementCodes.has(vehicle.code))).toBe(false);
    expect(second.accepted.map((vehicle) => vehicle.code)).toEqual(first.accepted.map((vehicle) => vehicle.code));
  });
});
