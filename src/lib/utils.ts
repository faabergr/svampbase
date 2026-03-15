import type { Task, ReminderDuration } from './types';

export function generateTaskId(tasks: Task[]): string {
  let max = 0;
  for (const task of tasks) {
    const match = task.id.match(/^TASK-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const next = max + 1;
  const digits = Math.max(3, String(next).length);
  return `TASK-${String(next).padStart(digits, '0')}`;
}

export function computeReminderFiresAt(duration: ReminderDuration, from: Date): Date {
  const ms = from.getTime();
  switch (duration) {
    case '4h':
      return new Date(ms + 4 * 60 * 60 * 1000);
    case '1bd':
      // 8 business hours = 8 hours
      return new Date(ms + 8 * 60 * 60 * 1000);
    case '5bd':
      // 5 business days = 40 hours
      return new Date(ms + 40 * 60 * 60 * 1000);
  }
}

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

export function formatDeadlineRelative(iso: string): string {
  const now = Date.now();
  const deadline = new Date(iso).getTime();
  const diffMs = deadline - now;
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) return 'Overdue';
  if (diffHour < 1) return 'Due soon';
  if (diffHour < 24) return `Due in ${diffHour}h`;
  if (diffDay === 1) return 'Due tomorrow';
  return `Due in ${diffDay}d`;
}

export function isDeadlineSoon(iso: string): boolean {
  const deadline = new Date(iso).getTime();
  const now = Date.now();
  return deadline - now <= 24 * 60 * 60 * 1000;
}

export function formatReminderFiresAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return 'now';
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHour = Math.round(diffMs / 3600000);
  if (diffHour < 24) return `in ${diffHour}h`;
  const diffDay = Math.round(diffMs / 86400000);
  if (diffDay === 1) return 'tomorrow ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function isDeadlineOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export const STATUS_LABELS: Record<string, string> = {
  'in-progress': 'In Progress',
  'waiting-on-dependency': 'Waiting on Dependency',
  'waiting-on-response': 'Waiting on Response',
  'backburnered': 'Backburnered',
  'completed': 'Completed',
  'archived': 'Archived',
};

export const REMINDER_LABELS: Record<string, string> = {
  '4h': '4 Hours',
  '1bd': '1 Business Day',
  '5bd': '5 Business Days',
};
