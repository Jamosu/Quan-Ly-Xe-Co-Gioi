import { MaintenanceAlertTier, MaintenanceOccurrenceStatus } from '@prisma/client';

export interface MaintenanceOccurrenceState {
  progressPercent: number;
  alertTier: MaintenanceAlertTier;
  status: MaintenanceOccurrenceStatus;
  explanationRequired: boolean;
}

export const ENGINE_HOUR_MILESTONES = [50, 250, 500, 750, 1000, 1250, 1500, 1750, 2000] as const;
export const ODOMETER_KM_MILESTONES = [500, 5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000] as const;

export const calculateOccurrenceState = (
  currentMeter: number,
  previousDueMeter: number,
  dueMeter: number,
  warningPercent = 80,
  explanationPercent = 110,
): MaintenanceOccurrenceState => {
  const interval = Math.max(dueMeter - previousDueMeter, Number.EPSILON);
  const rawProgress = ((currentMeter - previousDueMeter) / interval) * 100;
  const progressPercent = Number(Math.max(0, rawProgress).toFixed(2));
  if (progressPercent >= 100) {
    return {
      progressPercent,
      alertTier: MaintenanceAlertTier.RED,
      status: progressPercent > explanationPercent ? MaintenanceOccurrenceStatus.OVERDUE : MaintenanceOccurrenceStatus.DUE,
      explanationRequired: progressPercent > explanationPercent,
    };
  }
  if (progressPercent >= warningPercent) {
    return {
      progressPercent,
      alertTier: MaintenanceAlertTier.AMBER,
      status: MaintenanceOccurrenceStatus.UPCOMING,
      explanationRequired: false,
    };
  }
  return {
    progressPercent,
    alertTier: MaintenanceAlertTier.GREEN,
    status: MaintenanceOccurrenceStatus.UPCOMING,
    explanationRequired: false,
  };
};

export const currentCycleIndex = (currentMeter: number, maximumMilestone: number) => {
  if (currentMeter <= 0 || maximumMilestone <= 0) return 0;
  const exactBoundary = currentMeter % maximumMilestone === 0;
  return Math.max(0, Math.floor(currentMeter / maximumMilestone) - (exactBoundary ? 1 : 0));
};
