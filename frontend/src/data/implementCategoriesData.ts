export interface ImplementCategoryDefinition {
  code: string;
  categoryKey: 'DAN_BUA' | 'DAN_CAY' | 'DAN_PHUN_THUOC' | 'DAN_RAI_PHAN' | 'DAN_XOI' | 'RO_MOOC';
  name: string;
  functionalGroup: string;
  compatibleVehicles: string;
  defaultMaintenanceHours: number;
  totalCount: number;
  status: 'HOAT_DONG' | 'TAM_DUNG';
  description: string;
  badge: string;
}

export const IMPLEMENT_CATEGORIES_CATALOG: ImplementCategoryDefinition[] = [
  {
    code: 'TB-BD',
    categoryKey: 'DAN_BUA',
    name: 'Dàn bừa đĩa',
    functionalGroup: 'Máy làm đất & Làm tơi xốp',
    compatibleVehicles: 'Máy kéo nông nghiệp 50 - 90HP',
    defaultMaintenanceHours: 250,
    totalCount: 77,
    status: 'HOAT_DONG',
    description: 'Bừa phá váng, làm tơi xốp mặt đất sau cày, chuẩn bị mặt luống',
    badge: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  {
    code: 'TB-DC',
    categoryKey: 'DAN_CAY',
    name: 'Dàn cày nông nghiệp',
    functionalGroup: 'Làm đất sâu',
    compatibleVehicles: 'Máy kéo nông nghiệp công suất lớn > 90HP',
    defaultMaintenanceHours: 250,
    totalCount: 115,
    status: 'HOAT_DONG',
    description: 'Cày phá lâm, cày lật tầng đất sâu 25 - 35cm trước khi gieo trồng',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    code: 'TB-PT',
    categoryKey: 'DAN_PHUN_THUOC',
    name: 'Dàn phun thuốc BVTV',
    functionalGroup: 'Bảo vệ thực vật & Chăm sóc',
    compatibleVehicles: 'Máy kéo nông nghiệp 30 - 50HP',
    defaultMaintenanceHours: 250,
    totalCount: 142,
    status: 'HOAT_DONG',
    description: 'Phun thuốc BVTV, tưới thuốc phòng trừ nấm bệnh và sâu rầy vườn chuối',
    badge: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  {
    code: 'TB-RP',
    categoryKey: 'DAN_RAI_PHAN',
    name: 'Dàn rải phân & Vôi',
    functionalGroup: 'Chăm sóc dinh dưỡng cây trồng',
    compatibleVehicles: 'Máy kéo nông nghiệp 40 - 75HP',
    defaultMaintenanceHours: 250,
    totalCount: 66,
    status: 'HOAT_DONG',
    description: 'Rải phân hữu cơ vi sinh, phân khoáng và rải vôi bột khử phèn đất',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  {
    code: 'TB-DX',
    categoryKey: 'DAN_XOI',
    name: 'Dàn xới & Làm đất',
    functionalGroup: 'Làm đất mịn & Tạo luống',
    compatibleVehicles: 'Máy kéo nông nghiệp 40 - 75HP',
    defaultMaintenanceHours: 250,
    totalCount: 140,
    status: 'HOAT_DONG',
    description: 'Xới phay đất mịn, xới cỏ giữa hàng và tạo luống cao rãnh thoát nước',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  {
    code: 'TB-RM',
    categoryKey: 'RO_MOOC',
    name: 'Rơ-moóc & Moóc kéo',
    functionalGroup: 'Vận chuyển nội bộ & Hậu cần',
    compatibleVehicles: 'Máy kéo bánh lốp, Xe đầu kéo, Xe tải',
    defaultMaintenanceHours: 250,
    totalCount: 486,
    status: 'HOAT_DONG',
    description: 'Chở nông sản, buồng chuối, thức ăn gia súc, phân bón nội bộ nông trường',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
  },
];

export const IMPLEMENT_CATEGORY_MAP: Record<string, { label: string; badge: string; code: string }> = {
  DAN_BUA: { label: 'Dàn bừa đĩa', badge: 'bg-sky-100 text-sky-800 border-sky-300', code: 'TB-BD' },
  DAN_CAY: { label: 'Dàn cày nông nghiệp', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', code: 'TB-DC' },
  DAN_PHUN_THUOC: { label: 'Dàn phun thuốc BVTV', badge: 'bg-teal-100 text-teal-800 border-teal-300', code: 'TB-PT' },
  DAN_RAI_PHAN: { label: 'Dàn rải phân & Vôi', badge: 'bg-orange-100 text-orange-800 border-orange-300', code: 'TB-RP' },
  DAN_XOI: { label: 'Dàn xới & Làm đất', badge: 'bg-amber-100 text-amber-800 border-amber-300', code: 'TB-DX' },
  RO_MOOC: { label: 'Rơ-moóc & Moóc kéo', badge: 'bg-purple-100 text-purple-800 border-purple-300', code: 'TB-RM' },
};
