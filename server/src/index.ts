import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getAllSessions, getSession, upsertSession, deleteSession, createSessionFolder, SESSIONS_FOLDER } from './sessions';
import { launchNewSession, resumeSession } from './terminal';
import type { Session, SessionStatus, SessionFile } from './types';

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
  const folderPath = createSessionFolder(id);

  const session: Session = {
    id,
    name: name?.trim() || `svampbase-${randomChars(8)}`,
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

app.delete('/sessions/:id', (req, res) => {
  const deleted = deleteSession(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Session not found' }); return; }
  res.status(204).send();
});

app.post('/sessions/:id/launch', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

  // Ensure folder exists (for sessions created before this feature)
  if (!fs.existsSync(session.folderPath)) {
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
  if (!fs.existsSync(session.folderPath)) {
    fs.mkdirSync(session.folderPath, { recursive: true });
  }
  return session.folderPath;
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

app.listen(PORT, () => {
  console.log(`Svampbase server running on http://localhost:${PORT}`);
});
