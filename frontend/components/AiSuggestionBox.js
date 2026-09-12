import { useState } from "react";
import { api } from "../lib/api";

// Sits beside the fixed revenge-method list on the Event page — lets Gemini
// read the report's description and pitch its own idea, which the hunter
// can drop straight into the "Custom" plan with one click.
export default function AiSuggestionBox({ reportId, onUse }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.suggestRevenge(reportId);
      setSuggestion(resp.suggestion);
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-karma-500/40 bg-karma-500/[0.04] p-4 space-y-3 h-fit">
      <div className="flex items-center gap-2">
        <span className="text-lg">✨</span>
        <h3 className="font-semibold text-sm">Need an idea?</h3>
      </div>
      <p className="text-xs text-white/50">
        Let Gemini read the complaint and pitch a revenge idea of its own.
      </p>

      {!suggestion && (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-karma-500/20 hover:bg-karma-500/30 border border-karma-500/40 text-sm font-medium transition disabled:opacity-40"
        >
          {loading ? "Thinking..." : "✨ Ask Gemini"}
        </button>
      )}

      {suggestion && (
        <div className="space-y-2">
          <p className="text-sm text-white/80 italic">&ldquo;{suggestion}&rdquo;</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUse(suggestion)}
              className="flex-1 py-1.5 rounded-lg bg-karma-500 hover:bg-karma-600 text-xs font-semibold transition"
            >
              Use this plan
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={loading}
              title="Ask again"
              className="py-1.5 px-3 rounded-lg border border-white/15 hover:bg-white/10 text-xs transition disabled:opacity-40"
            >
              {loading ? "..." : "↻"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
