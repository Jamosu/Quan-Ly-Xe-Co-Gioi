# Table Filter Toolbar Convention (Quy Chuẩn Cố Định Khung Thao Tác & Bộ Lọc Bảng)

Tất cả các trang hiển thị dữ liệu dạng bảng biểu danh sách (Table / Data List) trong toàn bộ ứng dụng Fleet Management **BẮT BUỘC** phải áp dụng cấu trúc thiết kế section chuẩn sau đây:

---

## 1. Cấu Trúc Khung Section Chuẩn (Standard Section Layout)

```tsx
<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
  {/* HÀNG 1: TIÊU ĐỀ + HUY HIỆU SỐ LƯỢNG (TRÁI) & CÁC NÚT THAO TÁC (PHẢI) */}
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
    <div className="flex items-center gap-2">
      <span className="font-heading text-sm font-extrabold text-slate-800 uppercase tracking-wide">
        {TIÊU_ĐỀ_DANH_SÁCH}
      </span>
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
        {TỔNG_SỐ_LƯỢNG} {ĐƠN_VỊ_TÍNH}
      </span>
    </div>

    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
      
      {/* 1. Nút Thêm Mới (Primary Button) */}
      <button
        type="button"
        onClick={handleOpenCreate}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary bg-primary px-3.5 text-xs font-black text-white shadow-xs transition-all hover:bg-primary-600 hover:scale-[1.01]"
      >
        <Plus className="h-4 w-4 stroke-[3]" />
        {NHÃN_THÊM_MỚI}
      </button>

      {/* 2. Nút Liên Kết Danh Mục / Trang Phụ Trợ (Tùy chọn) */}
      {showCatalogLink && (
        <a
          href={CATALOG_URL}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
          {TÊN_DANH_MỤC_LIÊN_KẾT}
          <ExternalLink className="h-3 w-3 text-emerald-600" />
        </a>
      )}

      {/* 3. Nút Tải File Mẫu (Emerald Soft) */}
      <button
        type="button"
        onClick={handleDownloadTemplate}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Tải file mẫu
      </button>

      {/* 4. Nút Import Excel (Sky Soft) */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-800 transition-all hover:bg-sky-100 disabled:opacity-50"
      >
        <Upload className="h-3.5 w-3.5" />
        {isImporting ? 'Đang import...' : 'Import Excel'}
      </button>

      {/* 5. Nút Xuất Excel (Slate Soft với Icon Emerald) */}
      <button
        type="button"
        onClick={handleExportExcel}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100"
      >
        <Download className="h-3.5 w-3.5 text-emerald-700" />
        Xuất Excel
      </button>
    </div>
  </div>

  {/* BANNER THÔNG BÁO IMPORT (NẾU CÓ) */}
  {importMessage && (
    <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${importMessage.startsWith('Đã import') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
      {importMessage}
    </div>
  )}

  {/* HÀNG 2: Ô TÌM KIẾM TO RÕ & BẬT TẮT BỘ LỌC NÂNG CAO */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
    <div className="flex-1">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nhập từ khóa tìm kiếm..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-xs font-medium text-slate-800 outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <button
        type="button"
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition-all ${
          showAdvancedFilters || activeFilterCount > 0
            ? 'border-primary bg-primary-50 text-primary'
            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Bộ lọc nâng cao
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] text-white font-bold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex h-10 items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
          title="Xóa toàn bộ bộ lọc"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Đặt lại
        </button>
      )}
    </div>
  </div>

  {/* HÀNG 3: LƯỚI BỘ LỌC NÂNG CAO (KHI MỞ RỘNG) */}
  {showAdvancedFilters && (
    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Mỗi ô lọc gồm: label tiêu đề in hoa nhỏ & SearchableSelect có số lượng */}
      <div>
        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
          Tên trường lọc
        </label>
        <SearchableSelect ... />
      </div>
    </div>
  )}
</section>
```

---

## 2. Quy Chuẩn Hiển Thị Số Lượng Trong Từng Mục Lọc Dropdown (Option Item Quantity Subtitle)

Trong dropdown của từng bộ lọc (sử dụng component `SearchableSelect`):
1. **Mục đầu tiên (Bỏ lọc / Tất cả)**:
   - Hiển thị nhãn như `Tất cả hãng`, `Tất cả khu vực`, `Tất cả đơn vị`, `Tất cả model`...
   - Có icon tích xanh `✓` ở bên phải khi đang được chọn.
2. **Mỗi tùy chọn bên dưới (Items)**:
   - Dòng 1: Tên nhãn của tùy chọn (ví dụ: `AMMANN`, `Khu vực Daun Penh (DP)`).
   - Dòng 2 (`subLabel`): Hiển thị số lượng tương ứng dưới dạng chữ nhỏ (`text-[11px] text-slate-500 font-normal mt-0.5`), ví dụ: `1 xe`, `45 xe`, `10 bộ`, `3 nhân sự`.
   - Phía bên phải: Icon tích xanh `✓` khi mục đó đang được chọn.
3. **Đồng bộ**: 100% các ô lọc tìm kiếm trên toàn hệ thống phải tuân thủ việc hiển thị số lượng này theo đúng thiết kế tại Hình 1.
