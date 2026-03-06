"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, parseAbiItem } from "viem";
import { SLA_CONTRACT_ADDRESS, SLA_ABI, DEPLOY_BLOCK } from "@/lib/contract";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

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

  const { data: claimCount } = useReadContract({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    functionName: "claimCount",
  });

  useEffect(() => {
    if (!publicClient) return;
    const fetchBreaches = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: SLA_CONTRACT_ADDRESS,
          event: parseAbiItem("event SLABreached(uint256 indexed slaId, address indexed provider, uint256 uptimeBps, uint256 penaltyAmount)"),
          fromBlock: DEPLOY_BLOCK, toBlock: "latest",
        });
        setBreaches(logs.map((log) => ({
          slaId: Number(log.args.slaId), provider: log.args.provider as string,
          uptimeBps: Number(log.args.uptimeBps), penaltyAmount: formatEther(log.args.penaltyAmount ?? BigInt(0)),
          blockNumber: log.blockNumber, txHash: log.transactionHash,
        })).reverse());
      } catch (e) { console.error("Failed to fetch breach events:", e); }
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
    <div className="max-w-2xl mx-auto">
      <motion.div initial="hidden" animate="visible" className="space-y-8">
        <motion.div custom={0} variants={fadeUp}>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-1">Claims</h1>
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>
            File maintenance claims against active SLAs. CRE monitors response times.
          </p>
        </motion.div>

        {/* File claim form */}
        <motion.div custom={1} variants={fadeUp} className="glass-card glass-card-glow rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-white">File a Claim</h2>
            {!isConnected && <ConnectButton />}
          </div>
          <form onSubmit={handleSubmit} className={`space-y-4 ${!isConnected ? "opacity-40 pointer-events-none" : ""}`}>
            <div>
              <label className="block text-[13px] mb-1.5" style={{ color: "var(--muted)" }}>SLA ID</label>
              <input
                type="number"
                value={form.slaId}
                onChange={e => setForm({ ...form, slaId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg text-white text-[14px]"
                min="0"
              />
            </div>
            <div>
              <label className="block text-[13px] mb-1.5" style={{ color: "var(--muted)" }}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the maintenance issue..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg text-white text-[14px] resize-none"
                required
              />
            </div>
            <button type="submit" disabled={!isConnected || isLoading} className="btn-primary px-6 py-2.5 text-[14px]">
              {isLoading ? "Submitting..." : "File Claim"}
            </button>

            {txHash && !isSuccess && (
              <p className="text-[12px] font-mono" style={{ color: "var(--muted)" }}>Tx: {txHash.slice(0, 20)}... confirming...</p>
            )}
            {isSuccess && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px]" style={{ color: "rgba(74,222,128,0.8)" }}>
                Claim filed on-chain. CRE will monitor provider response time.{" "}
                <a href={`${process.env.NEXT_PUBLIC_TENDERLY_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-[11px]">View tx</a>
              </motion.p>
            )}
            {error && <p className="text-red-400 text-[13px]">{error.message.split("\n")[0]}</p>}
          </form>
        </motion.div>

        {claimCount !== undefined && (
          <motion.div custom={2} variants={fadeUp} className="text-[13px]" style={{ color: "var(--muted)" }}>
            Total claims on-chain: <span className="text-white font-mono">{claimCount.toString()}</span>
          </motion.div>
        )}

        {/* Breaches */}
        <motion.div custom={3} variants={fadeUp}>
          <h2 className="text-[15px] font-semibold text-white mb-3">Recent CRE-Enforced Breaches</h2>
          {breaches.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>No breach events detected yet.</p>
          ) : (
            <div className="space-y-2">
              {breaches.map((breach, i) => (
                <motion.div
                  key={breach.txHash}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white text-[13px] font-medium">SLA #{breach.slaId} — Uptime breach detected</p>
                      <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>
                        Provider {breach.provider.slice(0, 10)}... &middot; Uptime {(breach.uptimeBps / 100).toFixed(2)}% &middot; Penalty {breach.penaltyAmount} ETH
                      </p>
                      <p className="text-[11px] mt-0.5 font-mono" style={{ color: "var(--muted)" }}>
                        Block {breach.blockNumber.toString()} &middot;{" "}
                        <a href={`${process.env.NEXT_PUBLIC_TENDERLY_EXPLORER}/tx/${breach.txHash}`} target="_blank" rel="noreferrer" className="underline">
                          {breach.txHash.slice(0, 14)}...
                        </a>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ color: "rgba(239,68,68,0.7)", background: "rgba(239,68,68,0.08)" }}>
                      Auto-Penalized
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
