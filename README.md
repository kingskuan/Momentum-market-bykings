# ⚡ Momentum Market

> **Trade match momentum, not outcomes.**
> AI-powered real-time momentum trading for World Cup 2026 — built on X Layer.

🌐 **Live Demo**: [momentum-market.vercel.app](https://momentum-market.vercel.app)
📜 **Contract**: [X Layer Testnet Explorer](#)
🏆 **OKX Build X Hackathon 2026 — X Cup Track**

---

## The Problem

Every World Cup prediction market asks the same question: *who wins?*

Binary. Boring. Decided at 90 minutes.

Meanwhile, the real drama happens **during the match** — a red card shifts momentum. A goal changes everything. A substitute catches fire. This is where fans live, but no DeFi product captures it.

## The Solution

**Momentum Market** introduces a new primitive: **trading the direction of momentum**, not the outcome.

- Claude AI analyzes live match stats every 60 seconds
- Outputs a momentum score (0–100) per team
- Users go LONG (momentum rising) or SHORT (momentum falling)
- Smart contract locks entry momentum onchain
- Settlement distributes the pool to correct-direction holders

**If you correctly predict momentum will rise from 38 → 65 after France's second goal, you win — even if France ultimately loses the match.**

---

## Architecture

```
Live Match Stats
      ↓
Claude AI (momentum scoring)
      ↓
Momentum Score (0-100) → Onchain via Oracle
      ↓
MomentumMarket.sol (X Layer Testnet)
      ↓
User Positions (LONG / SHORT) → Settlement
```

### Smart Contract (`MomentumMarket.sol`)
- `createMatch()` — Owner registers a live match
- `updateMomentum()` — AI oracle pushes new scores every 60s
- `openPosition()` — Users stake OKB to go LONG or SHORT
- `settleMatch()` — Distributes pool to correct direction holders (2% protocol fee)

### AI Agent (Claude Sonnet)
- Analyzes: possession, shots on target, goals, cards, corners, pass accuracy
- Outputs: momentum score + analysis + key factor
- Updates onchain every 60 seconds during match

### Frontend (Next.js + X Layer)
- Real-time momentum bars with animated transitions
- Live momentum history chart
- One-click LONG/SHORT with OKX Wallet
- AI analysis panel showing reasoning

---

## Why This Wins

| Criterion | How We Score |
|---|---|
| **Innovation** | First protocol to trade momentum direction, not outcomes. New DeFi primitive. |
| **Market Value** | Every casual fan understands "which team is on top right now" — massive addressable market |
| **Completion** | Full stack: deployed contract + live AI + working frontend |
| **X Layer Native** | Contract on X Layer Testnet, OKX Wallet integration, OKB as native token |

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/your-username/momentum-market
cd momentum-market

# 2. Web app
cd web
cp .env.example .env.local
# Fill in your ANTHROPIC_API_KEY
npm install
npm run dev
# Open http://localhost:3000

# 3. Deploy contract (requires Foundry)
export PRIVATE_KEY=0xyour_key
export ANTHROPIC_API_KEY=your_key
bash deploy.sh
```

---

## Contract Details

- **Network**: X Layer Testnet (Chain ID: 195)
- **RPC**: `https://testrpc.xlayer.tech`
- **Language**: Solidity 0.8.20
- **Native Token**: OKB
- **Platform Fee**: 2% (onchain)

---

## Team

Built for **OKX Build X Hackathon 2026** — X Cup Track

*"The score tells you the past. Momentum tells you the future."*
