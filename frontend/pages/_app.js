import { useRouter } from "next/router";
import "../styles/globals.css";
import { AuthProvider } from "../lib/auth";
import Navbar from "../components/Navbar";

// The splash/gate page ("/") builds its own full-bleed header and layout,
// so the global chrome (sticky nav + padded container + footer) is skipped
// there and shown everywhere else.
export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isGate = router.pathname === "/";

  if (isGate) {
    return (
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0b0b0f] text-white">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <Component {...pageProps} />
        </main>
        <footer className="max-w-6xl mx-auto px-4 sm:px-6 py-10 text-xs text-white/30">
          Karmate demo build — fictional product concept generated from a technical design document. Not a real payments/consumer-dispute service.
        </footer>
      </div>
    </AuthProvider>
  );
}
