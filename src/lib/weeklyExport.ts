import type { Task, JournalEntry } from './types';
import { STATUS_LABELS } from './utils';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function rangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const fmtYear = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  if (start.getFullYear() === end.getFullYear()) {
    return `${fmt(start)} – ${fmtYear(end)}`;
  }
  return `${fmtYear(start)} – ${fmtYear(end)}`;
}

function taskSection(task: Task): string {
  const lines: string[] = [];

  lines.push(`### ${task.id} — ${task.title}`);

  // Duration hint from history
  const start = task.history.find((h) => h.toStatus === 'in-progress');
  const end = task.completedAt ?? task.archivedAt;
  if (start && end) {
    const days = daysBetween(start.timestamp, end);
    const endLabel = task.completedAt ? `Completed ${formatDate(end)}` : `Archived ${formatDate(end)}`;
    lines.push(`_${endLabel} · ${days === 0 ? 'same day' : `${days}d`}_`);
  } else if (end) {
    const endLabel = task.completedAt ? `Completed ${formatDate(end)}` : `Archived ${formatDate(end)}`;
    lines.push(`_${endLabel}_`);
  }

  if (task.description) {
    lines.push('');
    lines.push(task.description);
  }

  if (task.links.length > 0) {
    lines.push('');
    lines.push('**Links**');
    for (const link of task.links) {
      lines.push(`- [${link.label || link.url}](${link.url})`);
    }
  }

  if (task.notes.length > 0) {
    lines.push('');
    lines.push('**Notes**');
    for (const note of task.notes) {
      lines.push(note.content);
    }
  }

  // Status journey (skip trivial single-step histories)
  const journey = task.history
    .filter((h) => h.fromStatus !== null)
    .map((h) => STATUS_LABELS[h.toStatus] ?? h.toStatus);
  if (journey.length > 1) {
    lines.push('');
    lines.push(`**Journey:** ${journey.join(' → ')}`);
  }

  lines.push('');
  return lines.join('\n');
}

function journalSection(entries: JournalEntry[], cutoff: Date): string {
  const recent = entries.filter((e) => new Date(e.createdAt) >= cutoff);
  if (recent.length === 0) return '';

  const sorted = [...recent].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lines: string[] = [];
  lines.push(`## Journal (${recent.length})`);
  lines.push('');

  for (const entry of sorted) {
    const date = new Date(entry.createdAt).toLocaleDateString([], {
      weekday: 'short', month: 'short', day: 'numeric',
    });
    lines.push(`### ${date}`);
    lines.push('');
    lines.push(entry.content);
    lines.push('');
  }

  return lines.join('\n');
}

export function generateWeeklySummary(tasks: Task[], days = 7, journalEntries: JournalEntry[] = []): string {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const completed = tasks.filter(
    (t) => t.completedAt && new Date(t.completedAt) >= cutoff
  );
  const archived = tasks.filter(
    (t) => t.archivedAt && new Date(t.archivedAt) >= cutoff
  );
  const inFlight = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.status !== 'archived' &&
      new Date(t.updatedAt) >= cutoff
  );

  const lines: string[] = [];

  lines.push(`# What I worked on — ${rangeLabel(cutoff, now)}`);
  lines.push('');

  const journalInWindow = journalEntries.filter((e) => new Date(e.createdAt) >= cutoff);
  if (completed.length === 0 && archived.length === 0 && inFlight.length === 0 && journalInWindow.length === 0) {
    lines.push('_No activity in this period._');
    return lines.join('\n');
  }

  if (completed.length > 0) {
    lines.push(`## Completed (${completed.length})`);
    lines.push('');
    for (const task of completed) lines.push(taskSection(task));
  }

  if (archived.length > 0) {
    lines.push(`## Archived (${archived.length})`);
    lines.push('');
    for (const task of archived) lines.push(taskSection(task));
  }

  if (inFlight.length > 0) {
    lines.push('## Still in flight');
    lines.push('');
    for (const task of inFlight) {
      lines.push(`- **${task.id}** — ${task.title} _(${STATUS_LABELS[task.status]})_`);
    }
    lines.push('');
  }

  const journal = journalSection(journalEntries, cutoff);
  if (journal) lines.push(journal);

  return lines.join('\n');
}

export function downloadWeeklySummary(tasks: Task[], days = 7, journalEntries: JournalEntry[] = []): void {
  const md = generateWeeklySummary(tasks, days, journalEntries);
  const now = new Date();
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `svampbase-${now.toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
