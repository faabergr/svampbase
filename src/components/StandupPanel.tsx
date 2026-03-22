import { useMemo } from 'react';
import type { Task } from '../lib/types';
import { computeStandupDigest } from '../lib/standupDigest';
import { STATUS_LABELS, formatDeadlineRelative, formatReminderFiresAt } from '../lib/utils';

interface StandupPanelProps {
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (task: Task) => void;
}

interface DigestSectionProps {
  title: string;
  dotColor: string;
  tasks: Task[];
  emptyMessage: string;
  renderMeta?: (task: Task) => React.ReactNode;
  onOpenTask: (task: Task) => void;
}

function DigestSection({ title, dotColor, tasks, emptyMessage, renderMeta, onOpenTask }: DigestSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>
        {tasks.length > 0 && (
          <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full ml-auto">
            {tasks.length}
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-600 italic pl-4">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onOpenTask(task)}
              className="w-full text-left bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-slate-500 group-hover:text-slate-400">{task.id}</span>
                  <p className="text-sm text-slate-200 truncate leading-snug mt-0.5">{task.title}</p>
                </div>
                {renderMeta && (
                  <div className="flex-shrink-0 text-right">{renderMeta(task)}</div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{STATUS_LABELS[task.status]}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StandupPanel({ tasks, onClose, onOpenTask }: StandupPanelProps) {
  const digest = useMemo(() => computeStandupDigest(tasks), [tasks]);

  const todayLabel = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Daily Standup</h2>
          <p className="text-xs text-slate-500 mt-0.5">{todayLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        <DigestSection
          title="Worked on yesterday"
          dotColor="bg-blue-400"
          tasks={digest.workedOnYesterday}
          emptyMessage="No activity recorded yesterday."
          onOpenTask={onOpenTask}
        />

        <DigestSection
          title="Reminders firing"
          dotColor="bg-yellow-400"
          tasks={digest.remindersToday}
          emptyMessage="No reminders due today."
          renderMeta={(task) =>
            task.reminderFiresAt ? (
              <span className="text-xs text-yellow-400">{formatReminderFiresAt(task.reminderFiresAt)}</span>
            ) : null
          }
          onOpenTask={onOpenTask}
        />

        <DigestSection
          title="Overdue"
          dotColor="bg-red-400"
          tasks={digest.overdue}
          emptyMessage="No overdue tasks."
          renderMeta={(task) =>
            task.deadline ? (
              <span className="text-xs text-red-400">{formatDeadlineRelative(task.deadline)}</span>
            ) : null
          }
          onOpenTask={onOpenTask}
        />
      </div>
    </div>
  );
}
