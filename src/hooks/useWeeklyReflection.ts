import { useState } from 'react';

const STORAGE_KEY = 'weeklyReflection_dismissed';

function getFridayDateKey(now: Date): string | null {
  if (now.getDay() !== 5 || now.getHours() < 12) return null;
  return now.toISOString().slice(0, 10);
}

export function useWeeklyReflection() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    const key = getFridayDateKey(new Date());
    if (!key) return true;
    return localStorage.getItem(STORAGE_KEY) === key;
  });

  const fridayKey = getFridayDateKey(new Date());
  const shouldShow = !!fridayKey && !dismissed;

  function dismiss() {
    const key = getFridayDateKey(new Date());
    if (key) localStorage.setItem(STORAGE_KEY, key);
    setDismissed(true);
  }

  return { shouldShow, dismiss };
}
