import { useState, useEffect, useCallback } from 'react';
import type { Task, Alert } from '../lib/types';
import { isDeadlineSoon } from '../lib/utils';

export function useReminders(tasks: Task[]) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const checkAlerts = useCallback(() => {
    const now = new Date();
    const newAlerts: Alert[] = [];

    for (const task of tasks) {
      if (task.status === 'completed' || task.status === 'archived') continue;

      // Boomerang check
      if (
        (task.status === 'waiting-on-response' || task.status === 'waiting-on-dependency') &&
        task.reminderFiresAt &&
        !task.reminderDismissed &&
        new Date(task.reminderFiresAt) <= now
      ) {
        const key = `boomerang-${task.id}-${task.reminderFiresAt}`;
        if (!dismissedIds.has(key)) {
          newAlerts.push({ type: 'boomerang', task });
        }
      }

      // Deadline check
      if (task.deadline && isDeadlineSoon(task.deadline)) {
        const key = `deadline-${task.id}-${task.deadline}`;
        if (!dismissedIds.has(key)) {
          newAlerts.push({ type: 'deadline', task });
        }
      }
    }

    setAlerts(newAlerts);
  }, [tasks, dismissedIds]);

  useEffect(() => {
    checkAlerts();
    const interval = setInterval(checkAlerts, 60 * 1000);
    return () => clearInterval(interval);
  }, [checkAlerts]);

  const dismissAlert = useCallback((alert: Alert) => {
    const key =
      alert.type === 'boomerang'
        ? `boomerang-${alert.task.id}-${alert.task.reminderFiresAt}`
        : `deadline-${alert.task.id}-${alert.task.deadline}`;
    setDismissedIds((prev) => new Set([...prev, key]));
  }, []);

  return { alerts, dismissAlert };
}
