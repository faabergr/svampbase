export type SessionStatus = 'active' | 'paused' | 'ended';

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  taskIds: string[];
  folderPath: string;
  createdAt: string;
  updatedAt: string;
  lastLaunchedAt?: string;
  notes?: string;
}

export interface SessionFile {
  name: string;
  size: number;
  uploadedAt: string;
}
