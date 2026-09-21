import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = "activation" | "booting" | "dashboard";
type Tab = "today" | "timeline" | "history" | "reports" | "privacy";

// ─── Data ────────────────────────────────────────────────────────────────────

const TIMELINE = [
  { time: "09:12", end: "09:36", cat: "RESEARCH",      domain: "google.com",         dur: "24 MIN", color: "#00A8FF", id: "TB-20260920-0042" },
  { time: "09:36", end: "10:17", cat: "PROGRAMMING",   domain: "github.com",          dur: "41 MIN", color: "#7B2FFF", id: "TB-20260920-0043" },
  { time: "10:17", end: "10:29", cat: "COMMUNICATION", domain: "mail.google.com",     dur: "12 MIN", color: "#C084FC", id: "TB-20260920-0044" },
  { time: "10:29", end: "11:05", cat: "ENTERTAINMENT", domain: "youtube.com",         dur: "36 MIN", color: "#E040FB", id: "TB-20260920-0045" },
  { time: "11:05", end: "11:23", cat: "RESEARCH",      domain: "stackoverflow.com",   dur: "18 MIN", color: "#00A8FF", id: "TB-20260920-0046" },
  { time: "11:23", end: "12:15", cat: "PROGRAMMING",   domain: "github.com",          dur: "52 MIN", color: "#7B2FFF", id: "TB-20260920-0047" },
  { time: "12:15", end: "12:27", cat: "IDLE",          domain: "—",                   dur: "12 MIN", color: "#3A3050", id: "TB-20260920-0048" },
  { time: "12:27", end: "13:09", cat: "COMMUNICATION", domain: "slack.com",           dur: "42 MIN", color: "#C084FC", id: "TB-20260920-0049" },
];

const CATEGORIES = [
  { name: "PROGRAMMING",   time: "01H 33M", mins: 93,  color: "#7B2FFF" },
  { name: "RESEARCH",      time: "01H 12M", mins: 72,  color: "#00A8FF" },
  { name: "COMMUNICATION", time: "00H 54M", mins: 54,  color: "#C084FC" },
  { name: "ENTERTAINMENT", time: "00H 36M", mins: 36,  color: "#E040FB" },
  { name: "OTHER",         time: "00H 27M", mins: 27,  color: "#5B4070" },
];

const CONTEXT_FLOW = [
  "GOOGLE", "GITHUB", "YOUTUBE", "GOOGLE", "NOTION", "GITHUB", "STACKOVERFLOW", "GMAIL", "GITHUB",
];

const HISTORY = [
  { day: "MON",   date: "14 SEP", time: "04H 21M", sessions: 22, mins: 261 },
  { day: "TUE",   date: "15 SEP", time: "03H 48M", sessions: 18, mins: 228 },
  { day: "WED",   date: "16 SEP", time: "05H 02M", sessions: 31, mins: 302 },
  { day: "THU",   date: "17 SEP", time: "02H 56M", sessions: 14, mins: 176 },
  { day: "FRI",   date: "18 SEP", time: "04H 37M", sessions: 24, mins: 277 },
  { day: "SAT",   date: "19 SEP", time: "01H 12M", sessions: 7,  mins: 72  },
  { day: "TODAY", date: "20 SEP", time: "03H 42M", sessions: 27, mins: 222 },
];

const BOOT_LINES: { text: string; delay: number; highlight?: boolean }[] = [
  { text: "TRACEBACK INITIALIZING...",        delay: 0,    highlight: true },
  { text: "",                                  delay: 280 },
  { text: "ACTIVITY MONITOR ........ READY",  delay: 560 },
  { text: "LOCAL DATABASE .......... READY",  delay: 820 },
  { text: "SESSION ENGINE .......... READY",  delay: 1080 },
  { text: "CHROME INTERFACE ........ READY",  delay: 1340 },
  { text: "",                                  delay: 1560 },
  { text: "TRACEBACK ACTIVE",                  delay: 1800, highlight: true },
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      @keyframes ledPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.35; }
      }
      @keyframes cursorBlink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      .font-orb { font-family: 'Orbitron', monospace; }
      .font-mono-tech { font-family: 'Share Tech Mono', monospace; }
      .font-raj { font-family: 'Rajdhani', sans-serif; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: rgba(5,0,8,0.8); }
      ::-webkit-scrollbar-thumb { background: rgba(123,47,255,0.4); }
    `}</style>
  );
}

function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)",
      }}
    />
  );
}

function GridBg() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(rgba(123,47,255,0.055) 1px, transparent 1px),
          linear-gradient(90deg, rgba(123,47,255,0.055) 1px, transparent 1px)
        `,
        backgroundSize: "36px 36px",
      }}
    />
  );
}

