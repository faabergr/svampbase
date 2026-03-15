# Svampbase

> *Svamp* is the Norwegian word for sponge — Svampbase soaks up knowledge about all your tasks so you can put them down and pick them back up without losing the thread.

A progressive web app for managers who get interrupted. Unlike generic kanban boards, Svampbase is built around the reality that your attention is constantly pulled away from work in progress — and that getting back up to speed is half the battle.

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

When you move a task to *Waiting on Response* or *Waiting on Dependency*, set a reminder duration — 4 hours, 1 business day, or 5 business days. When the timer fires, a banner appears on the board asking: did you get a reply? Move it back to *In Progress* or backburner it with one click.

Deadlines work the same way: tasks due within 24 hours surface a reminder banner automatically.

### Rich context on every task

Managers lose context when they context-switch. Svampbase lets you attach everything you need to pick a task back up:

- Jira ticket links
- Slack thread links
- Any other URL
- Free-text notes
- Screenshots

Each task also maintains a full **status history** so you can see exactly what happened and when.

### Linked tasks

Tasks can reference each other, similar to a simplified Jira. Navigate between related tasks directly from the task modal.

### Search

Full-text search across all tasks — title, description, ID, notes, and links — including completed and archived tasks.

### Export / Import

All data lives in your browser (IndexedDB — no account, no server). Export everything to a single JSON file at any time. Import it back on any device. No lock-in.

## Getting started

**Prerequisites:** Node.js 18+

```bash
git clone <repo-url>
cd svampbase
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
npm run build
```

The output in `dist/` is a fully static PWA — host it on any static file server. Install it to your home screen from the browser for an app-like experience.

## Tech stack

- [React](https://react.dev) + TypeScript
- [Vite](https://vitejs.dev) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app)
- [Tailwind CSS](https://tailwindcss.com)
- [idb](https://github.com/jakearchibald/idb) (IndexedDB wrapper)

## Contributing

Issues and pull requests are welcome. For larger changes, open an issue first to discuss the approach.

## License

MIT
