import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getPedidosSheet } from "@/lib/pedidos-sheet.functions";
import { group, norm } from "@/lib/pedidos-csv";
import { ASESORES } from "@/lib/pedidos-xlsx";
import { ubicar } from "@/lib/distritos";
import { MapaDistritos } from "@/components/MapaDistritos";
import { Kpi } from "@/components/Kpi";
import { TablaPedidos } from "@/components/TablaPedidos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Global45 } from "@/components/Global45";
export const Route = createFileRoute("/_authenticated/pedidos-del-dia")({
  head: () => ({
    meta: [
      { title: "Pedidos programados del día" },
      { name: "description", content: "Pedidos programados para despacho hoy, con valorizado y volumen." },
      { property: "og:title", content: "Pedidos programados del día" },
      { property: "og:description", content: "Reporte diario de pedidos programados por asesor y distrito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { v?: "programados" | "global" } => (s["v"] === "global" ? { v: "global" } : {}),
  component: Page,
});

const f0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const f2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Programados() {
  const fetchSheet = useServerFn(getPedidosSheet);
  const { data, isLoading, error, isFetching, refetch } = useQuery({ queryKey: ["pedidos_sheet"], queryFn: () => fetchSheet(), staleTime: 5 * 60_000 });
  const [fd, setFd] = useState("");
  const [fa, setFa] = useState("");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [showMap, setShowMap] = useState(true);

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

  const sub = data
    ? "Despacho " + (data.fecha || "—") + " · leído " + new Date(data.leido).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "Sin reporte cargado";

  const sel = "rounded-md border bg-background px-3 py-2 text-sm min-w-[150px]";
  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Pedidos programados</h1>
          <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
        </div>
        <Button disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />{isFetching ? "Actualizando…" : "Actualizar"}
        </Button>
      </header>

      <section aria-label="Resumen" className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Pedidos programados" value={f0.format(view.rows.length)} />
        <Kpi label="Valorizado transportado" value={"S/ " + f0.format(view.val)} />
        <Kpi label="M3 transportado" value={f2.format(view.vol)} />
      </section>
      {view.sinVal > 0 && (
        <p className="text-sm text-status-pending">{view.sinVal} de {view.lineas} líneas no traen valorizado en el archivo; el total puede estar subestimado.</p>
      )}

      <section aria-label="Filtros" className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por asesor">
          {["", ...Object.values(ASESORES)].map((a) => (
            <button key={a || "todos"} onClick={() => setFa(a)} aria-pressed={fa === a}
              className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", fa === a ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted")}>
              {a || "Todos"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input type="search" aria-label="Buscar" placeholder="Buscar por pedido o cliente" value={q} onChange={(e) => setQ(e.target.value)} className={cn(sel, "min-w-[200px] flex-1")} />
          <select aria-label="Distrito" className={sel} value={fd} onChange={(e) => setFd(e.target.value)}>
            <option value="">Todos los distritos</option>
            {distritos.map((d) => <option key={d}>{d}</option>)}
          </select>
          <Button variant="outline" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Expandir SKU" : "Contraer SKU"}</Button>
          <Button variant="outline" onClick={() => setShowMap(!showMap)}>{showMap ? "Ocultar mapa" : "Ver mapa"}</Button>
        </div>
      </section>

      {data && showMap && (
        <section aria-label="Mapa de distritos">
          <MapaDistritos conteo={conteo} activo={fd} onSelect={setFd} />
          {sinUbicar.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Sin ubicar: {sinUbicar.map((x) => `${x.d} (${x.n})`).join(", ")}</p>
          )}
        </section>
      )}

      <TablaPedidos rows={view.rows} collapsed={collapsed} isLoading={isLoading} error={error}
        emptyMsg={data ? "Ningún pedido coincide con los filtros." : "La hoja no tiene pedidos."} />
    </div>
  );
}

function Page() {
  const { v } = Route.useSearch();
  return v === "global" ? <Global45 /> : <Programados />;
}
