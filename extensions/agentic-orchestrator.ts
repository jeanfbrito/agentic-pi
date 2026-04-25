/**
 * agentic-orchestrator — pi extension that ports two Claude Code hooks plus
 * loads the bundled AGENTIC.md spec into every turn's system prompt.
 *
 * Replaces the Claude Code framework's hook+import setup at
 * https://gist.github.com/jeanfbrito/7d28eb54ceed004c4b5b7233afac0a9b
 * with a single self-contained pi extension.
 *
 * Hooks:
 *   - `before_agent_start`
 *       1. Always: append the bundled AGENTIC.md spec to `event.systemPrompt`
 *          so the orchestrator-mode directive is in scope every turn (this
 *          mirrors what Claude Code's `@AGENTIC.md` import does globally).
 *       2. Conditionally: append a one-line reinforcement reminder when the
 *          user prompt contains a "work verb" and is not opted out, mirroring
 *          the original `~/.claude/hooks/orchestrator.sh` UserPromptSubmit hook.
 *
 *   - `session_start`
 *       Scan `cwd/.claude/mytasks/` for blockers + handoffs and report via
 *       `setStatus` + `setWidget` + `notify`. Mirrors the inline shell
 *       SessionStart hook in `~/.claude/settings.json`. Silent no-op when
 *       `.claude/mytasks/` doesn't exist in the project.
 *
 * Toggle the work-verb reinforcement at runtime with /orchestrator on|off|status.
 * The AGENTIC.md spec injection is unconditional (the framework's whole point).
 *
 * Project-state location: `.claude/mytasks/` — kept identical to Claude Code
 * so the same project state is interchangeable between the two tools.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// ----- bundled AGENTIC.md spec ------------------------------------------------

// Resolve `<package-root>/AGENTIC.md` from this file's location. This file
// lives at <package-root>/extensions/agentic-orchestrator.ts, so the spec is
// one level up. Read once at module load — small file, kept in memory.
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AGENTIC_MD_PATH = join(PACKAGE_ROOT, "AGENTIC.md");

let AGENTIC_SPEC = "";
try {
	AGENTIC_SPEC = readFileSync(AGENTIC_MD_PATH, "utf8");
} catch (err) {
	// Fail loud-but-non-fatal: log to stderr so a packaging mistake is visible
	// without crashing pi for the user.
	// eslint-disable-next-line no-console
	console.error(`[agentic-pi] Failed to load AGENTIC.md from ${AGENTIC_MD_PATH}:`, err);
}

// ----- session_start: blockers / handoffs scanner -----------------------------

const MYTASKS = ".claude/mytasks";
const BLOCKER_HEADER_RE = /^## [0-9]{4}-/m;

function scanProjectState(cwd: string): {
	armed: boolean;
	blockers: boolean;
	handoffs: string[];
} {
	const dir = join(cwd, MYTASKS);
	if (!existsSync(dir)) return { armed: false, blockers: false, handoffs: [] };

	let blockers = false;
	const blockersFile = join(dir, "blockers.md");
	try {
		if (existsSync(blockersFile)) {
			const content = readFileSync(blockersFile, "utf8");
			blockers = BLOCKER_HEADER_RE.test(content);
		}
	} catch {
		// ignore read errors — be silent
	}

	let handoffs: string[] = [];
	const handoffDir = join(dir, "handoffs");
	try {
		if (existsSync(handoffDir) && statSync(handoffDir).isDirectory()) {
			handoffs = readdirSync(handoffDir)
				.filter((f) => f.endsWith(".md"))
				.map((f) => join(MYTASKS, "handoffs", f));
		}
	} catch {
		// ignore
	}

	return { armed: true, blockers, handoffs };
}

// ----- before_agent_start: orchestrator reinforcement -------------------------

// Mirrors the bash regex in the original orchestrator.sh
const WORK_VERBS_RE =
	/(^|[^a-zA-Z])(fix|implement|refactor|create|update|rename|migrate|build|patch|port|deploy|install|generate|rework|wire|scaffold|bootstrap|integrate|modify|rewrite|extend)[a-zA-Z]*([^a-zA-Z]|$)/i;

// Opt-outs and framework slash commands handle their own mode — skip reminder.
const BYPASS_TOKENS = [
	"off orchestrator",
	"orchestrator off",
	"do it yourself",
	"/agentic",
	"/handoff",
	"/blocker",
	"/known-issue",
	"/init-agentic",
];

const REMINDER =
	"orchestrator: delegate implementation to subagents (builder-fast/builder-smart, finder, researcher, tester) via the `subagent` tool; edit files yourself only for trivial one-liners or files already in context. See AGENTIC.md § Operating Mode (above).";

function shouldReinforce(prompt: string): boolean {
	if (!prompt || prompt.length < 30) return false;
	const lower = prompt.toLowerCase();
	for (const token of BYPASS_TOKENS) {
		if (lower.includes(token)) return false;
	}
	return WORK_VERBS_RE.test(prompt);
}

// ----- extension entry --------------------------------------------------------

export default function (pi: ExtensionAPI) {
	let reinforcementEnabled = true;
	let injections = 0;

	pi.on("session_start", async (_event, ctx) => {
		const state = scanProjectState(ctx.cwd);
		if (!state.armed) return; // silent no-op when project isn't initialized

		const lines: string[] = [];
		if (state.blockers) {
			lines.push(`⚠️  Active blockers: ${MYTASKS}/blockers.md`);
		}
		for (const h of state.handoffs) {
			lines.push(`📋 Open handoff: ${h}`);
		}

		if (lines.length > 0) {
			ctx.ui.setStatus("agentic", lines[0]);
			ctx.ui.setWidget("agentic", lines);
			for (const line of lines) ctx.ui.notify(line, "warning");
		} else {
			ctx.ui.setStatus("agentic", "✓ agentic: armed");
		}
	});

	pi.on("before_agent_start", async (event, _ctx) => {
		// Always: inject the AGENTIC.md spec into the turn's system prompt so
		// the orchestrator mode is the model's default operating posture.
		// This replaces the Claude Code `@AGENTIC.md` import.
		let next = event.systemPrompt;
		if (AGENTIC_SPEC) {
			next = `${next}\n\n${AGENTIC_SPEC}`;
		}

		// Conditionally: append the work-verb reinforcement reminder.
		if (reinforcementEnabled && shouldReinforce(event.prompt ?? "")) {
			injections++;
			next = `${next}\n\n${REMINDER}`;
		}

		// Only return a change if we actually appended something meaningful.
		if (next !== event.systemPrompt) {
			return { systemPrompt: next };
		}
		return undefined;
	});

	pi.registerCommand("orchestrator", {
		description: "Toggle the agentic orchestrator reinforcement (on|off|status)",
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim().toLowerCase();
			if (arg === "off" || arg === "disable") {
				reinforcementEnabled = false;
				ctx.ui.notify("orchestrator reinforcement: OFF (this session)", "info");
			} else if (arg === "on" || arg === "enable") {
				reinforcementEnabled = true;
				ctx.ui.notify("orchestrator reinforcement: ON", "info");
			} else if (arg === "" || arg === "status" || arg === "stats") {
				ctx.ui.notify(
					`orchestrator reinforcement: ${reinforcementEnabled ? "ON" : "OFF"} | reinforcement injections this session: ${injections} | spec loaded: ${AGENTIC_SPEC.length > 0 ? `${AGENTIC_SPEC.length} bytes` : "MISSING"}`,
					"info",
				);
			} else {
				ctx.ui.notify(`orchestrator: unknown arg "${arg}". Use on|off|status`, "warning");
			}
		},
	});
}
