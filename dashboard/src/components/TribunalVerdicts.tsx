"use client";

type AgentVerdict = { role: string; reasoning: string };

export function parseAgentVerdicts(summary: string): AgentVerdict[] {
  // Format: "Analyst: reasoning; Advocate: reasoning; Judge: reasoning"
  const agents = ["Analyst", "Advocate", "Judge"];
  const verdicts: AgentVerdict[] = [];

  for (let i = 0; i < agents.length; i++) {
    const role = agents[i];
    const next = agents[i + 1];
    // Match "Role: text" up to "; NextRole:" or end of string
    const pattern = next
      ? new RegExp(`${role}:\\s*(.+?)(?:;\\s*${next}:)`)
      : new RegExp(`${role}:\\s*(.+?)$`);
    const match = summary.match(pattern);
    if (match) {
      verdicts.push({ role, reasoning: match[1].trim() });
    }
  }

  return verdicts;
}

const ROLE_ICONS: Record<string, string> = {
  Analyst: "A",
  Advocate: "D",
  Judge: "J",
};

const ROLE_LABELS: Record<string, string> = {
  Analyst: "Risk Analyst",
  Advocate: "Provider Advocate",
  Judge: "Enforcement Judge",
};

export function AgentVerdictList({ summary }: { summary: string }) {
  const verdicts = parseAgentVerdicts(summary);
  if (verdicts.length === 0) {
    return <p className="text-[12px] leading-relaxed" style={{ color: "var(--muted-strong)" }}>{summary}</p>;
  }

  return (
    <div className="space-y-1.5">
      {verdicts.map((v) => (
        <div key={v.role} className="flex items-start gap-2">
          <span
            className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold mt-0.5"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--muted-strong)",
            }}
            title={ROLE_LABELS[v.role] || v.role}
          >
            {ROLE_ICONS[v.role] || v.role[0]}
          </span>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--muted-strong)" }}>
            <span className="text-white/60 font-medium">{ROLE_LABELS[v.role] || v.role}:</span>{" "}
            {v.reasoning}
          </p>
        </div>
      ))}
    </div>
  );
}
