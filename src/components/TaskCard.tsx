import type { Task } from '../lib/types';
import { formatDeadlineRelative, isDeadlineOverdue, isDeadlineSoon, formatReminderFiresAt } from '../lib/utils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const STATUS_BORDER: Record<string, string> = {
  'in-progress': 'border-blue-500',
  'waiting-on-dependency': 'border-orange-500',
  'waiting-on-response': 'border-purple-500',
  'backburnered': 'border-slate-500',
  'completed': 'border-green-500',
  'archived': 'border-slate-600',
};

export function TaskCard({ task, onClick, onDragStart, onDragEnd }: TaskCardProps) {
  const borderColor = STATUS_BORDER[task.status] ?? 'border-slate-500';
  const contextCount = task.links.length + task.notes.length + task.screenshots.length;

  const deadlineLabel = task.deadline ? formatDeadlineRelative(task.deadline) : null;
  const deadlineOverdue = task.deadline ? isDeadlineOverdue(task.deadline) : false;
  const deadlineSoon = task.deadline ? isDeadlineSoon(task.deadline) : false;

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragEnd={onDragEnd}
      className={`bg-slate-800 border-l-4 ${borderColor} rounded-r-lg p-3 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all shadow-sm select-none`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 font-mono mb-1">{task.id}</p>
          <h3 className="text-slate-100 text-sm font-medium leading-snug line-clamp-2">{task.title}</h3>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {deadlineLabel && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              deadlineOverdue
                ? 'bg-red-900/60 text-red-300'
                : deadlineSoon
                ? 'bg-yellow-900/60 text-yellow-300'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {deadlineLabel}
          </span>
        )}

        {task.reminderFiresAt && !task.reminderDismissed && (
          <span className="relative group flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-900 border border-slate-600 px-2 py-1 text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Reminds {formatReminderFiresAt(task.reminderFiresAt)}
            </span>
          </span>
        )}

        {contextCount > 0 && (
          <span className="text-xs text-slate-400">
            {contextCount} attachment{contextCount !== 1 ? 's' : ''}
          </span>
        )}

        {task.relatedTaskIds.length > 0 && (
          <span className="text-xs text-slate-400">
            {task.relatedTaskIds.length} linked
          </span>
        )}
      </div>
    </div>
  );
}
