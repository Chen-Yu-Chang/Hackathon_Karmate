import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { saveSession } = useAuth();
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await api.login({ username, password });
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
      <h1 className="text-2xl font-bold mb-6">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Username">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="input" required />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
        </Field>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold transition disabled:opacity-50">
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="text-sm text-white/50 mt-4">
        No account? <Link href="/register" className="text-karma-400 hover:underline">Sign up</Link>
      </p>
      <p className="text-xs text-white/30 mt-6">
        Demo logins (password: password123): <code>alice</code> (normal), <code>bob</code> (hunter),{" "}
        <code>admin</code> (admin), <code>grand_hotel</code> (business).
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
