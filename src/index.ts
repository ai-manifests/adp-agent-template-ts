/**
 * my-adp-agent — entry point.
 *
 * Built on adp-agent. Reads a config JSON, applies env overrides for
 * secrets, constructs an AdpAgent, and starts the HTTP server.
 *
 * What you should edit:
 *   - `agents/example.json` — your agent's identity, decision classes, peer list
 *   - `src/evaluator.ts` — the thing that actually produces votes (replace the stub)
 *   - This file — only if you need custom routes or lifecycle hooks
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AdpAgent, JsonlJournal, type AgentConfig } from '@ai-manifests/adp-agent';

const configPath = process.argv.find((_, i, a) => a[i - 1] === '--config') || process.argv[2];
if (!configPath) {
  console.error('Usage: npm run agent -- --config agents/example.json');
  process.exit(1);
}

const config: AgentConfig = JSON.parse(readFileSync(resolve(configPath), 'utf-8'));

// --- Env overrides (secrets out of the repo) ---
if (process.env.ADP_BEARER_TOKEN) {
  config.auth = config.auth ?? { bearerToken: '', peerTokens: {} };
  config.auth.bearerToken = process.env.ADP_BEARER_TOKEN;
}
if (process.env.ADP_PRIVATE_KEY) {
  config.auth = config.auth ?? { bearerToken: '', peerTokens: {} };
  config.auth.privateKey = process.env.ADP_PRIVATE_KEY;
  config.auth.publicKey = process.env.ADP_PUBLIC_KEY ?? config.auth.publicKey;
}

// --- Optional: calibration anchor ---
//
// Uncomment this block and install `adp-agent-anchor` if you want to
// periodically commit your calibration snapshots to a Neo3-compatible chain
// for cross-org tamper evidence. Your registry can verify against the
// always-on signed snapshots at /.well-known/adp-calibration.json without
// this, so the anchor is strictly optional.
//
// if (process.env.ADP_ANCHOR_ENABLED === 'true') {
//   const { createAnchorStore, CalibrationAnchorScheduler } = await import('@ai-manifests/adp-agent-anchor');
//   const store = createAnchorStore({
//     enabled: true,
//     target: (process.env.ADP_ANCHOR_TARGET as any) ?? 'mock',
//     rpcUrl: process.env.ADP_ANCHOR_RPC_URL,
//     contractHash: process.env.ADP_ANCHOR_CONTRACT_HASH,
//     privateKey: process.env.ADP_ANCHOR_PRIVATE_KEY,
//   });
//   if (store) {
//     const scheduler = new CalibrationAnchorScheduler(
//       config, store,
//       () => journal.listDeliberationsSince(new Date(0), 10000).flatMap(r => r.entries),
//       parseInt(process.env.ADP_ANCHOR_PUBLISH_INTERVAL_S ?? '3600', 10),
//     );
//     agent.afterStart(() => scheduler.start());
//     agent.beforeStop(() => scheduler.stop());
//   }
// }

// --- Construct and start ---

const journal = new JsonlJournal(resolve(config.journalDir));
const agent = new AdpAgent(config, { journal });

await agent.start();
console.log(`[${config.agentId}] listening on :${config.port}`);
console.log(`  manifest:    http://localhost:${config.port}/.well-known/adp-manifest.json`);
console.log(`  calibration: http://localhost:${config.port}/.well-known/adp-calibration.json`);
console.log(`  journal:     http://localhost:${config.port}/adj/v0/`);

// Graceful shutdown
const shutdown = async () => {
  console.log(`[${config.agentId}] shutting down`);
  await agent.stop();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
