import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { Driver, LocalOrder, MobileEventType, OrderType, QueueItem, SyncStatus } from './types';
import { eventPriority, retryDelayMs } from './syncPolicy';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

export async function getDatabase() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync('thaco_agri_driver.db');
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY NOT NULL, employee_code TEXT NOT NULL, username TEXT NOT NULL,
      name TEXT NOT NULL, phone TEXT, unit_id TEXT NOT NULL, status TEXT, assigned_vehicle_id INTEGER,
      avatar_url TEXT, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY NOT NULL, code TEXT NOT NULL, license_plate TEXT, name TEXT,
      status TEXT NOT NULL, vehicle_type TEXT, odo_km REAL DEFAULT 0, latitude REAL, longitude REAL,
      location_name TEXT, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dispatch_orders (
      local_key TEXT PRIMARY KEY NOT NULL, server_id INTEGER NOT NULL, order_type TEXT NOT NULL,
      code TEXT NOT NULL, title TEXT NOT NULL, origin TEXT, destination TEXT, planned_start TEXT,
      planned_end TEXT, actual_start TEXT, actual_end TEXT, server_status TEXT NOT NULL,
      local_status TEXT NOT NULL, vehicle_id INTEGER, vehicle_code TEXT, vehicle_plate TEXT,
      vehicle_name TEXT, version INTEGER NOT NULL DEFAULT 1, server_updated_at TEXT NOT NULL,
      local_updated_at TEXT NOT NULL, sync_status TEXT NOT NULL DEFAULT 'SYNCED', raw_json TEXT NOT NULL,
      UNIQUE(server_id, order_type)
    );
    CREATE TABLE IF NOT EXISTS dispatch_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE NOT NULL, dispatch_order_key TEXT,
      event_type TEXT NOT NULL, occurred_at TEXT NOT NULL, latitude REAL, longitude REAL, note TEXT,
      payload_json TEXT NOT NULL, sync_status TEXT NOT NULL, retry_count INTEGER NOT NULL DEFAULT 0,
      server_result_json TEXT, FOREIGN KEY(dispatch_order_key) REFERENCES dispatch_orders(local_key)
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE NOT NULL, event_type TEXT NOT NULL,
      order_type TEXT, order_id INTEGER, sequence_number INTEGER NOT NULL, occurred_at TEXT NOT NULL,
      base_version INTEGER, payload_json TEXT NOT NULL, priority INTEGER NOT NULL DEFAULT 2,
      status TEXT NOT NULL DEFAULT 'PENDING', retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT, next_retry_at TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL, dispatch_order_key TEXT,
      local_file_path TEXT NOT NULL, remote_url TEXT, type TEXT NOT NULL, captured_at TEXT NOT NULL,
      latitude REAL, longitude REAL, upload_status TEXT NOT NULL DEFAULT 'PENDING', retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_planned_start ON dispatch_orders(planned_start);
    CREATE INDEX IF NOT EXISTS idx_events_order ON dispatch_events(dispatch_order_key, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON sync_queue(status, priority, sequence_number);
    CREATE INDEX IF NOT EXISTS idx_attachments_status ON attachments(upload_status);
  `);
  const queueColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(sync_queue)');
  if (!queueColumns.some(column => column.name === 'next_retry_at')) {
    await db.execAsync('ALTER TABLE sync_queue ADD COLUMN next_retry_at TEXT');
  }
  const attachmentColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(attachments)');
  if (!attachmentColumns.some(column => column.name === 'next_retry_at')) {
    await db.execAsync('ALTER TABLE attachments ADD COLUMN next_retry_at TEXT');
  }
  await db.execAsync('PRAGMA user_version = 2');
}

export async function setMeta(key: string, value: string) {
  const db = await getDatabase();
  await db.runAsync('INSERT INTO app_meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
}

export async function getMeta(key: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', key);
  return row?.value ?? null;
}

export async function saveDriver(driver: Driver) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO drivers(id, employee_code, username, name, phone, unit_id, status, assigned_vehicle_id, avatar_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET employee_code=excluded.employee_code, username=excluded.username,
     name=excluded.name, phone=excluded.phone, unit_id=excluded.unit_id, status=excluded.status,
     assigned_vehicle_id=excluded.assigned_vehicle_id, avatar_url=excluded.avatar_url, updated_at=excluded.updated_at`,
    driver.id, driver.code || `TX-${driver.id}`, driver.username, driver.fullName, driver.phone ?? null,
    driver.klhName || driver.unit || 'KLH Koun Mom', driver.currentShiftStatus ?? null, driver.assignedVehicleId ?? null, driver.avatarUrl ?? null, new Date().toISOString(),
  );
  await setMeta('current_driver_id', String(driver.id));
}