function LED({ active, color = "#B6FF00", size = 8 }: { active: boolean; color?: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: active ? color : "#241840",
        boxShadow: active ? `0 0 5px ${color}, 0 0 10px ${color}50` : "inset 0 1px 0 rgba(255,255,255,0.05)",
        animation: active ? "ledPulse 2s ease-in-out infinite" : "none",
        flexShrink: 0,
      }}
    />
  );
}

type PanelProps = {
  children: React.ReactNode;
  className?: string;
  title?: string;
  titleRight?: React.ReactNode;
  glow?: boolean;
};

function Panel({ children, className = "", title, titleRight, glow = false }: PanelProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: "linear-gradient(180deg, rgba(10,0,21,0.96) 0%, rgba(5,0,8,0.98) 100%)",
        border: "1px solid rgba(123,47,255,0.42)",
        boxShadow: glow
          ? "inset 0 1px 0 rgba(192,132,252,0.12), 0 0 30px rgba(123,47,255,0.2)"
          : "inset 0 1px 0 rgba(192,132,252,0.08), inset 0 -1px 0 rgba(0,0,0,0.4)",
      }}
    >
      {title && (
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{
            borderBottom: "1px solid rgba(123,47,255,0.35)",
            background: "linear-gradient(180deg, rgba(123,47,255,0.18) 0%, rgba(80,20,160,0.06) 100%)",
          }}
        >
          <span className="font-mono-tech text-[10px] tracking-[0.22em] text-purple-400">{title}</span>
          {titleRight && <div>{titleRight}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

type BevelButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  className?: string;
  disabled?: boolean;
};

function BevelButton({ children, onClick, variant = "default", className = "", disabled = false }: BevelButtonProps) {
  const styles = {
    default: {
      bg: "rgba(18,0,32,0.9)",
      border: "rgba(123,47,255,0.42)",
      color: "#A855F7",
      shadow: "rgba(123,47,255,0.15)",
    },
    primary: {
      bg: "rgba(123,47,255,0.22)",
      border: "rgba(168,85,247,0.65)",
      color: "#D8B4FE",
      shadow: "rgba(123,47,255,0.35)",
    },
    danger: {
      bg: "rgba(255,30,80,0.12)",
      border: "rgba(255,30,80,0.5)",
      color: "#FF6090",
      shadow: "rgba(255,30,80,0.2)",
    },
    ghost: {
      bg: "transparent",
      border: "rgba(123,47,255,0.25)",
      color: "#7B2FFF",
      shadow: "transparent",
    },
  };
  const s = styles[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 font-mono-tech text-[10px] tracking-[0.18em] uppercase transition-all duration-100 cursor-pointer active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        boxShadow: `inset 1px 1px 0 rgba(255,255,255,0.07), inset -1px -1px 0 rgba(0,0,0,0.5), 0 0 12px ${s.shadow}`,
      }}
    >
      {children}
    </button>
  );
}

function Y2KToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative cursor-pointer flex-shrink-0"
      style={{
        width: 72,
        height: 28,
        background: on ? "rgba(123,47,255,0.25)" : "rgba(10,0,20,0.9)",
        border: `1px solid ${on ? "rgba(168,85,247,0.7)" : "rgba(80,50,120,0.4)"}`,
        boxShadow: on
          ? "inset 0 0 12px rgba(123,47,255,0.3), 0 0 16px rgba(123,47,255,0.35)"
          : "inset 0 1px 4px rgba(0,0,0,0.6)",
        transition: "all 0.25s ease",
      }}
    >
      <motion.div
        className="absolute top-[3px]"
        animate={{ left: on ? 43 : 4 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        style={{
          width: 20,
          height: 20,
          background: on
            ? "linear-gradient(135deg, #C084FC, #7B2FFF)"
            : "linear-gradient(135deg, #3A2050, #241840)",
          border: `1px solid ${on ? "rgba(192,132,252,0.8)" : "rgba(80,60,100,0.5)"}`,
          boxShadow: on ? "0 0 10px rgba(168,85,247,0.9), 0 0 20px rgba(123,47,255,0.5)" : "none",
        }}
      />
      <span
        className="absolute font-mono-tech text-[8px] tracking-widest"
        style={{
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          color: on ? "transparent" : "rgba(80,60,100,0.7)",
          transition: "color 0.2s",
        }}
      >
        OFF
      </span>
      <span
        className="absolute font-mono-tech text-[8px] tracking-widest"
        style={{
          left: 6,
          top: "50%",
          transform: "translateY(-50%)",
          color: on ? "rgba(192,132,252,0.9)" : "transparent",
          transition: "color 0.2s",
        }}
      >
        ON
      </span>
    </button>
  );
}

// ─── Activation screen ────────────────────────────────────────────────────────

