import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import ReportCard from "../../components/ReportCard";

export default function EventBoard() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = () => api.listTasks().then(setReports).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const open = reports.filter((r) => r.status === "revenging");
  const inProgress = reports.filter((r) => r.status === "in_progress");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Event Board</h1>
      <p className="text-white/50 text-sm mb-8">Cases that won their court battle (or went uncontested) land here for hunters to accept.</p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <Section title={`Open for revenge (${open.length})`}>
        {open.length === 0 && <p className="text-white/40 text-sm">Nothing open right now.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {open.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      </Section>

      <Section title={`In progress (${inProgress.length})`}>
        {inProgress.length === 0 && <p className="text-white/40 text-sm">No active tasks.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inProgress.map((r) => <ReportCard key={r.id} report={r} />)}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}
