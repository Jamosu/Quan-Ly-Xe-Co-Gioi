import { summarizeVehicleCounts } from './vehicles.service';

describe('vehicle statistics', () => {
  it('does not mix auxiliary implements into vehicle totals', () => {
    expect(summarizeVehicleCounts({
      vehicles: 1768,
      activeVehicles: 1500,
    })).toEqual({ total: 1768, active: 1500 });
  });
});
