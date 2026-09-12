import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

const ROLES = [
  { value: "normal", label: "Reporter (file complaints)" },
  { value: "business", label: "Business (respond to reports)" },
  { value: "hunter", label: "Hunter (accept revenge tasks)" },
  { value: "admin", label: "Admin (demo only)" },
];

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "normal", ssn: "", bankAccount: "" });
  const [showKyc, setShowKyc] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const router = useRouter();

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await api.register(form);
      saveSession(resp);
      router.push("/home");
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create an account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Username">
          <input value={form.username} onChange={(e) => update("username", e.target.value)} className="input" required />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="input" required />
        </Field>
        <Field label="Password">
          <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="input" required />
        </Field>
        <Field label="Role">
          <select value={form.role} onChange={(e) => update("role", e.target.value)} className="input">
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </Field>

        <div className="rounded-lg border border-white/10 p-3">
          <button type="button" onClick={() => setShowKyc((s) => !s)} className="text-sm text-white/60 hover:text-white">
            {showKyc ? "▾" : "▸"} Identity verification (optional) — required by the TDD for anti-fraud, stored AES-256 encrypted
          </button>
          {showKyc && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
                Demo app — please do not enter a real SSN or bank account here. Use any placeholder text; it exists to
                demonstrate the field-level encryption described in the design doc (section 5).
              </p>
              <Field label="SSN (placeholder only)">
                <input value={form.ssn} onChange={(e) => update("ssn", e.target.value)} className="input" placeholder="e.g. XXX-XX-1234" />
              </Field>
              <Field label="Bank account (placeholder only)">
                <input value={form.bankAccount} onChange={(e) => update("bankAccount", e.target.value)} className="input" placeholder="e.g. demo-account-0001" />
              </Field>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold transition disabled:opacity-50">
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-white/50 mt-4">
        Already have an account? <Link href="/login" className="text-karma-400 hover:underline">Log in</Link>
      </p>

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
