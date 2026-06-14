# Nadlens — Monad On-Chain Analytics

Real-time analytics dashboard for Monad Mainnet. Built by KZN Labs.

## What it does

- **Live TPS heartbeat** — animated real-time throughput bar at the top of every page
- **Chain overview** — TPS, block height, gas price, gas utilization, block time
- **TPS chart** — rolling area chart of transactions per second
- **Gas utilization** — per-block bar chart showing how full each block is
- **Block feed** — live table of recent blocks with txn count, gas data, age
- **Wallet lookup** — inspect any Monad address (balance + tx count)

## Stack

- React 18 + Vite
- Recharts (charts)
- Lucide React (icons)
- Monad Public RPC (no API key needed)
  - Primary: `https://rpc2.monad.xyz` (Goldsky, 300 req/10s)
  - Fallback: `https://rpc3.monad.xyz` (Ankr)
  - Fallback: `https://rpc.monad.xyz` (QuickNode)

## Local dev

```bash
npm install
npm run dev
```

## Deploy to Vercel

### Option 1 — Vercel CLI (fastest)
```bash
npm install -g vercel
vercel
```
Follow prompts. It reads `vercel.json` automatically.

### Option 2 — Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import repo
3. Framework: Vite (auto-detected)
4. Deploy

No environment variables needed — uses Monad's public RPC directly from the browser.

## Chain info

| Property | Value |
|---|---|
| Network | Monad Mainnet |
| Chain ID | 143 |
| Currency | MON |
| RPC | rpc.monad.xyz / rpc2.monad.xyz / rpc3.monad.xyz |
| Explorer | monadvision.com |

## Roadmap (Phase 2)

- Community wallet tagging
- Smart money / whale alerts
- Token flow tracking
- DEX volume analytics
- Stablecoin supply tracker
- Pro tier with real-time push alerts
