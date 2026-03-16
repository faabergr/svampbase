import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { Session } from '../types';

// Create a temp dir and point sessions.ts at it before the module is imported.
// vi.hoisted runs before vi.mock factories and before module imports.
const TEST_DATA_DIR = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'svampbase-test-'));
  process.env.SVAMPBASE_DATA_DIR = dir;
  return dir as string;
});

import { getAllSessions, getSession, upsertSession, deleteSession } from '../sessions';

afterAll(() => {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  delete process.env.SVAMPBASE_DATA_DIR;
});

beforeEach(() => {
  const sessionsFile = path.join(TEST_DATA_DIR, 'sessions.json');
  if (fs.existsSync(sessionsFile)) fs.unlinkSync(sessionsFile);
});

function makeSession(id = 'id-1'): Session {
  const now = new Date().toISOString();
  return { id, name: 'Test', status: 'active', taskIds: [], folderPath: '/tmp/s', createdAt: now, updatedAt: now };
}

describe('sessions', () => {
  it('returns [] when no sessions exist', () => {
    expect(getAllSessions()).toEqual([]);
  });

  it('upserts and retrieves a session', () => {
    const s = makeSession();
    upsertSession(s);
    expect(getSession(s.id)).toEqual(s);
  });

  it('updates an existing session on upsert (no duplicates)', () => {
    const s = makeSession();
    upsertSession(s);
    upsertSession({ ...s, name: 'Updated' });
    expect(getAllSessions()).toHaveLength(1);
    expect(getSession(s.id)?.name).toBe('Updated');
  });

  it('stores multiple sessions independently', () => {
    upsertSession(makeSession('a'));
    upsertSession(makeSession('b'));
    upsertSession(makeSession('c'));
    expect(getAllSessions()).toHaveLength(3);
  });

  it('deletes a session and returns true', () => {
    const s = makeSession();
    upsertSession(s);
    expect(deleteSession(s.id)).toBe(true);
    expect(getSession(s.id)).toBeUndefined();
    expect(getAllSessions()).toHaveLength(0);
  });

  it('returns false when deleting a session that does not exist', () => {
    expect(deleteSession('ghost-id')).toBe(false);
  });

  it('returns undefined for an unknown session ID', () => {
    expect(getSession('unknown')).toBeUndefined();
  });
});
