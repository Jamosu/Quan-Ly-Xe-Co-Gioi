import { useEffect, useMemo, useState } from 'react';
import { DriverManagementUnit, driverManagementApi } from '../api/driverManagementApi';

export interface ManagementFilterManager {
  id: number;
  code?: string;
  name: string;
  phone?: string | null;
  unitIds: number[];
}

export const buildManagementFilterManagers = (units: DriverManagementUnit[]) => {
  const managers = new Map<number, ManagementFilterManager>();
  units.forEach((unit) => {
    const manager = unit.currentManager?.manager;
    if (!manager) return;
    const current = managers.get(manager.id);
    if (current) current.unitIds.push(unit.id);
    else managers.set(manager.id, {
      id: manager.id,
      code: manager.code,
      name: manager.fullName,
      phone: manager.phone,
      unitIds: [unit.id],
    });
  });
  return [...managers.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

export const useManagementFilterCatalog = (complexCode?: string) => {
  const [units, setUnits] = useState<DriverManagementUnit[]>([]);

  useEffect(() => {
    let active = true;
    driverManagementApi.getUnits({
      level: 'TEAM',
      status: 'ACTIVE',
      ...(complexCode && complexCode !== 'ALL' ? { complexCode } : {}),
    }).then((items) => {
      if (active) setUnits(items);
    }).catch(() => {
      if (active) setUnits([]);
    });
    return () => { active = false; };
  }, [complexCode]);

  const managers = useMemo(() => buildManagementFilterManagers(units), [units]);
  return { units, managers };
};
