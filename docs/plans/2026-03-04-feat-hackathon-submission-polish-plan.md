---
title: "OathLayer — Chainlink CONVERGENCE Submission Polish"
type: feat
status: active
date: 2026-03-04
bounties: ["Risk & Compliance $16K", "World ID + CRE $5K", "World Mini App + CRE $5K", "Tenderly VirtualTestNets $5K"]
deadline: 2026-03-27T12:00:00-04:00
---

# OathLayer — Chainlink CONVERGENCE Submission Polish

## Overview

Project is ~85% complete. All contracts deployed, CRE workflow built, dashboard live, mini app functional. This plan covers the remaining work to hit all 4 prize tracks with a clean demo video and complete submission artifacts.

**Deadline:** March 27, 2026 12:00 PM ET
**Repo:** https://github.com/oathlayer-protocol/app (public ✅)

---

## Current Contract Addresses

| Contract | Chain | Address |
|---|---|---|
| `SLAEnforcement` | Tenderly VNet (Sepolia fork) | `0x8286A8cfA5c8C1872097D9b43E01CbdEe934D319` |
| `WorldChainRegistry` | World Chain Sepolia (4801) | `0xe1349d2c44422b70c73bf767afb58ae1c59cd1fd` |

---

## Prize Track Requirements

### Risk & Compliance ($16K 1st) — PRIMARY
- [x] CRE workflow with ≥1 blockchain + external API + AI
- [ ] `cre workflow simulate --verbose` output captured
- [ ] 3-5 min demo video (public, shows workflow execution)
- [ ] Public GitHub repo ✅
- [ ] README with links to all Chainlink files

### World ID + CRE ($5K 1st)
- [x] World ID proof in MiniKit → World Chain tx
- [x] CRE relay from World Chain → Sepolia (off-chain pattern qualifies)
- [ ] Mini app registration working end-to-end (Oppo demo footage)
- [ ] Submission narrative: explicitly frame as "World ID on non-native chain via CRE"

### World Mini App + CRE ($5K 1st)
- [x] MiniKit integration in Next.js mini app
- [x] CRE as bridge to Sepolia (other chain)
- [ ] Mini app accessible via public URL
- [ ] Demo footage showing World App → CRE relay

### Tenderly VirtualTestNets ($5K 1st)
- [x] SLAEnforcement on Tenderly VNet
- [ ] VNet explorer link showing contracts + transaction history (need seeded data)
- [x] CRE workflow writes breach/warning events to VNet
- [ ] README section with VNet explorer URL and architecture explanation

---

## Phases

### Phase 1 — Env & Config Fixes (1–2 hrs)
*Unblock everything else. Zero features, pure correctness.*

#### 1.1 Fix dashboard missing env vars
**File:** `dashboard/.env.local`

```
NEXT_PUBLIC_DEPLOY_BLOCK=<actual block number from Tenderly>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<project ID>
```

- Get deploy block: check Tenderly VNet tx for SLAEnforcement deployment → use that block number
- Without `DEPLOY_BLOCK`, `getLogs` scans from block 0 — slow and may timeout during live demo

#### 1.2 Fix miniapp SLA contract address
**File:** `miniapp/.env.local`

The repo research found `NEXT_PUBLIC_SLA_CONTRACT_ADDRESS` in miniapp `.env.local` is currently correct (`0x8286A8cfA5c8C1872097D9b43E01CbdEe934D319`) — **no action needed** (was fixed in prior session).

#### 1.3 Reconcile Tenderly VNet IDs
Two different VNet UUIDs appear in the codebase:
- Dashboard + miniapp: `5c780e4f-4df5-4a50-b221-2342cd4b713e`
- Workflow `.env` + README: `47ad454d-8109-4ccb-9285-7ab201835e5d`

Determine the canonical VNet (whichever has SLAEnforcement deployed at `0x8286...`), update the README to use a single URL. The Tenderly submission link must match where CRE actually writes transactions.

---

### Phase 2 — Miniapp Registration Fix (1–2 hrs)
*Get Oppo device to complete full World ID registration for demo footage.*

#### 2.1 Confirm new contract is live
WorldChainRegistry `0xe1349d2c...` deployed with `skipOnChainVerification=true`. Miniapp `.env.local` has new address. Dev server restarted.

**Test:** Have device close/reopen World App mini app → attempt registration → should succeed.

#### 2.2 If tunnel is the issue
The device connects via a tunnel URL (not localhost). Options:
- Re-run `cloudflared tunnel` or `ngrok` pointed at port 3002
- Alternatively: deploy miniapp to Vercel/Cloudflare Pages for a stable URL

**Current deployed URL:** `https://oathlayer-miniapp.robbyn.xyz` — if this is pointing to an old deploy, redeploy it with new contract addresses.

