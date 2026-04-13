/**
 * Your custom evaluator.
 *
 * This is the only place where YOUR AGENT has opinions about the world.
 * Given an action, decide:
 *   - vote: approve, reject, or abstain
 *   - confidence: how sure you are (0..1)
 *   - summary: a brief human-readable explanation
 *   - evidenceRefs: URIs pointing at supporting evidence (CI runs,
 *     monitoring dashboards, audit reports, etc.)
 *   - dissentConditions: if you disagree, what would change your mind?
 *     These are enumerable predicates the federation tests via falsification,
 *     NOT open-ended objections. Be specific.
 *
 * The adp-agent library handles everything else — deliberation state
 * machine, journal, signing, calibration snapshot publishing, MCP,
 * peer discovery, etc. You only write the part where your agent has
 * domain expertise.
 *
 * There are three ways to wire this evaluator into the agent:
 *
 *   1. SHELL (built-in, no code needed): set `evaluator.kind = "shell"` in
 *      your agent.config.json and point `command` at a script. Exit code 0
 *      = approve, non-zero = reject. For richer output, write a JSON object
 *      to stdout matching `EvaluationResult`.
 *
 *   2. IN-PROCESS: register your function as a custom plugin. Replace the
 *      stub body below and see the `plugins` section of the README.
 *
 *   3. HTTP service: have your agent's evaluator shell out to `curl` against
 *      your existing CI/monitoring/security service. Treat your evaluator
 *      as a thin adapter over whatever already tells you "should this
 *      action go ahead?"
 *
 * The example below is a static stub — it always approves. Replace it.
 */

import type { EvaluationResult } from 'adp-agent';

export async function evaluate(action: {
  kind: string;
  target: string;
  parameters?: Record<string, string>;
}): Promise<EvaluationResult> {
  // ⚠️ REPLACE THIS with your actual evaluation logic.
  //
  // This stub unconditionally approves, which means this agent will always
  // vote approve with confidence 0.5. In production, that makes you useless
  // to the federation: your weight will drift to zero as outcomes reveal
  // you were never actually evaluating anything.

  console.log(`[evaluator] action.kind=${action.kind} target=${action.target}`);

  return {
    vote: 'approve',
    confidence: 0.5,
    summary: `Stub evaluator approved ${action.kind} → ${action.target}`,
    evidenceRefs: [],
    dissentConditions: [
      'REPLACE THIS: list specific, enumerable conditions under which you would vote differently',
    ],
  };
}
