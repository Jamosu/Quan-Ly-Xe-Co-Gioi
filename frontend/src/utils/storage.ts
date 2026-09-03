export function getStoredData<T>(key: string, defaultData: T): T {
  try {
    const saved = localStorage.getItem(`thaco_agri_${key}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
  }
  return defaultData;
}

export function setStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`thaco_agri_${key}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to localStorage:`, err);
  }
}


