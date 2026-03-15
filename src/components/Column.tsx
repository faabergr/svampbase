import type { Task, TaskStatus } from '../lib/types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  accentClass: string;
  onCardClick: (task: Task) => void;
}

export function Column({ label, tasks, accentClass, onCardClick }: ColumnProps) {
  return (
    <div className="flex flex-col bg-slate-900/50 rounded-lg min-h-[200px] w-72 flex-shrink-0">
      <div className={`px-3 py-2.5 border-b border-slate-700 flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full ${accentClass}`} />
        <h2 className="text-slate-200 font-semibold text-sm">{label}</h2>
        <span className="ml-auto text-slate-500 text-xs bg-slate-800 px-1.5 py-0.5 rounded">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-2 flex-1">
        {tasks.length === 0 && (
          <p className="text-slate-600 text-xs text-center mt-4">No tasks</p>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onCardClick(task)} />
        ))}
      </div>
    </div>
  );
}
