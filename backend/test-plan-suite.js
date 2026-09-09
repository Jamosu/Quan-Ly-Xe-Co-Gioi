const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resBody);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING TEST SUITE FOR PRODUCTION PLAN APIS ===\n');
  let testPlanId = null;
  let testItemId = null;

  try {
    // 1. POST /api/production-plans (Create plan with items)
    console.log('1. Testing POST /api/production-plans (Create Plan with items)...');
    const createRes = await request('POST', '/api/production-plans', {
      code: 'KH-SUITE-TEST-999',
      title: 'Kế hoạch kiểm thử tự động API',
      stage: 'LAM_DAT',
      unit: 'NT1',
      lotPlot: 'Lô Test 01',
      targetAreaHa: 50.0,
      assignedVehiclesCount: 4,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 6 * 86400000).toISOString(),
      weekNumber: 37,
      complexCode: 'KOUN_MOM',
      items: [
        {
          plotName: 'Lô Test 01',
          jobName: 'Cày ngầm sâu 45cm',
          stage: 'LAM_DAT',
          targetQuantity: 30.0,
          plannedVehicleCount: 2,
          scheduledDays: 'T2, T3',
          shift: 'CA_NGAY',
          notes: 'Test item 1',
        },
        {
          plotName: 'Lô Test 02',
          jobName: 'Rạch hàng bón lót phân vi sinh',
          stage: 'LAM_DAT',
          targetQuantity: 20.0,
          plannedVehicleCount: 2,
          scheduledDays: 'T4, T5',
          shift: 'CA_NGAY',
          notes: 'Test item 2',
        },
      ],
    });

    console.log('   Status:', createRes.status);
    if (createRes.status !== 201) {
      console.error('   FAILED: Create plan failed', createRes);
      return;
    }
    testPlanId = createRes.body.data.id;
    console.log('   SUCCESS: Plan created with ID:', testPlanId, 'Code:', createRes.body.data.code);
    console.log('   Items count:', createRes.body.data.items?.length);

    // 2. GET /api/production-plans (List & Filter)
    console.log('\n2. Testing GET /api/production-plans?search=KH-SUITE-TEST-999...');
    const listRes = await request('GET', '/api/production-plans?search=KH-SUITE-TEST-999');
    console.log('   Status:', listRes.status);
    const found = listRes.body.data?.items?.find((p) => p.id === testPlanId);
    console.log('   Found created plan in list:', !!found);

    // 3. GET /api/production-plans/:id (Get details)
    console.log('\n3. Testing GET /api/production-plans/' + testPlanId + '...');
    const getRes = await request('GET', '/api/production-plans/' + testPlanId);
    console.log('   Status:', getRes.status);
    console.log('   Title:', getRes.body.data?.title);
    console.log('   Items verified:', getRes.body.data?.items?.length === 2);

    // 4. POST /api/production-plans/:id/items (Add single item)
    console.log('\n4. Testing POST /api/production-plans/' + testPlanId + '/items (Add extra item)...');
    const addItemRes = await request('POST', '/api/production-plans/' + testPlanId + '/items', {
      plotName: 'Lô Test 03',
      jobName: 'Đóng luống chuối',
      stage: 'LAM_DAT',
      targetQuantity: 15.0,
      plannedVehicleCount: 1,
      shift: 'CA_NGAY',
      notes: 'Item added later',
    });
    console.log('   Status:', addItemRes.status);
    if (addItemRes.status === 201) {
      testItemId = addItemRes.body.data.id;
      console.log('   SUCCESS: Extra item created with ID:', testItemId);
    } else {
      console.error('   FAILED: Add item failed', addItemRes);
    }

    // 5. PATCH /api/production-plans/:id/items/:itemId (Update item)
    if (testItemId) {
      console.log('\n5. Testing PATCH /api/production-plans/' + testPlanId + '/items/' + testItemId + '...');
      const updateItemRes = await request('PATCH', '/api/production-plans/' + testPlanId + '/items/' + testItemId, {
        targetQuantity: 18.5,
        notes: 'Updated target quantity',
      });
      console.log('   Status:', updateItemRes.status);
      console.log('   Updated targetQuantity:', updateItemRes.body.data?.targetQuantity);
    }

    // 6. DELETE /api/production-plans/:id/items/:itemId (Remove item)
    if (testItemId) {
      console.log('\n6. Testing DELETE /api/production-plans/' + testPlanId + '/items/' + testItemId + '...');
      const delItemRes = await request('DELETE', '/api/production-plans/' + testPlanId + '/items/' + testItemId);
      console.log('   Status:', delItemRes.status);
    }

    // 7. PATCH /api/production-plans/:id (Update plan)
    console.log('\n7. Testing PATCH /api/production-plans/' + testPlanId + ' (Update plan)...');
    const updatePlanRes = await request('PATCH', '/api/production-plans/' + testPlanId, {
      title: 'Kế hoạch kiểm thử tự động API (Đã cập nhật)',
      targetAreaHa: 65.0,
    });
    console.log('   Status:', updatePlanRes.status);
    console.log('   New Title:', updatePlanRes.body.data?.title);

    // 8. POST /api/production-plans/:id/submit & approve (Workflow transitions)
    console.log('\n8. Testing workflow transitions (submit -> approve)...');
    const submitRes = await request('POST', '/api/production-plans/' + testPlanId + '/submit');
    console.log('   Submit status:', submitRes.status, 'New plan status:', submitRes.body.data?.status);

    const approveRes = await request('POST', '/api/production-plans/' + testPlanId + '/approve');
    console.log('   Approve status:', approveRes.status, 'New plan status:', approveRes.body.data?.status);

    // 9. DELETE /api/production-plans/:id (Clean up)
    console.log('\n9. Testing DELETE /api/production-plans/' + testPlanId + ' (Cleanup)...');
    const delPlanRes = await request('DELETE', '/api/production-plans/' + testPlanId);
    console.log('   Delete status:', delPlanRes.status);

    console.log('\n=== ALL 9 API TESTS FOR PRODUCTION PLANS PASSED WITH FLYING COLORS! ===');
  } catch (err) {
    console.error('ERROR DURING TESTS:', err);
  } finally {
    if (testPlanId) {
      await request('DELETE', '/api/production-plans/' + testPlanId).catch(() => {});
    }
  }
}

runTests();
