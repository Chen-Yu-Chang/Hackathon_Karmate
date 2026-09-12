import Link from "next/link";
import StatusBadge from "./StatusBadge";

const TARGET_LABELS = {
  hotel_enterprise: "🏨 Hotel (business)",
  hotel_individual: "🏨 Hotel (individual)",
  driver: "🚗 Driver",
};

function linkFor(report) {
  if (report.status === "court") return `/court/${report.id}`;
  if (report.status === "revenging" || report.status === "in_progress" || report.status === "completed") {
    return `/events/${report.id}`;
  }
  return `/events/${report.id}`;
}

export default function ReportCard({ report }) {
  return (
    <Link
      href={linkFor(report)}
      className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:border-karma-500/50 hover:bg-white/[0.06] transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="text-xs text-white/50">{TARGET_LABELS[report.targetType] || report.targetType}</span>
        <StatusBadge status={report.status} />
      </div>
      <h3 className="font-semibold leading-snug mb-1">
        {report.aiTitle || report.targetName}
      </h3>
      <p className="text-sm text-white/60 line-clamp-2">{report.description}</p>
      <div className="flex items-center justify-between mt-3 text-xs text-white/40">
        <span>vs. {report.targetName}</span>
        <span>{report.choice === "revenge" ? "seeking revenge" : "seeking cash back"}</span>
      </div>
    </Link>
  );
}
