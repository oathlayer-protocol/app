# Workflow Module

Chainlink CRE (Compute Runtime Engine) workflow + mock API server.

## What CRE Does (Full Pipeline)

CRE is the **oracle + automation + AI layer**, not just a trigger:

1. **Cron (15min)** → reads all SLAs from contract
2. **Fetches uptime** → calls mock API `/provider/:address/uptime` per SLA
3. **Runs AI Tribunal** → 3-agent council via Groq `ConfidentialHTTPClient` (API keys in TEE)
4. **Writes on-chain** → `recordBreachWarning()` and/or `recordBreach()` per verdict
5. **Cross-chain relay** → World Chain `ProviderRegistrationRequested` → compliance check → `setComplianceAndRegister()` on Sepolia

`onlyCREForwarder` gates all enforcement functions. `creForwarder` = deployer wallet for testnet.

## workflow.ts

Single-file CRE workflow with 4 handlers:

1. **Cron (15min)** → `scanSLAs()` — reads all SLAs, fetches uptime, detects breaches, runs AI Tribunal
2. **ClaimFiled event** → `scanSLAs()` — immediate re-scan on tenant claim
3. **ProviderRegistrationRequested** → confidential HTTP compliance check → APPROVED/REJECTED + relay
4. **ArbitratorRegistrationRequested** → direct relay to Sepolia

### Key Patterns
- `runtime.runInNodeMode()` + `consensusIdenticalAggregation()` for DON consensus
- `ConfidentialHTTPClient` for compliance API (TEE-encrypted, PII protected)
- `ConfidentialHTTPClient` for Groq API (API key protected from DON nodes)
- `encodeFunctionData` / `prepareReportRequest` / `writeReport` for on-chain writes

### AI Tribunal Council
- 3 agents: Risk Analyst → Provider Advocate → Enforcement Judge (sequential)
- Each uses Groq (Llama 3.3 70B) via `ConfidentialHTTPClient` with `response_format: { type: "json_object" }`
- Judge vote weighted 1.5x as tiebreaker
- **All verdicts on-chain** (including CLEAR with riskScore=0) — "decentralized AI" audit trail
- Production roadmap: move CLEAR/WARNING off-chain for gas optimization
- Tally: `3-0 BREACH`, `2-1 BREACH`, `3-0 WARNING`, `2-1 WARNING`, `0-3 CLEAR`
- WARNING votes count as "for" (pro-action) when tallying
- Breach gating: tribunal must vote BREACH **and** uptime < SLA threshold
- Breach cooldown: 24h, warning cooldown: 4h (contract-enforced)
- Prediction string: `[TALLY] Agent: reasoning; Agent: reasoning; ...` (< 200 chars)

### Config Schema (z.object)
- `slaContractAddress` — SLAEnforcement on Sepolia
- `uptimeApiUrl` — Mock API base URL
- `complianceApiUrl` — Compliance API base URL
- `chainSelectorName` — CCIP chain name
- `worldChainContractAddress` — WorldChainRegistry address
- `worldChainSelector` — CCIP chain selector for World Chain

### CRE Secrets
- `UPTIME_API_KEY`, `COMPLIANCE_API_KEY`, `GROQ_API_KEY`

## mock-api/server.ts

Express server on `:3001`. Dual purpose:
1. **CRE data source** — uptime + compliance endpoints called by CRE workflow
2. **Demo controls** — direct contract calls replicating CRE pipeline for demo convenience

### CRE Endpoints (called by workflow)
- `GET /provider/:address/uptime` — returns uptime data
- `GET /provider/:address/history` — 7-day uptime history (used by AI Tribunal's Provider Advocate)
- `GET /compliance/:address` — KYC compliance (called via ConfidentialHTTPClient)

### Demo Control Endpoints (admin auth required)
- `POST /demo-breach` — runs full AI Tribunal + writes breach on-chain (replicates CRE pipeline)
- `POST /demo-warning` — tribunal + warning only (no slash)
- `POST /demo-claim` — files claim as tenant via Tenderly impersonation
- `POST /time-warp` — `evm_increaseTime` + `evm_mine` (default 25h)
- `POST /reset` — reset uptime state + fast-forward 25h past cooldowns
- `POST /set-uptime` — set global uptime
- `POST /set-provider-uptime` — per-provider uptime override
- `POST /set-history` — inject custom history for demo scenarios

Admin auth: `x-admin-token` header matching `MOCK_API_ADMIN_SECRET` (default: `demo-secret`).
`DEMO_REJECT_ADDRESS` env var triggers compliance rejection.

Dashboard proxy: `/api/demo` route proxies demo controls to mock API.

## Commands

```bash
npm install
cre workflow simulate --verbose              # dry run
cre workflow simulate --verbose --broadcast  # write to chain

# Mock API
cd mock-api && npm install && npm run dev
```
