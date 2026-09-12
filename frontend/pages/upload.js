import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const TARGET_TYPES = [
  { value: "hotel_enterprise", label: "🏨 Hotel — business/enterprise" },
  { value: "hotel_individual", label: "🏨 Hotel — individual owner" },
  { value: "driver", label: "🚗 Driver" },
];

export default function Upload() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // modify2: no more "cash back vs. revenge" choice on this form — every
  // filed report goes straight down the double-cash revenge route.
  const [form, setForm] = useState({
    targetType: "hotel_enterprise",
    targetName: "",
    targetContact: "",
    description: "",
    choice: "revenge",
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("media", f));
      const resp = await api.createReport(fd);
      setResult(resp);
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authLoading && !user) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-white/60 mb-4">You need an account to file a report.</p>
        <button onClick={() => router.push("/login")} className="px-5 py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold">
          Log in
        </button>
      </div>
    );
  }

  if (!authLoading && user?.role === "business") {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-4xl mb-4">🚫</div>
        <p className="text-white/60 mb-4">Business accounts respond to reports from the Business Desk — they can&rsquo;t file new ones.</p>
        <button onClick={() => router.push("/business")} className="px-5 py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold">
          Go to Business Desk
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Report filed</h1>
        <p className="text-white/60 mb-2">
          {result.report.targetName} has 3 days (compressed to minutes in this demo) to appeal before it moves
          automatically to the Event Board.
        </p>
        <p className="text-xs text-white/40 mb-6">
          AI media check: {result.verification.isAiVerified ? "passed ✅" : "no verified media / flagged ⚠️"}
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push("/home")} className="px-4 py-2 rounded-lg border border-white/15 hover:bg-white/10">
            Back home
          </button>
          <button onClick={() => router.push("/business")} className="px-4 py-2 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold">
            View in Business Desk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">File a report</h1>
      <p className="text-white/50 text-sm mb-6">
        Tell us what happened. If the business doesn&rsquo;t appeal in time, your case goes straight to the Event
        Board.
      </p>

      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Who wronged you?">
          <select value={form.targetType} onChange={(e) => update("targetType", e.target.value)} className="input">
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Business / driver name">
          <input value={form.targetName} onChange={(e) => update("targetName", e.target.value)} className="input" required placeholder="e.g. Grand Hotel Downtown" />
        </Field>

        <Field label="Their contact (for the appeal notice)">
          <input value={form.targetContact} onChange={(e) => update("targetContact", e.target.value)} className="input" required placeholder="email or phone" />
        </Field>

        <Field label="What happened?">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="input min-h-[120px]"
            required
            placeholder="Describe your experience..."
          />
        </Field>

        <Field label="Proof (screenshots, photos, chat logs)">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="input file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-karma-500 file:text-white file:font-semibold"
          />
          {files.length > 0 && <p className="text-xs text-white/40 mt-1">{files.length} file(s) selected — run through AI authenticity check on submit</p>}
        </Field>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full py-3 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold transition disabled:opacity-50">
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>

      <style jsx>{`
        .input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 0.5rem;
          padding: 0.6rem 0.75rem;
          color: white;
        }
        .input:focus {
          outline: none;
          border-color: #f4402a;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm text-white/60 mb-1">{label}</span>
      {children}
    </label>
  );
}
