import { useState, useCallback } from 'react';
import type {
  Task,
  TaskStatus,
  TaskLink,
  TaskNote,
  TaskScreenshot,
  ReminderDuration,
} from '../lib/types';
import { nanoid, formatRelativeTime, STATUS_LABELS, REMINDER_LABELS, computeReminderFiresAt } from '../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';

type Tab = 'details' | 'context' | 'history' | 'related';

interface TaskModalProps {
  task: Task | null; // null = create mode
  allTasks: Task[];
  onSave: (task: Task) => void;
  onCreate: (partial: Partial<Task> & { title: string }) => void;
  onDelete: (taskId: string) => void;
  onChangeStatus: (taskId: string, status: TaskStatus, note?: string) => void;
  onClose: () => void;
  onOpenTask: (task: Task) => void;
}

const ALL_STATUSES: TaskStatus[] = [
  'in-progress',
  'waiting-on-dependency',
  'waiting-on-response',
  'backburnered',
  'completed',
  'archived',
];

const STATUS_COLORS: Record<string, string> = {
  'in-progress': 'text-blue-400',
  'waiting-on-dependency': 'text-orange-400',
  'waiting-on-response': 'text-purple-400',
  'backburnered': 'text-slate-400',
  'completed': 'text-green-400',
  'archived': 'text-slate-500',
};

