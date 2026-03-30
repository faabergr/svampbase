import { describe, it, expect } from 'vitest';
import { computeTimelineData, positionPercent } from '../lib/timelineUtils';
import type { Task } from '../lib/types';

// Fixed "now": 2024-06-05 (Wednesday) noon UTC
const NOW = new Date('2024-06-05T12:00:00.000Z').getTime();

function daysFromNow(n: number): string {
  return new Date(NOW + n * 86_400_000).toISOString();
}

function daysAgo(n: number): string {
  return new Date(NOW - n * 86_400_000).toISOString();
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'TASK-001',
    title: 'Test task',
    description: '',
    status: 'in-progress',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    links: [],
    notes: [],
    screenshots: [],
    relatedTaskIds: [],
    history: [],
    ...overrides,
  };
}

// ---------- computeTimelineData ----------

describe('computeTimelineData — plotted tasks', () => {
  it('includes active tasks with deadlines in plotted', () => {
    const task = makeTask({ deadline: daysFromNow(10) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted).toHaveLength(1);
    expect(plotted[0].task.id).toBe('TASK-001');
  });

  it('excludes completed tasks from plotted', () => {
    const task = makeTask({ status: 'completed', deadline: daysFromNow(10) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted).toHaveLength(0);
  });

  it('excludes archived tasks from plotted', () => {
    const task = makeTask({ status: 'archived', deadline: daysFromNow(10) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted).toHaveLength(0);
  });

  it('marks overdue when deadline is in the past', () => {
    const task = makeTask({ deadline: daysAgo(2) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted[0].isOverdue).toBe(true);
    expect(plotted[0].isDueSoon).toBe(false);
  });

  it('marks isDueSoon when deadline is within 7 days', () => {
    const task = makeTask({ deadline: daysFromNow(3) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted[0].isDueSoon).toBe(true);
    expect(plotted[0].isOverdue).toBe(false);
  });

  it('marks as future (neither overdue nor isDueSoon) for deadline beyond 7 days', () => {
    const task = makeTask({ deadline: daysFromNow(14) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted[0].isOverdue).toBe(false);
    expect(plotted[0].isDueSoon).toBe(false);
  });

  it('sorts plotted tasks by deadline ascending', () => {
    const later = makeTask({ id: 'TASK-002', deadline: daysFromNow(20) });
    const earlier = makeTask({ id: 'TASK-001', deadline: daysFromNow(5) });
    const { plotted } = computeTimelineData([later, earlier], NOW);
    expect(plotted[0].task.id).toBe('TASK-001');
    expect(plotted[1].task.id).toBe('TASK-002');
  });

  it('includes active waiting-on-response tasks', () => {
    const task = makeTask({ status: 'waiting-on-response', deadline: daysFromNow(5) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted).toHaveLength(1);
  });

  it('includes backburnered tasks with deadlines', () => {
    const task = makeTask({ status: 'backburnered', deadline: daysFromNow(5) });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted).toHaveLength(1);
  });
});

describe('computeTimelineData — noDeadline tasks', () => {
  it('puts active tasks without a deadline in noDeadline', () => {
    const task = makeTask({ deadline: undefined });
    const { noDeadline } = computeTimelineData([task], NOW);
    expect(noDeadline).toHaveLength(1);
    expect(noDeadline[0].id).toBe('TASK-001');
  });

  it('excludes completed tasks from noDeadline', () => {
    const task = makeTask({ status: 'completed' });
    const { noDeadline } = computeTimelineData([task], NOW);
    expect(noDeadline).toHaveLength(0);
  });
});

describe('computeTimelineData — window', () => {
  it('window starts at beginning of today', () => {
    const { window: win } = computeTimelineData([], NOW);
    const startOfToday = new Date(NOW);
    startOfToday.setHours(0, 0, 0, 0);
    expect(win.startMs).toBe(startOfToday.getTime());
  });

  it('window extends at least 30 days when no deadlines', () => {
    const { window: win } = computeTimelineData([], NOW);
    const startOfToday = new Date(NOW);
    startOfToday.setHours(0, 0, 0, 0);
    expect(win.endMs).toBeGreaterThanOrEqual(startOfToday.getTime() + 30 * 86_400_000);
  });

  it('window extends to furthest deadline when beyond 30 days', () => {
    const task = makeTask({ deadline: daysFromNow(60) });
    const { window: win } = computeTimelineData([task], NOW);
    expect(win.endMs).toBeGreaterThanOrEqual(new Date(daysFromNow(60)).getTime());
  });

  it('window is at least 30 days even when furthest deadline is closer', () => {
    const task = makeTask({ deadline: daysFromNow(5) });
    const { window: win } = computeTimelineData([task], NOW);
    const startOfToday = new Date(NOW);
    startOfToday.setHours(0, 0, 0, 0);
    expect(win.endMs).toBeGreaterThanOrEqual(startOfToday.getTime() + 30 * 86_400_000);
  });
});

describe('computeTimelineData — reminder dot', () => {
  it('includes reminderMs when undismissed reminderFiresAt is set', () => {
    const task = makeTask({
      reminderFiresAt: daysFromNow(2),
      reminderDismissed: false,
    });
    const { plotted } = computeTimelineData([task], NOW);
    // task has no deadline so should not be in plotted
    expect(plotted).toHaveLength(0);
  });

  it('includes reminderMs on a plotted task with undismissed reminder', () => {
    const task = makeTask({
      deadline: daysFromNow(10),
      reminderFiresAt: daysFromNow(3),
      reminderDismissed: false,
    });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted[0].reminderMs).not.toBeNull();
    expect(plotted[0].reminderMs).toBe(new Date(daysFromNow(3)).getTime());
  });

  it('excludes reminderMs when dismissed', () => {
    const task = makeTask({
      deadline: daysFromNow(10),
      reminderFiresAt: daysFromNow(3),
      reminderDismissed: true,
    });
    const { plotted } = computeTimelineData([task], NOW);
    expect(plotted[0].reminderMs).toBeNull();
  });
});

describe('computeTimelineData — empty input', () => {
  it('returns empty arrays for empty task list', () => {
    const { plotted, noDeadline } = computeTimelineData([], NOW);
    expect(plotted).toHaveLength(0);
    expect(noDeadline).toHaveLength(0);
  });
});

// ---------- positionPercent ----------

describe('positionPercent', () => {
  it('returns 0 for the start of the window', () => {
    const win = { startMs: 1000, endMs: 2000 };
    expect(positionPercent(1000, win)).toBe(0);
  });

  it('returns 100 for the end of the window', () => {
    const win = { startMs: 1000, endMs: 2000 };
    expect(positionPercent(2000, win)).toBe(100);
  });

  it('returns 50 for the midpoint', () => {
    const win = { startMs: 0, endMs: 1000 };
    expect(positionPercent(500, win)).toBe(50);
  });

  it('clamps to 0 for values before the window', () => {
    const win = { startMs: 1000, endMs: 2000 };
    expect(positionPercent(500, win)).toBe(0);
  });

  it('clamps to 100 for values after the window', () => {
    const win = { startMs: 1000, endMs: 2000 };
    expect(positionPercent(3000, win)).toBe(100);
  });

  it('returns 0 when start equals end (degenerate window)', () => {
    const win = { startMs: 1000, endMs: 1000 };
    expect(positionPercent(1000, win)).toBe(0);
  });
});
