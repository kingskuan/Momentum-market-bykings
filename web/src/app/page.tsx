"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
interface MatchStats {
  teamA: string;
  teamB: string;
  flagA: string;
  flagB: string;
  minute: number;
  possessionA: number;
  possessionB: number;
  shotsA: number;
  shotsB: number;
  shotsOnTargetA: number;
  shotsOnTargetB: number;
  goalsA: number;
  goalsB: number;
  yellowCardsA: number;
  yellowCardsB: number;
  cornerKicksA: number;
  cornerKicksB: number;
  passAccuracyA: number;
  passAccuracyB: number;
  recentEvent?: string;
}

interface MomentumResult {
  momentumA: number;
  momentumB: number;
  analysis: string;
  dominantTeam: string;
  keyFactor: string;
  aiPowered: boolean;
}

interface ChartPoint {
  minute: number;
  momentumA: number;
  momentumB: number;
}

// ── Demo match data — simulates a live World Cup match ───────────────────────
const INITIAL_STATS: MatchStats = {
  teamA: "Brazil",
  teamB: "France",
  flagA: "🇧🇷",
  flagB: "🇫🇷",
  minute: 23,
  possessionA: 54,
  possessionB: 46,
  shotsA: 6,
  shotsB: 4,
  shotsOnTargetA: 3,
  shotsOnTargetB: 1,
  goalsA: 1,
  goalsB: 0,
  yellowCardsA: 0,
  yellowCardsB: 1,
  cornerKicksA: 4,
  cornerKicksB: 2,
  passAccuracyA: 87,
  passAccuracyB: 79,
  recentEvent: "GOAL! Vinicius Jr scores from close range — 23'",
};

