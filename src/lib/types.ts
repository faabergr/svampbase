export type TaskStatus =
  | 'in-progress'
  | 'waiting-on-dependency'
  | 'waiting-on-response'
  | 'backburnered'
  | 'completed'
  | 'archived';

export type ReminderDuration = '4h' | '1bd' | '5bd';

export interface TaskLink {
  id: string;
  type: 'jira' | 'slack' | 'url' | 'email' | 'github';
  url: string;
  label: string;
}

export interface TaskNote {
  id: string;
  content: string;
  createdAt: string; // ISO
}

export interface TaskScreenshot {
  id: string;
  dataUrl: string; // base64
  caption: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  timestamp: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  note?: string;
}

export interface Task {
  id: string; // e.g. TASK-001
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  deadline?: string; // ISO date string
  reminderDuration?: ReminderDuration; // set when status = waiting-on-response
  reminderFiresAt?: string; // computed ISO datetime when reminder fires
  reminderDismissed?: boolean; // true once user has acted on the boomerang
  links: TaskLink[];
  notes: TaskNote[];
  screenshots: TaskScreenshot[];
  relatedTaskIds: string[];
  history: StatusHistoryEntry[];
  completedAt?: string;
  archivedAt?: string;
  tags?: string[];
}

export interface Alert {
  type: 'boomerang' | 'deadline';
  task: Task;
}

export interface JournalEntry {
  id: string;
  content: string; // plain text; #TASK-XXX references are parsed on render
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
