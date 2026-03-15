import type { Task, TaskStatus, Alert } from '../lib/types';
import { Column } from './Column';
import { ReminderBanner } from './ReminderBanner';

interface BoardProps {
  tasks: Task[];
  alerts: Alert[];
  onCardClick: (task: Task) => void;
  onDismissAlert: (alert: Alert) => void;
  onAlertAction: (task: Task, newStatus: TaskStatus) => void;
}

const COLUMNS: { status: TaskStatus; label: string; accentClass: string }[] = [
  { status: 'in-progress', label: 'In Progress', accentClass: 'bg-blue-500' },
  { status: 'waiting-on-dependency', label: 'Waiting on Dependency', accentClass: 'bg-orange-500' },
  { status: 'waiting-on-response', label: 'Waiting on Response', accentClass: 'bg-purple-500' },
  { status: 'backburnered', label: 'Backburnered', accentClass: 'bg-slate-500' },
];

export function Board({ tasks, alerts, onCardClick, onDismissAlert, onAlertAction }: BoardProps) {
  const activeAlerts = alerts.filter((a) => a.type === 'boomerang' || a.type === 'deadline');

  return (
    <div className="flex-1 overflow-auto p-4">
      <ReminderBanner
        alerts={activeAlerts}
        onDismiss={onDismissAlert}
        onTaskAction={onAlertAction}
        onViewTask={onCardClick}
      />

      <div className="flex gap-4 items-start">
        {COLUMNS.map(({ status, label, accentClass }) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <Column
              key={status}
              status={status}
              label={label}
              tasks={columnTasks}
              accentClass={accentClass}
              onCardClick={onCardClick}
            />
          );
        })}
      </div>
    </div>
  );
}