#### 2.3 Hardcoded home stats
`miniapp/src/app/page.tsx` — home screen stats grid shows hardcoded values (Active SLAs: 2, Bonded: 3.5, Breaches: 1, Providers: 2). For judges watching the video this looks bad if it never changes.

**Fix:** Either wire to real contract data via `useReadContract`, OR replace with honest static copy that matches the demo state (e.g., "Powered by Chainlink CRE"). A better home screen copy is lower-risk than live reads.

---

### Phase 3 — CRE Simulate & Demo Seeding (2–3 hrs)
*Get a clean `cre workflow simulate --verbose` run. Seed chain state for demo.*

#### 3.1 Verify CRE CLI workflow config injection
The workflow uses a `configSchema` (zod) with 6 fields. The CRE CLI must inject these at simulate time. Check if a config YAML/JSON is needed alongside `workflow.ts`:

```bash
cd workflow && cre workflow simulate --help
# look for: --config, --env, or how configSchema values are supplied
```

If a config file is required, create `workflow.config.yaml`:
```yaml
slaContractAddress: "0x8286A8cfA5c8C1872097D9b43E01CbdEe934D319"
uptimeApiUrl: "http://localhost:3001"
complianceApiUrl: "http://localhost:3001"
chainSelectorName: "ethereum-testnet-sepolia"
worldChainContractAddress: "0xe1349d2c44422b70c73bf767afb58ae1c59cd1fd"
worldChainSelector: "11820315825706515952"
```

#### 3.2 Ensure secrets are set
```bash
cre secrets list  # check UPTIME_API_KEY, COMPLIANCE_API_KEY, GEMINI_API_KEY exist
# If missing:
cre secrets create GEMINI_API_KEY --value "..."
cre secrets create UPTIME_API_KEY --value "demo-key"
cre secrets create COMPLIANCE_API_KEY --value "demo-key"
```

#### 3.3 Seed demo chain state
For Tenderly VNet explorer to show meaningful tx history for judges:

```bash
# 1. Ensure mock API running
cd workflow/mock-api && npm run dev

# 2. Create 2-3 SLAs via cast or dashboard
cast send $SLA_ADDR "createSLA(address,uint256,uint256,uint256)" \
  <provider> 100 9950 1000 \
  --value 1ether --rpc-url $TENDERLY_RPC --private-key $PK

# 3. Set one provider uptime LOW to trigger breach
curl -X POST http://localhost:3001/set-provider-uptime \
  -H "x-admin-token: demo-secret" \
  -H "Content-Type: application/json" \
  -d '{"address": "<provider>", "uptimeBps": 9700}'

# 4. Run simulate --broadcast to write actual txs to Tenderly VNet
cd workflow && npm run simulate:broadcast
```

#### 3.4 Capture simulate output
```bash
cd workflow && npm run simulate 2>&1 | tee /tmp/cre-simulate-output.txt
```
Save this output — attach it to the submission or paste key lines in the README.

---

### Phase 4 — README Overhaul (1–2 hrs)
*README is the submission form. Judges read it first.*

#### 4.1 Fix deadline (Mar 8 → Mar 27)
Line 1 of README has wrong deadline.

#### 4.2 Add Chainlink Files section (REQUIRED for submission)
```markdown
## Chainlink Files

| File | Chainlink Usage |
|---|---|
| [`workflow/workflow.ts`](./workflow/workflow.ts) | CRE SDK — cron trigger, EVM log triggers, ConfidentialHTTPClient, Secrets, Gemini AI |
| [`contracts/src/SLAEnforcement.sol`](./contracts/src/SLAEnforcement.sol) | `AggregatorV3Interface` (ETH/USD price feed), `onlyCREForwarder` access control |
| [`workflow/package.json`](./workflow/package.json) | `@chainlink/cre-sdk` dependency |
```

#### 4.3 Add Tenderly Explorer section
```markdown
## Tenderly Virtual TestNet

- **SLAEnforcement Explorer:** https://dashboard.tenderly.co/robbyn/project/testnet/<canonical-uuid>
- **Transaction History:** [link to a specific breach tx for judges]
- **RPC:** https://virtual.sepolia.eu.rpc.tenderly.co/<canonical-uuid>
```

#### 4.4 Update WorldChainRegistry address throughout
Replace any mention of old addresses with `0xe1349d2c44422b70c73bf767afb58ae1c59cd1fd`.

#### 4.5 Strengthen World ID + CRE narrative
Add explicit paragraph explaining the off-chain relay pattern:
> "World ID proofs are generated on World Chain via MiniKit. Because Sepolia does not natively support World ID, OathLayer uses Chainlink CRE as the trust relay: the CRE DON listens for the `ProviderRegistrationRequested` event on World Chain, verifies the event context, and calls `setComplianceStatus()` on Sepolia — bringing Sybil-resistant identity to a chain where World ID does not natively exist."

