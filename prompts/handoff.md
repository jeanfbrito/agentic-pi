---
description: Write a cross-session handoff for the current task, so the next session can resume with full context
argument-hint: "[task-name]"
---
Write a handoff file to `.claude/mytasks/handoffs/$ARGUMENTS.md` (where `$ARGUMENTS` is the task name).

If `$ARGUMENTS` is empty, ask the user for a task name first — use a short kebab-case slug (e.g., `notification-grouping`, `calendar-sync-fix`).

# Steps

1. Ensure `.claude/mytasks/handoffs/` exists — if not, create it.
2. If the handoff file already exists, ask the user whether to overwrite, append, or abort.
3. Write (or update) the file with a template covering: What was done, Key decisions, What's next (checkboxes), Open questions, Files touched. Fill in from the CURRENT session's context.

# Rules

- Fill in ONLY what actually happened in this session. Do NOT fabricate or infer.
- Use concrete paths, function names, and specific decisions — not vague summaries.
- If there are no open questions, write "None" — don't invent any.
- Report the path you wrote to.
