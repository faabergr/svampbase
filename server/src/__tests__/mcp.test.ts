import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StoredTask } from '../tasks';
import type { StoredJournalEntry } from '../journal';
import type { Session } from '../types';

// Capture tool handlers registered via server.tool()
type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;
const toolHandlers: Record<string, ToolHandler> = {};

const mockServer = {
  tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: ToolHandler) => {
    toolHandlers[name] = handler;
  }),
  connect: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(() => mockServer),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(() => ({})),
}));

// --- mock tasks ---
const mockTaskStore = vi.hoisted(() => new Map<string, StoredTask>());
let mockNextTaskId = vi.hoisted(() => ({ value: 'TASK-001' }));

vi.mock('../tasks', () => ({
  getAllTasks: vi.fn(() => Array.from(mockTaskStore.values())),
  getTask: vi.fn((id: string) => mockTaskStore.get(id)),
  upsertTask: vi.fn((t: StoredTask) => { mockTaskStore.set(t.id, t); return t; }),
  generateTaskId: vi.fn(() => mockNextTaskId.value),
}));

// --- mock sessions ---
const mockSessionStore = vi.hoisted(() => new Map<string, Session>());

vi.mock('../sessions', () => ({
  getAllSessions: vi.fn(() => Array.from(mockSessionStore.values())),
  getSession: vi.fn((id: string) => mockSessionStore.get(id)),
}));

// --- mock journal ---
const mockJournalStore = vi.hoisted(() => new Map<string, StoredJournalEntry>());

vi.mock('../journal', () => ({
  getAllEntries: vi.fn(() => Array.from(mockJournalStore.values())),
  upsertEntry: vi.fn((e: StoredJournalEntry) => { mockJournalStore.set(e.id, e); return e; }),
}));

// Import mcp.ts — this registers all tool handlers as a side effect
await import('../mcp');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeTask(id: string, overrides: Partial<StoredTask> = {}): StoredTask {
  return { id, title: `Task ${id}`, status: 'in-progress', notes: [], history: [], ...overrides };
}

function makeSession(id: string, overrides: Partial<Session> = {}): Session {
  const now = new Date().toISOString();
  return { id, name: 'Test', status: 'active', taskIds: [], folderPath: '/tmp/s', createdAt: now, updatedAt: now, ...overrides };
}

function makeEntry(id: string, overrides: Partial<StoredJournalEntry> = {}): StoredJournalEntry {
  const now = new Date().toISOString();
  return { id, content: 'Entry content', createdAt: now, updatedAt: now, ...overrides };
}

function parseResult(result: { content: { type: string; text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

beforeEach(() => {
  mockTaskStore.clear();
  mockSessionStore.clear();
  mockJournalStore.clear();
  vi.clearAllMocks();
});

// ─── list_tasks ──────────────────────────────────────────────────────────────

describe('list_tasks', () => {
  it('returns all tasks when no status filter', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'in-progress' }));
    mockTaskStore.set('TASK-002', makeTask('TASK-002', { status: 'completed' }));

    const result = await toolHandlers['list_tasks']({});
    const tasks = parseResult(result);
    expect(tasks).toHaveLength(2);
  });

  it('filters tasks by status', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'in-progress' }));
    mockTaskStore.set('TASK-002', makeTask('TASK-002', { status: 'completed' }));

    const result = await toolHandlers['list_tasks']({ status: 'in-progress' });
    const tasks = parseResult(result);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('TASK-001');
  });

  it('returns empty array when no tasks match filter', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'in-progress' }));

    const result = await toolHandlers['list_tasks']({ status: 'completed' });
    expect(parseResult(result)).toEqual([]);
  });
});

// ─── get_task ────────────────────────────────────────────────────────────────

