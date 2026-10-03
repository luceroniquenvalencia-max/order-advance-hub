import { cn } from "@/lib/utils";
import { estadoLabel, type Estado } from "@/lib/solicitudes";

const styles: Record<Estado, string> = {
  PENDIENTE: "bg-status-pending-bg text-accent-foreground [--dot:var(--status-pending)]",
  EN_VALIDACION: "bg-status-review-bg text-status-review [--dot:var(--status-review)]",
  ATENDIDO: "bg-status-done-bg text-status-done [--dot:var(--status-done)]",
  NO_ATENDIDO: "bg-status-rejected-bg text-status-rejected [--dot:var(--status-rejected)]",
};

export function StatusBadge({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[estado],
        className,
      )}
    >
      <span className="size-2 rounded-full bg-[var(--dot)]" />
      {estadoLabel(estado)}
    </span>
  );
}
