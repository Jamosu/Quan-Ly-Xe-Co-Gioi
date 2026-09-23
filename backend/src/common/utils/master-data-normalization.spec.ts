import { canonicalizeMasterDataValues, normalizeMasterDataKey } from './master-data-normalization';

describe('master data normalization', () => {
  it('normalizes Unicode, whitespace and casing without fuzzy matching', () => {
    expect(normalizeMasterDataKey('  Ban   Điện Nước ')).toBe(normalizeMasterDataKey('ban điện nước'));
    expect(normalizeMasterDataKey('Điện Nước')).not.toBe(normalizeMasterDataKey('Điện-Nước'));
  });

  it('uses the catalog label when equivalent raw values exist', () => {
    expect(canonicalizeMasterDataValues(
      ['ban điện nước', ' Ban  Điện Nước ', 'BAN ĐIỆN NƯỚC'],
      ['Ban Điện Nước'],
    )).toEqual(['Ban Điện Nước']);
  });
});

