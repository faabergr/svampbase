import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeReminderFiresAt,
  formatRelativeTime,
  formatDeadlineRelative,
  isDeadlineSoon,
  isDeadlineOverdue,
  generateTaskId,
  nanoid,
} from '../lib/utils';
import type { Task } from '../lib/types';

// ---------- computeReminderFiresAt ----------

describe('computeReminderFiresAt', () => {
  const base = new Date('2024-01-01T09:00:00.000Z');

  it('adds 4 hours for "4h"', () => {
    const result = computeReminderFiresAt('4h', base);
    expect(result.getTime()).toBe(base.getTime() + 4 * 60 * 60 * 1000);
  });

  it('adds 8 hours for "1bd"', () => {
    const result = computeReminderFiresAt('1bd', base);
    expect(result.getTime()).toBe(base.getTime() + 8 * 60 * 60 * 1000);
  });

  it('adds 40 hours for "5bd"', () => {
    const result = computeReminderFiresAt('5bd', base);
    expect(result.getTime()).toBe(base.getTime() + 40 * 60 * 60 * 1000);
  });
});

// ---------- formatRelativeTime ----------

describe('formatRelativeTime', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns "just now" within 60 seconds', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(formatRelativeTime(new Date(now.getTime() - 30_000).toISOString())).toBe('just now');
  });

  it('returns minutes ago', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString())).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(formatRelativeTime(new Date(now.getTime() - 3 * 3_600_000).toISOString())).toBe('3h ago');
  });

  it('returns days ago', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 86_400_000).toISOString())).toBe('5d ago');
  });
});

// ---------- formatDeadlineRelative ----------

describe('formatDeadlineRelative', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const now = new Date('2024-06-01T12:00:00Z');

  it('returns "Overdue" when deadline has passed', () => {
    vi.setSystemTime(now);
    expect(formatDeadlineRelative(new Date(now.getTime() - 1000).toISOString())).toBe('Overdue');
  });

  it('returns hours remaining', () => {
    vi.setSystemTime(now);
    const deadline = new Date(now.getTime() + 5 * 3_600_000);
    expect(formatDeadlineRelative(deadline.toISOString())).toBe('Due in 5h');
  });

  it('returns "Due tomorrow" for ~24h away', () => {
    vi.setSystemTime(now);
    const deadline = new Date(now.getTime() + 25 * 3_600_000);
    expect(formatDeadlineRelative(deadline.toISOString())).toBe('Due tomorrow');
  });

  it('returns days remaining', () => {
    vi.setSystemTime(now);
    const deadline = new Date(now.getTime() + 7 * 86_400_000);
    expect(formatDeadlineRelative(deadline.toISOString())).toBe('Due in 7d');
  });
});

// ---------- isDeadlineSoon / isDeadlineOverdue ----------

describe('isDeadlineSoon', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns true within 24 hours', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(isDeadlineSoon(new Date(now.getTime() + 3_600_000).toISOString())).toBe(true);
  });

  it('returns false beyond 24 hours', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(isDeadlineSoon(new Date(now.getTime() + 48 * 3_600_000).toISOString())).toBe(false);
  });
});

describe('isDeadlineOverdue', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns true for past deadline', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(isDeadlineOverdue(new Date(now.getTime() - 1000).toISOString())).toBe(true);
  });

  it('returns false for future deadline', () => {
    const now = new Date('2024-06-01T12:00:00Z');
    vi.setSystemTime(now);
    expect(isDeadlineOverdue(new Date(now.getTime() + 1000).toISOString())).toBe(false);
  });
});

// ---------- generateTaskId ----------

describe('generateTaskId', () => {
  it('returns TASK-001 when there are no tasks', () => {
    expect(generateTaskId([])).toBe('TASK-001');
  });

  it('increments from the highest existing ID', () => {
    const tasks = [{ id: 'TASK-005' }, { id: 'TASK-002' }] as Task[];
    expect(generateTaskId(tasks)).toBe('TASK-006');
  });

  it('pads to at least 3 digits', () => {
    const tasks = [{ id: 'TASK-009' }] as Task[];
    expect(generateTaskId(tasks)).toBe('TASK-010');
  });

  it('handles IDs beyond 3 digits', () => {
    const tasks = [{ id: 'TASK-999' }] as Task[];
    expect(generateTaskId(tasks)).toBe('TASK-1000');
  });

  it('ignores non-standard IDs', () => {
    const tasks = [{ id: 'OTHER-001' }] as Task[];
    expect(generateTaskId(tasks)).toBe('TASK-001');
  });
});

// ---------- nanoid ----------

describe('nanoid', () => {
  it('generates a non-empty string', () => {
    expect(nanoid().length).toBeGreaterThan(0);
  });

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => nanoid()));
    expect(ids.size).toBe(100);
  });
});
