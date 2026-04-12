import type { Session, SessionStatus, SessionFile } from '../lib/sessionTypes';

const BASE_URL = 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
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

export function getSessions(): Promise<Session[]> {
  return apiFetch<Session[]>('/sessions');
}

export function createSession(data: {
  name?: string;
  taskIds: string[];
  notes?: string;
  launch?: boolean;
}): Promise<Session> {
  return apiFetch<Session>('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSession(
  id: string,
  data: Partial<Pick<Session, 'status' | 'taskIds' | 'notes' | 'name'>>
): Promise<Session> {
  return apiFetch<Session>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSession(id: string): Promise<void> {
  return apiFetch<void>(`/sessions/${id}`, { method: 'DELETE' });
}

export function launchSession(id: string): Promise<Session> {
  return apiFetch<Session>(`/sessions/${id}/launch`, { method: 'POST' });
}

export function revealSession(id: string): Promise<void> {
  return apiFetch<void>(`/sessions/${id}/reveal`, { method: 'POST' });
}

export function getSessionFiles(sessionId: string): Promise<SessionFile[]> {
  return apiFetch<SessionFile[]>(`/sessions/${sessionId}/files`);
}

export function uploadSessionFiles(sessionId: string, files: FileList | File[]): Promise<SessionFile[]> {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('files', f));
  return fetch(`${BASE_URL}/sessions/${sessionId}/files`, { method: 'POST', body: form })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SessionFile[]>;
    });
}

export function deleteSessionFile(sessionId: string, filename: string): Promise<void> {
  return apiFetch<void>(`/sessions/${sessionId}/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
}

export function createTaskSession(taskId: string, options?: { launch?: boolean }): Promise<{ task: unknown; session: Session }> {
  return apiFetch<{ task: unknown; session: Session }>(`/tasks/${taskId}/session`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  });
}

export interface FocusState {
  taskId: string | null;
  updatedAt: string;
}

export function getFocus(): Promise<FocusState> {
  return apiFetch<FocusState>('/focus');
}

export function setFocus(taskId: string): Promise<FocusState> {
  return apiFetch<FocusState>('/focus', { method: 'PUT', body: JSON.stringify({ taskId }) });
}

export function clearFocus(): Promise<FocusState> {
  return apiFetch<FocusState>('/focus', { method: 'DELETE' });
}

export type { Session, SessionStatus, SessionFile };