export function TaskModal({
  task,
  allTasks,
  onSave,
  onCreate,
  onDelete,
  onChangeStatus,
  onClose,
  onOpenTask,
}: TaskModalProps) {
  const isNew = task === null;

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'in-progress');
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.slice(0, 10) : '');
  const [reminderDuration, setReminderDuration] = useState<ReminderDuration | ''>(
    task?.reminderDuration ?? ''
  );
  const [links, setLinks] = useState<TaskLink[]>(task?.links ?? []);
  const [notes, setNotes] = useState<TaskNote[]>(task?.notes ?? []);
  const [screenshots, setScreenshots] = useState<TaskScreenshot[]>(task?.screenshots ?? []);
  const [relatedTaskIds, setRelatedTaskIds] = useState<string[]>(task?.relatedTaskIds ?? []);

  // New link form
  const [newLinkType, setNewLinkType] = useState<TaskLink['type']>('url');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  // New note form
  const [newNoteContent, setNewNoteContent] = useState('');

  // Status change note
  const [statusChangeNote, setStatusChangeNote] = useState('');

  // Related task search
  const [relatedSearch, setRelatedSearch] = useState('');

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Import confirm
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  void showImportConfirm;
  void setShowImportConfirm;

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!isNew && task && newStatus !== task.status) {
      onChangeStatus(task.id, newStatus, statusChangeNote || undefined);
      setStatusChangeNote('');
    }
    setStatus(newStatus);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const deadlineISO = deadline ? new Date(deadline).toISOString() : undefined;
    const rd = reminderDuration || undefined;

    if (isNew) {
      onCreate({
        title: title.trim(),
        description,
        status,
        deadline: deadlineISO,
        reminderDuration: (status === 'waiting-on-response' || status === 'waiting-on-dependency') ? rd : undefined,
        links,
        notes,
        screenshots,
        relatedTaskIds,
      });
    } else {
      const now = new Date().toISOString();
      const isReminderStatus = status === 'waiting-on-response' || status === 'waiting-on-dependency';
      let reminderFiresAt = task!.reminderFiresAt;
      if (isReminderStatus && rd && rd !== task!.reminderDuration) {
        reminderFiresAt = computeReminderFiresAt(rd, new Date()).toISOString();
      }
      const updated: Task = {
        ...task!,
        title: title.trim(),
        description,
        status,
        deadline: deadlineISO,
        reminderDuration: isReminderStatus ? rd : undefined,
        reminderFiresAt: isReminderStatus ? reminderFiresAt : undefined,
        links,
        notes,
        screenshots,
        relatedTaskIds,
        updatedAt: now,
      };
      onSave(updated);
    }
    onClose();
  };

  const addLink = () => {
    if (!newLinkUrl.trim()) return;
    setLinks((prev) => [
      ...prev,
      { id: nanoid(), type: newLinkType, url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() },
    ]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const addNote = () => {
    if (!newNoteContent.trim()) return;
    setNotes((prev) => [
      ...prev,
      { id: nanoid(), content: newNoteContent.trim(), createdAt: new Date().toISOString() },
    ]);
    setNewNoteContent('');
  };

  const addScreenshot = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setScreenshots((prev) => [
        ...prev,
        { id: nanoid(), dataUrl, caption: file.name, createdAt: new Date().toISOString() },
      ]);
    };
    reader.readAsDataURL(file);
  }, []);

  const filteredRelatedCandidates = allTasks.filter(
    (t) =>
      t.id !== task?.id &&
      !relatedTaskIds.includes(t.id) &&
      (relatedSearch === '' ||
        t.title.toLowerCase().includes(relatedSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(relatedSearch.toLowerCase()))
  );

  const relatedTasks = allTasks.filter((t) => relatedTaskIds.includes(t.id));

  const TABS: { id: Tab; label: string }[] = [
    { id: 'details', label: 'Details' },
    { id: 'context', label: `Context${links.length + notes.length + screenshots.length > 0 ? ` (${links.length + notes.length + screenshots.length})` : ''}` },
    { id: 'history', label: 'History' },
    { id: 'related', label: `Related${relatedTaskIds.length > 0 ? ` (${relatedTaskIds.length})` : ''}` },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <div>
              <span className="text-slate-400 text-xs font-mono">{isNew ? 'New Task' : task?.id}</span>
              <h2 className="text-white font-semibold text-lg leading-tight">
                {isNew ? 'Create Task' : (title || 'Untitled')}
              </h2>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl px-1">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700 px-5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>

                  {!isNew && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={statusChangeNote}
                        onChange={(e) => setStatusChangeNote(e.target.value)}
                        placeholder="Optional note for status change..."
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>

                {(status === 'waiting-on-response' || status === 'waiting-on-dependency') && (
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-1">Reminder Duration</label>
                    <select
                      value={reminderDuration}
                      onChange={(e) => setReminderDuration(e.target.value as ReminderDuration | '')}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">No reminder</option>
                      {(Object.keys(REMINDER_LABELS) as ReminderDuration[]).map((r) => (
                        <option key={r} value={r}>{REMINDER_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {!isNew && task && (
                  <div className="pt-2 border-t border-slate-700 flex gap-3">
                    <button
                      onClick={() => handleStatusChange('completed')}
                      className="flex-1 bg-green-800 hover:bg-green-700 text-green-100 text-sm py-2 rounded transition-colors"
                    >
                      Mark Complete
                    </button>
                    <button
                      onClick={() => handleStatusChange('archived')}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm py-2 rounded transition-colors"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="bg-red-900 hover:bg-red-800 text-red-200 text-sm px-3 py-2 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'context' && (
              <div className="space-y-6">
                {/* Add Link */}
                <section>
                  <h3 className="text-slate-300 text-sm font-semibold mb-2">Add Link</h3>
                  <div className="flex gap-2 flex-wrap">
                    <select
                      value={newLinkType}
                      onChange={(e) => setNewLinkType(e.target.value as TaskLink['type'])}
                      className="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="jira">Jira</option>
                      <option value="slack">Slack</option>
                      <option value="url">URL</option>
                    </select>
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder="Label (optional)"
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={addLink}
                      className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </section>

                {/* Links list */}
                {links.length > 0 && (
                  <section>
                    <h3 className="text-slate-300 text-sm font-semibold mb-2">Links</h3>
                    <div className="space-y-1.5">
                      {links.map((link) => (
                        <div key={link.id} className="flex items-center gap-2 bg-slate-900/50 rounded px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            link.type === 'jira' ? 'bg-blue-900/60 text-blue-300' :
                            link.type === 'slack' ? 'bg-purple-900/60 text-purple-300' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {link.type}
                          </span>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-sm text-blue-400 hover:text-blue-300 truncate"
                          >
                            {link.label || link.url}
                          </a>
                          <button
                            onClick={() => setLinks((prev) => prev.filter((l) => l.id !== link.id))}
                            className="text-slate-500 hover:text-red-400 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Add Note */}
                <section>
                  <h3 className="text-slate-300 text-sm font-semibold mb-2">Add Note</h3>
                  <div className="flex gap-2">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Write a note..."
                      rows={2}
                      className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <button
                      onClick={addNote}
                      className="bg-blue-700 hover:bg-blue-600 text-white text-sm px-3 py-2 rounded transition-colors self-end"
                    >
                      Add
                    </button>
                  </div>
                </section>

                {/* Notes list */}
                {notes.length > 0 && (
                  <section>
                    <h3 className="text-slate-300 text-sm font-semibold mb-2">Notes</h3>
                    <div className="space-y-2">
                      {notes.map((note) => (
                        <div key={note.id} className="bg-slate-900/50 rounded px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-slate-200 text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                            <button
                              onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                              className="text-slate-500 hover:text-red-400 text-sm flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-slate-500 text-xs mt-1">{formatRelativeTime(note.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Add Screenshot */}
                <section>
                  <h3 className="text-slate-300 text-sm font-semibold mb-2">Add Screenshot</h3>
                  <label className="cursor-pointer inline-block bg-slate-900 border border-slate-600 border-dashed rounded px-4 py-3 text-slate-400 hover:text-slate-200 hover:border-slate-500 text-sm transition-colors">
                    Click to upload image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) addScreenshot(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </section>

                {/* Screenshots list */}
                {screenshots.length > 0 && (
                  <section>
                    <h3 className="text-slate-300 text-sm font-semibold mb-2">Screenshots</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {screenshots.map((ss) => (
                        <div key={ss.id} className="relative group bg-slate-900/50 rounded overflow-hidden">
                          <img src={ss.dataUrl} alt={ss.caption} className="w-full h-32 object-cover" />
                          <div className="px-2 py-1 flex items-center justify-between">
                            <span className="text-xs text-slate-400 truncate">{ss.caption}</span>
                            <button
                              onClick={() => setScreenshots((prev) => prev.filter((s) => s.id !== ss.id))}
                              className="text-slate-500 hover:text-red-400 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                {(!task || task.history.length === 0) && (
                  <p className="text-slate-500 text-sm text-center py-8">No history yet</p>
                )}
                <div className="space-y-2">
                  {(task?.history ?? []).slice().reverse().map((entry) => (
                    <div key={entry.id} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-slate-500 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.fromStatus && (
                            <>
                              <span className={`text-xs font-medium ${STATUS_COLORS[entry.fromStatus] ?? 'text-slate-400'}`}>
                                {STATUS_LABELS[entry.fromStatus]}
                              </span>
                              <span className="text-slate-600 text-xs">→</span>
                            </>
                          )}
                          <span className={`text-xs font-medium ${STATUS_COLORS[entry.toStatus] ?? 'text-slate-400'}`}>
                            {STATUS_LABELS[entry.toStatus]}
                          </span>
                          <span className="text-slate-500 text-xs ml-auto">{formatRelativeTime(entry.timestamp)}</span>
                        </div>
                        {entry.note && (
                          <p className="text-slate-400 text-xs mt-0.5">{entry.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'related' && (
              <div className="space-y-4">
                {/* Linked tasks */}
                {relatedTasks.length > 0 && (
                  <section>
                    <h3 className="text-slate-300 text-sm font-semibold mb-2">Linked Tasks</h3>
                    <div className="space-y-1.5">
                      {relatedTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 bg-slate-900/50 rounded px-3 py-2">
                          <span className="text-xs font-mono text-slate-400">{t.id}</span>
                          <button
                            onClick={() => onOpenTask(t)}
                            className="flex-1 text-left text-sm text-slate-200 hover:text-blue-400 truncate transition-colors"
                          >
                            {t.title}
                          </button>
                          <span className={`text-xs ${STATUS_COLORS[t.status] ?? 'text-slate-400'}`}>
                            {STATUS_LABELS[t.status]}
                          </span>
                          <button
                            onClick={() => setRelatedTaskIds((prev) => prev.filter((id) => id !== t.id))}
                            className="text-slate-500 hover:text-red-400 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Search to add */}
                <section>
                  <h3 className="text-slate-300 text-sm font-semibold mb-2">Link a Task</h3>
                  <input
                    type="text"
                    value={relatedSearch}
                    onChange={(e) => setRelatedSearch(e.target.value)}
                    placeholder="Search by task ID or title..."
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-2"
                  />
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {filteredRelatedCandidates.slice(0, 10).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setRelatedTaskIds((prev) => [...prev, t.id])}
                        className="w-full text-left flex items-center gap-2 bg-slate-900/50 hover:bg-slate-700 rounded px-3 py-2 transition-colors"
                      >
                        <span className="text-xs font-mono text-slate-400">{t.id}</span>
                        <span className="text-sm text-slate-200 flex-1 truncate">{t.title}</span>
                        <span className={`text-xs ${STATUS_COLORS[t.status] ?? 'text-slate-400'}`}>
                          {STATUS_LABELS[t.status]}
                        </span>
                      </button>
                    ))}
                    {filteredRelatedCandidates.length === 0 && (
                      <p className="text-slate-500 text-xs text-center py-4">
                        {relatedSearch ? 'No matching tasks' : 'No other tasks to link'}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 px-5 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              {isNew ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && task && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete ${task.id} "${task.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { onDelete(task.id); onClose(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
