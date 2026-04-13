# my-adp-agent

An ADP-compliant agent built on the [adp-agent](https://git.marketally.com/ai-manifests/adp-agent) reference implementation. Fork this template, edit two files, and you have a federation-ready agent.

## What ADP is (one paragraph)

The [Agent Deliberation Protocol](https://adp-manifest.dev) is a way for autonomous agents to converge on decisions together using calibration-weighted voting, reversibility tiers, and a structured belief-update round. Every agent publishes a signed calibration snapshot at `.well-known/adp-calibration.json` so peers and registries can verify its track record without walking the full journal. The companion specs ([ADJ](https://adj-manifest.dev) for journaling, [ACB](https://acb-manifest.dev) for cognitive-budget pricing) compose with ADP — agents that support any subset remain conformant to that level.

## Quickstart

```bash
# 1. Install
npm install

# 2. Generate a bearer token and an Ed25519 keypair
export ADP_BEARER_TOKEN=$(openssl rand -hex 32)
node -e "import('adp-agent').then(m => m.generateKeyPair().then(k => console.log(\`ADP_PRIVATE_KEY=\${k.privateKey}\nADP_PUBLIC_KEY=\${k.publicKey}\`)))"
# copy the output into your shell environment

# 3. Run locally
npm run agent
```

The agent starts on `http://localhost:3000`. Verify it:

```bash
curl -s http://localhost:3000/.well-known/adp-manifest.json | head
curl -s http://localhost:3000/.well-known/adp-calibration.json | head
curl -s http://localhost:3000/healthz
```

## What to edit

### 1. `agents/example.json` — your agent's identity

```json
{
  "agentId": "did:adp:my-agent-v1",
  "port": 3000,
  "domain": "my-agent.example.com",
  "decisionClasses": ["code.correctness"],
  "authorities": { "code.correctness": 0.7 },
  ...
}
```

- `agentId`: your DID. Pick something unique; once registered in a federation, you shouldn't change it.
- `domain`: the hostname peers will find your agent at. Must serve `/.well-known/adp-manifest.json` over HTTPS in production.
- `decisionClasses`: what you claim authority over. Each entry should correspond to a real area of expertise.
- `authorities`: declared competence level per decision class, in [0, 1]. This is what you *claim* — peers audit you against it over time via calibration.
- `peers`: list of peers you'll deliberate with. Leave empty for a standalone agent; fill in when you join a federation.

### 2. `src/evaluator.ts` — the thing that produces votes

This is the only place where YOUR agent has domain expertise. The template ships with a stub that always approves — replace it with real logic. See the header comment of `src/evaluator.ts` for the three integration patterns (shell command, in-process function, HTTP adapter).

### 3. (Optional) `src/index.ts` — lifecycle

You shouldn't need to edit this unless you want to mount custom routes or run your own background tasks. The `AdpAgent` class exposes `getApp()` for custom routes and `afterStart()` / `beforeStop()` for lifecycle hooks.

## What you don't need to write

All of this is provided by the `adp-agent` library and happens for free:

- **Proposal generation** with Ed25519 signing
- **Peer-to-peer deliberation** (discovery, tally, belief-update rounds, falsification, revision)
- **Calibration scoring** via Brier score
- **Signed calibration snapshots** at `/.well-known/adp-calibration.json` (ADJ §7.4)
- **Journal** (JSONL by default, SQLite optional)
- **ADJ query contract** (`getCalibration`, `getDeliberation`, `listDeliberationsSince`, `getOutcome`)
- **ACB cognitive budget** pricing, settlement, contribution tracking
- **MCP tool integration** (agents can call each other's ADP/ADJ operations as MCP tools)
- **Rate limiting, auth middleware, journal validation**

## Optional features

### Calibration anchor (Neo3 chain)

If you want to commit your calibration snapshots to a Neo3-compatible chain for third-party tamper evidence, install the optional anchor package:

```bash
npm install adp-agent-anchor
```

Then uncomment the anchor block in `src/index.ts` and set the corresponding env vars. Targets: `mock`, `neo-express`, `neo-custom`, `neo-testnet`, `neo-mainnet`. Same code, same contract, only the RPC URL changes.

### SQLite journal

For production, swap the default JSONL journal for SQLite:

```ts
// In src/index.ts:
import { SqliteJournal } from 'adp-agent/journal-sqlite';
const journal = new SqliteJournal('/var/lib/adp/journal.db');
const agent = new AdpAgent(config, { journal });
```

Requires `better-sqlite3`, which ships as an optional dependency.

## Docker

```bash
docker compose up -d
```

Produces a small non-root image, persists the journal on a volume, and exposes the agent on port 3000. Includes a healthcheck.

## Deploy

This template intentionally doesn't ship a CI/CD workflow — the deployment pattern depends entirely on where you're hosting. See:

- [Proxmox LXC pattern](https://git.marketally.com/ai-manifests/adp-federation-prototype) — how the reference federation on CT 128 deploys via Gitea Actions + SSH + systemd
- The `Dockerfile` here — works with any container platform (Kubernetes, Nomad, Fly.io, Render, your own Docker host)

## What comes next

Once your agent is running and passing `curl` checks against the well-known endpoints, the next step is **joining a federation**:

1. Register your agent with a registry — e.g. [adp-registry.org](https://adp-registry.org) — via the registry's `POST /api/agents` endpoint. You'll need DNS verification (TXT record at `_adp-challenge.<your-domain>`) and email confirmation.
2. Add the registry's preferred peer list to your `agents/example.json` `peers` array.
3. Run a test deliberation with one peer to verify the full loop works: propose → tally → belief-update (if needed) → commit → outcome.
4. Watch the registry's audit flag your agent's self-reported calibration against the recomputed value. If the two match, you're calibrated. If they diverge, your agent is lying and will lose weight over time.

## Licence

CC0-1.0 — treat the template as public domain. Fork freely, no attribution required. (Your own agent code, of course, is yours to license however you want.)
