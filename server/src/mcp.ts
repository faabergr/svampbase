import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getAllTasks, getTask, upsertTask, generateTaskId } from './tasks';
import { getAllSessions, getSession } from './sessions';
import { getAllEntries, upsertEntry } from './journal';

const TASK_STATUSES = [
  'in-progress',
  'waiting-on-dependency',
  'waiting-on-response',
  'backburnered',
  'completed',
  'archived',
] as const;

const server = new McpServer({ name: 'svampbase', version: '0.1.0' });

// ── Tasks ──────────────────────────────────────────────────────────────────

server.tool(
  'list_tasks',
  'List tasks. Optionally filter by status.',
  { status: z.enum(TASK_STATUSES).optional().describe('Filter by status') },
  async ({ status }) => {
    let tasks = getAllTasks();
    if (status) tasks = tasks.filter((t) => t.status === status);
    return { content: [{ type: 'text' as const, text: JSON.stringify(tasks, null, 2) }] };
  },
);

server.tool(
  'get_task',
  'Get a single task by ID, including full history and notes.',
  { id: z.string().describe('Task ID, e.g. TASK-001') },
  async ({ id }) => {
    const task = getTask(id);
    if (!task) return { content: [{ type: 'text' as const, text: `Task ${id} not found` }], isError: true };
    return { content: [{ type: 'text' as const, text: JSON.stringify(task, null, 2) }] };
  },
);

server.tool(
  'create_task',
  'Create a new task.',
  {
    title: z.string().describe('Task title (required)'),
    description: z.string().optional().describe('Task description'),
    status: z.enum(TASK_STATUSES).optional().describe('Initial status (default: in-progress)'),
    deadline: z.string().optional().describe('Deadline as ISO date string, e.g. 2024-07-01'),
  },
  async ({ title, description, status, deadline }) => {
    const now = new Date().toISOString();
    const initialStatus = status ?? 'in-progress';
    const id = generateTaskId();
    const task = {
      id,
      title,
      description: description ?? '',
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      links: [],
      notes: [],
      screenshots: [],
      relatedTaskIds: [],
      history: [{ id: crypto.randomUUID(), timestamp: now, fromStatus: null, toStatus: initialStatus }],
      ...(deadline && { deadline }),
    };
    upsertTask(task);
    return { content: [{ type: 'text' as const, text: JSON.stringify(task, null, 2) }] };
  },
);

server.tool(
  'update_task_status',
  "Change a task's status and append a history entry.",
  {
    id: z.string().describe('Task ID'),
    status: z.enum(TASK_STATUSES).describe('New status'),
    note: z.string().optional().describe('Optional note explaining the status change'),
  },
  async ({ id, status, note }) => {
    const task = getTask(id);
    if (!task) return { content: [{ type: 'text' as const, text: `Task ${id} not found` }], isError: true };

    const now = new Date().toISOString();
    const historyEntry = {
      id: crypto.randomUUID(),
      timestamp: now,
      fromStatus: (task.status as string) ?? null,
      toStatus: status,
      ...(note && { note }),
    };

    const updated = {
      ...task,
      status,
      history: [...(Array.isArray(task.history) ? task.history : []), historyEntry],
      updatedAt: now,
      ...(status === 'completed' && { completedAt: now }),
      ...(status === 'archived' && { archivedAt: now }),
    };
    upsertTask(updated);
    return { content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }] };
  },
);

server.tool(
  'add_task_note',
  'Append a note to a task.',
  {
    id: z.string().describe('Task ID'),
    content: z.string().describe('Note content'),
  },
  async ({ id, content }) => {
    const task = getTask(id);
    if (!task) return { content: [{ type: 'text' as const, text: `Task ${id} not found` }], isError: true };

    const now = new Date().toISOString();
    const note = { id: crypto.randomUUID(), content, createdAt: now };
    const updated = {
      ...task,
      notes: [...(Array.isArray(task.notes) ? task.notes : []), note],
      updatedAt: now,
    };
    upsertTask(updated);
    return { content: [{ type: 'text' as const, text: JSON.stringify(note, null, 2) }] };
  },
);

// ── Sessions ────────────────────────────────────────────────────────────────

server.tool(
  'list_sessions',
  'List sessions. By default returns active and paused sessions only.',
  { includeEnded: z.boolean().optional().describe('Include ended sessions (default: false)') },
  async ({ includeEnded }) => {
    let sessions = getAllSessions();
    if (!includeEnded) sessions = sessions.filter((s) => s.status !== 'ended');
    return { content: [{ type: 'text' as const, text: JSON.stringify(sessions, null, 2) }] };
  },
);

server.tool(
  'get_session',
  'Get a single session by ID.',
  { id: z.string().describe('Session UUID') },
  async ({ id }) => {
    const session = getSession(id);
    if (!session) return { content: [{ type: 'text' as const, text: `Session ${id} not found` }], isError: true };
    return { content: [{ type: 'text' as const, text: JSON.stringify(session, null, 2) }] };
  },
);

// ── Journal ─────────────────────────────────────────────────────────────────

server.tool(
  'list_journal_entries',
  'List journal entries, most recent first.',
  { limit: z.number().int().min(1).max(100).optional().describe('Max entries to return (default: 20)') },
  async ({ limit = 20 }) => {
    const entries = getAllEntries()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
    return { content: [{ type: 'text' as const, text: JSON.stringify(entries, null, 2) }] };
  },
);

server.tool(
  'create_journal_entry',
  'Write a new journal entry.',
  { content: z.string().describe('Entry content') },
  async ({ content }) => {
    const now = new Date().toISOString();
    const entry = { id: crypto.randomUUID(), content: content.trim(), createdAt: now, updatedAt: now };
    upsertEntry(entry);
    return { content: [{ type: 'text' as const, text: JSON.stringify(entry, null, 2) }] };
  },
);

// ── Bootstrap ────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport).catch((err: unknown) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
