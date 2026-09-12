import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import StatusBadge from "../../components/StatusBadge";
import CountdownTimer from "../../components/CountdownTimer";

export default function BusinessDesk() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.listReports("pending").then(setReports).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function appeal(id) {
    setError(null);
    setBusyId(id);
    try {
      await api.appealReport(id);
      load();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-white/60 mb-4">Log in with a business account to view the Business Desk.</p>
        <button onClick={() => router.push("/login")} className="px-5 py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold">
          Log in
        </button>
      </div>
    );
  }

  if (!authLoading && user?.role !== "business") {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-4xl mb-4">🚫</div>
        <p className="text-white/60 mb-4">The Business Desk is only available to business accounts.</p>
        <button onClick={() => router.push("/home")} className="px-5 py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Business Desk</h1>
      <p className="text-white/50 text-sm mb-6">
        Reports awaiting a response. Appeal within the window to send a case to public court instead of letting it
        go straight to the Event Board.
      </p>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="space-y-3">
        {reports.length === 0 && <p className="text-white/40 text-sm">No pending reports right now.</p>}
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={r.status} />
                <span className="font-semibold text-sm">{r.targetName}</span>
              </div>
              <p className="text-sm text-white/60 mb-2 line-clamp-2">{r.description}</p>
              {r.appealDeadline && <CountdownTimer deadline={r.appealDeadline} label="Appeal window closes in" />}
            </div>
            <button
              disabled={busyId === r.id}
              onClick={() => appeal(r.id)}
              className="shrink-0 px-4 py-2 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold text-sm disabled:opacity-40 transition"
            >
              {busyId === r.id ? "Appealing..." : "Appeal to Court"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
