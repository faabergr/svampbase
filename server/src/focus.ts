import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.SVAMPBASE_DATA_DIR ?? path.join(__dirname, '..', 'data');
const FOCUS_FILE = path.join(DATA_DIR, 'focus.json');

interface FocusState {
  taskId: string | null;
  updatedAt: string;
}

function readFocus(): FocusState {
  if (!fs.existsSync(FOCUS_FILE)) return { taskId: null, updatedAt: new Date().toISOString() };
  try {
    return JSON.parse(fs.readFileSync(FOCUS_FILE, 'utf-8')) as FocusState;
  } catch {
    return { taskId: null, updatedAt: new Date().toISOString() };
  }
}

function writeFocus(state: FocusState): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FOCUS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function getFocus(): FocusState {
  return readFocus();
}

export function setFocus(taskId: string): void {
  writeFocus({ taskId, updatedAt: new Date().toISOString() });
}

export function clearFocus(): void {
  writeFocus({ taskId: null, updatedAt: new Date().toISOString() });
}
