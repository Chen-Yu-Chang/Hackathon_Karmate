import { useEffect, useState } from "react";

function formatRemaining(ms) {
  if (ms <= 0) return "expired — refresh";
  const totalSeconds = Math.floor(ms / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function CountdownTimer({ deadline, label }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - now;

  return (
    <div className="text-sm text-white/70">
      {label ? <span className="text-white/50">{label}: </span> : null}
      <span className={remaining <= 0 ? "text-red-400 font-semibold" : "font-mono text-white"}>
        {formatRemaining(remaining)}
      </span>
    </div>
  );
}
