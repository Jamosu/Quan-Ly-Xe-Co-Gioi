import { foldText } from './normalization';
import { isLiquidatedAssignedUnit } from '../../src/common/utils/vehicle-lifecycle';

export interface ManagementTeam {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
}

export type ManagementUnitResolution =
  | { kind: 'MATCHED'; source: string; team: ManagementTeam; method: 'EXACT' | 'ALIAS' }
  | { kind: 'LIQUIDATED'; source: string }
  | { kind: 'UNRESOLVED'; source: string; reason: 'BLANK' | 'EXCLUDED' | 'NOT_FOUND' | 'AMBIGUOUS' };

const ALIASES: Record<string, string> = {
  'XN DP1': 'XN CHUOI DP1',
  'XN DP2': 'XN CHUOI DP2',
  'XN DP3': 'XN CHUOI DP3',
  'XN LP1': 'XN CHUOI LP1',
  'XN LP2': 'XN CHUOI LP2',
  'XN LP3': 'XN CHUOI LP3',
  GNVC: 'PHONG GNVC',
  'CK DP': 'XUONG CO KHI DP',
  'BAN CO GIOI': 'BAN CG-CK & SXCN',
  'BAN CG': 'BAN CG-CK & SXCN',
  'CAT DP': 'XOAI DP',
  'NT XOAI AD': 'XOAI AD',
  'NT BUOI AD': 'BUOI AD',
  XNB: 'XN BO AD',
  'XNB NT CO': 'XN BO AD',
};

const EXCLUDED = new Set(['XN LP4', 'XN CHUOI LP4', 'LP4', 'CAT AD', 'KLH SNOUL']);

export function managementUnitKey(value: unknown): string {
  return foldText(value).replace(/[^A-Z0-9&]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function resolveManagementTeam(
  sourceValue: unknown,
  teams: ManagementTeam[],
): ManagementUnitResolution {
  const source = String(sourceValue ?? '').trim();
  const key = managementUnitKey(source);
  if (!key) return { kind: 'UNRESOLVED', source, reason: 'BLANK' };
  if (isLiquidatedAssignedUnit(source)) return { kind: 'LIQUIDATED', source };
  if (EXCLUDED.has(key)) return { kind: 'UNRESOLVED', source, reason: 'EXCLUDED' };

  const exact = teams.filter((team) => managementUnitKey(team.name) === key);
  if (exact.length === 1) return { kind: 'MATCHED', source, team: exact[0], method: 'EXACT' };
  if (exact.length > 1) return { kind: 'UNRESOLVED', source, reason: 'AMBIGUOUS' };

  const target = ALIASES[key];
  if (!target) return { kind: 'UNRESOLVED', source, reason: 'NOT_FOUND' };
  const aliased = teams.filter((team) => managementUnitKey(team.name) === target);
  if (aliased.length === 1) return { kind: 'MATCHED', source, team: aliased[0], method: 'ALIAS' };
  return { kind: 'UNRESOLVED', source, reason: aliased.length ? 'AMBIGUOUS' : 'NOT_FOUND' };
}
