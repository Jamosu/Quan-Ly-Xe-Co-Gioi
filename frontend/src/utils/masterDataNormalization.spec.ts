import { describe, expect, it } from 'vitest';
import { normalizeMasterDataKey, uniqueMasterDataOptions } from './masterDataNormalization';

describe('master data normalization', () => {
  it('deduplicates safe variants only', () => {
    expect(uniqueMasterDataOptions(['ban điện nước', ' Ban  Điện Nước ', 'Ban Điện-Nước'])).toEqual([
      'ban điện nước',
      'Ban Điện-Nước',
    ]);
    expect(normalizeMasterDataKey('BAN ĐIỆN NƯỚC')).toBe(normalizeMasterDataKey('ban điện nước'));
  });
});
