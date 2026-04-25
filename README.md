# agentic-pi

> **Agentic Workflow Framework for [pi](https://github.com/mariozechner/pi).** Orchestrator-by-default + 8 specialized subagents + 5 slash commands. Pi port of [the Claude Code framework](https://gist.github.com/jeanfbrito/7d28eb54ceed004c4b5b7233afac0a9b).

## What it does

When installed, every pi session boots with the **Orchestrator** as the default operating mode. The model thinks, briefs, and **delegates implementation to specialist subagents** via the `subagent` tool — it does not edit code itself for non-trivial work. This keeps the expensive model coordinating and the cheap models executing, with isolated context windows for each subagent.

| Layer | What ships |
|---|---|
| **Spec** | `AGENTIC.md` — the operating rules. Injected into every turn's system prompt by the bundled extension. |
| **Subagents** | 8 markdown definitions (planner, auditor, reviewer, builder-smart, builder-fast, finder, researcher, tester). Auto-loaded by the bundled (vendored) `subagent` extension. |
| **Slash commands** | `/agentic`, `/handoff`, `/blocker`, `/known-issue`, `/init-agentic`. Auto-loaded as pi prompt templates. |
| **Hooks** | One pi extension wraps the equivalent of Claude Code's `UserPromptSubmit` reinforcement + `SessionStart` blocker/handoff scanner. |

## Install

```bash
# global (recommended)
pi install git:github.com/jeanfbrito/agentic-pi
# or pin a release
pi install git:github.com/jeanfbrito/agentic-pi@v1.0.0

# project-local (writes to .pi/settings.json)
pi install -l git:github.com/jeanfbrito/agentic-pi

# from a local checkout (development)
pi install /path/to/agentic-pi
```

Then `/reload` or restart pi.

## Verify

```bash
pi --list-tools | grep subagent       # should list 'subagent'
```

In a pi session:

```
/orchestrator status                   # → ON | spec loaded: 13242 bytes
```

## Usage

### Default Orchestrator mode

For any non-trivial task, just describe what you want — the model will write a brief, dispatch finders/researchers in parallel, then builders, then a reviewer. Example:

> Fix the bug where login fails on Safari mobile when the keyboard appears

The model dispatches `finder` to map the auth flow, `researcher` to confirm Safari quirks via context7, `builder-smart` to patch, `reviewer` to validate, and reports back.

### Explicit dispatch

```
/agentic refactor the auth middleware to support OAuth   # default tier: medium
/agentic rename FOO to BAR --tier=trivial                # one fast builder, no reviewer
/agentic migrate from Mongo to Postgres --tier=full      # full pipeline
```

Tiers control pipeline depth (and cost):

| Tier | Pipeline |
|---|---|
| `trivial` | Planner brief → one `builder-fast` |
| `medium` *(default)* | Planner → Finders/Researchers (parallel) → Builders |
| `full` | + Reviewer + Tester loop |

### Multi-session work

```
/handoff <task-name>          # snapshot current state for next session
/blocker <summary>            # halt and ask the user
/known-issue <summary>        # commit a permanent project constraint
/init-agentic                 # scaffold .claude/mytasks/ in the current project
```

### Toggles

```
/orchestrator status          # show on/off + injection count + spec load status
/orchestrator off             # disable work-verb reinforcement (this session)
/orchestrator on              # re-enable

# Per-turn overrides spoken in the prompt:
"do it yourself ..."          # one-turn bypass
"off orchestrator ..."        # session-wide bypass
```

## Project state

Working files live in `.claude/mytasks/` (gitignored), **shared with Claude Code** so the same project state is interchangeable between pi and CC:

```
project-root/
├── .claude/                        # gitignored (shared)
│   └── mytasks/
│       ├── todo.md                 # tasks + done criteria
│       ├── blockers.md             # unresolved ambiguity (halts work)
│       ├── findings.md             # ephemeral session discoveries
│       └── handoffs/<task>.md      # cross-session continuation
└── docs/
    └── KNOWN_ISSUES.md             # committed — permanent project knowledge
```

Switch the path by changing the `MYTASKS` constant at the top of `extensions/agentic-orchestrator.ts`.

## Model tier mapping

| Tier | Model | Used by |
|---|---|---|
| Reasoning | `claude-opus-4-7` | planner, auditor |
| Smart | `claude-sonnet-4-5` | reviewer, builder-smart |
| Fast | `claude-haiku-4-5` | finder, researcher, builder-fast, tester |

Override per agent by editing `model:` in `agents/<name>.md` after install (or fork the package).

## Override agents per project

User agents at `~/.pi/agent/agents/<name>.md` and project agents at `.pi/agents/<name>.md` **override** the bundled package agents of the same name. The vendored subagent extension's discovery order is `package → user → project` (last write wins).

## Architecture notes

- **Why `before_agent_start` injection instead of an `AGENTS.md` file?** Pi auto-loads `~/.pi/agent/AGENTS.md` as global context, but **packages can't ship there**. The orchestrator extension reads `AGENTIC.md` from the package dir at module load and appends it to every turn's `event.systemPrompt`. Functionally equivalent to Claude Code's `@AGENTIC.md` import.
- **Why vendor the `subagent` extension?** Pi's bundled subagent dispatcher (`examples/extensions/subagent/`) is sample code, not a published package, and only discovers agents from `~/.pi/agent/agents/` and `.pi/agents/`. The vendored copy adds a third source — the package's own `agents/` directory — so all 8 subagents ship with the install. The patch is two lines plus a new `packageAgentDirs` parameter; upstream changes are easy to merge.
- **Why `.claude/mytasks/` and not `.pi/mytasks/`?** Same project workflow data should work from either tool. Pi has no convention against `.claude/`.

## Uninstall

```bash
pi remove git:github.com/jeanfbrito/agentic-pi
# or, if installed from local path:
pi remove /path/to/agentic-pi
```

Then `/reload`. Project state in `.claude/mytasks/` is untouched.

## Known issues

### `/reload` doesn't fully refresh after package install (pi 0.70.2)

After running `pi install git:github.com/jeanfbrito/agentic-pi` (or any local-path install), **fully restart pi** (quit + relaunch) instead of using `/reload`.

**Symptom:** in the running interactive session, auto-discovered extensions from `~/.pi/agent/extensions/*.ts` (e.g. third-party hooks like `rtk-rewrite`) stop firing on `tool_call`, while the package's own extensions and prompt templates load correctly.

**Verification:** a fresh `pi -p "..."` from any cwd shows everything working; only the long-running interactive session held over from before the install is affected.

**Workaround:** quit pi entirely (Ctrl+D twice / kill the process) and relaunch. Resumes the conversation, picks up the new package, and re-discovers global extensions.

## Provenance

- Original framework: <https://gist.github.com/jeanfbrito/7d28eb54ceed004c4b5b7233afac0a9b>
- Vendored subagent dispatcher: [@mariozechner/pi-coding-agent](https://github.com/mariozechner/pi) `examples/extensions/subagent/` (MIT)

## License

MIT. See [LICENSE](./LICENSE).
