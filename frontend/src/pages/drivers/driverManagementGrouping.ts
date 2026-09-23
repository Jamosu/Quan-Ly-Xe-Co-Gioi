export interface DriverManagerSummary {
  id: number;
  code?: string;
  fullName: string;
  phone?: string | null;
}

export interface DriverManagementGroupInput {
  id: number;
  employmentStatus: string;
  currentShiftStatus?: string | null;
  managementUnit?: { id: number; name: string } | null;
  teamUnit?: { id: number; name: string } | null;
  management?: {
    manager?: DriverManagerSummary | null;
    teamManager?: DriverManagerSummary | null;
    ownerManager?: DriverManagerSummary | null;
  } | null;
}

export interface DriverManagerGroup<T> {
  key: string;
  manager: DriverManagerSummary | null;
  teamNames: string[];
  drivers: T[];
}

export interface DriverUnitGroup<T> {
  key: string;
  unit: { id: number; name: string } | null;
  total: number;
  operating: number;
  ready: number;
  inactive: number;
  managers: DriverManagerGroup<T>[];
}

export const getEffectiveDriverManager = (
  driver: DriverManagementGroupInput,
): DriverManagerSummary | null =>
  driver.management?.teamManager
  || driver.management?.ownerManager
  || driver.management?.manager
  || null;

export const groupDriversByManagement = <T extends DriverManagementGroupInput>(
  drivers: T[],
): DriverUnitGroup<T>[] => {
  const units = new Map<string, DriverUnitGroup<T>>();

  drivers.forEach((driver) => {
    const unit = driver.managementUnit || null;
    const unitKey = unit ? `unit-${unit.id}` : 'unit-unassigned';
    let unitGroup = units.get(unitKey);
    if (!unitGroup) {
      unitGroup = {
        key: unitKey,
        unit,
        total: 0,
        operating: 0,
        ready: 0,
        inactive: 0,
        managers: [],
      };
      units.set(unitKey, unitGroup);
    }

    unitGroup.total += 1;
    if (driver.employmentStatus === 'DA_NGHI_VIEC') unitGroup.inactive += 1;
    else if (driver.currentShiftStatus === 'DANG_VAN_HANH') unitGroup.operating += 1;
    else unitGroup.ready += 1;

    const manager = getEffectiveDriverManager(driver);
    const managerKey = manager ? `manager-${manager.id}` : 'manager-unassigned';
    let managerGroup = unitGroup.managers.find((item) => item.key === managerKey);
    if (!managerGroup) {
      managerGroup = { key: managerKey, manager, teamNames: [], drivers: [] };
      unitGroup.managers.push(managerGroup);
    }
    managerGroup.drivers.push(driver);
    if (driver.teamUnit?.name && !managerGroup.teamNames.includes(driver.teamUnit.name)) {
      managerGroup.teamNames.push(driver.teamUnit.name);
    }
  });

  return [...units.values()]
    .map((unit) => ({
      ...unit,
      managers: unit.managers.sort((a, b) => {
        if (!a.manager) return 1;
        if (!b.manager) return -1;
        return a.manager.fullName.localeCompare(b.manager.fullName, 'vi');
      }),
    }))
    .sort((a, b) => {
      if (!a.unit) return 1;
      if (!b.unit) return -1;
      return a.unit.name.localeCompare(b.unit.name, 'vi');
    });
};
