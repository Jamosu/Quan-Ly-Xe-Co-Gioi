/**
 * Seed 4 weeks of approved operational plans (current week through Sunday + 3 weeks).
 *
 * Usage:
 *   node scripts/seed_four_week_plans.mjs
 *
 * Optional environment variables:
 *   API_BASE_URL, SEED_USERNAME, SEED_PASSWORD
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const USERNAME = process.env.SEED_USERNAME || 'admin';
const PASSWORD = process.env.SEED_PASSWORD || '123456';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

let token = '';

async function api(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.message || json?.error || JSON.stringify(json);
    throw new Error(`${method} ${path} -> HTTP ${response.status}: ${message}`);
  }
  return json.data ?? json;
}

function localToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: item }) => [type, item]));
  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayOfWeek(dateText) {
  return new Date(`${dateText}T12:00:00.000Z`).getUTCDay();
}

function isoWeek(dateText) {
  const date = new Date(`${dateText}T12:00:00.000Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const isoYear = date.getUTCFullYear();
  const firstDay = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((date - firstDay) / 86400000) + 1) / 7);
  return { year: isoYear, week };
}

function startOfIsoWeek(dateText) {
  const day = dayOfWeek(dateText) || 7;
  return addDays(dateText, 1 - day);
}

function atStart(dateText) {
  return `${dateText}T00:00:00.000+07:00`;
}

function atEnd(dateText) {
  return `${dateText}T23:59:59.999+07:00`;
}

function dateAt(range, ratio) {
  const totalDays = Math.round(
    (new Date(`${range.end}T12:00:00.000Z`) - new Date(`${range.start}T12:00:00.000Z`)) / 86400000,
  );
  return addDays(range.start, Math.round(totalDays * ratio));
}

function commonPlan(range, suffix, title, planType, stage, categoryCode, categoryName) {
  const weekText = String(range.week).padStart(2, '0');
  return {
    code: `KH-KM-${range.year}-W${weekText}-${suffix}`,
    title: `${title} - Tuần ${weekText}/${range.year}`,
    planType,
    stage,
    unit: 'NT1',
    startDate: atStart(range.start),
    endDate: atEnd(range.end),
    weekStart: atStart(range.weekStart),
    weekNumber: range.week,
    complexCode: 'KOUN_MOM',
    complexName: 'Khu liên hợp Koun Mom',
    enterpriseCode: 'XN_CHUOI',
    enterpriseName: 'Xí nghiệp Chuối',
    farmCode: 'NT1',
    farmName: 'Nông trường 1',
    categoryCode,
    categoryName,
    notes: `Dữ liệu kế hoạch 4 tuần được tạo tự động ngày ${localToday()}.`,
  };
}

function buildPlans(range, index) {
  const weekText = String(range.week).padStart(2, '0');
  const plotBase = index * 3 + 1;
  const first = dateAt(range, 0);
  const middle = dateAt(range, 0.5);
  const last = dateAt(range, 1);

  const agriculture = {
    ...commonPlan(range, 'NN', 'Kế hoạch nông nghiệp', 'AGRICULTURE', 'LAM_DAT', 'NONG_NGHIEP', 'Nông nghiệp'),
    lotPlot: `Lô A${plotBase}-A${plotBase + 2}`,
    targetAreaHa: 24 + index * 3,
    assignedVehiclesCount: 5,
    items: [
      {
        workDate: atStart(first), shift: 'CA_NGAY', stage: 'LAM_DAT', stageName: 'Làm đất',
        jobCode: `NN-W${weekText}-01`, jobName: 'Cày sâu và bừa đĩa', plotCode: `A${plotBase}`,
        plotName: `Lô A${plotBase}`, targetQuantity: 10 + index, targetAreaHa: 10 + index,
        targetUnit: 'ha', plannedVehicleCount: 2, plannedMachineHours: 16,
        recommendedVehicle: 'Máy kéo bánh hơi', implementGroup: 'Cày và bừa',
      },
      {
        workDate: atStart(middle), shift: 'CA_NGAY', stage: 'TRONG_MOI', stageName: 'Trồng mới',
        jobCode: `NN-W${weekText}-02`, jobName: 'Rạch hàng và trồng chuối', plotCode: `A${plotBase + 1}`,
        plotName: `Lô A${plotBase + 1}`, targetQuantity: 8 + index, targetAreaHa: 8 + index,
        targetUnit: 'ha', plannedVehicleCount: 2, plannedMachineHours: 14,
        recommendedVehicle: 'Máy kéo nông nghiệp', implementGroup: 'Rạch hàng',
      },
      {
        workDate: atStart(last), shift: 'CA_NGAY', stage: 'THU_HOACH', stageName: 'Thu hoạch',
        jobCode: `NN-W${weekText}-03`, jobName: 'Thu gom nông sản tại lô', plotCode: `A${plotBase + 2}`,
        plotName: `Lô A${plotBase + 2}`, targetQuantity: 18 + index * 2,
        targetUnit: 'tấn', plannedVehicleCount: 1, plannedMachineHours: 8,
        recommendedVehicle: 'Máy kéo kéo rơ-moóc', implementGroup: 'Rơ-moóc nông nghiệp',
      },
    ],
  };

  const construction = {
    ...commonPlan(range, 'CT', 'Kế hoạch công trình', 'CONSTRUCTION', 'HAU_CAN', 'CONG_TRINH', 'Công trình'),
    lotPlot: `Tuyến nội bộ NT1-${weekText}`,
    assignedVehiclesCount: 3,
    items: [
      {
        workDate: atStart(first), shift: 'CA_NGAY', stage: 'HAU_CAN', stageName: 'Hạ tầng',
        jobCode: `CT-W${weekText}-01`, jobName: 'San lấp và tạo mặt bằng',
        location: `Khu sản xuất NT1 - tuyến ${plotBase}`, machineType: 'Máy ủi',
        targetQuantity: 900 + index * 100, targetUnit: 'm³', plannedVehicleCount: 1, durationHours: 8,
      },
      {
        workDate: atStart(middle), shift: 'CA_NGAY', stage: 'HAU_CAN', stageName: 'Hạ tầng',
        jobCode: `CT-W${weekText}-02`, jobName: 'Đào và khơi thông mương thoát nước',
        location: `Mương thoát nước NT1-${plotBase + 1}`, machineType: 'Máy đào',
        targetQuantity: 450 + index * 50, targetUnit: 'm', plannedVehicleCount: 1, durationHours: 8,
      },
      {
        workDate: atStart(last), shift: 'CA_NGAY', stage: 'HAU_CAN', stageName: 'Hạ tầng',
        jobCode: `CT-W${weekText}-03`, jobName: 'Lu lèn đường nội bộ',
        location: `Đường nội bộ NT1-${plotBase + 2}`, machineType: 'Xe lu',
        targetQuantity: 1.2 + index * 0.2, targetUnit: 'km', plannedVehicleCount: 1, durationHours: 8,
      },
    ],
  };

  const transport = {
    ...commonPlan(range, 'VC', 'Kế hoạch vận chuyển nội bộ', 'INTERNAL_TRANSPORT', 'VAN_CHUYEN', 'VAN_CHUYEN', 'Vận chuyển'),
    assignedVehiclesCount: 3,
    items: [
      {
        workDate: atStart(first), shift: 'CA_NGAY', stage: 'VAN_CHUYEN', stageName: 'Vận chuyển',
        jobCode: `VC-W${weekText}-01`, jobName: 'Vận chuyển phân bón đến lô',
        origin: 'Kho vật tư trung tâm', destination: `Lô A${plotBase}`, targetQuantity: 24 + index * 2,
        targetUnit: 'tấn', plannedVehicleCount: 1, durationHours: 8, machineType: 'Xe tải ben',
      },
      {
        workDate: atStart(middle), shift: 'CA_NGAY', stage: 'VAN_CHUYEN', stageName: 'Vận chuyển',
        jobCode: `VC-W${weekText}-02`, jobName: 'Vận chuyển nông sản về kho',
        origin: `Lô A${plotBase + 1}`, destination: 'Kho nông sản NT1', targetQuantity: 30 + index * 3,
        targetUnit: 'tấn', plannedVehicleCount: 1, durationHours: 8, machineType: 'Xe tải thùng',
      },
      {
        workDate: atStart(last), shift: 'CA_NGAY', stage: 'VAN_CHUYEN', stageName: 'Vận chuyển',
        jobCode: `VC-W${weekText}-03`, jobName: 'Vận chuyển vật liệu công trình',
        origin: 'Bãi vật liệu Koun Mom', destination: `Tuyến nội bộ NT1-${weekText}`,
        targetQuantity: 36 + index * 4, targetUnit: 'tấn', plannedVehicleCount: 1,
        durationHours: 8, machineType: 'Xe ben',
      },
    ],
  };

  return [agriculture, construction, transport];
}

async function ensureApproved(planPayload) {
  const result = await api('GET', `/production-plans?search=${encodeURIComponent(planPayload.code)}&limit=10`);
  const existing = (result.items || []).find((item) => item.code === planPayload.code);
  let plan = existing;
  let action = 'reused';

  if (!plan) {
    plan = await api('POST', '/production-plans', planPayload);
    action = 'created';
  }
  if (plan.status === 'DRAFT' || plan.status === 'REJECTED') {
    plan = await api('POST', `/production-plans/${plan.id}/submit`, {});
  }
  if (plan.status === 'PENDING_APPROVAL' || plan.status === 'APPROVED') {
    plan = await api('POST', `/production-plans/${plan.id}/approve`, {});
  }
  if (!['APPROVED', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED'].includes(plan.status)) {
    throw new Error(`Kế hoạch ${planPayload.code} đang ở trạng thái không thể seed: ${plan.status}`);
  }
  return {
    id: plan.id,
    code: plan.code,
    type: plan.planType,
    status: plan.status,
    startDate: plan.startDate,
    endDate: plan.endDate,
    action,
    generatedOrders: plan.orderSummary?.generatedOrders ?? plan.generation?.total ?? null,
  };
}

async function main() {
  const login = await api('POST', '/auth/login', { username: USERNAME, password: PASSWORD });
  token = login.accessToken;
  if (!token) throw new Error('Đăng nhập thành công nhưng API không trả accessToken.');

  const today = localToday();
  const currentSunday = addDays(today, (7 - dayOfWeek(today)) % 7);
  const ranges = [];
  for (let index = 0; index < 4; index += 1) {
    const start = index === 0 ? today : addDays(currentSunday, 1 + (index - 1) * 7);
    const end = index === 0 ? currentSunday : addDays(start, 6);
    const weekStart = startOfIsoWeek(start);
    const { year, week } = isoWeek(start);
    ranges.push({ start, end, weekStart, year, week });
  }

  const summaries = [];
  for (const [index, range] of ranges.entries()) {
    for (const plan of buildPlans(range, index)) {
      summaries.push(await ensureApproved(plan));
    }
  }

  console.log(JSON.stringify({
    seededAt: new Date().toISOString(),
    localToday: today,
    ranges,
    totals: {
      plans: summaries.length,
      created: summaries.filter((item) => item.action === 'created').length,
      reused: summaries.filter((item) => item.action === 'reused').length,
      approved: summaries.filter((item) => item.status === 'APPROVED').length,
    },
    plans: summaries,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
