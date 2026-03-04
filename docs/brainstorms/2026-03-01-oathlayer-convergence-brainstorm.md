# OathLayer — Chainlink Convergence Hackathon Enhancement

**Date:** 2026-03-01
**Deadline:** 2026-03-08 11:59 PM ET (7 days)
**Status:** Approved for execution

---

## What We're Building

Enhance OathLayer from a functional SLA enforcement prototype into a **privacy-first, AI-powered compliance platform for tokenized real-world assets** — targeting 5 prize pools simultaneously.

### Enhancement 1: Confidential Compliance Layer
Add CRE **Confidential HTTP** capability to run encrypted KYC/compliance checks before providers can bond collateral. The flow:

1. Provider registers via World ID (existing)
2. CRE workflow triggers on `ProviderRegistrationRequested` event
3. CRE calls compliance API via **Confidential HTTP** (encrypted — API keys and personal data never exposed to DON nodes)
4. If compliant → CRE relays registration to Sepolia
5. If non-compliant → CRE writes rejection event, provider cannot bond

**Why this wins:** Judges explicitly created a Privacy track ($16K). Confidential HTTP launched Feb 16 — most participants don't know it exists. Combining it with World ID for Sybil-resistant compliance is genuinely novel.

### Enhancement 2: AI-Powered Breach Prediction
Replace the mock uptime API with CRE calling **Gemini Flash** (free API) to analyze provider metrics and **predict breaches before they happen.** The flow:

1. CRE cron trigger fires every 15 minutes (existing)
2. CRE fetches provider metrics via HTTP
3. CRE calls Gemini Flash with metrics history: "Analyze this uptime trend. Is a breach likely in the next 24 hours?"
4. If AI predicts breach → CRE emits `BreachWarning` event on-chain (new)
5. If actual breach detected → CRE calls `recordBreach()` as before

**Why this wins:** Predictive enforcement is a step-change from reactive detection. It's the difference between "we caught the breach" and "we prevented it." Targets CRE & AI track ($17K).

---

## Prize Strategy

| Track | Prize | Our Angle |
|---|---|---|
| **Risk & Compliance** | $16K (1st) | Core SLA enforcement + compliance layer |
| **Privacy** | $16K (1st) | Confidential HTTP compliance checks |
| **CRE & AI** | $17K (1st) | AI breach prediction via Gemini |
| **World ID + CRE** | $5K | Existing World ID integration |
| **World Mini App + CRE** | $5K | Existing miniapp |
| **Tenderly VirtualTestNets** | $5K | Existing Tenderly VNet |

**Note:** We can only win ONE main track. Best case: 1 main track ($16-17K) + 3 sponsor bounties ($15K) = **$31-32K**.

**Primary target:** Risk & Compliance ($16K) — strongest narrative fit.
**Secondary:** Privacy or CRE & AI — depends on which enhancement demos better.

---

## Why This Approach

1. **Existing project is 70% done** — we're polishing, not building from scratch
2. **CRE usage is deep and meaningful** — 4 triggers, cross-chain relay, Confidential HTTP, AI integration. Not cosmetic.
3. **5 prize pools** from one submission — maximum expected value
4. **Confidential HTTP is a competitive edge** — launched 2 weeks ago, most teams won't use it
5. **World ID + SLA enforcement is genuinely novel** — no other project does Sybil-resistant compliance for RWA service providers

---

## Key Decisions

- **Direction:** Enhance existing OathLayer (not start fresh)
- **Scope:** 2 enhancements + polish (not 1, not 3)
- **AI Model:** Gemini Flash via free API key (Google AI Studio)
- **Compliance API:** Mock API with realistic response schema (Confidential HTTP proves the pattern; real KYC integration is post-hackathon)
- **Primary track:** Risk & Compliance
- **Demo priority:** End-to-end flow showing breach prediction → compliance check → automated enforcement

---

## Team Structure

| Role | Owner | Responsibilities |
|---|---|---|
| **Tech Lead / Architect** | Claude Lead | CRE workflow deepening, cross-chain logic, integration, PR reviews |
| **Smart Contract Engineer** | Agent 1 | Access control fixes, compliance gate contract, `BreachWarning` event, arbitration enforcement |
| **Frontend / Demo Engineer** | Agent 2 | Wire dashboard to live data, polish UI, demo video flow |
| **CRE & Integration Engineer** | Agent 3 | Confidential HTTP workflow, AI breach prediction workflow, Tenderly demo setup |
| **Project Manager** | Ammar | Monitoring, demo script, submission materials, judging alignment |

---

## 7-Day Sprint Plan

### Days 1-2 (Mar 1-2): Foundation
- [ ] **BLOCKER:** Validate Confidential HTTP works in CRE TypeScript SDK (if Go-only, fall back to regular HTTP + secret management)
- [ ] Fix `recordBreach` access control (CRE forwarder only)
- [ ] Add `ComplianceStatus` mapping + `complianceGate` modifier to SLAEnforcement
- [ ] Add `BreachWarning` event to contract
- [ ] Set up Gemini Flash API key
- [ ] Design Confidential HTTP workflow trigger
- [ ] Draft demo script outline (don't wait until Day 6)

### Days 3-4 (Mar 3-4): Core Features
- [ ] Implement Confidential HTTP compliance check in CRE workflow
- [ ] Implement AI breach prediction in CRE workflow (Gemini Flash call)
- [ ] Wire dashboard to live data — **demo-critical pages only**: main dashboard (`/`) + provider register (`/provider/register`)
- [ ] Wire miniapp SLA list to on-chain data (if time permits — lower priority than CRE features)

### Days 5-6 (Mar 5-6): Integration & Polish
- [ ] End-to-end integration testing on Tenderly VNet
- [ ] Dashboard UI polish (compliance status badges, breach prediction alerts)
- [ ] Demo script write-up
- [ ] _(Optional, cut if behind)_ Fix arbitration to enforce outcomes (bond restoration on overturn)

### Day 7 (Mar 7): Submission
- [ ] Record 3-5 min demo video
- [ ] Write submission description + README
- [ ] Final deploy to Tenderly VNet
- [ ] Submit before 11:59 PM ET March 8

---

## Open Questions

1. **Does Confidential HTTP have TypeScript SDK support?** Must validate Day 1. Fallback: use regular HTTP capability + CRE secret management (still demonstrates privacy intent, weaker narrative).
2. **Can we submit to multiple main tracks?** Hackathon rules say "stack prizes" for main + sponsor, unclear on multiple mains. Assume one main track for safety.

---

## Technical Notes

### Gemini Flash Integration
- Free tier: 15 RPM, 1M tokens/day — more than enough for hackathon
- API: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- CRE calls via HTTP capability (or Confidential HTTP to keep the API key private)
- Prompt: structured JSON with metrics history → structured JSON response with risk score

### Confidential HTTP
- Available since Feb 16, 2026
- CRE SDK capability: secrets are encrypted, DON nodes process without seeing plaintext
- Use for: compliance API calls where provider PII/credentials must stay private
- Reference: `@chainlink/cre-sdk` Confidential HTTP capability
