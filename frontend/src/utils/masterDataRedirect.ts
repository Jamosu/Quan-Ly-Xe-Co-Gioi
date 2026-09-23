const MOVED_MECHANICAL_CATALOG_TABS: Record<string, string> = {
  units: '/danh-muc/quan-ly-co-gioi?tab=units',
  cgManagers: '/danh-muc/quan-ly-co-gioi?tab=managers',
  managementAreas: '/danh-muc/quan-ly-co-gioi?tab=areas',
  locations: '/danh-muc/quan-ly-co-gioi?tab=areas',
};

export const mechanicalCatalogRedirect = (tab: string | null) =>
  tab ? MOVED_MECHANICAL_CATALOG_TABS[tab] : undefined;
