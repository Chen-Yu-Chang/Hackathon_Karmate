// A small original 8x10 pixel-art bust, built from a plain character grid
// (no image asset needed). Used for the two "parties" in the Court Room.
const GRID = [
  "..KKKK..",
  ".KHHHHK.",
  ".KHHHHK.",
  ".KSSSSK.",
  ".KWSSWK.",
  ".KSSSSK.",
  "..KSSK..",
  "KKBBBBKK",
  "KBBBBBBK",
  "KBBTTBBK",
];

const PALETTES = {
  reporter: { H: "#5b3a22", S: "#f2c9a0", B: "#2563eb", T: "#f59e0b", K: "#0b0b0f" },
  business: { H: "#374151", S: "#f2c9a0", B: "#b91c1c", T: "#1e3a8a", K: "#0b0b0f" },
};

export default function PixelAvatar({ variant = "reporter", size = 10, label, active = false }) {
  const palette = PALETTES[variant] || PALETTES.reporter;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`grid rounded-md p-1 transition ${active ? "ring-2 ring-karma-400 shadow-[0_0_20px_rgba(244,64,42,0.5)]" : "ring-1 ring-white/10"}`}
        style={{ gridTemplateColumns: `repeat(8, ${size}px)`, background: "#1a1a1f" }}
      >
        {GRID.flatMap((row, y) =>
          row.split("").map((cell, x) => (
            <div
              key={`${x}-${y}`}
              style={{
                width: size,
                height: size,
                background: cell === "." ? "transparent" : palette[cell] || "transparent",
              }}
            />
          ))
        )}
      </div>
      {label && <span className="text-xs text-white/60 font-medium">{label}</span>}
    </div>
  );
}
