import { API_BASE_URL } from '../api/client';

export const connectOperationalRealtime = () => {
  const stream = new EventSource(`${API_BASE_URL}/operational-realtime/stream`, { withCredentials: true });
  stream.addEventListener('operational-update', (message) => {
    try {
      window.dispatchEvent(new CustomEvent('operational-data-updated', { detail: JSON.parse(message.data) }));
    } catch {
      // Ignore malformed realtime data; REST refresh remains authoritative.
    }
  });
  return () => stream.close();
};
