import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, tone = "default", hint,
}: {
  label: string; value: string | number; icon: LucideIcon;
  tone?: "default" | "pending" | "done" | "rejected" | "review"; hint?: string;
}) {
  const toneCls = {
    default: "bg-primary text-primary-foreground",
    pending: "bg-status-pending-bg text-accent-foreground",
    review: "bg-status-review-bg text-status-review",
    done: "bg-status-done-bg text-status-done",
    rejected: "bg-status-rejected-bg text-status-rejected",
  }[tone];
  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-md", toneCls)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
