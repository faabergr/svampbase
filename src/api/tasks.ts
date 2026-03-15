import type { Task } from '../lib/types';

const BASE = 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  getAllTasks: () => apiFetch<Task[]>('/tasks'),
  createTask: (partial: Partial<Task> & { title: string }) =>
    apiFetch<Task>('/tasks', { method: 'POST', body: JSON.stringify(partial) }),
  updateTask: (task: Task) =>
    apiFetch<Task>(`/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify(task) }),
  deleteTask: (id: string) =>
    apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' }),
  importTasks: (tasks: Task[]) =>
    apiFetch<{ imported: number }>('/tasks/import', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    }),
};
