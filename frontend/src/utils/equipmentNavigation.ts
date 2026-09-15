export type EquipmentTab = 'all' | 'in_depot' | 'attached' | 'maintenance' | 'repair';

export const buildAttachedEquipmentUrl = (vehicleId: number | string) =>
  `/doi-xe/thiet-bi?tab=attached&vehicleId=${encodeURIComponent(String(vehicleId))}`;

export const parseEquipmentTab = (value: string | null): EquipmentTab =>
  value === 'attached' || value === 'in_depot' || value === 'maintenance' || value === 'repair' ? value : 'all';
