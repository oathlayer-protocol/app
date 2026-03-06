"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IDKitWidget, VerificationLevel, type ISuccessResult } from "@worldcoin/idkit";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SLA_CONTRACT_ADDRESS, SLA_ABI } from "@/lib/contract";
import { decodeProof } from "@/lib/proof";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

function ComplianceStatusBadge({ address, txHash }: { address: string; txHash: string }) {
  const { data: complianceStatus } = useReadContract({
    address: SLA_CONTRACT_ADDRESS,
    abi: SLA_ABI,
    functionName: "providerCompliance",
    args: [address as `0x${string}`],
    query: { refetchInterval: 5_000 },
  });

  const status = Number(complianceStatus ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl mt-4 p-4"
      style={{
        borderColor: status === 1 ? "rgba(74,222,128,0.15)" : status === 2 ? "rgba(239,68,68,0.15)" : undefined,
      }}
    >
      <p className="text-[12px] font-mono mb-2" style={{ color: "var(--muted)" }}>
        Tx:{" "}
        <a href={`${process.env.NEXT_PUBLIC_TENDERLY_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer" className="underline">
          {txHash.slice(0, 20)}...
        </a>
      </p>
      {status === 0 && (
        <div className="flex items-center gap-2" style={{ color: "var(--muted-strong)" }}>
          <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--chainlink-light)", borderTopColor: "transparent" }} />
          <span className="text-[13px]">Compliance check in progress...</span>
        </div>
      )}
      {status === 1 && (
        <div className="flex items-center gap-2">
          <span className="text-lg" style={{ color: "rgba(74,222,128,0.8)" }}>&#10003;</span>
          <div>
            <p className="font-medium text-white text-[14px]">Provider registered & compliance approved</p>
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>You can now create SLAs</p>
          </div>
        </div>
      )}
      {status === 2 && (
        <div className="flex items-center gap-2 text-red-400">
          <span className="text-lg">&#10007;</span>
          <div>
            <p className="font-medium text-[14px]">Compliance rejected</p>
            <p className="text-[12px]" style={{ color: "var(--muted)" }}>This address has been permanently blocked</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function RegisterProvider() {
  const { address, isConnected } = useAccount();
  const [proof, setProof] = useState<ISuccessResult | null>(null);
  const [bondAmount, setBondAmount] = useState("0.1");

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleVerify = async (result: ISuccessResult) => {
    const res = await fetch("/api/verify-worldid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...result, action: "oathlayer-provider-register" }),
    });
    if (!res.ok) throw new Error("World ID verification failed");
    setProof(result);
  };

  const handleRegister = () => {
    if (!proof) return;
    writeContract({
      address: SLA_CONTRACT_ADDRESS,
      abi: SLA_ABI,
      functionName: "registerProvider",
      args: [BigInt(proof.merkle_root), BigInt(proof.nullifier_hash), decodeProof(proof.proof)],
      value: parseEther(bondAmount),
    });
  };

  const isLoading = isPending || isConfirming;

  return (
    <div className="max-w-xl mx-auto">
      <motion.div initial="hidden" animate="visible">
        <motion.div custom={0} variants={fadeUp}>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-1">Register as Provider</h1>
          <p className="text-[14px] mb-8" style={{ color: "var(--muted)" }}>
            Verify your identity with World ID to become an SLA provider. Bond ETH as collateral.
          </p>
        </motion.div>

        {!isConnected && (
          <motion.div custom={1} variants={fadeUp} className="glass-card rounded-2xl p-6 mb-4 flex flex-col items-center gap-4">
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>Connect your wallet to register</p>
            <ConnectButton />
          </motion.div>
        )}

        {/* Step 1: World ID */}
        <motion.div
          custom={1}
          variants={fadeUp}
          className={`glass-card glass-card-glow rounded-2xl p-6 mb-3 transition-opacity ${!isConnected ? "opacity-40 pointer-events-none" : ""}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-semibold text-white"
              style={{ background: proof ? "rgba(74,222,128,0.15)" : "rgba(55,91,210,0.2)" }}
            >
              {proof ? "✓" : "1"}
            </div>
            <div>
              <p className="font-medium text-white text-[14px]">Verify Identity</p>
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>World ID prevents Sybil attacks</p>
            </div>
          </div>

          {proof ? (
            <div className="flex items-center gap-2" style={{ color: "rgba(74,222,128,0.8)" }}>
              <span>✓</span>
              <span className="text-[13px]">World ID verified</span>
              <span className="font-mono text-[11px] ml-2" style={{ color: "var(--muted)" }}>{proof.nullifier_hash.slice(0, 14)}...</span>
            </div>
          ) : (
            <IDKitWidget
              app_id={(process.env.NEXT_PUBLIC_WLD_APP_ID || "app_staging_oathlayer") as `app_${string}`}
              action="oathlayer-provider-register"
              signal={address ?? ""}
              verification_level={VerificationLevel.Device}
              handleVerify={handleVerify}
              onSuccess={() => {}}
            >
              {({ open }: { open: () => void }) => (
                <button onClick={open} className="btn-primary w-full py-3 text-[14px]">
                  Verify with World ID
                </button>
              )}
            </IDKitWidget>
          )}
        </motion.div>

        {/* Step 2: Bond */}
        <motion.div
          custom={2}
          variants={fadeUp}
          className={`glass-card glass-card-glow rounded-2xl p-6 mb-4 transition-opacity ${!proof ? "opacity-40" : ""}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-semibold text-white"
              style={{ background: "rgba(55,91,210,0.2)" }}
            >
              2
            </div>
            <div>
              <p className="font-medium text-white text-[14px]">Bond Collateral</p>
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>Minimum 0.1 ETH — slashed on violations</p>
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="number"
              value={bondAmount}
              onChange={e => setBondAmount(e.target.value)}
              min="0.1"
              step="0.1"
              disabled={!proof}
              className="flex-1 px-4 py-2.5 rounded-lg text-white text-[14px]"
            />
            <span className="flex items-center text-[13px]" style={{ color: "var(--muted)" }}>ETH</span>
          </div>
        </motion.div>

        {/* Register */}
        <motion.div custom={3} variants={fadeUp}>
          <button
            onClick={handleRegister}
            disabled={!proof || !isConnected || isLoading}
            className="btn-primary w-full py-3 text-[14px]"
          >
            {isLoading ? "Registering..." : isSuccess ? "✓ Registered!" : "Register as Provider"}
          </button>
        </motion.div>

        {txHash && !isSuccess && (
          <p className="mt-3 text-[12px] text-center font-mono" style={{ color: "var(--muted)" }}>
            Tx: {txHash.slice(0, 20)}... confirming...
          </p>
        )}

        {isSuccess && <ComplianceStatusBadge address={address!} txHash={txHash!} />}

        {error && (
          <p className="mt-3 text-red-400 text-[13px]">
            {error.message.includes("revert") ? "Contract reverted — already registered?" : error.message}
          </p>
        )}
      </motion.div>
    </div>
  );
}
