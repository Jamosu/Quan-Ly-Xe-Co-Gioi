import { VehicleStatus } from '@prisma/client';
import { isStandardCountry } from './country-dictionary';
import { identityKey } from './normalization';
import {
  IdentityResolutionResult,
  ImportConflict,
  NormalizedVehicleRecord,
  ResolvedVehicle,
} from './types';

const IDENTITY_FIELDS = [
  'code',
  'bravoCode',
  'assetCode',
  'frameNumber',
  'engineNumber',
  'plate',
  'oldCode',
] as const;

type IdentityField = (typeof IDENTITY_FIELDS)[number];

interface Cluster {
  merged: NormalizedVehicleRecord;
  records: NormalizedVehicleRecord[];
  sourceSheets: Set<string>;
  identityValues: Map<IdentityField, Set<string>>;
}

const STATUS_PRIORITY: Record<VehicleStatus, number> = {
  CHO_PHAN_CONG: 0,
  HOAT_DONG: 1,
  TAM_DUNG: 2,
  BAO_DUONG: 3,
  SUA_CHUA: 4,
};

function recordValues(record: NormalizedVehicleRecord): Record<string, unknown> {
  return Object.fromEntries(
    IDENTITY_FIELDS.map((field) => [field, record[field]]).filter(([, value]) => value),
  );
}

function mergeRecord(target: NormalizedVehicleRecord, source: NormalizedVehicleRecord): void {
  const targetRecord = target as unknown as Record<string, unknown>;
  const sourceRecord = source as unknown as Record<string, unknown>;
  const excluded = new Set(['sheet', 'row', 'sourcePriority', 'sourceSheets', 'sourceRows', 'recordCount']);

  for (const [field, value] of Object.entries(sourceRecord)) {
    if (excluded.has(field) || value === undefined || value === null || value === '') continue;
    if ((field === 'totalMachineHours' || field === 'odoKm') && typeof value === 'number') {
      const current = typeof targetRecord[field] === 'number' ? (targetRecord[field] as number) : 0;
      targetRecord[field] = Math.max(current, value);
      continue;
    }
    if (field === 'status') {
      const incoming = value as VehicleStatus;
      const current = target.status;
      if (STATUS_PRIORITY[incoming] > STATUS_PRIORITY[current]) target.status = incoming;
      continue;
    }
    // Semantic guard: only merge origin if value is a recognized country
    if (field === 'origin') {
      if (targetRecord[field] === undefined || targetRecord[field] === null || targetRecord[field] === '') {
        if (isStandardCountry(value)) {
          targetRecord[field] = value;
        }
      }
      continue;
    }
    if (targetRecord[field] === undefined || targetRecord[field] === null || targetRecord[field] === '') {
      targetRecord[field] = value;
    }
  }
}

function identityEntries(record: NormalizedVehicleRecord): Array<[IdentityField, string]> {
  return IDENTITY_FIELDS.flatMap((field) => {
    const key = identityKey(record[field]);
    return key ? [[field, key] as [IdentityField, string]] : [];
  });
}

export function resolveVehicleIdentities(
  inputRecords: NormalizedVehicleRecord[],
): IdentityResolutionResult {
  const records = [...inputRecords].sort(
    (a, b) => b.sourcePriority - a.sourcePriority || a.sheet.localeCompare(b.sheet) || a.row - b.row,
  );
  const clusters: Cluster[] = [];
  const identifierIndex = new Map<string, Set<number>>();
  const conflicts: ImportConflict[] = [];

  const addToIndex = (clusterIndex: number, field: IdentityField, value: string) => {
    const indexKey = `${field}:${value}`;
    const current = identifierIndex.get(indexKey) || new Set<number>();
    current.add(clusterIndex);
    identifierIndex.set(indexKey, current);
  };

  for (const record of records) {
    const identities = identityEntries(record);
    const codeKey = identityKey(record.code);
    let candidates = new Set<number>();

    if (codeKey) {
      candidates = new Set(identifierIndex.get(`code:${codeKey}`) || []);
    } else {
      for (const [field, value] of identities.filter(([field]) => field !== 'code')) {
        for (const candidate of identifierIndex.get(`${field}:${value}`) || []) candidates.add(candidate);
      }
    }

    const compatible = [...candidates].filter((candidate) => {
      const clusterCodes = clusters[candidate].identityValues.get('code');
      return !codeKey || !clusterCodes?.size || clusterCodes.has(codeKey);
    });

    let clusterIndex: number;
    if (compatible.length === 1) {
      clusterIndex = compatible[0];
    } else if (compatible.length > 1) {
      conflicts.push({
        sheet: record.sheet,
        row: record.row,
        values: recordValues(record),
        candidateVehicles: compatible.map((index) => clusters[index].merged.code || `cluster-${index}`),
        reason: 'Một dòng khớp nhiều hồ sơ theo identifier tin cậy; không tự động gộp các candidate.',
      });
      clusterIndex = clusters.length;
      clusters.push({
        merged: { ...record },
        records: [],
        sourceSheets: new Set(),
        identityValues: new Map(),
      });
    } else {
      if (!codeKey && candidates.size > 0) {
        conflicts.push({
          sheet: record.sheet,
          row: record.row,
          values: recordValues(record),
          candidateVehicles: [...candidates].map((index) => clusters[index].merged.code || `cluster-${index}`),
          reason: 'Identifier phụ trùng nhưng mã MMTB mới khác nhau; giữ thành hồ sơ riêng để tránh merge nhầm.',
        });
      }
      clusterIndex = clusters.length;
      clusters.push({
        merged: { ...record },
        records: [],
        sourceSheets: new Set(),
        identityValues: new Map(),
      });
    }

    const cluster = clusters[clusterIndex];
    if (cluster.records.length > 0) mergeRecord(cluster.merged, record);
    cluster.records.push(record);
    cluster.sourceSheets.add(record.sheet);
    for (const [field, value] of identities) {
      const values = cluster.identityValues.get(field) || new Set<string>();
      values.add(value);
      cluster.identityValues.set(field, values);
      addToIndex(clusterIndex, field, value);
    }
  }

  const vehicles: ResolvedVehicle[] = [];
  const unresolved: NormalizedVehicleRecord[] = [];
  let mergedRows = 0;

  for (const cluster of clusters) {
    if (!cluster.merged.code) {
      unresolved.push(...cluster.records);
      continue;
    }
    const name = cluster.merged.name || cluster.merged.vehicleSubtype || cluster.merged.code;
    vehicles.push({
      ...cluster.merged,
      code: cluster.merged.code,
      name,
      sourceSheets: [...cluster.sourceSheets].sort((a, b) => a.localeCompare(b, 'vi')),
      sourceRows: cluster.records.map(({ sheet, row }) => ({ sheet, row })),
      recordCount: cluster.records.length,
    });
    mergedRows += Math.max(0, cluster.records.length - 1);
  }

  vehicles.sort((a, b) => a.code.localeCompare(b.code, 'vi'));
  return { vehicles, unresolved, conflicts, mergedRows };
}
