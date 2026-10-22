import { cn } from "@/lib/utils";

const ORDER = [
  ["Entregado", "--status-done"],
  ["En ruta", "--status-review"],
  ["No entregado", "--status-rejected"],
  ["Sin status", "--muted-foreground"],
] as const;

export function DonutStatus({ counts, active, onSelect }: { counts: Record<string, number>; active: string; onSelect: (s: string) => void }) {
  const total = ORDER.reduce((s, [k]) => s + (counts[k] ?? 0), 0);
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0 -rotate-90" role="img" aria-label="Pedidos por status">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--muted)" strokeWidth="18" />
        {total > 0 && ORDER.map(([k, c]) => {
          const n = counts[k] ?? 0;
          if (!n) return null;
          const len = (n / total) * C;
          const el = <circle key={k} cx="70" cy="70" r={R} fill="none" stroke={`var(${c})`} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />;
          off += len;
          return el;
        })}
      </svg>
      <ul className="space-y-1.5 text-sm">
        {ORDER.map(([k, c]) => (
          <li key={k}>
            <button onClick={() => onSelect(active === k ? "" : k)} aria-pressed={active === k}
              className={cn("flex items-center gap-2 rounded px-1.5 py-0.5 hover:bg-muted", active === k && "bg-muted font-semibold")}>
              <span className="size-2.5 rounded-full" style={{ background: `var(${c})` }} />
              <span className="text-muted-foreground">{k}</span>
              <b className="tabular-nums">{counts[k] ?? 0}</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
