const { PrismaClient, ImplementCategory, ImplementStatus, TechnicalCondition, Unit } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- GENERATING AGRICULTURAL IMPLEMENTS FOR SNOUL AND NAM LAO ---');

  // Find some tractors/vehicles in Snoul and Nam Lao to attach
  const snoulTractors = await prisma.vehicle.findMany({
    where: { complexCode: 'SNOUL' },
    select: { id: true, code: true },
    take: 10,
  });

  const namLaoTractors = await prisma.vehicle.findMany({
    where: { complexCode: 'NAM_LAO' },
    select: { id: true, code: true },
    take: 10,
  });

  // 1. SNOUL IMPLEMENT DEFINITIONS
  const snoulTemplates = [
    // DAN_CAY (Dàn cày)
    { name: 'Dàn cày 4 chảo Kubota Snoul', category: 'DAN_CAY', unit: 'NT1', unitName: 'XN Cao su Snoul 1', brand: 'KUBOTA', model: 'DP244', origin: 'THÁI LAN', purpose: 'Cày sâu 35-40cm làm đất cao su', loc: 'Bãi xe XN Cao su Snoul 1', mgr: 'Lê Cao Phong', phone: '0978112233' },
    { name: 'Dàn cày ngầm 3 trụ khai hoang Snoul', category: 'DAN_CAY', unit: 'BAN_CO_GIOI', unitName: 'Ban Cơ Giới Snoul', brand: 'TRUNG QUỐC', model: '3-TRU-HD', origin: 'TRUNG QUỐC', purpose: 'Cày ngầm xới phá tầng đế cày', loc: 'Bãi máy XN Trồng cỏ TMR Snoul', mgr: 'Vũ Đức Toàn', phone: '0988445566' },
    { name: 'Dàn cày 5 chảo lật đất Siam Snoul', category: 'DAN_CAY', unit: 'NT2', unitName: 'XN Cao su Snoul 2', brand: 'SIAM IMPLEMENT', model: 'DH245F', origin: 'THÁI LAN', purpose: 'Cày lật đất tạo độ mùn', loc: 'Bãi xe NT Cao su Snoul 2', mgr: 'Trần Văn Đạt', phone: '0912334455' },
    { name: 'Dàn cày 6 chảo đĩa lớn Snoul', category: 'DAN_CAY', unit: 'XN_BO', unitName: 'XN Bò Thịt Snoul', brand: 'BALDAN', model: 'CRSG-6', origin: 'BRAZIL', purpose: 'Cày vỡ đất cứng chu kỳ mới', loc: 'Bãi tập kết XN Bò Thịt Snoul', mgr: 'Nguyễn Hữu Tài', phone: '0933778899' },
    { name: 'Dàn cày chảo gắn máy kéo 90HP Snoul', category: 'DAN_CAY', unit: 'TT_BTSC', unitName: 'Xưởng BTSC Snoul', brand: 'KUBOTA', model: 'DH224', origin: 'NHẬT BẢN', purpose: 'Cày luống thoát nước', loc: 'Xưởng BTSC Cơ giới Snoul', mgr: 'Bùi Quang Huy', phone: '0909556677' },

    // DAN_BUA (Dàn bừa đĩa)
    { name: 'Dàn bừa đĩa 24 chảo làm tơi xốp Snoul', category: 'DAN_BUA', unit: 'NT1', unitName: 'XN Cao su Snoul 1', brand: 'SIAM IMPLEMENT', model: 'DH2424', origin: 'THÁI LAN', purpose: 'Bừa tơi đất sau cày lật', loc: 'Bãi xe XN Cao su Snoul 1', mgr: 'Lê Cao Phong', phone: '0978112233' },
    { name: 'Dàn bừa đĩa 28 chảo hạng nặng Snoul', category: 'DAN_BUA', unit: 'NT2', unitName: 'XN Cao su Snoul 2', brand: 'BALDAN', model: 'SPIC 28', origin: 'BRAZIL', purpose: 'Bừa băm gốc cỏ dại', loc: 'Bãi xe NT Cao su Snoul 2', mgr: 'Trần Văn Đạt', phone: '0912334455' },
    { name: 'Dàn bừa san phẳng mặt ruộng 20 chảo Snoul', category: 'DAN_BUA', unit: 'XN_BO', unitName: 'XN Bò Thịt Snoul', brand: 'KUBOTA', model: 'DH2020', origin: 'THÁI LAN', purpose: 'Bừa phẳng mặt bằng gieo trồng', loc: 'Bãi tập kết XN Bò Thịt Snoul', mgr: 'Nguyễn Hữu Tài', phone: '0933778899' },
    { name: 'Dàn bừa băm phay rạ cỏ Snoul', category: 'DAN_BUA', unit: 'BAN_CO_GIOI', unitName: 'Ban Cơ Giới Snoul', brand: 'HOWO AGRI', model: 'HM-240', origin: 'TRUNG QUỐC', purpose: 'Băm nghiền phế phẩm hữu cơ', loc: 'Bãi máy XN Trồng cỏ TMR Snoul', mgr: 'Vũ Đức Toàn', phone: '0988445566' },

    // DAN_XOI (Dàn xới đất)
    { name: 'Dàn xới đất đứng Rotary RX220 Snoul', category: 'DAN_XOI', unit: 'NT1', unitName: 'XN Cao su Snoul 1', brand: 'KUBOTA', model: 'RX220F', origin: 'NHẬT BẢN', purpose: 'Xới mịn tơi đất chuẩn bị lên luống', loc: 'Bãi xe XN Cao su Snoul 1', mgr: 'Lê Cao Phong', phone: '0978112233' },
    { name: 'Dàn phay xới tạo luống cao su Snoul', category: 'DAN_XOI', unit: 'NT2', unitName: 'XN Cao su Snoul 2', brand: 'CELLI', model: 'E160', origin: 'ITALIA', purpose: 'Lên luống cao su thoát nước', loc: 'Bãi xe NT Cao su Snoul 2', mgr: 'Trần Văn Đạt', phone: '0912334455' },
    { name: 'Dàn xới sâu đa năng 7 răng Snoul', category: 'DAN_XOI', unit: 'TT_BTSC', unitName: 'Xưởng BTSC Snoul', brand: 'TÂN PHÁT', model: 'TP-X7', origin: 'VIỆT NAM', purpose: 'Xới sâu phá váng mặt đất', loc: 'Xưởng BTSC Cơ giới Snoul', mgr: 'Bùi Quang Huy', phone: '0909556677' },

    // DAN_RAI_PHAN (Dàn rải phân)
    { name: 'Dàn rải phân hữu cơ vi sinh 3 tấn Snoul', category: 'DAN_RAI_PHAN', unit: 'XN_BO', unitName: 'XN Bò Thịt Snoul', brand: 'KUHN', model: 'PROSPREAD', origin: 'PHÁP', purpose: 'Rải phân chuồng hoai mục đồng cỏ', loc: 'Bãi tập kết XN Bò Thịt Snoul', mgr: 'Nguyễn Hữu Tài', phone: '0933778899' },
    { name: 'Dàn rải vôi & phân khoáng NPK 1.5 tấn Snoul', category: 'DAN_RAI_PHAN', unit: 'NT1', unitName: 'XN Cao su Snoul 1', brand: 'AMAZONE', model: 'ZA-M', origin: 'ĐỨC', purpose: 'Bón lót phân vô cơ diện rộng', loc: 'Bãi xe XN Cao su Snoul 1', mgr: 'Lê Cao Phong', phone: '0978112233' },
    { name: 'Dàn rải phân bón gốc cây cao su Snoul', category: 'DAN_RAI_PHAN', unit: 'NT2', unitName: 'XN Cao su Snoul 2', brand: 'THACO AGRI', model: 'TAG-RP01', origin: 'VIỆT NAM', purpose: 'Bón phân theo hàng cây cao su', loc: 'Bãi xe NT Cao su Snoul 2', mgr: 'Trần Văn Đạt', phone: '0912334455' },

    // RO_MOOC (Rơ-moóc & Moóc kéo)
    { name: 'Rơ-moóc chuyên dụng chở mủ cao su 5 tấn Snoul', category: 'RO_MOOC', unit: 'NT1', unitName: 'XN Cao su Snoul 1', brand: 'THACO INDUSTRIES', model: 'RM-5T-CS', origin: 'VIỆT NAM', purpose: 'Vận chuyển thùng mủ về nhà máy', loc: 'Bãi xe XN Cao su Snoul 1', mgr: 'Lê Cao Phong', phone: '0978112233' },
    { name: 'Rơ-moóc ben tự đổ 8 tấn chở đất đá Snoul', category: 'RO_MOOC', unit: 'BAN_CO_GIOI', unitName: 'Ban Cơ Giới Snoul', brand: 'THACO INDUSTRIES', model: 'RM-BEN-8T', origin: 'VIỆT NAM', purpose: 'San lấp mặt bằng & chuyển vật liệu', loc: 'Xưởng BTSC Cơ giới Snoul', mgr: 'Bùi Quang Huy', phone: '0909556677' },
    { name: 'Rơ-moóc chở cỏ tươi băm nhỏ 6 tấn Snoul', category: 'RO_MOOC', unit: 'XN_BO', unitName: 'XN Bò Thịt Snoul', brand: 'JOSKIN', model: 'SILO-SPACE', origin: 'BỈ', purpose: 'Chở cỏ từ đồng về trạm TMR', loc: 'Bãi máy XN Trồng cỏ TMR Snoul', mgr: 'Vũ Đức Toàn', phone: '0988445566' },
    { name: 'Rơ-moóc sàn phẳng chở máy móc nông cụ Snoul', category: 'RO_MOOC', unit: 'TOAN_KLH', unitName: 'Ban Quản Lý KLH Snoul', brand: 'THACO INDUSTRIES', model: 'RM-SAN-10T', origin: 'VIỆT NAM', purpose: 'Trung chuyển nông cụ giữa các đội', loc: 'Tổng kho KLH Snoul', mgr: 'Bùi Quang Huy', phone: '0909556677' },

    // DAN_PHUN_THUOC (Dàn phun thuốc)
    { name: 'Dàn phun thuốc BVTV cần dài 15m Snoul', category: 'DAN_PHUN_THUOC', unit: 'NT1', unitName: 'XN Cao su Snoul 1', brand: 'HARDI', model: 'NAVIGATOR', origin: 'ĐAN MẠCH', purpose: 'Phun phòng trừ nấm bệnh lá cao su', loc: 'Bãi xe XN Cao su Snoul 1', mgr: 'Lê Cao Phong', phone: '0978112233' },
    { name: 'Dàn phun thuốc sương mù cao áp Snoul', category: 'DAN_PHUN_THUOC', unit: 'NT2', unitName: 'XN Cao su Snoul 2', brand: 'CAFFINI', model: 'SYNTHESIS', origin: 'ITALIA', purpose: 'Phun tán lá cao su trưởng thành', loc: 'Bãi xe NT Cao su Snoul 2', mgr: 'Trần Văn Đạt', phone: '0912334455' },
    { name: 'Dàn phun thuốc diệt cỏ gắn đuôi máy kéo Snoul', category: 'DAN_PHUN_THUOC', unit: 'TT_BTSC', unitName: 'Xưởng BTSC Snoul', brand: 'JACTO', model: 'CONDOR 800', origin: 'BRAZIL', purpose: 'Phun thuốc diệt cỏ hàng băng', loc: 'Xưởng BTSC Cơ giới Snoul', mgr: 'Bùi Quang Huy', phone: '0909556677' },
  ];

  // 2. NAM LAO IMPLEMENT DEFINITIONS
  const namLaoTemplates = [
    // DAN_CAY (Dàn cày)
    { name: 'Dàn cày 5 chảo Kuhn Master Attapeu', category: 'DAN_CAY', unit: 'NT1', unitName: 'XN Trồng trọt Attapeu', brand: 'KUHN', model: 'VARI-MASTER', origin: 'PHÁP', purpose: 'Cày sâu 40cm canh tác ngô sinh khối', loc: 'Bãi xe XN Trồng trọt Attapeu', mgr: 'Đỗ Văn Nam', phone: '0981223344' },
    { name: 'Dàn cày ngầm 5 trụ phá đế cày Nam Lào', category: 'DAN_CAY', unit: 'BAN_CO_GIOI', unitName: 'Ban Cơ Giới Nam Lào', brand: 'TRUNG QUỐC', model: '5-TRU-HD', origin: 'TRUNG QUỐC', purpose: 'Phá tầng đế cày thoát nước đồng bãi', loc: 'Bãi máy gieo trồng NT2 Nam Lào', mgr: 'Phạm Quốc Bảo', phone: '0972445566' },
    { name: 'Dàn cày 6 chảo đĩa Baldan Brazil Nam Lào', category: 'DAN_CAY', unit: 'NT2', unitName: 'Nông trường 1 Attapeu', brand: 'BALDAN', model: 'CRSG-6', origin: 'BRAZIL', purpose: 'Cày lật đất vụ đậu nành', loc: 'Bãi tập kết Nông trường 1 Attapeu', mgr: 'Hoàng Đình Thắng', phone: '0938556677' },
    { name: 'Dàn cày chảo Kubota DH244 Nam Lào', category: 'DAN_CAY', unit: 'XN_BO', unitName: 'XN Bò Thịt Nam Lào', brand: 'KUBOTA', model: 'DH244', origin: 'THÁI LAN', purpose: 'Cày vỡ đất đồng cỏ', loc: 'Bãi xe XN Bò Thịt Nam Lào', mgr: 'Nguyễn Văn Thành', phone: '0919667788' },

    // DAN_BUA (Dàn bừa đĩa)
    { name: 'Dàn bừa đĩa 28 chảo gieo ngô Attapeu', category: 'DAN_BUA', unit: 'NT1', unitName: 'XN Trồng trọt Attapeu', brand: 'BALDAN', model: 'SPIC 28', origin: 'BRAZIL', purpose: 'Bừa tơi mịn đất gieo hạt', loc: 'Bãi xe XN Trồng trọt Attapeu', mgr: 'Đỗ Văn Nam', phone: '0981223344' },
    { name: 'Dàn bừa đĩa 24 chảo Siam Nam Lào', category: 'DAN_BUA', unit: 'NT2', unitName: 'Nông trường 1 Attapeu', brand: 'SIAM IMPLEMENT', model: 'DH2424', origin: 'THÁI LAN', purpose: 'Bừa băm cỏ đồng bãi', loc: 'Bãi tập kết Nông trường 1 Attapeu', mgr: 'Hoàng Đình Thắng', phone: '0938556677' },
    { name: 'Dàn bừa băm phay tơi xốp đất đồi Nam Lào', category: 'DAN_BUA', unit: 'TT_BTSC', unitName: 'Xưởng BTSC Nam Lào', brand: 'AMAZONE', model: 'CATROS 3001', origin: 'ĐỨC', purpose: 'Bừa băm gốc ngô sau thu hoạch', loc: 'Xưởng Cơ khí & BTSC Attapeu', mgr: 'Lê Văn Chung', phone: '0908889900' },

    // DAN_XOI (Dàn xới đất)
    { name: 'Dàn xới đất Rotary RX240 Nam Lào', category: 'DAN_XOI', unit: 'NT1', unitName: 'XN Trồng trọt Attapeu', brand: 'KUBOTA', model: 'RX240F', origin: 'NHẬT BẢN', purpose: 'Xới tơi xốp luống gieo hạt', loc: 'Bãi xe XN Trồng trọt Attapeu', mgr: 'Đỗ Văn Nam', phone: '0981223344' },
    { name: 'Dàn xới sâu kết hợp bón lót phân Nam Lào', category: 'DAN_XOI', unit: 'NT2', unitName: 'Nông trường 1 Attapeu', brand: 'CELLI', model: 'ENERGY 250', origin: 'ITALIA', purpose: 'Xới sâu 30cm bón phân ngầm', loc: 'Bãi tập kết Nông trường 1 Attapeu', mgr: 'Hoàng Đình Thắng', phone: '0938556677' },
    { name: 'Dàn phay đất luống trồng bắp Nam Lào', category: 'DAN_XOI', unit: 'NT1', unitName: 'Nông trường 2 Nam Lào', brand: 'TÂN PHÁT', model: 'TP-L22', origin: 'VIỆT NAM', purpose: 'Lên luống thoát nước vụ mưa', loc: 'Bãi máy gieo trồng NT2 Nam Lào', mgr: 'Phạm Quốc Bảo', phone: '0972445566' },

    // DAN_RAI_PHAN (Dàn rải phân)
    { name: 'Dàn rải phân chuồng hoai mục 5 tấn Nam Lào', category: 'DAN_RAI_PHAN', unit: 'XN_BO', unitName: 'XN Bò Thịt Nam Lào', brand: 'JOSKIN', model: 'SIROKO 5T', origin: 'BỈ', purpose: 'Bón phân hữu cơ cải tạo đất đồi', loc: 'Bãi xe XN Bò Thịt Nam Lào', mgr: 'Nguyễn Văn Thành', phone: '0919667788' },
    { name: 'Dàn rải vôi & phân hóa học 2 đĩa văng Nam Lào', category: 'DAN_RAI_PHAN', unit: 'NT1', unitName: 'XN Trồng trọt Attapeu', brand: 'AMAZONE', model: 'ZA-TS', origin: 'ĐỨC', purpose: 'Bón vôi khử chua đất bazan', loc: 'Bãi xe XN Trồng trọt Attapeu', mgr: 'Đỗ Văn Nam', phone: '0981223344' },

    // RO_MOOC (Rơ-moóc)
    { name: 'Rơ-moóc ben nông sản 10 tấn Attapeu', category: 'RO_MOOC', unit: 'NT1', unitName: 'XN Trồng trọt Attapeu', brand: 'THACO INDUSTRIES', model: 'RM-BEN-10T', origin: 'VIỆT NAM', purpose: 'Vận chuyển ngô sinh khối về silo', loc: 'Bãi xe XN Trồng trọt Attapeu', mgr: 'Đỗ Văn Nam', phone: '0981223344' },
    { name: 'Rơ-moóc chở cỏ tươi 8 tấn trạm TMR Nam Lào', category: 'RO_MOOC', unit: 'XN_BO', unitName: 'XN Bò Thịt Nam Lào', brand: 'JOSKIN', model: 'SILO-SPACE 8T', origin: 'BỈ', purpose: 'Thu gom cỏ voi trạm thức ăn bò', loc: 'Bãi xe XN Bò Thịt Nam Lào', mgr: 'Nguyễn Văn Thành', phone: '0919667788' },
    { name: 'Rơ-moóc 2 cầu chở phân bón vật tư 6 tấn Nam Lào', category: 'RO_MOOC', unit: 'NT2', unitName: 'Nông trường 1 Attapeu', brand: 'THACO INDUSTRIES', model: 'RM-2C-6T', origin: 'VIỆT NAM', purpose: 'Chở phân bón ra cánh đồng', loc: 'Bãi tập kết Nông trường 1 Attapeu', mgr: 'Hoàng Đình Thắng', phone: '0938556677' },
    { name: 'Rơ-moóc chở téc nước 5000L tưới dặm Nam Lào', category: 'RO_MOOC', unit: 'TOAN_KLH', unitName: 'Tổng Kho KLH Nam Lào', brand: 'TÂN PHÁT', model: 'RM-NUOC-5M3', origin: 'VIỆT NAM', purpose: 'Tiếp nước máy phun thuốc ngoài đồng', loc: 'Tổng kho KLH Nam Lào', mgr: 'Lê Văn Chung', phone: '0908889900' },

    // DAN_PHUN_THUOC (Dàn phun thuốc)
    { name: 'Dàn phun thuốc BVTV cần gập 18m Attapeu', category: 'DAN_PHUN_THUOC', unit: 'NT1', unitName: 'XN Trồng trọt Attapeu', brand: 'HARDI', model: 'COMMANDER 18', origin: 'ĐAN MẠCH', purpose: 'Phun thuốc bảo vệ đồng ngô diện rộng', loc: 'Bãi xe XN Trồng trọt Attapeu', mgr: 'Đỗ Văn Nam', phone: '0981223344' },
    { name: 'Dàn phun thuốc diệt cỏ 12m gắn máy kéo Nam Lào', category: 'DAN_PHUN_THUOC', unit: 'NT2', unitName: 'Nông trường 1 Attapeu', brand: 'JACTO', model: 'ADVANCE 3000', origin: 'BRAZIL', purpose: 'Xử lý cỏ tiền nảy mầm', loc: 'Bãi tập kết Nông trường 1 Attapeu', mgr: 'Hoàng Đình Thắng', phone: '0938556677' },
  ];

  let snoulCreated = 0;
  let namLaoCreated = 0;

  // Generate 160 Snoul items
  for (let i = 1; i <= 160; i++) {
    const tpl = snoulTemplates[(i - 1) % snoulTemplates.length];
    const seq = String(i).padStart(3, '0');
    const code = `SN-${tpl.category.slice(0, 2)}-${seq}`;

    let status = ImplementStatus.IN_DEPOT;
    let condition = TechnicalCondition.GOOD;
    let attachedVehicleId = null;
    let attachedAt = null;

    if (i % 8 === 0 && snoulTractors.length > 0) {
      status = ImplementStatus.ATTACHED;
      attachedVehicleId = snoulTractors[i % snoulTractors.length].id;
      attachedAt = new Date(Date.now() - (i * 3600000 * 24));
    } else if (i % 16 === 0) {
      status = ImplementStatus.MAINTENANCE;
      condition = TechnicalCondition.NEED_REPAIR;
    } else if (i % 12 === 0) {
      condition = TechnicalCondition.WORN_OUT;
    }

    const standardPurpose = `Đơn vị: ${tpl.unitName} · Hãng: ${tpl.brand} · Model: ${tpl.model} · Nhóm: ${tpl.name} · Tình trạng mua: ${i % 3 === 0 ? 'MUA MỚI' : 'ĐQSD'} · Năm SX: ${2020 + (i % 5)} · Xuất xứ: ${tpl.origin} · Nơi tập kết: ${tpl.loc} · Quản lý: ${tpl.mgr} · Zalo/SĐT: ${tpl.phone}${condition === TechnicalCondition.NEED_REPAIR ? ' · Ghi chú: Hỏng (đang chờ vật tư Xưởng BTSC Snoul)' : ''}`;

    try {
      await prisma.agriculturalImplement.upsert({
        where: { code },
        update: {
          name: `${tpl.name} #${seq}`,
          category: tpl.category,
          unit: tpl.unit,
          currentVehicleId: attachedVehicleId,
          status,
          technicalCondition: condition,
          standardPurpose,
          attachedAt,
          managerName: tpl.mgr,
          gatheringLocation: tpl.loc,
          managerPhone: tpl.phone,
        },
        create: {
          code,
          name: `${tpl.name} #${seq}`,
          category: tpl.category,
          unit: tpl.unit,
          currentVehicleId: attachedVehicleId,
          status,
          technicalCondition: condition,
          standardPurpose,
          attachedAt,
          managerName: tpl.mgr,
          gatheringLocation: tpl.loc,
          managerPhone: tpl.phone,
        },
      });
      snoulCreated++;
    } catch (e) {
      console.error(`Error inserting Snoul implement ${code}:`, e.message);
    }
  }

  // Generate 150 Nam Lao items
  for (let i = 1; i <= 150; i++) {
    const tpl = namLaoTemplates[(i - 1) % namLaoTemplates.length];
    const seq = String(i).padStart(3, '0');
    const code = `NL-${tpl.category.slice(0, 2)}-${seq}`;

    let status = ImplementStatus.IN_DEPOT;
    let condition = TechnicalCondition.GOOD;
    let attachedVehicleId = null;
    let attachedAt = null;

    if (i % 8 === 0 && namLaoTractors.length > 0) {
      status = ImplementStatus.ATTACHED;
      attachedVehicleId = namLaoTractors[i % namLaoTractors.length].id;
      attachedAt = new Date(Date.now() - (i * 3600000 * 20));
    } else if (i % 15 === 0) {
      status = ImplementStatus.MAINTENANCE;
      condition = TechnicalCondition.NEED_REPAIR;
    } else if (i % 11 === 0) {
      condition = TechnicalCondition.WORN_OUT;
    }

    const standardPurpose = `Đơn vị: ${tpl.unitName} · Hãng: ${tpl.brand} · Model: ${tpl.model} · Nhóm: ${tpl.name} · Tình trạng mua: ${i % 4 === 0 ? 'MUA MỚI' : 'ĐQSD'} · Năm SX: ${2021 + (i % 4)} · Xuất xứ: ${tpl.origin} · Nơi tập kết: ${tpl.loc} · Quản lý: ${tpl.mgr} · Zalo/SĐT: ${tpl.phone}${condition === TechnicalCondition.NEED_REPAIR ? ' · Ghi chú: Hỏng (đang chờ bảo dưỡng tại Xưởng Attapeu)' : ''}`;

    try {
      await prisma.agriculturalImplement.upsert({
        where: { code },
        update: {
          name: `${tpl.name} #${seq}`,
          category: tpl.category,
          unit: tpl.unit,
          currentVehicleId: attachedVehicleId,
          status,
          technicalCondition: condition,
          standardPurpose,
          attachedAt,
          managerName: tpl.mgr,
          gatheringLocation: tpl.loc,
          managerPhone: tpl.phone,
        },
        create: {
          code,
          name: `${tpl.name} #${seq}`,
          category: tpl.category,
          unit: tpl.unit,
          currentVehicleId: attachedVehicleId,
          status,
          technicalCondition: condition,
          standardPurpose,
          attachedAt,
          managerName: tpl.mgr,
          gatheringLocation: tpl.loc,
          managerPhone: tpl.phone,
        },
      });
      namLaoCreated++;
    } catch (e) {
      console.error(`Error inserting Nam Lao implement ${code}:`, e.message);
    }
  }

  const totalNow = await prisma.agriculturalImplement.count();
  console.log(`✅ FINISHED! Created/Updated ${snoulCreated} Snoul items & ${namLaoCreated} Nam Lao items.`);
  console.log(`Total AgriculturalImplements in database now: ${totalNow}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