export async function getLocalDriver() {
  const db = await getDatabase();
  const id = await getMeta('current_driver_id');
  if (!id) return null;
  return db.getFirstAsync<{ id: number; employee_code: string; username: string; name: string; phone: string | null; unit_id: string; status: string | null; assigned_vehicle_id: number | null; avatar_url: string | null }>(
    'SELECT * FROM drivers WHERE id = ?', Number(id),
  );
}

export async function listOrders(scope: 'today' | 'upcoming' | 'history' = 'today') {
  const db = await getDatabase();
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  if (scope === 'today') return db.getAllAsync<LocalOrder>('SELECT * FROM dispatch_orders WHERE planned_start >= ? AND planned_start < ? ORDER BY planned_start', start.toISOString(), end.toISOString());
  if (scope === 'upcoming') return db.getAllAsync<LocalOrder>('SELECT * FROM dispatch_orders WHERE planned_start >= ? ORDER BY planned_start LIMIT 100', end.toISOString());
  return db.getAllAsync<LocalOrder>("SELECT * FROM dispatch_orders WHERE local_status IN ('COMPLETED','DELIVERED','ACCEPTED','CLOSED') OR planned_start < ? ORDER BY COALESCE(actual_end, planned_start) DESC LIMIT 100", start.toISOString());
}

export async function getOrder(localKey: string) {
  const db = await getDatabase();
  return db.getFirstAsync<LocalOrder>('SELECT * FROM dispatch_orders WHERE local_key = ?', localKey);
}

export async function getOrderEvents(localKey: string) {
  const db = await getDatabase();
  return db.getAllAsync<{ event_id: string; event_type: MobileEventType; occurred_at: string; note: string | null; sync_status: SyncStatus }>(
    'SELECT event_id, event_type, occurred_at, note, sync_status FROM dispatch_events WHERE dispatch_order_key = ? ORDER BY occurred_at DESC', localKey,
  );
}

export async function enqueueEvent(input: {
  eventType: MobileEventType; order?: LocalOrder | null; payload?: Record<string, unknown>;
  latitude?: number; longitude?: number; note?: string;
}) {
  const db = await getDatabase();
  const eventId = Crypto.randomUUID();
  const occurredAt = new Date().toISOString();
  const payload = { ...(input.payload ?? {}), latitude: input.latitude, longitude: input.longitude };
  const priority = eventPriority(input.eventType);
  await db.withExclusiveTransactionAsync(async (tx) => {
    const row = await tx.getFirstAsync<{ sequence: number }>('SELECT COALESCE(MAX(sequence_number), 0) + 1 AS sequence FROM sync_queue');
    const sequence = row?.sequence ?? 1;
    await tx.runAsync(
      `INSERT INTO sync_queue(event_id,event_type,order_type,order_id,sequence_number,occurred_at,base_version,payload_json,priority,status,retry_count,created_at)
       VALUES(?,?,?,?,?,?,?,?,?,'PENDING',0,?)`,
      eventId, input.eventType, input.order?.order_type ?? null, input.order?.server_id ?? null,
      sequence, occurredAt, input.order?.version ?? null, JSON.stringify(payload), priority, occurredAt,
    );
    await tx.runAsync(
      `INSERT INTO dispatch_events(event_id,dispatch_order_key,event_type,occurred_at,latitude,longitude,note,payload_json,sync_status,retry_count)
       VALUES(?,?,?,?,?,?,?,?, 'PENDING',0)`,
      eventId, input.order?.local_key ?? null, input.eventType, occurredAt, input.latitude ?? null,
      input.longitude ?? null, input.note ?? null, JSON.stringify(payload),
    );
    if (input.order) {
      const nextStatus: Partial<Record<MobileEventType, string>> = {
        ORDER_ACCEPTED: 'DRIVER_ACCEPTED', VEHICLE_RECEIVED: 'VEHICLE_RECEIVED', JOB_STARTED: 'WORKING',
        JOB_PAUSED: 'PAUSED', JOB_RESUMED: 'WORKING', JOB_COMPLETED: input.order.order_type === 'TRANSPORT' ? 'DELIVERED' : 'COMPLETED',
      };
      await tx.runAsync(
        `UPDATE dispatch_orders SET local_status=?, sync_status='PENDING', local_updated_at=?,
         actual_start=CASE WHEN ?='JOB_STARTED' AND actual_start IS NULL THEN ? ELSE actual_start END,
         actual_end=CASE WHEN ?='JOB_COMPLETED' THEN ? ELSE actual_end END WHERE local_key=?`,
        nextStatus[input.eventType] ?? input.order.local_status, occurredAt, input.eventType, occurredAt,
        input.eventType, occurredAt, input.order.local_key,
      );
    }
  });
  return eventId;
}

