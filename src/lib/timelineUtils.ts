import type { Task } from './types';

export interface TimelineWindow {
  startMs: number; // start of today (midnight)
  endMs: number;   // at least today+30d, or furthest deadline
}

export interface TimelineTask {
  task: Task;
  deadlineMs: number;
  reminderMs: number | null;
  isOverdue: boolean;
  isDueSoon: boolean; // deadline within 7 days
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVE_STATUSES = new Set(['in-progress', 'waiting-on-dependency', 'waiting-on-response', 'backburnered']);

export interface TimelineData {
  window: TimelineWindow;
  plotted: TimelineTask[];  // tasks with deadlines, sorted by deadline asc
  noDeadline: Task[];       // active tasks without deadlines
}

export function computeTimelineData(tasks: Task[], now = Date.now()): TimelineData {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startMs = startOfToday.getTime();

  const activeTasks = tasks.filter((t) => ACTIVE_STATUSES.has(t.status));
  const withDeadline = activeTasks.filter((t) => t.deadline);
  const noDeadline = activeTasks.filter((t) => !t.deadline);

  const plotted: TimelineTask[] = withDeadline.map((t) => {
    const deadlineMs = new Date(t.deadline!).getTime();
    const reminderMs = t.reminderFiresAt && !t.reminderDismissed
      ? new Date(t.reminderFiresAt).getTime()
      : null;
    return {
      task: t,
      deadlineMs,
      reminderMs,
      isOverdue: deadlineMs < now,
      isDueSoon: deadlineMs >= now && deadlineMs - now <= SEVEN_DAYS_MS,
    };
  });

  plotted.sort((a, b) => a.deadlineMs - b.deadlineMs);

  const maxDeadlineMs = plotted.length > 0
    ? Math.max(...plotted.map((t) => t.deadlineMs))
    : startMs;

  const endMs = Math.max(startMs + THIRTY_DAYS_MS, maxDeadlineMs);

  return {
    window: { startMs, endMs },
    plotted,
    noDeadline,
  };
}

export function positionPercent(ms: number, window: TimelineWindow): number {
  const { startMs, endMs } = window;
  if (endMs === startMs) return 0;
  const raw = (ms - startMs) / (endMs - startMs);
  return Math.max(0, Math.min(100, raw * 100));
}
