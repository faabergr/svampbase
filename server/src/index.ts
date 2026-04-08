import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import multer from 'multer';
import { getAllSessions, getSession, upsertSession, deleteSession, createSessionFolder, SESSIONS_FOLDER } from './sessions';
import { getAllTasks, getTask, upsertTask, deleteTask as deleteTaskStore, replaceAllTasks, generateTaskId } from './tasks';
import { getAllEntries, getEntry, upsertEntry, deleteEntry } from './journal';
import { getFocus, setFocus, clearFocus } from './focus';
import { launchNewSession, resumeSession } from './terminal';
import type { Session, SessionStatus, SessionFile } from './types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerMcpTools, errMsg } from './mcpTools';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Serve session files statically
app.use('/session-files', express.static(SESSIONS_FOLDER));

function randomChars(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// --- Sessions ---

app.get('/sessions', (_req, res) => {
  res.json(getAllSessions());
});

app.post('/sessions', (req, res) => {
  const { name, taskIds, notes, launch } = req.body as {
    name?: string;
    taskIds?: string[];
    notes?: string;
    launch?: boolean;
  };

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const sessionName = name?.trim() || `svampbase-${randomChars(8)}`;
  const folderPath = createSessionFolder(id, sessionName);

  const session: Session = {
    id,
    name: sessionName,
    status: 'active',
    taskIds: taskIds ?? [],
    folderPath,
    createdAt: now,
    updatedAt: now,
    notes,
  };

  upsertSession(session);

  if (launch) {
    try {
      launchNewSession(session.id, session.folderPath);
      session.lastLaunchedAt = new Date().toISOString();
      upsertSession(session);
    } catch (err) {
      console.error('Terminal launch failed:', err);
    }
  }

  res.status(201).json(session);
});

app.get('/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  res.json(session);
});

app.patch('/sessions/:id', (req, res) => {
  const existing = getSession(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Session not found' }); return; }

  const { status, taskIds, notes, name } = req.body as {
    status?: SessionStatus;
    taskIds?: string[];
    notes?: string;
    name?: string;
  };

  const updated: Session = {
    ...existing,
    ...(status !== undefined && { status }),
    ...(taskIds !== undefined && { taskIds }),
    ...(notes !== undefined && { notes }),
    ...(name !== undefined && { name }),
    updatedAt: new Date().toISOString(),
  };

  upsertSession(updated);
  res.json(updated);
});

app.post('/sessions/:id/reveal', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
  const folderPath = session.folderPath;
  if (!folderPath || !fs.existsSync(folderPath)) {
    res.status(404).json({ error: 'Session folder not found' }); return;
  }
  execFileSync('open', [folderPath]);
  res.status(204).send();
});

app.delete('/sessions/:id', (req, res) => {
  const deleted = deleteSession(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Session not found' }); return; }
  res.status(204).send();
});

app.post('/sessions/:id/launch', (req, res) => {
  let session = getSession(req.params.id);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  // Backfill folderPath for sessions created before this feature
  const folderPath = session.folderPath || createSessionFolder(session.id);
  if (!session.folderPath) {
    session = { ...session, folderPath };
    upsertSession(session);
  } else if (!fs.existsSync(session.folderPath)) {
    fs.mkdirSync(session.folderPath, { recursive: true });
  }

  const isFirstLaunch = !session.lastLaunchedAt;
  const now = new Date().toISOString();

  try {
    if (isFirstLaunch) {
      launchNewSession(session.id, session.folderPath);
    } else {
      resumeSession(session.id, session.folderPath);
    }
  } catch (err) {
    console.error('Terminal launch failed:', err);
    res.status(500).json({ error: String(err) });
    return;
  }

  const updated: Session = { ...session, status: 'active', lastLaunchedAt: now, updatedAt: now };
  upsertSession(updated);
  res.json(updated);
});

// --- Files ---

function getSessionUploadDir(sessionId: string): string | null {
  const session = getSession(sessionId);
  if (!session) return null;
  // Backfill folderPath for sessions created before this feature
  const folderPath = session.folderPath || createSessionFolder(sessionId);
  if (!session.folderPath) {
    upsertSession({ ...session, folderPath, updatedAt: new Date().toISOString() });
  } else if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  return folderPath;
}

function multerStorageFor(sessionId: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = getSessionUploadDir(sessionId);
      if (!dir) return cb(new Error('Session not found'), '');
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      // Preserve original filename, avoid path traversal
      const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._\-]/g, '_');
      cb(null, safe);
    },
  });
}

