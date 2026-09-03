import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Briefcase,
} from 'lucide-react';
import { CatalogItem, mockPositions } from '../../data/catalogData';
import { catalogsApi } from '../../api/catalogsApi';
import { SearchableSelect } from '../../components/common/SearchableSelect';
import { getStoredData } from '../../utils/storage';
import {
  exportGenericCatalogWorkbook,
  parseGenericCatalogWorkbook,
} from '../../utils/catalogExcel';

const STORAGE_KEY = 'catalogs_positions';

export const PositionsCatalogPage: React.FC = () => {
  // --------------------------------------------------------------------------
  // 1. STATE & DATA INITIALIZATION
  // --------------------------------------------------------------------------
  const [positions, setPositions] = useState<CatalogItem[]>(() =>
    getStoredData(STORAGE_KEY, mockPositions)
  );

  // Search Filter form state (temporary until "Tìm kiếm" is pressed)
  const [filterForm, setFilterForm] = useState({
    code: '',
    name: '',
    status: 'ALL',
  });

  // Applied filter state
  const [appliedFilter, setAppliedFilter] = useState({
    code: '',
    name: '',
    status: 'ALL',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modal Create / Edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [formData, setFormData] = useState<Partial<CatalogItem>>({
    id: '',
    code: '',
    name: '',
    type: 'POSITION',
    description: '',
    status: 'HOAT_DONG',
    createdAt: '',
  });

  // --------------------------------------------------------------------------
  // 2. FETCH LATEST DATA FROM BACKEND / LOCAL STORAGE
  // --------------------------------------------------------------------------
  const loadPositions = async () => {
    try {
      const data = await catalogsApi.getCatalogs('POSITION', STORAGE_KEY, mockPositions);
      if (Array.isArray(data) && data.length > 0) {
        setPositions(data);
      }
    } catch (err) {
      console.warn('Lỗi tải danh mục chức danh:', err);
    }
  };

  useEffect(() => {
    loadPositions();
  }, []);

  // --------------------------------------------------------------------------
  // 3. DROPDOWN OPTIONS FOR FILTER
  // --------------------------------------------------------------------------
  const codeOptions = useMemo(() => {
    const uniqueCodes = Array.from(new Set(positions.map((p) => p.code).filter(Boolean)));
    return [
      { value: '', label: '-- Tất cả mã --' },
      ...uniqueCodes.map((c) => ({ value: c, label: c })),
    ];
  }, [positions]);

  const nameOptions = useMemo(() => {
    const uniqueNames = Array.from(new Set(positions.map((p) => p.name).filter(Boolean)));
    return [
      { value: '', label: '-- Tất cả tên --' },
      ...uniqueNames.map((n) => ({ value: n, label: n })),
    ];
  }, [positions]);

  const statusOptions = [
    { value: 'ALL', label: '-- Tất cả --' },
    { value: 'HOAT_DONG', label: 'Hoạt động' },
    { value: 'TAM_DUNG', label: 'Tạm dừng' },
  ];

  // --------------------------------------------------------------------------
  // 4. FILTERING & PAGINATION
  // --------------------------------------------------------------------------
  const handleSearch = () => {
    setAppliedFilter({ ...filterForm });
    setCurrentPage(1);
  };

  const handleReset = () => {
    const defaultFilter = { code: '', name: '', status: 'ALL' };
    setFilterForm(defaultFilter);
    setAppliedFilter(defaultFilter);
    setCurrentPage(1);
  };

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      const matchCode =
        !appliedFilter.code ||
        p.code?.toLowerCase().includes(appliedFilter.code.trim().toLowerCase());
      const matchName =
        !appliedFilter.name ||
        p.name?.toLowerCase().includes(appliedFilter.name.trim().toLowerCase());
      const matchStatus =
        appliedFilter.status === 'ALL' || p.status === appliedFilter.status;

      return matchCode && matchName && matchStatus;
    });
  }, [positions, appliedFilter]);

  const totalPages = Math.ceil(filteredPositions.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPositions = filteredPositions.slice(startIndex, startIndex + pageSize);

  // --------------------------------------------------------------------------
  // 5. CRUD ACTIONS
  // --------------------------------------------------------------------------
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setFormData({
      id: `POS_${Date.now()}`,
      code: '',
      name: '',
      type: 'POSITION',
      description: '',
      status: 'HOAT_DONG',
      createdAt: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setFormMode('EDIT');
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code?.trim() || !formData.name?.trim()) {
      alert('Vui lòng nhập đầy đủ Mã chức danh và Tên chức danh!');
      return;
    }

    const payload: CatalogItem = {
      id: formData.id || `POS_${Date.now()}`,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      type: 'POSITION',
      description: formData.description?.trim() || '',
      status: formData.status || 'HOAT_DONG',
      createdAt: formData.createdAt || new Date().toISOString().slice(0, 10),
    };

    try {
      const updated = await catalogsApi.saveCatalogItem(payload, STORAGE_KEY, positions);
      setPositions(updated);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Lưu chức danh thất bại:', error);
      alert('Không thể lưu chức danh vào hệ thống!');
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chức danh "${item.name}" (${item.code})?`)) {
      return;
    }

    try {
      const updated = await catalogsApi.deleteCatalogItem(item.id, STORAGE_KEY, positions);
      setPositions(updated);
    } catch (error) {
      console.error('Xóa chức danh thất bại:', error);
      alert('Không thể xóa chức danh!');
    }
  };

  // --------------------------------------------------------------------------
  // 6. EXPORT / IMPORT / DOWNLOAD TEMPLATE
  // --------------------------------------------------------------------------
  const handleDownloadTemplate = async () => {
    try {
      await catalogsApi.downloadTemplate('POSITION');
    } catch (error) {
      console.warn('Backend download template failed, generating template with ExcelJS locally:', error);
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as any;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'THACO AGRI';

      // Sheet 1: DLN CHỨC DANH
      const ws1 = workbook.addWorksheet('DLN CHỨC DANH');
      ws1.columns = [
        { key: 'code', width: 25 },
        { key: 'name', width: 35 },
        { key: 'description', width: 45 },
        { key: 'status', width: 28 },
      ];

      ws1.addRow(['DỮ LIỆU NỀN CHỨC DANH']);
      ws1.mergeCells('A1:D1');
      const titleCell = ws1.getCell('A1');
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0A321A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
      ws1.getRow(1).height = 28;

      ws1.addRow([]);
      ws1.getRow(2).height = 15;

      const headerRow = ws1.addRow(['Mã chức danh', 'Tên chức danh', 'Mô tả nhiệm vụ & Chức năng', 'Trạng thái']);
      headerRow.height = 32;
      headerRow.eachCell((cell: any) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFFF00' }, // Pure bright yellow
        };
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
          left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
          bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
          right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
        };
      });

      const hintRow = ws1.addRow(['<Text> - <Bắt buộc nhập *>', '<Text> - <Bắt buộc nhập *>', '<Text>', '<HOAT_DONG hoặc TAM_DUNG>']);
      hintRow.height = 38;
      hintRow.eachCell((cell: any) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
        cell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF555555' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
      });

      for (let i = 0; i < 20; i++) {
        const row = ws1.addRow(['', '', '', '']);
        row.height = 20;
        row.eachCell((cell: any) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
        });
      }

      // Sheet 2: Huong_Dan
      const ws2 = workbook.addWorksheet('Huong_Dan');
      ws2.columns = [
        { key: 'title', width: 25 },
        { key: 'content', width: 90 },
      ];
      ws2.addRow(['TEMPLATE IMPORT THACO AGRI', 'DỮ LIỆU NỀN CHỨC DANH']);
      ws2.getRow(1).height = 28;
      ws2.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0A321A' } };
      ws2.getCell('B1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0A321A' } };

      ws2.addRow([]);
      const guides = [
        ['1. Quy định chung', 'Không chỉnh sửa hoặc xóa dòng tiêu đề 1, 2, 3, 4. Dữ liệu bắt đầu nhập từ dòng 5.'],
        ['2. Cột bắt buộc (*)', 'Các cột có màu vàng ở dòng tiêu đề (Mã chức danh, Tên chức danh) là bắt buộc phải có.'],
        ['3. Trạng thái', 'Nhập HOAT_DONG (Đang hoạt động) hoặc TAM_DUNG (Tạm dừng). Mặc định là HOAT_DONG.'],
        ['4. Tên Sheet dữ liệu', 'Sheet dữ liệu chính phải đặt tên là "DLN CHỨC DANH".'],
        ['5. Lưu file', 'Lưu file dưới định dạng .xlsx hoặc .xls trước khi upload lên hệ thống.'],
      ];
      guides.forEach(([title, content]) => {
        const r = ws2.addRow([title, content]);
        r.height = 22;
        r.getCell(1).font = { name: 'Arial', size: 10, bold: true };
        r.getCell(2).font = { name: 'Arial', size: 10 };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template__ChucDanh.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseGenericCatalogWorkbook('chuc-danh', file, {
        companies: [],
        complexes: [],
        enterprises: [],
        farms: [],
      });

      if (Array.isArray(parsed) && parsed.length > 0) {
        const persisted = await catalogsApi.bulkSyncCatalogs(
          'POSITION',
          parsed as CatalogItem[],
          STORAGE_KEY
        );
        setPositions(persisted);
        alert(`Đã nhập thành công ${parsed.length} chức danh vào hệ thống.`);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      alert(`Nhập dữ liệu thất bại: ${err?.message || 'File không đúng định dạng'}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportGenericCatalogWorkbook('chuc-danh', filteredPositions);
    } catch (error) {
      console.error('Export error:', error);
      alert('Xuất file excel thất bại!');
    }
  };

  // --------------------------------------------------------------------------
  // 7. RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="p-4 sm:p-6 space-y-4 bg-slate-50/60 min-h-screen">
      {/* ===================================================================== */}
      {/* 1. TIÊU CHÍ TÌM KIẾM (SEARCH CRITERIA PANEL)                          */}
      {/* ===================================================================== */}
      <div
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch();
        }}
        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3 font-sans text-xs"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
            Tiêu chí tìm kiếm
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Chọn tiêu chí và bấm "Tìm kiếm" (hoặc nhấn Enter)
          </span>
        </div>

        {/* Filter Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Mã chức danh
            </label>
            <SearchableSelect
              value={filterForm.code}
              onChange={(val) => setFilterForm({ ...filterForm, code: val })}
              options={codeOptions}
              placeholder={`Tất cả mã (${positions.length})`}
              emptyOptionLabel={`Tất cả mã (${positions.length})`}
              heightClass="h-9"
              icon={<Briefcase className="w-3.5 h-3.5" />}
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Tên chức danh
            </label>
            <SearchableSelect
              value={filterForm.name}
              onChange={(val) => setFilterForm({ ...filterForm, name: val })}
              options={nameOptions}
              placeholder={`Tất cả chức danh (${positions.length})`}
              emptyOptionLabel={`Tất cả chức danh (${positions.length})`}
              heightClass="h-9"
              icon={<Briefcase className="w-3.5 h-3.5" />}
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Trạng thái
            </label>
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

        {/* Action Buttons Toolbar */}
        <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Nhập lại</span>
          </button>

          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm kiếm</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Download Template</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer m-0">
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Upload file</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleUploadFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất excel</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. BẢNG DỮ LIỆU CHỨC DANH (DATA TABLE PANEL)                         */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden font-sans">
        {/* Table Card Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wide">
              Chức danh
            </span>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo mới</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Tổng số: <b>{filteredPositions.length}</b> chức danh
          </span>
        </div>

        {/* Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] text-slate-800 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12">
                  STT
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-44">
                  Mã chức danh
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-64">
                  Tên chức danh
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200">
                  Mô tả nhiệm vụ & Chức năng
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28">
                  Ngày tạo
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-center w-28">
                  Trạng thái
                </th>
                <th className="py-2.5 px-3 text-center w-24">
                  Tác vụ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPositions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không tìm thấy chức danh nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                paginatedPositions.map((pos, idx) => (
                  <tr
                    key={pos.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold text-emerald-800">
                      {pos.code}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-900">
                      {pos.name}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-600">
                      {pos.description || '—'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-slate-500 font-mono text-[11px]">
                      {pos.createdAt || pos.createdDate || '10-01-2026'}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pos.status === 'HOAT_DONG'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {pos.status === 'HOAT_DONG' ? 'Hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(pos)}
                          title="Xem/Sửa"
                          className="p-1 hover:bg-slate-100 text-blue-600 rounded transition-colors cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(pos)}
                          title="Xóa"
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

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3 text-xs text-slate-600 font-sans">
          <div className="flex items-center gap-4 flex-wrap">
            <span>
              Hiển thị{' '}
              <b>{filteredPositions.length === 0 ? 0 : startIndex + 1}</b> -{' '}
              <b>{Math.min(startIndex + pageSize, filteredPositions.length)}</b> trên tổng số{' '}
              <b>{filteredPositions.length}</b> bản ghi
            </span>

            <div className="flex items-center gap-1.5">
              <span>Số dòng/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-300 rounded px-2 py-0.5 text-xs bg-white text-slate-700 focus:outline-none focus:border-emerald-600"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Trang đầu"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
              )
              .map((page, idx, arr) => {
                const prevPage = arr[idx - 1];
                const hasGap = prevPage && page - prevPage > 1;
                return (
                  <React.Fragment key={page}>
                    {hasGap && <span className="px-1 text-slate-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-6 h-6 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === page
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              disabled={currentPage >= totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              disabled={currentPage >= totalPages || totalPages === 0}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Trang cuối"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. MODAL CREATE / EDIT FORM                                          */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm">
                {formMode === 'CREATE' ? 'Thêm Mới Chức Danh' : 'Chỉnh Sửa Chức Danh'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveForm}
              className="p-6 space-y-4 text-xs overflow-y-auto flex-1 font-sans"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã chức danh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={formMode === 'EDIT'}
                    placeholder="VD: CD_LAI_XE_CG"
                    value={formData.code || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none font-mono uppercase disabled:bg-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tên chức danh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Lái xe cơ giới"
                    value={formData.name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none font-semibold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mô tả nhiệm vụ & Chức năng
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập mô tả nhiệm vụ công việc của chức danh..."
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={formData.status || 'HOAT_DONG'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as 'HOAT_DONG' | 'TAM_DUNG',
                    })
                  }
                  className="w-full border border-slate-300 rounded p-2 focus:border-emerald-600 focus:outline-none bg-white font-medium text-xs"
                >
                  <option value="HOAT_DONG">Hoạt động</option>
                  <option value="TAM_DUNG">Tạm dừng</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {formMode === 'CREATE' ? 'Tạo mới' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionsCatalogPage;
