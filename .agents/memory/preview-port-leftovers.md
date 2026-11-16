---
name: Preview port leftovers
description: Diagnose Replit previews when Vite starts on a fallback port.
---

If the managed Vite workflow reports that port 5000 is occupied and moves to 5001, check for orphaned Vite processes from earlier runs. The preview is configured for port 5000, so a second listener can leave the preview attached to the stale server.

**Why:** workflow restarts may leave an older app process bound to the preview port.

**How to apply:** identify the listener with `lsof` and process groups, terminate only the confirmed stale app process, restart the managed workflow, and verify a single listener on port 5000 with repeated successful HTTP requests.
