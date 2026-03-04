"use client";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4";

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 5L7 9L11 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function JoinWaitlistButton({ dark = false }: { dark?: boolean }) {
  const outerStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    borderRadius: 9999,
    border: "0.6px solid rgba(255,255,255,1)",
    padding: 1,
    cursor: "pointer",
    background: "transparent",
    overflow: "hidden",
  };

  const innerStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    padding: "11px 29px",
    background: dark ? "#000" : "#fff",
    fontSize: 14,
    fontWeight: 500,
    color: dark ? "#fff" : "#000",
    fontFamily: "'General Sans', system-ui, sans-serif",
    lineHeight: 1,
    overflow: "hidden",
    whiteSpace: "nowrap",
  };

  // Glow streak along top edge
  const glowStyle: React.CSSProperties = {
    position: "absolute",
    top: -10,
    left: "50%",
    transform: "translateX(-50%)",
    width: "60%",
    height: 20,
    background: "radial-gradient(ellipse at center, rgba(255,255,255,0.6) 0%, transparent 70%)",
    filter: "blur(4px)",
    pointerEvents: "none",
  };

  return (
    <button style={outerStyle}>
      {/* outer glow streak */}
      <div style={glowStyle} />
      <div style={innerStyle}>
        {/* inner glow streak */}
        <div
          style={{
            position: "absolute",
            top: -8,
            left: "50%",
            transform: "translateX(-50%)",
            width: "70%",
            height: 16,
            background: dark
              ? "radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)"
              : "radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, transparent 70%)",
            filter: "blur(3px)",
            pointerEvents: "none",
          }}
        />
        Join Waitlist
      </div>
    </button>
  );
}

export default function LandingPage() {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#000",
        fontFamily: "'General Sans', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Black overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1,
        }}
      />

      {/* All content above video */}
      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>
        {/* Navbar */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 120px",
          }}
          className="landing-nav"
        >
          {/* Left: logo + nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            {/* Logo wordmark placeholder */}
            <div
              style={{
                width: 187,
                height: 25,
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  fontFamily: "'General Sans', system-ui, sans-serif",
                }}
              >
                OATHLAYER
              </span>
            </div>

            {/* Nav links — hidden on mobile via CSS class */}
            <div className="landing-nav-links" style={{ display: "flex", alignItems: "center", gap: 30 }}>
              {["Get Started", "Developers", "Features", "Resources"].map((label) => (
                <a
                  key={label}
                  href="#"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 500,
                    textDecoration: "none",
                    fontFamily: "'General Sans', system-ui, sans-serif",
                    opacity: 0.9,
                  }}
                >
                  {label}
                  <ChevronDown />
                </a>
              ))}
            </div>
          </div>

          {/* Right: Join Waitlist button */}
          <JoinWaitlistButton dark />
        </nav>

        {/* Hero content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 40,
            paddingBottom: 102,
          }}
          className="landing-hero"
        >
          {/* Badge pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.20)",
            }}
          >
            {/* dot */}
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "#fff",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.60)",
                fontFamily: "'General Sans', system-ui, sans-serif",
              }}
            >
              Early access available from
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                fontFamily: "'General Sans', system-ui, sans-serif",
              }}
            >
              May 1, 2026
            </span>
          </div>

          {/* Heading */}
          <h1
            className="landing-heading"
            style={{
              maxWidth: 613,
              fontWeight: 500,
              lineHeight: 1.28,
              margin: 0,
              fontFamily: "'General Sans', system-ui, sans-serif",
              background:
                "linear-gradient(144.5deg, rgba(255,255,255,1) 28%, rgba(0,0,0,0) 115%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Web3 at the Speed of Experience
          </h1>

          {/* Subtitle */}
          <p
            style={{
              maxWidth: 680,
              fontSize: 15,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.70)",
              margin: "-16px 0 0",
              fontFamily: "'General Sans', system-ui, sans-serif",
              padding: "0 20px",
            }}
          >
            Powering seamless experiences and real-time connections, OathLayer is the base
            for creators who move with purpose, leveraging resilience, speed, and scale to
            shape the future.
          </p>

          {/* CTA button — white variant */}
          <JoinWaitlistButton dark={false} />
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .landing-nav {
            padding: 20px 24px !important;
          }
          .landing-nav-links {
            display: none !important;
          }
          .landing-hero {
            padding-top: 200px !important;
          }
          .landing-heading {
            font-size: 36px !important;
            padding: 0 20px;
          }
        }
        @media (min-width: 769px) {
          .landing-hero {
            padding-top: 280px !important;
          }
          .landing-heading {
            font-size: 56px !important;
          }
        }
      `}</style>
    </div>
  );
}
