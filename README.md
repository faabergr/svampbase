# Svampbase

> *Svamp* is the Norwegian word for sponge — Svampbase soaks up knowledge about all your tasks so you can put them down and pick them back up without losing the thread.

A task tracking tool for managers who get interrupted. Unlike generic kanban boards, Svampbase is built around the reality that your attention is constantly pulled away — and that getting back up to speed is half the battle.

## Features

### Task board

Four columns covering the full lifecycle of in-flight work:

| Status | Meaning |
|---|---|
| **In Progress** | Actively working on this right now |
| **Waiting on Dependency** | Blocked until someone else does something |
| **Waiting on Response** | Sent a message — set a timer to follow up |
| **Backburnered** | Higher priority came up; revisit later |

Tasks can also be marked **Complete** or **Archived** to get them off the board without losing history.

### Boomerang reminders

When you move a task to *Waiting on Response* or *Waiting on Dependency*, set a reminder duration — 4 hours, 1 business day, or 5 business days. When the timer fires, a banner appears on the board: did you get a reply? Move it back to *In Progress* or backburner it with one click. Deadlines work the same way.

Task cards show a clock icon when a reminder is set — hover it to see exactly when it fires.

### Rich context on every task

Each task has a 4-tab modal for capturing everything you need to pick it back up:

- **Details** — title, description, status, deadline, reminder duration
- **Context** — Jira links, Slack links, URLs, free-text notes, screenshots
- **History** — full log of every status change with timestamps and optional notes
- **Related** — link tasks to each other, navigate between them directly

### Claude sessions

From any task, open the **Sessions** tab to create a Claude Code session tied to that task. The session launches in Terminal with its own workspace folder. You can:

- Upload files to the session folder from the browser — Claude can read them immediately
- Reveal the session folder in Finder
- Pause, resume, and end sessions
- See all active sessions across tasks from the Sessions panel in the header

### Daily standup digest

The **Standup** button in the header opens a digest panel for your morning standup. Three sections at a glance:

- **Worked on yesterday** — tasks with status changes yesterday, plus anything that's been in-progress since before today
- **Reminders firing** — undismissed boomerang reminders that are due or overdue
- **Overdue** — tasks with a past deadline, sorted by most overdue first

Click any task to open it directly.

### Weekly summary

The **This week** button exports a Markdown file of everything you worked on in the last 7 days — completed tasks, archived tasks, and what's still in flight. Each entry includes links, notes, duration, and status journey. Useful as brag-sheet material, self-review input, or context to hand to Claude.

### Search

Full-text search across all tasks — title, description, ID, notes, and links — including completed and archived tasks.

### Export / Import

Export all tasks to a single JSON file at any time. Import it back on any machine. Your data is stored as a plain JSON file on disk (`server/data/tasks.json`) — readable in any editor, committable to a private git repo, and never locked into a proprietary format.

---

## Getting started

**Prerequisites:** Node.js 18+

Both the frontend and backend need to be running.

### 1. Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 2. Backend

```bash
cd server
npm install
npm run dev
```

The backend runs on `http://localhost:3001` and manages task storage, Claude session launching, and file uploads. The frontend will show an offline notice for session features if it can't reach the backend, but task management requires it.

### 3. Tests

**Backend** — covers the sessions CRUD layer, terminal command building, and the Express API routes:

```bash
cd server
npm test          # run once
npm run test:watch  # re-run on file changes
```

**Frontend** — covers task modal interactions, utility functions, weekly export logic, and the standup digest:

```bash
npm test          # run once
npm run test:watch  # re-run on file changes
```

All tests run in under a second. No external services or running backend required.

### Build for production

```bash
npm run build
```

The output in `dist/` is a static PWA. Host it on any static file server and install it to your home screen for an app-like experience. The backend still needs to run locally alongside it.

---

## Tech stack

**Frontend**
- [React](https://react.dev) + TypeScript
- [Vite](https://vitejs.dev) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app)
- [Tailwind CSS](https://tailwindcss.com)

**Backend**
- [Express](https://expressjs.com) + TypeScript + [tsx](https://github.com/privatenumber/tsx)
- Plain JSON files for storage (`server/data/`)
- [multer](https://github.com/expressjs/multer) for file uploads
- Terminal launching via `osascript` (macOS), `cmd` (Windows), or auto-detected emulator (Linux: gnome-terminal, konsole, xfce4-terminal, xterm)

---

## Contributing

Issues and pull requests are welcome. For larger changes, open an issue first to discuss the approach.

## License

MIT
