import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { DataTable, Column } from '../../components/data-display/DataTable';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import {
  MapPin,
  Plus,
  Download,
  Navigation,
  Layers,
  Building2,
  HardHat,
  Truck,
  Tractor,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import {
  AgriculturalPlotItem,
  ConstructionSiteItem,
  TransportRouteItem,
  getStoredPlots,
  getStoredConstructionSites,
  getStoredTransportRoutes,
  getNextPlotCode,
  getNextSiteCode,
  getNextRouteCode,
} from '../../data/locationCatalogData';
import { mockEnterprises, mockFarms } from '../../data/catalogData';
import { SearchableSelect, SelectOption } from '../../components/common/SearchableSelect';

export type LocationCatalogTab = 'plots' | 'construction' | 'transport';

interface PlotsRoutesPageProps {
  defaultTab?: LocationCatalogTab;
}

const KLH_OPTIONS = [
  { code: 'ALL', name: 'Tất cả Khu liên hợp' },
  { code: 'KOUN_MOM', name: 'Khu liên hợp Koun Mom' },
  { code: 'SNOUL', name: 'Khu liên hợp Snoul' },
  { code: 'NAM_LAO', name: 'Khu liên hợp Nam Lào' },
];

export const PlotsRoutesPage: React.FC<PlotsRoutesPageProps> = ({ defaultTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định activeTab dựa trên URL pathname hoặc query param ?tab=
  const activeTab: LocationCatalogTab = useMemo(() => {
    if (location.pathname.endsWith('/nong-nghiep')) return 'plots';
    if (location.pathname.endsWith('/cong-trinh')) return 'construction';
    if (location.pathname.endsWith('/van-chuyen')) return 'transport';
    if (defaultTab) return defaultTab;
    const tabParam = searchParams.get('tab') as LocationCatalogTab;
    if (tabParam && ['plots', 'construction', 'transport'].includes(tabParam)) {
      return tabParam;
    }
    return 'plots';
  }, [location.pathname, defaultTab, searchParams]);

  const handleTabChange = (tab: LocationCatalogTab) => {
    if (location.pathname.includes('/nong-nghiep') || location.pathname.includes('/cong-trinh') || location.pathname.includes('/van-chuyen')) {
      const suffix = tab === 'plots' ? 'nong-nghiep' : tab === 'construction' ? 'cong-trinh' : 'van-chuyen';
      navigate(`/danh-muc/lo-thua-tuyen-duong/${suffix}`);
    } else {
      setSearchParams({ tab });
    }
    setSearch('');
  };

  // State Dữ liệu 3 phân hệ
  const [plots, setPlots] = useState<AgriculturalPlotItem[]>(getStoredPlots);
  const [sites, setSites] = useState<ConstructionSiteItem[]>(getStoredConstructionSites);
  const [routes, setRoutes] = useState<TransportRouteItem[]>(getStoredTransportRoutes);

  // Lưu LocalStorage
  useEffect(() => {
    localStorage.setItem('thaco_plots_catalog_v1', JSON.stringify(plots));
  }, [plots]);

  useEffect(() => {
    localStorage.setItem('thaco_construction_sites_catalog_v1', JSON.stringify(sites));
  }, [sites]);

  useEffect(() => {
    localStorage.setItem('thaco_transport_routes_catalog_v1', JSON.stringify(routes));
  }, [routes]);

  // Bộ lọc & Tìm kiếm chung
  const [selectedKLH, setSelectedKLH] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // BỘ LỌC TIÊU CHÍ PHÂN CẤP CHO NÔNG NGHIỆP: KLH ➔ Xí nghiệp ➔ Nông trường ➔ Lô
  const [filterPlotKLH, setFilterPlotKLH] = useState<string>('ALL');
  const [filterPlotEnterprise, setFilterPlotEnterprise] = useState<string>('');
  const [filterPlotFarm, setFilterPlotFarm] = useState<string>('');
  const [filterPlotCode, setFilterPlotCode] = useState<string>('');

  // Modals & Editing Items
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [editingPlot, setEditingPlot] = useState<AgriculturalPlotItem | null>(null);

  // CONTROLLED FORM STATES FOR PLOT MODAL (Hỗ trợ nhập nhanh & Tự tăng dần mã)
  const [plotCode, setPlotCode] = useState('');
  const [plotName, setPlotName] = useState('');
  const [plotComplexCode, setPlotComplexCode] = useState<'KOUN_MOM' | 'SNOUL' | 'NAM_LAO'>('KOUN_MOM');
  const [plotEnterprise, setPlotEnterprise] = useState('Xí nghiệp Chuối DP1');
  const [plotFarm, setPlotFarm] = useState('Nông trường DP1.1');
  const [plotAreaHa, setPlotAreaHa] = useState<number>(25.0);
  const [plotCropType, setPlotCropType] = useState('Chuối Nam Mỹ Foc TR4');
  const [plotStatus, setPlotStatus] = useState<'active' | 'preparing' | 'replanting'>('active');
  const [plotIrrigation, setPlotIrrigation] = useState('Tưới nhỏ giọt bù áp tự động Netafim');
  const [plotSoil, setPlotSoil] = useState('Đất đỏ bazan màu mỡ');
  const [plotNotes, setPlotNotes] = useState('');

  // Other Modals
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<ConstructionSiteItem | null>(null);

  const [showRouteModal, setShowRouteModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRouteItem | null>(null);

  const [detailItem, setDetailItem] = useState<{
    type: LocationCatalogTab;
    data: AgriculturalPlotItem | ConstructionSiteItem | TransportRouteItem;
  } | null>(null);

  // Danh sách Xí nghiệp gợi ý theo Khu liên hợp đang chọn trong Modal
  const enterprisesForModal = useMemo(() => {
    const list = mockEnterprises.filter((e) => e.parentCode === plotComplexCode);
    if (list.length > 0) return list;
    if (plotComplexCode === 'KOUN_MOM') {
      return [
        { code: 'BE01', name: 'Xí nghiệp Chuối DP1' },
        { code: 'BE02', name: 'Xí nghiệp Chuối DP2' },
        { code: 'BE03', name: 'Xí nghiệp Chuối DP3' },
        { code: 'BE04', name: 'Xí nghiệp chuối LP1' },
        { code: 'CAT_DP', name: 'Xí nghiệp Cây ăn trái Daun Penh' },
        { code: 'XN_BO_AD', name: 'Xí nghiệp Chăn nuôi Bò Andong Meas' },
      ];
    }
    if (plotComplexCode === 'SNOUL') {
      return [
        { code: 'BE06', name: 'Xí nghiệp Chuối ERC' },
        { code: 'BE07', name: 'Xí nghiệp Chuối BP1' },
        { code: 'BE08', name: 'Xí nghiệp Chuối BP2' },
        { code: 'BE10', name: 'Xí nghiệp chuối BSA1' },
        { code: 'XN_BO_SN', name: 'Xí nghiệp Chăn nuôi Bò Snoul' },
        { code: 'XN_CS_SN', name: 'Xí nghiệp Cao su Snoul' },
      ];
    }
    return [
      { code: 'BE13', name: 'Xí nghiệp chuối NSA' },
      { code: 'BE14', name: 'Xí nghiệp chuối NK1' },
      { code: 'BE15', name: 'Xí nghiệp Chuối PV' },
      { code: 'XN_BO_NL', name: 'Xí nghiệp Chăn nuôi Bò Nam Lào' },
    ];
  }, [plotComplexCode]);

  // Danh sách Nông trường gợi ý theo Xí nghiệp đang chọn trong Modal
  const farmsForModal = useMemo(() => {
    const ent = enterprisesForModal.find((e) => e.name === plotEnterprise || e.code === plotEnterprise);
    const entCode = ent?.code;
    const list = mockFarms.filter((f) => f.parentCode === entCode || f.parentName === plotEnterprise);
    if (list.length > 0) return list.map((f) => ({ value: f.name, label: `${f.name} (${f.code})` }));

    if (plotComplexCode === 'KOUN_MOM') {
      return [
        { value: 'Nông trường DP1.1', label: 'Nông trường DP1.1' },
        { value: 'Nông trường DP1.2', label: 'Nông trường DP1.2' },
        { value: 'Nông trường Chuối 1', label: 'Nông trường Chuối 1' },
        { value: 'Nông trường Chuối 2', label: 'Nông trường Chuối 2' },
        { value: 'Vùng đệm Cỏ voi Packchong', label: 'Vùng đệm Cỏ voi Packchong' },
        { value: 'Vùng đệm Bắp sinh khối', label: 'Vùng đệm Bắp sinh khối' },
      ];
    }
    if (plotComplexCode === 'SNOUL') {
      return [
        { value: 'Nông trường Chuối Snoul 1', label: 'Nông trường Chuối Snoul 1' },
        { value: 'Nông trường Chuối Snoul 2', label: 'Nông trường Chuối Snoul 2' },
        { value: 'Nông trường Cao su 2', label: 'Nông trường Cao su 2' },
        { value: 'Khu Chăn nuôi Bò Snoul', label: 'Khu Chăn nuôi Bò Snoul' },
      ];
    }
    return [
      { value: 'Nông trường Paksong', label: 'Nông trường Paksong' },
      { value: 'Nông trường Bò Attapeu', label: 'Nông trường Bò Attapeu' },
      { value: 'Nông trường Chuối NSA 1', label: 'Nông trường Chuối NSA 1' },
    ];
  }, [plotComplexCode, plotEnterprise, enterprisesForModal]);

  // Options cho bộ lọc phân cấp ngoài bảng
  const enterprisesForFilter = useMemo(() => {
    const targetKLH = filterPlotKLH !== 'ALL' ? filterPlotKLH : selectedKLH !== 'ALL' ? selectedKLH : null;
    const list = targetKLH ? mockEnterprises.filter((e) => e.parentCode === targetKLH) : mockEnterprises;
    const unique = Array.from(new Set(list.map((e) => e.name)));
    return unique.map((name) => ({ value: name, label: name }));
  }, [filterPlotKLH, selectedKLH]);

  const farmsForFilter = useMemo(() => {
    let list = mockFarms;
    if (filterPlotEnterprise) {
      list = list.filter((f) => f.parentName === filterPlotEnterprise || f.parentCode === filterPlotEnterprise);
    }
    const unique = Array.from(new Set(list.map((f) => f.name)));
    return unique.map((name) => ({ value: name, label: name }));
  }, [filterPlotEnterprise]);

  const plotCodeFilterOptions = useMemo(() => {
    const unique = Array.from(new Set(plots.map((p) => p.code)));
    return unique.map((c) => ({ value: c, label: c }));
  }, [plots]);

  // Mở modal Thêm Lô mới: Tự động tính toán mã tăng dần và phân cấp xí nghiệp/nông trường
  const handleOpenCreatePlot = () => {
    const defaultKLH = (filterPlotKLH !== 'ALL' ? filterPlotKLH : selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM') as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
    const nextCode = getNextPlotCode(defaultKLH, plots);

    const entList = mockEnterprises.filter((e) => e.parentCode === defaultKLH);
    const firstEnt = entList[0]?.name || (defaultKLH === 'SNOUL' ? 'Xí nghiệp Chuối ERC' : defaultKLH === 'NAM_LAO' ? 'Xí nghiệp chuối NSA' : 'Xí nghiệp Chuối DP1');

    const farmList = mockFarms.filter((f) => f.parentCode === entList[0]?.code || f.parentName === firstEnt);
    const firstFarm = farmList[0]?.name || (defaultKLH === 'SNOUL' ? 'Nông trường Chuối Snoul 1' : defaultKLH === 'NAM_LAO' ? 'Nông trường Chuối NSA 1' : 'Nông trường DP1.1');

    setEditingPlot(null);
    setPlotComplexCode(defaultKLH);
    setPlotCode(nextCode);
    setPlotName('');
    setPlotEnterprise(firstEnt);
    setPlotFarm(firstFarm);
    setPlotAreaHa(25.0);
    setPlotCropType('Chuối Nam Mỹ Foc TR4');
    setPlotStatus('active');
    setPlotIrrigation('Tưới nhỏ giọt bù áp tự động Netafim');
    setPlotSoil('Đất đỏ bazan màu mỡ');
    setPlotNotes('');
    setShowPlotModal(true);
  };

  // Mở modal Sửa Lô
  const handleOpenEditPlot = (plot: AgriculturalPlotItem) => {
    setEditingPlot(plot);
    setPlotComplexCode(plot.complexCode);
    setPlotCode(plot.code);
    setPlotName(plot.name);
    setPlotEnterprise(plot.enterpriseName);
    setPlotFarm(plot.farmName);
    setPlotAreaHa(plot.areaHa);
    setPlotCropType(plot.cropType);
    setPlotStatus(plot.status);
    setPlotIrrigation(plot.irrigationSystem);
    setPlotSoil(plot.soilCondition);
    setPlotNotes(plot.notes || '');
    setShowPlotModal(true);
  };

  // Khi thay đổi Khu liên hợp trong modal: Tự động cập nhật mã tăng dần và xí nghiệp/nông trường
  const handlePlotComplexChange = (newComplex: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO') => {
    setPlotComplexCode(newComplex);
    if (!editingPlot) {
      setPlotCode(getNextPlotCode(newComplex, plots));

      const entList = mockEnterprises.filter((e) => e.parentCode === newComplex);
      const firstEnt = entList[0]?.name || (newComplex === 'SNOUL' ? 'Xí nghiệp Chuối ERC' : newComplex === 'NAM_LAO' ? 'Xí nghiệp chuối NSA' : 'Xí nghiệp Chuối DP1');
      setPlotEnterprise(firstEnt);

      const farmList = mockFarms.filter((f) => f.parentCode === entList[0]?.code || f.parentName === firstEnt);
      const firstFarm = farmList[0]?.name || (newComplex === 'SNOUL' ? 'Nông trường Chuối Snoul 1' : newComplex === 'NAM_LAO' ? 'Nông trường Chuối NSA 1' : 'Nông trường DP1.1');
      setPlotFarm(firstFarm);
    }
  };

  // Khi thay đổi Xí nghiệp trong modal: Cập nhật nông trường gợi ý
  const handlePlotEnterpriseChange = (newEnterprise: string) => {
    setPlotEnterprise(newEnterprise);
    const ent = mockEnterprises.find((e) => e.name === newEnterprise || e.code === newEnterprise);
    const farmList = mockFarms.filter((f) => f.parentCode === ent?.code || f.parentName === newEnterprise);
    if (farmList.length > 0) {
      setPlotFarm(farmList[0].name);
    }
  };

  // Lọc dữ liệu Lô thửa nông nghiệp - SẮP XẾP TĂNG DẦN THEO MÃ
  const filteredPlots = useMemo(() => {
    const q = search.trim().toLowerCase();
    const effectiveKLH = filterPlotKLH !== 'ALL' ? filterPlotKLH : selectedKLH;

    const list = plots.filter((p) => {
      const matchKlh = effectiveKLH === 'ALL' || p.complexCode === effectiveKLH;
      const matchEnt = !filterPlotEnterprise || p.enterpriseName.toLowerCase().includes(filterPlotEnterprise.toLowerCase());
      const matchFarm = !filterPlotFarm || p.farmName.toLowerCase().includes(filterPlotFarm.toLowerCase());
      const matchCode = !filterPlotCode || p.code.toLowerCase().includes(filterPlotCode.toLowerCase()) || p.name.toLowerCase().includes(filterPlotCode.toLowerCase());
      const matchSearch =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.enterpriseName.toLowerCase().includes(q) ||
        p.farmName.toLowerCase().includes(q) ||
        p.cropType.toLowerCase().includes(q);
      return matchKlh && matchEnt && matchFarm && matchCode && matchSearch;
    });

    // Sắp xếp mã lô tăng dần (Strictly Ascending Sorting by Plot Code)
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));

    return list;
  }, [plots, selectedKLH, filterPlotKLH, filterPlotEnterprise, filterPlotFarm, filterPlotCode, search]);

  // Lọc dữ liệu Khu vực công trình
  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sites.filter((s) => {
      const matchKlh = selectedKLH === 'ALL' || s.complexCode === selectedKLH;
      const matchSearch =
        !q ||
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q) ||
        s.unitOwner.toLowerCase().includes(q);
      return matchKlh && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [sites, selectedKLH, search]);

  // Lọc dữ liệu Tuyến đường vận chuyển
  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = routes.filter((r) => {
      const matchKlh = selectedKLH === 'ALL' || r.complexCode === selectedKLH;
      const matchSearch =
        !q ||
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.cargoType.toLowerCase().includes(q);
      return matchKlh && matchSearch;
    });
    list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [routes, selectedKLH, search]);

  // CRUD Handlers - Lô thửa Nông nghiệp (NẾU KHÔNG GHI THÌ MÃ TỰ TĂNG DẦN)
  const handleSavePlot = (e: React.FormEvent) => {
    e.preventDefault();
    // Nếu người dùng không nhập mã hoặc xóa trống thì tự động cấp mã tăng dần
    const code = plotCode.trim().toUpperCase() || getNextPlotCode(plotComplexCode, plots);
    const complexName = KLH_OPTIONS.find((k) => k.code === plotComplexCode)?.name || plotComplexCode;
    const name = plotName.trim() || `Lô ${code} - ${plotFarm || 'Nông trường'}`;
    const statusLabel = plotStatus === 'active' ? 'Đang canh tác' : plotStatus === 'preparing' ? 'Đang làm đất' : 'Tái canh';

    if (editingPlot) {
      setPlots((prev) =>
        prev.map((p) =>
          p.id === editingPlot.id
            ? {
                ...p,
                code,
                name,
                complexCode: plotComplexCode,
                complexName,
                farmName: plotFarm,
                enterpriseName: plotEnterprise,
                areaHa: Number(plotAreaHa),
                cropType: plotCropType,
                irrigationSystem: plotIrrigation,
                soilCondition: plotSoil,
                status: plotStatus,
                statusLabel,
                notes: plotNotes,
              }
            : p
        )
      );
    } else {
      const newPlot: AgriculturalPlotItem = {
        id: `PLOT-${Date.now().toString().slice(-4)}`,
        code,
        name,
        complexCode: plotComplexCode,
        complexName,
        farmName: plotFarm,
        enterpriseName: plotEnterprise,
        areaHa: Number(plotAreaHa),
        cropType: plotCropType,
        irrigationSystem: plotIrrigation,
        soilCondition: plotSoil,
        status: plotStatus,
        statusLabel,
        notes: plotNotes,
      };
      setPlots((prev) => [...prev, newPlot]);
    }
    setShowPlotModal(false);
    setEditingPlot(null);
  };

  const handleDeletePlot = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa Lô thửa: "${name}" khỏi danh mục không?`)) {
      setPlots((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // CRUD Handlers - Khu vực Công trình
  const handleSaveSite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const complexCode = String(form.get('complexCode') || 'KOUN_MOM') as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
    const complexName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || complexCode;
    const code = String(form.get('code') || '').trim().toUpperCase() || getNextSiteCode(sites);
    const name = String(form.get('name') || '').trim() || `Khu vực thi công ${code}`;
    const category = (form.get('category') as ConstructionSiteItem['category']) || 'DAO_DAP';
    const categoryName =
      category === 'DAO_DAP'
        ? 'Đào đắp mương máng'
        : category === 'SAN_LAP'
        ? 'San lấp mặt bằng'
        : category === 'GIAO_THONG'
        ? 'Làm đường giao thông nội bộ'
        : category === 'HO_DAP'
        ? 'Hồ đập chứa nước & Trạm bơm'
        : 'Cầu cống & Hạ tầng kỹ thuật';
    const unitOwner = String(form.get('unitOwner') || '').trim() || 'Ban QLDA & Đội Cơ giới';
    const targetScope = String(form.get('targetScope') || '').trim() || '10,000 m³';
    const targetUnit = String(form.get('targetUnit') || 'm³').trim();
    const recommendedMachines = String(form.get('recommendedMachines') || '').trim() || 'Xe đào bánh xích 0.8m³, Xe ủi';
    const estimatedDays = Number(form.get('estimatedDays') || 30);
    const status = (form.get('status') as ConstructionSiteItem['status']) || 'in_progress';
    const statusLabel = status === 'in_progress' ? 'Đang thi công' : status === 'preparing' ? 'Chuẩn bị mặt bằng' : 'Hoàn thành';
    const notes = String(form.get('notes') || '').trim();

    if (editingSite) {
      setSites((prev) =>
        prev.map((s) =>
          s.id === editingSite.id
            ? { ...s, code, name, category, categoryName, complexCode, complexName, unitOwner, targetScope, targetUnit, recommendedMachines, estimatedDays, status, statusLabel, notes }
            : s
        )
      );
    } else {
      const newSite: ConstructionSiteItem = {
        id: `SITE-${Date.now().toString().slice(-4)}`,
        code,
        name,
        category,
        categoryName,
        complexCode,
        complexName,
        unitOwner,
        targetScope,
        targetUnit,
        recommendedMachines,
        estimatedDays,
        status,
        statusLabel,
        notes,
      };
      setSites((prev) => [...prev, newSite]);
    }
    setShowSiteModal(false);
    setEditingSite(null);
  };

  const handleDeleteSite = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa Khu vực thi công: "${name}" khỏi danh mục không?`)) {
      setSites((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // CRUD Handlers - Tuyến đường Vận chuyển
  const handleSaveRoute = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const complexCode = String(form.get('complexCode') || 'KOUN_MOM') as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO';
    const complexName = KLH_OPTIONS.find((k) => k.code === complexCode)?.name || complexCode;
    const code = String(form.get('code') || '').trim().toUpperCase() || getNextRouteCode(complexCode, routes);
    const origin = String(form.get('origin') || '').trim() || 'Kho trung tâm';
    const destination = String(form.get('destination') || '').trim() || 'Nông trường / Xưởng';
    const name = String(form.get('name') || '').trim() || `${origin} ➔ ${destination}`;
    const distanceKm = Number(form.get('distanceKm') || 10.0);
    const cargoType = String(form.get('cargoType') || '').trim() || 'Chuối tươi & Thức ăn';
    const speedLimitKmH = Number(form.get('speedLimitKmH') || 35);
    const recommendedVehicles = String(form.get('recommendedVehicles') || '').trim() || 'Xe tải thùng / Xe đầu kéo';
    const status = (form.get('status') as TransportRouteItem['status']) || 'active';
    const statusLabel = status === 'active' ? 'Hoạt động' : 'Bảo trì';
    const notes = String(form.get('notes') || '').trim();

    if (editingRoute) {
      setRoutes((prev) =>
        prev.map((r) =>
          r.id === editingRoute.id
            ? { ...r, code, name, origin, destination, distanceKm, complexCode, complexName, cargoType, speedLimitKmH, recommendedVehicles, status, statusLabel, notes }
            : r
        )
      );
    } else {
      const newRoute: TransportRouteItem = {
        id: `ROUTE-${Date.now().toString().slice(-4)}`,
        code,
        name,
        origin,
        destination,
        distanceKm,
        complexCode,
        complexName,
        cargoType,
        speedLimitKmH,
        recommendedVehicles,
        status,
        statusLabel,
        notes,
      };
      setRoutes((prev) => [...prev, newRoute]);
    }
    setShowRouteModal(false);
    setEditingRoute(null);
  };

  const handleDeleteRoute = (id: string, name: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa Tuyến đường vận chuyển: "${name}" không?`)) {
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Reset bộ lọc
  const handleResetPlotFilters = () => {
    setFilterPlotKLH('ALL');
    setFilterPlotEnterprise('');
    setFilterPlotFarm('');
    setFilterPlotCode('');
    setSearch('');
  };

  // Xuất file CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    if (activeTab === 'plots') {
      csvContent += 'Mã Lô,Tên Lô Thửa,Khu Liên Hợp,Xí Nghiệp,Nông Trường,Diện Tích (ha),Cây Trồng,Hệ Thống Tưới,Trạng Thái\n';
      filteredPlots.forEach((p) => {
        csvContent += `"${p.code}","${p.name}","${p.complexName}","${p.enterpriseName}","${p.farmName}","${p.areaHa}","${p.cropType}","${p.irrigationSystem}","${p.statusLabel}"\n`;
      });
    } else if (activeTab === 'construction') {
      csvContent += 'Mã Khu Vực,Tên Khu Vực Thi Công,Hạng Mục,Khu Liên Hợp,Đơn Vị Phụ Trách,Quy Mô,Trạng Thái\n';
      filteredSites.forEach((s) => {
        csvContent += `"${s.code}","${s.name}","${s.categoryName}","${s.complexName}","${s.unitOwner}","${s.targetScope}","${s.statusLabel}"\n`;
      });
    } else {
      csvContent += 'Mã Tuyến,Tên Tuyến Vận Chuyển,Điểm Xuất Phát,Điểm Đến,Cự Ly (km),Mặt Hàng,Tốc Độ Tối Đa (km/h),Khu Liên Hợp,Trạng Thái\n';
      filteredRoutes.forEach((r) => {
        csvContent += `"${r.code}","${r.name}","${r.origin}","${r.destination}","${r.distanceKm}","${r.cargoType}","${r.speedLimitKmH}","${r.complexName}","${r.statusLabel}"\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `danh_muc_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ============================================================================
  // CỘT BẢNG: 1. LÔ THỬA NÔNG NGHIỆP
  // ============================================================================
  const plotColumns: Column<AgriculturalPlotItem>[] = [
    {
      key: 'code',
      title: 'Mã Lô (Tăng dần)',
      sortable: true,
      width: '135px',
      render: (item) => (
        <span className="font-mono font-extrabold text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên Lô thửa canh tác',
      sortable: true,
      render: (item) => (
        <div className="min-w-[200px]">
          <strong className="text-slate-900 block text-xs font-bold">{item.name}</strong>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            {item.complexName}
          </span>
        </div>
      ),
    },
    {
      key: 'hierarchy',
      title: 'Xí nghiệp ➔ Nông trường trực thuộc',
      render: (item) => (
        <div className="text-xs text-slate-700">
          <div className="font-bold text-emerald-950 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-emerald-700 shrink-0" />
            <span>{item.enterpriseName}</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{item.farmName}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'areaHa',
      title: 'Diện tích (ha)',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
          {item.areaHa.toFixed(1)} ha
        </span>
      ),
    },
    {
      key: 'cropType',
      title: 'Loại cây trồng / Giống',
      sortable: true,
      render: (item) => (
        <span className="text-xs font-bold text-emerald-900">
          🌾 {item.cropType}
        </span>
      ),
    },
    {
      key: 'irrigationSystem',
      title: 'Hệ thống tưới & Đất',
      render: (item) => (
        <div className="text-[11px] text-slate-600 max-w-[200px]">
          <div className="font-semibold text-slate-800 truncate">{item.irrigationSystem}</div>
          <div className="text-slate-400 truncate mt-0.5">{item.soilCondition}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Tình trạng',
      align: 'center',
      render: (item) => {
        switch (item.status) {
          case 'active':
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Đang canh tác
              </span>
            );
          case 'preparing':
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                <Clock className="w-3 h-3 text-amber-600" />
                Đang làm đất
              </span>
            );
          case 'replanting':
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                <RefreshCw className="w-3 h-3 text-blue-600" />
                Tái canh
              </span>
            );
          default:
            return null;
        }
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '150px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Xem chi tiết"
            onClick={() => setDetailItem({ type: 'plots', data: item })}
          >
            <Settings2 className="h-3 w-3 text-slate-500" />
            <span>Xem</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa"
            onClick={() => handleOpenEditPlot(item)}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa"
            onClick={() => handleDeletePlot(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  // ============================================================================
  // CỘT BẢNG: 2. KHU VỰC THI CÔNG CÔNG TRÌNH
  // ============================================================================
  const siteColumns: Column<ConstructionSiteItem>[] = [
    {
      key: 'code',
      title: 'Mã Khu Vực',
      sortable: true,
      width: '120px',
      render: (item) => (
        <span className="font-mono font-extrabold text-amber-900 text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-2xs">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên Khu vực / Vị trí thi công',
      sortable: true,
      render: (item) => (
        <div className="min-w-[220px]">
          <strong className="text-slate-900 block text-xs font-bold">{item.name}</strong>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            {item.complexName}
          </span>
        </div>
      ),
    },
    {
      key: 'categoryName',
      title: 'Phân loại hạng mục',
      sortable: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
          <HardHat className="w-3.5 h-3.5 text-amber-600" />
          {item.categoryName}
        </span>
      ),
    },
    {
      key: 'targetScope',
      title: 'Quy mô / Khối lượng',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
          {item.targetScope}
        </span>
      ),
    },
    {
      key: 'unitOwner',
      title: 'Đơn vị phụ trách thi công',
      render: (item) => (
        <div className="text-xs text-slate-700">
          <div className="font-semibold">{item.unitOwner}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{item.recommendedMachines}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      render: (item) => {
        switch (item.status) {
          case 'in_progress':
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                <Clock className="w-3 h-3 text-amber-600" />
                Đang thi công
              </span>
            );
          case 'preparing':
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                <AlertCircle className="w-3 h-3 text-slate-500" />
                Chuẩn bị mặt bằng
              </span>
            );
          case 'completed':
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Hoàn thành
              </span>
            );
          default:
            return null;
        }
      },
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '150px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Xem chi tiết"
            onClick={() => setDetailItem({ type: 'construction', data: item })}
          >
            <Settings2 className="h-3 w-3 text-slate-500" />
            <span>Xem</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa"
            onClick={() => {
              setEditingSite(item);
              setShowSiteModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa"
            onClick={() => handleDeleteSite(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  // ============================================================================
  // CỘT BẢNG: 3. TUYẾN ĐƯỜNG VẬN CHUYỂN
  // ============================================================================
  const routeColumns: Column<TransportRouteItem>[] = [
    {
      key: 'code',
      title: 'Mã Tuyến',
      sortable: true,
      width: '120px',
      render: (item) => (
        <span className="font-mono font-extrabold text-blue-800 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
          {item.code}
        </span>
      ),
    },
    {
      key: 'name',
      title: 'Tên Tuyến đường vận chuyển',
      sortable: true,
      render: (item) => (
        <div className="min-w-[220px]">
          <strong className="text-slate-900 block text-xs font-bold">{item.name}</strong>
          <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
            {item.complexName}
          </span>
        </div>
      ),
    },
    {
      key: 'path',
      title: 'Điểm xuất phát ➔ Điểm đến',
      render: (item) => (
        <div className="text-xs text-slate-700 space-y-0.5">
          <div className="font-semibold text-slate-800">Từ: {item.origin}</div>
          <div className="text-slate-500 text-[11px]">➔ Đến: {item.destination}</div>
        </div>
      ),
    },
    {
      key: 'distanceKm',
      title: 'Cự ly chuẩn (km)',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
          {item.distanceKm.toFixed(1)} km
        </span>
      ),
    },
    {
      key: 'cargoType',
      title: 'Mặt hàng chuyên chở',
      render: (item) => <span className="text-xs text-slate-800 font-semibold">{item.cargoType}</span>,
    },
    {
      key: 'speedLimitKmH',
      title: 'Giới hạn GPS',
      render: (item) => (
        <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
          Tối đa {item.speedLimitKmH} km/h
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      align: 'center',
      render: (item) => (
        item.status === 'active' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
            Bảo trì
          </span>
        )
      ),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'center',
      width: '150px',
      render: (item) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            title="Xem chi tiết"
            onClick={() => setDetailItem({ type: 'transport', data: item })}
          >
            <Settings2 className="h-3 w-3 text-slate-500" />
            <span>Xem</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
            title="Chỉnh sửa"
            onClick={() => {
              setEditingRoute(item);
              setShowRouteModal(true);
            }}
          >
            <Edit2 className="h-3 w-3 text-blue-600" />
            <span>Sửa</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
            title="Xóa"
            onClick={() => handleDeleteRoute(item.id, item.name)}
          >
            <Trash2 className="h-3 w-3 text-rose-600" />
            <span>Xóa</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. HEADER SECTION & BỘ CHỌN KHU LIÊN HỢP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
              Danh mục Địa bàn & Tuyến đường hoạt động
            </h1>
            <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              Quản lý phân cấp chuẩn hóa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý riêng biệt cho 3 phân hệ: Lô thửa Nông nghiệp (theo Xí nghiệp / Nông trường), Khu vực Công trình và Tuyến đường Vận chuyển.
          </p>
        </div>

        {/* LỌC NHANH THEO KHU LIÊN HỢP */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-slate-700">Khu liên hợp:</span>
            <select
              className="bg-transparent text-xs font-extrabold text-slate-900 outline-none cursor-pointer"
              value={selectedKLH}
              onChange={(e) => {
                setSelectedKLH(e.target.value);
                setFilterPlotKLH(e.target.value);
              }}
            >
              {KLH_OPTIONS.map((k) => (
                <option key={k.code} value={k.code}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
            Xuất Excel/CSV
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS - 3 PHÂN HỆ ĐỊA BÀN RIÊNG BIỆT */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleTabChange('plots')}
          className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'plots'
              ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">🌾 Lô thửa Nông nghiệp</span>
            <div className="rounded-xl p-2 bg-emerald-50 text-emerald-700 shrink-0">
              <Tractor className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {filteredPlots.length} <span className="text-sm font-semibold text-slate-500">lô</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-800 font-medium truncate">
            Tổng diện tích: {filteredPlots.reduce((acc, p) => acc + p.areaHa, 0).toFixed(1)} ha canh tác chuối & cỏ
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('construction')}
          className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'construction'
              ? 'border-amber-600 bg-amber-50/40 ring-2 ring-amber-600/20 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">🚜 Khu vực / Tuyến Công trình</span>
            <div className="rounded-xl p-2 bg-amber-50 text-amber-700 shrink-0">
              <HardHat className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {filteredSites.length} <span className="text-sm font-semibold text-slate-500">vị trí</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-800 font-medium truncate">
            {filteredSites.filter((s) => s.status === 'in_progress').length} khu vực đang thi công đào đắp & san nền
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('transport')}
          className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md cursor-pointer ${
            activeTab === 'transport'
              ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">🚚 Tuyến Vận chuyển nội bộ</span>
            <div className="rounded-xl p-2 bg-blue-50 text-blue-700 shrink-0">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {filteredRoutes.length} <span className="text-sm font-semibold text-slate-500">tuyến đường</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-800 font-medium truncate">
            Tổng cự ly: {filteredRoutes.reduce((acc, r) => acc + r.distanceKm, 0).toFixed(1)} km định tuyến GPS
          </div>
        </button>
      </div>

      {/* 3. MAIN TABLE SECTION VỚI THANH PHÂN ĐOẠN 3 TAB */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* 3 Tabs Phân đoạn */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTabChange('plots')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'plots'
                  ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tractor className="h-3.5 w-3.5 text-emerald-600" />
              🌾 Lô thửa Nông nghiệp ({plots.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('construction')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'construction'
                  ? 'bg-white text-amber-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardHat className="h-3.5 w-3.5 text-amber-600" />
              🚜 Khu vực Công trình ({sites.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('transport')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'transport'
                  ? 'bg-white text-blue-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="h-3.5 w-3.5 text-blue-600" />
              🚚 Tuyến đường Vận chuyển ({routes.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'plots'
                    ? 'Tìm mã lô, tên lô, nông trường...'
                    : activeTab === 'construction'
                    ? 'Tìm mã khu vực, tên hạng mục...'
                    : 'Tìm mã tuyến, điểm đi, điểm đến...'
                }
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => {
                setSearch('');
                handleResetPlotFilters();
              }}
            >
              Làm mới
            </Button>

            {/* NÚT THÊM MỚI THEO TỪNG TAB */}
            {activeTab === 'plots' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleOpenCreatePlot}
              >
                Thêm Lô thửa mới
              </Button>
            )}

            {activeTab === 'construction' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingSite(null);
                  setShowSiteModal(true);
                }}
              >
                Thêm Khu vực thi công
              </Button>
            )}

            {activeTab === 'transport' && (
              <Button
                size="sm"
                className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingRoute(null);
                  setShowRouteModal(true);
                }}
              >
                Thêm Tuyến đường mới
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: LÔ THỬA NÔNG NGHIỆP - QUẢN LÝ PHÂN CẤP: KLH ➔ XÍ NGHIỆP ➔ NÔNG TRƯỜNG */}
        {activeTab === 'plots' && (
          <div className="space-y-3">
            {/* Bộ lọc tiêu chí phân cấp trực quan cho Lô thửa */}
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-wide">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Quản lý phân cấp: Khu liên hợp ➔ Xí nghiệp ➔ Nông trường ➔ Lô thửa</span>
                </div>
                {(filterPlotEnterprise || filterPlotFarm || filterPlotCode || filterPlotKLH !== 'ALL') && (
                  <button
                    type="button"
                    onClick={handleResetPlotFilters}
                    className="text-[11px] text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Xóa lọc
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Khu liên hợp
                  </label>
                  <SearchableSelect
                    value={filterPlotKLH}
                    onChange={(val) => {
                      setFilterPlotKLH(val);
                      setFilterPlotEnterprise('');
                      setFilterPlotFarm('');
                    }}
                    options={[
                      { value: 'ALL', label: 'Tất cả Khu liên hợp' },
                      { value: 'KOUN_MOM', label: 'Khu liên hợp Koun Mom' },
                      { value: 'SNOUL', label: 'Khu liên hợp Snoul' },
                      { value: 'NAM_LAO', label: 'Khu liên hợp Nam Lào' },
                    ]}
                    emptyOptionLabel="Tất cả Khu liên hợp"
                    heightClass="h-9"
                    icon={<Building2 className="w-3.5 h-3.5" />}
                    allowCustomInput={false}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Xí nghiệp trực thuộc
                  </label>
                  <SearchableSelect
                    value={filterPlotEnterprise}
                    onChange={(val) => {
                      setFilterPlotEnterprise(val);
                      setFilterPlotFarm('');
                    }}
                    options={[{ value: '', label: '-- Tất cả xí nghiệp --' }, ...enterprisesForFilter]}
                    placeholder="Tất cả xí nghiệp"
                    emptyOptionLabel="Tất cả xí nghiệp"
                    heightClass="h-9"
                    icon={<Building2 className="w-3.5 h-3.5" />}
                    allowCustomInput={true}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Nông trường / Vùng trồng
                  </label>
                  <SearchableSelect
                    value={filterPlotFarm}
                    onChange={(val) => setFilterPlotFarm(val)}
                    options={[{ value: '', label: '-- Tất cả nông trường --' }, ...farmsForFilter]}
                    placeholder="Tất cả nông trường"
                    emptyOptionLabel="Tất cả nông trường"
                    heightClass="h-9"
                    icon={<MapPin className="w-3.5 h-3.5" />}
                    allowCustomInput={true}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Mã Lô (Tăng dần)
                  </label>
                  <SearchableSelect
                    value={filterPlotCode}
                    onChange={(val) => setFilterPlotCode(val)}
                    options={[{ value: '', label: '-- Tất cả mã lô --' }, ...plotCodeFilterOptions]}
                    placeholder={`Tất cả mã (${plots.length})`}
                    emptyOptionLabel={`Tất cả mã (${plots.length})`}
                    heightClass="h-9"
                    icon={<Tractor className="w-3.5 h-3.5" />}
                    allowCustomInput={true}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DataTable data={filteredPlots} columns={plotColumns} pageSize={15} showSearch={false} showExport={false} useGlobalFilters={false} />
            </div>
          </div>
        )}

        {activeTab === 'construction' && (
          <div className="overflow-x-auto">
            <DataTable data={filteredSites} columns={siteColumns} pageSize={15} showSearch={false} showExport={false} useGlobalFilters={false} />
          </div>
        )}

        {activeTab === 'transport' && (
          <div className="overflow-x-auto">
            <DataTable data={filteredRoutes} columns={routeColumns} pageSize={15} showSearch={false} showExport={false} useGlobalFilters={false} />
          </div>
        )}
      </section>

      {/* ============================================================================ */}
      {/* 1. MODAL THÊM / SỬA LÔ THỬA NÔNG NGHIỆP (SELECT TEXT CASCADING NHẬP NHANH)  */}
      {/* ============================================================================ */}
      <Modal
        isOpen={showPlotModal}
        hideFooter={true}
        onClose={() => {
          setShowPlotModal(false);
          setEditingPlot(null);
        }}
        title={editingPlot ? `Chỉnh sửa: ${editingPlot.name}` : 'Thêm mới Lô thửa Nông nghiệp'}
        subtitle="Chuẩn hóa diện tích héc-ta, giống cây trồng và nông trường trực thuộc"
        size="lg"
      >
        <form className="space-y-3.5 text-xs" onSubmit={handleSavePlot}>
          {/* Hàng 1: Mã lô và Tên lô */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Mã lô (Để trống tự tăng dần):
              </label>
              <input
                value={plotCode}
                onChange={(e) => setPlotCode(e.target.value.toUpperCase())}
                placeholder={`VD: ${getNextPlotCode(plotComplexCode, plots)}`}
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase bg-white focus:border-primary focus:outline-none h-9"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Nếu không ghi thì hệ thống tự động tăng dần ({getNextPlotCode(plotComplexCode, plots)})
              </span>
            </div>
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">
                Tên lô thửa canh tác:
              </label>
              <input
                value={plotName}
                onChange={(e) => setPlotName(e.target.value)}
                placeholder="VD: Lô C3 - Nông trường Chuối 1"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs bg-white focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          {/* Hàng 2: Phân cấp chuẩn hóa: Khu liên hợp ➔ Xí nghiệp ➔ Nông trường (DẠNG NHẬP SELECT TEXT) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Khu liên hợp áp dụng:
              </label>
              <SearchableSelect
                value={plotComplexCode}
                onChange={(val) => handlePlotComplexChange(val as 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO')}
                options={[
                  { value: 'KOUN_MOM', label: 'Khu liên hợp Koun Mom' },
                  { value: 'SNOUL', label: 'Khu liên hợp Snoul' },
                  { value: 'NAM_LAO', label: 'Khu liên hợp Nam Lào' },
                ]}
                placeholder="Chọn Khu liên hợp..."
                allowCustomInput={false}
                icon={<Building2 className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Xí nghiệp trực thuộc (Hỗ trợ nhập nhanh):
              </label>
              <SearchableSelect
                value={plotEnterprise}
                onChange={(val) => handlePlotEnterpriseChange(val)}
                options={enterprisesForModal.map((e) => ({
                  value: e.name,
                  label: e.name,
                  subLabel: `${e.code || ''}`,
                }))}
                placeholder="Chọn hoặc gõ xí nghiệp..."
                allowCustomInput={true}
                icon={<Building2 className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nông trường / Vùng trồng (Hỗ trợ nhập nhanh):
              </label>
              <SearchableSelect
                value={plotFarm}
                onChange={(val) => setPlotFarm(val)}
                options={farmsForModal}
                placeholder="Chọn hoặc gõ nông trường..."
                allowCustomInput={true}
                icon={<MapPin className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>
          </div>

          {/* Hàng 3: Diện tích, Cây trồng, Tình trạng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Diện tích canh tác (ha):
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={plotAreaHa}
                onChange={(e) => setPlotAreaHa(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 p-2 font-black text-emerald-800 text-xs bg-white focus:border-primary focus:outline-none h-9"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Loại cây trồng / Giống (Hỗ trợ nhập nhanh):
              </label>
              <SearchableSelect
                value={plotCropType}
                onChange={(val) => setPlotCropType(val)}
                options={[
                  { value: 'Chuối Nam Mỹ Foc TR4', label: 'Chuối Nam Mỹ Foc TR4 (Kháng bệnh)' },
                  { value: 'Chuối Nam Mỹ cấy mô Foc TR4 (Vụ 1)', label: 'Chuối Nam Mỹ cấy mô Foc TR4 (Vụ 1)' },
                  { value: 'Chuối Nam Mỹ Foc TR4 (Vụ 2)', label: 'Chuối Nam Mỹ Foc TR4 (Vụ 2)' },
                  { value: 'Cỏ voi Packchong 1 ủ chua', label: 'Cỏ voi Packchong 1 ủ chua (TĂCN Bò)' },
                  { value: 'Bắp sinh khối chuyên ủ chua', label: 'Bắp sinh khối chuyên ủ chua (TĂCN Bò)' },
                  { value: 'Cao su khai thác mủ năm 6', label: 'Cao su khai thác mủ năm 6' },
                  { value: 'Bơ booth & Sầu riêng Monthong', label: 'Bơ booth & Sầu riêng Monthong' },
                ]}
                placeholder="Chọn hoặc gõ loại cây..."
                allowCustomInput={true}
                icon={<Tractor className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tình trạng canh tác:
              </label>
              <SearchableSelect
                value={plotStatus}
                onChange={(val) => setPlotStatus(val as any)}
                options={[
                  { value: 'active', label: 'Đang canh tác' },
                  { value: 'preparing', label: 'Đang làm đất' },
                  { value: 'replanting', label: 'Tái canh vụ mới' },
                ]}
                placeholder="Chọn tình trạng..."
                allowCustomInput={false}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>
          </div>

          {/* Hàng 4: Hệ thống tưới & Đất */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hệ thống tưới tiêu (Hỗ trợ nhập nhanh):
              </label>
              <SearchableSelect
                value={plotIrrigation}
                onChange={(val) => setPlotIrrigation(val)}
                options={[
                  { value: 'Tưới nhỏ giọt bù áp tự động Netafim', label: 'Tưới nhỏ giọt bù áp tự động Netafim' },
                  { value: 'Tưới nhỏ giọt kết hợp châm phân Fertigation', label: 'Tưới nhỏ giọt kết hợp châm phân Fertigation' },
                  { value: 'Tưới súng phun mưa bán tự động', label: 'Tưới súng phun mưa bán tự động' },
                  { value: 'Tưới phun xoay tâm trục tự hành', label: 'Tưới phun xoay tâm trục tự hành' },
                  { value: 'Tưới phun gốc tự động tiết kiệm nước', label: 'Tưới phun gốc tự động tiết kiệm nước' },
                  { value: 'Tự nhiên theo mùa mưa & kênh dẫn', label: 'Tự nhiên theo mùa mưa & kênh dẫn' },
                ]}
                placeholder="Chọn hoặc gõ hệ thống tưới..."
                allowCustomInput={true}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Chất đất & Thoát nước (Hỗ trợ nhập nhanh):
              </label>
              <SearchableSelect
                value={plotSoil}
                onChange={(val) => setPlotSoil(val)}
                options={[
                  { value: 'Đất đỏ bazan màu mỡ', label: 'Đất đỏ bazan màu mỡ' },
                  { value: 'Đất đỏ bazan tầng canh tác sâu > 1.2m', label: 'Đất đỏ bazan tầng canh tác sâu > 1.2m' },
                  { value: 'Đất phù sa cổ xen kẹp bazan', label: 'Đất phù sa cổ xen kẹp bazan' },
                  { value: 'Đất thịt pha cát màu mỡ', label: 'Đất thịt pha cát màu mỡ' },
                  { value: 'Đất phù sa bãi bồi ven sông', label: 'Đất phù sa bãi bồi ven sông' },
                  { value: 'Đất xám bạc màu pha sỏi đỏ', label: 'Đất xám bạc màu pha sỏi đỏ' },
                ]}
                placeholder="Chọn hoặc gõ chất đất..."
                allowCustomInput={true}
                heightClass="h-9"
                roundedClass="rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Ghi chú vận hành cơ giới:
            </label>
            <textarea
              rows={2}
              value={plotNotes}
              onChange={(e) => setPlotNotes(e.target.value)}
              placeholder="Quy định xe máy kéo ra vào, đường lô, thời gian tưới..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowPlotModal(false);
                setEditingPlot(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingPlot ? 'Lưu Lô thửa' : 'Thêm Lô mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================================ */}
      {/* 2. MODAL THÊM / SỬA KHU VỰC CÔNG TRÌNH                                       */}
      {/* ============================================================================ */}
      <Modal
        isOpen={showSiteModal}
        hideFooter={true}
        onClose={() => {
          setShowSiteModal(false);
          setEditingSite(null);
        }}
        title={editingSite ? `Chỉnh sửa: ${editingSite.name}` : 'Thêm mới Khu vực thi công công trình'}
        subtitle="Chuẩn hóa phân khu mương máng, san lấp nền, hồ đập và hạ tầng kỹ thuật"
        size="lg"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveSite}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã khu vực (Để trống tự tăng):</label>
              <input
                name="code"
                defaultValue={editingSite?.code || ''}
                placeholder={`VD: ${getNextSiteCode(sites)}`}
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="font-bold text-slate-700 block mb-1">Tên khu vực / Vị trí thi công:</label>
              <input
                name="name"
                defaultValue={editingSite?.name || ''}
                placeholder="VD: Khu vực Mương thoát nước Lô C3"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Khu liên hợp:</label>
              <select
                name="complexCode"
                defaultValue={editingSite?.complexCode || (selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM')}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phân loại hạng mục:</label>
              <select
                name="category"
                defaultValue={editingSite?.category || 'DAO_DAP'}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="DAO_DAP">1. Đào đắp mương máng</option>
                <option value="SAN_LAP">2. San lấp mặt bằng</option>
                <option value="GIAO_THONG">3. Mở đường & Lu lèn</option>
                <option value="HO_DAP">4. Hồ đập & Trạm bơm</option>
                <option value="HA_TANG">5. Cầu cống & Hạ tầng</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Đơn vị phụ trách thi công:</label>
              <input
                name="unitOwner"
                defaultValue={editingSite?.unitOwner || 'Đội Thi công Cơ giới 1'}
                placeholder="VD: Đội Thi công Cơ giới 1..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Quy mô / Khối lượng dự kiến:</label>
              <input
                name="targetScope"
                defaultValue={editingSite?.targetScope || '12,000 m³'}
                placeholder="VD: 12,000 m³ hoặc 4.5 km..."
                className="w-full rounded-xl border border-slate-200 p-2 font-black text-amber-900 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thời gian thi công dự kiến (ngày):</label>
              <input
                name="estimatedDays"
                type="number"
                defaultValue={editingSite?.estimatedDays || 45}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Trạng thái thi công:</label>
              <select
                name="status"
                defaultValue={editingSite?.status || 'in_progress'}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="in_progress">Đang thi công</option>
                <option value="preparing">Chuẩn bị mặt bằng</option>
                <option value="completed">Đã hoàn thành</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Đầu máy / Thiết bị cơ giới khuyến nghị:</label>
            <input
              name="recommendedMachines"
              defaultValue={editingSite?.recommendedMachines || 'Máy đào 0.8m³, Xe ủi D6, Xe lu rung 14T'}
              placeholder="VD: Xe đào 0.8m3, Xe ủi D6..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú yêu cầu kỹ thuật & an toàn:</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingSite?.notes || ''}
              placeholder="Ghi chú cos nền, taluy chống sạt lở..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSiteModal(false);
                setEditingSite(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingSite ? 'Lưu Khu vực' : 'Thêm Khu vực'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================================ */}
      {/* 3. MODAL THÊM / SỬA TUYẾN ĐƯỜNG VẬN CHUYỂN (TỪ NƠI... ➔ ĐẾN NƠI...)         */}
      {/* ============================================================================ */}
      <Modal
        isOpen={showRouteModal}
        hideFooter={true}
        onClose={() => {
          setShowRouteModal(false);
          setEditingRoute(null);
        }}
        title={editingRoute ? `Chỉnh sửa: ${editingRoute.name}` : 'Thêm Tuyến đường vận chuyển mới'}
        subtitle="Chuẩn hóa cự ly km và giới hạn tốc độ GPS cho Lệnh vận chuyển nội bộ"
        size="lg"
      >
        <form className="space-y-3 text-xs" onSubmit={handleSaveRoute}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mã tuyến (Để trống tự tăng):</label>
              <input
                name="code"
                defaultValue={editingRoute?.code || ''}
                placeholder={`VD: ${getNextRouteCode(selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM', routes)}`}
                className="w-full rounded-xl border border-slate-200 p-2 font-mono font-bold text-xs uppercase focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="font-bold text-slate-700 block mb-1">Tên tuyến đường vận chuyển:</label>
              <input
                name="name"
                defaultValue={editingRoute?.name || ''}
                placeholder="VD: Nông trường 1 ➔ Xí nghiệp Bò Koun Mom"
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Điểm xuất phát (Từ nơi...):</label>
              <input
                name="origin"
                defaultValue={editingRoute?.origin || ''}
                placeholder="VD: Kho phụ phẩm NT1 (Lô A/B)..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Điểm đến (Đến nơi...):</label>
              <input
                name="destination"
                defaultValue={editingRoute?.destination || ''}
                placeholder="VD: Trại Bò thịt - Xí nghiệp Chăn nuôi Bò..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thuộc Khu liên hợp:</label>
              <select
                name="complexCode"
                defaultValue={editingRoute?.complexCode || (selectedKLH !== 'ALL' ? selectedKLH : 'KOUN_MOM')}
                className="w-full rounded-xl border border-slate-200 p-2 text-xs font-bold focus:border-primary focus:outline-none h-9"
              >
                <option value="KOUN_MOM">Khu liên hợp Koun Mom</option>
                <option value="SNOUL">Khu liên hợp Snoul</option>
                <option value="NAM_LAO">Khu liên hợp Nam Lào</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cự ly chuẩn (km):</label>
              <input
                name="distanceKm"
                type="number"
                step="0.1"
                required
                defaultValue={editingRoute?.distanceKm || 12.5}
                className="w-full rounded-xl border border-slate-200 p-2 font-black text-blue-900 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Giới hạn tốc độ GPS (km/h):</label>
              <input
                name="speedLimitKmH"
                type="number"
                defaultValue={editingRoute?.speedLimitKmH || 35}
                className="w-full rounded-xl border border-slate-200 p-2 font-bold text-amber-800 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Mặt hàng chuyên chở:</label>
              <input
                name="cargoType"
                defaultValue={editingRoute?.cargoType || 'Chuối tươi xuất khẩu'}
                placeholder="VD: Chuối tươi, Thân lá chuối, Thức ăn gia súc..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Phương tiện chuyên dụng:</label>
              <input
                name="recommendedVehicles"
                defaultValue={editingRoute?.recommendedVehicles || 'Xe đầu kéo Container 40ft'}
                placeholder="VD: Đầu kéo cont, Xe ben, Xe bồn..."
                className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Ghi chú lộ trình & cung đường:</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editingRoute?.notes || ''}
              placeholder="Ghi chú mặt đường đất cấp phối, trạm cân, cua gắt..."
              className="w-full rounded-xl border border-slate-200 p-2 text-xs focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRouteModal(false);
                setEditingRoute(null);
              }}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingRoute ? 'Lưu Tuyến' : 'Thêm Tuyến mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================================ */}
      {/* 4. MODAL XEM CHI TIẾT ĐỊA BÀN                                                */}
      {/* ============================================================================ */}
      {detailItem && (
        <Modal
          isOpen={!!detailItem}
          onClose={() => setDetailItem(null)}
          title={`Chi tiết: ${detailItem.data.name}`}
          subtitle={`Mã chuẩn: ${detailItem.data.code} | ${detailItem.data.complexName}`}
          size="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px] font-medium">Tên phân hệ địa bàn</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 text-[10.5px] font-bold px-2 py-0.5 border border-emerald-300">
                  {detailItem.type === 'plots' ? '🌾 Lô thửa Nông nghiệp' : detailItem.type === 'construction' ? '🚜 Khu vực Công trình' : '🚚 Tuyến đường Vận chuyển'}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900">{detailItem.data.name}</h3>
              {detailItem.data.notes && (
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">{detailItem.data.notes}</p>
              )}
            </div>

            {detailItem.type === 'plots' && (() => {
              const p = detailItem.data as AgriculturalPlotItem;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Xí nghiệp trực thuộc:</span>
                    <span className="font-bold text-slate-900">{p.enterpriseName}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Nông trường / Vùng:</span>
                    <span className="font-bold text-slate-900">{p.farmName}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Diện tích canh tác:</span>
                    <span className="font-black text-emerald-700 text-sm">{p.areaHa} ha</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Loại cây trồng:</span>
                    <span className="font-bold text-slate-900">{p.cropType}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Hệ thống tưới:</span>
                    <span className="font-semibold text-slate-800">{p.irrigationSystem}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Chất đất:</span>
                    <span className="font-semibold text-slate-800">{p.soilCondition}</span>
                  </div>
                </div>
              );
            })()}

            {detailItem.type === 'construction' && (() => {
              const s = detailItem.data as ConstructionSiteItem;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Phân loại hạng mục:</span>
                    <span className="font-bold text-slate-900">{s.categoryName}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Quy mô khối lượng:</span>
                    <span className="font-black text-amber-800 text-sm">{s.targetScope}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Đơn vị thi công:</span>
                    <span className="font-bold text-slate-900">{s.unitOwner}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 col-span-2">
                    <span className="text-slate-400 text-[11px] block">Đầu máy cơ giới:</span>
                    <span className="font-semibold text-slate-800">{s.recommendedMachines}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Thời gian thi công:</span>
                    <span className="font-bold text-slate-900">{s.estimatedDays} ngày</span>
                  </div>
                </div>
              );
            })()}

            {detailItem.type === 'transport' && (() => {
              const r = detailItem.data as TransportRouteItem;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Điểm xuất phát:</span>
                    <span className="font-bold text-slate-900">{r.origin}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Điểm đến:</span>
                    <span className="font-bold text-slate-900">{r.destination}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Cự ly định tuyến:</span>
                    <span className="font-black text-blue-900 text-sm">{r.distanceKm} km</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Mặt hàng:</span>
                    <span className="font-bold text-slate-900">{r.cargoType}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Tốc độ tối đa GPS:</span>
                    <span className="font-bold text-amber-800">{r.speedLimitKmH} km/h</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px] block">Phương tiện:</span>
                    <span className="font-semibold text-slate-800">{r.recommendedVehicles}</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDetailItem(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
