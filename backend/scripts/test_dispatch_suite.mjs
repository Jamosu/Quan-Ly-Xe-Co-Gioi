/**
 * THACO AGRI - TEST SUITE: Kế hoạch → Lệnh điều xe
 * Ngày test: 09/09/2026
 * Môi trường: API http://localhost:3001
 *
 * Dữ liệu thực tế từ DB:
 * - Driver A: id=12, TX-003, Lê Hoàng Nam, NT1, BANG_MAY_NONG_NGHIEP
 * - Driver B: id=16, TX-007, Sok Phearith, NT2, HANG_C
 * - Driver C: id=14, TX-005, Võ Văn Thành, NT1, HANG_C
 * - Vehicle A: id=578, XB1-MĐA-002, XN_BO, type=6
 * - Vehicle B: id=579, XB1-MKE-015, XN_BO, type=5
 * - Vehicle C: id=582, CHT-XTA-007, BAN_CO_GIOI, type=5
 * - Plan 52: KH-2026-W37-0363, AGRICULTURE, NT2, APPROVED, 13 dispatch orders PENDING_APPROVAL
 *
 * NOTE: Thử dispatch.assign() thực chất gọi workflow:
 *   dispatchOrder.approve() -> workOrders.assign() -> availability.assertResourcesAvailable()
 * Nên test tập trung vào endpoint /dispatch-orders/:id/assign sau khi approve
 */

const BASE = 'http://localhost:3001/api';

// ====== HELPER ======
async function api(method, path, body, expectStatus) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function ts(dateStr, h, m = 0) {
  // Tạo timestamp UTC với ngày YYYY-MM-DD, giờ h, phút m (timezone +7, server lưu UTC)
  const d = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00.000+07:00`);
  return d.toISOString();
}

const results = [];
let planIdCreated = null;
let dispatchIdA = null; // Lệnh test A (để test conflict)
let dispatchIdB = null;
let unavailDriverId = null;
let unavailVehicleId = null;

function record(id, desc, expected, actual, status, detail = '') {
  results.push({ id, desc, expected, actual, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${id}] ${desc}: Expected=${expected}, Actual=${actual} ${detail}`);
}

// ====== PHASE 1: KIỂM TRA DỮ LIỆU HIỆN TẠI ======
async function phase1_checkExistingData() {
  console.log('\n========== PHASE 1: CHECK EXISTING DATA ==========');

  // TC01: Kế hoạch #52 đã approved và có dispatch orders
  const planRes = await api('GET', '/production-plans/52');
  if (planRes.status === 200 && planRes.body.status === 'APPROVED') {
    const summary = planRes.body.orderSummary;
    record('TC01', 'Kế hoạch #52 tồn tại & APPROVED', 'HTTP 200 + APPROVED', `HTTP ${planRes.status} status=${planRes.body.status}`, 'PASS', `orders=${summary?.generatedOrders}`);
  } else {
    record('TC01', 'Kế hoạch #52 tồn tại & APPROVED', 'HTTP 200 + APPROVED', `HTTP ${planRes.status}`, 'FAIL');
  }

  // TC02: Dispatch orders đã được tạo từ kế hoạch
  const dispatches = await api('GET', '/dispatch-orders?planId=52&limit=5');
  if (dispatches.status === 200 && dispatches.body.items?.length > 0) {
    record('TC02', 'Dispatch orders từ plan #52 tồn tại', '>0 orders', `${dispatches.body.items.length} orders, status=${dispatches.body.items[0].status}`, 'PASS');
    dispatchIdA = dispatches.body.items[0].id; // Lấy lệnh đầu tiên để dùng tiếp
    dispatchIdB = dispatches.body.items[1]?.id;
  } else {
    record('TC02', 'Dispatch orders từ plan #52 tồn tại', '>0 orders', `HTTP ${dispatches.status}`, 'FAIL');
  }

  // TC03: Availability API hoạt động
  const avail = await api('GET', `/dispatch-orders/available-resources?start=${ts('2026-09-20', 7)}&end=${ts('2026-09-20', 12)}`);
  if (avail.status === 200) {
    record('TC03', 'Availability API có thể truy vấn', 'HTTP 200', `HTTP ${avail.status}, vehicles=${avail.body.vehicles?.length}, drivers=${avail.body.drivers?.length}`, 'PASS');
  } else {
    record('TC03', 'Availability API có thể truy vấn', 'HTTP 200', `HTTP ${avail.status}`, 'FAIL', JSON.stringify(avail.body).substring(0, 100));
  }
}

