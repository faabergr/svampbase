Svampbase

A daily task tracking tool for managers. A progressive web app that allows managers to track their tasks. Similar to Trello or other work-tracking boards, but allows for some specific functionality for those that have their work interrupted and need to pick it back up again.

Features:
* Runs on any platform.
* Easy to export and import data, no lock-in.

A task can have different statuses:
* Waiting on dependency - I need to wait on someone else to do something
* In progress - I'm working on this right now
* Waiting on response - I sent an email, Slack, etc. to someone else and I set a timeframe when I'll check and see if they've responded, so I can ping them again (e.g., four hours, one business day, 5 business days, etc.)
* Backburnered - Something higher priority came up

A manager can attach context on tasks so that they can pick up the thread. This can include multiple of any of these:
* Links to Jira tickets
* Link to Slack thread
* Other URLs
* Notes
* Screenshots

A history of a given task is maintained, such as history of state changes. A task can be completed or archived to get it off the main board, and all tasks can be searched. A task has an identifier and can be linked to other tasks, similar to a simplified version of Jira.

The main board allows the manager to see all their in-progress, blocked, and recently back-burnered tasks. The ones they've "boomeranged" like waiting on response will pop up and remind them when the set reminder time pops up, so they can say "Yes I got a reply" and move it back to in-progress, or backburner it.

Deadlines can be set on tasks and reminders will pop up ahead of time. 