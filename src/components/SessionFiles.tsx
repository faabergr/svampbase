import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionFile } from '../lib/sessionTypes';
import { getSessionFiles, uploadSessionFiles, deleteSessionFile } from '../api/sessions';

interface SessionFilesProps {
  sessionId: string;
  folderPath: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function SessionFiles({ sessionId, folderPath }: SessionFilesProps) {
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    getSessionFiles(sessionId).then(setFiles).catch(() => setFiles([]));
  }, [sessionId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleUpload = async (fileList: FileList | File[]) => {
    if (!fileList || Array.from(fileList).length === 0) return;
    setUploading(true);
    try {
      await uploadSessionFiles(sessionId, fileList);
      refresh();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (name: string) => {
    await deleteSessionFile(sessionId, name);
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  return (
    <div className="space-y-3">
      {/* Folder path hint */}
      <p className="text-slate-500 text-xs font-mono truncate" title={folderPath}>
        {folderPath}
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-900/20 text-blue-300'
            : 'border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300'
        }`}
      >
        {uploading
          ? <span className="text-sm">Uploading...</span>
          : <span className="text-sm">Drop files here or click to upload</span>
        }
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-slate-600 text-xs text-center py-2">No files uploaded yet</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div key={file.name} className="flex items-center gap-2 bg-slate-900/60 rounded px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-500 flex-shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="flex-1 text-slate-200 text-xs font-mono truncate" title={file.name}>{file.name}</span>
              <span className="text-slate-500 text-xs flex-shrink-0">{formatBytes(file.size)}</span>
              <span className="text-slate-600 text-xs flex-shrink-0 hidden sm:block">{formatTime(file.uploadedAt)}</span>
              <button
                onClick={() => handleDelete(file.name)}
                className="text-slate-600 hover:text-red-400 transition-colors text-sm flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
