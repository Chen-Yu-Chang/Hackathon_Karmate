// AI-generated headline for a filed report (TDD 4.2: "AI 生成審判標題"),
// meant to be intriguing/clickable on the feed and later doubles as the
// Court Room title if the business appeals. Real integration calls Google's
// Gemini API when GEMINI_API_KEY is set; otherwise this falls back to a
// deterministic local template so the demo works with zero keys.

const fetch = require("node-fetch");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function mockTitle(report) {
  const verdictWord = report.choice === "revenge" ? "Revenge" : "Cash Back";
  return `The People vs. ${report.targetName}: ${verdictWord} on Trial`;
}

async function generateAiTitle(report) {
  const { GEMINI_API_KEY } = process.env;

  if (GEMINI_API_KEY) {
    try {
      const prompt =
        "You are writing the headline for a public consumer-complaint feed, styled " +
        "like a tabloid or viral-post title — intriguing and dramatic enough that a " +
        "stranger scrolling past would stop and click in to read the full story. " +
        "One line, max 12 words, no quotation marks, no hashtags.\n\n" +
        `Business/driver being reported: ${report.targetName}\n` +
        `Their side of the story (from the person filing): ${report.description}\n\n` +
        "Respond with only the headline text, nothing else.";

      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            // Thinking-capable models (2.5+/3.x) spend part of the output
            // budget on internal reasoning before writing the actual
            // answer. Too small a maxOutputTokens lets the model burn the
            // whole budget "thinking" and hit MAX_TOKENS before it ever
            // writes the headline, which comes back as an empty parts[0]
            // — so leave real headroom, and dial thinking down since a
            // one-line headline doesn't need much of it.
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
      // Thinking models can return several parts — some are internal
      // "thought" parts with no visible answer — so skip those rather than
      // always grabbing parts[0].
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts
        .filter((p) => !p.thought && p.text)
        .map((p) => p.text)
        .join(" ")
        .trim();
      if (text) {
        // Strip any wrapping quotes the model likes to add, keep it single-line.
        return text.replace(/^["'“]+|["'”]+$/g, "").split("\n")[0].slice(0, 140);
      }
      throw new Error(`Gemini response had no text (finishReason: ${finishReason || "unknown"})`);
    } catch (err) {
      // Fall through to the local template on any network/API failure so
      // filing a report never hard-fails just because the headline call
      // errored. Logged loudly (not swallowed) so a bad key, wrong model
      // name, or disabled API shows up here instead of just silently
      // producing the generic fallback title.
      console.error("[aiTitle] Gemini call failed, using local template instead:", err.message);
    }
  }

  // --- mock mode (no GEMINI_API_KEY set) ---
  return mockTitle(report);
}

module.exports = { generateAiTitle };
