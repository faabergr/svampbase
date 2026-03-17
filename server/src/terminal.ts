import { execFileSync, spawnSync } from 'child_process';

function validateUUID(id: string): string {
  if (!/^[0-9a-f-]+$/i.test(id)) throw new Error(`Invalid session ID: ${id}`);
  return id;
}

// Escape for use inside an AppleScript double-quoted string
function escapeAppleScript(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function launchDarwin(command: string, cwd: string): void {
  // The entire shell command must be escaped for AppleScript's double-quoted string
  // context. Without this, double quotes inside the curl status-callback JSON
  // (e.g. '{"status":"paused"}') prematurely close the do script string and
  // osascript exits with a syntax error.
  const shellCmd = `cd '${cwd}' && ${command}`;
  execFileSync('osascript', [
    '-e', 'tell application "Terminal"',
    '-e', 'activate',
    '-e', `do script "${escapeAppleScript(shellCmd)}"`,
    '-e', 'end tell',
  ]);
}

function launchWindows(command: string, cwd: string): void {
  // Opens a new cmd window, cds into the folder, and runs the command
  execFileSync('cmd', ['/c', 'start', 'cmd', '/k', `cd /d "${cwd}" && ${command}`]);
}

function launchLinux(command: string, cwd: string): void {
  // Try common terminal emulators in order of preference
  const candidates: [string, string[]][] = [
    ['gnome-terminal', ['--working-directory', cwd, '--', 'bash', '-c', `${command}; exec bash`]],
    ['konsole',        ['--workdir', cwd, '-e', 'bash', '-c', `${command}; exec bash`]],
    ['xfce4-terminal', ['--working-directory', cwd, '-e', `bash -c '${command}; exec bash'`]],
    ['xterm',          ['-e', `bash -c 'cd "${cwd}" && ${command}; exec bash'`]],
  ];

  for (const [term, args] of candidates) {
    const found = spawnSync('which', [term], { encoding: 'utf-8' });
    if (found.status === 0) {
      execFileSync(term, args, { detached: true });
      return;
    }
  }

  throw new Error(
    'No supported terminal emulator found. Install gnome-terminal, konsole, xfce4-terminal, or xterm.'
  );
}

function launch(command: string, cwd: string): void {
  switch (process.platform) {
    case 'darwin':  return launchDarwin(command, cwd);
    case 'win32':   return launchWindows(command, cwd);
    default:        return launchLinux(command, cwd);
  }
}

const SERVER_PORT = 3001;

function statusCallback(sessionId: string): string {
  return `curl -s -X PATCH http://localhost:${SERVER_PORT}/sessions/${sessionId} -H 'Content-Type: application/json' -d '{"status":"paused"}'`;
}

export function launchNewSession(sessionId: string, folderPath: string): void {
  const id = validateUUID(sessionId);
  launch(`claude --session-id ${id}; ${statusCallback(id)}`, folderPath);
}

export function resumeSession(sessionId: string, folderPath: string): void {
  const id = validateUUID(sessionId);
  launch(`claude --resume ${id}; ${statusCallback(id)}`, folderPath);
}
