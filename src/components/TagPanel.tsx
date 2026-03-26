import type { Task } from '../lib/types';
import { STATUS_LABELS } from '../lib/utils';

interface TagPanelProps {
  tag: string;
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (task: Task) => void;
}

export function TagPanel({ tag, tasks, onClose, onOpenTask }: TagPanelProps) {
  const tagged = tasks.filter((t) => t.tags?.includes(tag));

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Tag: {tag}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{tagged.length} task{tagged.length !== 1 ? 's' : ''}</p>
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
      <div className="flex-1 overflow-y-auto p-4">
        {tagged.length === 0 ? (
          <p className="text-xs text-slate-600 italic text-center mt-8">No tasks with this tag.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tagged.map((task) => (
              <button
                key={task.id}
                onClick={() => onOpenTask(task)}
                className="w-full text-left bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-2.5 transition-colors group"
              >
                <span className="font-mono text-xs text-slate-500 group-hover:text-slate-400">{task.id}</span>
                <p className="text-sm text-slate-200 leading-snug mt-0.5">{task.title}</p>
                <p className="text-xs text-slate-500 mt-1">{STATUS_LABELS[task.status]}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
