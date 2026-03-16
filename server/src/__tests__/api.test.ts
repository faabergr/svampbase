import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { Session } from '../types';

// --- mock sessions ---
const mockSessions = vi.hoisted(() => new Map<string, Session>());

vi.mock('../sessions', () => ({
  getAllSessions: vi.fn(() => Array.from(mockSessions.values())),
  getSession: vi.fn((id: string) => mockSessions.get(id)),
  upsertSession: vi.fn((s: Session) => { mockSessions.set(s.id, s); return s; }),
  deleteSession: vi.fn((id: string) => {
    if (!mockSessions.has(id)) return false;
    mockSessions.delete(id);
    return true;
  }),
  createSessionFolder: vi.fn((id: string) => `/tmp/sessions/${id}`),
  SESSIONS_FOLDER: '/tmp/sessions',
}));

// --- mock tasks ---
vi.mock('../tasks', () => ({
  getAllTasks: vi.fn(() => []),
  getTask: vi.fn(),
  upsertTask: vi.fn((t) => t),
  deleteTask: vi.fn(() => true),
  replaceAllTasks: vi.fn(),
  generateTaskId: vi.fn(() => 'TASK-001'),
}));

// --- mock terminal ---
vi.mock('../terminal', () => ({
  launchNewSession: vi.fn(),
  resumeSession: vi.fn(),
}));

import { app } from '../index';
import * as terminalMod from '../terminal';

function makeSession(overrides: Partial<Session> = {}): Session {
  const now = new Date().toISOString();
  return {
    id: 'sess-1',
    name: 'Test Session',
    status: 'active',
    taskIds: [],
    folderPath: '/tmp/sessions/sess-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

beforeEach(() => {
  mockSessions.clear();
  vi.clearAllMocks();
});

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /sessions', () => {
  it('returns an empty array when no sessions exist', async () => {
    const res = await request(app).get('/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all sessions', async () => {
    mockSessions.set('sess-1', makeSession());
    const res = await request(app).get('/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('sess-1');
  });
});

describe('GET /sessions/:id', () => {
  it('returns 404 for unknown session', async () => {
    const res = await request(app).get('/sessions/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('returns the session when it exists', async () => {
    mockSessions.set('sess-1', makeSession());
    const res = await request(app).get('/sessions/sess-1');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('sess-1');
  });
});

describe('PATCH /sessions/:id', () => {
  it('returns 404 for unknown session', async () => {
    const res = await request(app).patch('/sessions/nope').send({ status: 'paused' });
    expect(res.status).toBe(404);
  });

  it('updates session status', async () => {
    mockSessions.set('sess-1', makeSession({ status: 'active' }));
    const res = await request(app).patch('/sessions/sess-1').send({ status: 'paused' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paused');
  });
});

describe('DELETE /sessions/:id', () => {
  it('returns 404 for unknown session', async () => {
    const res = await request(app).delete('/sessions/nope');
    expect(res.status).toBe(404);
  });

  it('deletes an existing session', async () => {
    mockSessions.set('sess-1', makeSession());
    const res = await request(app).delete('/sessions/sess-1');
    expect(res.status).toBe(204);
    expect(mockSessions.has('sess-1')).toBe(false);
  });
});

describe('POST /sessions/:id/launch', () => {
  it('returns 404 for unknown session', async () => {
    const res = await request(app).post('/sessions/nope/launch');
    expect(res.status).toBe(404);
  });

  it('calls launchNewSession on first launch and sets status to active', async () => {
    mockSessions.set('sess-1', makeSession({ lastLaunchedAt: undefined }));
    const res = await request(app).post('/sessions/sess-1/launch');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(terminalMod.launchNewSession).toHaveBeenCalledWith('sess-1', expect.any(String));
    expect(terminalMod.resumeSession).not.toHaveBeenCalled();
  });

  it('calls resumeSession on subsequent launches', async () => {
    mockSessions.set('sess-1', makeSession({ lastLaunchedAt: new Date().toISOString() }));
    const res = await request(app).post('/sessions/sess-1/launch');
    expect(res.status).toBe(200);
    expect(terminalMod.resumeSession).toHaveBeenCalledWith('sess-1', expect.any(String));
    expect(terminalMod.launchNewSession).not.toHaveBeenCalled();
  });
});