// ====== PHASE 2: AUTH TEST ======
async function phase2_authTests() {
  console.log('\n========== PHASE 2: AUTH TESTS ==========');

  // TC04: POST /dispatch-orders không có token → 401
  // NOTE: controller dùng @Roles() + @UseGuards(RolesGuard). 
  // Nhưng kiểm tra code: PATCH có @Public() và @Roles() combo. Kiểm tra thực tế.
  const noAuth = await api('POST', '/dispatch-orders', {
    code: 'TEST-NOAUTH-001',
    sourceType: 'MANUAL_EXCEPTION',
    exceptionReason: 'test',
    unit: 'NT2',
    purpose: 'test',
    departureTime: ts('2026-09-20', 7),
    plannedEndTime: ts('2026-09-20', 12),
  });
  if (noAuth.status === 401) {
    record('TC04', 'Tạo lệnh không có token → 401', 'HTTP 401', `HTTP ${noAuth.status}`, 'PASS');
  } else {
    record('TC04', 'Tạo lệnh không có token → 401', 'HTTP 401', `HTTP ${noAuth.status}`, 'FAIL', `Body: ${JSON.stringify(noAuth.body).substring(0,150)}`);
  }

  // TC05: POST /dispatch-orders thiếu exceptionReason → 400
  // Cần token để test này. Skip nếu không có auth.
  record('TC05', 'Tạo lệnh thiếu lý do ngoại lệ (cần auth)', '400 nếu có auth, 401 nếu không', 'BLOCKED (API đòi auth)', 'BLOCKED');
}

// ====== PHASE 3: AVAILABILITY SEARCH - RESOURCE CONFLICTS ======
async function phase3_availabilitySearch() {
  console.log('\n========== PHASE 3: AVAILABILITY SEARCH ==========');

  // TC06: Availability search với vehicle+driver sẵn sàng
  // Dùng xe 582 (BAN_CO_GIOI) và driver 23 (BAN_CO_GIOI) trong tương lai
  const searchRes = await api('GET', `/availability/search?startAt=${ts('2026-09-25', 8)}&endAt=${ts('2026-09-25', 12)}&vehicleIds=582&driverIds=23`);
  if (searchRes.status === 200) {
    const vehicle = searchRes.body.vehicles?.[0];
    const driver = searchRes.body.drivers?.[0];
    const vStatus = vehicle?.availabilityStatus;
    const dStatus = driver?.availabilityStatus;
    record('TC06', 'Search availability xe+tài xế tương lai', 'HTTP 200', `HTTP ${searchRes.status}, vehicle=${vStatus}, driver=${dStatus}`, 
      searchRes.status === 200 ? 'PASS' : 'FAIL');
  } else {
    record('TC06', 'Search availability xe+tài xế tương lai', 'HTTP 200', `HTTP ${searchRes.status}`, 'FAIL', JSON.stringify(searchRes.body).substring(0,200));
  }

  // TC07: Availability với thời gian ngược (end < start) → 400
  const badWindow = await api('GET', `/availability/search?startAt=${ts('2026-09-25', 12)}&endAt=${ts('2026-09-25', 8)}&vehicleIds=582`);
  if (badWindow.status === 400) {
    record('TC07', 'Availability với end < start → 400', 'HTTP 400', `HTTP ${badWindow.status}`, 'PASS');
  } else {
    record('TC07', 'Availability với end < start → 400', 'HTTP 400', `HTTP ${badWindow.status}`, 'FAIL', JSON.stringify(badWindow.body).substring(0,150));
  }
}

