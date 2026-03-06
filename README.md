# OathLayer

**Autonomous SLA Enforcement for Tokenized Real-World Assets**

Chainlink CRE monitors uptime, Gemini Flash predicts breaches before they happen, and penalties execute on-chain — all without human intervention. Provider identity gated by World ID.

**Hackathon:** CONVERGENCE (Chainlink) — Deadline: March 27, 2026
**Tracks:** Risk & Compliance ($16K) · Privacy ($16K) · CRE & AI ($17K)
**Bounties:** World ID + CRE ($5K) · World Mini App + CRE ($5K) · Tenderly VirtualTestNets ($5K)

---

## Architecture

```
World Chain (4801)          CRE Workflows              Sepolia (Tenderly VNet)
┌──────────────────┐   ┌─────────────────────┐   ┌──────────────────┐
│ WorldChainRegistry│   │ 1. Cron (15min)     │   │ SLAEnforcement   │
│                  │   │    → fetch uptime    │   │                  │
│ register() ──────┼──→│    → Gemini Flash    │──→│ recordBreach()   │
│  ProviderReg     │   │    → breach predict  │   │ recordWarn()     │
│  Requested       │   │                     │   │                  │
│                  │   │ 2. ProviderRegReq   │   │ compliance gate  │
│                  │   │    → ConfidHTTP KYC ─┼──→│ setCompliance()  │
│                  │   │    → relay or reject │   │                  │
│                  │   │                     │   │ createSLA()      │
│                  │   │ 3. ClaimFiled react  │   │ (gated)          │
│                  │   │ 4. ArbitratorReg    │   │                  │
└──────────────────┘   └─────────────────────┘   └──────────────────┘

Dashboard (Next.js)          Mini App (World App)      Mock APIs (:3001)
┌──────────────────┐   ┌─────────────────────┐   ┌─────────────────┐
│ / — landing      │   │ Provider registration│   │ /provider/:addr │
│ /dashboard —     │   │ via World ID MiniKit │   │   /uptime       │
│   live SLAs,     │   │ File claims against  │   │ /compliance/    │
│   breach alerts, │   │   SLA providers      │   │   :addr         │
│   risk scores    │   │                     │   │                 │
│ /sla/create      │   │ Runs inside World   │   │                 │
│ /claims          │   │ App mobile browser   │   │                 │
│ /arbitrate       │   │                     │   │                 │
└──────────────────┘   └─────────────────────┘   └─────────────────┘
```

## How Chainlink CRE is Used (5 Capabilities)

| Capability | Usage |
|---|---|
| **Cron trigger** | Scans all active SLAs every 15 minutes for compliance |
| **EVM Log trigger** | Reacts immediately to `ClaimFiled`, `ProviderRegistrationRequested`, `ArbitratorRegistrationRequested` events |
| **ConfidentialHTTPClient** | Encrypted KYC/compliance checks via TEE enclaves — provider PII never visible to DON nodes |
| **Secrets** | `GEMINI_API_KEY`, `COMPLIANCE_API_KEY`, `UPTIME_API_KEY` via threshold-encrypted vault |
| **Cross-chain relay** | World Chain → Sepolia registration relay via trusted CRE forwarder pattern |

## How AI is Used

- **Gemini 2.0 Flash** analyzes uptime trends across all active SLAs in a single batched prompt
- Returns structured `{ riskScore, prediction }` via `responseSchema` (deterministic JSON mode)
- API key protected via `ConfidentialHTTPClient` — DON nodes cannot see the key
- `riskScore > 70` triggers on-chain `BreachWarning` event with prediction text
- 4-hour cooldown per SLA prevents warning spam

## How World ID is Used

- **Provider registration** — World ID verification prevents Sybil SLA providers (Orb in production, Device for hackathon testing)
- **Arbitrator access** — only verified humans can uphold or overturn breaches
- **Cross-chain** — ZK proof verified on World Chain, relayed to Sepolia via CRE

## How Tenderly is Used

- **Virtual TestNet** — Sepolia fork with unlimited faucet, impersonation for testing
- **Public explorer** — judges verify all transactions without a wallet
- **evm_increaseTime** — manipulate block.timestamp for cooldown testing

---

## Deployed Contracts

| Contract | Chain | Address |
|---|---|---|
| `SLAEnforcement` | Tenderly VNet (Sepolia fork) | `0x8286A8cfA5c8C1872097D9b43E01CbdEe934D319` |
| `WorldChainRegistry` | World Chain Sepolia (4801) | `0xe1349d2c44422b70c73bf767afb58ae1c59cd1fd` |

