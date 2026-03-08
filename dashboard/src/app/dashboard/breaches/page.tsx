"use client";

import { formatEther } from "viem";
import { useDashboardData } from "@/hooks/usePonderData";
import Link from "next/link";

const TENDERLY_EXPLORER = process.env.NEXT_PUBLIC_TENDERLY_EXPLORER || "";

export default function AllBreaches() {
  const { slas, breaches, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--chainlink-light)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-[13px] transition-colors" style={{ color: "var(--muted)" }}>← Dashboard</Link>
        <h1 className="text-2xl font-semibold text-white tracking-tight">All Breaches</h1>
        <span className="text-[13px] font-mono" style={{ color: "var(--muted)" }}>{breaches.length} total</span>
      </div>
      {breaches.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p style={{ color: "var(--muted)" }}>No breaches recorded yet.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                {["SLA", "Provider", "Tenant", "Uptime", "Penalty", "Block", "Tx"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {breaches.map((breach, i) => {
                const sla = slas.find(s => s.slaId === breach.slaId);
                return (
                  <tr
                    key={`${breach.transactionHash}-${i}`}
                    style={{
                      borderBottom: i < breaches.length - 1 ? "1px solid var(--card-border)" : "none",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
                    }}
                  >
                    <td className="px-4 py-3 text-white font-mono">
                      <Link href={`/sla/${breach.slaId}`} className="underline" style={{ color: "var(--chainlink-light)" }}>#{breach.slaId}</Link>
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--muted-strong)" }}>{breach.provider.slice(0, 10)}...</td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--muted-strong)" }}>{sla?.tenant ? `${sla.tenant.slice(0, 10)}...` : "—"}</td>
                    <td className="px-4 py-3 text-white">{Number(breach.uptimeBps) / 100}%</td>
                    <td className="px-4 py-3 text-white">{formatEther(BigInt(breach.penaltyAmount))} ETH</td>
                    <td className="px-4 py-3" style={{ color: "var(--muted)" }}>{breach.blockNumber}</td>
                    <td className="px-4 py-3 font-mono">
                      {TENDERLY_EXPLORER ? (
                        <a
                          href={`${TENDERLY_EXPLORER}/tx/${breach.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                          style={{ color: "var(--chainlink-light)" }}
                        >
                          {breach.transactionHash.slice(0, 10)}...
                        </a>
                      ) : (
                        <span style={{ color: "var(--chainlink-light)" }}>{breach.transactionHash.slice(0, 10)}...</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
