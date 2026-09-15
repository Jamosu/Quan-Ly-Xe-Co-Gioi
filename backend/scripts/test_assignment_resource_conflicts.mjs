const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
let token = '';
const createdIds = [];

async function request(method, path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, body: json.data ?? json };
}

async function must(method, path, body, expected = [200, 201]) {
  const result = await request(method, path, body);
  if (!expected.includes(result.status)) throw new Error(`${method} ${path}: HTTP ${result.status} ${JSON.stringify(result.body)}`);
  return result.body;
}

async function main() {
  const login = await must('POST', '/auth/login', { username: 'admin', password: '123456' });
  token = login.accessToken;
  const start = '2026-10-20T01:00:00.000Z';
  const end = '2026-10-20T03:00:00.000Z';
  const available = await must('GET', `/dispatch-orders/available-resources?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&unit=BAN_CO_GIOI`);
  const implementsResult = await must('GET', '/implements?unit=BAN_CO_GIOI&status=IN_DEPOT&technicalCondition=GOOD&limit=1000');
  const vehicles = available.vehicles ?? [];
  const drivers = available.drivers ?? [];
  const implementItems = implementsResult.items ?? [];
  if (vehicles.length < 2 || drivers.length < 2 || implementItems.length < 1) throw new Error('Không đủ 2 xe, 2 tài xế và 1 nông cụ sẵn sàng để chạy kiểm thử.');

  const sequence = Date.now();
  for (let index = 0; index < 2; index += 1) {
    const order = await must('POST', '/dispatch-orders', {
      code: `TEST-RESOURCE-CONFLICT-${sequence}-${index + 1}`,
      sourceType: 'MANUAL_EXCEPTION',
      exceptionReason: 'Kiểm thử tự động chống phân công trùng tài nguyên',
      unit: 'BAN_CO_GIOI',
      purpose: `Kiểm thử xung đột nông cụ #${index + 1}`,
      origin: 'Bãi xe kiểm thử',
      destination: 'Lô kiểm thử',
      departureTime: start,
      plannedEndTime: end,
    });
    createdIds.push(order.id);
    await must('POST', `/dispatch-orders/${order.id}/submit`, {});
    await must('POST', `/dispatch-orders/${order.id}/approve`, {});
  }

  const commonImplement = implementItems[0];
  await must('POST', `/dispatch-orders/${createdIds[0]}/assign`, {
    vehicleId: vehicles[0].id,
    driverId: drivers[0].id,
    implementId: commonImplement.id,
    departureTime: start,
    plannedEndTime: end,
  });
  const conflict = await request('POST', `/dispatch-orders/${createdIds[1]}/assign`, {
    vehicleId: vehicles[1].id,
    driverId: drivers[1].id,
    implementId: commonImplement.id,
    departureTime: start,
    plannedEndTime: end,
  });
  const reasons = conflict.body?.error?.reasons ?? conflict.body?.message?.reasons ?? conflict.body?.reasons ?? [];
  if (conflict.status !== 409 || !reasons.some((item) => item.resourceType === 'IMPLEMENT' && item.rule === 'SCHEDULE_OVERLAP')) {
    throw new Error(`API không chặn đúng xung đột nông cụ: HTTP ${conflict.status} ${JSON.stringify(conflict.body)}`);
  }
  console.log(`PASS: nông cụ ${commonImplement.code} bị chặn khi phân công đồng thời cho hai công việc khác nhau.`);
}

main()
  .finally(async () => {
    for (const id of createdIds) {
      await request('POST', `/dispatch-orders/${id}/cancel`, { reason: 'Dọn dữ liệu kiểm thử xung đột tài nguyên' });
    }
  })
  .catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
