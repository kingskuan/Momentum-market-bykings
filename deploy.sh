#!/bin/bash

# ══════════════════════════════════════════════════════
#  Momentum Market — One-Command Deploy Script
#  Target: X Layer Testnet (Chain ID 195)
# ══════════════════════════════════════════════════════

set -e

echo ""
echo "⚡ MOMENTUM MARKET — Deployment Script"
echo "══════════════════════════════════════"

# ── 0. Check deps ─────────────────────────────────────
if ! command -v forge &> /dev/null; then
  echo "Installing Foundry..."
  curl -L https://foundry.paradigm.xyz | bash
  source "$HOME/.bashrc"
  foundryup
fi

# ── 1. Deploy contract to X Layer Testnet ─────────────
echo ""
echo "📦 Step 1: Deploying MomentumMarket.sol to X Layer Testnet..."
echo "   RPC: https://testrpc.xlayer.tech"
echo "   Chain ID: 195"
echo ""

if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Error: Set your PRIVATE_KEY environment variable first"
  echo "   export PRIVATE_KEY=0xyour_private_key_here"
  exit 1
fi

cd "$(dirname "$0")"

forge create contracts/MomentumMarket.sol:MomentumMarket \
  --rpc-url https://testrpc.xlayer.tech \
  --private-key $PRIVATE_KEY \
  --legacy \
  --json > /tmp/deploy_out.json

CONTRACT_ADDRESS=$(cat /tmp/deploy_out.json | grep -o '"deployedTo":"[^"]*"' | cut -d'"' -f4)

echo "✅ Contract deployed at: $CONTRACT_ADDRESS"
echo ""

# ── 2. Write .env for web app ─────────────────────────
echo "📝 Step 2: Writing .env.local..."
cat > web/.env.local << EOF
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
NEXT_PUBLIC_CONTRACT_ADDRESS=$CONTRACT_ADDRESS
NEXT_PUBLIC_RPC_URL=https://testrpc.xlayer.tech
NEXT_PUBLIC_CHAIN_ID=195
EOF

echo "✅ .env.local written"
echo ""

# ── 3. Install web deps + deploy to Vercel ────────────
echo "🌐 Step 3: Deploying frontend to Vercel..."
cd web

if ! command -v vercel &> /dev/null; then
  npm install -g vercel
fi

npm install
vercel --prod --yes \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e NEXT_PUBLIC_CONTRACT_ADDRESS="$CONTRACT_ADDRESS" \
  -e NEXT_PUBLIC_RPC_URL="https://testrpc.xlayer.tech" \
  -e NEXT_PUBLIC_CHAIN_ID="195"

echo ""
echo "══════════════════════════════════════════════════"
echo "🏆 DEPLOYMENT COMPLETE"
echo "   Contract: $CONTRACT_ADDRESS"
echo "   Explorer: https://www.oklink.com/xlayer-test/address/$CONTRACT_ADDRESS"
echo "══════════════════════════════════════════════════"
