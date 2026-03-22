import { useRef, useState, useEffect } from 'react';

interface HeaderProps {
  onSearchClick: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNewTask: () => void;
  onSessionsClick: () => void;
  onWeeklySummary: () => void;
  onJournalClick: () => void;
  onStandupClick: () => void;
  hasActiveSessions?: boolean;
}

export function Header({ onSearchClick, onExport, onImport, onNewTask, onSessionsClick, onWeeklySummary, onJournalClick, onStandupClick, hasActiveSessions }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { onImport(file); e.target.value = ''; }
  }

  function menuAction(fn: () => void) {
    setMenuOpen(false);
    fn();
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
          onClick={onSessionsClick}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5"
          title="Manage Claude sessions"
        >
          {hasActiveSessions && (
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          )}
          Sessions
        </button>

        <button
          onClick={onStandupClick}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5"
          title="Daily standup digest"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="hidden sm:inline">Standup</span>
        </button>

        <button
          onClick={onJournalClick}
          className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5"
          title="Open journal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="hidden sm:inline">Journal</span>
        </button>

        {/* ··· menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-sm transition-colors"
            title="More options"
          >
            ···
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
              <button
                onClick={() => menuAction(onWeeklySummary)}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex flex-col gap-0.5"
              >
                <span>This week</span>
                <span className="text-xs text-slate-500">Download weekly summary (.md)</span>
              </button>

              <div className="border-t border-slate-700 my-1" />

              <button
                onClick={() => menuAction(onExport)}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex flex-col gap-0.5"
              >
                <span>Export tasks</span>
                <span className="text-xs text-slate-500">Download all tasks as JSON</span>
              </button>

              <button
                onClick={() => menuAction(() => fileInputRef.current?.click())}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors flex flex-col gap-0.5"
              >
                <span>Import tasks</span>
                <span className="text-xs text-slate-500">Replace all tasks from JSON</span>
              </button>
            </div>
          )}
        </div>

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
