import { useState, useCallback } from 'react';
import type { Task, TaskStatus } from './lib/types';
import { useTasks } from './hooks/useTasks';
import { useReminders } from './hooks/useReminders';
import { Header } from './components/Header';
import { Board } from './components/Board';
import { TaskModal } from './components/TaskModal';
import { SearchModal } from './components/SearchModal';
import { ConfirmDialog } from './components/ConfirmDialog';

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
  } = useTasks();

  const { alerts, dismissAlert } = useReminders(tasks);

  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined); // undefined = closed, null = new
  const [showSearch, setShowSearch] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
        onImport={handleImportRequest}
        onNewTask={openNewTask}
      />

      <Board
        tasks={tasks}
        alerts={alerts}
        onCardClick={openTask}
        onDismissAlert={dismissAlert}
        onAlertAction={handleAlertAction}
      />

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          allTasks={tasks}
          onSave={handleSaveTask}
          onCreate={createTask}
          onDelete={removeTask}
          onChangeStatus={changeTaskStatus}
          onClose={closeModal}
          onOpenTask={openTask}
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
    </div>
  );
}
