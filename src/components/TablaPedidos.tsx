import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { Grupo } from "@/lib/pedidos-csv";
import { cn } from "@/lib/utils";

export const f0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
export const f2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export type FilaTabla = { g: Grupo; gv: number; miss: number; gq: number; extra?: string; status?: string };

const STATUS_STYLE: Record<string, string> = {
  "Entregado": "bg-status-done-bg text-status-done",
  "En ruta": "bg-status-review-bg text-status-review",
  "No entregado": "bg-status-rejected-bg text-status-rejected",
  "Sin estado": "bg-muted text-muted-foreground",
};

export function TablaPedidos({ rows, collapsed, isLoading, error, emptyMsg, showStatus }: {
  rows: FilaTabla[]; collapsed: boolean; isLoading?: boolean; error?: unknown; emptyMsg: string; showStatus?: boolean;
}) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const cols = showStatus ? 6 : 5;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="bg-primary text-left text-primary-foreground">
            {["Pedido / SKU", "Cliente", "Distrito"].map((h) => <th key={h} className="whitespace-nowrap px-2.5 py-2 font-semibold">{h}</th>)}
            <th className="px-2.5 py-2 text-right font-semibold">Cantidad</th>
            <th className="px-2.5 py-2 text-right font-semibold">Valorizado</th>
            {showStatus && <th className="px-2.5 py-2 font-semibold">Status</th>}
            <th className="w-10 px-2 py-2" aria-label="Ver SKU" />
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={cols + 1} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
          ) : error ? (
            <tr><td colSpan={cols + 1} className="px-4 py-10 text-center text-destructive">{error instanceof Error ? error.message : "No pude leer los datos."}</td></tr>
          ) : !rows.length ? (
            <tr><td colSpan={cols + 1} className="px-4 py-10 text-center text-muted-foreground">{emptyMsg}</td></tr>
          ) : rows.flatMap(({ g, gv, miss, gq, extra, status }) => {
            const none = miss === g.ls.length;
            const open = abiertos[g.p] ?? !collapsed;
            return [
              <tr key={g.p} className="border-t bg-accent font-semibold">
                <td className="px-2.5 py-1.5">{g.p}</td>
                <td className="px-2.5 py-1.5">{g.c}{extra && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{extra}</span>}</td>
                <td className="px-2.5 py-1.5">{g.d}</td>
                <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{f0.format(gq)}</td>
                <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">
                  {none ? <span className="text-muted-foreground">—</span> : "S/ " + f2.format(gv)}
                  {miss > 0 && <span className="ml-1.5 text-xs font-medium text-status-pending">{none ? "sin valorizar" : "parcial"}</span>}
                </td>
                {showStatus && (
                  <td className="px-2.5 py-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status ?? "Sin estado"])}>{status ?? "Sin estado"}</span>
                  </td>
                )}
                <td className="px-2 py-1.5 text-center">
                  <button aria-label={open ? "Ocultar SKU" : "Ver SKU"} onClick={() => setAbiertos((s) => ({ ...s, [g.p]: !open }))}
                    className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground">
                    {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </td>
              </tr>,
              ...(open ? g.ls.map((l, i) => (
                <tr key={g.p + "-" + i}>
                  <td className="py-1.5 pl-7 pr-2.5 text-muted-foreground">{l.s}</td>
                  <td /><td />
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{f0.format(l.q)}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{l.v == null ? <span className="text-muted-foreground">—</span> : "S/ " + f2.format(l.v)}</td>
                  {showStatus && <td />}
                  <td />
                </tr>
              )) : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
