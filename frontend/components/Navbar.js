import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth";

function getLinks(user) {
  if (!user) return [];
  const links = [{ href: "/home", label: "Home" }];
  if (user.role !== "business") {
    links.push({ href: "/upload", label: "File a Report" });
  }
  links.push({ href: "/events", label: "Event Board" });
  links.push({ href: "/court", label: "Court Room" });
  if (user.role === "business") {
    links.push({ href: "/business", label: "Business Desk" });
  }
  return links;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const links = getLinks(user);

  return (
    <header className="border-b border-white/10 bg-[#0b0b0f]/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href={user ? "/home" : "/"} className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">⚖️</span>
          <span className="font-extrabold text-lg tracking-tight">
            Kar<span className="text-karma-500">mate</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`hover:text-white transition ${router.pathname === l.href || router.pathname.startsWith(l.href + "/") ? "text-white font-semibold" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden sm:inline text-white/60">
                {user.username} <span className="text-karma-400">· {user.role}</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/10 transition"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/10 transition">
                Log in
              </Link>
              <Link href="/register" className="px-3 py-1.5 rounded-md bg-karma-500 hover:bg-karma-600 transition font-semibold">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
      {links.length > 0 && (
        <nav className="md:hidden flex items-center gap-4 text-xs text-white/70 px-4 pb-3 overflow-x-auto">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
