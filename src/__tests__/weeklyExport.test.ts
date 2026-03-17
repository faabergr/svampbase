import { describe, it, expect } from 'vitest';
import { generateWeeklySummary } from '../lib/weeklyExport';
import type { Task, JournalEntry } from '../lib/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'TASK-001',
    title: 'Test task',
    description: '',
    status: 'in-progress',
    createdAt: now,
    updatedAt: now,
    links: [],
    notes: [],
    screenshots: [],
    relatedTaskIds: [],
    history: [],
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

// ---------- empty state ----------

describe('generateWeeklySummary — empty', () => {
  it('returns a no-activity message when there are no tasks', () => {
    const result = generateWeeklySummary([]);
    expect(result).toContain('No activity in this period.');
  });
});

// ---------- completed tasks ----------

describe('generateWeeklySummary — completed tasks', () => {
  it('includes tasks completed within the window', () => {
    const task = makeTask({ status: 'completed', completedAt: daysAgo(2), id: 'TASK-001', title: 'Finished thing' });
    const result = generateWeeklySummary([task]);
    expect(result).toContain('Completed');
    expect(result).toContain('TASK-001');
    expect(result).toContain('Finished thing');
  });

  it('excludes tasks completed before the window', () => {
    const task = makeTask({ status: 'completed', completedAt: daysAgo(10) });
    const result = generateWeeklySummary([task], 7);
    expect(result).toContain('No activity in this period.');
  });

  it('includes task description when present', () => {
    const task = makeTask({
      status: 'completed',
      completedAt: daysAgo(1),
      description: 'Important context here',
    });
    const result = generateWeeklySummary([task]);
    expect(result).toContain('Important context here');
  });

  it('includes links in the output', () => {
    const task = makeTask({
      status: 'completed',
      completedAt: daysAgo(1),
      links: [{ id: '1', type: 'url', url: 'https://example.com', label: 'Example' }],
    });
    const result = generateWeeklySummary([task]);
    expect(result).toContain('[Example](https://example.com)');
  });

  it('includes notes in the output', () => {
    const task = makeTask({
      status: 'completed',
      completedAt: daysAgo(1),
      notes: [{ id: '1', content: 'A quick note', createdAt: daysAgo(1) }],
    });
    const result = generateWeeklySummary([task]);
    expect(result).toContain('A quick note');
  });

  it('shows status journey when multiple history entries exist', () => {
    const task = makeTask({
      status: 'completed',
      completedAt: daysAgo(1),
      history: [
        { id: '1', timestamp: daysAgo(5), fromStatus: null, toStatus: 'in-progress' },
        { id: '2', timestamp: daysAgo(3), fromStatus: 'in-progress', toStatus: 'waiting-on-response' },
        { id: '3', timestamp: daysAgo(1), fromStatus: 'waiting-on-response', toStatus: 'completed' },
      ],
    });
    const result = generateWeeklySummary([task]);
    expect(result).toContain('Journey:');
    expect(result).toContain('Waiting on Response');
    expect(result).toContain('Completed');
  });
});

// ---------- archived tasks ----------

describe('generateWeeklySummary — archived tasks', () => {
  it('includes tasks archived within the window', () => {
    const task = makeTask({ status: 'archived', archivedAt: daysAgo(1), title: 'Dropped thing' });
    const result = generateWeeklySummary([task]);
    expect(result).toContain('Archived');
    expect(result).toContain('Dropped thing');
  });

  it('excludes tasks archived outside the window', () => {
    const task = makeTask({ status: 'archived', archivedAt: daysAgo(14) });
    const result = generateWeeklySummary([task], 7);
    expect(result).toContain('No activity in this period.');
  });
});

// ---------- in-flight tasks ----------

describe('generateWeeklySummary — in-flight tasks', () => {
  it('includes active tasks updated within the window', () => {
    const task = makeTask({ status: 'in-progress', updatedAt: daysAgo(1), title: 'Ongoing work' });
    const result = generateWeeklySummary([task]);
    expect(result).toContain('Still in flight');
    expect(result).toContain('Ongoing work');
    expect(result).toContain('In Progress');
  });

  it('excludes active tasks not updated within the window', () => {
    const task = makeTask({ status: 'in-progress', updatedAt: daysAgo(14) });
    const result = generateWeeklySummary([task], 7);
    expect(result).toContain('No activity in this period.');
  });
});

// ---------- custom window ----------

describe('generateWeeklySummary — custom days window', () => {
  it('respects a shorter window', () => {
    const recent = makeTask({ status: 'completed', completedAt: daysAgo(2), id: 'TASK-001', title: 'Recent' });
    const old = makeTask({ status: 'completed', completedAt: daysAgo(10), id: 'TASK-002', title: 'Old' });
    const result = generateWeeklySummary([recent, old], 7);
    expect(result).toContain('Recent');
    expect(result).not.toContain('Old');
  });

  it('respects a longer window', () => {
    const task = makeTask({ status: 'completed', completedAt: daysAgo(10), title: 'Older task' });
    const result = generateWeeklySummary([task], 14);
    expect(result).toContain('Older task');
  });
});

// ---------- journal entries ----------

describe('generateWeeklySummary — journal entries', () => {
  function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
    return {
      id: 'e1',
      content: 'Reflection text',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      ...overrides,
    };
  }

  it('includes journal entries within the window', () => {
    const result = generateWeeklySummary([], 7, [makeEntry()]);
    expect(result).toContain('Journal');
    expect(result).toContain('Reflection text');
  });

  it('excludes journal entries outside the window', () => {
    const entry = makeEntry({ createdAt: daysAgo(10), updatedAt: daysAgo(10) });
    const result = generateWeeklySummary([], 7, [entry]);
    expect(result).toContain('No activity in this period.');
  });

  it('sorts journal entries chronologically', () => {
    const earlier = makeEntry({ id: 'e1', content: 'First entry', createdAt: daysAgo(3), updatedAt: daysAgo(3) });
    const later = makeEntry({ id: 'e2', content: 'Second entry', createdAt: daysAgo(1), updatedAt: daysAgo(1) });
    const result = generateWeeklySummary([], 7, [later, earlier]);
    const firstIdx = result.indexOf('First entry');
    const secondIdx = result.indexOf('Second entry');
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it('includes future entries in the export alongside tasks', () => {
    const task = makeTask({ status: 'completed', completedAt: daysAgo(1), title: 'Done task' });
    const entry = makeEntry({ content: 'Great week' });
    const result = generateWeeklySummary([task], 7, [entry]);
    expect(result).toContain('Done task');
    expect(result).toContain('Great week');
  });
});