describe('get_task', () => {
  it('returns the task as JSON when found', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001'));

    const result = await toolHandlers['get_task']({ id: 'TASK-001' });
    expect(result.isError).toBeFalsy();
    expect(parseResult(result).id).toBe('TASK-001');
  });

  it('returns isError when task not found', async () => {
    const result = await toolHandlers['get_task']({ id: 'TASK-999' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('TASK-999');
  });
});

// ─── create_task ─────────────────────────────────────────────────────────────

describe('create_task', () => {
  beforeEach(() => {
    mockNextTaskId.value = 'TASK-001';
  });

  it('creates a task with default in-progress status', async () => {
    const result = await toolHandlers['create_task']({ title: 'My Task' });
    const task = parseResult(result);

    expect(task.title).toBe('My Task');
    expect(task.status).toBe('in-progress');
    expect(task.id).toBe('TASK-001');
  });

  it('creates a task with custom status and description', async () => {
    const result = await toolHandlers['create_task']({ title: 'Backlogged', status: 'backburnered', description: 'Low priority' });
    const task = parseResult(result);

    expect(task.status).toBe('backburnered');
    expect(task.description).toBe('Low priority');
  });

  it('includes deadline when provided', async () => {
    const result = await toolHandlers['create_task']({ title: 'Due soon', deadline: '2024-07-01' });
    expect(parseResult(result).deadline).toBe('2024-07-01');
  });

  it('initializes with empty links, notes, screenshots, relatedTaskIds', async () => {
    const result = await toolHandlers['create_task']({ title: 'Clean task' });
    const task = parseResult(result);

    expect(task.links).toEqual([]);
    expect(task.notes).toEqual([]);
    expect(task.screenshots).toEqual([]);
    expect(task.relatedTaskIds).toEqual([]);
  });

  it('adds an initial history entry with null fromStatus', async () => {
    const result = await toolHandlers['create_task']({ title: 'New task' });
    const task = parseResult(result);

    expect(task.history).toHaveLength(1);
    expect(task.history[0].fromStatus).toBeNull();
    expect(task.history[0].toStatus).toBe('in-progress');
  });
});

// ─── update_task_status ───────────────────────────────────────────────────────

describe('update_task_status', () => {
  it('returns isError when task not found', async () => {
    const result = await toolHandlers['update_task_status']({ id: 'TASK-999', status: 'completed' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('TASK-999');
  });

  it('updates the task status and appends a history entry', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'in-progress' }));

    const result = await toolHandlers['update_task_status']({ id: 'TASK-001', status: 'completed' });
    const updated = parseResult(result);

    expect(updated.status).toBe('completed');
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0].fromStatus).toBe('in-progress');
    expect(updated.history[0].toStatus).toBe('completed');
  });

  it('sets completedAt when status becomes completed', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'in-progress' }));

    const result = await toolHandlers['update_task_status']({ id: 'TASK-001', status: 'completed' });
    const updated = parseResult(result);

    expect(updated.completedAt).toBeDefined();
  });

  it('sets archivedAt when status becomes archived', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'completed' }));

    const result = await toolHandlers['update_task_status']({ id: 'TASK-001', status: 'archived' });
    const updated = parseResult(result);

    expect(updated.archivedAt).toBeDefined();
  });

  it('does not set completedAt or archivedAt for other statuses', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'in-progress' }));

    const result = await toolHandlers['update_task_status']({ id: 'TASK-001', status: 'backburnered' });
    const updated = parseResult(result);

    expect(updated.completedAt).toBeUndefined();
    expect(updated.archivedAt).toBeUndefined();
  });

  it('includes note in history entry when provided', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { status: 'in-progress' }));

    const result = await toolHandlers['update_task_status']({ id: 'TASK-001', status: 'waiting-on-response', note: 'Waiting for review' });
    const updated = parseResult(result);

    expect(updated.history[0].note).toBe('Waiting for review');
  });

  it('preserves existing history entries', async () => {
    const existingHistory = [{ id: 'h1', timestamp: new Date().toISOString(), fromStatus: null, toStatus: 'in-progress' }];
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { history: existingHistory }));

    const result = await toolHandlers['update_task_status']({ id: 'TASK-001', status: 'completed' });
    const updated = parseResult(result);

    expect(updated.history).toHaveLength(2);
    expect(updated.history[0].id).toBe('h1');
  });
});

// ─── add_task_note ────────────────────────────────────────────────────────────

