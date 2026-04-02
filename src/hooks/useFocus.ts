import { useState, useEffect, useCallback } from 'react';
import { getFocus, setFocus as apiFocus, clearFocus as apiClear } from '../api/sessions';
import type { FocusState } from '../api/sessions';

export function useFocus() {
  const [focus, setFocusState] = useState<FocusState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await getFocus();
      setFocusState(state);
    } catch {
      // backend not available — silently ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const setFocus = useCallback(async (taskId: string) => {
    const state = await apiFocus(taskId);
    setFocusState(state);
  }, []);

  const clearFocus = useCallback(async () => {
    const state = await apiClear();
    setFocusState(state);
  }, []);

  return { focus, setFocus, clearFocus, refresh };
}
