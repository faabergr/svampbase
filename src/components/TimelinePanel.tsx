import { useMemo, useState } from 'react';
import type { Task } from '../lib/types';
import { computeTimelineData, positionPercent } from '../lib/timelineUtils';
import type { TimelineTask } from '../lib/timelineUtils';

interface TimelinePanelProps {
  tasks: Task[];
  onClose: () => void;
  onOpenTask: (task: Task) => void;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function TaskRow({
  item,
  window: win,
  onOpenTask,
}: {
  item: TimelineTask;
  window: { startMs: number; endMs: number };
  onOpenTask: (t: Task) => void;
}) {
  const deadlinePct = positionPercent(item.deadlineMs, win);
  const reminderPct = item.reminderMs != null ? positionPercent(item.reminderMs, win) : null;

  const dotColor = item.isOverdue
    ? 'bg-red-500 hover:bg-red-400'
    : item.isDueSoon
    ? 'bg-yellow-400 hover:bg-yellow-300'
    : 'bg-blue-400 hover:bg-blue-300';

  const labelColor = item.isOverdue
    ? 'text-red-400'
    : item.isDueSoon
    ? 'text-yellow-400'
    : 'text-slate-400';

  return (
    <div className="flex items-center gap-3 py-2 group">
      {/* Task title */}
      <button
        onClick={() => onOpenTask(item.task)}
        className="w-40 flex-shrink-0 text-left text-sm text-slate-200 hover:text-white truncate leading-tight"
        title={item.task.title}
      >
        {item.task.title}
      </button>

      {/* Rail */}
      <div className="relative flex-1 h-6">
        {/* Background line */}
        <div className="absolute inset-y-1/2 -translate-y-px left-0 right-0 h-px bg-slate-700" />

        {/* Deadline dot */}
        <button
          onClick={() => onOpenTask(item.task)}
          title={`Deadline: ${formatDate(item.deadlineMs)}`}
          className={`absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${dotColor} ring-2 ring-slate-900 transition-colors z-10`}
          style={{ left: `${deadlinePct}%` }}
        />

        {/* Reminder dot (purple) */}
        {reminderPct != null && (
          <div
            title={`Reminder: ${formatDate(item.reminderMs!)}`}
            className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-400 ring-2 ring-slate-900 z-10"
            style={{ left: `${reminderPct}%` }}
          />
        )}
      </div>

      {/* Date label */}
      <span className={`w-16 flex-shrink-0 text-right text-xs ${labelColor}`}>
        {item.isOverdue ? `${Math.ceil((Date.now() - item.deadlineMs) / 86400000)}d ago` : formatDate(item.deadlineMs)}
      </span>
    </div>
  );
}

export function TimelinePanel({ tasks, onClose, onOpenTask }: TimelinePanelProps) {
  const [noDeadlineOpen, setNoDeadlineOpen] = useState(false);
  const data = useMemo(() => computeTimelineData(tasks), [tasks]);
  const { window: win, plotted, noDeadline } = data;

  const todayPct = positionPercent(Date.now(), win);

  // Axis tick labels
  const ticks = useMemo(() => {
    const result: { label: string; pct: number }[] = [];
    const rangeMs = win.endMs - win.startMs;
    const stepMs = rangeMs <= 30 * 86400000 ? 7 * 86400000 : 14 * 86400000;
    let cursor = win.startMs;
    while (cursor <= win.endMs) {
      result.push({ label: formatDate(cursor), pct: positionPercent(cursor, win) });
      cursor += stepMs;
    }
    return result;
  }, [win]);

  return (
    <div className="fixed right-0 top-0 h-full w-[560px] bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
        <div>
          <h2 className="text-slate-100 font-semibold">Deadline Timeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(win.startMs)} – {formatDate(win.endMs)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2.5 border-b border-slate-800 flex-shrink-0 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />Overdue</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />Due soon (&le;7d)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Future</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Reminder</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {plotted.length === 0 && noDeadline.length === 0 && (
          <p className="text-slate-500 text-sm text-center mt-8">No active tasks.</p>
        )}

        {plotted.length > 0 && (
          <>
            {/* Axis header with today marker */}
            <div className="relative mb-1 ml-[172px] mr-[68px]">
              {/* Today line */}
              <div
                className="absolute top-0 h-full border-l border-dashed border-slate-600"
                style={{ left: `${todayPct}%` }}
              />
              {/* Tick labels */}
              <div className="relative h-5">
                {ticks.map((t) => (
                  <span
                    key={t.pct}
                    className="absolute -translate-x-1/2 text-xs text-slate-600 whitespace-nowrap"
                    style={{ left: `${t.pct}%` }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
              {/* Today label */}
              <div
                className="absolute -translate-x-1/2 text-xs text-slate-400 font-medium whitespace-nowrap"
                style={{ left: `${todayPct}%` }}
              >
                Today
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-800">
              {plotted.map((item) => (
                <TaskRow
                  key={item.task.id}
                  item={item}
                  window={win}
                  onOpenTask={onOpenTask}
                />
              ))}
            </div>
          </>
        )}

        {/* No-deadline tasks */}
        {noDeadline.length > 0 && (
          <div className="mt-4 border-t border-slate-800 pt-3">
            <button
              onClick={() => setNoDeadlineOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors w-full text-left"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${noDeadlineOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>No deadline ({noDeadline.length})</span>
            </button>

            {noDeadlineOpen && (
              <ul className="mt-2 space-y-1">
                {noDeadline.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => onOpenTask(t)}
                      className="text-sm text-slate-300 hover:text-white transition-colors text-left w-full truncate"
                    >
                      {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
