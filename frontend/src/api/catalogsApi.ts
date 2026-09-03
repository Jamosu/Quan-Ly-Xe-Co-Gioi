import { apiClient } from './client';
import { CatalogItem, CompanyEntity } from '../data/catalogData';
import { getStoredData, setStoredData } from '../utils/storage';

const unwrapCatalogResponse = (response: any) => {
  let payload = response?.data ?? response;
  for (let level = 0; level < 3; level += 1) {
    if (!payload || Array.isArray(payload) || typeof payload !== 'object' || !('data' in payload)) break;
    payload = payload.data;
  }
  return payload;
};

const getDownloadFilename = (contentDisposition: string | undefined, fallback: string) => {
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallback;
};

export const catalogsApi = {
  // --------------------------------------------------------------------------
  // CATALOG ITEMS (Complex, Department, Enterprise, Farm, Team, Plot, Parcel)
  // --------------------------------------------------------------------------
  async getCatalogs(type?: string, storageKey?: string, fallbackData?: CatalogItem[]): Promise<CatalogItem[]> {
    try {
      const res = await apiClient.get<any, any>('/catalogs', {
        params: type ? { type } : {},
      });
      const data = unwrapCatalogResponse(res);
      if (Array.isArray(data) && data.length > 0) {
        if (storageKey) {
          setStoredData(storageKey, data);
        }
        return data;
      }
    } catch (err) {
      console.warn(`[Catalogs API] Cannot fetch from backend (${type || 'all'}), using localStorage fallback:`, err);
    }
    // Fallback to localStorage
    if (storageKey) {
      return getStoredData(storageKey, fallbackData || []);
    }
    return fallbackData || [];
  },

  async saveCatalogItem(item: CatalogItem, storageKey: string, currentList: CatalogItem[]): Promise<CatalogItem[]> {
    try {
      await apiClient.post('/catalogs', item);
    } catch (err) {
      console.warn('[Catalogs API] Save to backend failed, saved to localStorage:', err);
    }
    const idx = currentList.findIndex((i) => i.id === item.id);
    let nextList: CatalogItem[];
    if (idx >= 0) {
      nextList = currentList.map((i) => (i.id === item.id ? item : i));
    } else {
      nextList = [item, ...currentList];
    }
    setStoredData(storageKey, nextList);
    return nextList;
  },

  async deleteCatalogItem(id: string, storageKey: string, currentList: CatalogItem[]): Promise<CatalogItem[]> {
    try {
      await apiClient.delete(`/catalogs/${id}`);
    } catch (err) {
      console.warn('[Catalogs API] Delete on backend failed, deleted in localStorage:', err);
    }
    const nextList = currentList.filter((i) => i.id !== id);
    setStoredData(storageKey, nextList);
    return nextList;
  },

  async bulkSyncCatalogs(type: string, items: CatalogItem[], storageKey: string): Promise<CatalogItem[]> {
    const response = await apiClient.post('/catalogs/bulk-sync', { type, items });
    const savedItems = unwrapCatalogResponse(response);
    if (!Array.isArray(savedItems)) {
      throw new Error(`Backend không trả lại dữ liệu ${type} đã lưu`);
    }
    return this.getCatalogs(type, storageKey, savedItems);
  },

  async downloadTemplate(type: string): Promise<void> {
    const staticMap: Record<string, string> = {
      COMPANY: 'Template__CongTy.xlsx',
      COMPLEX: 'Template__KhuLienHop.xlsx',
      DEPARTMENT: 'Template__PhongBan.xlsx',
      ENTERPRISE: 'Template__XiNghiep.xlsx',
      FARM: 'Template__Nongtruong.xlsx',
      TEAM: 'Template__Doi.xlsx',
      PLOT: 'Template__Lo.xlsx',
      LAND_PARCEL: 'Template__Thua.xlsx',
      VEHICLE: 'Template_Import_Ho_So_Xe_THACO_AGRI.xlsx',
      IMPLEMENT: 'Template_Import_Thiet_Bi_Nong_Cu_THACO_AGRI.xlsx',
      ASSIGNMENT: 'Template_Import_Phan_Bo_Dieu_Chuyen_THACO_AGRI.xlsx',
      DRIVER: 'Template_Import_Ho_So_Lai_Xe_THACO_AGRI.xlsx',
      POSITION: 'Template__ChucDanh.xlsx',
    };

    try {
      const response = await apiClient.get(`/catalogs/templates/${type}`, { responseType: 'blob' });
      const filename = getDownloadFilename(
        response.headers?.['content-disposition'],
        staticMap[type.toUpperCase()] || `Template__${type}.xlsx`,
      );
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.warn(`[Catalogs API] Backend template download failed for ${type}, using static asset fallback:`, err);
      const fallbackFile = staticMap[type.toUpperCase()] || `Template__${type}.xlsx`;
      const link = document.createElement('a');
      link.href = `/templates/${fallbackFile}?v=${Date.now()}`;
      link.download = fallbackFile;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  },

  // --------------------------------------------------------------------------
  // COMPANIES
  // --------------------------------------------------------------------------
  async getCompanies(fallbackData: CompanyEntity[]): Promise<CompanyEntity[]> {
    try {
      const res = await apiClient.get<any, any>('/catalogs/companies/list');
      const data = unwrapCatalogResponse(res);
      if (Array.isArray(data) && data.length > 0) {
        setStoredData('catalogs_companies', data);
        return data;
      }
    } catch (err) {
      console.warn('[Catalogs API] Companies fetch failed, using fallback:', err);
    }
    return getStoredData('catalogs_companies', fallbackData);
  },

  async saveCompany(company: any, currentList: CompanyEntity[]): Promise<CompanyEntity[]> {
    try {
      if (company.id && typeof company.id === 'number') {
        await apiClient.put(`/catalogs/companies/${company.id}`, company);
      } else {
        await apiClient.post('/catalogs/companies', company);
      }
    } catch (err) {
      console.warn('[Catalogs API] Save company to backend failed:', err);
    }
    const idx = currentList.findIndex((c) => c.id === company.id || c.code === company.code);
    let nextList: CompanyEntity[];
    if (idx >= 0) {
      nextList = currentList.map((c) => (c.id === company.id || c.code === company.code ? { ...c, ...company } : c));
    } else {
      nextList = [{ ...company, id: company.id || Date.now() }, ...currentList];
    }
    setStoredData('catalogs_companies', nextList);
    return nextList;
  },

  async deleteCompany(id: number, currentList: CompanyEntity[]): Promise<CompanyEntity[]> {
    try {
      await apiClient.delete(`/catalogs/companies/${id}`);
    } catch (err) {
      console.warn('[Catalogs API] Delete company on backend failed:', err);
    }
    const nextList = currentList.filter((c) => c.id !== id);
    setStoredData('catalogs_companies', nextList);
    return nextList;
  },

  async bulkSyncCompanies(items: CompanyEntity[]): Promise<CompanyEntity[]> {
    const response = await apiClient.post('/catalogs/companies/bulk-sync', { items });
    const savedItems = unwrapCatalogResponse(response);
    if (!Array.isArray(savedItems)) {
      throw new Error('Backend không trả lại dữ liệu công ty đã lưu');
    }
    return this.getCompanies(savedItems);
  },
};
