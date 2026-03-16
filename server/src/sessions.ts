import fs from 'fs';
import path from 'path';
import type { Session } from './types';

const DATA_DIR = process.env.SVAMPBASE_DATA_DIR ?? path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
export const SESSIONS_FOLDER = path.join(__dirname, '..', 'sessions');

export function createSessionFolder(sessionId: string, sessionName?: string): string {
  let folderName = sessionId;
  if (sessionName) {
    const safeName = sessionName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (safeName) folderName = `${safeName}-${sessionId.slice(0, 8)}`;
  }
  const folderPath = path.join(SESSIONS_FOLDER, folderName);
  fs.mkdirSync(folderPath, { recursive: true });
  return folderPath;
}

export function readSessions(): Session[] {
  if (!fs.existsSync(SESSIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export function writeSessions(sessions: Session[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

export function getAllSessions(): Session[] {
  return readSessions();
}

export function getSession(id: string): Session | undefined {
  return readSessions().find((s) => s.id === id);
}

export function upsertSession(session: Session): Session {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  writeSessions(sessions);
  return session;
}

export function deleteSession(id: string): boolean {
  const sessions = readSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  sessions.splice(idx, 1);
  writeSessions(sessions);
  return true;
}
