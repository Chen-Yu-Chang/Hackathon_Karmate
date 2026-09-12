import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import CountdownTimer from "../../components/CountdownTimer";

export default function CourtIndex() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = () => api.listReports("court").then(setReports).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Court Room</h1>
      <p className="text-white/50 text-sm mb-8">
        Cases in live voting. Pay a one-time $0.50 to step inside — voting and watching the trial unfold is free
        once you&rsquo;re in.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      {reports.length === 0 && !error && <p className="text-white/40 text-sm">No cases are in live voting right now.</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {reports.map((r) => (
          <Link
            key={r.id}
            href={`/court/${r.id}`}
            className="block rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-karma-500/50 hover:bg-white/[0.06] transition"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-purple-500/15 text-purple-300 border-purple-500/30">
                🏛️ Live voting
              </span>
              {r.courtEndsAt && <CountdownTimer deadline={r.courtEndsAt} />}
            </div>
            <h2 className="font-semibold leading-snug mb-1">{r.aiTitle || `The People vs. ${r.targetName}`}</h2>
            <p className="text-sm text-white/60 line-clamp-2 mb-3">{r.description}</p>
            <div className="text-xs text-white/40">
              👊 {r.courtVotes?.yes || 0} revenge · 🤝 {r.courtVotes?.no || 0} let it go
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