export async function addAttachment(input: { eventId: string; orderKey?: string; localPath: string; type: string; latitude?: number; longitude?: number }) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO attachments(event_id,dispatch_order_key,local_file_path,type,captured_at,latitude,longitude,upload_status)
     VALUES(?,?,?,?,?,?,?,'PENDING')`,
    input.eventId, input.orderKey ?? null, input.localPath, input.type, new Date().toISOString(), input.latitude ?? null, input.longitude ?? null,
  );
}

export async function pendingQueue(priority?: number) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const where = priority === undefined
    ? "status IN ('PENDING','FAILED','SYNCING') AND (next_retry_at IS NULL OR next_retry_at <= ?)"
    : "status IN ('PENDING','FAILED','SYNCING') AND priority = ? AND (next_retry_at IS NULL OR next_retry_at <= ?)";
  return db.getAllAsync<QueueItem>(`SELECT * FROM sync_queue WHERE ${where} ORDER BY priority, sequence_number`, ...(priority === undefined ? [now] : [priority, now]));
}

export async function pendingAttachments() {
  const db = await getDatabase();
  return db.getAllAsync<{ id: number; event_id: string; local_file_path: string; type: string; upload_status: SyncStatus; retry_count: number }>(
    "SELECT * FROM attachments WHERE upload_status IN ('PENDING','FAILED','SYNCING') AND (next_retry_at IS NULL OR next_retry_at <= ?) ORDER BY id",
    new Date().toISOString(),
  );
}

export async function markAttachment(id: number, status: SyncStatus, remoteUrl?: string, error?: string) {
  const db = await getDatabase();
  const current = await db.getFirstAsync<{ retry_count: number }>('SELECT retry_count FROM attachments WHERE id=?', id);
  const nextRetryAt = error ? new Date(Date.now() + retryDelayMs((current?.retry_count ?? 0) + 1)).toISOString() : null;
  await db.runAsync('UPDATE attachments SET upload_status=?, remote_url=COALESCE(?,remote_url), retry_count=retry_count+?, next_retry_at=? WHERE id=?', status, remoteUrl ?? null, error ? 1 : 0, nextRetryAt, id);
  if (remoteUrl) {
    const attachment = await db.getFirstAsync<{ event_id: string }>('SELECT event_id FROM attachments WHERE id=?', id);
    if (attachment) {
      const queue = await db.getFirstAsync<{ payload_json: string }>('SELECT payload_json FROM sync_queue WHERE event_id=?', attachment.event_id);
      if (queue) await db.runAsync('UPDATE sync_queue SET payload_json=? WHERE event_id=?', JSON.stringify({ ...JSON.parse(queue.payload_json), photoUrl: remoteUrl }), attachment.event_id);
    }
  }
}

export async function markQueue(eventId: string, status: SyncStatus, result?: unknown, error?: string) {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const current = await tx.getFirstAsync<{ retry_count: number }>('SELECT retry_count FROM sync_queue WHERE event_id=?', eventId);
    const nextRetryAt = error ? new Date(Date.now() + retryDelayMs((current?.retry_count ?? 0) + 1)).toISOString() : null;
    await tx.runAsync('UPDATE sync_queue SET status=?, retry_count=retry_count+?, last_error=?, next_retry_at=? WHERE event_id=?', status, error ? 1 : 0, error ?? null, nextRetryAt, eventId);
    await tx.runAsync('UPDATE dispatch_events SET sync_status=?, retry_count=retry_count+?, server_result_json=? WHERE event_id=?', status, error ? 1 : 0, result ? JSON.stringify(result) : null, eventId);
    if (status === 'SYNCED') {
      const queue = await tx.getFirstAsync<{ order_type: string | null; order_id: number | null }>('SELECT order_type,order_id FROM sync_queue WHERE event_id=?', eventId);
      if (queue?.order_id) {
        const pending = await tx.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sync_queue WHERE order_type=? AND order_id=? AND status NOT IN ('SYNCED')", queue.order_type, queue.order_id);
        if ((pending?.count ?? 0) === 0) await tx.runAsync("UPDATE dispatch_orders SET sync_status='SYNCED' WHERE order_type=? AND server_id=?", queue.order_type, queue.order_id);
      }
    }
  });
}

export async function getSyncStats() {
  const db = await getDatabase();
  const queue = await db.getFirstAsync<{ pending: number; failed: number; conflicts: number; sos: number }>(
    `SELECT SUM(CASE WHEN status IN ('PENDING','SYNCING') THEN 1 ELSE 0 END) AS pending,
     SUM(CASE WHEN status='FAILED' THEN 1 ELSE 0 END) AS failed,
     SUM(CASE WHEN status='CONFLICT' THEN 1 ELSE 0 END) AS conflicts,
     SUM(CASE WHEN event_type='SOS_CREATED' AND status!='SYNCED' THEN 1 ELSE 0 END) AS sos FROM sync_queue`,
  );
  const photos = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM attachments WHERE upload_status!='SYNCED'");
  return { pending: queue?.pending ?? 0, failed: queue?.failed ?? 0, conflicts: queue?.conflicts ?? 0, sos: queue?.sos ?? 0, photos: photos?.count ?? 0 };
}

export async function applyPull(payload: any) {
  if (payload.driver) await saveDriver(payload.driver);
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const all = [
      ...(payload.dispatchOrders ?? []).map((item: any) => ({ ...item, orderType: 'DISPATCH' as OrderType })),
      ...(payload.transportOrders ?? []).map((item: any) => ({ ...item, orderType: 'TRANSPORT' as OrderType })),
    ];
    for (const item of all) {
      const localKey = `${item.orderType}:${item.id}`;
      const existing = await tx.getFirstAsync<LocalOrder>('SELECT * FROM dispatch_orders WHERE local_key=?', localKey);
      const serverStatus = String(item.status);
      const preserveLocal = existing && ['PENDING', 'SYNCING', 'FAILED', 'CONFLICT'].includes(existing.sync_status);
      const vehicle = item.vehicle;
      const title = item.orderType === 'DISPATCH' ? item.purpose : item.cargoType || item.operationalWorkOrder?.jobName || 'Vận chuyển';
      const version = Number(item.operationalWorkOrder?.version ?? item.version ?? 1);
      await tx.runAsync(
        `INSERT INTO dispatch_orders(local_key,server_id,order_type,code,title,origin,destination,planned_start,planned_end,actual_start,actual_end,server_status,local_status,vehicle_id,vehicle_code,vehicle_plate,vehicle_name,version,server_updated_at,local_updated_at,sync_status,raw_json)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(local_key) DO UPDATE SET code=excluded.code,title=excluded.title,origin=excluded.origin,destination=excluded.destination,
         planned_start=excluded.planned_start,planned_end=excluded.planned_end,server_status=excluded.server_status,
         local_status=CASE WHEN dispatch_orders.sync_status IN ('PENDING','SYNCING','FAILED','CONFLICT') THEN dispatch_orders.local_status ELSE excluded.local_status END,
         vehicle_id=excluded.vehicle_id,vehicle_code=excluded.vehicle_code,vehicle_plate=excluded.vehicle_plate,vehicle_name=excluded.vehicle_name,
         version=excluded.version,server_updated_at=excluded.server_updated_at,raw_json=excluded.raw_json,
         sync_status=CASE WHEN dispatch_orders.sync_status IN ('PENDING','SYNCING','FAILED','CONFLICT') THEN dispatch_orders.sync_status ELSE 'SYNCED' END`,
        localKey, item.id, item.orderType, item.code, title || 'Nhiệm vụ', item.origin ?? null, item.destination ?? null,
        item.departureTime ?? item.executionDate ?? null, item.plannedEndTime ?? null,
        existing?.actual_start ?? item.actualStartTime ?? item.departedAt ?? null,
        existing?.actual_end ?? item.actualCompletedTime ?? item.deliveredAt ?? null,
        serverStatus, preserveLocal ? existing.local_status : serverStatus, vehicle?.id ?? item.vehicleId ?? null,
        vehicle?.code ?? null, vehicle?.plate ?? null, vehicle?.name ?? null, version,
        item.updatedAt ?? payload.serverTime, existing?.local_updated_at ?? payload.serverTime,
        preserveLocal ? existing.sync_status : 'SYNCED', JSON.stringify(item),
      );
      if (vehicle) {
        await tx.runAsync(
          `INSERT INTO vehicles(id,code,license_plate,name,status,vehicle_type,odo_km,latitude,longitude,location_name,updated_at)
           VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,license_plate=excluded.license_plate,
           name=excluded.name,status=excluded.status,vehicle_type=excluded.vehicle_type,odo_km=excluded.odo_km,
           latitude=excluded.latitude,longitude=excluded.longitude,location_name=excluded.location_name,updated_at=excluded.updated_at`,
          vehicle.id, vehicle.code, vehicle.plate ?? null, vehicle.name ?? null, vehicle.status, vehicle.category ?? null,
          vehicle.odoKm ?? 0, vehicle.currentLat ?? null, vehicle.currentLng ?? null, vehicle.currentLocationName ?? null,
          vehicle.updatedAt ?? payload.serverTime,
        );
      }
    }
  });
  await setMeta('last_sync_at', payload.serverTime);
}