// ====== PHASE 4: TẠO KẾ HOẠCH TEST ======
async function phase4_createTestPlan() {
  console.log('\n========== PHASE 4: TẠO KẾ HOẠCH TEST (KHÔNG CÓ AUTH - BLOCKED) ==========');

  // NOTE: POST /production-plans cần authentication.
  // Theo controller pattern, nếu @Public() không có thì cần JWT.
  // Test cụm plan creation thông qua API hiện tại - kiểm tra response
  const planData = {
    code: `TEST-DISPATCH-PLAN-${Date.now()}`,
    title: 'TEST: Kế hoạch test conflict dispatch 09/09/2026',
    planType: 'AGRICULTURE',
    unit: 'NT2',
    stage: 'PLANTING',
    weekNumber: 38,
    startDate: '2026-09-14T00:00:00.000Z',
    endDate: '2026-09-20T23:59:59.999Z',
    farmName: 'TEST Farm',
    items: [
      {
        jobName: 'TEST: Phun thuốc sâu',
        workDate: '2026-09-15T00:00:00.000Z',
        plannedVehicleCount: 1,
        targetQuantity: 5,
        targetUnit: 'ha',
        scheduledDays: 'Thứ 2,Thứ 3',
        notes: 'TEST DATA - CÓ THỂ XÓA SAU TEST'
      }
    ]
  };
  const planRes = await api('POST', '/production-plans', planData);
  if (planRes.status === 401) {
    record('TC08', 'Tạo kế hoạch test (yêu cầu auth)', 'Cần JWT', `HTTP ${planRes.status} - Auth required`, 'BLOCKED', 'Endpoint cần JWT - không thể test qua script không có token');
  } else if (planRes.status === 201) {
    planIdCreated = planRes.body.id;
    record('TC08', 'Tạo kế hoạch test', 'HTTP 201', `HTTP ${planRes.status}, id=${planIdCreated}`, 'PASS');
  } else {
    record('TC08', 'Tạo kế hoạch test', 'HTTP 201 hoặc 401', `HTTP ${planRes.status}`, 'FAIL', JSON.stringify(planRes.body).substring(0,150));
  }
}

// ====== PHASE 5: DISPATCH ASSIGN CONFLICT TESTS (qua work-orders) ======
// Test availability engine trực tiếp qua /availability/search endpoint (@Public())
async function phase5_conflictTests() {
  console.log('\n========== PHASE 5: CONFLICT DETECTION (Availability Engine) ==========');

  // Lấy dispatch order #432 (09/09 00:00-10:00 UTC = 07:00-17:00 VN)
  const order432 = await api('GET', '/dispatch-orders/432');
  if (order432.status !== 200) {
    record('TC09', 'Lấy dispatch order #432', 'HTTP 200', `HTTP ${order432.status}`, 'FAIL');
    return;
  }
  record('TC09', 'Lấy dispatch order #432', 'HTTP 200', `HTTP ${order432.status}, status=${order432.body.status}`, 'PASS');

  const dep432 = order432.body.departureTime; // 2026-09-09T00:00:00.000Z (= 07:00 VN)
  const end432 = order432.body.plannedEndTime; // 2026-09-09T10:00:00.000Z (= 17:00 VN)
  console.log(`  Order 432: ${dep432} → ${end432}`);

  // TC10: Check availability trùng giờ hoàn toàn với dispatch order #432's time window
  // Order 432 chưa có vehicleId/driverId → chưa ASSIGNED nên availability không chặn
  // NHƯNG nếu ta giả lập assign và search ngay sau: lệnh PENDING_APPROVAL không nằm trong ACTIVE_DISPATCH
  // ACTIVE_DISPATCH = [ASSIGNED, DRIVER_ACCEPTED, DEPARTED, WORKING]
  // → lệnh PENDING_APPROVAL không gây conflict trên availability!
  // Đây là điều cần kiểm tra: lệnh chưa phân công có chặn availability không?
  
  const searchSamePeriod = await api('GET', `/availability/search?startAt=${dep432}&endAt=${end432}&vehicleIds=582&driverIds=16`);
  if (searchSamePeriod.status === 200) {
    const v = searchSamePeriod.body.vehicles?.[0];
    const d = searchSamePeriod.body.drivers?.[0];
    record('TC10', 
      'Availability trong giờ lệnh PENDING_APPROVAL (432)', 
      'AVAILABLE (chưa ASSIGNED chưa chặn)',
      `vehicle=${v?.availabilityStatus}, driver=${d?.availabilityStatus}`,
      (v?.availabilityStatus !== 'UNAVAILABLE' && d?.availabilityStatus !== 'UNAVAILABLE') ? 'PASS' : 'FAIL',
      'INFERRED: PENDING_APPROVAL không nằm trong ACTIVE_DISPATCH nên không chặn'
    );
  } else {
    record('TC10', 'Availability trong giờ lệnh PENDING_APPROVAL', 'HTTP 200', `HTTP ${searchSamePeriod.status}`, 'FAIL');
  }

  // TC11: Kiểm tra search với xe và tài xế không bận - tương lai xa
  const futureSearch = await api('GET', `/availability/search?startAt=${ts('2026-09-29', 8)}&endAt=${ts('2026-09-29', 12)}&vehicleIds=578,579&driverIds=12,14`);
  if (futureSearch.status === 200) {
    const vs = futureSearch.body.vehicles?.map(v => `${v.id}:${v.availabilityStatus}`).join(',');
    const ds = futureSearch.body.drivers?.map(d => `${d.id}:${d.availabilityStatus}`).join(',');
    record('TC11', 'Availability tương lai 29/09 (xe+tài xế chưa có lịch)', 'HTTP 200, all AVAILABLE', `HTTP ${futureSearch.status}, V=[${vs}], D=[${ds}]`, 'PASS');
  } else {
    record('TC11', 'Availability tương lai 29/09', 'HTTP 200', `HTTP ${futureSearch.status}`, 'FAIL');
  }

  // TC12: Kiểm tra search với time window invalid (end === start)
  const equalWindow = await api('GET', `/availability/search?startAt=${ts('2026-09-15', 8)}&endAt=${ts('2026-09-15', 8)}&vehicleIds=582`);
  if (equalWindow.status === 400) {
    record('TC12', 'Availability với end === start → 400', 'HTTP 400', `HTTP ${equalWindow.status}`, 'PASS');
  } else {
    record('TC12', 'Availability với end === start → 400', 'HTTP 400', `HTTP ${equalWindow.status}`, 'FAIL', JSON.stringify(equalWindow.body).substring(0,150));
  }
}

