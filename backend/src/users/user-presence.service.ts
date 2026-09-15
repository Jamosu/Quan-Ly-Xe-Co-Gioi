import { Injectable } from '@nestjs/common';

export interface PresenceRecord {
  lastSeenAt: number;
  platform: 'WEB' | 'MOBILE';
  ipAddress?: string;
}

@Injectable()
export class UserPresenceService {
  // Map of userId -> PresenceRecord
  private activeUsers = new Map<number, PresenceRecord>();

  constructor() {
    // Clean up stale entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const cutoff = 15 * 60 * 1000; // 15 minutes
      for (const [userId, record] of this.activeUsers.entries()) {
        if (now - record.lastSeenAt > cutoff) {
          this.activeUsers.delete(userId);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Ghi nhận hoạt động thực tế từ Web hoặc App Mobile
   */
  recordActivity(userId: number, platform: 'WEB' | 'MOBILE' = 'WEB', ipAddress?: string) {
    if (!userId) return;
    this.activeUsers.set(userId, {
      lastSeenAt: Date.now(),
      platform,
      ipAddress,
    });
  }

  /**
   * Đánh giá user có đang Online hay không (mặc định trong vòng 3 phút)
   */
  isOnline(userId: number, thresholdMs = 3 * 60 * 1000): boolean {
    const record = this.activeUsers.get(userId);
    if (!record) return false;
    return Date.now() - record.lastSeenAt <= thresholdMs;
  }

  /**
   * Lấy chi tiết thông tin hiện diện
   */
  getPresence(userId: number, thresholdMs = 3 * 60 * 1000) {
    const record = this.activeUsers.get(userId);
    if (!record) {
      return {
        isOnline: false,
        lastSeenAt: null,
        platform: null,
      };
    }
    const online = Date.now() - record.lastSeenAt <= thresholdMs;
    return {
      isOnline: online,
      lastSeenAt: new Date(record.lastSeenAt).toISOString(),
      platform: record.platform,
    };
  }

  /**
   * Đánh dấu Offline ngay khi bấm đăng xuất
   */
  setOffline(userId: number) {
    if (userId) {
      this.activeUsers.delete(userId);
    }
  }

  /**
   * Lấy danh sách tất cả user ID đang online
   */
  getOnlineUserIds(thresholdMs = 3 * 60 * 1000): number[] {
    const now = Date.now();
    const list: number[] = [];
    for (const [userId, record] of this.activeUsers.entries()) {
      if (now - record.lastSeenAt <= thresholdMs) {
        list.push(userId);
      }
    }
    return list;
  }
}