// GET /sessions/:id/files
app.get('/sessions/:id/files', (req, res) => {
  const dir = getSessionUploadDir(req.params.id);
  if (!dir) { res.status(404).json({ error: 'Session not found' }); return; }

  const entries = fs.readdirSync(dir).map((name): SessionFile => {
    const stat = fs.statSync(path.join(dir, name));
    return { name, size: stat.size, uploadedAt: stat.mtime.toISOString() };
  });

  res.json(entries);
});

// POST /sessions/:id/files
app.post('/sessions/:id/files', (req, res) => {
  const upload = multer({ storage: multerStorageFor(req.params.id) }).array('files');
  upload(req, res, (err) => {
    if (err) { res.status(500).json({ error: String(err) }); return; }
    const files = (req.files as Express.Multer.File[]) ?? [];
    const result: SessionFile[] = files.map((f) => ({
      name: f.filename,
      size: f.size,
      uploadedAt: new Date().toISOString(),
    }));
    res.status(201).json(result);
  });
});

// DELETE /sessions/:id/files/:filename
app.delete('/sessions/:id/files/:filename', (req, res) => {
  const dir = getSessionUploadDir(req.params.id);
  if (!dir) { res.status(404).json({ error: 'Session not found' }); return; }

  const safeName = path.basename(req.params.filename);
  const filePath = path.join(dir, safeName);

  if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return; }

  fs.unlinkSync(filePath);
  res.status(204).send();
});

// --- Tasks ---

app.get('/tasks', (_req, res) => {
  res.json(getAllTasks());
});

app.post('/tasks', (req, res) => {
  const partial = req.body as Record<string, unknown>;
  if (!partial.title) { res.status(400).json({ error: 'title is required' }); return; }
  const now = new Date().toISOString();
  const task = {
    ...partial,
    id: generateTaskId(),
    createdAt: now,
    updatedAt: now,
  };
  upsertTask(task as { id: string });
  res.status(201).json(task);
});

app.get('/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json(task);
});

app.put('/tasks/:id', (req, res) => {
  const task = req.body as Record<string, unknown>;
  if (!task || task.id !== req.params.id) { res.status(400).json({ error: 'Invalid task' }); return; }
  const updated = { ...task, updatedAt: new Date().toISOString() };
  upsertTask(updated as { id: string });
  res.json(updated);
});

app.delete('/tasks/:id', (req, res) => {
  const deleted = deleteTaskStore(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Task not found' }); return; }
  res.status(204).send();
});

app.post('/tasks/import', (req, res) => {
  const { tasks } = req.body as { tasks: { id: string }[] };
  if (!Array.isArray(tasks)) { res.status(400).json({ error: 'Expected { tasks: [...] }' }); return; }
  replaceAllTasks(tasks);
  res.json({ imported: tasks.length });
});

app.post('/tasks/:id/session', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const { launch } = req.body as { launch?: boolean };

  // Return existing session if valid
  const existingSessionId = task.sessionId as string | undefined;
  if (existingSessionId) {
    const existing = getSession(existingSessionId);
    if (existing) {
      writeTaskClaudeMd(existing.folderPath, task);
      if (launch) {
        try {
          const isFirstLaunch = !existing.lastLaunchedAt;
          const now = new Date().toISOString();
          if (isFirstLaunch) {
            launchNewSession(existing.id, existing.folderPath);
          } else {
            resumeSession(existing.id, existing.folderPath);
          }
          upsertSession({ ...existing, status: 'active', lastLaunchedAt: now, updatedAt: now });
        } catch (err) {
          console.error('Terminal launch failed:', err);
        }
      }
      return res.json({ task, session: getSession(existingSessionId) });
    }
  }

  // Provision a new session for this task
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const taskTitle = String(task.title ?? '');
  const taskId = String(task.id);
  const safeName = taskTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const sessionName = safeName ? `${safeName}-${taskId.toLowerCase()}-${id.slice(0, 8)}` : `${taskId.toLowerCase()}-${id.slice(0, 8)}`;
  const folderPath = createSessionFolder(id, sessionName);

  const session: Session = {
    id,
    name: sessionName,
    status: 'active',
    taskIds: [taskId],
    folderPath,
    createdAt: now,
    updatedAt: now,
  };
  upsertSession(session);

  writeTaskClaudeMd(folderPath, task);

  const updatedTask = { ...task, sessionId: id, updatedAt: now };
  upsertTask(updatedTask);

  if (launch) {
    try {
      launchNewSession(session.id, session.folderPath);
      const launched = { ...session, lastLaunchedAt: now };
      upsertSession(launched);
      return res.status(201).json({ task: updatedTask, session: launched });
    } catch (err) {
      console.error('Terminal launch failed:', err);
    }
  }

  res.status(201).json({ task: updatedTask, session });
});

