export type SyncStatus = 'SYNCED' | 'PENDING' | 'SYNCING' | 'FAILED' | 'CONFLICT';
export type OrderType = 'DISPATCH' | 'TRANSPORT' | 'FEED';
export type MobileEventType =
  | 'ORDER_ACCEPTED' | 'VEHICLE_RECEIVED' | 'JOB_STARTED' | 'JOB_PAUSED'
  | 'JOB_RESUMED' | 'PROGRESS_UPDATED' | 'INCIDENT_REPORTED' | 'PHOTO_ADDED'
  | 'ACCEPTANCE_SUBMITTED' | 'JOB_COMPLETED' | 'SCHEDULE_CHANGE_REQUESTED'
  | 'TRANSFER_REQUESTED' | 'SOS_CREATED';

export interface DriverSession { accessToken: string; refreshToken: string; refreshExpiresAt: string; user: Driver; }
export interface Driver {
  id: number; code: string; username: string; fullName: string; phone?: string | null;
  role: 'DRIVER'; unit?: string | null; klhName?: string | null; assignedUnit?: string | null; avatarUrl?: string | null; currentShiftStatus?: string | null;
  assignedVehicleId?: number | null;
}
export interface LocalOrder {
  local_key: string; server_id: number; order_type: OrderType; code: string; title: string;
  origin: string | null; destination: string | null; planned_start: string | null; planned_end: string | null;
  actual_start: string | null; actual_end: string | null; server_status: string; local_status: string;
  vehicle_id: number | null; vehicle_code: string | null; vehicle_plate: string | null; vehicle_name: string | null;
  version: number; sync_status: SyncStatus; server_updated_at: string; local_updated_at: string; raw_json: string;
}
export interface QueueItem {
  id: number; event_id: string; event_type: MobileEventType; order_type: OrderType | null; order_id: number | null;
  sequence_number: number; occurred_at: string; base_version: number | null; payload_json: string;
  priority: number; status: SyncStatus; retry_count: number;
}
