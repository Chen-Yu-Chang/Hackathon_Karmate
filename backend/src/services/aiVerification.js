// AI image authenticity check (TDD 1: "圖片 AI 真偽檢測 API — Sightengine 或
// OpenAI Vision API"). Real integration is used automatically when
// SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET are set; otherwise this
// falls back to a deterministic mock so the demo works with zero keys.

const fetch = require("node-fetch");

async function verifyMedia(mediaUrls) {
  const { SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET } = process.env;

  if (!mediaUrls || mediaUrls.length === 0) {
    return { isAiVerified: false, reason: "no_media_supplied" };
  }

  if (SIGHTENGINE_API_USER && SIGHTENGINE_API_SECRET) {
    try {
      const url = mediaUrls[0];
      const params = new URLSearchParams({
        url,
        models: "genai",
        api_user: SIGHTENGINE_API_USER,
        api_secret: SIGHTENGINE_API_SECRET,
      });
      const res = await fetch(
        `https://api.sightengine.com/1.0/check.json?${params.toString()}`
      );
      const data = await res.json();
      const aiScore = data?.type?.ai_generated ?? 1;
      return {
        isAiVerified: aiScore < 0.5, // low AI-generated score => looks real
        reason: "sightengine",
        raw: data,
      };
    } catch (err) {
      // fall through to mock on network/API failure so the flow never hard-fails
      console.warn("[aiVerification] Sightengine call failed, using mock:", err.message);
    }
  }

  // --- mock mode ---
  // Deterministic "looks real" pass for any http(s) media url, so the demo
  // flow is reproducible; swap in real keys above for genuine detection.
  const looksReal = mediaUrls.every((u) => /^https?:\/\//.test(u) || u.startsWith("/uploads/"));
  return { isAiVerified: looksReal, reason: "mock" };
}

module.exports = { verifyMedia };