// Pre-scripted match events that fire every 20 seconds to simulate a live match
const MATCH_EVENTS: Partial<MatchStats>[] = [
  { minute: 28, possessionA: 49, possessionB: 51, shotsB: 6, shotsOnTargetB: 3, cornerKicksB: 4, passAccuracyB: 83, recentEvent: "France building pressure — Mbappé testing the keeper" },
  { minute: 34, possessionA: 47, possessionB: 53, shotsB: 9, shotsOnTargetB: 5, yellowCardsA: 1, recentEvent: "Yellow card — Brazil's Casemiro for a foul on Dembélé" },
  { minute: 40, possessionA: 47, possessionB: 53, goalsB: 1, shotsB: 10, shotsOnTargetB: 6, recentEvent: "GOAL! Mbappé equalises with a thunderous strike — 40'" },
  { minute: 45, possessionA: 52, possessionB: 48, shotsA: 9, shotsOnTargetA: 4, cornerKicksA: 6, recentEvent: "Brazil pushing for the lead before half-time" },
  { minute: 52, possessionA: 55, possessionB: 45, shotsA: 12, shotsOnTargetA: 6, recentEvent: "Brazil controlling tempo in the second half" },
  { minute: 61, possessionA: 51, possessionB: 49, shotsB: 13, shotsOnTargetB: 7, recentEvent: "France sub: Giroud on — direct aerial threat" },
  { minute: 68, possessionA: 48, possessionB: 52, shotsB: 16, shotsOnTargetB: 9, yellowCardsB: 2, recentEvent: "France relentless — Alisson making key saves" },
  { minute: 75, possessionA: 50, possessionB: 50, goalsA: 2, shotsA: 15, recentEvent: "GOAL! Rodrygo header! Brazil lead 2-1 — 75'" },
  { minute: 82, possessionA: 44, possessionB: 56, shotsB: 20, shotsOnTargetB: 12, recentEvent: "France throwing everyone forward — desperate pressure" },
  { minute: 88, possessionA: 42, possessionB: 58, goalsB: 2, shotsB: 23, recentEvent: "GOAL! Griezmann free kick! 2-2 — 88' chaos in injury time!" },
  { minute: 90, possessionA: 50, possessionB: 50, recentEvent: "Full time approaching — both teams exhausted, goes to extra time?" },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function MomentumMarketPage() {
  const [stats, setStats] = useState<MatchStats>(INITIAL_STATS);
  const [momentum, setMomentum] = useState<MomentumResult>({
    momentumA: 62,
    momentumB: 38,
    analysis: "Brazil dominating after opening goal — high press suffocating France.",
    dominantTeam: "Brazil",
    keyFactor: "Goal advantage + superior possession",
    aiPowered: false,
  });
  const [chartData, setChartData] = useState<ChartPoint[]>([
    { minute: 1, momentumA: 50, momentumB: 50 },
    { minute: 5, momentumA: 53, momentumB: 47 },
    { minute: 10, momentumA: 55, momentumB: 45 },
    { minute: 15, momentumA: 52, momentumB: 48 },
    { minute: 20, momentumA: 58, momentumB: 42 },
    { minute: 23, momentumA: 62, momentumB: 38 },
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<0 | 1>(0);
  const [positionType, setPositionType] = useState<"LONG" | "SHORT">("LONG");
  const [amount, setAmount] = useState("0.01");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [eventIdx, setEventIdx] = useState(0);
  const [recentTrades, setRecentTrades] = useState([
    { addr: "0x3f...b4a8", team: "Brazil 🇧🇷", type: "LONG", amount: "0.05 ETH", time: "2m ago" },
    { addr: "0x7a...c2f1", team: "France 🇫🇷", type: "SHORT", amount: "0.02 ETH", time: "4m ago" },
    { addr: "0x1d...e9b3", team: "Brazil 🇧🇷", type: "SHORT", amount: "0.1 ETH", time: "6m ago" },
  ]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch AI momentum score ─────────────────────────────────────────────
  const fetchMomentum = useCallback(async (currentStats: MatchStats) => {
    setLoading(true);
    try {
      const res = await fetch("/api/momentum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentStats),
      });
      const data: MomentumResult = await res.json();
      setMomentum(data);
      setChartData((prev) => [
        ...prev.slice(-19),
        { minute: currentStats.minute, momentumA: data.momentumA, momentumB: data.momentumB },
      ]);
    } catch {
      // Silently use last known value
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Simulate match progression every 20 seconds ─────────────────────────
  useEffect(() => {
    fetchMomentum(INITIAL_STATS);

    intervalRef.current = setInterval(() => {
      setEventIdx((prev) => {
        const nextIdx = (prev + 1) % MATCH_EVENTS.length;
        const update = MATCH_EVENTS[nextIdx];
        setStats((s) => {
          const newStats = { ...s, ...update };
          fetchMomentum(newStats);
          return newStats;
        });
        return nextIdx;
      });
    }, 20000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMomentum]);

  // ── Connect OKX / MetaMask wallet ──────────────────────────────────────
  const connectWallet = async () => {
    try {
      const provider = (window as any).okxwallet || (window as any).ethereum;
      if (!provider) {
        setTxStatus("Please install OKX Wallet or MetaMask");
        return;
      }
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);

      // Switch to X Layer Testnet
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xC3" }], // 195 decimal
        });
      } catch {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xC3",
            chainName: "X Layer Testnet",
            rpcUrls: ["https://testrpc.xlayer.tech"],
            nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
            blockExplorerUrls: ["https://www.oklink.com/xlayer-test"],
          }],
        });
      }
    } catch (err) {
      setTxStatus(`Wallet error: ${String(err)}`);
    }
  };

  // ── Place position (demo flow) ──────────────────────────────────────────
  const placePosition = async () => {
    if (!walletAddress) {
      setTxStatus("Connect wallet first");
      return;
    }

    const teamName = selectedTeam === 0 ? stats.teamA : stats.teamB;
    const flag = selectedTeam === 0 ? stats.flagA : stats.flagB;
    const currentMomentum = selectedTeam === 0 ? momentum.momentumA : momentum.momentumB;

    setTxStatus("⏳ Signing transaction...");

    // Demo: simulate tx delay then success
    await new Promise((r) => setTimeout(r, 1500));
    setTxStatus(`✅ Position opened! ${positionType} ${teamName} at momentum ${currentMomentum}`);

    // Add to recent trades
    setRecentTrades((prev) => [
      {
        addr: walletAddress.slice(0, 4) + "..." + walletAddress.slice(-4),
        team: `${teamName} ${flag}`,
        type: positionType,
        amount: `${amount} OKB`,
        time: "just now",
      },
      ...prev.slice(0, 4),
    ]);

    setTimeout(() => setTxStatus(null), 5000);
  };

  const teamAMomentum = momentum.momentumA;
  const teamBMomentum = momentum.momentumB;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Header ── */}
      <header className="border-b border-yellow-500/30 bg-black/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-yellow-400 font-black text-xl tracking-tight">⚡ MOMENTUM MARKET</span>
            <span className="text-xs text-yellow-600 border border-yellow-600/50 px-2 py-0.5 rounded-full">
              X Layer Testnet
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="live-dot w-2 h-2 rounded-full bg-green-400 inline-block" />
              LIVE · Min {stats.minute}&apos;
            </div>
            <button
              onClick={connectWallet}
              className="text-xs font-semibold px-4 py-2 rounded-lg border border-yellow-500/60 text-yellow-400 hover:bg-yellow-500/10 transition-all"
            >
              {walletAddress
                ? walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4)
                : "Connect OKX Wallet"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ── World Cup Badge ── */}
        <div className="text-center">
          <span className="text-xs font-medium text-yellow-500/70 tracking-widest uppercase">
            🏆 FIFA World Cup 2026 · Group Stage
          </span>
        </div>

        {/* ── Match Card ── */}
        <div className="bg-gradient-to-br from-gray-900/80 to-black border border-yellow-500/20 rounded-2xl p-6">
          {/* Teams */}
          <div className="flex items-center justify-between mb-6">
            {/* Team A */}
            <div className="text-center flex-1">
              <div className="text-5xl mb-2">{stats.flagA}</div>
              <div className="font-black text-2xl">{stats.teamA}</div>
              <div className="text-4xl font-black text-yellow-400 mt-1">{stats.goalsA}</div>
            </div>

            {/* Center */}
            <div className="text-center px-4">
              <div className="text-gray-500 font-bold text-sm mb-1">VS</div>
              <div className="text-green-400 text-xs font-semibold bg-green-400/10 border border-green-400/30 px-3 py-1 rounded-full">
                {stats.minute}&apos; ●
              </div>
            </div>

            {/* Team B */}
            <div className="text-center flex-1">
              <div className="text-5xl mb-2">{stats.flagB}</div>
              <div className="font-black text-2xl">{stats.teamB}</div>
              <div className="text-4xl font-black text-yellow-400 mt-1">{stats.goalsB}</div>
            </div>
          </div>

          {/* Recent Event */}
          {stats.recentEvent && (
            <div className="text-center text-sm text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 mb-6">
              📢 {stats.recentEvent}
            </div>
          )}

          {/* Momentum Bars */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>{stats.flagA} MOMENTUM</span>
              <span className={`font-bold ${loading ? "ai-thinking text-yellow-600" : "text-yellow-400"}`}>
                {loading ? "AI CALCULATING..." : "AI POWERED"}
              </span>
              <span>{stats.flagB} MOMENTUM</span>
            </div>

            {/* Bar A */}
            <div className="flex items-center gap-3">
              <span className="text-green-400 font-black w-8 text-right">{teamAMomentum}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden relative">
                <div
                  className="momentum-fill h-full rounded-full"
                  style={{
                    width: `${teamAMomentum}%`,
                    background: "linear-gradient(90deg, #16a34a, #4ade80)",
                    boxShadow: teamAMomentum > 60 ? "0 0 15px rgba(74, 222, 128, 0.5)" : "none",
                  }}
                />
              </div>
              <span className="text-gray-400 font-semibold text-sm">{stats.teamA}</span>
            </div>

            {/* Bar B */}
            <div className="flex items-center gap-3">
              <span className="text-blue-400 font-black w-8 text-right">{teamBMomentum}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden relative">
                <div
                  className="momentum-fill h-full rounded-full"
                  style={{
                    width: `${teamBMomentum}%`,
                    background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                    boxShadow: teamBMomentum > 60 ? "0 0 15px rgba(96, 165, 250, 0.5)" : "none",
                  }}
                />
              </div>
              <span className="text-gray-400 font-semibold text-sm">{stats.teamB}</span>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="mt-5 bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-yellow-500">🤖 AI ANALYSIS</span>
              {momentum.aiPowered && (
                <span className="text-xs text-yellow-600 border border-yellow-700/50 px-1.5 py-0.5 rounded">
                  Claude Powered
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300">{momentum.analysis}</p>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>🔑 Key factor: <span className="text-gray-300">{momentum.keyFactor}</span></span>
              <span>📈 Leading: <span className="text-yellow-400 font-semibold">{momentum.dominantTeam}</span></span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Possession", a: `${stats.possessionA}%`, b: `${stats.possessionB}%` },
            { label: "Shots", a: stats.shotsA, b: stats.shotsB },
            { label: "On Target", a: stats.shotsOnTargetA, b: stats.shotsOnTargetB },
            { label: "Corners", a: stats.cornerKicksA, b: stats.cornerKicksB },
            { label: "Yellow ⚠️", a: stats.yellowCardsA, b: stats.yellowCardsB },
            { label: "Pass %", a: `${stats.passAccuracyA}%`, b: `${stats.passAccuracyB}%` },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className="text-sm font-bold text-green-400">{s.a}</div>
              <div className="text-xs text-gray-600 my-0.5">vs</div>
              <div className="text-sm font-bold text-blue-400">{s.b}</div>
            </div>
          ))}
        </div>

        {/* ── Chart + Trade Panel ── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Momentum History Chart */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm">Momentum History</span>
              <span className="text-xs text-gray-500">Updates every 60s onchain</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                <XAxis
                  dataKey="minute"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickFormatter={(v) => `${v}'`}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                  formatter={(val, name) => [`${val}`, name === "momentumA" ? stats.teamA : stats.teamB]}
                  labelFormatter={(l) => `Minute ${l}'`}
                />
                <ReferenceLine y={50} stroke="#374151" strokeDasharray="4 2" />
                <Line
                  type="monotone"
                  dataKey="momentumA"
                  stroke="#4ade80"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="momentumB"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400 inline-block" /> {stats.teamA}</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block" /> {stats.teamB}</span>
            </div>
          </div>

          {/* Trade Panel */}
          <div className="bg-gray-900/60 border border-yellow-500/20 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-sm">Open Position</span>
              <span className="text-xs text-gray-500">Entry momentum locked onchain</span>
            </div>

            {/* Select Team */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block">Select Team</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 0, name: stats.teamA, flag: stats.flagA, momentum: teamAMomentum, color: "green" },
                  { id: 1, name: stats.teamB, flag: stats.flagB, momentum: teamBMomentum, color: "blue" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeam(t.id as 0 | 1)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedTeam === t.id
                        ? t.color === "green"
                          ? "border-green-500 bg-green-500/10"
                          : "border-blue-500 bg-blue-500/10"
                        : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-2xl">{t.flag}</div>
                    <div className="text-xs font-bold mt-1">{t.name}</div>
                    <div className={`text-xs mt-0.5 font-semibold ${t.color === "green" ? "text-green-400" : "text-blue-400"}`}>
                      MOM {t.momentum}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Long / Short */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPositionType("LONG")}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    positionType === "LONG"
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  ▲ LONG
                  <div className="text-xs font-normal opacity-70">Momentum rises</div>
                </button>
                <button
                  onClick={() => setPositionType("SHORT")}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    positionType === "SHORT"
                      ? "bg-red-500/20 border-red-500 text-red-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  ▼ SHORT
                  <div className="text-xs font-normal opacity-70">Momentum falls</div>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-2 block">Amount (OKB)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0.001"
                  className="flex-1 bg-black border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/60"
                />
                {["0.01", "0.05", "0.1"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="text-xs px-2 py-2 rounded-lg border border-gray-700 text-gray-400 hover:border-yellow-500/40 hover:text-yellow-400"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-black/60 rounded-xl p-3 mb-4 text-xs space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Entry momentum</span>
                <span className="text-white font-semibold">
                  {selectedTeam === 0 ? teamAMomentum : teamBMomentum} / 100
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Direction</span>
                <span className={`font-semibold ${positionType === "LONG" ? "text-green-400" : "text-red-400"}`}>
                  {positionType}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Platform fee</span>
                <span>2%</span>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={placePosition}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                positionType === "LONG" ? "btn-long text-white" : "btn-short text-white"
              }`}
            >
              {positionType === "LONG" ? "▲ LONG" : "▼ SHORT"}{" "}
              {selectedTeam === 0 ? stats.teamA : stats.teamB}&apos;s Momentum
            </button>

            {txStatus && (
              <div className={`mt-3 text-xs text-center p-2 rounded-lg ${
                txStatus.startsWith("✅") ? "text-green-400 bg-green-500/10" : "text-yellow-400 bg-yellow-500/10"
              }`}>
                {txStatus}
              </div>
            )}
          </div>
        </div>

        {/* ── Live Trade Feed ── */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="live-dot w-2 h-2 rounded-full bg-green-400 inline-block" />
            <span className="font-bold text-sm">Live Trades</span>
          </div>
          <div className="space-y-2">
            {recentTrades.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-2 border-b border-gray-800/60">
                <span className="text-gray-500 font-mono">{t.addr}</span>
                <span className="text-gray-300">{t.team}</span>
                <span className={`font-bold ${t.type === "LONG" ? "text-green-400" : "text-red-400"}`}>
                  {t.type}
                </span>
                <span className="text-yellow-400 font-semibold">{t.amount}</span>
                <span className="text-gray-600">{t.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── How It Works ── */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-black text-yellow-400 mb-4">How Momentum Market Works</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div className="space-y-1">
              <div className="text-white font-semibold">1. AI Scores Momentum</div>
              <p>Claude analyzes live stats every 60s — possession, shots, cards, events — and outputs a momentum score 0-100.</p>
            </div>
            <div className="space-y-1">
              <div className="text-white font-semibold">2. Trade the Direction</div>
              <p>LONG if you think momentum will rise. SHORT if you think it will fall. Your entry score is locked onchain.</p>
            </div>
            <div className="space-y-1">
              <div className="text-white font-semibold">3. Match End Settlement</div>
              <p>Smart contract compares final vs entry momentum. Winners split the loser pool. 98% distributed, 2% protocol fee.</p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-xs text-gray-700 pb-6">
          Built on X Layer · Powered by Claude AI · OKX Build X Hackathon 2026
        </div>
      </main>
    </div>
  );
}
