export function Kpi({ label, value, hint, progress }: { label: string; value: string; hint?: string; progress?: number | null }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold leading-tight sm:text-3xl">{value}</div>
      {progress != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-status-done" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      {hint && <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
