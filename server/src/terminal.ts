import { execSync } from 'child_process';

function validateUUID(id: string): string {
  if (!/^[0-9a-f-]+$/i.test(id)) {
    throw new Error(`Invalid session ID: ${id}`);
  }
  return id;
}

function escapePath(p: string): string {
  return p.replace(/'/g, "'\\''");
}

export function launchNewSession(sessionId: string, folderPath: string): void {
  const safeId = validateUUID(sessionId);
  const safeFolder = escapePath(folderPath);
  execSync(
    `osascript -e 'tell application "Terminal"' -e 'activate' -e 'do script "claude --session-id ${safeId} --add-dir \\'${safeFolder}\\'"' -e 'end tell'`
  );
}

export function resumeSession(sessionId: string, folderPath: string): void {
  const safeId = validateUUID(sessionId);
  const safeFolder = escapePath(folderPath);
  execSync(
    `osascript -e 'tell application "Terminal"' -e 'activate' -e 'do script "claude --resume ${safeId} --add-dir \\'${safeFolder}\\'"' -e 'end tell'`
  );
}