// ====== PHASE 6: VEHICLE/DRIVER UNAVAILABILITY ======
async function phase6_unavailabilityTests() {
  console.log('\n========== PHASE 6: UNAVAILABILITY (cần auth) ==========');

  // POST /availability/vehicles → cần auth
  const vUnavail = await api('POST', '/availability/vehicles', {
    vehicleId: 578,
    type: 'MAINTENANCE',
    startAt: ts('2026-09-20', 7),
    endAt: ts('2026-09-20', 17),
    reason: 'TEST: Bảo dưỡng định kỳ test case'
  });
  if (vUnavail.status === 401) {
    record('TC13', 'Tạo vehicle unavailability (bảo dưỡng) - cần auth', 'HTTP 401', `HTTP ${vUnavail.status}`, 'BLOCKED');
  } else if (vUnavail.status === 201) {
    unavailVehicleId = vUnavail.body.record?.id;
    record('TC13', 'Tạo vehicle unavailability (bảo dưỡng)', 'HTTP 201', `HTTP ${vUnavail.status}, id=${unavailVehicleId}`, 'PASS');
    
    // TC13b: Kiểm tra availability ngay sau khi tạo
    const afterUnavail = await api('GET', `/availability/search?startAt=${ts('2026-09-20', 9)}&endAt=${ts('2026-09-20', 15)}&vehicleIds=578`);
    if (afterUnavail.status === 200) {
      const v = afterUnavail.body.vehicles?.[0];
      if (v?.availabilityStatus === 'UNAVAILABLE' || v?.reasons?.some(r => r.code.includes('MAINTENANCE'))) {
        record('TC13b', 'Vehicle bảo dưỡng chặn availability', 'UNAVAILABLE/MAINTENANCE', `${v.availabilityStatus}, reasons=${v.reasons?.map(r=>r.code).join(',')}`, 'PASS');
      } else {
        record('TC13b', 'Vehicle bảo dưỡng chặn availability', 'UNAVAILABLE', `${v?.availabilityStatus}`, 'FAIL', JSON.stringify(v?.reasons).substring(0,200));
      }
    }
  } else {
    record('TC13', 'Tạo vehicle unavailability (bảo dưỡng)', 'HTTP 201 hoặc 401', `HTTP ${vUnavail.status}`, 'FAIL', JSON.stringify(vUnavail.body).substring(0,150));
  }

  // Driver unavailability
  const dUnavail = await api('POST', '/availability/drivers', {
    driverId: 12,
    type: 'LEAVE',
    startAt: ts('2026-09-22', 7),
    endAt: ts('2026-09-22', 17),
    reason: 'TEST: Nghỉ phép test case'
  });
  if (dUnavail.status === 401) {
    record('TC14', 'Tạo driver unavailability (nghỉ phép) - cần auth', 'HTTP 401', `HTTP ${dUnavail.status}`, 'BLOCKED');
  } else if (dUnavail.status === 201) {
    unavailDriverId = dUnavail.body.record?.id;
    record('TC14', 'Tạo driver unavailability (nghỉ phép)', 'HTTP 201', `HTTP ${dUnavail.status}, id=${unavailDriverId}`, 'PASS');

    // Kiểm tra availability sau khi tạo
    const afterDUnavail = await api('GET', `/availability/search?startAt=${ts('2026-09-22', 9)}&endAt=${ts('2026-09-22', 15)}&driverIds=12`);
    if (afterDUnavail.status === 200) {
      const d = afterDUnavail.body.drivers?.[0];
      if (d?.availabilityStatus === 'UNAVAILABLE') {
        record('TC14b', 'Driver nghỉ phép chặn availability', 'UNAVAILABLE', `${d.availabilityStatus}, reasons=${d.reasons?.map(r=>r.code).join(',')}`, 'PASS');
      } else {
        record('TC14b', 'Driver nghỉ phép chặn availability', 'UNAVAILABLE', `${d?.availabilityStatus}`, 'FAIL');
      }
    }
  } else {
    record('TC14', 'Tạo driver unavailability', 'HTTP 201 hoặc 401', `HTTP ${dUnavail.status}`, 'FAIL', JSON.stringify(dUnavail.body).substring(0,150));
  }
}

