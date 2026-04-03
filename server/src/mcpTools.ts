import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getAllTasks, getTask, upsertTask, generateTaskId } from './tasks';
import { getAllSessions, getSession, upsertSession, createSessionFolder } from './sessions';
import { getAllEntries, upsertEntry } from './journal';
import { getFocus, setFocus, clearFocus } from './focus';
import fs from 'fs';
import path from 'path';

const TASK_STATUSES = [
  'in-progress',
  'waiting-on-dependency',
  'waiting-on-response',
  'backburnered',
  'completed',
  'archived',
] as const;

export function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function registerMcpTools(server: McpServer): void {
  // ── Tasks ──────────────────────────────────────────────────────────────────

  server.tool(
    'list_tasks',
    'List tasks. Optionally filter by status.',
    { status: z.enum(TASK_STATUSES).optional().describe('Filter by status') },
    async ({ status }) => {
      try {
        let tasks = getAllTasks();
        if (status) tasks = tasks.filter((t) => t.status === status);
        return { content: [{ type: 'text' as const, text: JSON.stringify(tasks, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_task',
    'Get a single task by ID, including full history and notes.',
    { id: z.string().describe('Task ID, e.g. TASK-001') },
    async ({ id }) => {
      try {
        const task = getTask(id);
        if (!task) return { content: [{ type: 'text' as const, text: `Task ${id} not found` }], isError: true };
        return { content: [{ type: 'text' as const, text: JSON.stringify(task, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
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
      try {
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
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
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
      try {
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
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
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
      try {
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
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  // ── Sessions ────────────────────────────────────────────────────────────────

  server.tool(
    'list_sessions',
    'List sessions. By default returns active and paused sessions only.',
    { includeEnded: z.boolean().optional().describe('Include ended sessions (default: false)') },
    async ({ includeEnded }) => {
      try {
        let sessions = getAllSessions();
        if (!includeEnded) sessions = sessions.filter((s) => s.status !== 'ended');
        return { content: [{ type: 'text' as const, text: JSON.stringify(sessions, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_session',
    'Get a single session by ID.',
    { id: z.string().describe('Session UUID') },
    async ({ id }) => {
      try {
        const session = getSession(id);
        if (!session) return { content: [{ type: 'text' as const, text: `Session ${id} not found` }], isError: true };
        return { content: [{ type: 'text' as const, text: JSON.stringify(session, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  // ── Journal ─────────────────────────────────────────────────────────────────

  server.tool(
    'list_journal_entries',
    'List journal entries, most recent first.',
    { limit: z.number().int().min(1).max(100).optional().describe('Max entries to return (default: 20)') },
    async ({ limit = 20 }) => {
      try {
        const entries = getAllEntries()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit);
        return { content: [{ type: 'text' as const, text: JSON.stringify(entries, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'create_journal_entry',
    'Write a new journal entry.',
    { content: z.string().describe('Entry content') },
    async ({ content }) => {
      try {
        const now = new Date().toISOString();
        const entry = { id: crypto.randomUUID(), content: content.trim(), createdAt: now, updatedAt: now };
        upsertEntry(entry);
        return { content: [{ type: 'text' as const, text: JSON.stringify(entry, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  // ── Focus ────────────────────────────────────────────────────────────────────

  server.tool(
    'get_focus',
    'Get the currently focused task, including full task details and workspace path. Call this at the start of every conversation to understand what you should be working on.',
    {},
    async () => {
      try {
        const focus = getFocus();
        const task = focus.taskId ? getTask(focus.taskId) : null;
        const sessionId = task?.sessionId as string | undefined;
        const session = sessionId ? getSession(sessionId) : undefined;
        const workspacePath = session?.folderPath ?? null;
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ taskId: focus.taskId, task: task ?? null, workspacePath }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'set_focus',
    "Set the focused task. Use this when starting work on a specific task. Returns the task and its workspace path.",
    { taskId: z.string().describe('Task ID to focus on, e.g. TASK-001') },
    async ({ taskId }) => {
      try {
        const task = getTask(taskId);
        if (!task) return { content: [{ type: 'text' as const, text: `Task ${taskId} not found` }], isError: true };
        setFocus(taskId);
        const sessionId = task.sessionId as string | undefined;
        const session = sessionId ? getSession(sessionId) : undefined;
        const workspacePath = session?.folderPath ?? null;
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ taskId, task, workspacePath }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'clear_focus',
    'Clear the current focus. Use this when done with the focused task or switching contexts.',
    {},
    async () => {
      try {
        clearFocus();
        return { content: [{ type: 'text' as const, text: 'Focus cleared.' }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );

  server.tool(
    'get_workspace_path',
    'Get (or lazily create) the workspace folder path for a task. Use this to know where to put files for a task. Creates a session and folder if none exists yet.',
    { taskId: z.string().describe('Task ID, e.g. TASK-001') },
    async ({ taskId }) => {
      try {
        const task = getTask(taskId);
        if (!task) return { content: [{ type: 'text' as const, text: `Task ${taskId} not found` }], isError: true };

        const existingSessionId = task.sessionId as string | undefined;
        if (existingSessionId) {
          const existing = getSession(existingSessionId);
          if (existing) {
            return { content: [{ type: 'text' as const, text: JSON.stringify({ taskId, workspacePath: existing.folderPath }, null, 2) }] };
          }
        }

        // Lazily provision session + folder
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        const taskTitle = String(task.title ?? '');
        const safeName = taskTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const sessionName = safeName
          ? `${safeName}-${taskId.toLowerCase()}-${id.slice(0, 8)}`
          : `${taskId.toLowerCase()}-${id.slice(0, 8)}`;
        const folderPath = createSessionFolder(id, sessionName);

        const session = { id, name: sessionName, status: 'active' as const, taskIds: [taskId], folderPath, createdAt: now, updatedAt: now };
        upsertSession(session);

        // Write CLAUDE.md
        const description = String(task.description ?? '').trim();
        const claudeLines = [
          `# Task: ${taskTitle} (${taskId})`,
          '',
          ...(description ? [description, ''] : []),
          '---',
          '',
          'At the start of every conversation in this folder, call the `get_focus` MCP tool',
          'to retrieve the current task status, history, and notes before doing any work.',
        ];
        fs.writeFileSync(path.join(folderPath, 'CLAUDE.md'), claudeLines.join('\n'), 'utf-8');

        upsertTask({ ...task, sessionId: id, updatedAt: now });

        return { content: [{ type: 'text' as const, text: JSON.stringify({ taskId, workspacePath: folderPath }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Error: ${errMsg(err)}` }], isError: true };
      }
    },
  );
}
