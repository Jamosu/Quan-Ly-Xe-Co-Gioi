import { isMovingLongEnough } from './vehicles.service';

describe('NO_ACTIVE_ORDER moving threshold', () => {
  const now = new Date('2026-09-18T08:01:00.000Z');

  it('does not infer movement without valid GPS speed evidence', () => {
    expect(isMovingLongEnough(null, null, now)).toBe(false);
    expect(isMovingLongEnough(5, new Date('2026-09-18T07:00:00.000Z'), now)).toBe(false);
  });

  it('requires speed over 5 km/h continuously for one minute', () => {
    expect(isMovingLongEnough(6, new Date('2026-09-18T08:00:01.000Z'), now)).toBe(false);
    expect(isMovingLongEnough(6, new Date('2026-09-18T08:00:00.000Z'), now)).toBe(true);
  });
});
