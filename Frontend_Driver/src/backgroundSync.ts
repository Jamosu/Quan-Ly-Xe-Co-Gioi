import NetInfo from '@react-native-community/netinfo';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { syncNow } from './syncEngine';

const TASK_NAME = 'THACO_AGRI_DRIVER_BACKGROUND_SYNC';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const network = await NetInfo.fetch();
    if (network.isConnected && network.isInternetReachable !== false) await syncNow();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundSync() {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  if (!(await TaskManager.isTaskRegisteredAsync(TASK_NAME))) {
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
  }
}
