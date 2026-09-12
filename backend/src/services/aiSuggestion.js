// AI-suggested revenge idea — the bonus box that sits next to the built-in
// revenge-method list on the Event page. Takes the report's complaint
// description and pitches one creative, harmless prank idea in the same
// lighthearted tone as the built-in options (Fake TV Interview, Russian
// Nesting Doll, etc). Real integration calls Gemini when GEMINI_API_KEY is
// set; otherwise falls back to a small rotating local list so the box
// always has something to show.

const fetch = require("node-fetch");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const FALLBACK_IDEAS = [
  "Send a dozen 'secret shoppers' the same afternoon, each politely asking staff to explain the exact complaint in detail.",
  "Book out their busiest slot under a fake VIP name, then have the 'VIP' run mysteriously late all day.",
  "Flood their public reviews with suspiciously glowing praise for everything except the one thing that actually went wrong.",
  "Arrange a slow, thorough 'surprise inspection' that's really just one very particular customer with a clipboard.",
  "Have a costumed mascot 'congratulate' them out front for their complaint, on repeat, all day.",
];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function mockSuggestion(report) {
  const idx = Math.abs(hashCode(report.id || report.targetName || "seed")) % FALLBACK_IDEAS.length;
  return FALLBACK_IDEAS[idx];
}

async function suggestRevenge(report) {
  const { GEMINI_API_KEY } = process.env;

  if (GEMINI_API_KEY) {
    try {
      const prompt =
        "You are brainstorming for a lighthearted consumer-revenge app. Given a " +
        "complaint about a business or driver, pitch ONE creative revenge/prank idea " +
        "to \"get back\" at them. It must be playful, clever, and completely harmless: " +
        "never anything illegal, dangerous, threatening, harassing, or that could cause " +
        "real financial, physical, or reputational harm — think silly and inconvenient, " +
        "not damaging. One or two sentences, plain text, no markdown, no preamble, no " +
        "quotation marks.\n\n" +
        `Business/driver: ${report.targetName}\n` +
        `Complaint: ${report.description}\n\n` +
        "Respond with only the suggested idea.";

      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1,
            // See aiTitle.js for why this needs headroom above the
            // thinking budget, and why thinkingLevel is kept low.
            maxOutputTokens: 500,
            thinkingConfig: { thinkingLevel: "low" },
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Gemini API responded ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = await res.json();
      const finishReason = data?.candidates?.[0]?.finishReason;
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts
        .filter((p) => !p.thought && p.text)
        .map((p) => p.text)
        .join(" ")
        .trim();
      if (text) {
        return text.replace(/^["'“]+|["'”]+$/g, "").split("\n")[0].slice(0, 400);
      }
      throw new Error(`Gemini response had no text (finishReason: ${finishReason || "unknown"})`);
    } catch (err) {
      console.error("[aiSuggestion] Gemini call failed, using local fallback instead:", err.message);
    }
  }

  // --- mock mode (no GEMINI_API_KEY set) ---
  return mockSuggestion(report);
}

module.exports = { suggestRevenge };
