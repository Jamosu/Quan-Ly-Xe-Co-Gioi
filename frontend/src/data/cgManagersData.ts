export interface CGManagerItem {
  id: string;
  unitName: string;
  managerName: string;
  phone: string;
  location: string;
  notes?: string;
}

export interface MasterLocationItem {
  id: string;
  name: string;
  complexCode: 'KOUN_MOM' | 'SNOUL' | 'NAM_LAO' | string;
  complexName: string;
  regionName?: string;
  address?: string;
  status?: 'HOAT_DONG' | 'TAM_DUNG';
}

export const INITIAL_CG_MANAGERS: CGManagerItem[] = [
  { id: 'CGM-01', unitName: 'XN Chuối DP1', managerName: 'Thái Cao Lưu', phone: '0387783316', location: 'Lô 21 DP1' },
  { id: 'CGM-02', unitName: 'XN Chuối DP2', managerName: 'Huỳnh Quang Viên', phone: '0977623379', location: 'Lô 15.6 DP2' },
  { id: 'CGM-03', unitName: 'XN Chuối DP3', managerName: 'Thạch Ngọc Vững', phone: '0975905267', location: 'Lô 28 DP3' },
  { id: 'CGM-04', unitName: 'XN Chuối DP4', managerName: 'Cơ giới DP4', phone: '0825456565', location: 'Lô 85 DP4' },
  { id: 'CGM-05', unitName: 'XN Chuối LP1', managerName: 'Nguyễn Ngọc Nhân', phone: '0979578112', location: 'Lô 7 LP1' },
  { id: 'CGM-06', unitName: 'XN Chuối LP2', managerName: 'Cơ giới LP2', phone: '0979578112', location: 'Lô 7 LP1' },
  { id: 'CGM-07', unitName: 'XN Chuối LP3', managerName: 'Lê Cao Nghị', phone: '0977423100', location: 'Lô 2 LP3' },
  { id: 'CGM-08', unitName: 'XN Bò AD', managerName: 'Trần Văn Nam', phone: '0971993540', location: 'Lô 28 XN Bò' },
  { id: 'CGM-09', unitName: 'CGLĐ XN Bò', managerName: 'T.Q.Đ Ngọc Hải', phone: '0344302386', location: 'Lô 28, 65 XN Bò' },
  { id: 'CGM-10', unitName: 'CGLĐ DP', managerName: 'Nguyễn Tấn Triều', phone: '05974160290', location: 'Lô 85 DP4' },
  { id: 'CGM-11', unitName: 'CGLĐ LP', managerName: 'Nguyễn Tấn Triều', phone: '05974160290', location: 'LP3.5-LP3' },
  { id: 'CGM-12', unitName: 'CGTC DP', managerName: 'Phạm Ngọc Hải', phone: '0825456565', location: 'Lô 85 DP4' },
  { id: 'CGM-13', unitName: 'CGTC LP', managerName: 'Đỗ Đức Nghĩa', phone: '0971462780', location: 'NOCN L.4-LP3' },
  { id: 'CGM-14', unitName: 'CGTC AD', managerName: 'Vũ Trung Kiên', phone: '0981761677', location: 'Lô 73 ADM' },
  { id: 'CGM-15', unitName: 'Trạm trộn bê tông', managerName: 'Phạm Nhật Thịnh', phone: '0935178908', location: 'Trạm trộn DP' },
  { id: 'CGM-16', unitName: 'Hành chính KLH', managerName: 'Lê Trần Hoàng Minh', phone: '0965509539', location: 'Văn Phòng 94' },
  { id: 'CGM-17', unitName: 'Xoài AD', managerName: 'Huỳnh Đông Giang', phone: '0972283372', location: 'Lô 132 XN AD' },
  { id: 'CGM-18', unitName: 'Xoài DP', managerName: 'Hà Văn Nghĩa', phone: '0813564564', location: 'Lô 136 XN Xoài' },
  { id: 'CGM-19', unitName: 'Bưởi AD', managerName: 'Huỳnh Đông Giang', phone: '0972283372', location: 'Lô 132 XN AD' },
  { id: 'CGM-20', unitName: 'Ban điện nước', managerName: 'Trần Đình Phúc', phone: '0924518278', location: 'Kho điện nước' },
  { id: 'CGM-21', unitName: 'Xưởng Cơ khí DP', managerName: 'Xưởng BTSC DP', phone: '0825456565', location: 'Xưởng cơ khí DP' },
  { id: 'CGM-22', unitName: 'Phòng GNVC', managerName: 'Lâm Quốc Cường', phone: '0384653979', location: 'Tổng kho KLH' },
  { id: 'CGM-23', unitName: 'Thadicons A&I', managerName: 'Cơ giới Thadicons', phone: '0825456565', location: 'VP Thadicons' },
  { id: 'CGM-24', unitName: 'Thagricons', managerName: 'Cơ giới Thagricons', phone: '0825456565', location: 'VP Thagricons' },
  { id: 'CGM-25', unitName: 'Tổng kho', managerName: 'Võ Thanh Hiếu', phone: '0884281479', location: 'Tổng kho KLH' },
  { id: 'CGM-26', unitName: 'NM NHỰA -XỐP DP', managerName: 'Nguyễn Xuân Liêm', phone: '0762578457', location: 'NM Nhựa' },
  { id: 'CGM-27', unitName: 'BAN CG-CK & SXCN', managerName: 'Ban Cơ Giới KLH', phone: '0825456565', location: 'VP Ban Cơ Giới' },
];

