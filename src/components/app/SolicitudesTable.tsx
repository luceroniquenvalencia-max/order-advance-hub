import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { fmtDate, fmtDateTime, type Solicitud } from "@/lib/solicitudes";

export function SolicitudesTable({ rows, showAsesor }: { rows: Solicitud[]; showAsesor?: boolean }) {
  if (!rows.length)
    return (
      <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
        No hay solicitudes que coincidan con los filtros.
      </div>
    );
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              {showAsesor && <th className="px-4 py-3 font-medium">Asesor</th>}
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">F. solicitada</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Atención</th>
              <th className="px-4 py-3 font-medium">Comentario</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-muted/60">
                <td className="px-4 py-3 font-mono text-xs font-semibold">
                  <Link to="/solicitudes/$id" params={{ id: r.id }} className="hover:text-accent-foreground hover:underline">
                    {r.codigo}
                  </Link>
                </td>
                {showAsesor && (
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.asesor_nombre}</div>
                    <div className="text-xs text-muted-foreground">{r.asesor_email}</div>
                  </td>
                )}
                <td className="px-4 py-3 font-mono text-xs">{r.numero_pedido}</td>
                <td className="max-w-[200px] truncate px-4 py-3">{r.motivo}</td>
                <td className="whitespace-nowrap px-4 py-3">{fmtDate(r.fecha_solicitada)}</td>
                <td className="px-4 py-3"><StatusBadge estado={r.estado} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{fmtDateTime(r.fecha_atencion)}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{r.comentario_atencion ?? "—"}</td>
                <td className="px-2">
                  <Link to="/solicitudes/$id" params={{ id: r.id }} className="grid size-8 place-items-center rounded-md hover:bg-secondary" aria-label="Ver detalle">
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link to="/solicitudes/$id" params={{ id: r.id }} className="block rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">{r.codigo}</span>
                <StatusBadge estado={r.estado} />
              </div>
              <p className="mt-2 font-medium">Pedido {r.numero_pedido}</p>
              {showAsesor && <p className="text-xs text-muted-foreground">{r.asesor_nombre}</p>}
              <p className="mt-1 text-sm text-muted-foreground">{r.motivo}</p>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Solicitada: {fmtDate(r.fecha_solicitada)}</span>
                <span>Atención: {fmtDate(r.fecha_atencion)}</span>
              </div>
              {r.comentario_atencion && <p className="mt-2 rounded bg-muted p-2 text-xs">{r.comentario_atencion}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
