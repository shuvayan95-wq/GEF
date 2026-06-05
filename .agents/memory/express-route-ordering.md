---
name: Express route ordering conflict
description: Adding a new sub-path like /players/list conflicts with existing /players/:id wildcard routes in this codebase.
---

When adding new GET endpoints that share a prefix with an existing wildcard route (e.g. `/players/:id`), the wildcard is registered first and captures the new path before it can be reached.

**Why:** Express matches routes in registration order. The players router is registered before any new router, so `/players/:id` always wins over a later-registered `/players/list`.

**How to apply:** Any new "list" or "action" sub-routes under an existing resource must use a clearly distinct path (e.g. `/players-dropdown`, not `/players/list`) to avoid being captured by the `:id` wildcard.
