---
description: Document a persistent platform or dependency constraint in docs/KNOWN_ISSUES.md — the kind of thing the next developer or agent would re-discover otherwise
argument-hint: "[short-summary]"
---
Append a new entry to `docs/KNOWN_ISSUES.md`. Use this when you've discovered a project-level constraint that isn't tied to the current task — something that will bite the next person who touches the same area.

Summary: $ARGUMENTS

# Steps

1. If `docs/KNOWN_ISSUES.md` does not exist, create it with a `# Known Issues` header.
2. Append an entry with fields: Status (Open / Workaround / Fixed), Issue, Workaround, Affects (paths), Ref (link/SHA).
3. Fill fields from the CURRENT session's discovery. If a field is unknown, write `<unknown>` — do not fabricate.
4. Report the entry added, and remind the user: unlike blockers, known issues are COMMITTED to git as permanent project knowledge.
