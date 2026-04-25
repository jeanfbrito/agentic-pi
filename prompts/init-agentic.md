---
description: Scaffold the Agentic Workflow Framework files for the current project (.claude/mytasks/ + docs/KNOWN_ISSUES.md)
---
Set up the Agentic Workflow Framework scaffolding in the CURRENT working directory.

# Steps

1. **Check state first** — don't overwrite existing content. For each path:
   - If it exists and is non-empty, leave it alone and report "already present".
   - If it doesn't exist, create it with the template.

2. **Create directory structure**:
   - `.claude/mytasks/handoffs/` (directory)
   - `.claude/mytasks/todo.md` — starter with `# Todo` heading, `## Tasks` section, and a comment explaining the DoD format.
   - `.claude/mytasks/blockers.md` — starter with `# Active Blockers` heading and a comment explaining the entry format.
   - `.claude/mytasks/findings.md` — starter with `# Findings` heading and a note that the file is ephemeral.
   - `docs/KNOWN_ISSUES.md` — starter with `# Known Issues` heading and an entry-format comment.

3. **Gitignore hygiene** — if the current directory is a git repo:
   - Run `git rev-parse --is-inside-work-tree` to confirm.
   - Check if `.gitignore` already excludes `.claude/` or `.claude`. If not, append `.claude/` on its own line.
   - Confirm `docs/KNOWN_ISSUES.md` is NOT gitignored (it should be committed).

4. **Report** — print a structured summary: created paths, skipped paths (already present), gitignore status.

Do NOT commit. Do NOT run any other setup commands.

Note: `.claude/mytasks/` is intentionally shared with Claude Code so the same project workflow state is visible from either tool.
