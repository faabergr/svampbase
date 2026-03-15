import { useState, useEffect, useRef } from 'react';
import type { Task } from '../lib/types';
import { STATUS_LABELS } from '../lib/utils';

interface SearchModalProps {
  tasks: Task[];
  onClose: () => void;
  onSelectTask: (task: Task) => void;
  searchFn: (query: string) => Task[];
}

const STATUS_COLORS: Record<string, string> = {
  'in-progress': 'text-blue-400',
  'waiting-on-dependency': 'text-orange-400',
  'waiting-on-response': 'text-purple-400',
  'backburnered': 'text-slate-400',
  'completed': 'text-green-400',
  'archived': 'text-slate-500',
};

export function SearchModal({ onClose, onSelectTask, searchFn }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Task[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setResults(searchFn(query));
  }, [query, searchFn]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-16 bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-3 border-b border-slate-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks by title, ID, notes, links..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-sm"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-sm px-1">✕</button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 && query && (
            <p className="text-slate-500 text-sm text-center py-8">No tasks found</p>
          )}
          {results.length === 0 && !query && (
            <p className="text-slate-600 text-sm text-center py-8">Start typing to search</p>
          )}
          {results.map((task) => (
            <button
              key={task.id}
              onClick={() => { onSelectTask(task); onClose(); }}
              className="w-full text-left px-4 py-3 hover:bg-slate-700 border-b border-slate-700/50 last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-slate-400">{task.id}</span>
                <span className={`text-xs ${STATUS_COLORS[task.status] ?? 'text-slate-400'}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
              <p className="text-slate-200 text-sm">{task.title}</p>
              {task.description && (
                <p className="text-slate-500 text-xs mt-0.5 truncate">{task.description}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
