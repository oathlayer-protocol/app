# Dashboard Module

Next.js 14 dashboard with wagmi + viem + RainbowKit. Data from Ponder GraphQL indexer.

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/(landing)/page.tsx` | Landing page |
| `/dashboard` | `app/dashboard/page.tsx` | Live SLAs (5), AI Tribunal (5), Breaches (5) — preview with "View all →" |
| `/dashboard/slas` | `app/dashboard/slas/page.tsx` | All SLA agreements |
| `/dashboard/predictions` | `app/dashboard/predictions/page.tsx` | All AI Tribunal verdicts with per-agent breakdown |
| `/dashboard/breaches` | `app/dashboard/breaches/page.tsx` | All breaches with tenant column |
| `/provider/register` | `app/provider/register/page.tsx` | World ID verify + bond ETH + compliance status polling |
| `/sla/create` | `app/sla/create/page.tsx` | Create SLA (compliance-gated) |
| `/sla/[id]` | `app/sla/[id]/page.tsx` | SLA detail: agreement, breaches, tribunal history, claims |
| `/arbitrate` | `app/arbitrate/page.tsx` | World ID gated arbitration |

## Data Patterns

- **Primary data source**: Ponder GraphQL at `NEXT_PUBLIC_PONDER_URL` (default `:42069`)
- **Queries**: `lib/ponder.ts` — `fetchDashboardData()`, `fetchSLADetail()`, `fetchTenantData()`
- **Hooks**: `hooks/usePonderData.ts` — `useDashboardData()`, `useSLADetail()`, `useTenantData()` (5s poll)
- **Collateral ratio**: Still uses wagmi `useReadContract` (not indexed by Ponder)
- **Ponder returns strings for bigint fields** — wrap with `BigInt()` for `formatEther()`

## Key Components

- `AppShell` — Nav (Dashboard, Register, Create SLA, Arbitrate) + DemoBanner + DemoControls FAB
- `TribunalVerdicts.tsx` — `AgentVerdictList` parses summary into per-agent lines (A=Analyst, D=Advocate, J=Judge)
- `TribunalBadge` — 3-tier: PENALIZED (red, block-proximity matched), WARNING (amber), CLEAR (green)
- `RiskBadge` — risk score badge (green <50 / amber 50-70 / red >70), resets to 0 on CLEAR verdict
- `BondHealthBar` — visual bond health indicator
- `StatCard` — metric display card with animated entry

## Demo Controls (FAB)

Persisted via `localStorage("oathlayer-demo")`. Controls:
- **SLA**: "all" or specific # — target SLA(s)
- **Uptime %**: simulated uptime value
- **Simulate Breach**: runs AI Tribunal + breach if below threshold
- **Warning Only**: tribunal + warning (no slash)
- **+25h**: fast-forward VNet time past cooldowns
- **Reset**: restore healthy uptime + clear cooldowns
- Proxied through `/api/demo` route → mock API `:3001`

## Config

- Chain: Tenderly VNet (Sepolia fork, chain ID 11155111)
- RPC configured in `lib/wagmi.ts`
- Contract address + ABI in `lib/contract.ts`

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SLA_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://virtual.sepolia.eu.rpc.tenderly.co/...
NEXT_PUBLIC_WLD_APP_ID=app_staging_oathlayer
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_DEPLOY_BLOCK=0
NEXT_PUBLIC_TENDERLY_EXPLORER=https://dashboard.tenderly.co/...
NEXT_PUBLIC_PONDER_URL=http://localhost:42069
```

## Commands

```bash
npm install
npm run dev     # dev server on :3000
npm run build   # production build
```
