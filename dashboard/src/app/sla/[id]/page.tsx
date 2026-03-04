"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { useReadContract, useReadContracts, usePublicClient } from "wagmi";
import { formatEther, parseAbiItem } from "viem";
import { useEffect, useState } from "react";
import { SLA_CONTRACT_ADDRESS, SLA_ABI, DEPLOY_BLOCK } from "@/lib/contract";
import Link from "next/link";

type BreachEvent = {
  uptimeBps: bigint;
  penaltyAmount: bigint;
  blockNumber: bigint;
  transactionHash: string;
};

type ClaimEvent = {
  claimId: bigint;
  tenant: string;
  blockNumber: bigint;
  transactionHash: string;
};

export default function SLADetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const slaId = BigInt(id);
  const publicClient = usePublicClient();
  const [breaches, setBreaches] = useState<BreachEvent[]>([]);
  const [claims, setClaims] = useState<ClaimEvent[]>([]);

  const { data: slaRaw, isLoading } = useReadContract({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    functionName: "slas",
    args: [slaId],
  });

  const { data: collateralRatio } = useReadContract({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    functionName: "getCollateralRatio",
    args: [slaId],
  });

  useEffect(() => {
    if (!publicClient) return;
    const fetchEvents = async () => {
      const [breachLogs, claimLogs] = await Promise.all([
        publicClient.getLogs({
          address: SLA_CONTRACT_ADDRESS,
          event: parseAbiItem("event SLABreached(uint256 indexed slaId, address indexed provider, uint256 uptimeBps, uint256 penaltyAmount)"),
          args: { slaId },
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address: SLA_CONTRACT_ADDRESS,
          event: parseAbiItem("event ClaimFiled(uint256 indexed claimId, uint256 indexed slaId, address tenant)"),
          args: { slaId },
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        }),
      ]);

      setBreaches(breachLogs.map(log => ({
        uptimeBps: log.args.uptimeBps!,
        penaltyAmount: log.args.penaltyAmount!,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      })).reverse());

      setClaims(claimLogs.map(log => ({
        claimId: log.args.claimId!,
        tenant: log.args.tenant!,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      })).reverse());
    };
    fetchEvents();
  }, [publicClient, slaId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!slaRaw) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-400">SLA #{id} not found.</p>
        <Link href="/dashboard" className="text-blue-400 text-sm mt-4 block">← Back to Dashboard</Link>
      </div>
    );
  }

  const [provider, tenant, bondAmount, responseTimeHrs, minUptimeBps, penaltyBps, createdAt, active] = slaRaw as readonly [string, string, bigint, bigint, bigint, bigint, bigint, boolean];
  const bondEth = Number(formatEther(bondAmount));
  const totalSlashed = breaches.reduce((sum, b) => sum + Number(formatEther(b.penaltyAmount)), 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <h1 className="text-3xl font-bold text-white">SLA #{id}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Core details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-6 border space-y-4"
        style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
      >
        <h2 className="text-lg font-semibold text-white">Agreement Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Provider</p>
            <p className="text-white font-mono text-xs mt-0.5">{provider}</p>
          </div>
          <div>
            <p className="text-gray-400">Tenant</p>
            <p className="text-white font-mono text-xs mt-0.5">{tenant}</p>
          </div>
          <div>
            <p className="text-gray-400">Bond Amount</p>
            <p className="text-green-400 font-bold">{bondEth.toFixed(4)} ETH</p>
          </div>
          <div>
            <p className="text-gray-400">Min Uptime</p>
            <p className="text-white font-bold">{Number(minUptimeBps) / 100}%</p>
          </div>
          <div>
            <p className="text-gray-400">Penalty Rate</p>
            <p className="text-orange-400 font-bold">{Number(penaltyBps) / 100}%</p>
          </div>
          <div>
            <p className="text-gray-400">Response Time</p>
            <p className="text-white font-bold">{Number(responseTimeHrs)}h</p>
          </div>
          <div>
            <p className="text-gray-400">Created</p>
            <p className="text-white text-xs">{new Date(Number(createdAt) * 1000).toLocaleString()}</p>
          </div>
          {collateralRatio !== undefined && (
            <div>
              <p className="text-gray-400">Collateral (USD)</p>
              <p className="text-blue-400 font-bold">${Number(collateralRatio).toLocaleString()}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 border text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <p className="text-2xl font-bold text-red-400">{breaches.length}</p>
          <p className="text-xs text-gray-400 mt-1">Breaches</p>
        </div>
        <div className="rounded-xl p-4 border text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <p className="text-2xl font-bold text-orange-400">{totalSlashed.toFixed(4)}</p>
          <p className="text-xs text-gray-400 mt-1">ETH Slashed</p>
        </div>
        <div className="rounded-xl p-4 border text-center" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
          <p className="text-2xl font-bold text-yellow-400">{claims.length}</p>
          <p className="text-xs text-gray-400 mt-1">Claims Filed</p>
        </div>
      </div>

      {/* Breach history */}
      {breaches.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Breach History</h2>
          <div className="space-y-2">
            {breaches.map((b, i) => (
              <div key={b.transactionHash} className="rounded-lg p-4 border flex items-center justify-between" style={{ background: 'var(--card)', borderColor: '#ef444430' }}>
                <div>
                  <p className="text-sm text-red-400 font-medium">Uptime: {Number(b.uptimeBps) / 100}%</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">Block {Number(b.blockNumber)} · {b.transactionHash.slice(0, 14)}...</p>
                </div>
                <p className="text-orange-400 font-mono text-sm">{formatEther(b.penaltyAmount)} ETH slashed</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claims history */}
      {claims.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Claims Filed</h2>
          <div className="space-y-2">
            {claims.map((c) => (
              <div key={c.transactionHash} className="rounded-lg p-4 border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
                <p className="text-sm text-white">Claim #{Number(c.claimId)}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">Tenant: {c.tenant.slice(0, 20)}... · Block {Number(c.blockNumber)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {breaches.length === 0 && claims.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">No breach or claim events recorded for this SLA.</p>
      )}
    </div>
  );
}
