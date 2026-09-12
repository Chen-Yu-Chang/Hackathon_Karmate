// ElevenLabs text-to-speech for the Court Room narrator (the ▶ Play / ⏸
// Pause buttons beside the courtroom). Reads a single text chat message
// aloud with a per-seat voice plus a lightweight "audio tag" cue (ElevenLabs
// eleven_v3's inline emotion markup, e.g. "[angry] ..." / "[defensive] ...")
// so the reporter and the reported business sound distinct and animated
// instead of flat.
//
// There's no generated-audio fallback here if ELEVENLABS_API_KEY is unset —
// instead this throws a recognizable `not_configured` error so the route
// can tell the frontend to fall back to the browser's own built-in speech
// synthesis (window.speechSynthesis) instead, which needs no key, no
// network call, and works out of the box.

const fetch = require("node-fetch");

const ELEVENLABS_MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

// Stock ElevenLabs premade voices ("Rachel" / "Adam") used as defaults so
// this works the moment a key is added — override with your own voice IDs
// in .env if you want different voices per seat.
const VOICE_IDS = {
  reporter: process.env.ELEVENLABS_VOICE_REPORTER || "KLZOWyG48RjZkAAjuM89", // "Rachel"
  business: process.env.ELEVENLABS_VOICE_BUSINESS || "exsUS4vynmxd379XN4yO", // "Adam"
};

// Small heuristic so the same line doesn't always read in the same flat
// tone: shout-y punctuation/caps escalate the emotion tag a notch.
function pickEmotionTag(message) {
  const text = (message.content || "").trim();
  const shouting = /!\s*$/.test(text) || /\b[A-Z]{4,}\b/.test(text);
  if (message.seat === "business") {
    return shouting ? "[defensive][raises voice]" : "[defensive]";
  }
  return shouting ? "[angry][raises voice]" : "[frustrated]";
}

async function synthesizeMessage(message) {
  const { ELEVENLABS_API_KEY } = process.env;
  if (!ELEVENLABS_API_KEY) {
    const err = new Error("ELEVENLABS_API_KEY is not set");
    err.code = "not_configured";
    throw err;
  }

  const voiceId = VOICE_IDS[message.seat] || VOICE_IDS.reporter;
  const tag = pickEmotionTag(message);
  const text = `${tag} ${message.content}`.slice(0, 800);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.8,
          style: 0.7,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`ElevenLabs API responded ${res.status}: ${body.slice(0, 300)}`);
    err.code = "api_error";
    throw err;
  }

  const buffer = await res.buffer();
  return { buffer, contentType: "audio/mpeg" };
}

module.exports = { synthesizeMessage };