function writeTaskClaudeMd(folderPath: string, task: { id: string; title?: unknown; description?: unknown }): void {
  const title = String(task.title ?? '');
  const description = String(task.description ?? '').trim();
  const lines = [
    `# Task: ${title} (${task.id})`,
    '',
    ...(description ? [description, ''] : []),
    '---',
    '',
    'At the start of every conversation in this folder, call the `get_focus` MCP tool',
    'to retrieve the current task status, history, and notes before doing any work.',
  ];
  fs.writeFileSync(path.join(folderPath, 'CLAUDE.md'), lines.join('\n'), 'utf-8');
}

// --- Journal ---

app.get('/journal', (_req, res) => {
  res.json(getAllEntries());
});

app.post('/journal', (req, res) => {
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: 'content is required' }); return; }
  const now = new Date().toISOString();
  const entry = { id: crypto.randomUUID(), content: content.trim(), createdAt: now, updatedAt: now };
  upsertEntry(entry);
  res.status(201).json(entry);
});

app.get('/journal/:id', (req, res) => {
  const entry = getEntry(req.params.id);
  if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
  res.json(entry);
});

app.put('/journal/:id', (req, res) => {
  const existing = getEntry(req.params.id);
  if (!existing) { res.status(404).json({ error: 'Entry not found' }); return; }
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: 'content is required' }); return; }
  const updated = { ...existing, content: content.trim(), updatedAt: new Date().toISOString() };
  upsertEntry(updated);
  res.json(updated);
});

app.delete('/journal/:id', (req, res) => {
  const deleted = deleteEntry(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Entry not found' }); return; }
  res.status(204).send();
});

// --- Focus ---

app.get('/focus', (_req, res) => {
  res.json(getFocus());
});

app.put('/focus', (req, res) => {
  const { taskId } = req.body as { taskId?: string };
  if (!taskId) { res.status(400).json({ error: 'taskId is required' }); return; }
  if (!getTask(taskId)) { res.status(404).json({ error: 'Task not found' }); return; }
  setFocus(taskId);
  res.json(getFocus());
});

app.delete('/focus', (_req, res) => {
  clearFocus();
  res.json(getFocus());
});

app.get('/health', (_req, res) => res.json({ ok: true }));

export { app };

if (!process.env.VITEST) {
  app.all('/mcp', async (req, res) => {
    try {
      const mcpServer = new McpServer({ name: 'svampbase', version: '0.1.0' });
      registerMcpTools(mcpServer);
      const mcpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await mcpServer.connect(mcpTransport);
      await mcpTransport.handleRequest(req, res, req.body);
    } catch (err) {
      process.stderr.write(`MCP request error: ${errMsg(err)}\n`);
      if (!res.headersSent) res.status(500).json({ error: errMsg(err) });
    }
  });

  app.listen(PORT, () => {
    console.log(`Svampbase server running on http://localhost:${PORT}`);
  });
}
