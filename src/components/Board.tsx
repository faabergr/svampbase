import { useState } from 'react';
import type { Task, TaskStatus, Alert } from '../lib/types';
import { Column } from './Column';
import { ReminderBanner } from './ReminderBanner';

interface BoardProps {
  tasks: Task[];
  alerts: Alert[];
  onCardClick: (task: Task) => void;
  onDismissAlert: (alert: Alert) => void;
  onAlertAction: (task: Task, newStatus: TaskStatus) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const COLUMNS: { status: TaskStatus; label: string; accentClass: string }[] = [
  { status: 'in-progress',            label: 'In Progress',            accentClass: 'bg-blue-500'   },
  { status: 'waiting-on-dependency',  label: 'Waiting on Dependency',  accentClass: 'bg-orange-500' },
  { status: 'waiting-on-response',    label: 'Waiting on Response',    accentClass: 'bg-purple-500' },
  { status: 'backburnered',           label: 'Backburnered',           accentClass: 'bg-slate-500'  },
];

export function Board({ tasks, alerts, onCardClick, onDismissAlert, onAlertAction, onStatusChange }: BoardProps) {
  const activeAlerts = alerts.filter((a) => a.type === 'boomerang' || a.type === 'deadline');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  function handleDrop(targetStatus: TaskStatus) {
    if (draggedTaskId) {
      const task = tasks.find((t) => t.id === draggedTaskId);
      if (task && task.status !== targetStatus) {
        onStatusChange(draggedTaskId, targetStatus);
      }
    }
    setDraggedTaskId(null);
    setDragOverStatus(null);
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <ReminderBanner
        alerts={activeAlerts}
        onDismiss={onDismissAlert}
        onTaskAction={onAlertAction}
        onViewTask={onCardClick}
      />

      <div className="flex gap-4 items-start">
        {COLUMNS.map(({ status, label, accentClass }) => (
          <Column
            key={status}
            status={status}
            label={label}
            tasks={tasks.filter((t) => t.status === status)}
            accentClass={accentClass}
            onCardClick={onCardClick}
            isDragOver={dragOverStatus === status}
            onDragOver={() => setDragOverStatus(status)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={() => handleDrop(status)}
            onCardDragStart={(taskId) => setDraggedTaskId(taskId)}
            onCardDragEnd={() => { setDraggedTaskId(null); setDragOverStatus(null); }}
          />
        ))}
      </div>
    </div>
  );
}
