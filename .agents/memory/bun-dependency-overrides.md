---
name: Bun dependency overrides
description: Limits of transitive dependency overrides in this workspace's Bun version.
---

Bun 1.3 in this workspace warns that nested overrides are unsupported. A top-level dependency pin does not necessarily replace older copies nested in the lockfile. Verify the resolved graph after package updates; use a top-level override only when it is compatible with every consumer, then rerun the audit and application checks.

**Why:** an older nested copy can remain vulnerable even when the root package is already patched.

**How to apply:** check the installed Bun version and actual dependency paths before relying on an override; avoid forcing a major version globally without testing its consumers.
