import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these are available inside the vi.mock factory (which is hoisted)
const { mockExecFileSync, mockSpawnSync } = vi.hoisted(() => ({
  mockExecFileSync: vi.fn(),
  mockSpawnSync: vi.fn(() => ({ status: 0 })),
}));

vi.mock('child_process', () => ({
  execFileSync: mockExecFileSync,
  spawnSync: mockSpawnSync,
}));

import { launchNewSession, resumeSession } from '../terminal';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const FOLDER = '/tmp/test-session';

// The command ends up as an argument passed to execFileSync (inside an osascript arg
// on macOS, or directly on Linux/Windows). Joining all args covers both cases.
function capturedCommand(): string {
  return mockExecFileSync.mock.calls[0][1].join(' ');
}

describe('launchNewSession', () => {
  beforeEach(() => mockExecFileSync.mockClear());

  it('passes the session ID to claude --session-id', () => {
    launchNewSession(VALID_UUID, FOLDER);
    expect(capturedCommand()).toContain(`--session-id ${VALID_UUID}`);
  });

  it('appends a curl callback that marks the session paused on exit', () => {
    launchNewSession(VALID_UUID, FOLDER);
    const cmd = capturedCommand();
    expect(cmd).toContain('curl');
    expect(cmd).toContain('paused');
    expect(cmd).toContain(VALID_UUID);
  });

  it('rejects an invalid session ID', () => {
    expect(() => launchNewSession('../evil', FOLDER)).toThrow();
    expect(() => launchNewSession('not-a-uuid!', FOLDER)).toThrow();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});

describe('resumeSession', () => {
  beforeEach(() => mockExecFileSync.mockClear());

  it('passes the session ID to claude --resume', () => {
    resumeSession(VALID_UUID, FOLDER);
    expect(capturedCommand()).toContain(`--resume ${VALID_UUID}`);
  });

  it('appends a curl callback that marks the session paused on exit', () => {
    resumeSession(VALID_UUID, FOLDER);
    const cmd = capturedCommand();
    expect(cmd).toContain('curl');
    expect(cmd).toContain('paused');
    expect(cmd).toContain(VALID_UUID);
  });

  it('rejects an invalid session ID', () => {
    expect(() => resumeSession('bad id', FOLDER)).toThrow();
    expect(mockExecFileSync).not.toHaveBeenCalled();
  });
});