**Tenderly Explorer:** [View all transactions](https://dashboard.tenderly.co/robbyn/project/testnet/5c780e4f-4df5-4a50-b221-2342cd4b713e)

---

## Project Structure

```
oathlayer/
├── contracts/              # Foundry smart contracts
│   ├── src/
│   │   ├── SLAEnforcement.sol      # Main contract (Sepolia VNet)
│   │   └── WorldChainRegistry.sol  # Registration proxy (World Chain)
│   ├── script/
│   │   ├── DeploySLA.s.sol
│   │   └── DeployWorldChain.s.sol
│   └── test/
│       └── SLAEnforcement.t.sol    # 22 tests
├── workflow/               # Chainlink CRE workflow
│   ├── workflow.ts         # 4 handlers: cron, claim, provider reg, arbitrator reg
│   └── mock-api/
│       └── server.ts       # Mock uptime + compliance API
├── dashboard/              # Next.js + wagmi + RainbowKit
│   └── src/
│       ├── app/
│       │   ├── (landing)/page.tsx         # Landing page
│       │   ├── dashboard/page.tsx         # Live SLA dashboard
│       │   ├── provider/register/page.tsx # World ID + bond + compliance
│       │   ├── sla/create/page.tsx        # Create SLA (compliance-gated)
│       │   ├── sla/[id]/page.tsx          # SLA detail view
│       │   ├── claims/page.tsx            # File claims
│       │   └── arbitrate/page.tsx         # World ID gated arbitration
│       ├── components/
│       │   ├── AppShell.tsx               # Shared nav + layout
│       │   └── Providers.tsx              # wagmi + RainbowKit providers
│       └── lib/
│           ├── contract.ts                # ABI + address
│           └── wagmi.ts                   # Chain config (Tenderly VNet)
└── miniapp/                # World Mini App (mobile)
    └── src/app/page.tsx    # Provider registration + claims via MiniKit
```

---

## Setup

### Contracts

```bash
cd contracts
forge install
forge build
forge test  # 22 tests
```

Deploy:
```bash
forge script script/DeploySLA.s.sol --rpc-url $TENDERLY_RPC_URL --broadcast
forge script script/DeployWorldChain.s.sol --rpc-url $WORLD_CHAIN_RPC --broadcast
```

### CRE Workflow

```bash
cd workflow
npm install

# Create secrets
cre secrets create UPTIME_API_KEY --value "demo-key"
cre secrets create COMPLIANCE_API_KEY --value "your-key"
cre secrets create GEMINI_API_KEY --value "your-gemini-key"

# Simulate
cre workflow simulate --verbose --broadcast
```

### Mock API

```bash
cd workflow/mock-api
npm install
npm run dev  # runs on :3001

# Trigger breach
curl -X POST http://localhost:3001/set-uptime \
  -H "Content-Type: application/json" \
  -H "x-admin-token: demo-secret" \
  -d '{"uptime": 98.0}'
```

### Dashboard

```bash
cd dashboard
npm install
cp .env.local.example .env.local
npm run dev  # runs on :3000
```

### Mini App

```bash
cd miniapp
npm install
npm run dev  # runs on :3002
# Tunnel: cloudflared tunnel run oathlayer-miniapp
# Access via World App: https://oathlayer-miniapp.robbyn.xyz
```

---

## Smart Contract — SLAEnforcement.sol

### Functions

| Function | Access | Description |
|---|---|---|
| `registerProvider(root, nullifierHash, proof)` | Public (payable) | Bond ETH + World ID ZK proof |
| `registerProviderRelayed(user, nullifierHash)` | CRE only | Cross-chain relay from World Chain |
| `setComplianceStatus(provider, status)` | CRE only | Set APPROVED/REJECTED (rejection is permanent) |
| `createSLA(tenant, responseTimeHrs, minUptimeBps, penaltyBps)` | Compliance-gated | Create SLA with bonded collateral |
| `recordBreach(slaId, uptimeBps)` | CRE only | Slash bond, penaltyBps read from SLA storage |
| `recordBreachWarning(slaId, riskScore, prediction)` | CRE only | AI prediction event (4h cooldown) |
| `fileClaim(slaId, description)` | Tenant only | Submit maintenance request |
| `arbitrate(slaId, upheld)` | Verified arbitrator | Override breach decision |

### Events

| Event | Trigger |
|---|---|
| `SLACreated` | New SLA agreement |
| `ClaimFiled` | Tenant files claim → triggers reactive CRE scan |
| `SLABreached` | CRE detects uptime below threshold |
| `BreachWarning` | Gemini predicts riskScore > 70 |
| `ComplianceCheckPassed` | Provider approved via ConfidentialHTTPClient |
| `ComplianceCheckFailed` | Provider rejected |

---

## World ID + CRE: Cross-Chain Identity Relay

World ID proofs are generated on World Chain via MiniKit. Because Sepolia does not natively support World ID, OathLayer uses Chainlink CRE as the trust relay: the CRE DON listens for the `ProviderRegistrationRequested` event on World Chain, verifies the event context via ConfidentialHTTPClient, and calls `setComplianceStatus()` on Sepolia — bringing Sybil-resistant identity to a chain where World ID does not natively exist.

This pattern demonstrates CRE as a general-purpose cross-chain bridge for identity proofs, not just for token transfers.

---

## Chainlink Files

| File | Chainlink Usage |
|---|---|
| [`workflow/workflow.ts`](./workflow/workflow.ts) | CRE SDK — cron trigger, EVM log triggers, ConfidentialHTTPClient, Secrets, Gemini AI integration |
| [`contracts/src/SLAEnforcement.sol`](./contracts/src/SLAEnforcement.sol) | `AggregatorV3Interface` (ETH/USD price feed), `onlyCREForwarder` access control |
| [`contracts/src/WorldChainRegistry.sol`](./contracts/src/WorldChainRegistry.sol) | Cross-chain registration proxy — emits events consumed by CRE EVM log trigger |

---

## Demo Flow

1. **Landing** (`/`) — Product overview with live status badge
2. **Register provider** (`/provider/register`) — Connect wallet → World ID verify → bond ETH → compliance check fires automatically (CRE → ConfidentialHTTPClient → mock API) → APPROVED
3. **Create SLA** (`/sla/create`) — Compliance-gated form: set uptime threshold, penalty %, bond amount
4. **Dashboard** (`/dashboard`) — Live stats: active SLAs, total bonded, AI warnings, breaches
5. **AI prediction** — CRE cron fires → Gemini analyzes uptime → BreachWarning if risk > 70
6. **Trigger breach** — `POST /set-uptime {"uptime": 98.0}` → CRE detects → `recordBreach()` → bond slashed
7. **File claim** (`/claims` or Mini App) — Tenant submits maintenance request → triggers reactive CRE scan
8. **Arbitrate** (`/arbitrate`) — World ID gated: uphold or overturn breach
9. **Tenderly explorer** — All transactions publicly verifiable without a wallet

### Quick Test (No World ID Required)

```bash
# 1. Start services
cd workflow/mock-api && npm run dev        # :3001
cd dashboard && npm run dev                # :3000

# 2. Fund wallet + register provider via Tenderly impersonation
cast rpc tenderly_setBalance <YOUR_ADDRESS> 0x56BC75E2D63100000 \
  --rpc-url $TENDERLY_RPC_URL

cast send $SLA_CONTRACT "registerProviderRelayed(address,uint256)" \
  <YOUR_ADDRESS> 12345 \
  --rpc-url $TENDERLY_RPC_URL \
  --from $CRE_FORWARDER --unlocked

cast send $SLA_CONTRACT "setComplianceStatus(address,uint8)" \
  <YOUR_ADDRESS> 1 \
  --rpc-url $TENDERLY_RPC_URL \
  --from $CRE_FORWARDER --unlocked

# 3. Create SLA on dashboard → /sla/create
# 4. Force breach
curl -X POST http://localhost:3001/set-uptime \
  -H "x-admin-token: demo-secret" \
  -H "Content-Type: application/json" \
  -d '{"uptime": 90.0}'

# 5. Run CRE workflow
cd workflow && cre workflow simulate --verbose --broadcast
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Contracts | Foundry (Solidity ^0.8.20) |
| Automation | Chainlink CRE SDK (TypeScript) |
| AI | Gemini 2.0 Flash (structured output, TEE-encrypted) |
| Price Feeds | Chainlink AggregatorV3Interface (ETH/USD) |
| Privacy | CRE ConfidentialHTTPClient (TEE enclaves) |
| Identity | World ID / IDKit v1 + MiniKit |
| Testing | Tenderly Virtual TestNets |
| Frontend | Next.js + wagmi + viem + RainbowKit |
| Mobile | World Mini App SDK (MiniKit) |

---

## Testing Notes

### World ID — Orb vs Device Level

In production, OathLayer uses **Orb-level** World ID verification. For hackathon testing, registration uses **Device level** (phone signup, no Orb required). The ZK proof structure and on-chain relay are identical — only the trust tier changes.

### Mini App Testing

The Mini App requires **World App** on mobile:
1. Install [World App](https://worldcoin.org/download) on iOS or Android
2. Create an account (no Orb needed for Device level)
3. Tap explore → enter `https://oathlayer-miniapp.robbyn.xyz`
4. Register as provider → verify with World ID → done

---

## Known Limitations

- Cross-chain relay trust: CRE DON is trust anchor, World ID root not re-verified on Sepolia
- Arbitration reversal has no on-chain enforcement in V1
- ComplianceStatus has no expiry mechanism
- `scanSLAs` is O(N) with N separate consensus rounds — fine at demo scale
