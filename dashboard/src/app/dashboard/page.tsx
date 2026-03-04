"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useReadContract, useReadContracts, usePublicClient, useWatchContractEvent } from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import { SLA_CONTRACT_ADDRESS, SLA_ABI, DEPLOY_BLOCK } from "@/lib/contract";

// --- Types ---
type SLAData = {
  id: number;
  provider: string;
  tenant: string;
  bondAmount: bigint;
  responseTimeHrs: bigint;
  minUptimeBps: bigint;
  penaltyBps: bigint;
  createdAt: bigint;
  active: boolean;
};

type BreachWarningEvent = {
  slaId: bigint;
  riskScore: bigint;
  prediction: string;
  blockNumber: bigint;
};

type BreachEvent = {
  slaId: bigint;
  provider: string;
  uptimeBps: bigint;
  penaltyAmount: bigint;
  blockNumber: bigint;
  transactionHash: string;
};

// --- Components ---

function StatCard({ label, value, subtitle, color }: { label: string; value: string; subtitle?: string; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-6 border"
      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
    >
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color: color || 'white' }}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

function BondHealthBar({ bond, max }: { bond: number; max: number }) {
  const pct = max > 0 ? Math.min((bond / max) * 100, 100) : 0;
  const color = pct > 66 ? '#22c55e' : pct > 33 ? '#f59e0b' : '#ef4444';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Bond Health</span>
        <span>{bond.toFixed(4)} ETH</span>
      </div>
      <div className="h-2 rounded-full bg-gray-700">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const color = score > 70 ? '#ef4444' : score > 50 ? '#f59e0b' : '#22c55e';
  const label = score > 70 ? 'High' : score > 50 ? 'Medium' : 'Low';
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ color, background: `${color}20` }}>
      {label} ({score})
    </span>
  );
}

// --- Main Dashboard ---

