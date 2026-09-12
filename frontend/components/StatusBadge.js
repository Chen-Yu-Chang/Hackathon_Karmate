const STYLES = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  court: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  revenging: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  completed: "bg-green-500/15 text-green-300 border-green-500/30",
  rejected: "bg-white/10 text-white/50 border-white/15",
};

const LABELS = {
  pending: "Pending appeal",
  court: "In court",
  revenging: "Open for revenge",
  in_progress: "Task in progress",
  completed: "Completed",
  rejected: "Rejected",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${STYLES[status] || "bg-white/10 text-white/60 border-white/15"}`}>
      {LABELS[status] || status}
    </span>
  );
}
