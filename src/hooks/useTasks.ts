import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus, StatusHistoryEntry } from '../lib/types';
import { api } from '../api/tasks';
import { nanoid, computeReminderFiresAt } from '../lib/utils';
import { downloadWeeklySummary } from '../lib/weeklyExport';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAllTasks()
      .then((t) => { setTasks(t); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createTask = useCallback(
    async (partial: Partial<Task> & { title: string }): Promise<Task> => {
      const now = new Date().toISOString();
      const status: TaskStatus = partial.status ?? 'in-progress';

      let reminderFiresAt: string | undefined;
      if ((status === 'waiting-on-response' || status === 'waiting-on-dependency') && partial.reminderDuration) {
        reminderFiresAt = computeReminderFiresAt(partial.reminderDuration, new Date()).toISOString();
      }

      const historyEntry: StatusHistoryEntry = {
        id: nanoid(),
        timestamp: now,
        fromStatus: null,
        toStatus: status,
      };

      // Send to backend — server assigns the TASK-NNN id
      const task = await api.createTask({
        ...partial,
        status,
        reminderFiresAt,
        links: partial.links ?? [],
        notes: partial.notes ?? [],
        screenshots: partial.screenshots ?? [],
        relatedTaskIds: partial.relatedTaskIds ?? [],
        history: [historyEntry],
      });

      setTasks((prev) => [...prev, task]);
      return task;
    },
    []
  );

  const updateTask = useCallback(async (updated: Task): Promise<void> => {
    const task = await api.updateTask({ ...updated, updatedAt: new Date().toISOString() });
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
  }, []);

  const changeTaskStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus, note?: string): Promise<void> => {
      const existing = tasks.find((t) => t.id === taskId);
      if (!existing) return;

      const now = new Date().toISOString();
      const historyEntry: StatusHistoryEntry = {
        id: nanoid(),
        timestamp: now,
        fromStatus: existing.status,
        toStatus: newStatus,
        note,
      };

      const isReminderStatus = newStatus === 'waiting-on-response' || newStatus === 'waiting-on-dependency';
      const reminderFiresAt = isReminderStatus && existing.reminderDuration
        ? computeReminderFiresAt(existing.reminderDuration, new Date()).toISOString()
        : existing.reminderFiresAt;
      const reminderDismissed = isReminderStatus ? false : true;

      const updated: Task = {
        ...existing,
        status: newStatus,
        updatedAt: now,
        reminderFiresAt,
        reminderDismissed,
        completedAt: newStatus === 'completed' ? now : existing.completedAt,
        archivedAt: newStatus === 'archived' ? now : existing.archivedAt,
        history: [...existing.history, historyEntry],
      };

      await api.updateTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    },
    [tasks]
  );

  const removeTask = useCallback(async (taskId: string): Promise<void> => {
    await api.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const searchTasks = useCallback(
    (query: string): Task[] => {
      if (!query.trim()) return tasks;
      const q = query.toLowerCase();
      return tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.notes.some((n) => n.content.toLowerCase().includes(q)) ||
          t.links.some((l) => l.label.toLowerCase().includes(q) || l.url.toLowerCase().includes(q))
      );
    },
    [tasks]
  );

  const exportJSON = useCallback(async (): Promise<void> => {
    const allTasks = await api.getAllTasks();
    const blob = new Blob(
      [JSON.stringify({ tasks: allTasks, exportedAt: new Date().toISOString() }, null, 2)],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `svampbase-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importJSON = useCallback(async (file: File): Promise<void> => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported: Task[] = parsed.tasks ?? parsed;
    if (!Array.isArray(imported)) throw new Error('Invalid import file format');
    await api.importTasks(imported);
    const fresh = await api.getAllTasks();
    setTasks(fresh);
  }, []);

  const exportWeeklySummary = useCallback((days = 7): void => {
    downloadWeeklySummary(tasks, days);
  }, [tasks]);

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    changeTaskStatus,
    removeTask,
    searchTasks,
    exportJSON,
    importJSON,
    exportWeeklySummary,
  };
}
