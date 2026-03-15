import type { Alert, Task, TaskStatus } from '../lib/types';
import { formatDeadlineRelative } from '../lib/utils';

interface ReminderBannerProps {
  alerts: Alert[];
  onDismiss: (alert: Alert) => void;
  onTaskAction: (task: Task, newStatus: TaskStatus) => void;
  onViewTask: (task: Task) => void;
}

export function ReminderBanner({ alerts, onDismiss, onTaskAction, onViewTask }: ReminderBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-4">
      {alerts.map((alert) => (
        <AlertCard
          key={`${alert.type}-${alert.task.id}`}
          alert={alert}
          onDismiss={() => onDismiss(alert)}
          onTaskAction={onTaskAction}
          onViewTask={onViewTask}
        />
      ))}
    </div>
  );
}

interface AlertCardProps {
  alert: Alert;
  onDismiss: () => void;
  onTaskAction: (task: Task, newStatus: TaskStatus) => void;
  onViewTask: (task: Task) => void;
}

function AlertCard({ alert, onDismiss, onTaskAction, onViewTask }: AlertCardProps) {
  const { task, type } = alert;

  if (type === 'boomerang') {
    return (
      <div className="bg-purple-900/40 border border-purple-700/60 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-purple-300 font-semibold text-sm">Boomerang: </span>
          <span className="text-slate-200 text-sm">
            {task.id} &ldquo;{task.title}&rdquo; — reminder fired
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { onTaskAction(task, 'in-progress'); onDismiss(); }}
            className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-2.5 py-1 rounded transition-colors"
          >
            Got a reply
          </button>
          <button
            onClick={() => { onTaskAction(task, 'backburnered'); onDismiss(); }}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded transition-colors"
          >
            Backburner
          </button>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-200 text-sm px-1"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Deadline alert
  const deadlineLabel = task.deadline ? formatDeadlineRelative(task.deadline) : '';
  return (
    <div className="bg-yellow-900/40 border border-yellow-700/60 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-yellow-300 font-semibold text-sm">Deadline: </span>
        <span className="text-slate-200 text-sm">
          {task.id} &ldquo;{task.title}&rdquo; — {deadlineLabel}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onViewTask(task)}
          className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2.5 py-1 rounded transition-colors"
        >
          View Task
        </button>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-200 text-sm px-1"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