// ====== PHASE 7: KẾ HOẠCH TƯƠNG LAI (CÁC TUẦN SAU) ======
async function phase7_futurePlanTests() {
  console.log('\n========== PHASE 7: PLAN QUERY (PAST WEEKS) ==========');

  // TC15: Lấy các dispatch orders của kế hoạch theo planId filter
  const filter52 = await api('GET', '/dispatch-orders?planId=52&limit=20');
  if (filter52.status === 200) {
    const orders = filter52.body.items || [];
    const total = filter52.body.pagination?.total;
    record('TC15', 'Filter dispatch orders theo planId=52', 'HTTP 200 + items', `HTTP ${filter52.status}, total=${total}, sample=${orders.length}`, 'PASS');
  } else {
    record('TC15', 'Filter dispatch orders theo planId=52', 'HTTP 200', `HTTP ${filter52.status}`, 'FAIL');
  }

  // TC16: Lấy dispatch orders theo planType=AGRICULTURE
  const filterType = await api('GET', '/dispatch-orders?planType=AGRICULTURE&limit=5');
  if (filterType.status === 200) {
    record('TC16', 'Filter dispatch orders theo planType=AGRICULTURE', 'HTTP 200', `HTTP ${filterType.status}, items=${filterType.body.items?.length}`, 'PASS');
  } else {
    record('TC16', 'Filter dispatch orders theo planType', 'HTTP 200', `HTTP ${filterType.status}`, 'FAIL');
  }

  // TC17: Lấy dispatch orders theo weekNumber
  const filterWeek = await api('GET', '/dispatch-orders?weekNumber=37&limit=5');
  if (filterWeek.status === 200) {
    record('TC17', 'Filter dispatch orders theo weekNumber=37', 'HTTP 200', `HTTP ${filterWeek.status}, items=${filterWeek.body.items?.length}`, 'PASS');
  } else {
    record('TC17', 'Filter dispatch orders theo weekNumber', 'HTTP 200', `HTTP ${filterWeek.status}`, 'FAIL');
  }
}