function ActivationScreen({ onActivate }: { onActivate: () => void }) {
  const [isOn, setIsOn] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [showDataInfo, setShowDataInfo] = useState(false);
  const canActivate = isOn && hasConsent;

  useEffect(() => {
    if (!canActivate) return;
    const t = setTimeout(onActivate, 500);
    return () => clearTimeout(t);
  }, [canActivate, onActivate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-raj">
      <div className="w-full max-w-[360px]">
        {/* Window chrome */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            background: "linear-gradient(180deg, rgba(123,47,255,0.45) 0%, rgba(80,20,160,0.28) 100%)",
            border: "1px solid rgba(168,85,247,0.55)",
            borderBottom: "none",
          }}
        >
          <span className="font-mono-tech text-[10px] tracking-[0.25em] text-purple-200">TRACEBACK</span>
          <div className="flex items-center gap-2">
            <span className="font-mono-tech text-[10px] tracking-[0.15em] text-purple-500">SYSTEM 01</span>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 8, height: 8, border: "1px solid rgba(123,47,255,0.5)", background: "rgba(123,47,255,0.1)" }} />
              ))}
            </div>
          </div>
        </div>

        <Panel glow>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 280px 180px at 50% 25%, rgba(123,47,255,0.18) 0%, transparent 70%)",
            }}
          />

          <div className="relative px-8 py-8 flex flex-col items-center gap-5">
            {/* Logo */}
            <div className="text-center">
              <div
                className="font-orb text-[28px] font-black tracking-[0.32em] leading-none"
                style={{
                  color: "#C084FC",
                  textShadow: "0 0 18px rgba(168,85,247,0.65), 0 0 40px rgba(123,47,255,0.35)",
                }}
              >
                TRACEBACK
              </div>
              <div className="font-mono-tech text-[9px] tracking-[0.35em] mt-1.5" style={{ color: "#5B3090" }}>
                ACTIVITY RECONSTRUCTION
              </div>
            </div>

            {/* Status badge */}
            <div
              className="px-5 py-1.5 font-mono-tech text-[11px] tracking-[0.2em] transition-all duration-300"
              style={{
                border: `1px solid ${isOn ? "rgba(168,85,247,0.55)" : "rgba(60,30,90,0.5)"}`,
                color: isOn ? "#C084FC" : "#3A1060",
                background: isOn ? "rgba(123,47,255,0.1)" : "rgba(8,0,16,0.7)",
                boxShadow: isOn ? "0 0 12px rgba(123,47,255,0.25)" : "none",
              }}
            >
              {isOn ? "● ON" : "○ OFF"}
            </div>

            {/* Toggle section */}
            <div className="w-full flex flex-col items-center gap-2">
              <div className="font-mono-tech text-[9px] tracking-[0.25em] text-purple-700 uppercase">
                TURN ON TRACEBACK
              </div>
              <div
                className="w-full py-3 flex items-center justify-center"
                style={{
                  border: "1px solid rgba(123,47,255,0.2)",
                  background: "rgba(5,0,10,0.7)",
                }}
              >
                <Y2KToggle on={isOn} onChange={setIsOn} />
              </div>
            </div>

            {/* Divider */}
            <div
              className="w-full flex items-center gap-3"
              style={{ color: "rgba(123,47,255,0.25)" }}
            >
              <div className="flex-1 h-px" style={{ background: "rgba(123,47,255,0.18)" }} />
              <span className="font-mono-tech text-[8px] tracking-widest text-purple-800">CONSENT</span>
              <div className="flex-1 h-px" style={{ background: "rgba(123,47,255,0.18)" }} />
            </div>

            {/* Consent */}
            <div className="w-full">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={hasConsent}
                    onChange={e => setHasConsent(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-4 h-4 flex items-center justify-center transition-all duration-200"
                    style={{
                      border: `1px solid ${hasConsent ? "rgba(168,85,247,0.9)" : "rgba(80,50,120,0.5)"}`,
                      background: hasConsent ? "rgba(123,47,255,0.35)" : "rgba(5,0,10,0.8)",
                      boxShadow: hasConsent ? "0 0 8px rgba(123,47,255,0.5)" : "none",
                    }}
                  >
                    {hasConsent && (
                      <span className="font-mono-tech text-[10px] leading-none" style={{ color: "#D8B4FE" }}>✓</span>
                    )}
                  </div>
                </div>
                <span className="font-mono-tech text-[10px] leading-relaxed" style={{ color: "#8F9BA8" }}>
                  I agree to allow TRACEBACK to collect my Chrome activity data.
                </span>
              </label>
            </div>

            <BevelButton onClick={() => setShowDataInfo(v => !v)} className="w-full justify-center text-center">
              {showDataInfo ? "HIDE DATA DETAILS" : "WHAT DATA IS COLLECTED?"}
            </BevelButton>

            <AnimatePresence>
              {showDataInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div
                    className="p-3 space-y-1"
                    style={{ border: "1px solid rgba(123,47,255,0.25)", background: "rgba(5,0,10,0.8)" }}
                  >
                    <div className="font-mono-tech text-[9px] tracking-[0.2em] text-purple-700 mb-2">COLLECTED DATA</div>
                    {["Active tab / domain", "Session duration", "Tab switching events", "Idle periods"].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="font-mono-tech text-[10px]" style={{ color: "#B6FF00" }}>✓</span>
                        <span className="font-mono-tech text-[10px] text-purple-500">{item}</span>
                      </div>
                    ))}
                    <div className="h-px my-1" style={{ background: "rgba(123,47,255,0.2)" }} />
                    {["Passwords", "Page contents", "Keystrokes", "Microphone / Camera"].map(item => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="font-mono-tech text-[10px]" style={{ color: "#FF6090" }}>✕</span>
                        <span className="font-mono-tech text-[10px] text-purple-800">{item}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* System status bar */}
            <div
              className="w-full px-3 py-2 flex items-center justify-between"
              style={{
                border: "1px solid rgba(123,47,255,0.2)",
                background: "rgba(5,0,10,0.7)",
              }}
            >
              <span className="font-mono-tech text-[9px] tracking-[0.18em] text-purple-800">SYSTEM STATUS</span>
              <div className="flex items-center gap-2">
                <LED active={canActivate} color={canActivate ? "#B6FF00" : "#7B2FFF"} />
                <span
                  className="font-mono-tech text-[9px] tracking-[0.15em] transition-colors"
                  style={{ color: canActivate ? "#B6FF00" : "#3A1060" }}
                >
                  {canActivate ? "ACTIVATING" : "WAITING"}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Bottom chrome */}
        <div
          className="h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(123,47,255,0.4), transparent)" }}
        />
      </div>
    </div>
  );
}

