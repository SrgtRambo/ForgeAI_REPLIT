---
name: Vite watcher limits
description: Replit workspace directories that should not be watched by the Vite dev server.
---

When setting Vite's `server.watch.ignored`, explicitly exclude dependency and Replit-generated workspace directories, including `node_modules`, `.cache`, and `.local`. Narrow watcher exclusions caused file-descriptor exhaustion and a broken preview in this workspace.

**Why:** the workspace cache is large, and Vite can otherwise traverse directories that do not contain app source.

**How to apply:** keep source files watched, but exclude dependencies, Git metadata, package caches, skill metadata, and generated build directories.