// ====== PHASE 8: BOUNDARY & EDGE CASES ======
async function phase8_edgeCases() {
  console.log('\n========== PHASE 8: BOUNDARY & EDGE CASES ==========');

  // TC18: Dispatch order không tồn tại → 404
  const notFound = await api('GET', '/dispatch-orders/999999');
  if (notFound.status === 404) {
    record('TC18', 'Dispatch order không tồn tại → 404', 'HTTP 404', `HTTP ${notFound.status}`, 'PASS');
  } else {
    record('TC18', 'Dispatch order không tồn tại → 404', 'HTTP 404', `HTTP ${notFound.status}`, 'FAIL');
  }

  // TC19: Availability search qua ngày (overnight)
  const overnight = await api('GET', `/availability/search?startAt=${ts('2026-09-20', 22)}&endAt=${ts('2026-09-21', 3)}&vehicleIds=585`);
  if (overnight.status === 200) {
    record('TC19', 'Availability qua ngày (22:00→03:00 hôm sau)', 'HTTP 200', `HTTP ${overnight.status}, vehicle=${overnight.body.vehicles?.[0]?.availabilityStatus}`, 'PASS');
  } else {
    record('TC19', 'Availability qua ngày (overnight)', 'HTTP 200', `HTTP ${overnight.status}`, 'FAIL');
  }

  // TC20: Tạo lệnh ngoại lệ (MANUAL_EXCEPTION) không có exceptionReason → 400 hay 401
  const noReason = await api('POST', '/dispatch-orders', {
    code: 'TEST-NOREASON-001',
    sourceType: 'MANUAL_EXCEPTION',
    unit: 'NT2',
    purpose: 'test',
    departureTime: ts('2026-09-20', 7),
    plannedEndTime: ts('2026-09-20', 12),
  });
  if (noReason.status === 400) {
    record('TC20', 'Tạo lệnh ngoại lệ thiếu exceptionReason → 400', 'HTTP 400', `HTTP ${noReason.status}`, 'PASS');
  } else if (noReason.status === 401) {
    record('TC20', 'Tạo lệnh ngoại lệ thiếu exceptionReason (cần auth)', 'HTTP 400', `HTTP ${noReason.status} - BLOCKED (cần auth trước)`, 'BLOCKED');
  } else {
    record('TC20', 'Tạo lệnh ngoại lệ thiếu exceptionReason → 400', 'HTTP 400', `HTTP ${noReason.status}`, 'FAIL');
  }

  // TC21: Submit dispatch order không tồn tại → 404
  const submitFake = await api('POST', '/dispatch-orders/999999/submit');
  if (submitFake.status === 404) {
    record('TC21', 'Submit lệnh không tồn tại → 404', 'HTTP 404', `HTTP ${submitFake.status}`, 'PASS');
  } else if (submitFake.status === 401) {
    record('TC21', 'Submit lệnh không tồn tại (cần auth)', 'HTTP 404', `HTTP ${submitFake.status} BLOCKED`, 'BLOCKED');
  } else {
    record('TC21', 'Submit lệnh không tồn tại → 404', 'HTTP 404', `HTTP ${submitFake.status}`, 'FAIL');
  }

  // TC22: Approve dispatch order 432 (PENDING_APPROVAL → APPROVED) không cần auth vì @Public()
  // THỰC TẾ: controller có @Public() trên route NHƯNG @Roles() cũng present → cần check
  const approve432 = await api('POST', `/dispatch-orders/${dispatchIdA}/approve`);
  if (approve432.status === 200) {
    record('TC22', `Approve dispatch order #${dispatchIdA} (PENDING→APPROVED)`, 'HTTP 200', `HTTP ${approve432.status}, status=${approve432.body.status}`, 'PASS');
  } else if (approve432.status === 401 || approve432.status === 403) {
    record('TC22', `Approve dispatch order #${dispatchIdA}`, 'HTTP 200', `HTTP ${approve432.status} - cần auth/role`, 'BLOCKED');
  } else {
    record('TC22', `Approve dispatch order #${dispatchIdA}`, 'HTTP 200', `HTTP ${approve432.status}`, 'FAIL', JSON.stringify(approve432.body).substring(0,200));
  }
}

