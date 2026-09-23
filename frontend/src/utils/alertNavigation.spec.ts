import { compareOperationalAlerts, resolveAlertTarget } from './alertNavigation';
import type { AlertItem } from '../store/useAppStore';

const alert = (values: Partial<AlertItem>): AlertItem => ({
  id: values.id ?? 1,
  severity: values.severity ?? 'WARNING',
  title: values.title ?? 'Cảnh báo',
  message: values.message ?? 'Nội dung',
  createdAt: values.createdAt ?? '2026-09-16T00:00:00.000Z',
  ...values,
});

describe('alert navigation', () => {
  it('prioritizes unread SOS before other critical alerts', () => {
    const items = [
      alert({ id: 1, category: 'COMPLIANCE', severity: 'CRITICAL', isRead: false }),
      alert({ id: 2, category: 'SOS', severity: 'CRITICAL', isRead: false }),
      alert({ id: 3, category: 'SOS', severity: 'CRITICAL', isRead: true }),
    ].sort(compareOperationalAlerts);
    expect(items.map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it('routes SOS to GPS using its source id', () => {
    expect(resolveAlertTarget(alert({ id: 9, category: 'SOS', sourceId: '42', targetUrl: '/doi-xe/quan-ly-sos' })))
      .toBe('/gps/realtime?sosId=42');
  });

  it('keeps valid internal domain targets and rejects external targets', () => {
    expect(resolveAlertTarget(alert({ id: 10, targetUrl: '/lai-xe/quan-ly-gplx?driverId=7' })))
      .toBe('/lai-xe/quan-ly-gplx?driverId=7');
    expect(resolveAlertTarget(alert({ id: 11, targetUrl: '//malicious.example/path' })))
      .toBe('/canh-bao/chua-xu-ly?alertId=11');
  });
});