export const INITIAL_MASTER_LOCATIONS: MasterLocationItem[] = [
  // --- KHU LIÊN HỢP KOUN MOM ---
  { id: 'LOC-KM-01', name: 'Lô 21 DP1', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'XN Chuối Daun Penh 1, Ratanakiri' },
  { id: 'LOC-KM-02', name: 'Lô 15.6 DP2', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'XN Chuối Daun Penh 2, Ratanakiri' },
  { id: 'LOC-KM-03', name: 'Lô 28 DP3', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'XN Chuối Daun Penh 3, Ratanakiri' },
  { id: 'LOC-KM-04', name: 'Lô 85 DP4', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'XN Chuối Daun Penh 4 & Đội Cơ giới' },
  { id: 'LOC-KM-05', name: 'Lô 7 LP1', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Lumphat (LP)', address: 'XN Chuối Lumphat 1' },
  { id: 'LOC-KM-06', name: 'Lô 2 LP3', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Lumphat (LP)', address: 'XN Chuối Lumphat 3' },
  { id: 'LOC-KM-07', name: 'LP3.5-LP3', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Lumphat (LP)', address: 'Cụm sản xuất Lumphat 3.5' },
  { id: 'LOC-KM-08', name: 'NOCN L.4-LP3', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Lumphat (LP)', address: 'Khu cơ giới thi công LP3' },
  { id: 'LOC-KM-09', name: 'Lô 28 XN Bò', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Andong Meas (AD)', address: 'Khu chuồng trại Xí nghiệp Bò AD' },
  { id: 'LOC-KM-10', name: 'Lô 28, 65 XN Bò', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Andong Meas (AD)', address: 'Đội Cơ giới làm đất XN Bò' },
  { id: 'LOC-KM-11', name: 'Lô 73 ADM', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Andong Meas (AD)', address: 'Cụm cơ giới thi công Andong Meas' },
  { id: 'LOC-KM-12', name: 'Lô 132 XN AD', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Andong Meas (AD)', address: 'Vườn Xoài & Bưởi Xí nghiệp AD' },
  { id: 'LOC-KM-13', name: 'Lô 136 XN Xoài', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'Khu trồng xoài Daun Penh' },
  { id: 'LOC-KM-14', name: 'Trạm trộn DP', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'Trạm trộn bê tông Daun Penh' },
  { id: 'LOC-KM-15', name: 'Xưởng cơ khí DP', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'Xưởng BTSC Cơ giới Daun Penh' },
  { id: 'LOC-KM-16', name: 'NM Nhựa', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Khu vực Daun Penh (DP)', address: 'Nhà máy Nhựa - Xốp Daun Penh' },
  { id: 'LOC-KM-17', name: 'Kho điện nước', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Văn phòng KLH', address: 'Ban Điện nước KLH Koun Mom' },
  { id: 'LOC-KM-18', name: 'Văn Phòng 94', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Văn phòng KLH', address: 'Khối Hành chính Quản trị KLH Koun Mom' },
  { id: 'LOC-KM-19', name: 'Tổng kho KLH', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Văn phòng KLH', address: 'Tổng kho vật tư & phụ tùng trung tâm' },
  { id: 'LOC-KM-20', name: 'VP Ban Cơ Giới', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Văn phòng KLH', address: 'Ban Quản trị Cơ giới - Cơ khí KLH' },
  { id: 'LOC-KM-21', name: 'VP Thadicons', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Văn phòng KLH', address: 'Ban Điều hành Thadicons A&I' },
  { id: 'LOC-KM-22', name: 'VP Thagricons', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Văn phòng KLH', address: 'Ban Điều hành Thagricons' },
  { id: 'LOC-KM-23', name: 'Bãi xe Trung tâm', complexCode: 'KOUN_MOM', complexName: 'Khu liên hợp Koun Mom', regionName: 'Toàn KLH', address: 'Bãi tập kết & điều động xe trung tâm KLH Koun Mom' },

  // --- KHU LIÊN HỢP SNOUL ---
  { id: 'LOC-SN-01', name: 'Bãi xe XN Cao su Snoul 1', complexCode: 'SNOUL', complexName: 'Khu liên hợp Snoul', regionName: 'Xí nghiệp Cao su Snoul', address: 'Nông trường Cao su 1, Huyện Snoul, Tỉnh Kratie' },
  { id: 'LOC-SN-02', name: 'Bãi xe NT Cao su Snoul 2', complexCode: 'SNOUL', complexName: 'Khu liên hợp Snoul', regionName: 'Xí nghiệp Cao su Snoul', address: 'Nông trường Cao su 2, Huyện Snoul, Tỉnh Kratie' },
  { id: 'LOC-SN-03', name: 'Bãi tập kết XN Bò Thịt Snoul', complexCode: 'SNOUL', complexName: 'Khu liên hợp Snoul', regionName: 'Xí nghiệp Bò Snoul', address: 'Khu chuồng trại nuôi bò thịt Snoul' },
  { id: 'LOC-SN-04', name: 'Bãi máy XN Trồng cỏ TMR Snoul', complexCode: 'SNOUL', complexName: 'Khu liên hợp Snoul', regionName: 'Xí nghiệp Trồng cỏ & TMR', address: 'Cụm máy băm cỏ trạm thức ăn TMR Snoul' },
  { id: 'LOC-SN-05', name: 'Xưởng BTSC Cơ giới Snoul', complexCode: 'SNOUL', complexName: 'Khu liên hợp Snoul', regionName: 'Xưởng BTSC Snoul', address: 'Trung tâm Bảo dưỡng Sửa chữa Snoul' },
  { id: 'LOC-SN-06', name: 'Tổng kho KLH Snoul', complexCode: 'SNOUL', complexName: 'Khu liên hợp Snoul', regionName: 'Văn phòng KLH Snoul', address: 'Tổng kho vật tư kỹ thuật KLH Snoul' },

  // --- KHU LIÊN HỢP NAM LÀO ---
  { id: 'LOC-NL-01', name: 'Bãi xe XN Trồng trọt Attapeu', complexCode: 'NAM_LAO', complexName: 'Khu liên hợp Nam Lào', regionName: 'Xí nghiệp Trồng trọt Attapeu', address: 'Cụm cơ giới trồng ngô & đậu nành Attapeu' },
  { id: 'LOC-NL-02', name: 'Bãi tập kết Nông trường 1 Attapeu', complexCode: 'NAM_LAO', complexName: 'Khu liên hợp Nam Lào', regionName: 'Xí nghiệp Cơ giới Hóa Attapeu', address: 'Nông trường Nông nghiệp 1 Attapeu, Lào' },
  { id: 'LOC-NL-03', name: 'Bãi máy gieo trồng NT2 Nam Lào', complexCode: 'NAM_LAO', complexName: 'Khu liên hợp Nam Lào', regionName: 'Xí nghiệp Trồng trọt Attapeu', address: 'Nông trường 2 Attapeu, Tỉnh Attapeu, Lào' },
  { id: 'LOC-NL-04', name: 'Bãi xe XN Bò Thịt Nam Lào', complexCode: 'NAM_LAO', complexName: 'Khu liên hợp Nam Lào', regionName: 'Xí nghiệp Bò Nam Lào', address: 'Trang trại Bò giống Nam Lào' },
  { id: 'LOC-NL-05', name: 'Xưởng Cơ khí & BTSC Attapeu', complexCode: 'NAM_LAO', complexName: 'Khu liên hợp Nam Lào', regionName: 'Xưởng BTSC Nam Lào', address: 'Xưởng Cơ điện & Sửa chữa trung tâm Attapeu' },
  { id: 'LOC-NL-06', name: 'Tổng kho KLH Nam Lào', complexCode: 'NAM_LAO', complexName: 'Khu liên hợp Nam Lào', regionName: 'Văn phòng KLH Nam Lào', address: 'Tổng kho vật tư nông nghiệp Nam Lào' },
];

export const MASTER_LOCATIONS: string[] = INITIAL_MASTER_LOCATIONS.map((l) => l.name);
