import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { WORKSHOP_ROUTES } from './workshopRoutes';

describe('workshop routes', () => {
  const routes = [{
    path: '/',
    children: [
      { path: WORKSHOP_ROUTES.maintenancePlan },
      { path: `${WORKSHOP_ROUTES.damagedAssets}/*` },
    ],
  }];

  it('matches the damaged-assets link instead of falling through to the dashboard fallback', () => {
    const matches = matchRoutes(routes, WORKSHOP_ROUTES.damagedAssets);
    expect(matches?.at(-1)?.route.path).toBe(`${WORKSHOP_ROUTES.damagedAssets}/*`);
  });

  it('matches the maintenance-plan URL', () => {
    const matches = matchRoutes(routes, WORKSHOP_ROUTES.maintenancePlan);
    expect(matches?.at(-1)?.route.path).toBe(WORKSHOP_ROUTES.maintenancePlan);
  });
});