describe('add_task_note', () => {
  it('returns isError when task not found', async () => {
    const result = await toolHandlers['add_task_note']({ id: 'TASK-999', content: 'hello' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('TASK-999');
  });

  it('appends a note and returns the note object', async () => {
    mockTaskStore.set('TASK-001', makeTask('TASK-001'));

    const result = await toolHandlers['add_task_note']({ id: 'TASK-001', content: 'My note' });
    const note = parseResult(result);

    expect(note.content).toBe('My note');
    expect(note.id).toBeDefined();
    expect(note.createdAt).toBeDefined();
  });

  it('appends to existing notes without overwriting them', async () => {
    const existingNotes = [{ id: 'n1', content: 'First', createdAt: new Date().toISOString() }];
    mockTaskStore.set('TASK-001', makeTask('TASK-001', { notes: existingNotes }));

    await toolHandlers['add_task_note']({ id: 'TASK-001', content: 'Second' });

    const storedTask = mockTaskStore.get('TASK-001')!;
    expect((storedTask.notes as unknown[]).length).toBe(2);
  });
});

// ─── list_sessions ────────────────────────────────────────────────────────────

describe('list_sessions', () => {
  it('excludes ended sessions by default', async () => {
    mockSessionStore.set('s1', makeSession('s1', { status: 'active' }));
    mockSessionStore.set('s2', makeSession('s2', { status: 'paused' }));
    mockSessionStore.set('s3', makeSession('s3', { status: 'ended' }));

    const result = await toolHandlers['list_sessions']({});
    const sessions = parseResult(result);

    expect(sessions).toHaveLength(2);
    expect(sessions.every((s: Session) => s.status !== 'ended')).toBe(true);
  });

  it('includes ended sessions when includeEnded is true', async () => {
    mockSessionStore.set('s1', makeSession('s1', { status: 'active' }));
    mockSessionStore.set('s2', makeSession('s2', { status: 'ended' }));

    const result = await toolHandlers['list_sessions']({ includeEnded: true });
    const sessions = parseResult(result);

    expect(sessions).toHaveLength(2);
  });

  it('returns empty array when no sessions exist', async () => {
    const result = await toolHandlers['list_sessions']({});
    expect(parseResult(result)).toEqual([]);
  });
});

// ─── get_session ──────────────────────────────────────────────────────────────

describe('get_session', () => {
  it('returns the session as JSON when found', async () => {
    mockSessionStore.set('s1', makeSession('s1'));

    const result = await toolHandlers['get_session']({ id: 's1' });
    expect(result.isError).toBeFalsy();
    expect(parseResult(result).id).toBe('s1');
  });

  it('returns isError when session not found', async () => {
    const result = await toolHandlers['get_session']({ id: 'ghost' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('ghost');
  });
});

// ─── list_journal_entries ─────────────────────────────────────────────────────

describe('list_journal_entries', () => {
  it('returns entries sorted by most recent first', async () => {
    mockJournalStore.set('e1', makeEntry('e1', { createdAt: '2024-01-01T00:00:00.000Z' }));
    mockJournalStore.set('e2', makeEntry('e2', { createdAt: '2024-03-01T00:00:00.000Z' }));
    mockJournalStore.set('e3', makeEntry('e3', { createdAt: '2024-02-01T00:00:00.000Z' }));

    const result = await toolHandlers['list_journal_entries']({});
    const entries = parseResult(result);

    expect(entries[0].id).toBe('e2');
    expect(entries[1].id).toBe('e3');
    expect(entries[2].id).toBe('e1');
  });

  it('defaults to 20 entries', async () => {
    for (let i = 0; i < 25; i++) {
      const id = `e${String(i).padStart(2, '0')}`;
      mockJournalStore.set(id, makeEntry(id, { createdAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` }));
    }

    const result = await toolHandlers['list_journal_entries']({});
    expect(parseResult(result)).toHaveLength(20);
  });

  it('respects the limit parameter', async () => {
    for (let i = 0; i < 10; i++) {
      const id = `e${i}`;
      mockJournalStore.set(id, makeEntry(id));
    }

    const result = await toolHandlers['list_journal_entries']({ limit: 3 });
    expect(parseResult(result)).toHaveLength(3);
  });

  it('returns empty array when no entries exist', async () => {
    const result = await toolHandlers['list_journal_entries']({});
    expect(parseResult(result)).toEqual([]);
  });
});

// ─── create_journal_entry ─────────────────────────────────────────────────────

describe('create_journal_entry', () => {
  it('creates an entry with trimmed content', async () => {
    const result = await toolHandlers['create_journal_entry']({ content: '  hello world  ' });
    const entry = parseResult(result);

    expect(entry.content).toBe('hello world');
    expect(entry.id).toBeDefined();
    expect(entry.createdAt).toBeDefined();
  });

  it('persists the entry via upsertEntry', async () => {
    const { upsertEntry } = await import('../journal');
    await toolHandlers['create_journal_entry']({ content: 'saved entry' });
    expect(upsertEntry).toHaveBeenCalledOnce();
  });
});
