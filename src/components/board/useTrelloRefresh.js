import { useEffect } from 'react';
import { requestTrelloCardSync } from '../../api/cardApi';

const REFRESH_INTERVAL_MS = 10000;
const SYNC_REQUEST_INTERVAL_MS = 30000;


export function useTrelloRefresh(refresh, intervalMs = REFRESH_INTERVAL_MS) {
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);
}

export function useTrelloCardSync(cardId) {
  useEffect(() => {
    if (!cardId) return;
    const request = () =>
      requestTrelloCardSync(cardId).catch((err) => console.error('Failed to request Trello sync', err));
    request();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') request();
    }, SYNC_REQUEST_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cardId]);
}
