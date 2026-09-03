import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  RotateCcw,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Upload,
  Eye,
  Plus,
  Building2,
  MapPin,
  Briefcase,
  Layers,
  Trees,
  Users2,
  Grid,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  ShieldAlert,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Phone,
  Landmark,
} from 'lucide-react';
import {
  mockCompanyEntities,
  mockComplexes,
  mockRegions,
  mockDepartments,
  mockEnterprises,
  mockFarms,
  mockTeams,
  mockPlots,
  mockLandParcels,
  mockPositions,
  CompanyEntity,
  CatalogItem,
} from '../../data/catalogData';
import { getStoredData, setStoredData } from '../../utils/storage';
import { catalogsApi } from '../../api/catalogsApi';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';
import {
  catalogTabMeta,
  exportGenericCatalogWorkbook,
  parseGenericCatalogWorkbook,
  type CatalogTabId,
  type GenericCatalogTabId,
} from '../../utils/catalogExcel';

export const CommonCatalogsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'cong-ty';
  const activeTab = rawTab === 'khu-vuc' ? 'xi-nghiep' : rawTab;

  // Master lists with persistent storage
  const [companies, setCompanies] = useState<CompanyEntity[]>(() =>
    getStoredData('catalogs_companies', mockCompanyEntities)
  );
  const [complexes, setComplexes] = useState<CatalogItem[]>(() => {
    const stored = getStoredData('catalogs_complexes', null);
    if (
      !stored ||
      !Array.isArray(stored) ||
      stored.length === 0 ||
      stored.some((c: any) => !c.areaHa || c.name.includes('?'))
    ) {
      setStoredData('catalogs_complexes', mockComplexes);
      return mockComplexes;
    }
    return stored;
  });
  const [popoverEnterpriseComplex, setPopoverEnterpriseComplex] = useState<CatalogItem | null>(null);
  const [popoverAuditComplex, setPopoverAuditComplex] = useState<CatalogItem | null>(null);
  const [popoverAuditEnterprise, setPopoverAuditEnterprise] = useState<CatalogItem | null>(null);
  const [popoverAuditFarm, setPopoverAuditFarm] = useState<CatalogItem | null>(null);
  const [enterpriseSearchKw, setEnterpriseSearchKw] = useState('');
  const [regions, setRegions] = useState<CatalogItem[]>(() => {
    const stored = getStoredData<CatalogItem[] | null>('catalogs_regions', null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    setStoredData('catalogs_regions', mockRegions);
    return mockRegions || [];
  });
  const [departments, setDepartments] = useState<CatalogItem[]>(() => {
    const stored = getStoredData('catalogs_departments', null);
    if (!stored || !Array.isArray(stored) || stored.length < mockDepartments.length || !stored.some((d: any) => d.code === 'PB_NHIEN_LIEU')) {
      setStoredData('catalogs_departments', mockDepartments);
      return mockDepartments;
    }
    return stored;
  });
  const [enterprises, setEnterprises] = useState<CatalogItem[]>(() => {
    const stored = getStoredData('catalogs_enterprises', null);
    if (!stored || !Array.isArray(stored) || stored.length < mockEnterprises.length || stored.some((e: any) => e.code === 'BE01' && e.areaHa === 1100)) {
      setStoredData('catalogs_enterprises', mockEnterprises);
      return mockEnterprises;
    }
    return stored;
  });
  const [farms, setFarms] = useState<CatalogItem[]>(() => {
    const stored = getStoredData<CatalogItem[] | null>('catalogs_farms', null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    setStoredData('catalogs_farms', mockFarms);
    return mockFarms || [];
  });
  const [teams, setTeams] = useState<CatalogItem[]>(() => {
    const stored = getStoredData<CatalogItem[] | null>('catalogs_teams', null);
    if (!stored || !Array.isArray(stored) || stored.length < mockTeams.length || stored.some((t: any) => t.code === 'DOI_CG_01')) {
      setStoredData('catalogs_teams', mockTeams);
      return mockTeams;
    }
    return stored;
  });
  const [plots, setPlots] = useState<CatalogItem[]>(() => {
    const stored = getStoredData<CatalogItem[] | null>('catalogs_plots', null);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
    return mockPlots || [];
  });
  const [landParcels, setLandParcels] = useState<CatalogItem[]>(() => {
    const stored = getStoredData<CatalogItem[] | null>('catalogs_land_parcels', null);
    if (stored && Array.isArray(stored)) {
      return stored;
    }
    return mockLandParcels || [];
  });
  const [positions, setPositions] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_positions', mockPositions)
  );

  // Filters State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterParentName, setFilterParentName] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OVER_LIMIT' | 'NORMAL'>(() => {
    const s = searchParams.get('status');
    return s === 'OVER_LIMIT' || s === 'NORMAL' ? (s as any) : 'ALL';
  });

  const initialFilterState = useMemo(() => ({
    code: '',
    name: '',
    address: '',
    phone: '',
    fax: '',
    status: 'ALL',
    complexName: '',
    enterpriseName: '',
    parentName: '',
    farmName: '',
    plotName: '',
    plotStatus: '',
  }), []);

  // Detailed Search Form Filters matching THACO AGRI legacy standard (Screenshot 1-4)
  const [filterForm, setFilterForm] = useState(initialFilterState);
  // Applied filters committed ONLY when user clicks the "Tìm kiếm" button
  const [appliedFilter, setAppliedFilter] = useState(initialFilterState);

  const handleSearch = () => {
    setAppliedFilter({ ...filterForm });
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setFilterForm(initialFilterState);
    setAppliedFilter(initialFilterState);
    setSearchKeyword('');
    setFilterParentName('ALL');
    setFilterStatus('ALL');
    setCurrentPage(1);
  };

  // Fetch latest catalogs from Database API on mount
  useEffect(() => {
    const loadCatalogsFromBackend = async () => {
      try {
        const [compData, complexesData, deptsData, entsData, farmsData, teamsData, plotsData, parcelsData] = await Promise.all([
          catalogsApi.getCompanies(mockCompanyEntities),
          catalogsApi.getCatalogs('COMPLEX', 'catalogs_complexes', mockComplexes),
          catalogsApi.getCatalogs('DEPARTMENT', 'catalogs_departments', mockDepartments),
          catalogsApi.getCatalogs('ENTERPRISE', 'catalogs_enterprises', mockEnterprises),
          catalogsApi.getCatalogs('FARM', 'catalogs_farms', mockFarms),
          catalogsApi.getCatalogs('TEAM', 'catalogs_teams', mockTeams),
          catalogsApi.getCatalogs('PLOT', 'catalogs_plots', mockPlots),
          catalogsApi.getCatalogs('LAND_PARCEL', 'catalogs_land_parcels', mockLandParcels),
        ]);
        if (compData && compData.length > 0) setCompanies(compData);
        if (complexesData && complexesData.length > 0) setComplexes(complexesData);
        if (deptsData && deptsData.length > 0) setDepartments(deptsData);
        if (entsData && entsData.length > 0) setEnterprises(entsData);
        if (farmsData && farmsData.length > 0) setFarms(farmsData);
        if (teamsData && teamsData.length > 0) setTeams(teamsData);
        if (plotsData && plotsData.length > 0) setPlots(plotsData);
        if (parcelsData && parcelsData.length > 0) setLandParcels(parcelsData);
      } catch (err) {
        console.warn('Could not load catalogs from backend, using local storage:', err);
      }
    };
    loadCatalogsFromBackend();
  }, []);

  // Sync filters whenever searchParams changes
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'OVER_LIMIT' || statusParam === 'NORMAL') {
      setFilterStatus(statusParam as any);
    }
  }, [searchParams]);

  // Reset filters when tab explicitly changes unless status is in URL
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam !== 'OVER_LIMIT') {
      setFilterStatus('ALL');
    }
    setSearchKeyword('');
    setFilterParentName('ALL');
    setFilterForm(initialFilterState);
    setAppliedFilter(initialFilterState);
  }, [activeTab, initialFilterState]);

  const globalKLH = useAppStore((state) => state.selectedKLH);

  useEffect(() => {
    if (!globalKLH || globalKLH === 'ALL') {
      setFilterParentName('ALL');
      setFilterForm((prev) => ({ ...prev, complexName: '', parentName: '' }));
      setAppliedFilter((prev) => ({ ...prev, complexName: '', parentName: '' }));
    } else {
      const comp = complexes.find(
        (c) =>
          c.code === globalKLH ||
          c.id === globalKLH ||
          (globalKLH === 'KOUN_MOM' && (c.code === 'KM' || c.name.includes('Koun Mom'))) ||
          (globalKLH === 'SNOUL' && (c.code === 'SN' || c.name.includes('Snoul'))) ||
          (globalKLH === 'NAM_LAO' && (c.code === 'NL' || c.name.includes('Nam Lào') || c.name.includes('Lào')))
      );
      const name = comp?.name || '';
      setFilterParentName(name || 'ALL');
      setFilterForm((prev) => ({ ...prev, complexName: name, parentName: name }));
      setAppliedFilter((prev) => ({ ...prev, complexName: name, parentName: name }));
    }
  }, [globalKLH, complexes]);

  // Pagination State (Default 50 rows per page per user request)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Reset page to 1 when applied filters or activeTab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, appliedFilter, searchKeyword, filterParentName, filterStatus]);

  // Reusable Pagination Renderer
  const renderPagination = (totalItems: number) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startRecord = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentPage <= 4) {
          for (let i = 1; i <= 5; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
          pages.push('...');
          pages.push(totalPages);
        }
      }
      return pages;
    };

    return (
      <div className="px-3.5 py-2.5 bg-[#f8f9fa] border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs font-sans">
        <div className="flex items-center gap-2 text-slate-600">
          <span>
            Hiển thị <b>{startRecord} - {endRecord}</b> trên tổng số <b>{totalItems}</b> bản ghi
          </span>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span>Số dòng/trang:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-600"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(1)}
            title="Trang đầu"
            className={`p-1 rounded border transition-colors ${
              currentPage <= 1
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-100'
                : 'border-slate-300 text-slate-700 hover:bg-white bg-white cursor-pointer shadow-2xs'
            }`}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            title="Trang trước"
            className={`p-1 rounded border transition-colors ${
              currentPage <= 1
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-100'
                : 'border-slate-300 text-slate-700 hover:bg-white bg-white cursor-pointer shadow-2xs'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 font-medium">
                    ...
                  </span>
                );
              }
              const pageNum = p as number;
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[26px] h-[26px] px-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            title="Trang sau"
            className={`p-1 rounded border transition-colors ${
              currentPage >= totalPages
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-100'
                : 'border-slate-300 text-slate-700 hover:bg-white bg-white cursor-pointer shadow-2xs'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            title="Trang cuối"
            className={`p-1 rounded border transition-colors ${
              currentPage >= totalPages
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-100'
                : 'border-slate-300 text-slate-700 hover:bg-white bg-white cursor-pointer shadow-2xs'
            }`}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Memoized options for SearchableSelect (combo-box: search + select)
  const statusOptions: SelectOption[] = useMemo(
    () => [
      { value: 'ALL', label: '-- Tất cả --' },
      { value: 'HOAT_DONG', label: 'Hoạt động' },
      { value: 'TAM_DUNG', label: 'Không hoạt động' },
    ],
    []
  );

  const complexOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: '-- Tất cả khu liên hợp --' },
      ...complexes.map((c) => ({
        value: c.name,
        label: `${c.code} - ${c.name}`,
      })),
    ],
    [complexes]
  );

  // Cascading Enterprises: Filtered by selected Complex
  const enterpriseOptions: SelectOption[] = useMemo(() => {
    let list = enterprises;
    if (filterForm.complexName) {
      list = list.filter(
        (e) => e.parentName === filterForm.complexName || e.parentCode === filterForm.complexName
      );
    }
    return [
      { value: '', label: '-- Tất cả xí nghiệp --' },
      ...list.map((e) => ({
        value: e.name,
        label: `${e.code} - ${e.name}`,
        subLabel: e.parentName ? `KLH: ${e.parentName}` : undefined,
      })),
    ];
  }, [enterprises, filterForm.complexName]);

  const departmentParentOptions: SelectOption[] = useMemo(
    () => [
      { value: '', label: '-- Tất cả đơn vị --' },
      ...companies.map((c) => ({
        value: c.name,
        label: `${c.code} - ${c.name}`,
        subLabel: 'Công ty',
      })),
      ...complexes.map((c) => ({
        value: c.name,
        label: `${c.code} - ${c.name}`,
        subLabel: 'Khu liên hợp',
      })),
    ],
    [companies, complexes]
  );

  // Cascading Farms: Filtered by selected Enterprise and/or Complex
  const farmOptions: SelectOption[] = useMemo(() => {
    let list = farms;
    if (filterForm.enterpriseName) {
      list = list.filter(
        (f) =>
          f.parentName === filterForm.enterpriseName ||
          f.parentCode === filterForm.enterpriseName ||
          (f.parentName && f.parentName.includes(filterForm.enterpriseName))
      );
    } else if (filterForm.complexName) {
      const allowedEntNames = enterprises
        .filter((e) => e.parentName === filterForm.complexName || e.parentCode === filterForm.complexName)
        .map((e) => e.name);
      list = list.filter((f) => allowedEntNames.includes(f.parentName || ''));
    }
    return [
      { value: '', label: '-- Tất cả nông trường --' },
      ...list.map((f) => ({
        value: f.name,
        label: `${f.code} - ${f.name}`,
        subLabel: f.parentName ? `XN: ${f.parentName}` : undefined,
      })),
    ];
  }, [farms, enterprises, filterForm.enterpriseName, filterForm.complexName]);

  // Cascading Plots: Filtered by Farm, Enterprise, Complex
  const plotOptions: SelectOption[] = useMemo(() => {
    let list = plots;
    const activeFarm = filterForm.farmName || (activeTab === 'danh-muc-lo' ? filterForm.parentName : '');
    if (activeFarm) {
      list = list.filter(
        (p) =>
          p.parentName === activeFarm ||
          p.parentCode === activeFarm ||
          (p.parentName && p.parentName.includes(activeFarm))
      );
    } else if (filterForm.enterpriseName) {
      const allowedFarmNames = farms
        .filter(
          (f) =>
            f.parentName === filterForm.enterpriseName ||
            f.parentCode === filterForm.enterpriseName ||
            (f.parentName && f.parentName.includes(filterForm.enterpriseName))
        )
        .map((f) => f.name);
      list = list.filter(
        (p) => allowedFarmNames.includes(p.parentName || '') || p.enterpriseName === filterForm.enterpriseName
      );
    } else if (filterForm.complexName) {
      const allowedEntNames = enterprises
        .filter((e) => e.parentName === filterForm.complexName || e.parentCode === filterForm.complexName)
        .map((e) => e.name);
      const allowedFarmNames = farms
        .filter((f) => allowedEntNames.includes(f.parentName || ''))
        .map((f) => f.name);
      list = list.filter((p) => allowedFarmNames.includes(p.parentName || ''));
    }
    return [
      { value: '', label: '-- Tất cả lô sản xuất --' },
      ...list.map((p) => ({
        value: p.name,
        label: `${p.code} - ${p.name}`,
        subLabel: p.parentName ? `NT: ${p.parentName}` : undefined,
      })),
    ];
  }, [plots, farms, enterprises, filterForm.farmName, filterForm.parentName, filterForm.enterpriseName, filterForm.complexName, activeTab]);

  // Cascading Teams: Filtered by Farm, Enterprise, Complex
  const teamOptions: SelectOption[] = useMemo(() => {
    let list = teams;
    const activeFarm = filterForm.farmName || (activeTab === 'doi' ? filterForm.parentName : '');
    if (activeFarm) {
      list = list.filter((t) => t.parentName === activeFarm || t.parentCode === activeFarm);
    } else if (filterForm.enterpriseName) {
      const allowedFarmNames = farms
        .filter(
          (f) =>
            f.parentName === filterForm.enterpriseName ||
            f.parentCode === filterForm.enterpriseName ||
            (f.parentName && f.parentName.includes(filterForm.enterpriseName))
        )
        .map((f) => f.name);
      list = list.filter((t) => allowedFarmNames.includes(t.parentName || ''));
    }
    return [
      { value: '', label: '-- Tất cả đội --' },
      ...list.map((t) => ({
        value: t.name,
        label: `${t.code} - ${t.name}`,
        subLabel: t.parentName ? `NT: ${t.parentName}` : undefined,
      })),
    ];
  }, [teams, farms, filterForm.farmName, filterForm.parentName, filterForm.enterpriseName, activeTab]);

  // Cascading Handlers (Auto-reset downstream selections when upstream changes)
  const handleComplexFilterChange = (val: string) => {
    setFilterForm((prev) => {
      const next = { ...prev, complexName: val };
      if (val && prev.enterpriseName) {
        const ent = enterprises.find((e) => e.name === prev.enterpriseName || e.code === prev.enterpriseName);
        if (ent && ent.parentName !== val && ent.parentCode !== val) {
          next.enterpriseName = '';
          next.parentName = '';
          next.farmName = '';
          next.plotName = '';
          next.code = '';
          next.name = '';
        }
      }
      return next;
    });
  };

  const handleEnterpriseFilterChange = (val: string) => {
    setFilterForm((prev) => {
      const next = { ...prev, enterpriseName: val };
      if (activeTab === 'khu-lien-hop' || activeTab === 'xi-nghiep') {
        next.parentName = val;
      }
      const currentFarm = prev.farmName || (activeTab !== 'xi-nghiep' && activeTab !== 'khu-lien-hop' ? prev.parentName : '');
      if (val && currentFarm) {
        const f = farms.find((farm) => farm.name === currentFarm || farm.code === currentFarm);
        if (f && f.parentName !== val && f.parentCode !== val) {
          next.farmName = '';
          if (activeTab !== 'xi-nghiep') next.parentName = '';
          next.plotName = '';
          next.code = '';
          next.name = '';
        }
      }
      if (val && activeTab === 'nong-truong') {
        const f = farms.find((farm) => farm.code === prev.code || farm.name === prev.name);
        if (f && f.parentName !== val && f.parentCode !== val) {
          next.code = '';
          next.name = '';
        }
      }
      return next;
    });
  };

  const handleFarmFilterChange = (val: string) => {
    setFilterForm((prev) => {
      const next = { ...prev, parentName: val, farmName: val };
      if (val && prev.plotName) {
        const p = plots.find((plot) => plot.name === prev.plotName || plot.code === prev.plotName);
        if (p && p.parentName !== val && p.parentCode !== val) {
          next.plotName = '';
          next.code = '';
          next.name = '';
        }
      }
      if (val) {
        if (activeTab === 'doi') {
          const t = teams.find((team) => team.code === prev.code || team.name === prev.name);
          if (t && t.parentName !== val && t.parentCode !== val) {
            next.code = '';
            next.name = '';
          }
        } else if (activeTab === 'danh-muc-lo') {
          const p = plots.find((plot) => plot.code === prev.code || plot.name === prev.name);
          if (p && p.parentName !== val && p.parentCode !== val) {
            next.code = '';
            next.name = '';
          }
        }
      }
      return next;
    });
  };

  const handlePlotFilterChange = (val: string) => {
    setFilterForm((prev) => {
      const next = { ...prev, plotName: val };
      if (val && activeTab === 'danh-muc-thua') {
        const parcel = landParcels.find((lp) => lp.code === prev.code || lp.name === prev.name);
        if (parcel && parcel.parentName !== val && parcel.parentCode !== val) {
          next.code = '';
          next.name = '';
        }
      }
      return next;
    });
  };

  // Records for code / name / address / phone filters, strictly scoped to current cascading hierarchy selections
  const activeFilterRecords = useMemo<Array<CatalogItem | CompanyEntity>>(() => {
    if (activeTab === 'cong-ty') return companies;

    if (activeTab === 'phong-ban') {
      let list = departments;
      if (filterForm.parentName) {
        list = list.filter((d) => d.parentName === filterForm.parentName);
      }
      return list;
    }

    if (activeTab === 'khu-lien-hop') {
      let list = complexes;
      const targetEnt = filterForm.enterpriseName || filterForm.parentName;
      if (targetEnt) {
        list = list.filter((c) =>
          enterprises.some(
            (e) =>
              (e.parentName === c.name || e.parentCode === c.code || (c.code === 'D01' && ['BE01', 'BE02', 'BE03', 'BE04', 'BE05'].includes(e.code))) &&
              (e.name === targetEnt || e.code === targetEnt)
          )
        );
      }
      return list;
    }

    if (activeTab === 'xi-nghiep') {
      let list = enterprises;
      const targetComplex = filterForm.complexName || filterForm.parentName;
      if (targetComplex) {
        list = list.filter(
          (e) =>
            e.parentName === targetComplex ||
            e.parentCode === targetComplex ||
            (e.parentName && e.parentName.includes(targetComplex))
        );
      }
      return list;
    }

    if (activeTab === 'nong-truong') {
      let list = farms;
      const targetEnterprise = filterForm.enterpriseName || filterForm.parentName;
      if (targetEnterprise) {
        list = list.filter(
          (f) =>
            f.parentName === targetEnterprise ||
            f.parentCode === targetEnterprise ||
            (f.parentName && f.parentName.includes(targetEnterprise))
        );
      } else if (filterForm.complexName) {
        const allowedEntNames = enterprises
          .filter((e) => e.parentName === filterForm.complexName || e.parentCode === filterForm.complexName)
          .map((e) => e.name);
        list = list.filter((f) => allowedEntNames.includes(f.parentName || ''));
      }
      return list;
    }

    if (activeTab === 'doi') {
      let list = teams;
      const targetFarm = filterForm.farmName || filterForm.parentName;
      if (targetFarm) {
        list = list.filter(
          (t) =>
            t.parentName === targetFarm ||
            t.parentCode === targetFarm ||
            (t.parentName && t.parentName.includes(targetFarm))
        );
      } else if (filterForm.enterpriseName) {
        const allowedFarmNames = farms
          .filter(
            (f) =>
              f.parentName === filterForm.enterpriseName ||
              f.parentCode === filterForm.enterpriseName ||
              (f.parentName && f.parentName.includes(filterForm.enterpriseName))
          )
          .map((f) => f.name);
        list = list.filter((t) => allowedFarmNames.includes(t.parentName || ''));
      } else if (filterForm.complexName) {
        const allowedEntNames = enterprises
          .filter((e) => e.parentName === filterForm.complexName || e.parentCode === filterForm.complexName)
          .map((e) => e.name);
        const allowedFarmNames = farms
          .filter((f) => allowedEntNames.includes(f.parentName || ''))
          .map((f) => f.name);
        list = list.filter((t) => allowedFarmNames.includes(t.parentName || ''));
      }
      return list;
    }

    if (activeTab === 'danh-muc-lo') {
      let list = plots;
      const targetFarm = filterForm.farmName || filterForm.parentName;
      if (targetFarm) {
        list = list.filter(
          (p) =>
            p.parentName === targetFarm ||
            p.parentCode === targetFarm ||
            (p.parentName && p.parentName.includes(targetFarm))
        );
      } else if (filterForm.enterpriseName) {
        const allowedFarmNames = farms
          .filter(
            (f) =>
              f.parentName === filterForm.enterpriseName ||
              f.parentCode === filterForm.enterpriseName ||
              (f.parentName && f.parentName.includes(filterForm.enterpriseName))
          )
          .map((f) => f.name);
        list = list.filter(
          (p) => allowedFarmNames.includes(p.parentName || '') || p.enterpriseName === filterForm.enterpriseName
        );
      } else if (filterForm.complexName) {
        const allowedEntNames = enterprises
          .filter((e) => e.parentName === filterForm.complexName || e.parentCode === filterForm.complexName)
          .map((e) => e.name);
        const allowedFarmNames = farms
          .filter((f) => allowedEntNames.includes(f.parentName || ''))
          .map((f) => f.name);
        list = list.filter((p) => allowedFarmNames.includes(p.parentName || ''));
      }
      return list;
    }

    if (activeTab === 'danh-muc-thua') {
      let list = landParcels;
      if (filterForm.plotName) {
        list = list.filter(
          (p) =>
            p.parentName === filterForm.plotName ||
            p.parentCode === filterForm.plotName ||
            (p.parentName && p.parentName.includes(filterForm.plotName))
        );
      } else if (filterForm.farmName || filterForm.parentName) {
        const targetFarm = filterForm.farmName || filterForm.parentName;
        const allowedPlotNames = plots
          .filter((pl) => pl.parentName === targetFarm || pl.parentCode === targetFarm)
          .map((pl) => pl.name);
        list = list.filter((p) => p.farmName === targetFarm || allowedPlotNames.includes(p.parentName || ''));
      } else if (filterForm.enterpriseName) {
        const allowedFarmNames = farms
          .filter(
            (f) =>
              f.parentName === filterForm.enterpriseName ||
              f.parentCode === filterForm.enterpriseName ||
              (f.parentName && f.parentName.includes(filterForm.enterpriseName))
          )
          .map((f) => f.name);
        const allowedPlotNames = plots
          .filter((pl) => allowedFarmNames.includes(pl.parentName || '') || pl.enterpriseName === filterForm.enterpriseName)
          .map((pl) => pl.name);
        list = list.filter(
          (p) =>
            p.enterpriseName === filterForm.enterpriseName ||
            allowedFarmNames.includes(p.farmName || '') ||
            allowedPlotNames.includes(p.parentName || '')
        );
      } else if (filterForm.complexName) {
        const allowedEntNames = enterprises
          .filter((e) => e.parentName === filterForm.complexName || e.parentCode === filterForm.complexName)
          .map((e) => e.name);
        const allowedFarmNames = farms
          .filter((f) => allowedEntNames.includes(f.parentName || ''))
          .map((f) => f.name);
        const allowedPlotNames = plots
          .filter((pl) => allowedFarmNames.includes(pl.parentName || ''))
          .map((pl) => pl.name);
        list = list.filter(
          (p) => allowedFarmNames.includes(p.farmName || '') || allowedPlotNames.includes(p.parentName || '')
        );
      }
      return list;
    }

    return [];
  }, [
    activeTab,
    companies,
    departments,
    complexes,
    enterprises,
    farms,
    teams,
    plots,
    landParcels,
    filterForm.complexName,
    filterForm.enterpriseName,
    filterForm.farmName,
    filterForm.parentName,
    filterForm.plotName,
  ]);

  const buildTextSelectOptions = (values: Array<string | undefined>, emptyLabel: string): SelectOption[] => {
    const uniqueValues = [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
    return [
      { value: '', label: emptyLabel },
      ...uniqueValues.map((value) => ({ value, label: value })),
    ];
  };

  const codeFilterOptions = useMemo(() => {
    let records = activeFilterRecords;
    if (filterForm.name) {
      const matching = records.filter((item) => item.name === filterForm.name);
      if (matching.length > 0) records = matching;
    }
    return buildTextSelectOptions(records.map((item) => item.code), '-- Tất cả mã --');
  }, [activeFilterRecords, filterForm.name]);

  const nameFilterOptions = useMemo(() => {
    let records = activeFilterRecords;
    if (filterForm.code) {
      const matching = records.filter((item) => item.code === filterForm.code);
      if (matching.length > 0) records = matching;
    }
    return buildTextSelectOptions(records.map((item) => item.name), '-- Tất cả tên --');
  }, [activeFilterRecords, filterForm.code]);

  const addressFilterOptions = useMemo(
    () => buildTextSelectOptions(activeFilterRecords.map((item) => item.address), '-- Tất cả địa chỉ --'),
    [activeFilterRecords],
  );

  const phoneFilterOptions = useMemo(
    () => buildTextSelectOptions(
      activeFilterRecords.map((item) => ('phone' in item ? item.phone : undefined)),
      '-- Tất cả điện thoại --',
    ),
    [activeFilterRecords],
  );

  const faxFilterOptions = useMemo(
    () => [{ value: '', label: '-- Tất cả fax --' }],
    [],
  );

  const handleCodeFilterChange = (val: string) => {
    setFilterForm((prev) => {
      const next = { ...prev, code: val };
      if (val) {
        const item = activeFilterRecords.find((rec) => rec.code === val);
        if (item && !prev.name) {
          next.name = item.name;
        }
      }
      return next;
    });
  };

  const handleNameFilterChange = (val: string) => {
    setFilterForm((prev) => {
      const next = { ...prev, name: val };
      if (val) {
        const item = activeFilterRecords.find((rec) => rec.name === val);
        if (item && !prev.code) {
          next.code = item.code;
        }
      }
      return next;
    });
  };

  // Catalog template/import/export file inputs
  const genericCatalogFileInputRef = useRef<HTMLInputElement>(null);
  const farmFileInputRef = useRef<HTMLInputElement>(null);
  const plotFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplateNongTruong = async () => {
    try {
      await catalogsApi.downloadTemplate('FARM');
    } catch (error) {
      console.error('Farm template download error:', error);
      alert('Không thể tải file mẫu Nông trường từ backend.');
    }
  };

  const handleExportExcelFarms = async () => {
    try {
      const XLSX = await import('xlsx');
      const dataToExport = farms.map((f, idx) => ({
        'STT': idx + 1,
        'Mã nông trường': f.code,
        'Tên nông trường': f.name,
        'Xí nghiệp': f.parentName || '',
        'Trạng thái': f.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động',
        'Người tạo': f.createdUser || 'admin',
        'Ngày tạo': f.createdDate || f.createdAt || '14-03-2026',
        'Người sửa': f.updatedUser || 'admin',
        'Ngày sửa': f.updatedDate || '01-08-2026',
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Nông trường');
      XLSX.writeFile(workbook, `Danh_Sach_Nong_Truong_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error exporting farms excel:', err);
    }
  };

  const handleUploadExcelFarms = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        // Find the header row dynamically (contains "Mã nông trường")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const row = data[i];
          if (Array.isArray(row) && row.some((cell: any) =>
            typeof cell === 'string' && cell.toString().toLowerCase().includes('mã nông trường')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        // If no header found, fallback to row 0
        const headerRow: any[] = headerRowIndex >= 0 ? data[headerRowIndex] : data[0] || [];

        // Build column index map from header names
        const colMap: Record<string, number> = {};
        headerRow.forEach((cell: any, idx: number) => {
          if (cell) colMap[cell.toString().trim()] = idx;
        });

        // Column indices
        const idxCode    = colMap['Mã nông trường']          ?? 0;
        const idxName    = colMap['Tên nông trường']          ?? 1;
        const idxEnterprise = colMap['Thuộc xí nghiệp']       ?? 2;
        const idxAreaHa  = colMap['Diện tích quy hoạch(ha)']  ?? -1;

        // Parse data rows (start after header row)
        let addedCount = 0;
        const newFarms: CatalogItem[] = [];
        const dataStartIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
        for (let i = dataStartIndex; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          const code = (row[idxCode] ?? '').toString().trim();
          const name = (row[idxName] ?? '').toString().trim();
          const enterpriseRaw = (row[idxEnterprise] ?? '').toString().trim();
          const matchedEnterprise = enterprises.find((enterprise) =>
            enterprise.code === enterpriseRaw ||
            enterprise.name === enterpriseRaw ||
            `${enterprise.code} - ${enterprise.name}` === enterpriseRaw
          );
          const enterpriseName = matchedEnterprise?.name ||
            (enterpriseRaw.includes(' - ')
              ? enterpriseRaw.split(' - ').slice(1).join(' - ').trim()
              : enterpriseRaw);
          const rawArea = idxAreaHa >= 0 ? row[idxAreaHa] : undefined;
          const areaHa = rawArea !== undefined && rawArea !== '' && rawArea !== null
            ? parseFloat(rawArea.toString())
            : undefined;

          if (code && name && code !== 'Mã nông trường' && code !== 'STT') {
            newFarms.push({
              id: `farm-upload-${Date.now()}-${i}`,
              code,
              name,
              type: 'FARM',
              parentCode: matchedEnterprise?.code,
              parentName: enterpriseName || enterprises[0]?.name || 'BE01 - Xí nghiệp Chuối DP1',
              status: 'HOAT_DONG',
              areaHa: isNaN(areaHa as number) ? undefined : areaHa,
              createdUser: 'admin',
              createdDate: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
              updatedUser: 'admin',
              updatedDate: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
            });
            addedCount++;
          }
        }

        if (addedCount > 0) {
          const persisted = await catalogsApi.bulkSyncCatalogs('FARM', newFarms, 'catalogs_farms');
          setFarms(persisted);
          alert(`Đã tải lên thành công ${addedCount} Nông trường và lưu vào Cơ sở dữ liệu!`);
        } else {
          alert('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng dùng đúng file mẫu!');
        }
      } catch (err) {
        console.error('Error parsing excel (plots):', err);
        alert('Có lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file mẫu!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // ----------------------------------------------------------------------------
  // LÔ (PLOT) - Template Download & Excel Upload
  // ----------------------------------------------------------------------------
  const handleDownloadTemplateLo = async () => {
    try {
      await catalogsApi.downloadTemplate('PLOT');
    } catch (error) {
      console.error('Plot template download error:', error);
      alert('Không thể tải file mẫu Lô từ backend.');
    }
  };

  const handleUploadExcelPlots = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        // Prefer sheet "DLN LÔ" or first non-copyright sheet
        const wsName = wb.SheetNames.find((s: string) => s.toUpperCase().includes('LÔ') || s.toUpperCase().includes('LO')) || wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        // Find header row dynamically (contains "Mã lô" or "Tên lô")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const row = data[i];
          if (Array.isArray(row) && row.some((cell: any) =>
            typeof cell === 'string' && cell.toString().toLowerCase().includes('mã lô')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow: any[] = headerRowIndex >= 0 ? data[headerRowIndex] : data[0] || [];
        const colMap: Record<string, number> = {};
        headerRow.forEach((cell: any, idx: number) => {
          if (cell) colMap[cell.toString().trim().toLowerCase()] = idx;
        });

        const findCol = (...names: string[]) => {
          for (const name of names) {
            const key = name.toLowerCase();
            for (const k in colMap) {
              if (k === key || k.includes(key)) return colMap[k];
            }
          }
          return -1;
        };

        const idxCode     = findCol('mã lô', 'ma lo', 'mã định danh');
        const idxName     = findCol('tên lô', 'ten lo');
        const idxEnt      = findCol('thuộc xí nghiệp', 'tên xí nghiệp', 'xí nghiệp', 'xi nghiep');
        const idxFarm     = findCol('thuộc nông trường', 'tên nông trường', 'nông trường', 'nong truong');
        const idxAreaHa   = findCol('diện tích quy hoạch', 'quy hoạch', 'quy hoach', 'diện tích');

        let addedCount = 0;
        const newPlots: CatalogItem[] = [];
        const dataStart = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
        for (let i = dataStart; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          const code = (idxCode >= 0 ? row[idxCode] : row[1] || row[0] || '')?.toString().trim();
          const name = (idxName >= 0 ? row[idxName] : row[2] || row[1] || '')?.toString().trim();
          const rawEnt = (idxEnt >= 0 ? row[idxEnt] : '')?.toString().trim();
          const rawFarm = (idxFarm >= 0 ? row[idxFarm] : '')?.toString().trim();

          if (!code || !name || code.toLowerCase() === 'mã lô' || code.toUpperCase() === 'STT') continue;

          // Parse Enterprise: "BE01 - Xí nghiệp Chuối DP1" -> Code: "BE01", Name: "Xí nghiệp Chuối DP1"
          let entCode = '';
          let entName = '';
          if (rawEnt) {
            if (rawEnt.includes(' - ')) {
              const parts = rawEnt.split(' - ');
              entCode = parts[0].trim();
              entName = parts.slice(1).join(' - ').trim();
            } else {
              entName = rawEnt;
            }
          }

          // Parse Farm: "BE01.00.01 - Nông trường DP1.1" -> Code: "BE01.00.01", Name: "Nông trường DP1.1"
          let farmCode = '';
          let farmName = '';
          if (rawFarm) {
            if (rawFarm.includes(' - ')) {
              const parts = rawFarm.split(' - ');
              farmCode = parts[0].trim();
              farmName = parts.slice(1).join(' - ').trim();
            } else {
              farmName = rawFarm;
            }
          }

          const matchedFarm = farms.find(f =>
            f.code === farmCode ||
            f.name === farmName ||
            f.code === rawFarm ||
            `${f.code} - ${f.name}` === rawFarm
          );
          if (matchedFarm) {
            farmCode = matchedFarm.code;
            farmName = matchedFarm.name;
          }

          const matchedEnterprise = enterprises.find(e =>
            e.code === entCode ||
            e.name === entName ||
            e.code === rawEnt ||
            `${e.code} - ${e.name}` === rawEnt
          );
          if (matchedEnterprise) {
            entCode = matchedEnterprise.code;
            entName = matchedEnterprise.name;
          }

          // If Enterprise name was not in the row, match from farms or enterprises catalog
          if (!entName && (farmCode || farmName)) {
            if (matchedFarm?.parentName) {
              entName = matchedFarm.parentName;
            }
          }

          const rawArea = idxAreaHa >= 0 ? row[idxAreaHa] : undefined;
          const areaHa = rawArea !== undefined && rawArea !== '' && rawArea !== null
            ? parseFloat(rawArea.toString().replace(/,/g, '')) : undefined;

          newPlots.push({
            id: `plot-upload-${Date.now()}-${i}`,
            code,
            name,
            type: 'PLOT',
            parentCode: farmCode || undefined,
            parentName: farmName || rawFarm || '',
            enterpriseName: entName || undefined,
            status: 'HOAT_DONG',
            areaHa: areaHa !== undefined && !isNaN(areaHa) ? areaHa : undefined,
            createdUser: 'admin',
            createdDate: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
            updatedUser: 'admin',
            updatedDate: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
          });
          addedCount++;
        }

        if (addedCount > 0) {
          const persisted = await catalogsApi.bulkSyncCatalogs('PLOT', newPlots, 'catalogs_plots');
          setPlots(persisted);
          alert(`Đã tải lên thành công ${addedCount} Lô và lưu vào Cơ sở dữ liệu!`);
        } else {
          alert('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng dùng đúng file mẫu!');
        }
      } catch (err) {
        console.error('Error parsing excel (plots):', err);
        alert('Có lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file mẫu!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExportExcelPlots = async () => {
    try {
      const XLSX = await import('xlsx');
      const dataToExport = plots.map((p, idx) => ({
        'STT': idx + 1,
        'Mã lô': p.code,
        'Tên lô': p.name,
        'Nông trường': p.parentName || '',
        'Xi nghiệp': p.enterpriseName || '',
        'Diện tích (ha)': p.areaHa ?? '',
        'Trạng thái': p.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động',
        'User': p.createdUser || 'admin',
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Lô');
      XLSX.writeFile(workbook, `Danh_Sach_Lo_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Có lỗi khi xuất file Excel!');
    }
  };

  // ----------------------------------------------------------------------------
  // THỬA (LAND PARCEL) - Template Download & Excel Upload
  // ----------------------------------------------------------------------------
  const parcelFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplateThua = async () => {
    try {
      await catalogsApi.downloadTemplate('LAND_PARCEL');
    } catch (error) {
      console.error('Parcel template download error:', error);
      alert('Không thể tải file mẫu Thửa từ backend.');
    }
  };

  const handleUploadExcelParcels = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        // Prefer sheet "DLN THỬA"
        const wsName = wb.SheetNames.find(s => s.includes('THỬA') || s.includes('Thửa') || s.includes('thua')) || wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        // Find header row (contains "Mã thửa" or "Tên thửa")
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(data.length, 30); i++) {
          const row = data[i];
          if (Array.isArray(row) && row.some((cell: any) =>
            typeof cell === 'string' && cell.toString().toLowerCase().includes('mã thửa')
          )) {
            headerRowIndex = i;
            break;
          }
        }

        const headerRow: any[] = headerRowIndex >= 0 ? data[headerRowIndex] : data[0] || [];
        const colMap: Record<string, number> = {};
        headerRow.forEach((cell: any, idx: number) => {
          if (cell) colMap[cell.toString().trim().toLowerCase()] = idx;
        });

        const findCol = (...names: string[]) => {
          for (const name of names) {
            const key = name.toLowerCase();
            for (const k in colMap) {
              if (k === key) return colMap[k];
            }
            for (const k in colMap) {
              if (k.includes(key)) return colMap[k];
            }
          }
          return -1;
        };

        const idxCode         = findCol('mã thửa', 'ma thua', 'mã định danh');
        const idxName         = findCol('tên thửa', 'ten thua');
        const idxEntName      = findCol('tên xí nghiệp', 'thuộc xí nghiệp', 'xí nghiệp', 'xi nghiep');
        const idxEntCode      = findCol('mã xí nghiệp');
        const idxFarmName     = findCol('tên nông trường', 'thuộc nông trường', 'nông trường', 'nong truong');
        const idxFarmCode     = findCol('mã nông trường');
        const idxPlotName     = findCol('tên lô', 'thuộc lô', 'lô', 'lo');
        const idxPlotCode     = findCol('mã lô');
        const idxAreaHa       = findCol('diện tích quy hoạch', 'quy hoạch', 'quy hoach', 'diện tích');
        const idxPlotStatus   = findCol('trạng thái thửa');

        let addedCount = 0;
        const newParcels: CatalogItem[] = [];
        const dataStart = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
        for (let i = dataStart; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          const code = (idxCode >= 0 ? row[idxCode] : row[1] || row[0] || '')?.toString().trim();
          const name = (idxName >= 0 ? row[idxName] : row[2] || row[1] || '')?.toString().trim();
          if (!code || !name || code.toLowerCase() === 'mã thửa' || code.toUpperCase() === 'STT') continue;

          let entName  = idxEntName >= 0  ? (row[idxEntName] ?? '').toString().trim()  : '';
          if (entName.includes(' - ')) {
            entName = entName.split(' - ').slice(1).join(' - ').trim();
          }

          let farmName = idxFarmName >= 0 ? (row[idxFarmName] ?? '').toString().trim() : '';
          if (farmName.includes(' - ')) {
            farmName = farmName.split(' - ').slice(1).join(' - ').trim();
          }

          let plotName = idxPlotName >= 0 ? (row[idxPlotName] ?? '').toString().trim() : '';
          let plotCode = idxPlotCode >= 0 ? (row[idxPlotCode] ?? '').toString().trim() : '';
          if (plotName.includes(' - ') && !plotCode) {
            plotName = plotName.split(' - ').slice(1).join(' - ').trim();
          }

          const matchedPlot = plots.find(p =>
            p.code === plotCode ||
            p.name === plotName ||
            `${p.code} - ${p.name}` === plotName
          );
          if (matchedPlot) {
            plotCode = matchedPlot.code;
            plotName = matchedPlot.name;
          }

          // If Farm or Enterprise omitted, fallback to lookup in plots catalog
          if ((!entName || !farmName) && (plotName || plotCode)) {
            if (matchedPlot) {
              if (!entName && matchedPlot.enterpriseName) entName = matchedPlot.enterpriseName;
              if (!farmName && matchedPlot.parentName) farmName = matchedPlot.parentName;
            }
          }

          const rawArea  = idxAreaHa >= 0 ? row[idxAreaHa] : undefined;
          const areaHa   = rawArea !== undefined && rawArea !== '' && rawArea !== null
            ? parseFloat(rawArea.toString().replace(/,/g, '')) : undefined;
          const plotStatusVal = idxPlotStatus >= 0 ? (row[idxPlotStatus] ?? '').toString().trim() : '';

          newParcels.push({
            id: `parcel-upload-${Date.now()}-${i}`,
            code,
            name,
            type: 'LAND_PARCEL',
            parentCode: plotCode || undefined,
            parentName: plotName,
            farmName: farmName || undefined,
            enterpriseName: entName || undefined,
            plotStatus: plotStatusVal || undefined,
            status: 'HOAT_DONG',
            areaHa: areaHa !== undefined && !isNaN(areaHa) ? areaHa : undefined,
            createdUser: 'admin',
            createdDate: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
            updatedUser: 'admin',
            updatedDate: new Date().toLocaleDateString('vi-VN').replace(/\//g, '-'),
          });
          addedCount++;
        }

        if (addedCount > 0) {
          const persisted = await catalogsApi.bulkSyncCatalogs('LAND_PARCEL', newParcels, 'catalogs_land_parcels');
          setLandParcels(persisted);
          alert(`Đã tải lên thành công ${addedCount} Thửa và lưu vào Cơ sở dữ liệu!`);
        } else {
          alert('Không tìm thấy dữ liệu hợp lệ trong file. Vui lòng dùng đúng file mẫu!');
        }
      } catch (err) {
        console.error('Error parsing excel (parcels):', err);
        alert('Có lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file mẫu!');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExportExcelParcels = async () => {
    try {
      const XLSX = await import('xlsx');
      const dataToExport = landParcels.map((p, idx) => ({
        'STT': idx + 1,
        'Mã thửa': p.code,
        'Tên thửa': p.name,
        'Lô': p.parentName || '',
        'Nông trường': p.farmName || '',
        'Xi nghiệp': p.enterpriseName || '',
        'Diện tích (ha)': p.areaHa ?? '',
        'Trạng thái thửa': p.plotStatus || '',
        'Trạng thái': p.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động',
        'User': p.createdUser || 'admin',
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Thửa');
      XLSX.writeFile(workbook, `Danh_Sach_Thua_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Có lỗi khi xuất file Excel!');
    }
  };

  const genericCatalogTabs: GenericCatalogTabId[] = [
    'cong-ty',
    'phong-ban',
    'khu-lien-hop',
    'xi-nghiep',
    'doi',
  ];

  const getApiErrorMessage = (error: unknown) => {
    const typedError = error as { response?: { data?: { message?: string } }; message?: string };
    return typedError.response?.data?.message || typedError.message || 'Thao tác không thành công';
  };

  const handleDownloadActiveTemplate = async () => {
    const meta = catalogTabMeta[activeTab as CatalogTabId];
    if (!meta) return;
    try {
      await catalogsApi.downloadTemplate(meta.type);
    } catch (error) {
      console.error('Template download error:', error);
      alert(`Không thể tải file mẫu: ${getApiErrorMessage(error)}`);
    }
  };

  const handleUploadGenericCatalog = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const tab = activeTab as GenericCatalogTabId;
    if (!file || !genericCatalogTabs.includes(tab)) return;
    try {
      const parsed = await parseGenericCatalogWorkbook(tab, file, {
        companies,
        complexes,
        enterprises,
        farms,
      });
      const meta = catalogTabMeta[tab];
      if (tab === 'cong-ty') {
        const persisted = await catalogsApi.bulkSyncCompanies(parsed as CompanyEntity[]);
        setCompanies(persisted);
      } else {
        const persisted = await catalogsApi.bulkSyncCatalogs(
          meta.type,
          parsed as CatalogItem[],
          meta.storageKey,
        );
        if (tab === 'phong-ban') setDepartments(persisted);
        if (tab === 'khu-lien-hop') setComplexes(persisted);
        if (tab === 'xi-nghiep') setEnterprises(persisted);
        if (tab === 'doi') setTeams(persisted);
        if (tab === 'chuc-danh') setPositions(persisted);
      }
      alert(`Đã lưu ${parsed.length} dòng ${meta.label} vào cơ sở dữ liệu.`);
    } catch (error) {
      console.error('Catalog import error:', error);
      alert(`Import thất bại: ${getApiErrorMessage(error)}`);
    } finally {
      event.target.value = '';
    }
  };

  const handleExportGenericCatalog = async () => {
    const tab = activeTab as CatalogTabId;
    try {
      if (tab === 'cong-ty') await exportGenericCatalogWorkbook(tab, companies);
      if (tab === 'phong-ban') await exportGenericCatalogWorkbook(tab, departments);
      if (tab === 'khu-lien-hop') await exportGenericCatalogWorkbook(tab, complexes);
      if (tab === 'xi-nghiep') await exportGenericCatalogWorkbook(tab, enterprises);
      if (tab === 'doi') await exportGenericCatalogWorkbook(tab, teams);
      if (tab === 'chuc-danh') await exportGenericCatalogWorkbook(tab, positions);
    } catch (error) {
      console.error('Catalog export error:', error);
      alert(`Xuất Excel thất bại: ${getApiErrorMessage(error)}`);
    }
  };

  // ----------------------------------------------------------------------------
  // HIERARCHY OVER-LIMIT EVALUATION & CASCADING YELLOW STATUS
  // ----------------------------------------------------------------------------
  const overLimitMap = useMemo(() => {
    const map = new Map<
      string,
      { isOverLimit: boolean; isDirectOver: boolean; isCascadeOver: boolean; reason: string }
    >();

    // Helper to check if a is strictly greater than b beyond floating point epsilon (0.001 ha)
    const isGreater = (a?: number, b?: number) => {
      if (a === undefined || b === undefined || isNaN(a) || isNaN(b)) return false;
      return a - b > 0.001;
    };

    // 1. KLH: Check if total Xí nghiệp > KLH area
    complexes.forEach((comp) => {
      const childEnts = enterprises.filter((e) => e.parentName === comp.name || e.parentCode === comp.code);
      const totalEntArea = Math.round(childEnts.reduce((sum, e) => sum + (e.areaHa || 0), 0) * 10000) / 10000;
      if (comp.areaHa && isGreater(totalEntArea, comp.areaHa)) {
        map.set(comp.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Tổng diện tích các Xí nghiệp (${totalEntArea.toLocaleString()} ha) vượt quá quy mô KLH (${comp.areaHa.toLocaleString()} ha)`,
        });
      }
    });

    // 2. Xí nghiệp: Check if total Nông trường > Xí nghiệp OR single Xí nghiệp > KLH OR parent KLH is over limit
    enterprises.forEach((ent) => {
      const parentComp = complexes.find((c) => {
        if (ent.parentCode && (ent.parentCode === c.code || (c.code === 'KOUN_MOM' && ent.parentCode === 'KM'))) return true;
        if (ent.parentName && (ent.parentName === c.name || ent.parentName.includes(c.name) || (c.name.includes('Koun Mom') && ent.parentName.includes('Koun Mom')))) return true;
        return false;
      });
      const isParentOver = parentComp ? map.get(parentComp.id)?.isOverLimit : false;

      const childFarms = farms.filter((f) => {
        if (f.parentCode && ent.code && f.parentCode.toLowerCase() === ent.code.toLowerCase()) return true;
        if (f.parentName && ent.name && f.parentName.toLowerCase() === ent.name.toLowerCase()) return true;
        if (f.parentName && ent.code && f.parentName.toLowerCase().includes(ent.code.toLowerCase())) return true;
        if (f.parentName && ent.name && (f.parentName.toLowerCase().includes(ent.name.toLowerCase()) || ent.name.toLowerCase().includes(f.parentName.toLowerCase()))) return true;
        return false;
      });
      const totalFarmArea = Math.round(childFarms.reduce((sum, f) => sum + (f.areaHa || 0), 0) * 10000) / 10000;

      const isSingleExceeded = parentComp && isGreater(ent.areaHa, parentComp.areaHa);
      const isChildrenExceeded = ent.areaHa && isGreater(totalFarmArea, ent.areaHa);

      if (isChildrenExceeded) {
        map.set(ent.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Tổng diện tích các Nông trường con (${totalFarmArea.toLocaleString()} ha) vượt quá diện tích Xí nghiệp (${ent.areaHa?.toLocaleString()} ha)`,
        });
      } else if (isSingleExceeded) {
        map.set(ent.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Diện tích Xí nghiệp (${ent.areaHa?.toLocaleString()} ha) vượt quá quy mô Khu liên hợp cha (${parentComp?.areaHa?.toLocaleString()} ha)`,
        });
      } else if (isParentOver) {
        map.set(ent.id, {
          isOverLimit: true,
          isDirectOver: false,
          isCascadeOver: true,
          reason: `Trực thuộc Khu liên hợp "${parentComp?.name}" đang bị quá hạn mức tổng`,
        });
      }
    });

    // 3. Nông trường: Check if total Lô > Nông trường OR single Nông trường > Xí nghiệp OR parent Xí nghiệp is over limit
    farms.forEach((farm) => {
      const parentEnt = enterprises.find((e) => {
        if (farm.parentCode && e.code && farm.parentCode.toLowerCase() === e.code.toLowerCase()) return true;
        if (farm.parentName && e.name && farm.parentName.toLowerCase() === e.name.toLowerCase()) return true;
        if (farm.parentName && e.code && farm.parentName.toLowerCase().includes(e.code.toLowerCase())) return true;
        if (farm.parentName && e.name && (farm.parentName.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(farm.parentName.toLowerCase()))) return true;
        return false;
      });
      const isParentOver = parentEnt ? map.get(parentEnt.id)?.isOverLimit : false;

      const childPlots = plots.filter((p) => p.parentName === farm.name || p.parentCode === farm.code);
      const totalPlotArea = Math.round(childPlots.reduce((sum, p) => sum + (p.areaHa || 0), 0) * 10000) / 10000;

      const isSingleExceeded = parentEnt && isGreater(farm.areaHa, parentEnt.areaHa);
      const isChildrenExceeded = farm.areaHa && isGreater(totalPlotArea, farm.areaHa);

      if (isChildrenExceeded) {
        map.set(farm.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Tổng diện tích các Lô con (${totalPlotArea.toLocaleString()} ha) vượt quá diện tích Nông trường (${farm.areaHa?.toLocaleString()} ha)`,
        });
      } else if (isSingleExceeded) {
        map.set(farm.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Diện tích Nông trường (${farm.areaHa?.toLocaleString()} ha) vượt quá diện tích Xí nghiệp cha (${parentEnt?.areaHa?.toLocaleString()} ha)`,
        });
      } else if (isParentOver) {
        map.set(farm.id, {
          isOverLimit: true,
          isDirectOver: false,
          isCascadeOver: true,
          reason: `Trực thuộc Xí nghiệp "${parentEnt?.name}" đang bị cảnh báo quá hạn mức diện tích`,
        });
      }
    });

    // 4. Lô: Check if total Thửa > Lô OR single Lô > Nông trường OR parent Nông trường is over limit
    plots.forEach((plot) => {
      const parentFarm = farms.find((f) => f.name === plot.parentName || f.code === plot.parentCode);
      const isParentOver = parentFarm ? map.get(parentFarm.id)?.isOverLimit : false;

      const childParcels = landParcels.filter((lp) => lp.parentName === plot.name || lp.parentCode === plot.code);
      const totalParcelArea = Math.round(childParcels.reduce((sum, p) => sum + (p.areaHa || 0), 0) * 10000) / 10000;

      const isSingleExceeded = parentFarm && isGreater(plot.areaHa, parentFarm.areaHa);
      const isChildrenExceeded = plot.areaHa && isGreater(totalParcelArea, plot.areaHa);

      if (isChildrenExceeded) {
        map.set(plot.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Tổng diện tích các Thửa con (${totalParcelArea.toFixed(1)} ha) vượt quá diện tích Lô (${plot.areaHa} ha)`,
        });
      } else if (isSingleExceeded) {
        map.set(plot.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Diện tích Lô (${plot.areaHa} ha) vượt quá diện tích Nông trường cha (${parentFarm?.areaHa} ha)`,
        });
      } else if (isParentOver) {
        map.set(plot.id, {
          isOverLimit: true,
          isDirectOver: false,
          isCascadeOver: true,
          reason: `Trực thuộc Nông trường "${parentFarm?.name}" đang bị cảnh báo quá hạn mức`,
        });
      }
    });

    // 5. Thửa: Check if single Thửa > Lô OR parent Lô is over limit
    landParcels.forEach((parcel) => {
      const parentPlot = plots.find((p) => p.name === parcel.parentName || p.code === parcel.parentCode);
      const isParentOver = parentPlot ? map.get(parentPlot.id)?.isOverLimit : false;

      const isSingleExceeded = parentPlot && isGreater(parcel.areaHa, parentPlot.areaHa);

      if (isSingleExceeded) {
        map.set(parcel.id, {
          isOverLimit: true,
          isDirectOver: true,
          isCascadeOver: false,
          reason: `Diện tích Thửa (${parcel.areaHa} ha) vượt quá diện tích Lô cha (${parentPlot?.areaHa} ha)`,
        });
      } else if (isParentOver) {
        map.set(parcel.id, {
          isOverLimit: true,
          isDirectOver: false,
          isCascadeOver: true,
          reason: `Trực thuộc Lô "${parentPlot?.name}" đang bị cảnh báo quá hạn mức diện tích`,
        });
      }
    });

    return map;
  }, [complexes, enterprises, farms, plots, landParcels]);

  // Count total unresolved over-limit violations
  const totalOverLimitCount = useMemo(() => {
    let count = 0;
    overLimitMap.forEach((val) => {
      if (val.isOverLimit) count++;
    });
    return count;
  }, [overLimitMap]);

  // Periodic 10-Minute Reminder Modal State
  const [isPeriodicReminderOpen, setIsPeriodicReminderOpen] = useState(false);

  // Periodic 10-Minute Timer (fires every 10 minutes until all violations are fixed)
  useEffect(() => {
    if (totalOverLimitCount === 0) {
      setIsPeriodicReminderOpen(false);
      return;
    }

    const intervalId = setInterval(() => {
      setIsPeriodicReminderOpen(true);
    }, 10 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [totalOverLimitCount]);

  // Tab-specific over-limit statistics
  const tabOverLimitStats = useMemo(() => {
    const stats: { id: string; label: string; count: number }[] = [];

    const entCount = enterprises.filter((e) => overLimitMap.get(e.id)?.isOverLimit).length;
    if (entCount > 0) stats.push({ id: 'xi-nghiep', label: 'Xí nghiệp', count: entCount });

    const farmCount = farms.filter((f) => overLimitMap.get(f.id)?.isOverLimit).length;
    if (farmCount > 0) stats.push({ id: 'nong-truong', label: 'Nông trường', count: farmCount });

    const plotCount = plots.filter((p) => overLimitMap.get(p.id)?.isOverLimit).length;
    if (plotCount > 0) stats.push({ id: 'danh-muc-lo', label: 'Danh mục lô', count: plotCount });

    const parcelCount = landParcels.filter((p) => overLimitMap.get(p.id)?.isOverLimit).length;
    if (parcelCount > 0) stats.push({ id: 'danh-muc-thua', label: 'Danh mục thửa', count: parcelCount });

    const compCount = complexes.filter((c) => overLimitMap.get(c.id)?.isOverLimit).length;
    if (compCount > 0) stats.push({ id: 'khu-lien-hop', label: 'Khu liên hợp', count: compCount });

    return stats;
  }, [overLimitMap, enterprises, farms, plots, landParcels, complexes]);

  // Auto switch to the exact tab containing yellow over-limit items when accessed with ?status=OVER_LIMIT
  useEffect(() => {
    if (searchParams.get('status') === 'OVER_LIMIT') {
      const currentTabHasOverLimit =
        (activeTab === 'khu-lien-hop' && complexes.some((c) => overLimitMap.get(c.id)?.isOverLimit)) ||
        (activeTab === 'xi-nghiep' && enterprises.some((e) => overLimitMap.get(e.id)?.isOverLimit)) ||
        (activeTab === 'nong-truong' && farms.some((f) => overLimitMap.get(f.id)?.isOverLimit)) ||
        (activeTab === 'danh-muc-lo' && plots.some((p) => overLimitMap.get(p.id)?.isOverLimit)) ||
        (activeTab === 'danh-muc-thua' && landParcels.some((p) => overLimitMap.get(p.id)?.isOverLimit));

      if (!currentTabHasOverLimit && tabOverLimitStats.length > 0) {
        setSearchParams({ tab: tabOverLimitStats[0].id, status: 'OVER_LIMIT' });
      }
    }
  }, [searchParams, activeTab, overLimitMap, tabOverLimitStats]);

  // Modals state
  const [itemToDelete, setItemToDelete] = useState<{ id: any; name: string; code: string; type: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [selectedChildInfo, setSelectedChildInfo] = useState<string>('');

  // Form Fields
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    field: '',
    businessLicense: '',
    charterCapital: '',
    parentCode: '',
    parentName: '',
    managerName: '',
    phone: '',
    areaHa: '',
    description: '',
    regionCode: '',
    regionName: '',
    status: 'HOAT_DONG',
  });

  const tabs = [
    { id: 'cong-ty', label: 'Công ty', icon: Building2 },
    { id: 'khu-lien-hop', label: 'Khu liên hợp', icon: MapPin },
    { id: 'phong-ban', label: 'Phòng ban', icon: Briefcase },
    { id: 'xi-nghiep', label: 'Xí nghiệp / Khu vực', icon: Layers },
    { id: 'nong-truong', label: 'Nông trường', icon: Trees },
    { id: 'danh-muc-lo', label: 'Danh mục lô', icon: Grid },
    { id: 'danh-muc-thua', label: 'Danh mục thửa', icon: MapPin },
    { id: 'doi', label: 'Đội', icon: Users2 },
  ];

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setEditingItem(null);
    setSelectedChildInfo('');
    let defaultParent = '';
    if (activeTab === 'xi-nghiep') {
      defaultParent = filterForm.complexName || appliedFilter.parentName || '';
    } else if (activeTab === 'nong-truong') {
      defaultParent = filterForm.enterpriseName || appliedFilter.parentName || '';
    } else if (activeTab === 'doi' || activeTab === 'danh-muc-lo') {
      defaultParent = filterForm.farmName || appliedFilter.parentName || '';
    } else if (activeTab === 'danh-muc-thua') {
      defaultParent = filterForm.plotName || appliedFilter.parentName || '';
    }

    setFormData({
      code: '',
      name: '',
      address: '',
      field: 'Nông nghiệp & Chăn nuôi công nghệ cao',
      businessLicense: '',
      charterCapital: '',
      parentCode: '',
      parentName: defaultParent,
      managerName: '',
      phone: '',
      areaHa: '',
      description: '',
      regionCode: '',
      regionName: '',
      status: 'HOAT_DONG',
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: any) => {
    setFormMode('EDIT');
    setEditingItem(item);
    setSelectedChildInfo('');

    let itemName = item.name || '';
    let itemManager = item.managerName || '';
    if (itemName.includes('?') || !itemName) {
      if (item.code === 'KOUN_MOM') {
        itemName = 'Khu liên hợp Koun Mom';
        itemManager = itemManager.includes('?') ? 'Ban Quản lý KLH Koun Mom' : itemManager;
      } else if (item.code === 'SNOUL') {
        itemName = 'Khu liên hợp Snoul';
        itemManager = itemManager.includes('?') ? 'Ban Quản lý KLH Snoul' : itemManager;
      } else if (item.code === 'NAM_LAO') {
        itemName = 'Khu liên hợp Nam Lào';
        itemManager = itemManager.includes('?') ? 'Ban Quản lý KLH Nam Lào' : itemManager;
      }
    }

    let initialArea = item.areaHa !== undefined && item.areaHa !== null ? String(item.areaHa) : '';
    if (activeTab === 'khu-lien-hop' && (!initialArea || initialArea === '0')) {
      const childEnts = enterprises.filter(
        (e) =>
          e.parentCode === item.code ||
          e.parentName === item.name ||
          (item.code === 'KOUN_MOM' && (e.parentCode === 'KM' || e.parentCode === 'KOUN_MOM')) ||
          (item.code === 'SNOUL' && e.parentCode === 'SNOUL') ||
          (item.code === 'NAM_LAO' && e.parentCode === 'NAM_LAO')
      );
      const totalArea = childEnts.reduce((sum, e) => sum + (e.areaHa || 0), 0);
      if (totalArea > 0) {
        initialArea = String(totalArea);
      } else if (item.code === 'KOUN_MOM') {
        initialArea = '16340';
      } else if (item.code === 'SNOUL') {
        initialArea = '12770';
      } else if (item.code === 'NAM_LAO') {
        initialArea = '8150';
      }
    }

    let matchedRegionCode = '';
    let matchedRegionName = '';
    if (activeTab === 'xi-nghiep') {
      matchedRegionCode = item.description || (item.code && item.code.length <= 4 ? item.code : '');
      const foundReg = regions.find((r) => r.code === matchedRegionCode);
      if (foundReg) {
        matchedRegionName = foundReg.name;
      } else if (matchedRegionCode) {
        matchedRegionName = `Khu vực ${matchedRegionCode}`;
      }
    }

    setFormData({
      code: item.code || '',
      name: itemName,
      address: item.address || '',
      field: item.field || '',
      businessLicense: item.businessLicense || '',
      charterCapital: item.charterCapital || '',
      parentCode: item.parentCode || '',
      parentName: item.parentName || '',
      managerName: itemManager,
      phone: item.phone || '',
      areaHa: initialArea,
      description: item.description || '',
      regionCode: matchedRegionCode,
      regionName: matchedRegionName,
      status: item.status || 'HOAT_DONG',
    });
    setIsFormModalOpen(true);
  };

  // Hierarchy Area Capacity & Sibling Validation (KLH > Xí nghiệp > Nông trường > Lô > Thửa)
  const getParentAreaValidation = () => {
    if (!formData.areaHa || parseFloat(formData.areaHa) <= 0) return null;
    const inputArea = parseFloat(formData.areaHa);
    if (!formData.parentName) return null;

    if (activeTab === 'danh-muc-thua') {
      // Parent is Plot (Lô)
      const parentPlot = plots.find((p) => p.name === formData.parentName || p.code === formData.parentCode);
      const parentArea = parentPlot?.areaHa || 0;

      const siblings = landParcels.filter(
        (p) =>
          (p.parentName === formData.parentName || (parentPlot && p.parentCode === parentPlot.code)) &&
          (!editingItem || p.id !== editingItem.id)
      );
      const siblingsArea = Math.round(siblings.reduce((sum, s) => sum + (s.areaHa || 0), 0) * 10000) / 10000;
      const totalAreaAfter = Math.round((siblingsArea + inputArea) * 10000) / 10000;
      const isSingleExceeded = parentArea > 0 && inputArea - parentArea > 0.001;
      const isTotalExceeded = parentArea > 0 && totalAreaAfter - parentArea > 0.001;

      return {
        parentType: 'Lô',
        parentName: formData.parentName || parentPlot?.name || '',
        parentArea,
        siblingsArea,
        inputArea,
        totalAreaAfter,
        remainingArea: Math.max(0, parentArea - siblingsArea),
        isSingleExceeded,
        isTotalExceeded,
        isWarning: isSingleExceeded || isTotalExceeded,
        warningMessage: isSingleExceeded
          ? `Diện tích Thửa (${inputArea} ha) đang lớn hơn diện tích toàn bộ Lô cha "${formData.parentName}" (${parentArea} ha)!`
          : isTotalExceeded
            ? `Tổng diện tích các Thửa (${totalAreaAfter.toFixed(1)} ha) đang vượt quá diện tích Lô cha "${formData.parentName}" (${parentArea} ha)! Vượt ${(totalAreaAfter - parentArea).toFixed(1)} ha.`
            : null,
      };
    }

    if (activeTab === 'danh-muc-lo') {
      // Parent is Farm (Nông trường)
      const parentFarm = farms.find((f) => f.name === formData.parentName || f.code === formData.parentCode);
      const parentArea = parentFarm?.areaHa || 0;
      const siblings = plots.filter(
        (p) =>
          (p.parentName === formData.parentName || (parentFarm && p.parentCode === parentFarm.code)) &&
          (!editingItem || p.id !== editingItem.id)
      );
      const siblingsArea = Math.round(siblings.reduce((sum, s) => sum + (s.areaHa || 0), 0) * 10000) / 10000;
      const totalAreaAfter = Math.round((siblingsArea + inputArea) * 10000) / 10000;
      const isSingleExceeded = parentArea > 0 && inputArea - parentArea > 0.001;
      const isTotalExceeded = parentArea > 0 && totalAreaAfter - parentArea > 0.001;

      return {
        parentType: 'Nông trường',
        parentName: formData.parentName || parentFarm?.name || '',
        parentArea,
        siblingsArea,
        inputArea,
        totalAreaAfter,
        remainingArea: Math.max(0, parentArea - siblingsArea),
        isSingleExceeded,
        isTotalExceeded,
        isWarning: isSingleExceeded || isTotalExceeded,
        warningMessage: isSingleExceeded
          ? `Diện tích Lô (${inputArea} ha) đang lớn hơn diện tích Nông trường "${formData.parentName}" (${parentArea} ha)!`
          : isTotalExceeded
            ? `Tổng diện tích các Lô (${totalAreaAfter.toFixed(1)} ha) đang vượt quá diện tích Nông trường "${formData.parentName}" (${parentArea} ha)!`
            : null,
      };
    }

    if (activeTab === 'nong-truong') {
      // Parent is Enterprise (Xí nghiệp)
      const parentEnt = enterprises.find((e) => e.name === formData.parentName || e.code === formData.parentCode);
      const parentArea = parentEnt?.areaHa || 0;
      const siblings = farms.filter(
        (f) =>
          (f.parentName === formData.parentName || (parentEnt && f.parentCode === parentEnt.code)) &&
          (!editingItem || f.id !== editingItem.id)
      );
      const siblingsArea = Math.round(siblings.reduce((sum, s) => sum + (s.areaHa || 0), 0) * 10000) / 10000;
      const totalAreaAfter = Math.round((siblingsArea + inputArea) * 10000) / 10000;
      const isSingleExceeded = parentArea > 0 && inputArea - parentArea > 0.001;
      const isTotalExceeded = parentArea > 0 && totalAreaAfter - parentArea > 0.001;

      return {
        parentType: 'Xí nghiệp',
        parentName: formData.parentName || parentEnt?.name || '',
        parentArea,
        siblingsArea,
        inputArea,
        totalAreaAfter,
        remainingArea: Math.max(0, parentArea - siblingsArea),
        isSingleExceeded,
        isTotalExceeded,
        isWarning: isSingleExceeded || isTotalExceeded,
        warningMessage: isSingleExceeded
          ? `Diện tích Nông trường (${inputArea} ha) đang lớn hơn diện tích Xí nghiệp "${formData.parentName}" (${parentArea} ha)!`
          : isTotalExceeded
            ? `Tổng diện tích các Nông trường (${totalAreaAfter.toFixed(1)} ha) đang vượt quá diện tích Xí nghiệp "${formData.parentName}" (${parentArea} ha)!`
            : null,
      };
    }

    if (activeTab === 'xi-nghiep') {
      if (!formData.parentName) return null;
      // Parent is Complex (Khu liên hợp)
      const parentComp = complexes.find((c) => c.name === formData.parentName || c.code === formData.parentCode);
      const parentArea = parentComp?.areaHa || 0;
      const siblings = enterprises.filter(
        (e) =>
          (e.parentName === formData.parentName || (parentComp && e.parentCode === parentComp.code)) &&
          (!editingItem || e.id !== editingItem.id)
      );
      const siblingsArea = Math.round(siblings.reduce((sum, s) => sum + (s.areaHa || 0), 0) * 10000) / 10000;
      const totalAreaAfter = Math.round((siblingsArea + inputArea) * 10000) / 10000;
      const isSingleExceeded = parentArea > 0 && inputArea - parentArea > 0.001;
      const isTotalExceeded = parentArea > 0 && totalAreaAfter - parentArea > 0.001;

      return {
        parentType: 'Khu liên hợp',
        parentName: formData.parentName || parentComp?.name || '',
        parentArea,
        siblingsArea,
        inputArea,
        totalAreaAfter,
        remainingArea: Math.max(0, parentArea - siblingsArea),
        isSingleExceeded,
        isTotalExceeded,
        isWarning: isSingleExceeded || isTotalExceeded,
        warningMessage: isSingleExceeded
          ? `Diện tích Xí nghiệp (${inputArea} ha) đang lớn hơn diện tích Khu liên hợp "${formData.parentName}" (${parentArea} ha)!`
          : isTotalExceeded
            ? `Tổng diện tích các Xí nghiệp (${totalAreaAfter.toFixed(1)} ha) đang vượt quá diện tích Khu liên hợp "${formData.parentName}" (${parentArea} ha)!`
            : null,
      };
    }

    return null;
  };

  // Child Hierarchy information for Khu liên hợp -> Xí nghiệp -> Nông trường -> Lô -> Thửa
  // ONLY displayed when EDITING an existing item (Never on CREATE)
  const getChildHierarchyInfo = () => {
    if (formMode !== 'EDIT' || !editingItem) {
      return null;
    }
    if (activeTab !== 'khu-lien-hop' && activeTab !== 'xi-nghiep' && activeTab !== 'nong-truong' && activeTab !== 'danh-muc-lo') {
      return null;
    }

    const targetName = (editingItem.name || '').trim();
    const targetCode = (editingItem.code || '').trim();
    if (!targetName && !targetCode) return null;

    if (activeTab === 'khu-lien-hop') {
      const childList = enterprises.filter((e) => {
        if (targetCode && (e.parentCode === targetCode || (targetCode === 'KOUN_MOM' && e.parentCode === 'KM'))) return true;
        if (targetName && (e.parentName === targetName || (targetName.includes('Koun Mom') && e.parentName?.includes('Koun Mom')))) return true;
        if (targetCode === 'KOUN_MOM' && (e.parentName?.includes('Koun Mom') || e.parentCode === 'KOUN_MOM' || e.parentCode === 'KM')) return true;
        if (targetCode === 'SNOUL' && (e.parentName?.includes('Snoul') || e.parentCode === 'SNOUL')) return true;
        if (targetCode === 'NAM_LAO' && (e.parentName?.includes('Nam Lào') || e.parentName?.includes('Lào') || e.parentCode === 'NAM_LAO')) return true;
        return false;
      });
      const totalChildArea = Math.round(childList.reduce((sum, c) => sum + (c.areaHa || 0), 0) * 10000) / 10000;
      return {
        childType: 'Xí nghiệp',
        childTypePlural: 'Xí nghiệp',
        childList,
        totalChildArea,
      };
    }

    if (activeTab === 'xi-nghiep') {
      const childList = farms.filter((f) =>
        (targetCode && f.parentCode && f.parentCode.toLowerCase() === targetCode.toLowerCase()) ||
        (targetName && f.parentName && f.parentName.toLowerCase() === targetName.toLowerCase())
      );
      const totalChildArea = Math.round(childList.reduce((sum, c) => sum + (c.areaHa || 0), 0) * 10000) / 10000;
      return {
        childType: 'Nông trường',
        childTypePlural: 'Nông trường',
        childList,
        totalChildArea,
      };
    }

    if (activeTab === 'nong-truong') {
      const childList = plots.filter((p) =>
        (targetCode && p.parentCode && p.parentCode.toLowerCase() === targetCode.toLowerCase()) ||
        (targetName && p.parentName && p.parentName.toLowerCase() === targetName.toLowerCase())
      );
      const totalChildArea = Math.round(childList.reduce((sum, c) => sum + (c.areaHa || 0), 0) * 10000) / 10000;
      return {
        childType: 'Lô',
        childTypePlural: 'Lô sản xuất',
        childList,
        totalChildArea,
      };
    }

    if (activeTab === 'danh-muc-lo') {
      const childList = landParcels.filter((lp) =>
        (targetCode && lp.parentCode && lp.parentCode.toLowerCase() === targetCode.toLowerCase()) ||
        (targetName && lp.parentName && lp.parentName.toLowerCase() === targetName.toLowerCase())
      );
      const totalChildArea = Math.round(childList.reduce((sum, c) => sum + (c.areaHa || 0), 0) * 10000) / 10000;
      return {
        childType: 'Thửa',
        childTypePlural: 'Thửa đất',
        childList,
        totalChildArea,
      };
    }

    return null;
  };

  // Save Form (Create / Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const currentDate = new Date().toLocaleDateString('vi-VN');
    const currentTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'danh mục';

    if (!formData.code || !formData.name) {
      alert('Vui lòng nhập Mã và Tên hiển thị!');
      return;
    }

    const areaVal = getParentAreaValidation();

    if (activeTab === 'cong-ty') {
      if (formMode === 'CREATE') {
        const newItem: CompanyEntity = {
          id: Date.now(),
          code: formData.code.toUpperCase(),
          name: formData.name,
          address: formData.address,
          field: formData.field,
          businessLicense: formData.businessLicense,
          charterCapital: formData.charterCapital,
          createdAt: currentDate,
        };
        catalogsApi.saveCompany(newItem, companies).then((next) => setCompanies(next));
        alert(`Đã thêm mới Công ty "${formData.name}" (${formData.code}) thành công!`);
      } else {
        const nextList = companies.map((c) =>
          c.id === editingItem.id
            ? {
              ...c,
              code: formData.code.toUpperCase(),
              name: formData.name,
              address: formData.address,
              field: formData.field,
              businessLicense: formData.businessLicense,
              charterCapital: formData.charterCapital,
            }
            : c
        );
        const updatedItem = nextList.find((c) => c.id === editingItem.id);
        if (updatedItem) {
          catalogsApi.saveCompany(updatedItem, companies).then((next) => setCompanies(next));
        } else {
          setCompanies(nextList);
          setStoredData('catalogs_companies', nextList);
        }
        alert(`Đã cập nhật thông tin Công ty "${formData.name}" thành công!`);
      }
    } else {
      // For catalog items (complexes, departments, enterprises, farms, teams, plots, landParcels, positions, regions)
      const catalogTypeMap: Record<string, { type: 'COMPLEX' | 'REGION' | 'DEPARTMENT' | 'ENTERPRISE' | 'FARM' | 'TEAM' | 'PLOT' | 'LAND_PARCEL' | 'POSITION'; key: string; list: CatalogItem[]; setter: React.Dispatch<React.SetStateAction<CatalogItem[]>> }> = {
        'khu-lien-hop': { type: 'COMPLEX', key: 'catalogs_complexes', list: complexes, setter: setComplexes },
        'khu-vuc': { type: 'REGION', key: 'catalogs_regions', list: regions, setter: setRegions },
        'phong-ban': { type: 'DEPARTMENT', key: 'catalogs_departments', list: departments, setter: setDepartments },
        'xi-nghiep': { type: 'ENTERPRISE', key: 'catalogs_enterprises', list: enterprises, setter: setEnterprises },
        'nong-truong': { type: 'FARM', key: 'catalogs_farms', list: farms, setter: setFarms },
        doi: { type: 'TEAM', key: 'catalogs_teams', list: teams, setter: setTeams },
        'danh-muc-lo': { type: 'PLOT', key: 'catalogs_plots', list: plots, setter: setPlots },
        'danh-muc-thua': { type: 'LAND_PARCEL', key: 'catalogs_land_parcels', list: landParcels, setter: setLandParcels },
        'chuc-danh': { type: 'POSITION', key: 'catalogs_positions', list: positions, setter: setPositions },
      };

      const target = catalogTypeMap[activeTab] || catalogTypeMap['khu-lien-hop'];

      let resolvedParentCode = formData.parentCode || '';
      let resolvedParentName = formData.parentName || '';
      if (activeTab === 'xi-nghiep') {
        const comp = complexes.find(
          (c) => c.name === formData.parentName || c.code === formData.parentName || c.code === formData.parentCode
        );
        if (comp) {
          resolvedParentCode = comp.code;
          resolvedParentName = comp.name;
        }
      }

      if (formMode === 'CREATE') {
        const newItem: CatalogItem = {
          id: `CAT-${Date.now()}`,
          code: formData.code.toUpperCase(),
          name: formData.name,
          address: formData.address,
          type: target.type,
          parentCode: resolvedParentCode || formData.parentCode,
          parentName: resolvedParentName || formData.parentName,
          managerName: formData.managerName,
          phone: formData.phone,
          areaHa: formData.areaHa ? Number(formData.areaHa) : undefined,
          status: (formData.status as any) || 'HOAT_DONG',
          description: formData.regionCode || formData.description,
          createdAt: currentDate,
          createdDate: new Date().toISOString().slice(0, 10),
          createdUser: 'admin',
        };
        catalogsApi.saveCatalogItem(newItem, target.key, target.list).then((next) => target.setter(next));

        // If Region info provided for Enterprise, sync REGION catalog item to database
        if (activeTab === 'xi-nghiep' && formData.regionCode) {
          const rCode = formData.regionCode.toUpperCase();
          const rName = formData.regionName?.trim() || `Khu vực ${formData.name} (${rCode})`;
          const regionItem: CatalogItem = {
            id: `KV_${rCode}`,
            code: rCode,
            name: rName,
            type: 'REGION',
            parentCode: resolvedParentCode || formData.parentCode,
            parentName: resolvedParentName || formData.parentName,
            status: 'HOAT_DONG',
            createdDate: new Date().toISOString().slice(0, 10),
            createdUser: 'admin',
          };
          catalogsApi.saveCatalogItem(regionItem, 'catalogs_regions', regions).then((next) => setRegions(next));
        }

        if (areaVal && areaVal.isWarning) {
          alert(
            `⚠️ CẢNH BÁO QUÁ HẠN MỨC DIỆN TÍCH:\n${areaVal.warningMessage}\n\n👉 Dữ liệu đã được lưu vào hệ thống và hiển thị cảnh báo màu vàng trên bảng để tiện theo dõi.`
          );
        } else {
          alert(`✅ Đã thêm mới ${currentTabLabel} "${newItem.name}" (${newItem.code}) vào cơ sở dữ liệu thành công!`);
        }
      } else {
        const updatedItem: CatalogItem = {
          ...editingItem,
          code: formData.code.toUpperCase(),
          name: formData.name,
          address: formData.address,
          parentCode: resolvedParentCode || formData.parentCode || editingItem.parentCode,
          parentName: resolvedParentName || formData.parentName || editingItem.parentName,
          managerName: formData.managerName,
          phone: formData.phone,
          areaHa: formData.areaHa ? Number(formData.areaHa) : undefined,
          status: (formData.status as any) || editingItem.status || 'HOAT_DONG',
          description: formData.regionCode || formData.description,
          updatedDate: new Date().toISOString().slice(0, 10),
          updatedUser: 'admin',
        };
        catalogsApi.saveCatalogItem(updatedItem, target.key, target.list).then((next) => target.setter(next));

        // If Region info provided for Enterprise, sync REGION catalog item to database
        if (activeTab === 'xi-nghiep' && formData.regionCode) {
          const rCode = formData.regionCode.toUpperCase();
          const rName = formData.regionName?.trim() || `Khu vực ${formData.name} (${rCode})`;
          const regionItem: CatalogItem = {
            id: `KV_${rCode}`,
            code: rCode,
            name: rName,
            type: 'REGION',
            parentCode: resolvedParentCode || formData.parentCode || editingItem.parentCode,
            parentName: resolvedParentName || formData.parentName || editingItem.parentName,
            status: 'HOAT_DONG',
            createdDate: new Date().toISOString().slice(0, 10),
            createdUser: 'admin',
          };
          catalogsApi.saveCatalogItem(regionItem, 'catalogs_regions', regions).then((next) => setRegions(next));
        }

        if (areaVal && areaVal.isWarning) {
          alert(
            `⚠️ CẢNH BÁO QUÁ HẠN MỨC DIỆN TÍCH:\n${areaVal.warningMessage}\n\n👉 Dữ liệu đã được lưu vào hệ thống và hiển thị cảnh báo màu vàng trên bảng để tiện theo dõi.`
          );
        } else {
          alert(`✅ Đã lưu cập nhật ${currentTabLabel} "${formData.name}" vào cơ sở dữ liệu thành công!`);
        }
      }
    }

    setSearchKeyword('');
    setIsFormModalOpen(false);
  };

  // Trigger Delete Confirmation Modal
  const confirmDelete = (id: any, name: string, code: string, type: string) => {
    setItemToDelete({ id, name, code, type });
    setIsDeleteModalOpen(true);
  };

  // Perform Delete Action after confirmation
  const handleExecuteDelete = () => {
    if (!itemToDelete) return;
    if (activeTab === 'cong-ty') {
      catalogsApi.deleteCompany(Number(itemToDelete.id), companies).then((next) => setCompanies(next));
    } else {
      const catalogTypeMap: Record<string, { key: string; list: CatalogItem[]; setter: React.Dispatch<React.SetStateAction<CatalogItem[]>> }> = {
        'khu-lien-hop': { key: 'catalogs_complexes', list: complexes, setter: setComplexes },
        'khu-vuc': { key: 'catalogs_regions', list: regions, setter: setRegions },
        'phong-ban': { key: 'catalogs_departments', list: departments, setter: setDepartments },
        'xi-nghiep': { key: 'catalogs_enterprises', list: enterprises, setter: setEnterprises },
        'nong-truong': { key: 'catalogs_farms', list: farms, setter: setFarms },
        doi: { key: 'catalogs_teams', list: teams, setter: setTeams },
        'danh-muc-lo': { key: 'catalogs_plots', list: plots, setter: setPlots },
        'danh-muc-thua': { key: 'catalogs_land_parcels', list: landParcels, setter: setLandParcels },
        'chuc-danh': { key: 'catalogs_positions', list: positions, setter: setPositions },
      };
      const target = catalogTypeMap[activeTab];
      if (target) {
        catalogsApi.deleteCatalogItem(itemToDelete.id, target.key, target.list).then((next) => target.setter(next));
      }
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  // Area Mismatch Monitors (Farm -> Enterprise and Enterprise -> Complex)
  // Area Over-Limit Monitors (Child total > Parent Area is INVALID and triggers warning)
  const enterpriseAreaMismatches = useMemo(() => {
    return enterprises
      .map((e) => {
        const childFarms = farms.filter((f) => {
          if (f.parentCode && e.code && f.parentCode.toLowerCase() === e.code.toLowerCase()) return true;
          if (f.parentName && e.name && f.parentName.toLowerCase() === e.name.toLowerCase()) return true;
          if (f.parentName && e.code && f.parentName.toLowerCase().includes(e.code.toLowerCase())) return true;
          if (f.parentName && e.name && (f.parentName.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(f.parentName.toLowerCase()))) return true;
          return false;
        });
        if (childFarms.length === 0) return null;
        const totalFarmArea = Math.round(childFarms.reduce((sum, f) => sum + (f.areaHa || 0), 0) * 1000) / 1000;
        const entArea = e.areaHa || 0;
        const diff = Math.round((totalFarmArea - entArea) * 1000) / 1000;
        // Xí nghiệp lớn hơn hoặc bằng Nông trường con là ĐÚNG (Hợp lệ).
        // Chỉ cảnh báo khi Tổng Nông trường con VƯỢT QUÁ diện tích Xí nghiệp (diff > 0.05).
        const isOverLimit = diff > 0.05;
        return {
          enterprise: e,
          farmCount: childFarms.length,
          totalFarmArea,
          entArea,
          diff,
          isMismatch: isOverLimit,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null && m.isMismatch);
  }, [enterprises, farms]);

  const complexAreaMismatches = useMemo(() => {
    return complexes
      .map((c) => {
        const childEnts = enterprises.filter((e) => {
          if (e.parentCode && (e.parentCode === c.code || (c.code === 'KOUN_MOM' && e.parentCode === 'KM'))) return true;
          if (e.parentName && (e.parentName === c.name || e.parentName.includes(c.name) || (c.name.includes('Koun Mom') && e.parentName.includes('Koun Mom')))) return true;
          return false;
        });
        if (childEnts.length === 0) return null;
        const totalEntArea = Math.round(childEnts.reduce((sum, e) => sum + (e.areaHa || 0), 0) * 1000) / 1000;
        const compArea = c.areaHa || 0;
        const diff = Math.round((totalEntArea - compArea) * 1000) / 1000;
        // Khu liên hợp lớn hơn hoặc bằng các Xí nghiệp con là ĐÚNG.
        // Chỉ cảnh báo khi Tổng Xí nghiệp con VƯỢT QUÁ diện tích Khu liên hợp (diff > 0.05).
        const isOverLimit = diff > 0.05;
        return {
          complex: c,
          entCount: childEnts.length,
          totalEntArea,
          compArea,
          diff,
          isMismatch: isOverLimit,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null && m.isMismatch);
  }, [complexes, enterprises]);

  const totalAreaMismatchesCount = enterpriseAreaMismatches.length + complexAreaMismatches.length;

  // Quick align single enterprise area with its child farms
  const handleQuickAlignEnterpriseArea = async (ent: CatalogItem, targetArea: number) => {
    const updated = { ...ent, areaHa: targetArea };
    const nextList = enterprises.map((item) => (item.id === ent.id ? updated : item));
    setEnterprises(nextList);
    setStoredData('catalogs_enterprises', nextList);
    await catalogsApi.saveCatalogItem(updated, 'catalogs_enterprises', nextList);

    // Also update complex total if needed
    const comp = complexes.find(
      (c) => c.code === ent.parentCode || c.name === ent.parentName || (ent.parentName && ent.parentName.includes(c.name))
    );
    if (comp) {
      const childEnts = nextList.filter(
        (e) => e.parentCode === comp.code || e.parentName === comp.name || (e.parentName && e.parentName.includes(comp.name))
      );
      const totalCompArea = Math.round(childEnts.reduce((sum, e) => sum + (e.areaHa || 0), 0) * 1000) / 1000;
      if (totalCompArea > (comp.areaHa || 0)) {
        const updatedComp = { ...comp, areaHa: totalCompArea };
        const nextCompList = complexes.map((c) => (c.id === comp.id ? updatedComp : c));
        setComplexes(nextCompList);
        setStoredData('catalogs_complexes', nextCompList);
        await catalogsApi.saveCatalogItem(updatedComp, 'catalogs_complexes', nextCompList);
      }
    }
    alert(`✅ Đã điều chỉnh diện tích Xí nghiệp "${ent.name}" thành ${targetArea.toLocaleString('vi-VN')} ha (bằng tổng Nông trường con)!`);
  };

  // Quick align single complex area with its child enterprises
  const handleQuickAlignComplexArea = async (comp: CatalogItem, targetArea: number) => {
    const updatedComp = { ...comp, areaHa: targetArea };
    const nextCompList = complexes.map((c) => (c.id === comp.id ? updatedComp : c));
    setComplexes(nextCompList);
    setStoredData('catalogs_complexes', nextCompList);
    await catalogsApi.saveCatalogItem(updatedComp, 'catalogs_complexes', nextCompList);
    alert(`✅ Đã mở rộng diện tích Khu liên hợp "${comp.name}" thành ${targetArea.toLocaleString('vi-VN')} ha!`);
  };

  // Automated Bottom-up Hierarchy Alignment (Farm -> Enterprise -> Complex)
  const handleAlignAllHierarchyAreas = async () => {
    // 1. Align Enterprise areas if sum of child farms exceeds enterprise area
    const nextEnterprises = enterprises.map((e) => {
      const childFarms = farms.filter((f) => {
        if (f.parentCode && e.code && f.parentCode.toLowerCase() === e.code.toLowerCase()) return true;
        if (f.parentName && e.name && f.parentName.toLowerCase() === e.name.toLowerCase()) return true;
        if (f.parentName && e.code && f.parentName.toLowerCase().includes(e.code.toLowerCase())) return true;
        if (f.parentName && e.name && (f.parentName.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(f.parentName.toLowerCase()))) return true;
        return false;
      });
      if (childFarms.length > 0) {
        const totalFarmArea = Math.round(childFarms.reduce((sum, f) => sum + (f.areaHa || 0), 0) * 1000) / 1000;
        if (totalFarmArea > (e.areaHa || 0)) {
          return { ...e, areaHa: totalFarmArea };
        }
      }
      return e;
    });

    // 2. Align Complex areas if sum of child enterprises exceeds complex area
    const nextComplexes = complexes.map((c) => {
      const childEnts = nextEnterprises.filter((e) => {
        if (e.parentCode && (e.parentCode === c.code || (c.code === 'KOUN_MOM' && e.parentCode === 'KM'))) return true;
        if (e.parentName && (e.parentName === c.name || e.parentName.includes(c.name) || (c.name.includes('Koun Mom') && e.parentName.includes('Koun Mom')))) return true;
        return false;
      });
      if (childEnts.length > 0) {
        const totalEntArea = Math.round(childEnts.reduce((sum, e) => sum + (e.areaHa || 0), 0) * 1000) / 1000;
        if (totalEntArea > (c.areaHa || 0)) {
          return { ...c, areaHa: totalEntArea };
        }
      }
      return c;
    });

    setEnterprises(nextEnterprises);
    setStoredData('catalogs_enterprises', nextEnterprises);
    setComplexes(nextComplexes);
    setStoredData('catalogs_complexes', nextComplexes);

    // Save to API
    for (const e of nextEnterprises) {
      catalogsApi.saveCatalogItem(e, 'catalogs_enterprises', nextEnterprises).catch(() => {});
    }
    for (const c of nextComplexes) {
      catalogsApi.saveCatalogItem(c, 'catalogs_complexes', nextComplexes).catch(() => {});
    }

    alert('✅ Đã điều chỉnh mở rộng diện tích Xí nghiệp và Khu liên hợp để bảo đảm không bị Nông trường con vượt quá hạn mức!');
  };

  return (
    <div className="space-y-4 pb-12">

      {/* Area Hierarchy Over-Limit Warning Banner */}
      {totalAreaMismatchesCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-3 rounded-lg border-2 border-amber-600 shadow-md flex items-center justify-between flex-wrap gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-600/30 rounded-full shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-slate-950" />
            </span>
            <div>
              <div className="font-black text-xs uppercase tracking-wider text-slate-950 flex items-center gap-2 flex-wrap">
                <span>⚠️ CẢNH BÁO VƯỢT HẠN MỨC: PHÁT HIỆN {totalAreaMismatchesCount} ĐƠN VỊ CÓ TỔNG CON VƯỢT QUÁ DIỆN TÍCH CHA</span>
                <span className="px-2 py-0.5 bg-red-700 text-white rounded text-[10px] font-bold">VƯỢT HẠN MỨC</span>
              </div>
              <div className="text-[11px] text-slate-900 font-medium mt-0.5">
                {enterpriseAreaMismatches.length > 0 && (
                  <span>
                    • <b>{enterpriseAreaMismatches.length} Xí nghiệp</b> có tổng diện tích Nông trường con vượt quá hạn mức Xí nghiệp (VD: <b>{enterpriseAreaMismatches[0].enterprise.code} - {enterpriseAreaMismatches[0].enterprise.name}</b> có {enterpriseAreaMismatches[0].entArea} ha nhưng tổng NT con là {enterpriseAreaMismatches[0].totalFarmArea} ha).{' '}
                  </span>
                )}
                {complexAreaMismatches.length > 0 && (
                  <span>
                    • <b>{complexAreaMismatches.length} Khu liên hợp</b> bị các Xí nghiệp con vượt quá diện tích quy mô.
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAlignAllHierarchyAreas}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
              title="Cập nhật diện tích Xí nghiệp và Khu liên hợp bằng tổng các đơn vị con vượt quá"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Tăng Ha đơn vị cha bằng tổng con</span>
            </button>
          </div>
        </div>
      )}

      {/* Sticky 10-Minute Recurring Warning Banner for Over-Limit violations */}
      {totalOverLimitCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-3 rounded-lg border-2 border-amber-600 shadow-md flex items-center justify-between flex-wrap gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <span className="p-1.5 bg-amber-600/30 rounded-full shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-slate-950" />
            </span>
            <div>
              <div className="font-black text-xs uppercase tracking-wider text-slate-950 flex items-center gap-2 flex-wrap">
                <span>⚠️ THÔNG BÁO ĐỊNH KỲ (10 PHÚT/LẦN): PHÁT HIỆN {totalOverLimitCount} MỤC VƯỢT HẠN MỨC DIỆN TÍCH</span>
                <span className="px-2 py-0.5 bg-red-700 text-white rounded text-[10px] font-bold">CHƯA LƯU DATABASE</span>
              </div>
              <div className="text-[11px] text-slate-900 font-medium mt-0.5">
                Các mục vượt hạn mức được đánh dấu màu vàng trên giao diện để theo dõi tạm thời. <span className="font-bold underline">Hệ thống chỉ lưu vào Database khi số liệu được hiệu chỉnh hợp lệ</span> theo đúng quy chuẩn phân cấp.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {tabOverLimitStats.map((stat) => (
              <button
                key={stat.id}
                onClick={() => {
                  setSearchParams({ tab: stat.id, status: 'OVER_LIMIT' });
                  setFilterStatus('OVER_LIMIT');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1.5 transition-all hover:scale-105 ${activeTab === stat.id
                  ? 'bg-red-700 text-white ring-2 ring-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Sửa {stat.label} ({stat.count} mục)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal Tab Navigation Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-1.5 flex items-center gap-1.5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const errorStat = tabOverLimitStats.find((s) => s.id === tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => {
                setSearchParams({ tab: tab.id });
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap relative ${isActive
                ? 'bg-emerald-700 text-white shadow-xs'
                : errorStat
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : errorStat ? 'text-amber-700' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {errorStat && (
                <span
                  title={`${errorStat.count} mục quá hạn mức diện tích`}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${isActive
                    ? 'bg-amber-300 text-slate-950 ring-1 ring-white'
                    : 'bg-red-600 text-white'
                    }`}
                >
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                  {errorStat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TIÊU CHÍ TÌM KIẾM (SEARCH CRITERIA PANEL - CASCADING FILTER)              */}
      {/* ========================================================================= */}
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch();
        }}
        className="bg-white p-3.5 rounded border border-slate-200 shadow-xs space-y-3 font-sans text-xs"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wide">Tiêu chí tìm kiếm</div>
          <span className="text-[11px] text-slate-400 italic">Chọn tiêu chí và bấm "Tìm kiếm" (hoặc nhấn Enter)</span>
        </div>

        {/* 1. Tiêu chí tìm kiếm - Công ty */}
        {activeTab === 'cong-ty' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã công ty</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${companies.length})`}
                emptyOptionLabel={`Tất cả mã (${companies.length})`}
                heightClass="h-9"
                icon={<Building2 className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Địa chỉ</label>
              <SearchableSelect
                value={filterForm.address}
                onChange={(value) => setFilterForm({ ...filterForm, address: value })}
                options={addressFilterOptions}
                placeholder="Tất cả địa chỉ"
                emptyOptionLabel="Tất cả địa chỉ"
                heightClass="h-9"
                icon={<MapPin className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Điện thoại</label>
              <SearchableSelect
                value={filterForm.phone}
                onChange={(value) => setFilterForm({ ...filterForm, phone: value })}
                options={phoneFilterOptions}
                placeholder="Tất cả điện thoại"
                emptyOptionLabel="Tất cả điện thoại"
                heightClass="h-9"
                icon={<Phone className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Fax</label>
              <SearchableSelect
                value={filterForm.fax}
                onChange={(value) => setFilterForm({ ...filterForm, fax: value })}
                options={faxFilterOptions}
                placeholder="Tất cả fax"
                emptyOptionLabel="Tất cả fax"
                heightClass="h-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val || 'ALL' })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* 2. Tiêu chí tìm kiếm - Khu liên hợp */}
        {activeTab === 'khu-lien-hop' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã khu liên hợp</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${complexes.length})`}
                emptyOptionLabel={`Tất cả mã (${complexes.length})`}
                heightClass="h-9"
                icon={<Landmark className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên khu liên hợp</label>
              <SearchableSelect
                value={filterForm.name}
                onChange={handleNameFilterChange}
                options={nameFilterOptions}
                placeholder={`Tất cả khu liên hợp (${complexes.length})`}
                emptyOptionLabel={`Tất cả khu liên hợp (${complexes.length})`}
                heightClass="h-9"
                icon={<Landmark className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Xí nghiệp</label>
              <SearchableSelect
                value={filterForm.enterpriseName || filterForm.parentName}
                onChange={(val) => setFilterForm({ ...filterForm, enterpriseName: val, parentName: val })}
                options={enterpriseOptions}
                placeholder={`Tất cả xí nghiệp (${enterprises.length})`}
                emptyOptionLabel={`Tất cả xí nghiệp (${enterprises.length})`}
                heightClass="h-9"
                icon={<Briefcase className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val || 'ALL' })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* 3. Tiêu chí tìm kiếm - Xí nghiệp (Cấp 1: Khu liên hợp) */}
        {activeTab === 'xi-nghiep' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Khu liên hợp</label>
              <SearchableSelect
                value={filterForm.complexName || filterForm.parentName}
                onChange={(val) => handleComplexFilterChange(val)}
                options={complexOptions}
                placeholder={`Tất cả khu liên hợp (${complexes.length})`}
                emptyOptionLabel={`Tất cả khu liên hợp (${complexes.length})`}
                heightClass="h-9"
                icon={<Landmark className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã xí nghiệp</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${enterprises.length})`}
                emptyOptionLabel={`Tất cả mã (${enterprises.length})`}
                heightClass="h-9"
                icon={<Briefcase className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên xí nghiệp</label>
              <SearchableSelect
                value={filterForm.name}
                onChange={handleNameFilterChange}
                options={nameFilterOptions}
                placeholder={`Tất cả xí nghiệp (${enterprises.length})`}
                emptyOptionLabel={`Tất cả xí nghiệp (${enterprises.length})`}
                heightClass="h-9"
                icon={<Briefcase className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Địa chỉ</label>
              <SearchableSelect
                value={filterForm.address}
                onChange={(value) => setFilterForm({ ...filterForm, address: value })}
                options={addressFilterOptions}
                placeholder="Tất cả địa chỉ"
                emptyOptionLabel="Tất cả địa chỉ"
                heightClass="h-9"
                icon={<MapPin className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val || 'ALL' })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* 4. Tiêu chí tìm kiếm - Nông trường (Cấp 1: Khu liên hợp -> Cấp 2: Xí nghiệp) */}
        {activeTab === 'nong-truong' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Khu liên hợp</label>
              <SearchableSelect
                value={filterForm.complexName}
                onChange={(val) => handleComplexFilterChange(val)}
                options={complexOptions}
                placeholder={`Tất cả khu liên hợp (${complexes.length})`}
                emptyOptionLabel={`Tất cả khu liên hợp (${complexes.length})`}
                heightClass="h-9"
                icon={<Landmark className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Xí nghiệp</label>
              <SearchableSelect
                value={filterForm.enterpriseName || filterForm.parentName}
                onChange={(val) => handleEnterpriseFilterChange(val)}
                options={enterpriseOptions}
                placeholder={`Tất cả xí nghiệp (${enterprises.length})`}
                emptyOptionLabel={`Tất cả xí nghiệp (${enterprises.length})`}
                heightClass="h-9"
                icon={<Briefcase className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã nông trường</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${farms.length})`}
                emptyOptionLabel={`Tất cả mã (${farms.length})`}
                heightClass="h-9"
                icon={<Trees className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên nông trường</label>
              <SearchableSelect
                value={filterForm.name}
                onChange={handleNameFilterChange}
                options={nameFilterOptions}
                placeholder={`Tất cả nông trường (${farms.length})`}
                emptyOptionLabel={`Tất cả nông trường (${farms.length})`}
                heightClass="h-9"
                icon={<Trees className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val || 'ALL' })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* 5. Tiêu chí tìm kiếm - Phòng ban */}
        {activeTab === 'phong-ban' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã phòng ban</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${departments.length})`}
                emptyOptionLabel={`Tất cả mã (${departments.length})`}
                heightClass="h-9"
                icon={<Layers className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên phòng ban</label>
              <SearchableSelect
                value={filterForm.name}
                onChange={handleNameFilterChange}
                options={nameFilterOptions}
                placeholder={`Tất cả phòng ban (${departments.length})`}
                emptyOptionLabel={`Tất cả phòng ban (${departments.length})`}
                heightClass="h-9"
                icon={<Layers className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Đơn vị trực thuộc</label>
              <SearchableSelect
                value={filterForm.parentName}
                onChange={(val) => setFilterForm({ ...filterForm, parentName: val })}
                options={departmentParentOptions}
                placeholder="Tất cả đơn vị"
                emptyOptionLabel="Tất cả đơn vị"
                heightClass="h-9"
                icon={<Building2 className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val || 'ALL' })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* 6. Tiêu chí tìm kiếm - Đội (Đội độc lập, không thuộc nông trường hay xí nghiệp) */}
        {activeTab === 'doi' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã đội</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${teams.length})`}
                emptyOptionLabel={`Tất cả mã (${teams.length})`}
                heightClass="h-9"
                icon={<Users2 className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên đội</label>
              <SearchableSelect
                value={filterForm.name}
                onChange={handleNameFilterChange}
                options={nameFilterOptions}
                placeholder={`Tất cả đội (${teams.length})`}
                emptyOptionLabel={`Tất cả đội (${teams.length})`}
                heightClass="h-9"
                icon={<Users2 className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val || 'ALL' })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* 7. Tiêu chí tìm kiếm - Danh mục lô (Cấp 1: Khu liên hợp -> Cấp 2: Xí nghiệp -> Cấp 3: Nông trường) */}
        {activeTab === 'danh-muc-lo' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Khu liên hợp</label>
              <SearchableSelect
                value={filterForm.complexName}
                onChange={(val) => handleComplexFilterChange(val)}
                options={complexOptions}
                placeholder={`Tất cả khu liên hợp (${complexes.length})`}
                emptyOptionLabel={`Tất cả khu liên hợp (${complexes.length})`}
                heightClass="h-9"
                icon={<Landmark className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Xí nghiệp</label>
              <SearchableSelect
                value={filterForm.enterpriseName}
                onChange={(val) => handleEnterpriseFilterChange(val)}
                options={enterpriseOptions}
                placeholder={`Tất cả xí nghiệp (${enterprises.length})`}
                emptyOptionLabel={`Tất cả xí nghiệp (${enterprises.length})`}
                heightClass="h-9"
                icon={<Briefcase className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Nông trường</label>
              <SearchableSelect
                value={filterForm.parentName || filterForm.farmName}
                onChange={(val) => handleFarmFilterChange(val)}
                options={farmOptions}
                placeholder={`Tất cả nông trường (${farms.length})`}
                emptyOptionLabel={`Tất cả nông trường (${farms.length})`}
                heightClass="h-9"
                icon={<Trees className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã lô</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${plots.length})`}
                emptyOptionLabel={`Tất cả mã (${plots.length})`}
                heightClass="h-9"
                icon={<Grid className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên lô</label>
              <SearchableSelect
                value={filterForm.name}
                onChange={handleNameFilterChange}
                options={nameFilterOptions}
                placeholder={`Tất cả lô (${plots.length})`}
                emptyOptionLabel={`Tất cả lô (${plots.length})`}
                heightClass="h-9"
                icon={<Grid className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* 8. Tiêu chí tìm kiếm - Danh mục thửa (Cấp 1: Khu liên hợp -> Cấp 2: Xí nghiệp -> Cấp 3: Nông trường -> Cấp 4: Lô) */}
        {activeTab === 'danh-muc-thua' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Khu liên hợp</label>
              <SearchableSelect
                value={filterForm.complexName}
                onChange={(val) => handleComplexFilterChange(val)}
                options={complexOptions}
                placeholder={`Tất cả KLH (${complexes.length})`}
                emptyOptionLabel={`Tất cả KLH (${complexes.length})`}
                heightClass="h-9"
                icon={<Landmark className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Xí nghiệp</label>
              <SearchableSelect
                value={filterForm.enterpriseName}
                onChange={(val) => handleEnterpriseFilterChange(val)}
                options={enterpriseOptions}
                placeholder={`Tất cả XN (${enterprises.length})`}
                emptyOptionLabel={`Tất cả XN (${enterprises.length})`}
                heightClass="h-9"
                icon={<Briefcase className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Nông trường</label>
              <SearchableSelect
                value={filterForm.farmName || filterForm.parentName}
                onChange={(val) => handleFarmFilterChange(val)}
                options={farmOptions}
                placeholder={`Tất cả NT (${farms.length})`}
                emptyOptionLabel={`Tất cả NT (${farms.length})`}
                heightClass="h-9"
                icon={<Trees className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Lô</label>
              <SearchableSelect
                value={filterForm.plotName}
                onChange={(val) => handlePlotFilterChange(val)}
                options={plotOptions}
                placeholder={`Tất cả Lô (${plots.length})`}
                emptyOptionLabel={`Tất cả Lô (${plots.length})`}
                heightClass="h-9"
                icon={<Grid className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mã thửa</label>
              <SearchableSelect
                value={filterForm.code}
                onChange={handleCodeFilterChange}
                options={codeFilterOptions}
                placeholder={`Tất cả mã (${landParcels.length})`}
                emptyOptionLabel={`Tất cả mã (${landParcels.length})`}
                heightClass="h-9"
                icon={<Grid className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Tên thửa</label>
              <SearchableSelect
                value={filterForm.name}
                onChange={handleNameFilterChange}
                options={nameFilterOptions}
                placeholder={`Tất cả thửa (${landParcels.length})`}
                emptyOptionLabel={`Tất cả thửa (${landParcels.length})`}
                heightClass="h-9"
                icon={<Grid className="w-3.5 h-3.5" />}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái thửa</label>
              <SearchableSelect
                value={filterForm.plotStatus}
                onChange={(val) => setFilterForm({ ...filterForm, plotStatus: val })}
                options={[
                  { value: 'Đầu tư', label: 'Đầu tư' },
                  { value: 'Thu hoạch', label: 'Thu hoạch' },
                  { value: 'Thanh lý', label: 'Thanh lý' },
                ]}
                placeholder="Tất cả trạng thái thửa"
                emptyOptionLabel="Tất cả trạng thái thửa"
                heightClass="h-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Trạng thái</label>
              <SearchableSelect
                value={filterForm.status}
                onChange={(val) => setFilterForm({ ...filterForm, status: val })}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                emptyOptionLabel="Tất cả trạng thái"
                heightClass="h-9"
              />
            </div>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetFilter}
            className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Nhập lại
          </button>
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-4 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Tìm kiếm
          </button>

          {genericCatalogTabs.includes(activeTab as GenericCatalogTabId) && (
            <>
              <input
                ref={genericCatalogFileInputRef}
                type="file"
                accept=".xls,.xlsx,.xlsm"
                className="hidden"
                onChange={handleUploadGenericCatalog}
              />
              <button
                type="button"
                onClick={handleDownloadActiveTemplate}
                title={`Tải file mẫu ${catalogTabMeta[activeTab as CatalogTabId].label}`}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Download Template
              </button>
              <button
                type="button"
                onClick={() => genericCatalogFileInputRef.current?.click()}
                title={`Upload Excel ${catalogTabMeta[activeTab as CatalogTabId].label}`}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Upload file
              </button>
              <button
                type="button"
                onClick={handleExportGenericCatalog}
                title={`Xuất danh sách ${catalogTabMeta[activeTab as CatalogTabId].label} ra Excel`}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Xuất excel
              </button>
            </>
          )}

          {activeTab === 'nong-truong' && (
            <>
              {/* Hidden file input for Excel upload */}
              <input
                ref={farmFileInputRef}
                type="file"
                accept=".xls,.xlsx,.xlsm"
                className="hidden"
                onChange={handleUploadExcelFarms}
              />
              <button
                type="button"
                onClick={handleDownloadTemplateNongTruong}
                title="Tải file mẫu Excel Nông trường"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Download Template
              </button>
              <button
                type="button"
                onClick={() => farmFileInputRef.current?.click()}
                title="Tải lên tệp tin Excel nông trường"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Upload file
              </button>
              <button
                type="button"
                onClick={handleExportExcelFarms}
                title="Xuất danh sách Nông trường ra Excel"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Xuất excel
              </button>
            </>
          )}

          {activeTab === 'danh-muc-lo' && (
            <>
              <input
                ref={plotFileInputRef}
                type="file"
                accept=".xls,.xlsx,.xlsm"
                className="hidden"
                onChange={handleUploadExcelPlots}
              />
              <button
                type="button"
                onClick={handleDownloadTemplateLo}
                title="Tải file mẫu Excel Lô"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Download Template
              </button>
              <button
                type="button"
                onClick={() => plotFileInputRef.current?.click()}
                title="Tải lên tệp tin Excel Lô"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Upload file
              </button>
              <button
                type="button"
                onClick={handleExportExcelPlots}
                title="Xuất danh sách Lô ra Excel"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Xuất excel
              </button>
            </>
          )}

          {activeTab === 'danh-muc-thua' && (
            <>
              <input
                ref={parcelFileInputRef}
                type="file"
                accept=".xls,.xlsx,.xlsm"
                className="hidden"
                onChange={handleUploadExcelParcels}
              />
              <button
                type="button"
                onClick={handleDownloadTemplateThua}
                title="Tải file mẫu Excel Thửa"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                Download Template
              </button>
              <button
                type="button"
                onClick={() => parcelFileInputRef.current?.click()}
                title="Tải lên tệp tin Excel Thửa"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                Upload file
              </button>
              <button
                type="button"
                onClick={handleExportExcelParcels}
                title="Xuất danh sách Thửa ra Excel"
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                Xuất excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* 1. Tab: Công ty (Screenshot 1) */}
      {activeTab === 'cong-ty' && (() => {
        const filtered = companies.filter((c) => {
          const matchCode = !appliedFilter.code || c.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchAddress = !appliedFilter.address || (c.address && c.address.toLowerCase().includes(appliedFilter.address.trim().toLowerCase()));
          const matchPhone = !appliedFilter.phone || ((c as any).phone && (c as any).phone.toLowerCase().includes(appliedFilter.phone.trim().toLowerCase()));
          const matchFax = !appliedFilter.fax || ((c as any).fax && (c as any).fax.toLowerCase().includes(appliedFilter.fax.trim().toLowerCase()));
          const matchStatus = appliedFilter.status === 'ALL' || (c as any).status === appliedFilter.status || (appliedFilter.status === 'HOAT_DONG' && !(c as any).status);
          const matchKw = !searchKeyword || c.name.toLowerCase().includes(searchKeyword.toLowerCase()) || c.code.toLowerCase().includes(searchKeyword.toLowerCase());
          return matchCode && matchAddress && matchPhone && matchFax && matchStatus && matchKw;
        });
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs font-bold text-red-600 uppercase">Công ty</span>
              <span className="text-xs text-slate-500 font-medium">Tổng số: <b>{companies.length}</b> pháp nhân</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Mã</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Địa chỉ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Lĩnh Vực</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Giấy phép KD</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Vốn Điều Lệ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Ngày tạo</th>
                    <th className="py-2.5 px-3 text-center w-24">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic text-xs">
                        Không tìm thấy công ty phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginated.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600 border-r border-slate-200">
                          {startIndex + idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-800 border-r border-slate-200 font-mono">
                          {c.code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                          {c.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{c.address}</td>
                        <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{c.field}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-200">
                          {c.businessLicense || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-200">
                          {c.charterCapital || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-center border-r border-slate-200 font-mono text-[11px]">
                          {c.createdAt}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              title="Sửa công ty"
                              className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(c.id, c.name, c.code, 'Công ty')}
                              title="Xóa công ty"
                              className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {/* 2. Tab: Khu liên hợp */}
      {activeTab === 'khu-lien-hop' && (() => {
        const filtered = complexes.filter((c) => {
          const matchCode = !appliedFilter.code || c.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchName = !appliedFilter.name || c.name.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
          const matchStatus = appliedFilter.status === 'ALL' || c.status === appliedFilter.status;
          const targetEnt = appliedFilter.enterpriseName || appliedFilter.parentName;
          const matchEnterprise = !targetEnt || enterprises.some(
            (e) => (e.parentName === c.name || e.parentCode === c.code || (c.code === 'D01' && ['BE01', 'BE02', 'BE03', 'BE04', 'BE05'].includes(e.code))) && (e.name === targetEnt || e.code === targetEnt)
          );
          const isMatchSearch =
            !searchKeyword ||
            c.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            c.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (c.systemId && c.systemId.includes(searchKeyword));
          return matchCode && matchName && matchStatus && matchEnterprise && isMatchSearch;
        });
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans relative">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-600 uppercase">Công đoạn</span>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  Tạo mới
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Tổng số: <b>{complexes.length}</b> KLH
              </div>
            </div>

            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-14">STT</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-28">ID hệ thống</th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-28">Mã</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên Khu liên hợp</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Địa chỉ trụ sở</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right w-32">Diện tích (ha)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-28">Xí nghiệp</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-16">Users</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-28">Trạng thái</th>
                    <th className="py-2.5 px-3 text-center w-28">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 italic text-xs">
                        Không tìm thấy khu liên hợp phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginated.map((c, idx) => {
                      const complexEnterprises = enterprises.filter((e) => {
                        if (e.parentCode && (e.parentCode === c.code || (c.code === 'KOUN_MOM' && e.parentCode === 'KM'))) return true;
                        if (e.parentName && (e.parentName === c.name || e.parentName.includes(c.name) || (c.name.includes('Koun Mom') && e.parentName.includes('Koun Mom')))) return true;
                        return false;
                      });

                      return (
                        <React.Fragment key={c.id}>
                          <tr className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 text-center font-medium text-slate-700 border-r border-slate-200">
                              {startIndex + idx + 1}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-700 font-mono border-r border-slate-200">
                              {c.systemId || '100026'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-semibold text-slate-800 font-mono border-r border-slate-200">
                              {c.code}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-medium border-r border-slate-200">
                              {c.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">
                              {c.address || (c.code === 'KOUN_MOM' ? 'Huyện Koun Mom, Tỉnh Ratanakiri, Campuchia' : c.code === 'SNOUL' ? 'Huyện Snoul, Tỉnh Kratie, Campuchia' : 'Tỉnh Attapeu, Nước CHDCND Lào')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-800 border-r border-slate-200">
                              {(() => {
                                const totalEntArea = Math.round(complexEnterprises.reduce((sum, e) => sum + (e.areaHa || 0), 0) * 1000) / 1000;
                                // Khu liên hợp lớn hơn các Xí nghiệp con: ĐÚNG (Hợp lệ).
                                // Chỉ cảnh báo khi Tổng Xí nghiệp con VƯỢT QUÁ diện tích Khu liên hợp.
                                const isOverLimit = complexEnterprises.length > 0 && totalEntArea - (c.areaHa || 0) > 0.05;

                                return (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className={`font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-800'}`}>
                                      {c.areaHa ? `${c.areaHa.toLocaleString('vi-VN')} ha` : '-'}
                                    </span>
                                    {complexEnterprises.length > 0 && (
                                      isOverLimit ? (
                                        <div className="flex items-center gap-1">
                                          <span
                                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300"
                                            title={`Tổng ${complexEnterprises.length} Xí nghiệp con: ${totalEntArea.toLocaleString('vi-VN')} ha (Vượt ${(totalEntArea - (c.areaHa || 0)).toFixed(2)} ha)`}
                                          >
                                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                            Vượt XN: {totalEntArea.toLocaleString('vi-VN')}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleQuickAlignComplexArea(c, totalEntArea)}
                                            className="px-1.5 py-0.2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs cursor-pointer transition-colors"
                                            title="Bấm để tăng diện tích Khu liên hợp bằng tổng Xí nghiệp con"
                                          >
                                            Khớp
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-emerald-700 font-medium">
                                          ✓ {complexEnterprises.length} XN ({totalEntArea.toLocaleString('vi-VN')} ha)
                                        </span>
                                      )
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 relative">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchParams({ tab: 'xi-nghiep' });
                                    setFilterForm((prev) => ({
                                      ...prev,
                                      complexName: c.name,
                                      parentName: c.name,
                                    }));
                                    setAppliedFilter((prev) => ({
                                      ...prev,
                                      complexName: c.name,
                                      parentName: c.name,
                                    }));
                                    setCurrentPage(1);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                  title={`Xem ${complexEnterprises.length} xí nghiệp thuộc ${c.name}`}
                                >
                                  <span>{complexEnterprises.length} XN</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPopoverAuditComplex(null);
                                    setPopoverEnterpriseComplex(
                                      popoverEnterpriseComplex?.id === c.id ? null : c
                                    );
                                    setEnterpriseSearchKw('');
                                  }}
                                  title="Xem danh sách Xí nghiệp trực thuộc"
                                  className="inline-flex items-center justify-center p-1 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Popup Danh sách Xí nghiệp trực thuộc (Screenshot 2) */}
                              {popoverEnterpriseComplex?.id === c.id && (
                                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-80 bg-white rounded border-2 border-emerald-600 shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                    <span className="text-xs font-bold text-slate-800">
                                      Xí nghiệp thuộc {c.name} ({complexEnterprises.length})
                                    </span>
                                  </div>
                                  <div className="mb-2">
                                    <input
                                      type="text"
                                      placeholder="Tìm kiếm xí nghiệp..."
                                      value={enterpriseSearchKw}
                                      onChange={(e) => setEnterpriseSearchKw(e.target.value)}
                                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                                    />
                                  </div>
                                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 mb-2">
                                    {complexEnterprises
                                      .filter((ent) =>
                                        !enterpriseSearchKw ||
                                        ent.name.toLowerCase().includes(enterpriseSearchKw.toLowerCase()) ||
                                        ent.code.toLowerCase().includes(enterpriseSearchKw.toLowerCase())
                                      )
                                      .map((ent) => (
                                        <div
                                          key={ent.id}
                                          onClick={() => {
                                            setPopoverEnterpriseComplex(null);
                                            setSearchParams({ tab: 'xi-nghiep' });
                                            setFilterForm((prev) => ({
                                              ...prev,
                                              complexName: c.name,
                                              parentName: c.name,
                                              code: ent.code,
                                              name: ent.name,
                                            }));
                                            setAppliedFilter((prev) => ({
                                              ...prev,
                                              complexName: c.name,
                                              parentName: c.name,
                                              code: ent.code,
                                              name: ent.name,
                                            }));
                                            setCurrentPage(1);
                                          }}
                                          className="py-1.5 px-2 text-xs text-slate-800 hover:bg-emerald-50 rounded cursor-pointer flex items-center justify-between transition-colors"
                                          title={`Xem xí nghiệp ${ent.name}`}
                                        >
                                          <span className="font-medium text-slate-800">{ent.name}</span>
                                          <span className="text-[10px] text-emerald-700 font-mono font-semibold bg-emerald-50 px-1 rounded">{ent.code}</span>
                                        </div>
                                      ))}
                                    {complexEnterprises.length === 0 && (
                                      <div className="py-2 text-xs text-slate-400 text-center">
                                        Chưa có xí nghiệp trực thuộc
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPopoverEnterpriseComplex(null);
                                        setSearchParams({ tab: 'xi-nghiep' });
                                        setFilterForm((prev) => ({
                                          ...prev,
                                          complexName: c.name,
                                          parentName: c.name,
                                          code: '',
                                          name: '',
                                        }));
                                        setAppliedFilter((prev) => ({
                                          ...prev,
                                          complexName: c.name,
                                          parentName: c.name,
                                          code: '',
                                          name: '',
                                        }));
                                        setCurrentPage(1);
                                      }}
                                      className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer flex items-center gap-1"
                                    >
                                      Xem tất cả trên bảng →
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setPopoverEnterpriseComplex(null)}
                                      className="text-xs text-slate-500 hover:text-red-600 font-semibold cursor-pointer"
                                    >
                                      [ Đóng lại ]
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200 relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setPopoverEnterpriseComplex(null);
                                  setPopoverAuditComplex(popoverAuditComplex?.id === c.id ? null : c);
                                }}
                                title={`Xem thông tin tạo/sửa của ${c.name}`}
                                className={`inline-flex items-center justify-center p-1 rounded transition-colors ${
                                  popoverAuditComplex?.id === c.id
                                    ? 'border border-slate-800 bg-slate-100 text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-blue-600'
                                }`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>

                              {/* Floating Audit Details Popover Panel (Screenshot) */}
                              {popoverAuditComplex?.id === c.id && (
                                <div className="absolute top-9 right-0 z-50 w-[520px] bg-white rounded border border-slate-300 shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-150">
                                  <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Ngày tạo</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.createdDate || '2026-02-27'}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Người tạo</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.createdUser || 'admin'}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Ngày sửa</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.updatedDate || '2026-03-14'}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Người sửa</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.updatedUser || 'admin'}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Ngày xác nhận</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.confirmedDate || ''}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Người xác nhận</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.confirmedUser || ''}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Ngày xóa</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.deletedDate || ''}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-center font-semibold text-slate-700 mb-1">Người xóa</div>
                                      <input
                                        type="text"
                                        readOnly
                                        value={c.deletedUser || ''}
                                        className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs"
                                      />
                                    </div>
                                  </div>

                                  <div className="text-right pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setPopoverAuditComplex(null)}
                                      className="text-xs text-slate-800 hover:text-red-600 font-semibold cursor-pointer"
                                    >
                                      Đóng lại
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center border-r border-slate-200">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                c.status === 'HOAT_DONG'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {c.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleOpenEdit(c)}
                                  title="Xem chi tiết"
                                  className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEdit(c)}
                                  title="Sửa KLH"
                                  className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => confirmDelete(c.id, c.name, c.code, 'Khu liên hợp')}
                                  title="Xóa KLH"
                                  className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {/* 2b. Tab: Phòng ban */}
      {activeTab === 'phong-ban' && (() => {
        const filtered = departments.filter((d) => {
          const matchCode = !appliedFilter.code || d.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchName = !appliedFilter.name || d.name.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
          const matchParent = !appliedFilter.parentName || d.parentName === appliedFilter.parentName;
          const matchStatus = appliedFilter.status === 'ALL' || d.status === appliedFilter.status;
          const isMatchSearch =
            !searchKeyword ||
            d.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            d.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (d.managerName && d.managerName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (d.parentName && d.parentName.toLowerCase().includes(searchKeyword.toLowerCase()));
          return matchCode && matchName && matchParent && matchStatus && isMatchSearch;
        });
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-600 uppercase">Phòng ban</span>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  Tạo mới
                </button>
              </div>
              <span className="text-xs text-slate-500 font-medium">Tổng số: <b>{departments.length}</b> phòng ban</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-28">Mã phòng ban</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên phòng ban / Tổ chuyên môn</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Đơn vị trực thuộc</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Trưởng phòng / Phụ trách</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Điện thoại</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Chức năng nhiệm vụ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-center w-24">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic text-xs">
                        Không tìm thấy phòng ban phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginated.map((d, idx) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600 border-r border-slate-200">
                          {startIndex + idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-800 border-r border-slate-200 font-mono">
                          {d.code}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                          {d.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200 font-medium">
                          {d.parentName}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-200">
                          {d.managerName || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-200">
                          {d.phone || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200 max-w-xs truncate" title={d.description}>
                          {d.description || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            d.status === 'HOAT_DONG'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {d.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(d)}
                              title="Sửa phòng ban"
                              className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(d.id, d.name, d.code, 'Phòng ban')}
                              title="Xóa phòng ban"
                              className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {/* 3. Tab: Xí nghiệp */}
      {activeTab === 'xi-nghiep' && (() => {
        const filtered = enterprises.filter((e) => {
          const matchCode = !appliedFilter.code || e.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchName = !appliedFilter.name || e.name.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
          const matchAddress = !appliedFilter.address || (e.address && e.address.toLowerCase().includes(appliedFilter.address.trim().toLowerCase()));
          const targetComplex = (appliedFilter.complexName || appliedFilter.parentName || '').trim();
          const matchParent =
            !targetComplex ||
            targetComplex === 'ALL' ||
            e.parentName === targetComplex ||
            e.parentCode === targetComplex ||
            (e.parentName && e.parentName.toLowerCase().includes(targetComplex.toLowerCase())) ||
            (e.parentCode && targetComplex.toUpperCase().includes(e.parentCode.toUpperCase()));
          const matchStatus = appliedFilter.status === 'ALL' || e.status === appliedFilter.status;
          const isMatchSearch =
            !searchKeyword ||
            e.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            e.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (e.parentName && e.parentName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (e.parentCode && e.parentCode.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (e.managerName && e.managerName.toLowerCase().includes(searchKeyword.toLowerCase()));
          return matchCode && matchName && matchAddress && matchParent && matchStatus && isMatchSearch;
        });
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-700 uppercase">Danh mục Xí nghiệp / Khu vực</span>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  Tạo mới
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Tổng số: <b>{enterprises.length}</b> đơn vị
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-14">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-32">Mã XN / Khu vực</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên Xí nghiệp / Khu vực</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-36">Địa chỉ</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-44">Khu liên hợp</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28">Diện tích (ha)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-28">Trạng thái</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-16">User</th>
                    <th className="py-2.5 px-3 text-center w-28">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic text-xs">
                        Không tìm thấy xí nghiệp phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginated.map((e, idx) => (
                      <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 text-center font-medium text-slate-700 border-r border-slate-200">
                          {startIndex + idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 border-r border-slate-200 font-mono">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{e.code}</span>
                            {(() => {
                              const reg = e.description || (e.name.includes('DP') ? 'DP' : e.name.includes('LP') ? 'LP' : e.name.includes('AD') ? 'AD' : e.name.includes('BP') ? 'BP' : e.name.includes('BSA') ? 'BSA' : e.name.includes('ERC') ? 'ERC' : e.name.includes('NSA') ? 'NSA' : e.name.includes('NK') ? 'NK' : e.name.includes('PV') ? 'PV' : null);
                              if (reg) {
                                return (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans" title={`Khu vực địa lý viết tắt: ${reg}`}>
                                    {reg}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-medium border-r border-slate-200">
                          {e.name}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                          {e.address || ''}
                        </td>
                        <td className="py-2 px-3 text-slate-800 border-r border-slate-200 font-medium">
                          {(() => {
                            if (e.parentName && e.parentName.startsWith('Khu liên hợp')) return e.parentName;
                            if (e.parentCode) {
                              const comp = complexes.find((c) => c.code === e.parentCode || c.name === e.parentCode);
                              if (comp) return comp.name;
                              if (e.parentCode === 'KOUN_MOM' || e.parentCode === 'KM') return 'Khu liên hợp Koun Mom';
                              if (e.parentCode === 'SNOUL') return 'Khu liên hợp Snoul';
                              if (e.parentCode === 'NAM_LAO') return 'Khu liên hợp Nam Lào';
                            }
                            if (e.parentName) {
                              if (e.parentName.includes('Koun Mom') || e.parentName.includes('Daun Penh') || e.parentName.includes('Lumphat') || e.parentName.includes('Andong Meas')) {
                                return 'Khu liên hợp Koun Mom';
                              }
                              if (e.parentName.includes('Snoul')) return 'Khu liên hợp Snoul';
                              if (e.parentName.includes('Nam Lào') || e.parentName.includes('Lào')) return 'Khu liên hợp Nam Lào';
                            }
                            return e.parentName || 'Khu liên hợp Koun Mom';
                          })()}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-800 border-r border-slate-200">
                          {(() => {
                            const childFarms = farms.filter((f) => {
                              if (f.parentCode && e.code && f.parentCode.toLowerCase() === e.code.toLowerCase()) return true;
                              if (f.parentName && e.name && f.parentName.toLowerCase() === e.name.toLowerCase()) return true;
                              if (f.parentName && e.code && f.parentName.toLowerCase().includes(e.code.toLowerCase())) return true;
                              if (f.parentName && e.name && (f.parentName.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(f.parentName.toLowerCase()))) return true;
                              return false;
                            });
                            const childArea = Math.round(childFarms.reduce((sum, f) => sum + (f.areaHa || 0), 0) * 1000) / 1000;
                            // Xí nghiệp lớn hơn Nông trường con: ĐÚNG (Hợp lệ).
                            // Chỉ cảnh báo khi Tổng Nông trường con VƯỢT QUÁ diện tích Xí nghiệp.
                            const isOverLimit = childFarms.length > 0 && childArea - (e.areaHa || 0) > 0.05;

                            return (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {e.areaHa ? `${e.areaHa.toLocaleString('vi-VN')} ha` : '-'}
                                </span>
                                {childFarms.length > 0 && (
                                  isOverLimit ? (
                                    <div className="flex items-center gap-1">
                                      <span
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300"
                                        title={`Tổng ${childFarms.length} Nông trường con: ${childArea.toLocaleString('vi-VN')} ha (Vượt ${(childArea - (e.areaHa || 0)).toFixed(2)} ha)`}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                        Vượt NT: {childArea.toLocaleString('vi-VN')}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAlignEnterpriseArea(e, childArea)}
                                        className="px-1.5 py-0.2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs cursor-pointer transition-colors"
                                        title="Bấm để tăng diện tích Xí nghiệp bằng tổng Nông trường con"
                                      >
                                        Khớp
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-emerald-700 font-medium">
                                      ✓ {childFarms.length} NT ({childArea.toLocaleString('vi-VN')} ha)
                                    </span>
                                  )
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-200">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            e.status === 'HOAT_DONG'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {e.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center border-r border-slate-200 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setPopoverAuditEnterprise(popoverAuditEnterprise?.id === e.id ? null : e);
                            }}
                            title={`Xem thông tin tạo/sửa của ${e.name}`}
                            className={`inline-flex items-center justify-center p-1 rounded transition-colors ${
                              popoverAuditEnterprise?.id === e.id
                                ? 'border border-slate-800 bg-slate-100 text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-blue-600'
                            }`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Floating Audit Details Popover Panel matching user screenshot */}
                          {popoverAuditEnterprise?.id === e.id && (
                            <div className="absolute top-8 right-0 z-50 w-[440px] bg-white rounded border border-slate-300 shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-150 font-sans">
                              <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Ngày tạo</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={e.createdDate || e.createdAt || '14-03-2026'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Người tạo</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={e.createdUser || 'admin'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Ngày sửa</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={e.updatedDate || '01-08-2026'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Người sửa</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={e.updatedUser || 'admin'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-bold"
                                  />
                                </div>
                              </div>

                              <div className="text-right pt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setPopoverAuditEnterprise(null)}
                                  className="text-xs text-slate-800 hover:text-red-600 font-semibold cursor-pointer"
                                >
                                  [ Đóng lại ]
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(e)}
                              title="Xem chi tiết"
                              className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(e)}
                              title="Sửa xí nghiệp"
                              className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(e.id, e.name, e.code, 'Xí nghiệp')}
                              title="Xóa xí nghiệp"
                              className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {/* 4. Tab: Nông trường (Screenshot 4) */}
      {activeTab === 'nong-truong' && (() => {
        const filtered = farms.filter((f) => {
          const matchCode = !appliedFilter.code || f.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchName = !appliedFilter.name || f.name.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
          const targetEnterprise = appliedFilter.enterpriseName || appliedFilter.parentName;
          const matchParent = !targetEnterprise || f.parentName === targetEnterprise || f.parentCode === targetEnterprise || (f.parentName && f.parentName.includes(targetEnterprise));
          let matchComplex = true;
          if (appliedFilter.complexName) {
            const parentEnt = enterprises.find((e) => e.name === f.parentName || e.code === f.parentCode);
            matchComplex = parentEnt ? (parentEnt.parentName === appliedFilter.complexName || parentEnt.parentCode === appliedFilter.complexName) : false;
          }
          const matchStatus = appliedFilter.status === 'ALL' || f.status === appliedFilter.status;
          const isOver = overLimitMap.get(f.id)?.isOverLimit;
          const isMatchLimitStatus =
            filterStatus === 'ALL' ||
            (filterStatus === 'OVER_LIMIT' && isOver) ||
            (filterStatus === 'NORMAL' && !isOver);
          const isMatchSearch =
            !searchKeyword ||
            f.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            f.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (f.parentName && f.parentName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (f.managerName && f.managerName.toLowerCase().includes(searchKeyword.toLowerCase()));
          return matchCode && matchName && matchParent && matchComplex && matchStatus && isMatchLimitStatus && isMatchSearch;
        });
        const overCount = farms.filter((f) => overLimitMap.get(f.id)?.isOverLimit).length;
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-600 uppercase">Nông trường</span>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  Tạo mới
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 font-medium">Tổng: <b>{farms.length}</b> nông trường</span>
                {overCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    Quá hạn mức: {overCount}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 w-28">Mã nông trường</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên nông trường</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Xí nghiệp</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-24">Diện tích</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-28">Trạng thái</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center w-16">User</th>
                    <th className="py-2.5 px-3 text-center w-28">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic text-xs">
                        Chưa có dữ liệu nông trường. Hãy nhấn <b>[ Download Template ]</b> để lấy mẫu và <b>[ Upload file ]</b> hoặc nhấn <b>[+ Tạo mới]</b> để thêm dữ liệu.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((f, idx) => {
                      const overInfo = overLimitMap.get(f.id);
                      const isYellow = overInfo?.isOverLimit;

                      return (
                        <tr
                          key={f.id}
                          className={`transition-colors ${isYellow
                            ? 'bg-amber-50/90 text-amber-950 hover:bg-amber-100/90 font-medium'
                            : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className="py-2.5 px-3 text-center font-medium border-r border-slate-200">
                            {startIndex + idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800 border-r border-slate-200 font-mono">
                            {f.code}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <span>{f.name}</span>
                              {isYellow && (
                                <span
                                  title={overInfo.reason}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 shadow-xs cursor-help shrink-0"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                  {overInfo.isDirectOver ? 'Quá hạn mức' : 'XN quá hạn mức'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 border-r border-slate-200">{f.parentName}</td>
                          <td className="py-2.5 px-3 font-semibold text-center border-r border-slate-200 text-slate-800">
                            {f.areaHa ? `${f.areaHa.toLocaleString()} ha` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${isYellow
                                ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                : f.status === 'HOAT_DONG'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                                }`}
                            >
                              {isYellow ? '⚠️ Quá hạn mức' : f.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động'}
                            </span>
                          </td>
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setPopoverAuditFarm(popoverAuditFarm?.id === f.id ? null : f);
                            }}
                            title={`Xem thông tin tạo/sửa của ${f.name}`}
                            className={`inline-flex items-center justify-center p-1 rounded transition-colors ${
                              popoverAuditFarm?.id === f.id
                                ? 'border border-slate-800 bg-slate-100 text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-blue-600'
                            }`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Floating Audit Details Popover Panel */}
                          {popoverAuditFarm?.id === f.id && (
                            <div className="absolute top-8 right-0 z-50 w-[440px] bg-white rounded border border-slate-300 shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-150 font-sans">
                              <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Ngày tạo</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={f.createdDate || f.createdAt || '14-03-2026'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Người tạo</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={f.createdUser || 'admin'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Ngày sửa</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={f.updatedDate || '01-08-2026'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-mono"
                                  />
                                </div>
                                <div>
                                  <div className="text-center font-semibold text-slate-700 mb-1">Người sửa</div>
                                  <input
                                    type="text"
                                    readOnly
                                    value={f.updatedUser || 'admin'}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-center bg-white text-slate-700 text-xs font-bold"
                                  />
                                </div>
                              </div>

                              <div className="text-right pt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setPopoverAuditFarm(null)}
                                  className="text-xs text-slate-800 hover:text-red-600 font-semibold cursor-pointer"
                                >
                                  [ Đóng lại ]
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(f)}
                              title="Xem chi tiết"
                              className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(f)}
                              title="Sửa nông trường"
                              className="p-1 hover:bg-slate-100 text-slate-700 rounded transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(f.id, f.name, f.code, 'Nông trường')}
                              title="Xóa nông trường"
                              className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {/* 5. Tab: Đội */}
      {activeTab === 'doi' && (() => {
        // 5. Tab: Đội (Đội độc lập, không thuộc nông trường hay xí nghiệp)
        const filtered = teams.filter((t) => {
          const matchCode = !appliedFilter.code || t.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchName = !appliedFilter.name || t.name.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
          const matchStatus = appliedFilter.status === 'ALL' || t.status === appliedFilter.status;
          const isMatchSearch =
            !searchKeyword ||
            t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            t.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (t.managerName && t.managerName.toLowerCase().includes(searchKeyword.toLowerCase()));
          return matchCode && matchName && matchStatus && isMatchSearch;
        });
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-700 uppercase">Danh mục Đội / Tổ công tác</span>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  Tạo mới
                </button>
              </div>
              <span className="text-xs text-slate-500 font-medium">Tổng số: <b>{teams.length}</b> đội/tổ</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Mã Đội</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên Đội</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Phân loại / Đơn vị</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Đội trưởng phụ trách</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Điện thoại</th>
                    <th className="py-2.5 px-3 text-center w-24">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic text-xs">
                        Không tìm thấy đội / tổ phù hợp
                      </td>
                    </tr>
                  ) : (
                    paginated.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600 border-r border-slate-200">
                          {startIndex + idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-800 border-r border-slate-200 font-mono">
                          {t.code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200">
                          {t.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">
                          {t.parentName || 'Đội độc lập'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{t.managerName || '-'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 border-r border-slate-200">{t.phone || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(t)}
                              title="Sửa đội"
                              className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(t.id, t.name, t.code, 'Đội')}
                              title="Xóa đội"
                              className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {/* 6. Tab: Danh mục lô */}
      {activeTab === 'danh-muc-lo' && (() => {
        const filtered = plots.filter((p) => {
          const matchCode = !appliedFilter.code || p.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchName = !appliedFilter.name || p.name.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
          const targetFarm = appliedFilter.farmName || appliedFilter.parentName;
          const matchParent = !targetFarm || p.parentName === targetFarm || p.parentCode === targetFarm || (p.parentName && p.parentName.includes(targetFarm));
          let matchEnterprise = true;
          if (appliedFilter.enterpriseName) {
            const parentFarm = farms.find((f) => f.name === p.parentName || f.code === p.parentCode);
            matchEnterprise =
              p.enterpriseName === appliedFilter.enterpriseName ||
              (parentFarm
                ? parentFarm.parentName === appliedFilter.enterpriseName || parentFarm.parentCode === appliedFilter.enterpriseName
                : false);
          }
          let matchComplex = true;
          if (appliedFilter.complexName) {
            const parentFarm = farms.find((f) => f.name === p.parentName || f.code === p.parentCode);
            const parentEnt = parentFarm
              ? enterprises.find((e) => e.name === parentFarm.parentName || e.code === parentFarm.parentCode)
              : null;
            matchComplex = parentEnt
              ? parentEnt.parentName === appliedFilter.complexName || parentEnt.parentCode === appliedFilter.complexName
              : false;
          }
          const matchStatus = appliedFilter.status === 'ALL' || appliedFilter.status === '' || p.status === appliedFilter.status;
          const isOver = overLimitMap.get(p.id)?.isOverLimit;
          const isMatchLimitStatus =
            filterStatus === 'ALL' ||
            (filterStatus === 'OVER_LIMIT' && isOver) ||
            (filterStatus === 'NORMAL' && !isOver);
          const isMatchSearch =
            !searchKeyword ||
            p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            p.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (p.parentName && p.parentName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (p.enterpriseName && p.enterpriseName.toLowerCase().includes(searchKeyword.toLowerCase()));
          return matchCode && matchName && matchParent && matchEnterprise && matchComplex && matchStatus && isMatchLimitStatus && isMatchSearch;
        });
        const overCount = plots.filter((p) => overLimitMap.get(p.id)?.isOverLimit).length;
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-600 uppercase">Danh mục Lô</span>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  Tạo mới
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 font-medium">Tổng: <b>{plots.length}</b> lô</span>
                {overCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    Quá hạn mức: {overCount}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Mã lô</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên lô</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Nông trường</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Xi nghiệp</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Diện tích (ha)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">User</th>
                    <th className="py-2.5 px-3 text-center w-24">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic text-xs">
                        {plots.length === 0 ? (
                          <span>
                            Chưa có dữ liệu Lô. Hãy nhấn <b>[ Download Template ]</b> để lấy mẫu và <b>[ Upload file ]</b> hoặc nhấn <b>[+ Tạo mới]</b> để thêm dữ liệu.
                          </span>
                        ) : (
                          'Không tìm thấy lô sản xuất phù hợp'
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p, idx) => {
                      const overInfo = overLimitMap.get(p.id);
                      const isYellow = overInfo?.isOverLimit;
                      // Compute enterprise from farm if not stored directly
                      const dispEnterprise = p.enterpriseName
                        || farms.find(f => f.name === p.parentName || f.code === p.parentCode)?.parentName
                        || '-';

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${isYellow
                            ? 'bg-amber-50/90 text-amber-950 hover:bg-amber-100/90 font-medium'
                            : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className="py-2.5 px-3 text-center font-medium border-r border-slate-200">
                            {startIndex + idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800 border-r border-slate-200 font-mono text-[11px]">
                            {p.code}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.name}</span>
                              {isYellow && (
                                <span
                                  title={overInfo.reason}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 shadow-xs cursor-help shrink-0"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                  {overInfo.isDirectOver ? 'Quá hạn mức' : 'NT quá hạn mức'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{p.parentName || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{dispEnterprise}</td>
                          <td className="py-2.5 px-3 font-bold border-r border-slate-200 text-right" title={overInfo?.reason}>
                            {p.areaHa !== undefined ? `${p.areaHa.toLocaleString('vi-VN')} ha` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${isYellow
                                ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                : p.status === 'HOAT_DONG'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                                }`}
                            >
                              {isYellow ? '⚠️ Quá hạn mức' : p.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200 text-[11px]">
                            {p.createdUser || 'admin'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Sửa lô"
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => confirmDelete(p.id, p.name, p.code, 'Danh mục lô')}
                                title="Xóa lô"
                                className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}

      {/* 7. Tab: Danh mục thửa */}
      {activeTab === 'danh-muc-thua' && (() => {
        const filtered = landParcels.filter((p) => {
          const matchCode = !appliedFilter.code || p.code.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
          const matchName = !appliedFilter.name || p.name.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
          // parentName = Tên lô; plotName filter = filter by lô
          const matchPlot = !appliedFilter.plotName || p.parentName === appliedFilter.plotName || p.parentCode === appliedFilter.plotName || (p.parentName && p.parentName.includes(appliedFilter.plotName));
          const parentPlot = plots.find((pl) => pl.name === p.parentName || pl.code === p.parentCode);
          let matchFarm = true;
          const targetFarm = appliedFilter.farmName || appliedFilter.parentName;
          if (targetFarm) {
            matchFarm =
              p.farmName === targetFarm ||
              (parentPlot ? parentPlot.parentName === targetFarm || parentPlot.parentCode === targetFarm : false);
          }
          let matchEnterprise = true;
          if (appliedFilter.enterpriseName) {
            const farmOfPlot = parentPlot
              ? farms.find((f) => f.name === parentPlot.parentName || f.code === parentPlot.parentCode)
              : null;
            matchEnterprise =
              p.enterpriseName === appliedFilter.enterpriseName ||
              (parentPlot && parentPlot.enterpriseName === appliedFilter.enterpriseName) ||
              (farmOfPlot
                ? farmOfPlot.parentName === appliedFilter.enterpriseName || farmOfPlot.parentCode === appliedFilter.enterpriseName
                : false);
          }
          let matchComplex = true;
          if (appliedFilter.complexName) {
            const farmOfPlot = parentPlot
              ? farms.find((f) => f.name === parentPlot.parentName || f.code === parentPlot.parentCode)
              : null;
            const entOfFarm = farmOfPlot
              ? enterprises.find((e) => e.name === farmOfPlot.parentName || e.code === farmOfPlot.parentCode)
              : null;
            matchComplex = entOfFarm
              ? entOfFarm.parentName === appliedFilter.complexName || entOfFarm.parentCode === appliedFilter.complexName
              : false;
          }
          const matchPlotStatus = !appliedFilter.plotStatus || p.plotStatus === appliedFilter.plotStatus;
          const matchStatus = appliedFilter.status === 'ALL' || appliedFilter.status === '' || p.status === appliedFilter.status;
          const isOver = overLimitMap.get(p.id)?.isOverLimit;
          const isMatchLimitStatus =
            filterStatus === 'ALL' ||
            (filterStatus === 'OVER_LIMIT' && isOver) ||
            (filterStatus === 'NORMAL' && !isOver);
          const isMatchSearch =
            !searchKeyword ||
            p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            p.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (p.parentName && p.parentName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (p.farmName && p.farmName.toLowerCase().includes(searchKeyword.toLowerCase())) ||
            (p.enterpriseName && p.enterpriseName.toLowerCase().includes(searchKeyword.toLowerCase()));
          return matchCode && matchName && matchPlot && matchFarm && matchEnterprise && matchComplex && matchPlotStatus && matchStatus && isMatchLimitStatus && isMatchSearch;
        });
        const overCount = landParcels.filter((p) => overLimitMap.get(p.id)?.isOverLimit).length;
        const startIndex = (currentPage - 1) * pageSize;
        const paginated = filtered.slice(startIndex, startIndex + pageSize);

        return (
          <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden font-sans">
            <div className="px-3.5 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-red-600 uppercase">Danh mục Thửa</span>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-600" />
                  Tạo mới
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 font-medium">Tổng: <b>{landParcels.length}</b> thửa</span>
                {overCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    Quá hạn mức: {overCount}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12">STT</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Mã thửa</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Tên thửa</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Lô</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Nông trường</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Xi nghiệp</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-right w-24">Diện tích (ha)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">Data thửa</th>
                    <th className="py-2.5 px-3 border-r border-slate-200 text-center">User</th>
                    <th className="py-2.5 px-3 text-center w-24">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 italic text-xs">
                        {landParcels.length === 0 ? (
                          <span>
                            Chưa có dữ liệu Thửa. Hãy nhấn <b>[ Download Template ]</b> để lấy mẫu và <b>[ Upload file ]</b> hoặc nhấn <b>[+ Tạo mới]</b> để thêm dữ liệu.
                          </span>
                        ) : (
                          'Không tìm thấy thửa đất phù hợp'
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p, idx) => {
                      const overInfo = overLimitMap.get(p.id);
                      const isYellow = overInfo?.isOverLimit;
                      // Compute farm and enterprise from relationships if not stored
                      const parentPlot = plots.find(pl => pl.name === p.parentName || pl.code === p.parentCode);
                      const dispFarm = p.farmName
                        || (parentPlot ? (farms.find(f => f.name === parentPlot.parentName || f.code === parentPlot.parentCode)?.name || parentPlot.parentName) : '-');
                      const dispEnterprise = p.enterpriseName
                        || (parentPlot ? (farms.find(f => f.name === parentPlot.parentName || f.code === parentPlot.parentCode)?.parentName) : undefined)
                        || '-';

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${isYellow
                            ? 'bg-amber-50/90 text-amber-950 hover:bg-amber-100/90 font-medium'
                            : 'hover:bg-slate-50'
                            }`}
                        >
                          <td className="py-2.5 px-3 text-center font-medium border-r border-slate-200">
                            {startIndex + idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-800 border-r border-slate-200 font-mono text-[11px]">
                            {p.code}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{p.name}</span>
                              {isYellow && (
                                <span
                                  title={overInfo.reason}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 shadow-xs cursor-help shrink-0"
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                  {overInfo.isDirectOver ? 'Quá hạn mức' : 'Lô quá hạn mức'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{p.parentName || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{dispFarm || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">{dispEnterprise}</td>
                          <td className="py-2.5 px-3 font-bold border-r border-slate-200 text-right" title={overInfo?.reason}>
                            {p.areaHa !== undefined ? `${p.areaHa.toLocaleString('vi-VN')} ha` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${isYellow
                                ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                : p.status === 'HOAT_DONG'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                                }`}
                            >
                              {isYellow ? '⚠️ Quá hạn mức' : p.status === 'HOAT_DONG' ? 'Hoạt động' : 'Không hoạt động'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-200">
                            {p.plotStatus ? (
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {p.plotStatus}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 border-r border-slate-200 text-[11px]">
                            {p.createdUser || 'admin'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                title="Sửa thửa"
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => confirmDelete(p.id, p.name, p.code, 'Thửa đất')}
                                title="Xóa thửa"
                                className="p-1 hover:bg-red-50 text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination(filtered.length)}
          </div>
        );
      })()}


      {/* CREATE / EDIT FORM MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm">
                {formMode === 'CREATE' ? 'Thêm Mới' : 'Chỉnh Sửa'} {tabs.find((t) => t.id === activeTab)?.label}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-emerald-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} autoComplete="off" data-form-type="other" className="p-6 space-y-3 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã định danh *</label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    placeholder="VD: BE16 / NT3 / LO_C01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên hiển thị *</label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    placeholder="Nhập tên..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {activeTab === 'cong-ty' ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Địa chỉ trụ sở *</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      data-lpignore="true"
                      placeholder="VD: Tam Hiệp, Núi Thành, Đà Nẵng"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Lĩnh vực hoạt động</label>
                      <input
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        value={formData.field}
                        onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Giấy phép KD</label>
                      <input
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        placeholder="VD: 4000123456"
                        value={formData.businessLicense}
                        onChange={(e) => setFormData({ ...formData, businessLicense: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vốn điều lệ</label>
                    <input
                      type="text"
                      autoComplete="off"
                      data-lpignore="true"
                      placeholder="VD: 5,000,000,000,000 VND"
                      value={formData.charterCapital}
                      onChange={(e) => setFormData({ ...formData, charterCapital: e.target.value })}
                      className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {activeTab !== 'khu-lien-hop' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {activeTab === 'danh-muc-thua'
                          ? 'Thuộc Lô sản xuất *'
                          : activeTab === 'phong-ban'
                            ? 'Thuộc Công ty / Khu liên hợp'
                            : activeTab === 'xi-nghiep'
                              ? 'Thuộc Khu liên hợp *'
                              : activeTab === 'nong-truong'
                                ? 'Thuộc Xí nghiệp *'
                                : 'Thuộc Nông trường *'}
                      </label>
                      <SearchableSelect
                        value={formData.parentName}
                        onChange={(val) => setFormData({ ...formData, parentName: val })}
                        options={
                          activeTab === 'danh-muc-thua'
                            ? plots.map((p) => ({ value: p.name, label: `${p.code} - ${p.name}` }))
                            : activeTab === 'phong-ban'
                              ? [
                                  { value: '', label: '-- Để trống --' },
                                  ...companies.map((c) => ({ value: c.name, label: `${c.code} - ${c.name}`, subLabel: 'Công ty' })),
                                  ...complexes.map((c) => ({ value: c.name, label: `${c.code} - ${c.name}`, subLabel: 'Khu liên hợp' })),
                                ]
                              : activeTab === 'xi-nghiep'
                                ? [
                                    { value: '', label: '-- Chọn Khu liên hợp trực thuộc * --' },
                                    ...complexes.map((c) => ({ value: c.name, label: `${c.code} - ${c.name}` })),
                                  ]
                                : activeTab === 'nong-truong'
                                  ? enterprises.map((e) => ({ value: e.name, label: `${e.code} - ${e.name}` }))
                                  : farms.map((f) => ({ value: f.name, label: `${f.code} - ${f.name}` }))
                        }
                        placeholder="Tìm kiếm hoặc chọn đơn vị..."
                      />
                    </div>
                  )}

                  {/* Field: Địa chỉ / Vị trí địa lý */}
                  {activeTab !== 'danh-muc-lo' && activeTab !== 'danh-muc-thua' && activeTab !== 'chuc-danh' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {activeTab === 'khu-lien-hop'
                          ? 'Địa chỉ / Vị trí Khu liên hợp'
                          : activeTab === 'xi-nghiep'
                            ? 'Địa chỉ / Vị trí Xí nghiệp'
                            : activeTab === 'nong-truong'
                              ? 'Địa chỉ / Vị trí Nông trường'
                              : activeTab === 'khu-vuc'
                                ? 'Vùng / Địa chỉ Khu vực địa lý'
                                : 'Địa chỉ / Vị trí địa lý'}
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        placeholder={
                          activeTab === 'khu-lien-hop'
                            ? 'VD: Huyện Koun Mom, Tỉnh Ratanakiri, Campuchia'
                            : activeTab === 'xi-nghiep'
                              ? 'VD: Vùng Daun Penh, Tỉnh Ratanakiri, Campuchia'
                              : 'Nhập địa chỉ / vị trí...'
                        }
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  )}

                  {activeTab !== 'danh-muc-lo' && activeTab !== 'danh-muc-thua' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {activeTab === 'phong-ban' ? 'Trưởng phòng / Phụ trách' : 'Người phụ trách / Điều hành'}
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          placeholder="Họ và tên..."
                          value={formData.managerName}
                          onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                          className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                        <input
                          type="text"
                          autoComplete="off"
                          data-lpignore="true"
                          placeholder="0918.xxx.xxx"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab !== 'doi' && activeTab !== 'phong-ban' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="block font-semibold text-slate-700">Diện tích (Hecta) *</label>
                        {(() => {
                          const childInfo = getChildHierarchyInfo();
                          if (childInfo && childInfo.totalChildArea > 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, areaHa: String(childInfo.totalChildArea) })}
                                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
                                title="Bấm để tự động gán bằng tổng diện tích các đơn vị con"
                              >
                                Khớp với tổng {childInfo.childTypePlural.toLowerCase()} ({childInfo.totalChildArea.toLocaleString('vi-VN')} ha)
                              </button>
                            );
                          }
                          const val = getParentAreaValidation();
                          if (!val || val.parentArea === 0) return null;
                          return (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Quy mô {val.parentType} cha: <b>{val.parentArea} ha</b>
                            </span>
                          );
                        })()}
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        autoComplete="off"
                        data-lpignore="true"
                        placeholder="VD: 16340"
                        value={formData.areaHa}
                        onChange={(e) => setFormData({ ...formData, areaHa: e.target.value })}
                        className={`w-full border rounded p-2 focus:outline-none transition-colors ${getParentAreaValidation()?.isWarning
                          ? 'border-amber-500 bg-amber-50/40 text-amber-900 focus:border-amber-600'
                          : 'border-slate-300 focus:border-emerald-600'
                          }`}
                      />

                      {/* Realtime Area Validation Banner & Progress Gauge */}
                      {(() => {
                        const val = getParentAreaValidation();
                        if (!val || val.parentArea === 0) return null;
                        const percentage = Math.min(100, Math.round((val.totalAreaAfter / val.parentArea) * 100));

                        return (
                          <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600">
                                Tổng tích lũy sau nhập: <b>{val.totalAreaAfter.toFixed(1)} / {val.parentArea} ha</b>
                              </span>
                              <span className={`font-bold ${val.isWarning ? 'text-amber-700' : 'text-emerald-700'}`}>
                                {percentage}% dung lượng {val.parentType}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${val.isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                                  }`}
                                style={{ width: `${Math.min(100, (val.totalAreaAfter / val.parentArea) * 100)}%` }}
                              />
                            </div>

                            {/* Warning Box if exceeded */}
                            {val.isWarning && (
                              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 animate-in zoom-in-95 duration-150 shadow-xs">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                  <p className="font-bold text-[11px] text-amber-800 uppercase tracking-tight">
                                    Cảnh báo vượt hạn mức diện tích
                                  </p>
                                  <p className="text-[11px] text-amber-700 leading-snug">
                                    {val.warningMessage}
                                  </p>
                                  <p className="text-[10px] text-slate-500 italic">
                                    * Hệ thống vẫn cho phép nhập và lưu dữ liệu. Vui lòng kiểm tra lại số liệu thực địa.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* CHILD HIERARCHY SELECT & DETAIL CARD (Xí nghiệp -> Nông trường -> Lô -> Thửa) */}
                  {(() => {
                    const childInfo = getChildHierarchyInfo();
                    if (!childInfo) return null;

                    const currentArea = parseFloat(formData.areaHa) || 0;
                    const isOverChildLimit = currentArea > 0 && (childInfo.totalChildArea - currentArea > 0.001);

                    return (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                            <Layers className="w-4 h-4 text-emerald-700" />
                            <span>Danh sách {childInfo.childTypePlural} trực thuộc ({childInfo.childList.length})</span>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              isOverChildLimit
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            Tổng DT {childInfo.childTypePlural.toLowerCase()}: <b>{childInfo.totalChildArea.toLocaleString('vi-VN')} ha</b>
                          </span>
                        </div>

                        {/* Select dropdown of child items */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Chọn {childInfo.childType.toLowerCase()} để xem nhanh:
                          </label>
                          <select
                            value={selectedChildInfo}
                            onChange={(e) => setSelectedChildInfo(e.target.value)}
                            className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white focus:outline-none focus:border-emerald-600 font-medium"
                          >
                            <option value="">
                              -- {childInfo.childList.length > 0
                                ? `Xem tất cả ${childInfo.childList.length} ${childInfo.childTypePlural} (Tổng: ${childInfo.totalChildArea.toLocaleString('vi-VN')} ha)`
                                : `Chưa có ${childInfo.childTypePlural} trực thuộc`} --
                            </option>
                            {childInfo.childList.map((child, idx) => (
                              <option key={child.id} value={child.id}>
                                {idx + 1}. [{child.code}] {child.name} - {child.areaHa !== undefined ? `${child.areaHa.toLocaleString('vi-VN')} ha` : 'Chưa có DT'} ({child.status === 'HOAT_DONG' ? 'Hoạt động' : 'Tạm dừng'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Mini table / details of the children list */}
                        {childInfo.childList.length > 0 ? (
                          <div className="max-h-36 overflow-y-auto rounded border border-slate-200 bg-white">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                                <tr className="border-b border-slate-200">
                                  <th className="py-1 px-2 text-center w-8">#</th>
                                  <th className="py-1 px-2">Mã {childInfo.childType}</th>
                                  <th className="py-1 px-2">Tên {childInfo.childType}</th>
                                  <th className="py-1 px-2 text-right">Diện tích</th>
                                  <th className="py-1 px-2 text-center">Trạng thái</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {childInfo.childList
                                  .filter((child) => !selectedChildInfo || child.id === selectedChildInfo)
                                  .map((child, idx) => (
                                    <tr key={child.id} className="hover:bg-slate-50">
                                      <td className="py-1 px-2 text-center text-slate-500">{idx + 1}</td>
                                      <td className="py-1 px-2 font-mono font-semibold text-emerald-800 text-[10px]">{child.code}</td>
                                      <td className="py-1 px-2 text-slate-800 font-medium">{child.name}</td>
                                      <td className="py-1 px-2 text-right font-bold text-slate-700">
                                        {child.areaHa !== undefined ? `${child.areaHa.toLocaleString('vi-VN')} ha` : '-'}
                                      </td>
                                      <td className="py-1 px-2 text-center">
                                        <span
                                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                            child.status === 'HOAT_DONG' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                          }`}
                                        >
                                          {child.status === 'HOAT_DONG' ? 'Hoạt động' : 'Tạm dừng'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-2 text-center text-[11px] text-slate-400 italic bg-white rounded border border-dashed border-slate-200">
                            Chưa có {childInfo.childTypePlural.toLowerCase()} nào trực thuộc đơn vị này.
                          </div>
                        )}

                        {/* Over-limit Warning if children sum > parent area */}
                        {isOverChildLimit && (
                          <div className="p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-xs">
                            <div className="flex items-start gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <span>
                                Tổng diện tích {childInfo.childTypePlural.toLowerCase()} con (<b>{childInfo.totalChildArea.toLocaleString('vi-VN')} ha</b>) đang vượt quá diện tích đơn vị cha (<b>{currentArea.toLocaleString('vi-VN')} ha</b>)!
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, areaHa: String(childInfo.totalChildArea) })}
                              className="shrink-0 px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] rounded transition-colors cursor-pointer"
                              title="Tự động cập nhật diện tích đơn vị cha bằng tổng diện tích các đơn vị con"
                            >
                              Khớp Ha ngay
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {activeTab === 'xi-nghiep' && (
                    <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-tight">
                          Thông tin Khu vực địa lý trực thuộc
                        </span>
                        <span className="text-[10px] text-emerald-600 font-medium">Đồng bộ CSDL Khu vực</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Mã khu vực (Viết tắt)
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            data-lpignore="true"
                            placeholder="VD: TE / DP / LP / BP"
                            value={formData.regionCode || ''}
                            onChange={(e) => {
                              const rCode = e.target.value.toUpperCase();
                              setFormData({
                                ...formData,
                                regionCode: rCode,
                                description: rCode,
                                regionName: formData.regionName || (rCode ? `Khu vực ${formData.name || rCode} (${rCode})` : ''),
                              });
                            }}
                            className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none uppercase font-mono font-bold text-emerald-800"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Tên khu vực địa lý
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            data-lpignore="true"
                            placeholder="VD: Khu vực Test (TE)"
                            value={formData.regionName || ''}
                            onChange={(e) => setFormData({ ...formData, regionName: e.target.value })}
                            className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none font-medium text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mô tả / Ghi chú</label>
                    <textarea
                      rows={2}
                      autoComplete="off"
                      data-lpignore="true"
                      placeholder="Ghi chú thêm..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Trạng thái hoạt động</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'HOAT_DONG' })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          formData.status === 'HOAT_DONG'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-xs ring-1 ring-emerald-500 font-bold'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${formData.status === 'HOAT_DONG' ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`} />
                        Hoạt động
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, status: 'TAM_DUNG' })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          formData.status === 'TAM_DUNG'
                            ? 'bg-rose-50 text-rose-700 border-rose-500 shadow-xs ring-1 ring-rose-500 font-bold'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${formData.status === 'TAM_DUNG' ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-slate-300'}`} />
                        Không hoạt động
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded font-semibold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
                >
                  {formMode === 'CREATE' ? 'Tạo danh mục' : 'Lưu cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED SAFE DELETE CONFIRMATION MODAL (CẢNH BÁO XÓA DÀNH CHO ADMIN) */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-200 animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              {/* Pulsing Warning Icon */}
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full mx-auto flex items-center justify-center shadow-inner ring-8 ring-red-50">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xác nhận xóa {itemToDelete.type}?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Đặc quyền Admin: Hành động này sẽ loại bỏ vĩnh viễn dữ liệu khỏi hệ thống.
                </p>
              </div>

              {/* Item Info Box */}
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Loại danh mục:</span>
                  <span className="font-bold text-red-700">{itemToDelete.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Mã định danh:</span>
                  <span className="font-mono font-bold text-slate-800">{itemToDelete.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-600">Tên hiển thị:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{itemToDelete.name}</span>
                </div>
              </div>

              <div className="text-[11px] text-amber-700 font-medium bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-left flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <b>Cảnh báo an toàn:</b> Dữ liệu sau khi xóa sẽ không thể phục hồi. Hãy đảm bảo danh mục này không còn xe hoặc phiếu lệnh đang liên kết!
                </span>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 transition-colors"
              >
                Hủy bỏ (Không xóa)
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Đồng ý xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10-MINUTE PERIODIC REMINDER MODAL POPUP */}
      {isPeriodicReminderOpen && totalOverLimitCount > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-amber-500 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full mx-auto flex items-center justify-center shadow-inner ring-8 ring-amber-50">
                <AlertTriangle className="w-9 h-9 animate-pulse text-amber-600" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block mb-1.5">
                  🔔 THÔNG BÁO ĐỊNH KỲ (10 PHÚT/LẦN)
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Phát hiện {totalOverLimitCount} mục vượt hạn mức diện tích
                </h3>
                <p className="text-xs text-red-600 font-bold mt-1">
                  (Dữ liệu chưa được lưu vào Database)
                </p>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 text-left">
                  Các mục đang bị vượt diện tích chỉ hiển thị tạm thời trên giao diện (màu vàng) để quản trị viên theo dõi. <b className="text-slate-900 font-semibold">Chỉ khi nào hiệu chỉnh đúng điều kiện</b> thì hệ thống mới chính thức lưu vào cơ sở dữ liệu.
                </p>
                <div className="space-y-2 text-left pt-1">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Các danh mục đang có lỗi vượt định mức:
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {tabOverLimitStats.map((stat) => (
                      <button
                        key={stat.id}
                        type="button"
                        onClick={() => {
                          setIsPeriodicReminderOpen(false);
                          setSearchParams({ tab: stat.id, status: 'OVER_LIMIT' });
                          setFilterStatus('OVER_LIMIT');
                        }}
                        className="w-full p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center justify-between text-xs font-bold text-amber-950 transition-colors shadow-xs"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>Mục: <b>{stat.label}</b> ({stat.count} đơn vị quá hạn mức)</span>
                        </span>
                        <span className="px-2 py-0.5 bg-amber-600 text-white rounded text-[10px] font-bold">
                          👉 Sửa ngay
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPeriodicReminderOpen(false)}
                  className="w-full px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-xs text-slate-700 transition-colors"
                >
                  Đóng thông báo (Nhắc lại sau 10 phút)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
