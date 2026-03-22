import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeStandupDigest } from '../lib/standupDigest';
import type { Task } from '../lib/types';

// Fixed "now": 2024-06-05 (Wednesday) at noon UTC
const NOW = new Date('2024-06-05T12:00:00.000Z');

// Helpers to build timestamps relative to NOW
function hoursAgo(n: number): string {
  return new Date(NOW.getTime() - n * 3_600_000).toISOString();
}

function hoursFromNow(n: number): string {
  return new Date(NOW.getTime() + n * 3_600_000).toISOString();
}

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString();
}

function daysFromNow(n: number): string {
  return new Date(NOW.getTime() + n * 86_400_000).toISOString();
}

// Yesterday noon in local time — use a timestamp that is clearly within the
// calendar day before NOW regardless of timezone offset (noon minus 1 day).
function yesterdayNoon(): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - 1);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'TASK-001',
    title: 'Test task',
    description: '',
    status: 'in-progress',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    links: [],
    notes: [],
    screenshots: [],
    relatedTaskIds: [],
    history: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------- workedOnYesterday ----------

describe('computeStandupDigest — workedOnYesterday', () => {
  it('includes a task with a history entry timestamped yesterday', () => {
    const task = makeTask({
      history: [{ id: 'h1', timestamp: yesterdayNoon(), fromStatus: null, toStatus: 'in-progress' }],
    });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(1);
    expect(workedOnYesterday[0].id).toBe('TASK-001');
  });

  it('excludes a task whose only history entry is from today', () => {
    const task = makeTask({
      updatedAt: hoursAgo(1), // updated today — must not trigger the "in-progress since before today" path
      history: [{ id: 'h1', timestamp: hoursAgo(1), fromStatus: null, toStatus: 'in-progress' }],
    });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(0);
  });

  it('excludes a task whose only history entry is from two days ago', () => {
    const task = makeTask({
      updatedAt: hoursAgo(1), // updated today — must not trigger the "in-progress since before today" path
      history: [{ id: 'h1', timestamp: daysAgo(2), fromStatus: null, toStatus: 'in-progress' }],
    });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(0);
  });

  it('includes an in-progress task last updated before today (was active throughout yesterday)', () => {
    const task = makeTask({
      status: 'in-progress',
      updatedAt: daysAgo(2),
      history: [],
    });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(1);
  });

  it('excludes an in-progress task first updated today', () => {
    const task = makeTask({
      status: 'in-progress',
      updatedAt: hoursAgo(1),
      history: [],
    });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(0);
  });

  it('excludes a backburnered task with no yesterday history', () => {
    const task = makeTask({
      status: 'backburnered',
      updatedAt: daysAgo(2),
      history: [],
    });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(0);
  });

  it('includes a completed task that had history activity yesterday', () => {
    const task = makeTask({
      status: 'completed',
      completedAt: yesterdayNoon(),
      history: [{ id: 'h1', timestamp: yesterdayNoon(), fromStatus: 'in-progress', toStatus: 'completed' }],
    });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(1);
  });

  it('returns empty array when no tasks qualify', () => {
    const task = makeTask({ status: 'backburnered', updatedAt: daysAgo(5), history: [] });
    const { workedOnYesterday } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(0);
  });

  it('handles tasks with missing history array (defensive)', () => {
    const task = { ...makeTask(), history: undefined as unknown as [] };
    expect(() => computeStandupDigest([task])).not.toThrow();
  });
});

// ---------- remindersToday ----------