export default function Dashboard() {
  const publicClient = usePublicClient();

  // Read SLA count
  const { data: slaCount } = useReadContract({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    functionName: "slaCount",
  });

  // Read breach count from state var
  const { data: breachCount } = useReadContract({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    functionName: "breachCount",
  });

  // Batch read all SLAs via multicall
  const slaIds = Array.from({ length: Number(slaCount ?? 0) }, (_, i) => i);
  const { data: slaResults } = useReadContracts({
    contracts: slaIds.map(id => ({
      address: SLA_CONTRACT_ADDRESS,
      abi: SLA_ABI,
      functionName: "slas" as const,
      args: [BigInt(id)] as const,
    })),
  });

  // Parse SLA data
  const slas: SLAData[] = (slaResults ?? []).map((result, i) => {
    if (result.status !== "success" || !result.result) {
      return null;
    }
    const r = result.result as readonly [string, string, bigint, bigint, bigint, bigint, bigint, boolean];
    return {
      id: i,
      provider: r[0],
      tenant: r[1],
      bondAmount: r[2],
      responseTimeHrs: r[3],
      minUptimeBps: r[4],
      penaltyBps: r[5],
      createdAt: r[6],
      active: r[7],
    };
  }).filter(Boolean) as SLAData[];

  // Historical breach warnings via getLogs
  const [breachWarnings, setBreachWarnings] = useState<BreachWarningEvent[]>([]);
  const [breachEvents, setBreachEvents] = useState<BreachEvent[]>([]);

  // Load historical events once on mount
  useEffect(() => {
    if (!publicClient) return;
    const fetchEvents = async () => {
      const [warningLogs, breachLogs] = await Promise.all([
        publicClient.getLogs({
          address: SLA_CONTRACT_ADDRESS,
          event: parseAbiItem("event BreachWarning(uint256 indexed slaId, uint256 riskScore, string prediction)"),
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: SLA_CONTRACT_ADDRESS,
          event: parseAbiItem("event SLABreached(uint256 indexed slaId, address indexed provider, uint256 uptimeBps, uint256 penaltyAmount)"),
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        }),
      ]);
      setBreachWarnings(warningLogs.map(log => ({
        slaId: log.args.slaId!,
        riskScore: log.args.riskScore!,
        prediction: log.args.prediction!,
        blockNumber: log.blockNumber,
      })));
      setBreachEvents(breachLogs.map(log => ({
        slaId: log.args.slaId!,
        provider: log.args.provider!,
        uptimeBps: log.args.uptimeBps!,
        penaltyAmount: log.args.penaltyAmount!,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      })));
    };
    fetchEvents();
  }, [publicClient]);

  // Real-time BreachWarning events — deduplicated by blockNumber to prevent double-adds
  useWatchContractEvent({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    eventName: "BreachWarning",
    onLogs(logs) {
      const newWarnings = (logs as unknown as { args: { slaId: bigint; riskScore: bigint; prediction: string }; blockNumber: bigint }[])
        .map(log => ({ slaId: log.args.slaId, riskScore: log.args.riskScore, prediction: log.args.prediction, blockNumber: log.blockNumber }));
      setBreachWarnings(prev => {
        const existingKeys = new Set(prev.map(w => `${w.slaId}-${w.blockNumber}`));
        const fresh = newWarnings.filter(w => !existingKeys.has(`${w.slaId}-${w.blockNumber}`));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    },
    poll: true,
    pollingInterval: 5_000,
  });

  // Real-time SLABreached events — deduplicated by transactionHash
  useWatchContractEvent({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    eventName: "SLABreached",
    onLogs(logs) {
      const newBreaches = (logs as unknown as { args: { slaId: bigint; provider: string; uptimeBps: bigint; penaltyAmount: bigint }; blockNumber: bigint; transactionHash: string }[])
        .map(log => ({ slaId: log.args.slaId, provider: log.args.provider, uptimeBps: log.args.uptimeBps, penaltyAmount: log.args.penaltyAmount, blockNumber: log.blockNumber, transactionHash: log.transactionHash }));
      setBreachEvents(prev => {
        const existingHashes = new Set(prev.map(e => e.transactionHash));
        const fresh = newBreaches.filter(b => !existingHashes.has(b.transactionHash));
        return fresh.length ? [...fresh, ...prev] : prev;
      });
    },
    poll: true,
    pollingInterval: 5_000,
  });

  // Computed stats
  const activeSLAs = slas.filter(s => s.active).length;
  const totalBonded = slas.reduce((sum, s) => sum + Number(formatEther(s.bondAmount)), 0);
  const breachCountNum = Number(breachCount ?? 0);

  // Build risk score map — always overwrite so last write wins (getLogs returns ascending block order)
  const latestRiskScores = new Map<number, number>();
  for (const w of breachWarnings) {
    latestRiskScores.set(Number(w.slaId), Number(w.riskScore));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">SLA Dashboard</h1>
        <p className="text-gray-400 mt-1">Real-time compliance monitoring for tokenized RWA service agreements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Active SLAs" value={`${activeSLAs}`} subtitle="agreements enforced" color="#5493F7" />
        <StatCard label="Total Bonded" value={`${totalBonded.toFixed(2)} ETH`} subtitle="locked as collateral" color="#22c55e" />
        <StatCard label="Warnings" value={`${breachWarnings.length}`} subtitle="AI predictions" color="#f59e0b" />
        <StatCard label="Breaches" value={`${breachCountNum}`} subtitle="penalties executed" color={breachCountNum > 0 ? '#ef4444' : '#22c55e'} />
      </div>

      {/* Breach Warnings */}
      {breachWarnings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">AI Breach Predictions</h2>
          <div className="space-y-2">
            {breachWarnings.slice(0, 10).map((w, i) => (
              <motion.div
                key={`${w.slaId}-${w.blockNumber}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg p-4 border flex items-center justify-between"
                style={{ background: 'var(--card)', borderColor: Number(w.riskScore) > 70 ? '#ef444440' : 'var(--card-border)' }}
              >
                <div>
                  <span className="font-mono text-sm text-gray-400">SLA #{Number(w.slaId)}</span>
                  <p className="text-white text-sm mt-1">{w.prediction}</p>
                </div>
                <RiskBadge score={Number(w.riskScore)} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* SLA Cards */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Active Agreements</h2>
        {slas.length === 0 ? (
          <div className="rounded-xl p-8 border text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <p className="text-gray-400">No SLAs found. Connect to a deployed contract to see live data.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {slas.map((sla, i) => {
              const riskScore = latestRiskScores.get(sla.id);
              return (
                <motion.div
                  key={sla.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl p-6 border"
                  style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-400">SLA #{sla.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sla.active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                          {sla.active ? 'Active' : 'Inactive'}
                        </span>
                        {riskScore !== undefined && <RiskBadge score={riskScore} />}
                      </div>
                      <p className="text-white font-medium mt-1">
                        Provider: <span className="font-mono text-sm text-gray-300">{sla.provider.slice(0, 10)}...</span>
                      </p>
                      <p className="text-gray-400 text-sm">
                        Min uptime: {Number(sla.minUptimeBps) / 100}% &middot; Response: {Number(sla.responseTimeHrs)}h &middot; Penalty: {Number(sla.penaltyBps) / 100}%
                      </p>
                    </div>
                    <a
                      href={`/sla/${sla.id}`}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                      style={{ background: 'var(--chainlink-blue)' }}
                    >
                      View Details
                    </a>
                  </div>
                  <BondHealthBar bond={Number(formatEther(sla.bondAmount))} max={3} />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Breaches */}
      {breachEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Recent Breaches</h2>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--card-border)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--card)' }}>
                <tr className="text-gray-400 text-left">
                  <th className="px-4 py-3">SLA</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Uptime</th>
                  <th className="px-4 py-3">Penalty</th>
                  <th className="px-4 py-3">Block</th>
                  <th className="px-4 py-3">Tx</th>
                </tr>
              </thead>
              <tbody>
                {breachEvents.slice(0, 20).map((breach, i) => (
                  <tr key={`${breach.transactionHash}-${i}`} className="border-t" style={{ borderColor: 'var(--card-border)', background: i % 2 === 0 ? '#0d0d1a' : 'var(--card)' }}>
                    <td className="px-4 py-3 text-white font-mono">#{Number(breach.slaId)}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono">{breach.provider.slice(0, 10)}...</td>
                    <td className="px-4 py-3 text-red-400">{Number(breach.uptimeBps) / 100}%</td>
                    <td className="px-4 py-3 text-orange-400">{formatEther(breach.penaltyAmount)} ETH</td>
                    <td className="px-4 py-3 text-gray-400">{Number(breach.blockNumber)}</td>
                    <td className="px-4 py-3 font-mono text-blue-400">{breach.transactionHash.slice(0, 10)}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
