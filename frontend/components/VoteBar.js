export default function VoteBar({ yes = 0, no = 0 }) {
  const total = yes + no;
  const yesPct = total === 0 ? 50 : Math.round((yes / total) * 100);

  return (
    <div>
      <div className="flex justify-between text-xs mb-1 text-white/60">
        <span>👊 Revenge {yes}</span>
        <span>🤝 Let it go {no}</span>
      </div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
        <div className="h-full bg-karma-500 transition-all duration-500" style={{ width: `${yesPct}%` }} />
        <div className="h-full bg-blue-500/70 transition-all duration-500" style={{ width: `${100 - yesPct}%` }} />
      </div>
      <div className="text-center text-xs text-white/40 mt-1">{total} vote{total === 1 ? "" : "s"} cast</div>
    </div>
  );
}