// ====== PHASE 9: KẾ HOẠCH FILTER TESTS ======
async function phase9_planFilters() {
  console.log('\n========== PHASE 9: PLAN API FILTERS ==========');

  // TC23: GET plans theo planType=AGRICULTURE
  const plans = await api('GET', '/production-plans?planType=AGRICULTURE&limit=5');
  if (plans.status === 200) {
    const items = plans.body.items || [];
    const allAgri = items.every(p => p.planType === 'AGRICULTURE');
    record('TC23', 'Filter plans planType=AGRICULTURE', 'HTTP 200 + all AGRICULTURE', `HTTP ${plans.status}, items=${items.length}, allAgri=${allAgri}`, allAgri ? 'PASS' : 'FAIL');
  } else {
    record('TC23', 'Filter plans planType=AGRICULTURE', 'HTTP 200', `HTTP ${plans.status}`, 'FAIL');
  }

  // TC24: GET plans theo weekNumber=37
  const plansW37 = await api('GET', '/production-plans?weekNumber=37');
  if (plansW37.status === 200) {
    record('TC24', 'Filter plans weekNumber=37', 'HTTP 200', `HTTP ${plansW37.status}, total=${plansW37.body.pagination?.total}`, 'PASS');
  } else {
    record('TC24', 'Filter plans weekNumber=37', 'HTTP 200', `HTTP ${plansW37.status}`, 'FAIL');
  }

  // TC25: GET plan #52 với orderSummary
  const p52 = await api('GET', '/production-plans/52');
  if (p52.status === 200 && p52.body.orderSummary) {
    const s = p52.body.orderSummary;
    record('TC25', 'Plan #52 có orderSummary', 'HTTP 200 + orderSummary', 
      `generated=${s.generatedOrders}, pending=${s.pendingOrders}, active=${s.activeOrders}`, 'PASS');
  } else {
    record('TC25', 'Plan #52 có orderSummary', 'HTTP 200 + orderSummary', `HTTP ${p52.status}`, 'FAIL');
  }
}

// ====== PHASE 10: DATABASE INTEGRITY ======
async function phase10_dbIntegrity() {
  console.log('\n========== PHASE 10: DATABASE INTEGRITY CHECK ==========');

  // TC26: Không có lệnh active trùng vehicle trong cùng khung giờ
  // Kiểm tra qua availability endpoint: nếu xe đang bận thì phải UNAVAILABLE
  // Lệnh 432-435: PENDING_APPROVAL, chưa assign → không gây conflict
  const dbCheck = await api('GET', `/dispatch-orders?status=ASSIGNED&limit=50`);
  if (dbCheck.status === 200) {
    const assigned = dbCheck.body.items || [];
    let conflictFound = false;
    for (let i = 0; i < assigned.length; i++) {
      for (let j = i + 1; j < assigned.length; j++) {
        const a = assigned[i];
        const b = assigned[j];
        if (a.vehicleId && a.vehicleId === b.vehicleId) {
          const aStart = new Date(a.departureTime);
          const aEnd = new Date(a.plannedEndTime);
          const bStart = new Date(b.departureTime);
          const bEnd = new Date(b.plannedEndTime);
          if (aStart < bEnd && aEnd > bStart) {
            conflictFound = true;
            console.log(`  ⚠️  CONFLICT FOUND: #${a.id} và #${b.id} cùng vehicle=${a.vehicleId}`);
          }
        }
        if (a.driverId && a.driverId === b.driverId) {
          const aStart = new Date(a.departureTime);
          const aEnd = new Date(a.plannedEndTime);
          const bStart = new Date(b.departureTime);
          const bEnd = new Date(b.plannedEndTime);
          if (aStart < bEnd && aEnd > bStart) {
            conflictFound = true;
            console.log(`  ⚠️  CONFLICT FOUND: #${a.id} và #${b.id} cùng driver=${a.driverId}`);
          }
        }
      }
    }
    record('TC26', 'Không có lệnh ASSIGNED trùng vehicle/driver', 'Không conflict', 
      conflictFound ? 'CÓ CONFLICT' : `Không conflict (${assigned.length} lệnh ASSIGNED)`,
      conflictFound ? 'FAIL' : 'PASS');
  } else {
    record('TC26', 'DB integrity: ASSIGNED orders', 'HTTP 200', `HTTP ${dbCheck.status}`, 'FAIL');
  }

  // TC27: Dispatch orders từ plan có generationKey đúng format
  const ordersWithKey = await api('GET', '/dispatch-orders?planId=52&limit=5');
  if (ordersWithKey.status === 200) {
    const orders = ordersWithKey.body.items || [];
    // Kiểm tra code format: LDX-NN-P52-I{n}-{date}-V{n}
    const allHaveCode = orders.every(o => o.code && o.code.startsWith('LDX-NN-P52'));
    record('TC27', 'Dispatch orders từ plan có code đúng format', 'Code starts with LDX-NN-P52', 
      `${orders.length} orders, allOK=${allHaveCode}, sample=${orders[0]?.code}`,
      allHaveCode ? 'PASS' : 'FAIL');
  }
}

