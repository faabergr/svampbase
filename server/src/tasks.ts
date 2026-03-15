import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

export interface StoredTask {
  [key: string]: unknown;
  id: string;
}

function readTasks(): StoredTask[] {
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf-8')) as StoredTask[];
  } catch {
    return [];
  }
}

function writeTasks(tasks: StoredTask[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

export function getAllTasks(): StoredTask[] {
  return readTasks();
}

export function getTask(id: string): StoredTask | undefined {
  return readTasks().find((t) => t.id === id);
}

export function upsertTask(task: StoredTask): StoredTask {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) tasks[idx] = task; else tasks.push(task);
  writeTasks(tasks);
  return task;
}

export function deleteTask(id: string): boolean {
  const tasks = readTasks();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  tasks.splice(idx, 1);
  writeTasks(tasks);
  return true;
}

export function replaceAllTasks(tasks: StoredTask[]): void {
  writeTasks(tasks);
}

export function generateTaskId(): string {
  const tasks = readTasks();
  let max = 0;
  for (const task of tasks) {
    const match = String(task.id).match(/^TASK-(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  const next = max + 1;
  return `TASK-${String(next).padStart(Math.max(3, String(next).length), '0')}`;
}
