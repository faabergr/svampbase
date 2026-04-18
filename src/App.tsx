import { useState, useCallback, useEffect } from 'react';
import type { Task, TaskStatus } from './lib/types';
import { useTasks } from './hooks/useTasks';
import { useJournal } from './hooks/useJournal';
import { useReminders } from './hooks/useReminders';
import { useSessions } from './hooks/useSessions';
import { useFocus } from './hooks/useFocus';
import { useBackendStatus } from './hooks/useBackendStatus';
import { useWeeklyReflection } from './hooks/useWeeklyReflection';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { TaskModal } from './components/TaskModal';
import { SearchModal } from './components/SearchModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SessionsPanel } from './components/SessionsPanel';
import { JournalPanel } from './components/JournalPanel';
import { StandupPanel } from './components/StandupPanel';
import { TimelinePanel } from './components/TimelinePanel';
import { TagPanel } from './components/TagPanel';
import { WeeklyReflectionBanner } from './components/WeeklyReflectionBanner';
import { generateWeeklySummary } from './lib/weeklyExport';
import { api } from './api/tasks';

export default function App() {
  const {
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
  } = useTasks();

  const { entries: journalEntries } = useJournal();
  const { alerts, dismissAlert } = useReminders(tasks);
  const { sessions } = useSessions();
  const hasActiveSessions = sessions.some((s) => s.status === 'active');
  const { focus, clearFocus } = useFocus();
  const focusedTask = focus?.taskId ? tasks.find((t) => t.id === focus.taskId) : null;
  const backendStatus = useBackendStatus();
  const { shouldShow: showReflectionBanner, dismiss: dismissReflection } = useWeeklyReflection();
  const [reflectionLaunching, setReflectionLaunching] = useState(false);

  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined); // undefined = closed, null = new
  const [showSearch, setShowSearch] = useState(false);
  const [showSessionsPanel, setShowSessionsPanel] = useState(false);
  const [showJournalPanel, setShowJournalPanel] = useState(false);
  const [showStandupPanel, setShowStandupPanel] = useState(false);
  const [showTimelinePanel, setShowTimelinePanel] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags ?? []))).sort();
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Keep the open modal in sync when the underlying task is updated externally
  // (e.g. changeTaskStatus updates the tasks array but modalTask is a stale reference)
  useEffect(() => {
    setModalTask((prev) => {
      if (!prev) return prev;
      const fresh = tasks.find((t) => t.id === (prev as Task).id);
      return fresh ?? prev;
    });
  }, [tasks]);

  const openTask = useCallback((task: Task) => {
    setModalTask(task);
  }, []);

  const openNewTask = useCallback(() => {
    setModalTask(null);
  }, []);

  const closeModal = useCallback(() => {
    setModalTask(undefined);
  }, []);

  const handleAlertAction = useCallback(
    (task: Task, newStatus: TaskStatus) => {
      changeTaskStatus(task.id, newStatus);
    },
    [changeTaskStatus]
  );

  const handleImportRequest = useCallback((file: File) => {
    setPendingImportFile(file);
    setShowImportConfirm(true);
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!pendingImportFile) return;
    try {
      await importJSON(pendingImportFile);
      setImportError(null);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    }
    setShowImportConfirm(false);
    setPendingImportFile(null);
  }, [pendingImportFile, importJSON]);

  const handleSaveTask = useCallback(
    (task: Task) => {
      updateTask(task);
    },
    [updateTask]
  );

  const handleLaunchReflection = useCallback(async () => {
    setReflectionLaunching(true);
    try {
      const summary = generateWeeklySummary(tasks, 7, journalEntries);
      const prompt = `Here is a summary of everything I worked on this week as a manager:\n\n${summary}\n\nPlease help me reflect on this week. Ask me thoughtful questions about what went well, what was challenging, any patterns you notice in my work, and what I should focus on next week.`;
      await api.launchWeeklyReflection(prompt);
      dismissReflection();
    } catch (err) {
      console.error('Failed to launch reflection:', err);
    } finally {
      setReflectionLaunching(false);
    }
  }, [tasks, journalEntries, dismissReflection]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        onSearchClick={() => setShowSearch(true)}
        onExport={exportJSON}
        onWeeklySummary={() => exportWeeklySummary(7, journalEntries)}
        onWeeklyReflection={handleLaunchReflection}
        onJournalClick={() => setShowJournalPanel((v) => !v)}
        onStandupClick={() => setShowStandupPanel((v) => !v)}
        onTimelineClick={() => setShowTimelinePanel((v) => !v)}
        onImport={handleImportRequest}
        onNewTask={openNewTask}
        onSessionsClick={() => setShowSessionsPanel((v) => !v)}
        hasActiveSessions={hasActiveSessions}
        focusedTaskId={focusedTask?.id}
        focusedTaskTitle={focusedTask ? `${focusedTask.id} · ${focusedTask.title}` : null}
        onClearFocus={() => void clearFocus()}
      />

      {backendStatus === 'offline' && (
        <div className="bg-red-950 border-b border-red-800 px-4 py-2.5 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
          <p className="text-red-200 text-sm">
            Backend not running — tasks won't load.{' '}
            <code className="font-mono text-red-300 text-xs">cd server && npm run dev</code>
          </p>
        </div>
      )}

      {showReflectionBanner && (
        <div className="px-4 pt-4">
          <WeeklyReflectionBanner
            onLaunch={handleLaunchReflection}
            onDismiss={dismissReflection}
            launching={reflectionLaunching}
          />
        </div>
      )}

      <Board
        tasks={tasks}
        alerts={alerts}
        onCardClick={openTask}
        onDismissAlert={dismissAlert}
        onAlertAction={handleAlertAction}
        onStatusChange={changeTaskStatus}
      />

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          allTasks={tasks}
          allTags={allTags}
          onSave={handleSaveTask}
          onCreate={createTask}
          onDelete={removeTask}
          onChangeStatus={changeTaskStatus}
          onClose={closeModal}
          onOpenTask={openTask}
          onTagClick={(tag) => { closeModal(); setActiveTag(tag); }}
        />
      )}

      {showSearch && (
        <SearchModal
          tasks={tasks}
          onClose={() => setShowSearch(false)}
          onSelectTask={(task) => {
            setShowSearch(false);
            openTask(task);
          }}
          searchFn={searchTasks}
        />
      )}

      {showImportConfirm && (
        <ConfirmDialog
          title="Import Tasks"
          message="This will replace all existing tasks with the imported data. This cannot be undone."
          confirmLabel="Import"
          onConfirm={handleImportConfirm}
          onCancel={() => {
            setShowImportConfirm(false);
            setPendingImportFile(null);
          }}
        />
      )}

      {importError && (
        <ConfirmDialog
          title="Import Error"
          message={importError}
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={() => setImportError(null)}
          onCancel={() => setImportError(null)}
        />
      )}

      {showSessionsPanel && (
        <SessionsPanel onClose={() => setShowSessionsPanel(false)} />
      )}

      {showJournalPanel && (
        <JournalPanel
          onClose={() => setShowJournalPanel(false)}
          onOpenTask={openTask}
          allTasks={tasks}
        />
      )}

      {showStandupPanel && (
        <StandupPanel
          tasks={tasks}
          onClose={() => setShowStandupPanel(false)}
          onOpenTask={(task) => { setShowStandupPanel(false); openTask(task); }}
        />
      )}

      {showTimelinePanel && (
        <TimelinePanel
          tasks={tasks}
          onClose={() => setShowTimelinePanel(false)}
          onOpenTask={(task) => { setShowTimelinePanel(false); openTask(task); }}
        />
      )}

      {activeTag !== null && (
        <TagPanel
          tag={activeTag}
          tasks={tasks}
          onClose={() => setActiveTag(null)}
          onOpenTask={(task) => { setActiveTag(null); openTask(task); }}
        />
      )}
    </div>
  );
}
