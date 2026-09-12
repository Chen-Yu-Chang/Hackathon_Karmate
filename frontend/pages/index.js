import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../lib/auth";

const HOW_IT_WORKS = [
  "🔥 File a report on a bad experience",
  "⚖️ The public votes in Karmate's court",
  "😈 Winning cases get avenged — or cashed back",
];

export default function Gate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const t = setInterval(() => setTipIndex((i) => (i + 1) % HOW_IT_WORKS.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-black text-white">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/hero-fire.jpg)" }}
      />
      {/* Legibility gradient: dark at bottom-left where the copy sits, tapering out */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

      {/* Top bar — Apple-style: translucent, subtle shadow separating it from the image behind */}
      <header className="absolute top-0 inset-x-0 z-10 h-16 flex items-center px-4 sm:px-8 bg-gradient-to-b from-black/60 to-transparent shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">
        <span className="flex items-center gap-2">
          <span className="text-2xl">⚖️</span>
          <span className="font-extrabold text-lg tracking-tight">
            Kar<span className="text-karma-500">mate</span>
          </span>
        </span>
      </header>

      {/* Content anchored bottom-left, everything visible with no scrolling */}
      <div className="relative z-10 h-full flex flex-col justify-end px-6 sm:px-10 pb-12 sm:pb-16 max-w-xl">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-3 drop-shadow-lg">
          Kar<span className="text-karma-500">mate</span>
        </h1>
        <p className="text-lg sm:text-2xl font-semibold text-white/90 mb-4 drop-shadow">
          Got wronged? Get Karma.
        </p>

        <div className="h-6 mb-8 overflow-hidden">
          <p key={tipIndex} className="text-sm sm:text-base text-white/70 fire-fade">
            {HOW_IT_WORKS[tipIndex]}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg bg-karma-500 hover:bg-karma-600 font-semibold transition text-center"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-lg border border-white/30 bg-white/5 hover:bg-white/15 backdrop-blur font-semibold transition text-center"
          >
            Sign up
          </Link>
        </div>
      </div>

      <style jsx>{`
        .fire-fade {
          animation: fireFade 2.6s ease-in-out;
        }
        @keyframes fireFade {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          12% {
            opacity: 1;
            transform: translateY(0);
          }
          88% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