// ─── Boot screen ──────────────────────────────────────────────────────────────

function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [lines, setLines] = useState<{ text: string; highlight?: boolean }[]>([]);
  const [progress, setProgress] = useState(0);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    BOOT_LINES.forEach(({ text, delay, highlight }) => {
      setTimeout(() => setLines(prev => [...prev, { text, highlight }]), delay);
    });

    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return Math.min(100, p + 5);
      });
    }, 90);

    setTimeout(() => setShowCursor(true), 2000);
    setTimeout(onComplete, 2900);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center font-raj">
      <div className="w-full max-w-[400px] px-6">
        {/* Window chrome */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            background: "linear-gradient(180deg, rgba(123,47,255,0.45) 0%, rgba(80,20,160,0.28) 100%)",
            border: "1px solid rgba(168,85,247,0.55)",
            borderBottom: "none",
          }}
        >
          <span className="font-mono-tech text-[10px] tracking-[0.25em] text-purple-200">TRACEBACK</span>
          <span className="font-mono-tech text-[10px] tracking-[0.15em] text-purple-500">BOOT SEQUENCE</span>
        </div>

        <Panel>
          <div className="p-5">
            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-mono-tech text-[9px] tracking-widest text-purple-700">LOADING MODULES</span>
                <span className="font-mono-tech text-[9px] text-purple-500">{progress}%</span>
              </div>
              <div
                className="h-4 w-full relative overflow-hidden"
                style={{
                  border: "1px solid rgba(123,47,255,0.4)",
                  background: "rgba(5,0,10,0.8)",
                }}
              >
                <motion.div
                  className="h-full relative"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                  style={{
                    background: "linear-gradient(90deg, #2D0060 0%, #7B2FFF 60%, #A855F7 100%)",
                    boxShadow: "0 0 10px rgba(168,85,247,0.7)",
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(0,0,0,0.2) 6px, rgba(0,0,0,0.2) 8px)",
                    }}
                  />
                </motion.div>
              </div>
            </div>

            {/* Terminal output */}
            <div className="space-y-0.5 min-h-[160px]">
              {lines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono-tech text-[11px] leading-6"
                  style={{
                    color: line.highlight
                      ? line.text === "TRACEBACK ACTIVE" ? "#B6FF00" : "#C084FC"
                      : "#6B5080",
                    textShadow: line.text === "TRACEBACK ACTIVE"
                      ? "0 0 14px rgba(182,255,0,0.6)"
                      : line.highlight ? "0 0 10px rgba(192,132,252,0.4)" : "none",
                    letterSpacing: "0.05em",
                  }}
                >
                  {line.text || " "}
                </motion.div>
              ))}
              {showCursor && (
                <span
                  className="font-mono-tech text-[11px] text-purple-400"
                  style={{ animation: "cursorBlink 0.8s step-end infinite" }}
                >
                  █
                </span>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ─── Today page ───────────────────────────────────────────────────────────────

function TodayPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = TIMELINE.find(t => t.id === selectedId) ?? null;
  const maxMins = Math.max(...CATEGORIES.map(c => c.mins));

  return (
    <div className="space-y-4">
      {/* Hero stats */}
      <Panel glow>
        <div className="p-5">
          <div className="font-mono-tech text-[9px] tracking-[0.3em] text-purple-800 mb-4">
            WHERE DID MY TIME GO? — TODAY
          </div>
          <div className="flex items-end gap-8 mb-6 flex-wrap">
            <div>
              <div
                className="font-orb leading-none"
                style={{
                  fontSize: 44,
                  fontWeight: 900,
                  color: "#C084FC",
                  textShadow: "0 0 28px rgba(168,85,247,0.55)",
                }}
              >
                03H 42M
              </div>
              <div className="font-mono-tech text-[9px] tracking-[0.2em] text-purple-700 mt-1">
                ACTIVE BROWSING
              </div>
            </div>
            <div className="flex gap-5 pb-1">
              {[["27", "SESSIONS"], ["184", "SWITCHES"]].map(([val, label]) => (
                <div key={label}>
                  <div
                    className="font-orb"
                    style={{ fontSize: 24, fontWeight: 700, color: "#9B6FFF" }}
                  >
                    {val}
                  </div>
                  <div className="font-mono-tech text-[8px] tracking-[0.15em] text-purple-700">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category bars */}
          <div className="space-y-2">
            {CATEGORIES.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <div
                  className="font-mono-tech text-[9px] tracking-[0.08em] text-right flex-shrink-0"
                  style={{ color: "#6B5080", width: 96 }}
                >
                  {cat.name}
                </div>
                <div
                  className="flex-1 h-[14px] relative overflow-hidden"
                  style={{
                    background: "rgba(5,0,10,0.7)",
                    border: "1px solid rgba(123,47,255,0.18)",
                  }}
                >
                  <motion.div
                    className="h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.mins / maxMins) * 100}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.08 + 0.2 }}
                    style={{
                      background: `linear-gradient(90deg, ${cat.color}35, ${cat.color}70)`,
                      borderRight: `2px solid ${cat.color}`,
                      boxShadow: `0 0 8px ${cat.color}40`,
                    }}
                  />
                </div>
                <div
                  className="font-mono-tech text-[9px] flex-shrink-0"
                  style={{ color: cat.color, width: 56 }}
                >
                  {cat.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Activity timeline */}
      <Panel title="ACTIVITY RECONSTRUCTION" titleRight={
        <span className="font-mono-tech text-[9px] text-purple-700">20 SEP 2026</span>
      }>
        <div className="divide-y" style={{ borderColor: "rgba(123,47,255,0.08)" }}>
          {TIMELINE.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-all duration-150"
              style={{
                borderLeft: `2px solid ${entry.color}`,
                background: selectedId === entry.id ? "rgba(123,47,255,0.1)" : "transparent",
              }}
            >
              <span
                className="font-mono-tech text-[10px] flex-shrink-0 w-10"
                style={{ color: "#5B3090" }}
              >
                {entry.time}
              </span>
              <span
                className="font-mono-tech text-[9px] tracking-[0.08em] flex-shrink-0 w-24"
                style={{ color: entry.color }}
              >
                {entry.cat}
              </span>
              <span className="font-mono-tech text-[10px] flex-1 truncate" style={{ color: "#9B8AB0" }}>
                {entry.domain}
              </span>
              <span className="font-mono-tech text-[10px] flex-shrink-0" style={{ color: "#5B3090" }}>
                {entry.dur}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Session detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              style={{ borderTop: "1px solid rgba(123,47,255,0.3)" }}
            >
              <div className="px-4 py-3" style={{ background: "rgba(123,47,255,0.06)" }}>
                <div className="font-mono-tech text-[9px] tracking-[0.22em] text-purple-700 mb-2">
                  SESSION FORENSICS
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {[
                    ["SESSION ID",  selected.id],
                    ["STATUS",      "CLOSED"],
                    ["START",       selected.time + ":04"],
                    ["END",         selected.end  + ":21"],
                    ["DURATION",    selected.dur],
                    ["DOMAIN",      selected.domain],
                    ["CATEGORY",    selected.cat],
                    ["SWITCHES",    "7"],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-2 col-span-1">
                      <span className="font-mono-tech text-[9px] text-purple-800">{label}</span>
                      <span className="font-mono-tech text-[9px]" style={{ color: "#C084FC" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      {/* Context switching */}
      <Panel title="CONTEXT SWITCHING">
        <div className="p-4">
          <div className="flex items-baseline gap-3 mb-3">
            <div
              className="font-orb"
              style={{ fontSize: 28, fontWeight: 700, color: "#C084FC" }}
            >
              184
            </div>
            <div className="font-mono-tech text-[9px] tracking-[0.1em] text-purple-700">
              CONTEXT SWITCHES TODAY
            </div>
          </div>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {CONTEXT_FLOW.map((node, i) => (
              <div key={i} className="flex items-center flex-shrink-0">
                <div
                  className="px-2 py-1 font-mono-tech text-[9px] tracking-[0.1em]"
                  style={{
                    border: "1px solid rgba(123,47,255,0.38)",
                    background: i % 2 === 0 ? "rgba(18,0,36,0.8)" : "rgba(40,0,80,0.5)",
                    color: "#A855F7",
                  }}
                >
                  {node}
                </div>
                {i < CONTEXT_FLOW.length - 1 && (
                  <div
                    className="font-mono-tech text-[10px] px-0.5"
                    style={{ color: "rgba(123,47,255,0.4)" }}
                  >
                    ›
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

// ─── Timeline page ────────────────────────────────────────────────────────────

function TimelinePage() {
  return (
    <Panel title="FULL TIMELINE — 20 SEP 2026">
      <div className="p-4">
        {TIMELINE.map((entry, i) => (
          <div key={entry.id} className="flex gap-4 group">
            {/* Time spine */}
            <div className="flex flex-col items-center w-12 flex-shrink-0">
              <span className="font-mono-tech text-[10px] text-purple-600">{entry.time}</span>
              {i < TIMELINE.length - 1 && (
                <div
                  className="flex-1 w-px my-1"
                  style={{
                    background: `linear-gradient(${entry.color}50, ${TIMELINE[i + 1].color}50)`,
                    minHeight: 16,
                  }}
                />
              )}
            </div>

            {/* Card */}
            <div
              className="flex-1 mb-2 p-3 transition-all duration-150 hover:brightness-110"
              style={{
                border: `1px solid ${entry.color}28`,
                borderLeft: `3px solid ${entry.color}`,
                background: "rgba(5,0,10,0.7)",
              }}
            >
              <div className="flex items-start justify-between mb-1">
                <span
                  className="font-mono-tech text-[9px] tracking-[0.12em]"
                  style={{ color: entry.color }}
                >
                  {entry.cat}
                </span>
                <span className="font-mono-tech text-[9px] text-purple-700">{entry.dur}</span>
              </div>
              <div className="font-mono-tech text-[11px]" style={{ color: "#B0A0C0" }}>
                {entry.domain}
              </div>
              <div className="font-mono-tech text-[8px] mt-1.5 tracking-wide" style={{ color: "#3A2050" }}>
                {entry.id}  ·  {entry.time}:04 – {entry.end}:21
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── History page ─────────────────────────────────────────────────────────────

function HistoryPage() {
  const maxMins = Math.max(...HISTORY.map(h => h.mins));

  return (
    <Panel title="HISTORICAL RECONSTRUCTION">
      <div className="p-4 space-y-2">
        {HISTORY.map(h => {
          const isToday = h.day === "TODAY";
          return (
            <div
              key={h.date}
              className="flex items-center gap-4 p-2.5 cursor-pointer transition-all duration-100 hover:brightness-125"
              style={{
                border: `1px solid ${isToday ? "rgba(123,47,255,0.4)" : "rgba(123,47,255,0.12)"}`,
                background: isToday ? "rgba(123,47,255,0.07)" : "transparent",
              }}
            >
              <div className="flex-shrink-0 text-center w-10">
                <div className="font-mono-tech text-[9px] text-purple-600">{h.day}</div>
                <div className="font-mono-tech text-[8px] text-purple-800">{h.date.split(" ")[0]}</div>
              </div>
              <div className="flex-1">
                <div
                  className="h-3 w-full overflow-hidden"
                  style={{
                    background: "rgba(5,0,10,0.7)",
                    border: "1px solid rgba(123,47,255,0.15)",
                  }}
                >
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${(h.mins / maxMins) * 100}%`,
                      background: isToday
                        ? "linear-gradient(90deg, #4B0082, #A855F7)"
                        : "linear-gradient(90deg, #200040, #6B2FBF)",
                      boxShadow: isToday ? "0 0 8px rgba(168,85,247,0.5)" : "none",
                    }}
                  />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div
                  className="font-orb text-[12px]"
                  style={{ color: isToday ? "#C084FC" : "#7B5BA0" }}
                >
                  {h.time}
                </div>
                <div className="font-mono-tech text-[8px] text-purple-800">{h.sessions} SESS</div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Reports page ─────────────────────────────────────────────────────────────

function ReportsPage() {
  const topDomains = [
    { domain: "github.com",         time: "01H 33M", pct: 100 },
    { domain: "google.com",         time: "01H 12M", pct: 77  },
    { domain: "slack.com",          time: "00H 42M", pct: 45  },
    { domain: "youtube.com",        time: "00H 36M", pct: 38  },
    { domain: "stackoverflow.com",  time: "00H 18M", pct: 19  },
  ];

  return (
    <div className="space-y-4">
      <Panel title="FORENSIC SUMMARY — 20 SEP 2026">
        <div
          className="grid grid-cols-2 gap-px"
          style={{ background: "rgba(123,47,255,0.12)" }}
        >
          {[
            ["TOTAL BROWSING",   "03H 42M"],
            ["SESSION COUNT",    "27"],
            ["LONGEST SESSION",  "52 MIN"],
            ["CONTEXT SWITCHES", "184"],
            ["IDLE PERIODS",     "3"],
            ["IDLE DURATION",    "00H 18M"],
          ].map(([label, val]) => (
            <div
              key={label}
              className="p-3"
              style={{ background: "rgba(5,0,10,0.97)" }}
            >
              <div className="font-mono-tech text-[8px] tracking-[0.12em] text-purple-800">{label}</div>
              <div
                className="font-orb mt-1"
                style={{ fontSize: 16, color: "#A855F7" }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="TOP DOMAINS">
        <div className="p-4 space-y-2">
          {topDomains.map(d => (
            <div key={d.domain} className="flex items-center gap-3">
              <span
                className="font-mono-tech text-[10px] flex-shrink-0"
                style={{ color: "#9B8AB0", width: 140 }}
              >
                {d.domain}
              </span>
              <div
                className="flex-1 h-3 overflow-hidden"
                style={{
                  background: "rgba(5,0,10,0.7)",
                  border: "1px solid rgba(123,47,255,0.18)",
                }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${d.pct}%`,
                    background: "linear-gradient(90deg, #2D0060, #7B2FFF)",
                  }}
                />
              </div>
              <span
                className="font-mono-tech text-[10px] flex-shrink-0"
                style={{ color: "#7B2FFF", width: 56 }}
              >
                {d.time}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex gap-3">
        <BevelButton className="flex-1 text-center justify-center" variant="primary">
          EXPORT JSON
        </BevelButton>
        <BevelButton className="flex-1 text-center justify-center">
          EXPORT CSV
        </BevelButton>
      </div>
    </div>
  );
}

// ─── Privacy page ─────────────────────────────────────────────────────────────

function PrivacyPage() {
  const [tracking, setTracking] = useState(true);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          border: "1px solid rgba(123,47,255,0.42)",
          background: "rgba(123,47,255,0.08)",
        }}
      >
        <span className="font-mono-tech text-[10px] tracking-[0.22em] text-purple-300">
          TRACEBACK PRIVACY CENTER
        </span>
        <div className="flex items-center gap-2">
          <LED active={tracking} color={tracking ? "#B6FF00" : "#FF3366"} />
          <span
            className="font-mono-tech text-[9px] tracking-[0.15em]"
            style={{ color: tracking ? "#B6FF00" : "#FF6090" }}
          >
            DATA COLLECTION: {tracking ? "ACTIVE" : "PAUSED"}
          </span>
        </div>
      </div>

      {/* Collected / not collected */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="COLLECTED">
          <div className="p-3 space-y-1.5">
            {["Active tab/domain", "Session duration", "Tab switching", "Idle periods"].map(item => (
              <div key={item} className="flex items-center gap-2">
                <span className="font-mono-tech text-[10px]" style={{ color: "#B6FF00" }}>✓</span>
                <span className="font-mono-tech text-[10px] text-purple-500">{item}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="NOT COLLECTED">
          <div className="p-3 space-y-1.5">
            {["Passwords", "Keystrokes", "Screenshots", "Clipboard", "Microphone", "Page contents"].map(item => (
              <div key={item} className="flex items-center gap-2">
                <span className="font-mono-tech text-[10px]" style={{ color: "#FF6090" }}>✕</span>
                <span className="font-mono-tech text-[10px] text-purple-800">{item}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Controls */}
      <Panel title="DATA CONTROLS">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono-tech text-[10px] tracking-[0.12em] text-purple-400">
                ACTIVITY TRACKING
              </div>
              <div className="font-mono-tech text-[8px] text-purple-800 mt-0.5">
                Toggle to pause/resume data collection
              </div>
            </div>
            <Y2KToggle on={tracking} onChange={setTracking} />
          </div>
          <div
            className="h-px"
            style={{ background: "rgba(123,47,255,0.2)" }}
          />
          <div className="grid grid-cols-3 gap-2">
            <BevelButton variant="ghost" className="text-center justify-center">
              EXPORT DATA
            </BevelButton>
            <BevelButton variant="danger" className="text-center justify-center">
              DELETE ALL
            </BevelButton>
            <BevelButton className="text-center justify-center">
              VIEW RAW LOG
            </BevelButton>
          </div>
        </div>
      </Panel>

      {/* Data retention */}
      <Panel title="RETENTION POLICY">
        <div className="p-3 space-y-2">
          {[
            ["LOCAL STORAGE",    "Your device only. Never transmitted."],
            ["RETENTION PERIOD", "90 days (configurable)"],
            ["ENCRYPTION",       "AES-256 at rest"],
            ["THIRD PARTIES",    "None. Zero external sharing."],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-4">
              <span
                className="font-mono-tech text-[9px] tracking-[0.1em] flex-shrink-0"
                style={{ color: "#5B3090", width: 120 }}
              >
                {label}
              </span>
              <span className="font-mono-tech text-[9px]" style={{ color: "#9B8AB0" }}>{val}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "today",    label: "TODAY"   },
  { id: "timeline", label: "TIMELINE"},
  { id: "history",  label: "HISTORY" },
  { id: "reports",  label: "REPORTS" },
  { id: "privacy",  label: "PRIVACY" },
];

function Dashboard() {
  const [tab, setTab] = useState<Tab>("today");
  const [isTracking] = useState(true);

  return (
    <div className="min-h-screen flex flex-col font-raj">
      {/* Title bar / nav */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-0"
        style={{
          background: "linear-gradient(180deg, rgba(8,0,18,0.99) 0%, rgba(5,0,10,0.97) 100%)",
          borderBottom: "1px solid rgba(123,47,255,0.42)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.7), 0 0 40px rgba(123,47,255,0.08)",
          minHeight: 44,
        }}
      >
        {/* Logo */}
        <div
          className="font-orb text-[15px] font-black tracking-[0.28em]"
          style={{
            color: "#C084FC",
            textShadow: "0 0 16px rgba(168,85,247,0.55)",
          }}
        >
          TRACEBACK
        </div>

        {/* Tab nav */}
        <div className="flex min-w-0 flex-1 items-stretch h-full">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="min-w-0 flex-1 px-[clamp(0.25rem,1.5vw,0.75rem)] font-mono-tech text-[9px] tracking-[0.14em] transition-all duration-150 cursor-pointer uppercase whitespace-nowrap"
              style={{
                height: "100%",
                background: tab === t.id ? "rgba(123,47,255,0.18)" : "transparent",
                borderBottom: tab === t.id ? "2px solid #A855F7" : "2px solid transparent",
                color: tab === t.id ? "#D8B4FE" : "#4A2870",
                boxShadow: tab === t.id ? "inset 0 -4px 12px rgba(123,47,255,0.1)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <LED active={isTracking} color="#B6FF00" size={7} />
          <span
            className="font-mono-tech text-[9px] tracking-[0.1em]"
            style={{ color: isTracking ? "#B6FF00" : "#3A1060" }}
          >
            TRACEBACK ● {isTracking ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
          >
            {tab === "today"    && <TodayPage />}
            {tab === "timeline" && <TimelinePage />}
            {tab === "history"  && <HistoryPage />}
            {tab === "reports"  && <ReportsPage />}
            {tab === "privacy"  && <PrivacyPage />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer bar */}
      <div
        className="px-4 py-1.5 flex items-center justify-between"
        style={{
          borderTop: "1px solid rgba(123,47,255,0.2)",
          background: "rgba(5,0,10,0.9)",
        }}
      >
        <span className="font-mono-tech text-[8px] text-purple-900 tracking-widest">
          SESSION ID TB-20260920-MAIN · 09:12:04
        </span>
        <span className="font-mono-tech text-[8px] text-purple-900 tracking-widest">
          v1.0.0 · LOCAL STORAGE · AES-256
        </span>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("activation");

  const handleActivate    = useCallback(() => setScreen("booting"),   []);
  const handleBootComplete = useCallback(() => setScreen("dashboard"), []);

  return (
    <div className="relative min-h-screen" style={{ background: "#050008", fontFamily: "'Rajdhani', sans-serif" }}>
      <GlobalStyles />
      <GridBg />
      <Scanlines />

      {/* Global radial atmosphere */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 900px 600px at 50% 0%, rgba(80,20,160,0.14) 0%, transparent 70%)",
        }}
      />

      <AnimatePresence mode="wait">
        {screen === "activation" && (
          <motion.div key="activation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
            <ActivationScreen onActivate={handleActivate} />
          </motion.div>
        )}
        {screen === "booting" && (
          <motion.div key="booting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <BootScreen onComplete={handleBootComplete} />
          </motion.div>
        )}
        {screen === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
