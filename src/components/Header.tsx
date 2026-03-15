import { useRef } from 'react';

interface HeaderProps {
  onSearchClick: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNewTask: () => void;
  onSessionsClick: () => void;
  onWeeklySummary: () => void;
  hasActiveSessions?: boolean;
}

export function Header({ onSearchClick, onExport, onImport, onNewTask, onSessionsClick, onWeeklySummary, hasActiveSessions }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  }

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-blue-400 font-bold text-xl tracking-tight">Svampbase</span>
        <span className="text-slate-500 text-sm hidden sm:inline">Task Tracker</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNewTask}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
        >
          + New Task
        </button>

        <button
          onClick={onSearchClick}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5"
          title="Search tasks"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline">Search</span>
        </button>

        <button
          onClick={onWeeklySummary}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors"
          title="Export a markdown summary of this week's work"
        >
          This week
        </button>

        <button
          onClick={onExport}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors"
          title="Export all tasks as JSON"
        >
          Export
        </button>

        <button
          onClick={handleImportClick}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors"
          title="Import tasks from JSON"
        >
          Import
        </button>

        <button
          onClick={onSessionsClick}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5"
          title="Manage Claude sessions"
        >
          {hasActiveSessions && (
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          )}
          Sessions
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </header>
  );
}
