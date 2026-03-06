"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IDKitWidget, VerificationLevel, type ISuccessResult } from "@worldcoin/idkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, parseAbiItem } from "viem";
import { SLA_CONTRACT_ADDRESS, SLA_ABI, DEPLOY_BLOCK } from "@/lib/contract";
import { decodeProof } from "@/lib/proof";

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

function DisputeCard({ slaId, provider, uptimeBps, penaltyAmount }: {
  slaId: number; provider: string; uptimeBps: number; penaltyAmount: string;
}) {
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [decided, setDecided] = useState<boolean | null>(null);

  const handleArbitrate = (upheld: boolean) => {
    setDecided(upheld);
    writeContract({
      address: SLA_CONTRACT_ADDRESS, abi: SLA_ABI, functionName: "arbitrate",
      args: [BigInt(slaId), upheld],
    });
  };

  const isLoading = isPending || isConfirming;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card glass-card-glow rounded-2xl p-5 md:p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-medium text-white text-[14px]">SLA #{slaId} Breach Dispute</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>
            Provider {provider.slice(0, 10)}... &middot; Uptime {(uptimeBps / 100).toFixed(2)}%
          </p>
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>Penalty: {penaltyAmount} ETH</p>
        </div>
        <span
          className="px-2.5 py-1 rounded-md text-[11px] font-medium"
          style={{
            color: isSuccess ? "rgba(74,222,128,0.8)" : "var(--muted-strong)",
            background: isSuccess ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.05)",
          }}
        >
          {isSuccess ? (decided ? "Breach Upheld" : "Overturned") : "Pending Review"}
        </span>
      </div>

      <div className="p-3 rounded-lg mb-4 text-[13px]" style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)" }}>
        CRE detected uptime below threshold. Provider claims API measurement was incorrect during a monitoring window.
      </div>

      {isSuccess ? (
        <p className="text-[13px]" style={{ color: "rgba(74,222,128,0.8)" }}>
          Decision recorded on-chain.{" "}
          <a href={`${process.env.NEXT_PUBLIC_TENDERLY_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline font-mono text-[11px]">View tx</a>
        </p>
      ) : (
        <div className="flex gap-3">
          <button
            disabled={isLoading}
            onClick={() => handleArbitrate(true)}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40"
            style={{ border: "1px solid rgba(74,222,128,0.15)", color: "rgba(74,222,128,0.8)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(74,222,128,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {isLoading && decided === true ? "Submitting..." : "Uphold Breach"}
          </button>
          <button
            disabled={isLoading}
            onClick={() => handleArbitrate(false)}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40"
            style={{ border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.7)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {isLoading && decided === false ? "Submitting..." : "Overturn Decision"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-red-400 text-[13px]">{error.message.split("\n")[0]}</p>}
    </motion.div>
  );
}

export default function Arbitrate() {
  const { address, isConnected } = useAccount();
  const [proof, setProof] = useState<ISuccessResult | null>(null);
  const [breaches, setBreaches] = useState<BreachEvent[]>([]);
  const publicClient = usePublicClient();

  const { data: isVerifiedArbitrator } = useReadContract({
    address: SLA_CONTRACT_ADDRESS, abi: SLA_ABI, functionName: "verifiedArbitrators",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { writeContract, data: regTxHash, isPending: regPending, error: regError } = useWriteContract();
  const { isLoading: regConfirming, isSuccess: regSuccess } = useWaitForTransactionReceipt({ hash: regTxHash });

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

  const handleVerify = async (result: ISuccessResult) => {
    const res = await fetch("/api/verify-worldid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result, action: "oathlayer-arbitrator-register" }),
    });
    if (!res.ok) throw new Error("Verification failed");
    setProof(result);
  };

  const handleRegisterArbitrator = () => {
    if (!proof) return;
    writeContract({
      address: SLA_CONTRACT_ADDRESS, abi: SLA_ABI, functionName: "registerArbitrator",
      args: [BigInt(proof.merkle_root), BigInt(proof.nullifier_hash), decodeProof(proof.proof)],
    });
  };

  const isRegistered = isVerifiedArbitrator || regSuccess;

  // Gate: not connected
  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">&#x1F512;</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Arbitration Panel</h1>
          <p className="text-[14px] mb-8" style={{ color: "var(--muted)" }}>Connect wallet and verify World ID to access arbitration.</p>
          <ConnectButton />
        </motion.div>
      </div>
    );
  }

  // Gate: not registered
  if (!isRegistered) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">&#x1F512;</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Arbitration Panel</h1>
          <p className="text-[14px] mb-8" style={{ color: "var(--muted)" }}>World ID verification required to prevent Sybil attacks on dispute resolution.</p>

          {!proof ? (
            <IDKitWidget
              app_id={(process.env.NEXT_PUBLIC_WLD_APP_ID || "app_staging_oathlayer") as `app_${string}`}
              action="oathlayer-arbitrator-register"
              signal={address ?? ""}
              verification_level={VerificationLevel.Device}
              handleVerify={handleVerify}
              onSuccess={() => {}}
            >
              {({ open }: { open: () => void }) => (
                <button onClick={open} className="btn-primary px-8 py-3 text-[14px]">Verify with World ID</button>
              )}
            </IDKitWidget>
          ) : (
            <div className="space-y-4">
              <p className="text-[13px]" style={{ color: "rgba(74,222,128,0.8)" }}>✓ World ID verified — register on-chain to access panel</p>
              <button
                onClick={handleRegisterArbitrator}
                disabled={regPending || regConfirming}
                className="btn-primary px-8 py-3 text-[14px]"
              >
                {regPending || regConfirming ? "Registering..." : "Register as Arbitrator"}
              </button>
              {regError && <p className="text-red-400 text-[13px]">{regError.message.split("\n")[0]}</p>}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div initial="hidden" animate="visible" className="space-y-6">
        <motion.div custom={0} variants={fadeUp}>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Arbitration Panel</h1>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-medium" style={{ color: "rgba(74,222,128,0.8)", background: "rgba(74,222,128,0.08)" }}>
              World ID Verified
            </span>
          </div>
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>Review and resolve disputed SLA breaches.</p>
        </motion.div>

        {breaches.length === 0 ? (
          <motion.p custom={1} variants={fadeUp} className="text-[13px]" style={{ color: "var(--muted)" }}>No breach disputes to review.</motion.p>
        ) : (
          <div className="space-y-3">
            {breaches.map((dispute) => (
              <DisputeCard key={dispute.txHash} slaId={dispute.slaId} provider={dispute.provider} uptimeBps={dispute.uptimeBps} penaltyAmount={dispute.penaltyAmount} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
