import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPedidosSheet } from "@/server/pedidos-sheet.functions";
import { useMe } from "@/hooks/useAuth";
import { group, norm } from "@/lib/pedidos-csv";
import { ASESORES } from "@/lib/pedidos-xlsx";
import { ubicar } from "@/lib/distritos";
import { MapaDistritos } from "@/components/MapaDistritos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pedidos-del-dia")({
  head: () => ({
    meta: [
      { title: "Pedidos programados del día" },
      { name: "description", content: "Pedidos programados para despacho hoy, con valorizado y volumen." },
      { property: "og:title", content: "Pedidos programados del día" },
      { property: "og:description", content: "Reporte diario de pedidos programados por asesor y distrito." },
    ],
  }),
  component: Page,
});

const f0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const f2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Page() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const fetchSheet = useServerFn(getPedidosSheet);
  const { data, isLoading, error, isFetching, refetch } = useQuery({ queryKey: ["pedidos_sheet"], queryFn: () => fetchSheet(), staleTime: 5 * 60_000 });
  const [fd, setFd] = useState("");
  const [fa, setFa] = useState("");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => (data ? group(data.filas) : []), [data]);
  const conteo = useMemo(() => { const m = new Map<string, number>(); for (const g of all) if (g.d) m.set(g.d, (m.get(g.d) ?? 0) + 1); return [...m].map(([d, n]) => ({ d, n })); }, [all]);
  const sinUbicar = useMemo(() => conteo.filter((x) => !ubicar(x.d)), [conteo]);
  const distritos = useMemo(() => [...new Set(all.map((g) => g.d).filter(Boolean))].sort(), [all]);

  const view = useMemo(() => {
    const nq = norm(q);
    const gs = all.filter((g) => (!fa || g.a === fa) && (!fd || g.d === fd) && (!nq || norm(g.p + " " + g.c).includes(nq)));
    let val = 0, vol = 0, sinVal = 0, lineas = 0;
    const rows = gs.map((g) => {
      let gv = 0, miss = 0, gq = 0;
      for (const l of g.ls) { lineas++; gq += l.q; if (l.v == null) { miss++; sinVal++; } else gv += l.v; vol += l.m || 0; }
      val += gv;
      return { g, gv, miss, gq };
    });
    return { rows, val, vol, sinVal, lineas };
  }, [all, fa, fd, q]);

  let sub = "Sin reporte cargado";
  if (data) {
    sub = "Reporte cargado";
    sub = "Despacho " + (data.fecha || "—") + " · leído " + new Date(data.leido).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  const sel = "rounded-md border bg-background px-3 py-2 text-sm min-w-[150px]";
  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Pedidos programados</h1>
          <div className="mt-1 text-muted-foreground">{sub}</div>
        </div>
        <button disabled={isFetching} onClick={() => refetch()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {isFetching ? "Actualizando…" : "Actualizar desde la hoja"}
        </button>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-3 overflow-hidden rounded-lg bg-primary text-primary-foreground">
        {[[f0.format(view.rows.length), "Pedidos programados"], ["S/ " + f0.format(view.val), "Valorizado transportado"], [f2.format(view.vol), "M3 transportado"]].map(([v, l], i) => (
          <div key={l} className={cn("p-3 sm:px-5 sm:py-4", i > 0 && "border-l border-primary-foreground/30")}>
            <b className="block font-display text-2xl font-bold leading-tight sm:text-4xl">{v}</b>
            <span className="text-xs font-medium opacity-90 sm:text-sm">{l}</span>
          </div>
        ))}
      </section>
      {view.sinVal > 0 && (
        <p className="mx-0.5 mt-2 text-sm text-status-pending">
          {view.sinVal} de {view.lineas} líneas no traen valorizado en el archivo; el total puede estar subestimado.
        </p>
      )}

      {data && (
        <section aria-label="Mapa de distritos" className="mt-4">
          <MapaDistritos conteo={conteo} activo={fd} onSelect={setFd} />
          {sinUbicar.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Sin ubicar: {sinUbicar.map((x) => `${x.d} (${x.n})`).join(", ")}
            </p>
          )}
        </section>
      )}

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por asesor">
        {["", ...Object.values(ASESORES)].map((a) => (
          <button key={a || "todos"} onClick={() => setFa(a)} aria-pressed={fa === a}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", fa === a ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent")}>
            {a || "Todos"}
          </button>
        ))}
      </div>

      <div className="mb-2.5 mt-4 flex flex-wrap gap-2">
        <select aria-label="Distrito" className={sel} value={fd} onChange={(e) => setFd(e.target.value)}>
          <option value="">Todos los distritos</option>
          {distritos.map((d) => <option key={d}>{d}</option>)}
        </select>
        <input type="search" aria-label="Buscar" placeholder="Buscar por pedido o cliente" value={q} onChange={(e) => setQ(e.target.value)} className={cn(sel, "min-w-[200px] flex-1")} />
        <button onClick={() => setCollapsed(!collapsed)} className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary">
          {collapsed ? "Expandir SKU" : "Contraer SKU"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-primary text-left text-primary-foreground">
              {["Pedido / SKU", "Cliente", "Distrito"].map((h) => <th key={h} className="whitespace-nowrap px-2.5 py-2 font-semibold">{h}</th>)}
              <th className="px-2.5 py-2 text-right font-semibold">Cantidad</th>
              <th className="px-2.5 py-2 text-right font-semibold">Valorizado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-destructive">{error instanceof Error ? error.message : "No pude leer la hoja."}</td></tr>
            ) : !data ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">La hoja no tiene pedidos.</td></tr>
            ) : !view.rows.length ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Ningún pedido coincide con los filtros.</td></tr>
            ) : view.rows.flatMap(({ g, gv, miss, gq }) => {
              const none = miss === g.ls.length;
              return [
                <tr key={g.p} className="border-t bg-accent font-semibold">
                  <td className="px-2.5 py-1.5">{g.p}</td>
                  <td className="px-2.5 py-1.5">{g.c}</td>
                  <td className="px-2.5 py-1.5">{g.d}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{f0.format(gq)}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">
                    {none ? <span className="text-muted-foreground">—</span> : "S/ " + f2.format(gv)}
                    {miss > 0 && <span className="ml-1.5 text-xs font-medium text-status-pending">{none ? "sin valorizar" : "parcial"}</span>}
                  </td>
                </tr>,
                ...(collapsed ? [] : g.ls.map((l, i) => (
                  <tr key={g.p + "-" + i}>
                    <td className="py-1.5 pl-7 pr-2.5 text-muted-foreground">{l.s}</td>
                    <td /><td />
                    <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{f0.format(l.q)}</td>
                    <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{l.v == null ? <span className="text-muted-foreground">—</span> : "S/ " + f2.format(l.v)}</td>
                  </tr>
                ))),
              ];
            })}
          </tbody>
        </table>
      </div>
      <div role="status" aria-live="polite" className={cn("mt-2.5 min-h-5 text-sm", msg?.err && "text-destructive")}>{msg?.t}</div>
    </div>
  );
}