describe('computeStandupDigest — remindersToday', () => {
  it('includes an undismissed reminder firing within today', () => {
    const task = makeTask({
      status: 'waiting-on-response',
      reminderFiresAt: hoursAgo(1),
      reminderDismissed: false,
    });
    const { remindersToday } = computeStandupDigest([task]);
    expect(remindersToday).toHaveLength(1);
  });

  it('includes an overdue reminder (fired in the past, undismissed)', () => {
    const task = makeTask({
      status: 'waiting-on-response',
      reminderFiresAt: daysAgo(1),
      reminderDismissed: false,
    });
    const { remindersToday } = computeStandupDigest([task]);
    expect(remindersToday).toHaveLength(1);
  });

  it('excludes a reminder scheduled for tomorrow', () => {
    const task = makeTask({
      status: 'waiting-on-response',
      reminderFiresAt: daysFromNow(1),
    });
    const { remindersToday } = computeStandupDigest([task]);
    expect(remindersToday).toHaveLength(0);
  });

  it('excludes a dismissed reminder', () => {
    const task = makeTask({
      status: 'waiting-on-response',
      reminderFiresAt: hoursAgo(1),
      reminderDismissed: true,
    });
    const { remindersToday } = computeStandupDigest([task]);
    expect(remindersToday).toHaveLength(0);
  });

  it('excludes completed tasks even with a firing reminder', () => {
    const task = makeTask({
      status: 'completed',
      reminderFiresAt: hoursAgo(1),
      reminderDismissed: false,
    });
    const { remindersToday } = computeStandupDigest([task]);
    expect(remindersToday).toHaveLength(0);
  });

  it('excludes archived tasks even with a firing reminder', () => {
    const task = makeTask({
      status: 'archived',
      reminderFiresAt: hoursAgo(1),
      reminderDismissed: false,
    });
    const { remindersToday } = computeStandupDigest([task]);
    expect(remindersToday).toHaveLength(0);
  });

  it('excludes tasks with no reminderFiresAt', () => {
    const task = makeTask({ status: 'waiting-on-response' });
    const { remindersToday } = computeStandupDigest([task]);
    expect(remindersToday).toHaveLength(0);
  });
});

// ---------- overdue ----------

describe('computeStandupDigest — overdue', () => {
  it('includes an active task with a past deadline', () => {
    const task = makeTask({ status: 'in-progress', deadline: daysAgo(1) });
    const { overdue } = computeStandupDigest([task]);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('TASK-001');
  });

  it('excludes a task with a future deadline', () => {
    const task = makeTask({ status: 'in-progress', deadline: daysFromNow(1) });
    const { overdue } = computeStandupDigest([task]);
    expect(overdue).toHaveLength(0);
  });

  it('excludes a completed task with a past deadline', () => {
    const task = makeTask({ status: 'completed', deadline: daysAgo(1) });
    const { overdue } = computeStandupDigest([task]);
    expect(overdue).toHaveLength(0);
  });

  it('excludes an archived task with a past deadline', () => {
    const task = makeTask({ status: 'archived', deadline: daysAgo(1) });
    const { overdue } = computeStandupDigest([task]);
    expect(overdue).toHaveLength(0);
  });

  it('excludes a task with no deadline', () => {
    const task = makeTask({ status: 'in-progress' });
    const { overdue } = computeStandupDigest([task]);
    expect(overdue).toHaveLength(0);
  });

  it('sorts overdue tasks by deadline ascending (most overdue first)', () => {
    const older = makeTask({ id: 'TASK-001', deadline: daysAgo(5) });
    const newer = makeTask({ id: 'TASK-002', deadline: daysAgo(1) });
    const { overdue } = computeStandupDigest([newer, older]);
    expect(overdue[0].id).toBe('TASK-001');
    expect(overdue[1].id).toBe('TASK-002');
  });
});

// ---------- empty input ----------

describe('computeStandupDigest — empty input', () => {
  it('returns three empty arrays for an empty task list', () => {
    const result = computeStandupDigest([]);
    expect(result.workedOnYesterday).toHaveLength(0);
    expect(result.remindersToday).toHaveLength(0);
    expect(result.overdue).toHaveLength(0);
  });
});

// ---------- cross-section overlap ----------

describe('computeStandupDigest — cross-section overlap', () => {
  it('a task can appear in both workedOnYesterday and overdue', () => {
    const task = makeTask({
      status: 'in-progress',
      deadline: daysAgo(1),
      history: [{ id: 'h1', timestamp: yesterdayNoon(), fromStatus: null, toStatus: 'in-progress' }],
    });
    const { workedOnYesterday, overdue } = computeStandupDigest([task]);
    expect(workedOnYesterday).toHaveLength(1);
    expect(overdue).toHaveLength(1);
  });
});
