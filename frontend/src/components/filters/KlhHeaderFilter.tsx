import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { catalogsApi } from '../../api/catalogsApi';
import { mockComplexes } from '../../data/catalogData';

export interface KlhItem {
  id: string;
  name: string;
  code: string;
}

const DEFAULT_KLH_LIST: KlhItem[] = [
  { id: 'ALL', name: 'Tất cả Khu liên hợp', code: 'ALL' },
  { id: 'KOUN_MOM', name: 'Khu liên hợp Koun Mom', code: 'KOUN_MOM' },
  { id: 'SNOUL', name: 'Khu liên hợp Snoul', code: 'SNOUL' },
  { id: 'NAM_LAO', name: 'Khu liên hợp Nam Lào', code: 'NAM_LAO' },
];

export const KlhHeaderFilter: React.FC = () => {
  const { selectedKLH, setSelectedKLH } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [klhList, setKlhList] = useState<KlhItem[]>(DEFAULT_KLH_LIST);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load from Catalogs ("danh mục quản lý") to ensure database reality
  useEffect(() => {
    let isMounted = true;
    const loadCatalogs = async () => {
      try {
        const complexes = await catalogsApi.getCatalogs('COMPLEX', 'catalogs_complexes', mockComplexes);
        if (complexes && complexes.length > 0 && isMounted) {
          const mapped: KlhItem[] = [
            { id: 'ALL', name: 'Tất cả Khu liên hợp', code: 'ALL' },
            ...complexes.map((c) => ({
              id: c.code || c.id,
              name: c.name,
              code: c.code || c.id,
            })),
          ];
          // Ensure Koun Mom, Snoul, Nam Lao exist in list
          const hasKM = mapped.some((m) => m.id === 'KOUN_MOM' || m.id === 'KLH_KM');
          const hasSN = mapped.some((m) => m.id === 'SNOUL' || m.id === 'KLH_SN');
          const hasNL = mapped.some((m) => m.id === 'NAM_LAO' || m.id === 'KLH_NL');

          if (!hasKM || !hasSN || !hasNL) {
            setKlhList(DEFAULT_KLH_LIST);
          } else {
            setKlhList(mapped);
          }
        }
      } catch {
        if (isMounted) setKlhList(DEFAULT_KLH_LIST);
      }
    };

    loadCatalogs();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle outside click & Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

const normalizeKlhCode = (val?: string) => {
  if (!val || val === 'ALL') return 'ALL';
  const u = val.toUpperCase();
  if (u === 'KOUN_MOM' || u === 'KM' || u === 'KLH_KM') return 'KOUN_MOM';
  if (u === 'SNOUL' || u === 'SN' || u === 'KLH_SN') return 'SNOUL';
  if (u === 'NAM_LAO' || u === 'NL' || u === 'KLH_NL') return 'NAM_LAO';
  return val;
};

  // Determine current active item
  const normalizedCurrent = normalizeKlhCode(selectedKLH);
  const currentItem =
    klhList.find((item) => normalizeKlhCode(item.code || item.id) === normalizedCurrent) ||
    DEFAULT_KLH_LIST.find((item) => normalizeKlhCode(item.code || item.id) === normalizedCurrent) ||
    DEFAULT_KLH_LIST[0];

  const handleSelect = (item: KlhItem) => {
    const code = normalizeKlhCode(item.code || item.id);
    setSelectedKLH(code);
    setIsOpen(false);

    // Dispatch a custom window event so all pages can immediately re-fetch
    window.dispatchEvent(new CustomEvent('thaco_klh_changed', { detail: { klh: code } }));
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button - Exactly matching user screenshot */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#f0f6f2] hover:bg-[#e6f1e9] border border-[#d2e4d8] text-slate-900 font-bold text-xs sm:text-[13px] tracking-tight cursor-pointer shadow-2xs select-none transition-all duration-150"
      >
        {/* Hierarchy / Sitemap Organization Tree Icon */}
        <svg
          className="w-4 h-4 text-emerald-700 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <rect x="3" y="17" width="6" height="4" rx="1" />
          <rect x="15" y="17" width="6" height="4" rx="1" />
          <path d="M12 7v5" />
          <path d="M6 17v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
        </svg>

        {/* Selected Label */}
        <span className="whitespace-nowrap">{currentItem.name}</span>

        {/* Chevron Dropdown Icon */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-700 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - Exactly matching user screenshot */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 min-w-[210px] w-max bg-white rounded-lg shadow-xl border border-slate-200/90 py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {klhList.map((item) => {
            const isSelected = normalizeKlhCode(item.code || item.id) === normalizedCurrent;

            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-3.5 py-2 text-[13px] sm:text-sm transition-colors cursor-pointer block ${
                  isSelected
                    ? 'bg-[#1976d2] text-white font-medium'
                    : 'text-slate-800 hover:bg-slate-100 font-normal'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
