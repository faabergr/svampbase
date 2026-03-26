# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (frontend only)
npm run build        # TypeScript check + production build
npm test             # Run Vitest in watch mode
npm run test:run     # Run tests once (use for CI / verifying changes)

# Run a single test file
npx vitest run src/__tests__/standupDigest.test.ts
```

The app requires a backend running on `http://localhost:3001` for all task operations. The frontend is separate from the backend.

## Architecture

Svampbase is a task tracking app for managers, focused on context retention when interrupted. It's a React + TypeScript SPA backed by an Express API at `localhost:3001`.

**Stack:** React 18, TypeScript (strict), Tailwind CSS, Vite, Vitest, IndexedDB (via `idb`), PWA support.

### Data Flow

State lives in React hooks. The `App.tsx` root component owns top-level state via:
- `useTasks()` — task CRUD, calling `src/api/tasks.ts` which POSTs/PUTs/GETs to `http://localhost:3001`
- `useReminders(tasks)` — derives boomerang alerts from task state (no separate API call)
- `useJournal()`, `useSessions()`, `useBackendStatus()` — ancillary state

Hooks → API layer (`src/api/`) → Backend. Components receive state and callbacks as props from `App.tsx`.

### Key Domain Concepts

- **TaskStatus**: `in-progress | waiting-on-dependency | waiting-on-response | backburnered | completed | archived`
- **Reminders (Boomerangs)**: When a task enters a "waiting" status, `reminderFiresAt` is computed (4h, 1 business day, or 5 business days). `useReminders` polls task state and generates `Alert[]` when `reminderFiresAt <= now`.
- **StatusHistoryEntry**: Every status change is appended to `task.history` — this is the source of truth for standup digest, weekly export, and audit log display.
- **TaskLink types**: `jira | slack | url | email | github` — each renders differently in the context tab.

### Core Files

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | All TypeScript types (Task, TaskStatus, Alert, etc.) |
| `src/lib/db.ts` | IndexedDB wrapper (used for offline/cache, not primary storage) |
| `src/api/tasks.ts` | HTTP client — all backend calls go through here |
| `src/hooks/useTasks.ts` | Primary task state management hook |
| `src/lib/standupDigest.ts` | `computeStandupDigest(tasks)` — logic for morning digest |
| `src/lib/timelineUtils.ts` | `computeTimelineData(tasks)` — deadline visualization math |
| `src/lib/weeklyExport.ts` | Markdown export generation |

### Testing

Tests live in `src/__tests__/`. The pattern is pure unit tests for `src/lib/` utilities and React Testing Library tests for components. Vitest globals are enabled (no need to import `describe`/`it`/`expect`). Fake timers are used in tests that depend on `Date.now()`.

TypeScript is strict with `noUnusedLocals` and `noUnusedParameters` enabled — the build will fail if unused variables are introduced.
