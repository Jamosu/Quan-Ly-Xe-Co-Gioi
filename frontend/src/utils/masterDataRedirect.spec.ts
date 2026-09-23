import { mechanicalCatalogRedirect } from './masterDataRedirect';

describe('legacy mechanical catalog redirects', () => {
  it.each([
    ['units', '/danh-muc/quan-ly-co-gioi?tab=units'],
    ['cgManagers', '/danh-muc/quan-ly-co-gioi?tab=managers'],
    ['managementAreas', '/danh-muc/quan-ly-co-gioi?tab=areas'],
    ['locations', '/danh-muc/quan-ly-co-gioi?tab=areas'],
  ])('moves tab=%s', (tab, expected) => {
    expect(mechanicalCatalogRedirect(tab)).toBe(expected);
  });

  it('leaves vehicle catalog tabs unchanged', () => {
    expect(mechanicalCatalogRedirect('types')).toBeUndefined();
  });
});
