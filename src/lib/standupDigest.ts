import type { Task } from './types';

export interface StandupDigest {
  workedOnYesterday: Task[];
  remindersToday: Task[];
  overdue: Task[];
}

function getYesterdayWindow(): { start: number; end: number } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart.getTime() - 86400000;
  const yesterdayEnd = todayStart.getTime() - 1;
  return { start: yesterdayStart, end: yesterdayEnd };
}

function getTodayWindow(): { start: number; end: number } {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = todayStart.getTime() + 86400000;
  return { start: todayStart.getTime(), end: tomorrowStart - 1 };
}

function isInWindow(iso: string, start: number, end: number): boolean {
  const t = new Date(iso).getTime();
  return t >= start && t <= end;
}

export function computeStandupDigest(tasks: Task[]): StandupDigest {
  const yesterday = getYesterdayWindow();
  const today = getTodayWindow();
  const now = Date.now();

  const workedOnYesterday = tasks.filter((task) => {
    // Any history entry that falls in yesterday's window
    const hadHistoryYesterday = (task.history ?? []).some((h) =>
      isInWindow(h.timestamp, yesterday.start, yesterday.end)
    );
    if (hadHistoryYesterday) return true;

    // Task has been in-progress since before today (active throughout yesterday)
    if (task.status === 'in-progress') {
      const updatedBeforeToday = new Date(task.updatedAt).getTime() < today.start;
      if (updatedBeforeToday) return true;
    }

    return false;
  });

  const remindersToday = tasks.filter((task) => {
    if (task.status === 'completed' || task.status === 'archived') return false;
    if (!task.reminderFiresAt || task.reminderDismissed) return false;
    const firesAt = new Date(task.reminderFiresAt).getTime();
    // Fires today or is overdue (past, undismissed)
    return firesAt <= today.end;
  });

  const overdue = tasks
    .filter((task) => {
      if (task.status === 'completed' || task.status === 'archived') return false;
      if (!task.deadline) return false;
      return new Date(task.deadline).getTime() < now;
    })
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  // Deduplicate workedOnYesterday and overdue (a task can appear in both — keep it in both sections)
  return { workedOnYesterday, remindersToday, overdue };
}
