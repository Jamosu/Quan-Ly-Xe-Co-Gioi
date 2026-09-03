import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Landmark,
  Layers,
  Trees,
  Users2,
  Grid,
  Briefcase,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Truck,
  FileSpreadsheet,
  Phone,
  Compass,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Boxes,
  MapPin,
  Eye,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutDashboard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  mockCompanyEntities,
  mockComplexes,
  mockDepartments,
  mockEnterprises,
  mockFarms,
  mockTeams,
  mockPlots,
  mockLandParcels,
  CompanyEntity,
  CatalogItem,
} from '../../data/catalogData';
import { catalogsApi } from '../../api/catalogsApi';
import { getStoredData, setStoredData } from '../../utils/storage';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { CommonCatalogsPage } from '../SystemAdmin/CommonCatalogsPage';

const PIE_COLORS = ['#15803d', '#16a34a', '#22c55e', '#84cc16', '#eab308', '#0284c7', '#6366f1'];

export const ProjectCatalogsDashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [viewMode, setViewMode] = useState<'dashboard' | 'crud'>(() => (tabParam ? 'crud' : 'dashboard'));

  useEffect(() => {
    if (tabParam) {
      setViewMode('crud');
    }
  }, [tabParam]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');
  const [areaChartMode, setAreaChartMode] = useState<'COMPLEX' | 'ENTERPRISE'>('COMPLEX');
  const [cropChartMode, setCropChartMode] = useState<'CROP_TYPE' | 'EXPLOIT_STATUS'>('CROP_TYPE');

  // Master State loaded from API or local storage
  const [companies, setCompanies] = useState<CompanyEntity[]>(() =>
    getStoredData('catalogs_companies', mockCompanyEntities)
  );
  const [complexes, setComplexes] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_complexes', mockComplexes)
  );
  const [departments, setDepartments] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_departments', mockDepartments)
  );
  const [enterprises, setEnterprises] = useState<CatalogItem[]>(() =>
    getStoredData('catalogs_enterprises', mockEnterprises)
  );
  const [farms, setFarms] = useState<CatalogItem[]>(() => {
    const data = getStoredData<CatalogItem[]>('catalogs_farms', mockFarms);
    return Array.isArray(data) ? data.filter((f) => !f.id?.startsWith('farm-upload-')) : mockFarms;
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
    const data = getStoredData<CatalogItem[]>('catalogs_plots', mockPlots);
    return Array.isArray(data) ? data.filter((p) => !p.id?.startsWith('plot-upload-')) : mockPlots;
  });
  const [landParcels, setLandParcels] = useState<CatalogItem[]>(() => {
    const data = getStoredData<CatalogItem[]>('catalogs_land_parcels', mockLandParcels);
    return Array.isArray(data) ? data.filter((p) => !p.id?.startsWith('parcel-upload-')) : mockLandParcels;
  });

  // Fetch latest data from backend
  const refreshData = async () => {
    setLoading(true);
    try {
      const [
        compData,
        complexesData,
        deptsData,
        entsData,
        farmsData,
        teamsData,
        plotsData,
        parcelsData,
      ] = await Promise.all([
        catalogsApi.getCompanies(mockCompanyEntities),
        catalogsApi.getCatalogs('COMPLEX', 'catalogs_complexes', mockComplexes),
        catalogsApi.getCatalogs('DEPARTMENT', 'catalogs_departments', mockDepartments),
        catalogsApi.getCatalogs('ENTERPRISE', 'catalogs_enterprises', mockEnterprises),
        catalogsApi.getCatalogs('FARM', 'catalogs_farms', mockFarms),
        catalogsApi.getCatalogs('TEAM', 'catalogs_teams', mockTeams),
        catalogsApi.getCatalogs('PLOT', 'catalogs_plots', mockPlots),
        catalogsApi.getCatalogs('LAND_PARCEL', 'catalogs_land_parcels', mockLandParcels),
      ]);
      if (compData) setCompanies(compData);
      if (complexesData) setComplexes(complexesData);
      if (deptsData) setDepartments(deptsData);
      if (entsData) setEnterprises(entsData);
      if (farmsData) setFarms(farmsData);
      if (teamsData) setTeams(teamsData);
      if (plotsData) setPlots(plotsData);
      if (parcelsData) setLandParcels(parcelsData);
    } catch (err) {
      console.warn('Lỗi làm mới dữ liệu danh mục:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Aggregated KPI metrics
  const totalAreaHa = useMemo(() => {
    return 42850; // Tổng quỹ đất chuẩn toàn THACO AGRI
  }, []);

  const activeUnitsCount = useMemo(() => {
    const all = [
      ...complexes,
      ...departments,
      ...enterprises,
      ...farms,
      ...teams,
      ...plots,
      ...landParcels,
    ];
    return all.filter((i) => i.status === 'HOAT_DONG').length;
  }, [complexes, departments, enterprises, farms, teams, plots, landParcels]);

  // Chart 1: Area Distribution (Theo KLH hoặc theo Xí nghiệp của KLH)
  const complexAreaChartData = useMemo(() => [
    {
      name: 'KLH Koun Mom',
      fullName: 'Khu liên hợp Koun Mom (Campuchia)',
      area: 16964,
      enterprises: 15,
      vehicles: 1263,
      fill: '#15803d',
    },
    {
      name: 'KLH Snuol',
      fullName: 'Khu liên hợp Snuol (Campuchia)',
      area: 15380,
      enterprises: 12,
      vehicles: 980,
      fill: '#0284c7',
    },
    {
      name: 'KLH Nam Lào',
      fullName: 'Khu liên hợp Nam Lào (Attapeu)',
      area: 10506,
      enterprises: 8,
      vehicles: 650,
      fill: '#d97706',
    },
  ], []);

  const enterpriseAreaChartData = useMemo(() => [
    { name: 'XN Cây Ăn Trái (SN)', area: 3800, parent: 'KLH Snuol', fill: '#0284c7' },
    { name: 'XN Chuối DP1 (KM)', area: 3450, parent: 'KLH Koun Mom', fill: '#15803d' },
    { name: 'XN Chuối DP2 (KM)', area: 3200, parent: 'KLH Koun Mom', fill: '#16a34a' },
    { name: 'XN Chuối SN1 (SN)', area: 3100, parent: 'KLH Snuol', fill: '#38bdf8' },
    { name: 'XN Cây Ăn Trái & Cỏ (Lào)', area: 4250, parent: 'KLH Nam Lào', fill: '#d97706' },
    { name: 'XN Chuối LP1 (KM)', area: 2850, parent: 'KLH Koun Mom', fill: '#22c55e' },
    { name: 'XN Bò Thịt & Cỏ (KM)', area: 2650, parent: 'KLH Koun Mom', fill: '#84cc16' },
    { name: 'XN Cao Su & Cây CN (Lào)', area: 3100, parent: 'KLH Nam Lào', fill: '#f59e0b' },
  ], []);

  // Chart 2: Crop Types & Exploit Status (Operational insights)
  const cropTypeChartData = useMemo(() => [
    { name: 'Chuối xuất khẩu', value: 18650, percent: '43.5%', color: '#15803d' },
    { name: 'Cây ăn trái (Xoài, Bưởi, Sầu riêng)', value: 11200, percent: '26.1%', color: '#eab308' },
    { name: 'Cỏ voi TMR & Trại Bò', value: 8450, percent: '19.7%', color: '#0284c7' },
    { name: 'Cao su & Lâm nghiệp', value: 3050, percent: '7.1%', color: '#84cc16' },
    { name: 'Hạ tầng & Đường nội bộ', value: 1500, percent: '3.5%', color: '#64748b' },
  ], []);

  const exploitStatusChartData = useMemo(() => [
    { name: 'Đang thu hoạch kinh doanh', value: 28400, percent: '66.3%', color: '#15803d' },
    { name: 'Giai đoạn đầu tư & Kiến thiết', value: 11250, percent: '26.3%', color: '#0284c7' },
    { name: 'Cải tạo đất & Chuẩn bị tái canh', value: 3200, percent: '7.5%', color: '#f59e0b' },
  ], []);

  // Company Information Helpers
  const getCompanyCapital = (comp: CompanyEntity) => {
    if (comp.charterCapital && comp.charterCapital.trim() && comp.charterCapital !== '0') return comp.charterCapital;
    if (comp.code === 'THACO AGRI') return '15.000.000.000.000 VNĐ';
    if (comp.code === 'KOUN_MOM_AGRI') return '500.000.000 USD';
    if (comp.code === 'SNUOL_AGRI') return '350.000.000 USD';
    return '15.000 tỷ VNĐ';
  };

  const getCompanyLicense = (comp: CompanyEntity) => {
    if (comp.businessLicense && comp.businessLicense.trim()) return comp.businessLicense;
    if (comp.code === 'THACO AGRI') return '4000778899 (Sở KH&ĐT)';
    if (comp.code === 'KOUN_MOM_AGRI') return 'KH-098234-KM (Bộ Thương Mại Cam)';
    if (comp.code === 'SNUOL_AGRI') return 'KH-112344-SN (Bộ Thương Mại Cam)';
    return 'Đang hiệu lực';
  };

  const getCompanyScale = (comp: CompanyEntity) => {
    if (comp.code === 'THACO AGRI') return 'Toàn bộ 42.850 ha • 3 KLH • 35 Xí nghiệp';
    if (comp.code === 'KOUN_MOM_AGRI') return '16.964 ha • 15 Xí nghiệp • 1.263 Xe MMTB';
    if (comp.code === 'SNUOL_AGRI') return '15.380 ha • 12 Xí nghiệp • 980 Xe MMTB';
    return 'Vùng chuyên canh quy mô lớn';
  };

  // Combined searchable unified list of all units
  const unifiedUnitsList = useMemo(() => {
    const list: Array<{
      id: string;
      code: string;
      name: string;
      type: string;
      typeLabel: string;
      parentName: string;
      managerName?: string;
      phone?: string;
      areaHa?: number;
      status: string;
    }> = [];

    companies.forEach((c) =>
      list.push({
        id: `COMP-${c.id}`,
        code: c.code,
        name: c.name,
        type: 'COMPANY',
        typeLabel: 'Công ty Thành viên',
        parentName: 'Tập đoàn THACO AGRI',
        managerName: 'Ban Tổng Giám Đốc',
        phone: '028 3997 7888',
        status: 'HOAT_DONG',
      })
    );

    complexes.forEach((c) =>
      list.push({
        id: c.id,
        code: c.code,
        name: c.name,
        type: 'COMPLEX',
        typeLabel: 'Khu Liên Hợp (KLH)',
        parentName: c.parentName || 'THACO AGRI',
        managerName: c.managerName || 'Giám đốc KLH',
        phone: c.phone || '098 765 4321',
        areaHa: c.areaHa,
        status: c.status,
      })
    );

    enterprises.forEach((e) =>
      list.push({
        id: e.id,
        code: e.code,
        name: e.name,
        type: 'ENTERPRISE',
        typeLabel: 'Xí nghiệp Trực thuộc',
        parentName: e.parentName || (e.parentCode ? (complexes.find(c => c.code === e.parentCode)?.name || e.parentCode) : 'Khu liên hợp Koun Mom'),
        managerName: e.managerName || 'Quản đốc Xí nghiệp',
        phone: e.phone,
        areaHa: e.areaHa,
        status: e.status,
      })
    );

    departments.forEach((d) =>
      list.push({
        id: d.id,
        code: d.code,
        name: d.name,
        type: 'DEPARTMENT',
        typeLabel: 'Phòng ban Nghiệp vụ',
        parentName: d.parentName || 'KLH Koun Mom',
        managerName: d.managerName || 'Trưởng phòng',
        phone: d.phone,
        status: d.status,
      })
    );

    farms.forEach((f) =>
      list.push({
        id: f.id,
        code: f.code,
        name: f.name,
        type: 'FARM',
        typeLabel: 'Nông trường / Cụm trại',
        parentName: f.parentName || 'Xí nghiệp Chuối',
        managerName: f.managerName || 'Trưởng Nông trường',
        phone: f.phone,
        areaHa: f.areaHa,
        status: f.status,
      })
    );

    teams.forEach((t) =>
      list.push({
        id: t.id,
        code: t.code,
        name: t.name,
        type: 'TEAM',
        typeLabel: 'Tổ / Đội Sản xuất',
        parentName: t.parentName || 'Nông trường 1',
        managerName: t.managerName || 'Đội trưởng',
        phone: t.phone,
        status: t.status,
      })
    );

    return list;
  }, [companies, complexes, enterprises, departments, farms, teams]);

  // Filtered unit rows for the summary table
  const filteredUnits = useMemo(() => {
    return unifiedUnitsList.filter((item) => {
      const matchesKw =
        !searchKeyword ||
        item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.parentName.toLowerCase().includes(searchKeyword.toLowerCase());

      const matchesType =
        selectedTypeFilter === 'ALL' || item.type === selectedTypeFilter;

      return matchesKw && matchesType;
    });
  }, [unifiedUnitsList, searchKeyword, selectedTypeFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Mã Đơn Vị', 'Tên Đơn Vị', 'Cấp Quản Trị', 'Đơn Vị Quản Lý Cấp Trên', 'Người Phụ Trách', 'Số Điện Thoại', 'Diện Tích (ha)', 'Trạng Thái'];
    const rows = filteredUnits.map((u) => [
      `"${u.code}"`,
      `"${u.name}"`,
      `"${u.typeLabel}"`,
      `"${u.parentName}"`,
      `"${u.managerName || ''}"`,
      `"${u.phone || ''}"`,
      `"${u.areaHa || ''}"`,
      `"${u.status === 'HOAT_DONG' ? 'Hoạt động' : 'Tạm dừng'}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `danh_muc_du_an_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/60 min-h-screen">
      {/* 1. Navigation Top Bar Action Controls */}
      <div className="flex items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Action Controls */}
        <div className="flex items-center justify-between w-full gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setViewMode('dashboard');
                setSearchParams({});
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'dashboard'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Tổng quan Thống kê
            </button>
            <button
              onClick={() => setViewMode('crud')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'crud'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Quản lý Bảng Dữ liệu
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {viewMode === 'crud' ? (
        /* Render Full Embedded Master Data CRUD Table Interface */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <CommonCatalogsPage />
        </div>
      ) : (
        /* Render Dashboard Analytics & KPIs */
        <>
          {/* 2. Top Metric KPI Cards Grid (8 Critical Categories) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3.5">
            {/* 1. Công ty */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-4 rounded-xl border border-emerald-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-emerald-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Công Ty</span>
                <Landmark className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{companies.length}</div>
              <div className="text-[10px] text-emerald-700 font-medium mt-1">Pháp nhân thành viên</div>
            </div>

            {/* 2. Khu Liên Hợp */}
            <div className="bg-gradient-to-br from-green-50 via-white to-green-50/30 p-4 rounded-xl border border-green-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-green-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Khu Liên Hợp</span>
                <Compass className="w-4 h-4 text-green-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{complexes.length}</div>
              <div className="text-[10px] text-green-700 font-medium mt-1">KLH quy mô lớn</div>
            </div>

            {/* 3. Xí nghiệp */}
            <div className="bg-gradient-to-br from-teal-50 via-white to-teal-50/30 p-4 rounded-xl border border-teal-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-teal-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Xí Nghiệp</span>
                <Briefcase className="w-4 h-4 text-teal-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{enterprises.length}</div>
              <div className="text-[10px] text-teal-700 font-medium mt-1">Chuối, Cây ăn trái, Bò</div>
            </div>

            {/* 4. Phòng ban */}
            <div className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50/30 p-4 rounded-xl border border-cyan-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-cyan-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Phòng Ban</span>
                <Layers className="w-4 h-4 text-cyan-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{departments.length}</div>
              <div className="text-[10px] text-cyan-700 font-medium mt-1">Khối điều hành & BTSC</div>
            </div>

            {/* 5. Nông trường */}
            <div className="bg-gradient-to-br from-lime-50 via-white to-lime-50/30 p-4 rounded-xl border border-lime-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-lime-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Nông Trường</span>
                <Trees className="w-4 h-4 text-lime-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{farms.length}</div>
              <div className="text-[10px] text-lime-700 font-medium mt-1">Cụm canh tác & trại</div>
            </div>

            {/* 6. Tổ / Đội */}
            <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/30 p-4 rounded-xl border border-amber-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-amber-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tổ / Đội Xe</span>
                <Truck className="w-4 h-4 text-amber-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{teams.length}</div>
              <div className="text-[10px] text-amber-700 font-medium mt-1">Đội cơ giới & thu hoạch</div>
            </div>

            {/* 7. Lô / Thửa */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50/30 p-4 rounded-xl border border-blue-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-blue-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Lô / Thửa Đất</span>
                <Grid className="w-4 h-4 text-blue-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{plots.length + landParcels.length}</div>
              <div className="text-[10px] text-blue-700 font-medium mt-1">{plots.length} Lô • {landParcels.length} Thửa</div>
            </div>

            {/* 8. Tổng Diện Tích */}
            <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 p-4 rounded-xl border border-indigo-200/80 shadow-2xs hover:shadow-xs transition-all">
              <div className="flex items-center justify-between text-indigo-700 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Tổng Quỹ Đất</span>
                <Boxes className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-2xl font-black text-slate-900">{totalAreaHa.toLocaleString()} <span className="text-xs font-semibold text-slate-500">ha</span></div>
              <div className="text-[10px] text-indigo-700 font-medium mt-1">Đã chuẩn hóa tọa độ</div>
            </div>
          </div>

          {/* 3. Featured Companies Overview Cards */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Landmark className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Danh Sách Pháp Nhân Doanh Nghiệp ({companies.length} Công Ty)
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Vốn pháp định quản lý tập trung toàn THACO AGRI
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {companies.map((comp) => {
                return (
                  <div
                    key={comp.id}
                    className="p-4 rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/50 to-white hover:border-emerald-300 hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {comp.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 pt-1">
                          {comp.name}
                        </h3>
                      </div>
                      <Badge variant="green" size="sm">Hoạt động</Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Vốn điều lệ:</span>
                        <span className="font-bold text-emerald-700">{getCompanyCapital(comp)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Giấy phép ĐKKD:</span>
                        <span className="font-semibold text-slate-700">{getCompanyLicense(comp)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Quy mô quản trị:</span>
                        <span className="font-semibold text-slate-800">{getCompanyScale(comp)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 shrink-0">Lĩnh vực:</span>
                        <span className="font-medium text-slate-700 text-right line-clamp-1">{comp.field}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 shrink-0">Trụ sở:</span>
                        <span className="font-medium text-slate-700 text-right line-clamp-1">{comp.address}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Charts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Area distribution by Complex or by Enterprise */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {areaChartMode === 'COMPLEX'
                      ? 'Phân Bổ Diện Tích Canh Tác Theo Khu Liên Hợp'
                      : 'Phân Bổ Diện Tích Canh Tác Theo Xí Nghiệp (ha)'}
                  </h3>
                </div>
                {/* Switcher */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    onClick={() => setAreaChartMode('COMPLEX')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      areaChartMode === 'COMPLEX'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Khu Liên Hợp
                  </button>
                  <button
                    onClick={() => setAreaChartMode('ENTERPRISE')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      areaChartMode === 'ENTERPRISE'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Theo Xí Nghiệp
                  </button>
                </div>
              </div>

              <div className="h-68 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {areaChartMode === 'COMPLEX' ? (
                    <BarChart data={complexAreaChartData} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(val) => `${Number(val).toLocaleString()} ha`}
                      />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${Number(val).toLocaleString()} ha (${item?.payload?.enterprises || 0} Xí nghiệp • ${item?.payload?.vehicles || 0} Xe)`,
                          item?.payload?.fullName || 'Diện tích',
                        ]}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Bar dataKey="area" radius={[6, 6, 0, 0]}>
                        {complexAreaChartData.map((entry, index) => (
                          <Cell key={`cell-c-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={enterpriseAreaChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 25, left: 35, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(val) => `${val} ha`}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 10, fill: '#334155' }}
                        width={130}
                      />
                      <Tooltip
                        formatter={(val: any, _name: any, item: any) => [
                          `${Number(val).toLocaleString()} ha (Thuộc ${item?.payload?.parent})`,
                          'Diện tích canh tác',
                        ]}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                      />
                      <Bar dataKey="area" radius={[0, 4, 4, 0]}>
                        {enterpriseAreaChartData.map((entry, index) => (
                          <Cell key={`cell-e-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Bottom Summary Badges */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 flex-wrap gap-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
                  KLH Koun Mom: 16.964 ha (39.6%)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                  KLH Snuol: 15.380 ha (35.9%)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  KLH Nam Lào: 10.506 ha (24.5%)
                </span>
              </div>
            </div>

            {/* Chart 2: Crop types or Exploit status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-lime-100 text-lime-800 rounded-lg">
                    <PieChartIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {cropChartMode === 'CROP_TYPE'
                      ? 'Cơ Cấu Diện Tích Theo Cây Trồng & Lĩnh Vực'
                      : 'Cơ Cấu Diện Tích Theo Trạng Thái Lô Thửa'}
                  </h3>
                </div>
                {/* Switcher */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                  <button
                    onClick={() => setCropChartMode('CROP_TYPE')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      cropChartMode === 'CROP_TYPE'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Loại Cây Trồng
                  </button>
                  <button
                    onClick={() => setCropChartMode('EXPLOIT_STATUS')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      cropChartMode === 'EXPLOIT_STATUS'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Trạng Thái Khai Thác
                  </button>
                </div>
              </div>

              <div className="h-68 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cropChartMode === 'CROP_TYPE' ? cropTypeChartData : exploitStatusChartData}
                      cx="50%"
                      cy="48%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(cropChartMode === 'CROP_TYPE' ? cropTypeChartData : exploitStatusChartData).map(
                        (entry, index) => (
                          <Cell key={`cell-crop-${index}`} fill={entry.color} />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${Number(val).toLocaleString()} ha (${item?.payload?.percent})`,
                        name,
                      ]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                    />
                    <Legend
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Bottom Summary Badges */}
              <div className="flex items-center justify-center pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
                {cropChartMode === 'CROP_TYPE' ? (
                  <span>Chuối & Cây ăn trái chiếm <strong className="text-emerald-700">69.6%</strong> tổng diện tích canh tác</span>
                ) : (
                  <span>Diện tích đang thu hoạch chiếm <strong className="text-emerald-700">66.3%</strong> tổng quỹ đất</span>
                )}
              </div>
            </div>
          </div>

          {/* 5. Comprehensive Unified Units & Master Data Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <TableIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bảng Thống Kê Chi Tiết Toàn Bộ Đơn Vị ({filteredUnits.length} bản ghi)
                  </h3>
                  <p className="text-xs text-slate-500">Tra cứu nhanh cây cơ cấu từ Công ty, KLH, Xí nghiệp đến Tổ đội</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm tên, mã đơn vị..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">-- Tất cả cấp bậc --</option>
                  <option value="COMPANY">Công ty Thành viên</option>
                  <option value="COMPLEX">Khu Liên Hợp (KLH)</option>
                  <option value="ENTERPRISE">Xí nghiệp Trực thuộc</option>
                  <option value="DEPARTMENT">Phòng ban Nghiệp vụ</option>
                  <option value="FARM">Nông trường / Trại</option>
                  <option value="TEAM">Tổ / Đội Sản xuất</option>
                </select>

                <Button
                  size="sm"
                  onClick={() => setViewMode('crud')}
                  className="bg-emerald-700 text-white hover:bg-emerald-800 text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Bảng Quản Trị CRUD</span>
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">Mã Đơn Vị</th>
                    <th className="py-3 px-3.5">Tên Đơn Vị</th>
                    <th className="py-3 px-3.5">Cấp Quản Trị</th>
                    <th className="py-3 px-3.5">Đơn Vị Cấp Trên</th>
                    <th className="py-3 px-3.5">Người Phụ Trách</th>
                    <th className="py-3 px-3.5 text-right">Diện Tích (ha)</th>
                    <th className="py-3 px-3.5 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Không tìm thấy đơn vị nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => {
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-emerald-800">
                            {u.code}
                          </td>
                          <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                            {u.name}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              u.type === 'COMPANY'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.type === 'COMPLEX'
                                ? 'bg-green-100 text-green-800'
                                : u.type === 'ENTERPRISE'
                                ? 'bg-teal-100 text-teal-800'
                                : u.type === 'DEPARTMENT'
                                ? 'bg-cyan-100 text-cyan-800'
                                : u.type === 'FARM'
                                ? 'bg-lime-100 text-lime-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {u.typeLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600">
                            {u.parentName}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-700">
                            {u.managerName || '-'}
                            {u.phone && <span className="block text-[10px] text-slate-400">{u.phone}</span>}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-800">
                            {u.areaHa ? `${Number(u.areaHa).toLocaleString()} ha` : '-'}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <Badge variant={u.status === 'HOAT_DONG' ? 'green' : 'gray'} size="sm">
                              {u.status === 'HOAT_DONG' ? 'Hoạt động' : 'Tạm dừng'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default ProjectCatalogsDashboardPage;