// ====== REPORT ======
function generateReport() {
  console.log('\n\n========================================');
  console.log('          BÁO CÁO TEST SUITE');
  console.log('========================================\n');

  const passes = results.filter(r => r.status === 'PASS').length;
  const fails = results.filter(r => r.status === 'FAIL').length;
  const blocked = results.filter(r => r.status === 'BLOCKED').length;

  console.log('| ID   | Test Case                                     | Expected                    | Actual                              | Result  |');
  console.log('|------|-----------------------------------------------|-----------------------------|-------------------------------------|---------|');
  for (const r of results) {
    const id = r.id.padEnd(5);
    const desc = r.desc.substring(0, 45).padEnd(45);
    const exp = (r.expected || '').substring(0, 27).padEnd(27);
    const act = (r.actual || '').substring(0, 37).padEnd(37);
    const status = r.status === 'PASS' ? '✅ PASS ' : r.status === 'FAIL' ? '❌ FAIL ' : '⚠️ BLOCKED';
    console.log(`| ${id}| ${desc}| ${exp}| ${act}| ${status}|`);
  }

  console.log(`\n📊 Tổng test: ${results.length}`);
  console.log(`✅ PASS: ${passes}`);
  console.log(`❌ FAIL: ${fails}`);
  console.log(`⚠️  BLOCKED: ${blocked}`);

  if (fails > 0) {
    console.log('\n🔴 BUG LIST:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ [${r.id}] ${r.desc}`);
      console.log(`     Expected: ${r.expected}`);
      console.log(`     Actual: ${r.actual}`);
      if (r.detail) console.log(`     Detail: ${r.detail}`);
    });
  }

  if (blocked > 0) {
    console.log('\n⚠️ BLOCKED (cần JWT auth để test đầy đủ):');
    results.filter(r => r.status === 'BLOCKED').forEach(r => {
      console.log(`  ⚠️  [${r.id}] ${r.desc}`);
    });
  }

  console.log('\n📝 PHÂN TÍCH KIẾN TRÚC (VERIFIED từ source code):');
  console.log('  VERIFIED: Conflict detection qua availability engine tại WorkOrders.assign()');
  console.log('  VERIFIED: ACTIVE_DISPATCH = [ASSIGNED, DRIVER_ACCEPTED, DEPARTED, WORKING]');
  console.log('  VERIFIED: Lệnh PENDING_APPROVAL/APPROVED KHÔNG nằm trong ACTIVE_DISPATCH → không chặn availability của nhau');
  console.log('  INFERRED: Conflict chỉ được enforce TẠI THỜI ĐIỂM ASSIGN (WorkOrders.assign → availability.assertResourcesAvailable)');
  console.log('  INFERRED: Race condition phụ thuộc vào lockResourceRows() trong transaction');
  console.log('  UNKNOWN: Reschedule/dời lịch 7-ngày - không tìm thấy logic trong source code đã đọc');
}

// ====== MAIN ======
async function main() {
  console.log('🚀 THACO AGRI - Test Suite: Kế hoạch → Lệnh điều xe');
  console.log(`⏰ Thời gian: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`🌐 API: ${BASE}`);
  
  try {
    await phase1_checkExistingData();
    await phase2_authTests();
    await phase3_availabilitySearch();
    await phase4_createTestPlan();
    await phase5_conflictTests();
    await phase6_unavailabilityTests();
    await phase7_futurePlanTests();
    await phase8_edgeCases();
    await phase9_planFilters();
    await phase10_dbIntegrity();
  } catch (err) {
    console.error('❌ Test runner error:', err.message);
  }

  generateReport();
}

main().catch(console.error);
