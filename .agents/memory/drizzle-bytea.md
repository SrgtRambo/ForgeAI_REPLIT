---
name: Drizzle bytea mapping
description: PostgreSQL binary columns with Drizzle ORM 0.45 and postgres-js
---

In Drizzle ORM 0.45, `drizzle-orm/pg-core` does not export a `bytea` column builder. Define the PostgreSQL type through `customType({ dataType: () => "bytea" })`; the `postgres` driver can persist and return binary buffers.

**Why:** The migration generator failed when the schema imported `bytea` directly, even though PostgreSQL supports the type.

**How to apply:** When persisting binary archives or blobs with this Drizzle version, use a custom type and verify the generated migration emits PostgreSQL `bytea`.
