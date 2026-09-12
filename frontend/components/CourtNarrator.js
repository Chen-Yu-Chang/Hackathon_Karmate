import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";

// The ▶ Read chat aloud / ⏸ Pause buttons beside the courtroom. Speaks each
// new *text* chat message in order (emoji reactions aren't narrated — there's
// no line to read) via ElevenLabs, one seat = one voice. If no
// ELEVENLABS_API_KEY is configured on the backend, it falls back to the
// browser's own built-in speech synthesis automatically on the first
// message — same buttons, same behavior, just a flatter default voice.
export default function CourtNarrator({ reportId, messages }) {
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState(null); // null (unknown yet) | "elevenlabs" | "browser"
  const [narrating, setNarrating] = useState(false); // actively speaking a line right now
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const modeRef = useRef(null);
  const playingRef = useRef(false);
  const queueRunningRef = useRef(false);
  const spokenIdsRef = useRef(new Set());
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    audioRef.current = typeof Audio !== "undefined" ? new Audio() : null;
    return () => {
      audioRef.current?.pause();
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakBrowser = useCallback((message) => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
      const utter = new SpeechSynthesisUtterance(`${message.username} says: ${message.content}`);
      utter.rate = 1.0;
      utter.pitch = message.seat === "business" ? 0.85 : 1.1; // give the two seats distinct-ish voices
      utter.onend = resolve;
      utter.onerror = resolve; // never let a browser TTS hiccup stall the queue
      window.speechSynthesis.speak(utter);
    });
  }, []);

  const speakElevenLabs = useCallback(async (message) => {
    const blob = await api.fetchSpeech(reportId, message.id);
    const url = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      const audio = audioRef.current;
      if (!audio) return resolve();
      audio.src = url;
      audio.onended = resolve;
      audio.onerror = () => reject(new Error("audio_playback_failed"));
      audio.play().catch(reject);
    });
    URL.revokeObjectURL(url);
  }, [reportId]);

  // The narration loop: keeps pulling the next not-yet-spoken text message
  // and speaking it, for as long as `playing` stays true. Pausing just
  // pauses the underlying <audio>/speechSynthesis mid-line — resuming
  // continues that same line rather than restarting the loop, because the
  // in-flight await here simply keeps waiting for it to end.
  const runQueue = useCallback(async () => {
    if (queueRunningRef.current) return;
    queueRunningRef.current = true;
    try {
      while (playingRef.current) {
        const next = messagesRef.current.find(
          (m) => m.kind === "text" && !spokenIdsRef.current.has(m.id)
        );
        if (!next) break; // nothing new to say yet; a message-arrival effect restarts this

        spokenIdsRef.current.add(next.id);
        setNarrating(true);
        try {
          if (modeRef.current === "browser") {
            await speakBrowser(next);
          } else {
            try {
              await speakElevenLabs(next);
              modeRef.current = "elevenlabs";
              setMode("elevenlabs");
            } catch (err) {
              if (err.data?.error === "tts_not_configured") {
                modeRef.current = "browser";
                setMode("browser");
                await speakBrowser(next);
              } else {
                throw err;
              }
            }
          }
          setError(null);
        } catch (err) {
          console.warn("[narrator] couldn't narrate a line, skipping it:", err.message);
          setError("Couldn't reach ElevenLabs — skipped a line.");
        }
      }
    } finally {
      setNarrating(false);
      queueRunningRef.current = false;
    }
  }, [speakBrowser, speakElevenLabs]);

  // Resume/continue the queue whenever it's playing and new messages show up.
  useEffect(() => {
    if (playing) runQueue();
  }, [messages, playing, runQueue]);

  function handlePlay() {
    setError(null);
    setPlaying(true);
    playingRef.current = true;

    // Resume a line that was mid-playback rather than restarting it.
    const audio = audioRef.current;
    if (modeRef.current === "elevenlabs" && audio && audio.src && audio.paused && !audio.ended) {
      audio.play().catch(() => {});
    } else if (modeRef.current === "browser" && typeof window !== "undefined" && window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }

    runQueue();
  }

  function handlePause() {
    setPlaying(false);
    playingRef.current = false;
    audioRef.current?.pause();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  const modeLabel =
    mode === "elevenlabs"
      ? "🔊 ElevenLabs voices"
      : mode === "browser"
      ? "🔊 Browser voice (no ElevenLabs key set)"
      : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 h-fit">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <span className="text-lg">🎙️</span> Courtroom narrator
      </h3>
      <p className="text-xs text-white/50">Have the chat read aloud, in character, as it comes in.</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={playing}
          className="flex-1 py-2 rounded-lg bg-karma-500 hover:bg-karma-600 text-sm font-semibold transition disabled:opacity-40"
        >
          ▶ {narrating ? "Reading..." : "Read chat aloud"}
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!playing}
          className="py-2 px-3 rounded-lg border border-white/15 hover:bg-white/10 text-sm transition disabled:opacity-40"
        >
          ⏸
        </button>
      </div>

      {modeLabel && <p className="text-[11px] text-white/40">{modeLabel}</p>}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
