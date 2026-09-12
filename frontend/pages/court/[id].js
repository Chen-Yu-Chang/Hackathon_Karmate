import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import StatusBadge from "../../components/StatusBadge";
import VoteBar from "../../components/VoteBar";
import CountdownTimer from "../../components/CountdownTimer";
import PixelAvatar from "../../components/PixelAvatar";
import CourtNarrator from "../../components/CourtNarrator";

const EMOJIS = ["😂", "🔥", "👏", "😱", "🍿", "⚖️"];

export default function CourtRoom() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [entering, setEntering] = useState(false);
  const [voting, setVoting] = useState(false);
  const [myVote, setMyVote] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef(null);

  const loadReport = useCallback(() => {
    if (!id) return;
    api.getReport(id).then(setReport).catch((e) => setError(e.message));
  }, [id]);

  const access = report?.myAccess || { seat: null, entered: false };

  const loadChat = useCallback(() => {
    if (!id || !access.entered) return;
    api.getChat(id).then(setMessages).catch(() => {});
  }, [id, access.entered]);

  useEffect(() => {
    loadReport();
    const t = setInterval(loadReport, 4000);
    return () => clearInterval(t);
  }, [loadReport]);

  useEffect(() => {
    loadChat();
    const t = setInterval(loadChat, 3000);
    return () => clearInterval(t);
  }, [loadChat]);

  useEffect(() => {
    // Scroll only the chat panel itself — never scrollIntoView here, since
    // that can drag the whole page down to satisfy the scroll on first load.
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function enterRoom() {
    setError(null);
    setEntering(true);
    try {
      await api.enterCourt(id);
      loadReport();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setEntering(false);
    }
  }

  async function castVote(voteChoice) {
    setError(null);
    setVoting(true);
    try {
      const resp = await api.vote(id, voteChoice);
      setMyVote(voteChoice);
      setReport((r) => ({ ...r, courtVotes: resp.tally }));
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setVoting(false);
    }
  }

  async function sendMessage(kind, content) {
    if (!content) return;
    setSending(true);
    try {
      await api.postChat(id, { kind, content });
      setChatText("");
      loadChat();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSending(false);
    }
  }

  if (error && !report) return <p className="text-red-400">Couldn&rsquo;t load case: {error}</p>;
  if (!report) return <p className="text-white/40">Loading...</p>;

  const isCourtOpen = report.status === "court";
  const canChatText = access.seat === "reporter" || access.seat === "business";
  const canVote = access.entered && access.seat === "audience";

  return (
    <div className="max-w-4xl mx-auto">
      <Head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      </Head>

      <div className="flex items-center justify-between mb-2">
        <StatusBadge status={report.status} />
        {report.courtEndsAt && <CountdownTimer deadline={report.courtEndsAt} label="Voting closes" />}
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold mb-3">
        {report.aiTitle || `The People vs. ${report.targetName}`}
      </h1>
      <p className="text-white/70 mb-6 whitespace-pre-wrap">{report.description}</p>

      {!access.entered ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="text-4xl mb-3">🏛️</div>
          <h2 className="font-semibold mb-2">Step into the courtroom</h2>
          <p className="text-sm text-white/50 mb-5 max-w-sm mx-auto">
            A one-time $0.50 gets you a seat in the audience — voting and watching the trial are free once
            you&rsquo;re in.
          </p>
          {!user ? (
            <p className="text-xs text-amber-300">Log in to enter.</p>
          ) : !isCourtOpen ? (
            <p className="text-xs text-white/40">This room isn&rsquo;t open for entry right now.</p>
          ) : (
            <button
              onClick={enterRoom}
              disabled={entering}
              className="px-6 py-3 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold disabled:opacity-40 transition"
            >
              {entering ? "Entering..." : "Pay $0.50 → Enter Courtroom"}
            </button>
          )}
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 mb-6 items-start">
          <div
            className="rounded-xl border border-white/10 overflow-hidden"
            style={{
              background:
                "repeating-linear-gradient(45deg, #14141a 0px, #14141a 12px, #191920 12px, #191920 24px)",
            }}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-around mb-4">
                <PixelAvatar
                  variant="reporter"
                  label="Reporter"
                  active={messages[messages.length - 1]?.seat === "reporter"}
                />
                <div
                  className="text-center text-[10px] text-white/40 pt-4"
                  style={{ fontFamily: "'Press Start 2P', monospace" }}
                >
                  VS
                </div>
                <PixelAvatar
                  variant="business"
                  label={report.targetName}
                  active={messages[messages.length - 1]?.seat === "business"}
                />
              </div>

              {/* Chat history — everyone who entered can read it */}
              <div ref={chatScrollRef} className="bg-black/40 rounded-lg border border-white/10 p-3 h-64 overflow-y-auto mb-3 space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-white/30 mt-4">No messages yet — the trial is quiet so far.</p>
                )}
                {messages.map((m) =>
                  m.kind === "text" ? (
                    <div
                      key={m.id}
                      className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                        m.seat === "reporter"
                          ? "bg-blue-600/30 border border-blue-500/30 mr-auto"
                          : "bg-red-600/30 border border-red-500/30 ml-auto"
                      }`}
                    >
                      <div className="text-[10px] text-white/40 mb-0.5">{m.username}</div>
                      {m.content}
                    </div>
                  ) : (
                    <div key={m.id} className="text-center text-xs text-white/50">
                      <span className="text-lg align-middle">{m.content}</span>{" "}
                      <span className="italic">— {m.username}</span>
                    </div>
                  )
                )}
              </div>

              {/* Composer */}
              {canChatText ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage("text", chatText.trim());
                  }}
                  className="flex gap-2 mb-2"
                >
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Say something to the court..."
                    className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm"
                    maxLength={500}
                  />
                  <button
                    type="submit"
                    disabled={sending || !chatText.trim()}
                    className="px-4 py-2 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold text-sm disabled:opacity-40 transition"
                  >
                    Send
                  </button>
                </form>
              ) : (
                <p className="text-[11px] text-white/30 mb-2 text-center">
                  Only the reporter and the reported business can chat here — you can still send emoji below.
                </p>
              )}

              <div className="flex justify-center gap-2 flex-wrap">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    disabled={sending}
                    onClick={() => sendMessage("emoji", e)}
                    className="text-xl px-2 py-1 rounded-md hover:bg-white/10 transition disabled:opacity-40"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <CourtNarrator reportId={id} messages={messages} />
        </div>
      )}

      {access.entered && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <VoteBar yes={report.courtVotes?.yes || 0} no={report.courtVotes?.no || 0} />

          {!isCourtOpen ? (
            <p className="text-center text-sm text-white/50 mt-4">Voting is closed for this case.</p>
          ) : !canVote ? (
            <p className="text-center text-xs text-white/40 mt-4">
              {access.seat === "reporter" || access.seat === "business"
                ? "The two parties in a case don't vote on their own outcome."
                : "Enter the courtroom to vote."}
            </p>
          ) : myVote !== null ? (
            <p className="text-center text-sm text-white/50 mt-4">
              You voted {myVote ? "for revenge 👊" : "to let it go 🤝"}. Thanks for participating.
            </p>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={voting}
                  onClick={() => castVote(true)}
                  className="py-2.5 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold disabled:opacity-40 transition"
                >
                  Vote Revenge (free)
                </button>
                <button
                  disabled={voting}
                  onClick={() => castVote(false)}
                  className="py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold disabled:opacity-40 transition"
                >
                  Let it Go (free)
                </button>
              </div>
              {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
