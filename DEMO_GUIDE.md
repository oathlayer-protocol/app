# OathLayer — How It Actually Works

## The Real-World Problem

Imagine a **cloud hosting company** (AWS, Hetzner, etc.) that tokenizes its infrastructure services as RWAs. They sell hosting contracts to businesses (tenants) with promises like "99.9% uptime, 24-hour response time." Today, if they break that promise — **nothing happens**. The tenant has to manually detect the outage, file a complaint, negotiate compensation, maybe hire lawyers. It takes weeks. Most tenants just eat the loss.

## The Actors

| Actor | Who they are | What they do |
|-------|-------------|-------------|
| **Provider** | Cloud/infra company selling services | Registers identity, bonds collateral, creates SLAs |
| **Tenant** | Business buying the service | Receives SLA guarantees, files claims if service degrades |
| **CRE (Chainlink)** | Automated referee | Monitors uptime, predicts breaches, executes penalties |
| **Arbitrator** | Verified human (World ID) | Can override/uphold breach decisions in disputes |

## Flow Explained

### 1. Register Provider (`/provider/register`)

- The provider proves they're a real human via **World ID** (prevents Sybil — one person can't create 100 fake provider accounts to game the system)
- CRE automatically runs a **compliance/KYC check** via ConfidentialHTTPClient (TEE encrypted — the DON nodes never see the provider's personal data)
- Result: provider gets APPROVED or REJECTED on-chain
- **Why this matters:** Without identity verification, anyone could create a provider, bond a tiny amount, breach immediately, and there's no accountability

### 2. Create SLA (`/sla/create`)

- Only compliance-approved providers can create SLAs
- Provider sets the terms: **minimum uptime %**, **response time**, **penalty % per breach**
- Provider **bonds ETH** as collateral — this is their skin in the game
- Example: "I guarantee 99.9% uptime. If I breach, slash 10% of my 1 ETH bond"
- **Why a user creates this:** It's a **trust signal**. A provider willing to lock up 1 ETH and accept automatic penalties is more credible than one who just says "trust me." Tenants can compare providers by bond size and terms.

### 3. CRE Monitors (automatic — no user action)

- Every 15 minutes, CRE cron job fetches uptime data for all active SLAs
- Sends all uptime data to **Gemini Flash** in one batched prompt
- Gemini returns `{ riskScore: 0-100, prediction: "text" }` for each SLA
- If `riskScore > 70` → CRE writes a **BreachWarning** on-chain (the orange/red alerts on dashboard)
- **This is predictive** — warns before the breach actually happens

### 4. Breach Detection & Auto-Slash (automatic)

- If actual uptime drops below the SLA threshold (e.g., 96.5% vs 99.9% promised):
  - CRE calls `recordBreach()` on-chain
  - Bond is **automatically slashed** — penalty % deducted from provider's collateral
  - `SLABreached` event emitted with proof (uptime reading, penalty amount, tx hash)
- **No human intervention needed.** No lawyers. No disputes. Code is law.

### 5. File Claim (`/claims`)

- Tenant notices degraded service → files a claim describing the issue
- This emits a `ClaimFiled` event → CRE **immediately** reacts (EVM Log trigger, not waiting for next 15min cron)
- CRE does an emergency uptime check and can trigger instant breach if warranted

### 6. Arbitrate (`/arbitrate`)

- Safety valve — what if the automated system gets it wrong?
- World ID-verified arbitrators can **uphold** (agree with breach) or **overturn** (provider was wrongly penalized)
- Requires World ID to prevent arbitrator Sybil attacks

## Breach vs No Breach — Concrete Example

**SLA #1:** Provider bonds 1 ETH. Promises 99.9% uptime. 10% penalty per breach.

| Scenario | Uptime | Result |
|----------|--------|--------|
| Healthy | 99.95% | Nothing happens. Bond untouched. |
| Warning zone | 99.2% | Gemini scores risk 82 → BreachWarning event. Dashboard shows alert. No penalty yet. |
| Breached | 96.5% | Uptime < 99.9% threshold → `recordBreach()` → 0.1 ETH slashed → bond drops to 0.9 ETH |
| Second breach | 94.0% | Another 0.1 ETH slashed → bond drops to 0.8 ETH |
| Bond depleted | repeated | Eventually bond hits 0 → SLA deactivated, provider must re-bond |

## Current On-Chain State (Demo Ready)

| What | State | Story |
|------|-------|-------|
| SLA #0 | 0.1 ETH bond, healthy | Low risk (25) — stable provider |
| SLA #1 | 0.9 ETH bond (was 1.0) | **Breached** — uptime dropped to 96.5%, 0.1 ETH slashed automatically |
| SLA #2 | 0.5 ETH bond, warning | Medium risk (58) — latency spikes detected, no breach yet |
| Breach count | 1 | One penalty executed on-chain |
| Warnings | 3 | AI predictions for all 3 SLAs |

## Demo Script for Judges

> **Pre-demo setup:** Mock API running on `:3001`, Dashboard on `:3000`, CRE workflow ready to simulate.

### Act 1: The Product (30s)

1. Open **landing page** (`/`) — one-sentence pitch: "Automated SLA enforcement for tokenized RWAs — AI predicts breaches, smart contracts slash bonds, zero human intervention."
2. Click into **Dashboard** (`/dashboard`) — show the live on-chain state: active SLAs, bonded ETH, warnings, breaches.

### Act 2: Live Breach Demo (90s) — THE MONEY SHOT

This is what judges remember. You trigger a real breach on-chain during the demo.

**Step 1 — Show the healthy state**
- Point at an SLA card on dashboard. Note the bond amount (e.g., "SLA #0 has 0.1 ETH bonded, uptime is healthy").

**Step 2 — Drop uptime via mock API (run in terminal)**
```bash
# Drop global uptime to trigger a breach
curl -X POST http://localhost:3001/set-uptime \
  -H "Content-Type: application/json" \
  -H "x-admin-token: demo-secret" \
  -d '{"uptime": 94.0}'
```
Say: *"Simulating an outage — the provider's uptime just dropped to 94%."*

**Step 3 — Run CRE workflow**
```bash
cd workflow && cre workflow simulate --verbose --broadcast
```
Say: *"Chainlink CRE is now doing 3 things: fetching uptime data, sending it to Gemini Flash for risk prediction, and if the threshold is breached — calling recordBreach on-chain automatically."*

**Step 4 — Watch the dashboard update**
- Switch back to browser. Within 5 seconds the dashboard polls and shows:
  - New **BreachWarning** card with AI prediction text + risk score
  - **SLABreached** row in the breach table — uptime %, penalty amount, tx hash
  - Bond health bar drops (e.g., 0.1 → 0.09 ETH)
  - Breach counter increments
- Say: *"No human intervention. The AI predicted it, CRE detected it, and the bond was slashed — all in one workflow cycle."*

**Step 5 — Reset for clean state (optional)**
```bash
curl -X POST http://localhost:3001/reset \
  -H "x-admin-token: demo-secret"
```

### Act 3: Provider Registration + Compliance (60s)

1. Open `/provider/register` — show the World ID verification button
2. Say: *"Before a provider can create SLAs, they prove identity via World ID — prevents Sybil attacks — then CRE runs an automated compliance check using ConfidentialHTTPClient. The DON nodes never see the provider's personal data."*
3. If time allows, show the compliance status polling (PENDING → APPROVED animation)

### Act 4: SLA Creation (30s)

1. Go to `/sla/create` — show the compliance gate ("Only approved providers can create SLAs")
2. Walk through the form: min uptime %, response time, penalty %, bond amount
3. Say: *"The provider is bonding real ETH as collateral. If they breach, it gets slashed automatically."*

### Act 5: Claims + Arbitration (30s)

1. Show `/claims` — *"Tenants can file claims if service degrades. This triggers an immediate CRE scan — no waiting for the 15-minute cron."*
2. Show `/arbitrate` — *"Safety valve. World ID-verified arbitrators can override automated decisions."*

### Act 6: Technical Depth (30s — for Q&A or if judges are technical)

- **5 CRE capabilities in one workflow:** Cron trigger, EVM Log trigger, ConfidentialHTTPClient (compliance + Gemini), Secrets, cross-chain relay (World Chain → Sepolia)
- **AI is predictive, not just reactive:** Gemini Flash scores risk 0-100, warns before breach happens
- **Cross-chain:** Provider registers on World Chain (World ID native), SLA enforcement on Sepolia — CRE bridges the gap

### Quick Reference — Demo Control Commands

| Action | Command |
|--------|---------|
| Drop uptime (trigger breach) | `curl -X POST localhost:3001/set-uptime -H "Content-Type: application/json" -H "x-admin-token: demo-secret" -d '{"uptime": 94.0}'` |
| Drop specific provider | `curl -X POST localhost:3001/set-provider-uptime -H "Content-Type: application/json" -H "x-admin-token: demo-secret" -d '{"address": "0x...", "uptime": 92.0}'` |
| Reset to healthy | `curl -X POST localhost:3001/reset -H "x-admin-token: demo-secret"` |
| Check current state | `curl localhost:3001/status` |
| Run CRE (dry run) | `cd workflow && cre workflow simulate --verbose` |
| Run CRE (broadcast) | `cd workflow && cre workflow simulate --verbose --broadcast` |
