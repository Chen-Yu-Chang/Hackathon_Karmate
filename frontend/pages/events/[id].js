import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import StatusBadge from "../../components/StatusBadge";
import CountdownTimer from "../../components/CountdownTimer";
import AiSuggestionBox from "../../components/AiSuggestionBox";

const REVENGE_OPTIONS = [
  { value: "fake_tv_interview", label: "Fake TV Interview", desc: "Arrange a bogus TV crew \"interview\" to waste their afternoon." },
  { value: "russian_doll", label: "Russian Nesting Doll", desc: "A chain of escalating, layered pranks." },
  { value: "paintball", label: "Paintball", desc: "Book out a paintball venue against the business/venue." },
  { value: "driver_cancel", label: "Driver Cancel", desc: "Call a ride from far away, cancel 2 minutes before arrival." },
  { value: "custom", label: "Custom", desc: "Propose your own plan below." },
];

export default function EventDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [revengeType, setRevengeType] = useState("fake_tv_interview");
  const [customDetails, setCustomDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api.getReport(id).then(setReport).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function acceptTask(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.acceptTask(id, { revengeType, customDetails: revengeType === "custom" ? customDetails : undefined });
      load();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDone(taskId) {
    setError(null);
    try {
      await api.submitTask(taskId);
      load();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  async function markComplete(taskId) {
    setError(null);
    try {
      await api.completeTask(taskId);
      load();
    } catch (err) {
      setError(err.data?.error || err.message);
    }
  }

  if (error && !report) return <p className="text-red-400">Couldn&rsquo;t load case: {error}</p>;
  if (!report) return <p className="text-white/40">Loading...</p>;

  const task = report.revengeTasks?.[0];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={report.status} />
        {task?.deadline && <CountdownTimer deadline={task.deadline} label="Task due" />}
      </div>

      <h1 className="text-2xl font-extrabold mb-1">{report.aiTitle || report.targetName}</h1>
      <p className="text-white/50 text-sm mb-4">vs. {report.targetName} · {report.targetType}</p>
      <p className="text-white/70 mb-6 whitespace-pre-wrap">{report.description}</p>

      {report.status === "revenging" && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 items-start">
          <form onSubmit={acceptTask} className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <h2 className="font-semibold mb-1">Accept this task</h2>
            {!user && <p className="text-xs text-amber-300">Log in as a hunter to accept a task.</p>}
            <div className="space-y-2">
              {REVENGE_OPTIONS.map((opt) => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${revengeType === opt.value ? "border-karma-500 bg-karma-500/10" : "border-white/10 hover:bg-white/5"}`}>
                  <input
                    type="radio"
                    name="revengeType"
                    value={opt.value}
                    checked={revengeType === opt.value}
                    onChange={() => setRevengeType(opt.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-sm">{opt.label}</span>
                    <span className="block text-xs text-white/50">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            {revengeType === "custom" && (
              <textarea
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                placeholder="Describe your plan..."
                className="w-full bg-white/5 border border-white/15 rounded-lg p-3 text-sm"
              />
            )}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={!user || submitting} className="w-full py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold disabled:opacity-40 transition">
              {submitting ? "Accepting..." : "Accept Task"}
            </button>
          </form>

          <AiSuggestionBox
            reportId={id}
            onUse={(text) => {
              setRevengeType("custom");
              setCustomDetails(text);
            }}
          />
        </div>
      )}

      {task && report.status === "in_progress" && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="font-semibold mb-2">
            {task.status === "pending_review" ? "Submitted for review" : "Task in progress"}
          </h2>
          <p className="text-sm text-white/60 mb-1">
            Method: <span className="font-medium text-white">{REVENGE_OPTIONS.find((o) => o.value === task.revengeType)?.label || task.revengeType}</span>
          </p>
          {task.customDetails && <p className="text-sm text-white/60 mb-1">Plan: {task.customDetails}</p>}
          <p className="text-sm text-white/60 mb-4">Reward: ${task.rewardAmount.toFixed(2)}</p>

          {task.status === "in_progress" && user?.id === task.hunterId && (
            <button onClick={() => submitDone(task.id)} className="px-4 py-2 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold text-sm transition">
              I completed this — mark as done
            </button>
          )}
          {task.status === "in_progress" && user?.id !== task.hunterId && (
            <p className="text-xs text-white/40">Waiting on the hunter to mark this done.</p>
          )}

          {task.status === "pending_review" && user?.role === "admin" && (
            <button onClick={() => markComplete(task.id)} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 font-semibold text-sm transition">
              Confirm completion & pay out
            </button>
          )}
          {task.status === "pending_review" && user?.role !== "admin" && (
            <p className="text-xs text-white/40">Submitted by the hunter — awaiting admin confirmation before payout.</p>
          )}
        </div>
      )}

      {report.status === "completed" && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-center">
          <p className="font-semibold text-green-300">✅ Task completed — reward paid out.</p>
        </div>
      )}
    </div>
  );
}