#### 4.6 Add CRE Simulate output snippet
```markdown
## CRE Workflow Simulation

<details>
<summary>cre workflow simulate --verbose output</summary>

```
[paste key lines from /tmp/cre-simulate-output.txt]
```
</details>
```

---

### Phase 5 — Demo Video Script (1 hr prep + recording)
*3-5 min, one take if possible. Publicly viewable (YouTube/Loom).*

#### Script

| Time | Scene | What to show |
|---|---|---|
| 0:00–0:30 | Title card | "OathLayer — Privacy-First AI SLA Enforcement. Chainlink CONVERGENCE." |
| 0:30–1:15 | Architecture walkthrough | Diagram in README — explain World Chain → CRE → Sepolia flow |
| 1:15–2:00 | World App registration | Oppo device: open mini app → "Verify with World ID" → ZK proof UI → success |
| 2:00–2:45 | CRE relay | Tenderly explorer: show `ProviderRegistrationRequested` event → CRE writes `setComplianceStatus(APPROVED)` to Sepolia |
| 2:45–3:15 | AI breach prediction | Terminal: `npm run simulate --verbose` — show Gemini returning `riskScore: 85, prediction: "..."` |
| 3:15–3:45 | Dashboard live | Browser: dashboard showing AI breach warnings with risk badges, SLA cards |
| 3:45–4:15 | Breach execution | cast or dashboard: trigger low uptime → CRE writes `recordBreach()` → Tenderly shows tx → tenant ETH balance increases |
| 4:15–4:30 | Close | GitHub URL + Tenderly explorer URL |

**Pre-recording setup:**
- Tenderly VNet has seeded SLAs with tx history visible
- One provider set to low uptime (ready to breach on simulate:broadcast)
- Dashboard open, wallet connected, showing live breach warnings
- `cre workflow simulate --verbose` ready in terminal (dry run first to confirm no errors)
- Oppo device in World App with mini app loaded at tunnel URL

---

### Phase 6 — Submission Form (30 min)
*Final Devpost submission.*

- [ ] Video uploaded to YouTube (unlisted) or Loom, link copied
- [ ] GitHub repo confirmed public: https://github.com/oathlayer-protocol/app
- [ ] Tenderly VNet explorer link captured
- [ ] Devpost submission form filled:
  - Title: "OathLayer — Privacy-First AI SLA Enforcement for Tokenized Real-World Assets"
  - Tracks selected: Risk & Compliance + World ID + CRE + World Mini App + CRE + Tenderly VirtualTestNets
  - Demo video link
  - GitHub repo link
  - Brief description (3 paragraphs: what, how Chainlink is used, World ID integration)

---

## Acceptance Criteria

### Must-have (blocks all tracks)
- [ ] `cre workflow simulate --verbose` runs without error
- [ ] Demo video 3-5 min, publicly viewable, shows workflow execution
- [ ] README has `## Chainlink Files` section with correct file links
- [ ] All contract addresses consistent across all `.env` files and README
- [ ] GitHub repo public

### Must-have (blocks Tenderly bounty)
- [ ] Tenderly VNet explorer shows SLAEnforcement contract + ≥3 CRE-written transactions
- [ ] Single canonical Tenderly VNet URL in README

### Must-have (blocks World bounties)
- [ ] Mini app registration completes on Oppo (for demo footage)
- [ ] README explicitly frames CRE as World ID relay to Sepolia

### Nice-to-have
- [ ] `NEXT_PUBLIC_DEPLOY_BLOCK` set in dashboard `.env.local`
- [ ] Miniapp home stats wired to live data or replaced with honest copy
- [ ] CRE simulate output snippet in README `<details>` block

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CRE simulate fails (config injection) | Medium | High — blocks simulate output | Check CLI help first; create config YAML if needed |
| Oppo device still can't register | Medium | Medium — World bounties rely on footage | Fall back to screen recording of mini app in World App simulator/emulator |
| Tenderly VNet tx history too sparse | Low | Medium — Tenderly judges check explorer | Seed state in Phase 3 before recording |
| Gemini rate limit during simulate | Low | Low — workflow batches all SLAs in one call | Free tier is 15 RPM; one simulate call = 1 Gemini request |

---

## File Reference

| File | Change Required |
|---|---|
| `dashboard/.env.local` | Add `NEXT_PUBLIC_DEPLOY_BLOCK`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` |
| `README.md` | Fix deadline, add Chainlink Files section, add Tenderly section, update WorldChainRegistry address, add World ID relay narrative |
| `workflow/workflow.config.yaml` | CREATE if CRE CLI requires it for config injection |
| `miniapp/src/app/page.tsx` | Fix hardcoded home stats |
| `miniapp/.env.local` | Confirm all addresses correct (done) |
