"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, parseAbiItem } from "viem";
import { SLA_CONTRACT_ADDRESS, SLA_ABI, DEPLOY_BLOCK } from "@/lib/contract";

type BreachEvent = {
  slaId: number;
  provider: string;
  uptimeBps: number;
  penaltyAmount: string;
  blockNumber: bigint;
  txHash: string;
};

export default function Claims() {
  const { address, isConnected } = useAccount();
  const [form, setForm] = useState({ slaId: "0", description: "" });
  const [breaches, setBreaches] = useState<BreachEvent[]>([]);
  const publicClient = usePublicClient();

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Read total claim count to know how many to fetch
  const { data: claimCount } = useReadContract({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    functionName: "claimCount",
  });

  // Fetch historical SLABreached events
  useEffect(() => {
    if (!publicClient) return;
    const fetchBreaches = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: SLA_CONTRACT_ADDRESS,
          event: parseAbiItem("event SLABreached(uint256 indexed slaId, address indexed provider, uint256 uptimeBps, uint256 penaltyAmount)"),
          fromBlock: DEPLOY_BLOCK,
          toBlock: "latest",
        });
        setBreaches(
          logs.map((log) => ({
            slaId: Number(log.args.slaId),
            provider: log.args.provider as string,
            uptimeBps: Number(log.args.uptimeBps),
            penaltyAmount: formatEther(log.args.penaltyAmount ?? BigInt(0)),
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
          })).reverse()
        );
      } catch (e) {
        console.error("Failed to fetch breach events:", e);
      }
    };
    fetchBreaches();
    const interval = setInterval(fetchBreaches, 30_000);
    return () => clearInterval(interval);
  }, [publicClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    writeContract({
      address: SLA_CONTRACT_ADDRESS,
      abi: SLA_ABI,
      functionName: "fileClaim",
      args: [BigInt(form.slaId), form.description],
    });
  };

  const isLoading = isPending || isConfirming;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Claims</h1>
        <p className="text-gray-400">File maintenance claims against active SLAs. CRE monitors response times.</p>
      </div>

      {/* File new claim */}
      <div className="rounded-xl p-6 border" style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">File a Claim</h2>
          {!isConnected && <ConnectButton />}
        </div>
        <form onSubmit={handleSubmit} className={`space-y-4 ${!isConnected ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm text-gray-400 mb-1">SLA ID</label>
            <input
              type="number"
              value={form.slaId}
              onChange={e => setForm({ ...form, slaId: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border text-white bg-transparent focus:outline-none"
              style={{ borderColor: 'var(--card-border)' }}
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the maintenance issue..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border text-white bg-transparent focus:outline-none resize-none"
              style={{ borderColor: 'var(--card-border)' }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={!isConnected || isLoading}
            className="px-6 py-2 rounded-lg font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: 'var(--chainlink-blue)' }}
          >
            {isLoading ? "Submitting..." : "File Claim"}
          </button>

          {txHash && !isSuccess && (
            <p className="text-xs text-gray-400 font-mono">
              Tx: {txHash.slice(0, 20)}... confirming...
            </p>
          )}

          {isSuccess && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-sm">
              Claim filed on-chain. CRE will monitor provider response time.{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_TENDERLY_EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="underline font-mono text-xs"
              >
                View tx
              </a>
            </motion.p>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error.message.split("\n")[0]}</p>
          )}
        </form>
      </div>

      {/* On-chain claim count */}
      {claimCount !== undefined && (
        <div className="text-sm text-gray-400">
          Total claims on-chain: <span className="text-white font-mono">{claimCount.toString()}</span>
        </div>
      )}

      {/* Recent Breaches (from on-chain events) */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent CRE-Enforced Breaches</h2>
        {breaches.length === 0 ? (
          <p className="text-gray-500 text-sm">No breach events detected yet.</p>
        ) : (
          <div className="space-y-3">
            {breaches.map((breach, i) => (
              <motion.div
                key={breach.txHash}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-4 border"
                style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">SLA #{breach.slaId} — Uptime breach detected</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Provider {breach.provider.slice(0, 10)}... &middot; Uptime {(breach.uptimeBps / 100).toFixed(2)}% &middot; Penalty {breach.penaltyAmount} ETH
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5 font-mono">
                      Block {breach.blockNumber.toString()} &middot;{" "}
                      <a
                        href={`${process.env.NEXT_PUBLIC_TENDERLY_EXPLORER}/tx/${breach.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {breach.txHash.slice(0, 14)}...
                      </a>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs text-red-400 bg-red-400/10">
                    Auto-Penalized
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
