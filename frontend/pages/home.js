import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import ReportCard from "../components/ReportCard";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    api
      .listReports()
      .then(setReports)
      .catch((e) => setError(e.message));
  }, []);

  if (authLoading || !user) return null;

  return (
    <div>
      <section className="text-center py-12 sm:py-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Got wronged? <span className="text-karma-500">Get Karma.</span>
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto mb-8">
          File a report against a hotel or driver, let the public vote in Karmate&rsquo;s court,
          then take cash back — or let the crowd handle the revenge.
        </p>
        <div className="flex items-center justify-center gap-3">
          {user.role !== "business" && (
            <Link href="/upload" className="px-5 py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold transition">
              File a Report
            </Link>
          )}
          <Link href="/events" className="px-5 py-2.5 rounded-lg border border-white/15 hover:bg-white/10 transition">
            Browse Open Cases
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4 mb-12">
        <StepCard n="1" title="Upload" desc="Describe what happened, attach proof, and choose cash back or revenge." />
        <StepCard n="2" title="Court" desc="If the business appeals, pay a one-time $0.50 to enter the courtroom — voting inside is free." />
        <StepCard n="3" title="Revenge / Payout" desc="Winning cases go to the Event Board where hunters accept tasks, or cash back is issued." />
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">Live Case Feed</h2>
        {error && <p className="text-red-400 text-sm">Couldn&rsquo;t reach the backend: {error}</p>}
        {reports.length === 0 && !error && <p className="text-white/40 text-sm">No cases yet — be the first to file one.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StepCard({ n, title, desc }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="w-8 h-8 rounded-full bg-karma-500/20 text-karma-400 flex items-center justify-center font-bold mb-3">
        {n}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-white/60">{desc}</p>
    </div>
  );
}
