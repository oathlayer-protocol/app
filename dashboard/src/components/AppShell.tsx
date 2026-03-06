"use client";

import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Register", href: "/provider/register" },
  { label: "Create SLA", href: "/sla/create" },
  { label: "Claims", href: "/claims" },
  { label: "Arbitrate", href: "/arbitrate" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div className="noise-overlay">
      <nav
        style={{
          background: isLanding ? "transparent" : "rgba(10, 10, 20, 0.8)",
          backdropFilter: isLanding ? "none" : "blur(16px)",
          WebkitBackdropFilter: isLanding ? "none" : "blur(16px)",
          borderBottom: isLanding ? "none" : "1px solid var(--card-border)",
          position: isLanding ? "absolute" : "sticky",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-16 md:h-[72px]">
            {/* Left: Logo + nav */}
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-2.5 shrink-0">
                <Image src="/logo-square.png" width={28} height={28} alt="OathLayer" className="rounded-md" />
                <span className="font-semibold text-[15px] text-white tracking-tight">OathLayer</span>
              </Link>

              <div className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="relative px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
                      style={{
                        color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                        background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                      }}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Wallet */}
            <div className="flex items-center">
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="address"
              />
            </div>
          </div>
        </div>
      </nav>

      {isLanding ? (
        children
      ) : (
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
          className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10"
        >
          {children}
        </motion.main>
      )}
    </div>
  );
}
