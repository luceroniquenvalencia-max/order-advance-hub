import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPedidosBase, getEntregas } from "@/lib/pedidos-sheet.functions";
import { group, norm } from "@/lib/pedidos-csv";
import { ASESORES } from "@/lib/pedidos-xlsx";
import { TablaPedidos, f0, f2, type FilaTabla } from "@/components/TablaPedidos";
import { Kpi } from "@/components/Kpi";
import { DonutStatus } from "@/components/DonutStatus";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAGE = 25;
const sel = "w-full rounded-md border bg-background px-3 py-2 text-sm";

function clasifica(s: string): string {
  const n = norm(s);
  if (!n) return "Sin status";
  if (n.includes("ENTREG") && !n.includes("NO")) return "Entregado";
  if (n.includes("RUTA") || n.includes("TRANSITO") || n.includes("CAMINO")) return "En ruta";
  if (n.includes("NO") || n.includes("FALLID") || n.includes("RECHAZ") || n.includes("ANULAD")) return "No entregado";
  return "Sin status";
}

export function Global45() {
  const fetchBase = useServerFn(getPedidosBase);
  const fetchEntregas = useServerFn(getEntregas);
  const { data, isLoading, error, isFetching, refetch } = useQuery({ queryKey: ["pedidos_base"], queryFn: () => fetchBase(), staleTime: 5 * 60_000, retry: false });
  const [fa, setFa] = useState("");
  const [fdep, setFdep] = useState("");
  const [fprov, setFprov] = useState("");
  const [fd, setFd] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [fstatus, setFstatus] = useState("");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const [page, setPage] = useState(0);

  const all = useMemo(() => (data ? group(data.filas) : []), [data]);
  const meta = useMemo(() => {
    const m = new Map(data ? data.filas.map((f) => [f.p, f] as const) : []);
    return m;
  }, [data]);

  const deps = useMemo(() => [...new Set((data?.filas ?? []).map((f) => f.dep).filter(Boolean))].sort(), [data]);
  const provs = useMemo(() => [...new Set((data?.filas ?? []).filter((f) => !fdep || f.dep === fdep).map((f) => f.prov).filter(Boolean))].sort(), [data, fdep]);
  const distritos = useMemo(() => [...new Set((data?.filas ?? []).filter((f) => (!fdep || f.dep === fdep) && (!fprov || f.prov === fprov)).map((f) => f.d).filter(Boolean))].sort(), [data, fdep, fprov]);

  const view = useMemo(() => {
    const nq = norm(q);
    const dDesde = desde ? new Date(desde + "T00:00:00Z").getTime() : 0;
    const dHasta = hasta ? new Date(hasta + "T23:59:59Z").getTime() : Infinity;
    const gs = all.filter((g) => {
      const f = meta.get(g.p);
      if (!f) return false;
      return (!fa || g.a === fa) && (!fdep || f.dep === fdep) && (!fprov || f.prov === fprov) && (!fd || g.d === fd)
        && f.ts >= dDesde && f.ts <= dHasta
        && (!nq || norm(g.p + " " + g.c).includes(nq));
    });
    let val = 0, vol = 0, sinVal = 0, lineas = 0;
    const rows: FilaTabla[] = gs.map((g) => {
      let gv = 0, miss = 0, gq = 0;
      for (const l of g.ls) { lineas++; gq += l.q; if (l.v == null) { miss++; sinVal++; } else gv += l.v; vol += l.m || 0; }
      val += gv;
      return { g, gv, miss, gq, extra: meta.get(g.p)?.fecha ?? "" };
    });
    return { rows, val, vol, sinVal, lineas };
  }, [all, meta, fa, fdep, fprov, fd, desde, hasta, q]);

  const pages = Math.max(1, Math.ceil(view.rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const pageRows = view.rows.slice(cur * PAGE, cur * PAGE + PAGE);

  // Status solo para los pedidos de la página visible, cacheado 5 min
  const ids = pageRows.map((r) => r.g.p).sort().join(",");
  const { data: entregas, isFetching: loadingStatus } = useQuery({
    queryKey: ["entregas", ids],
    queryFn: () => fetchEntregas({ data: { pedidos: ids ? ids.split(",") : [] } }),
    enabled: !!ids,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const statusPorPedido = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entregas?.entregas ?? []) m.set(e.p, clasifica(e.status));
    return m;
  }, [entregas]);

  const rowsConStatus = pageRows.map((r) => ({ ...r, status: statusPorPedido.get(r.g.p) ?? "Sin status" }));
  const visibles = fstatus ? rowsConStatus.filter((r) => r.status === fstatus) : rowsConStatus;
  const entregados = rowsConStatus.filter((r) => r.status === "Entregado").length;
  const avance = rowsConStatus.length ? (entregados / rowsConStatus.length) * 100 : 0;

  const conteoStatus = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rowsConStatus) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rowsConStatus]);
  const porDistrito = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of view.rows) if (r.g.d) m.set(r.g.d, (m.get(r.g.d) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [view.rows]);
  const maxD = porDistrito[0]?.[1] ?? 1;
  const statusOk = !loadingStatus && !!entregas?.configurado && !entregas.error;

  const reset = (fn: (v: string) => void) => (e: { target: { value: string } }) => { fn(e.target.value); setPage(0); };

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Global 45 días</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {data ? "Últimos 45 días · leído " + new Date(data.leido).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : error ? "No se pudo leer BASE y SKU." : "Cargando base…"}
          </div>
        </div>
        <Button disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />{isFetching ? "Actualizando…" : "Actualizar"}
        </Button>
      </header>

      <section aria-label="Resumen global" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Pedidos" value={f0.format(view.rows.length)} />
        <Kpi label="Valorizado" value={"S/ " + f0.format(view.val)} />
        <Kpi label="M3" value={f2.format(view.vol)} />
        <Kpi label="Entregados (página actual)" value={statusOk ? f0.format(avance) + " %" : "—"} progress={statusOk ? avance : null} />
      </section>
      {view.sinVal > 0 && (
        <p className="text-sm text-status-pending">{view.sinVal} de {view.lineas} líneas no tienen precio en la hoja SKU; el total puede estar subestimado.</p>
      )}

      <section aria-label="Filtros" className="grid gap-2 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <input type="search" aria-label="Buscar" placeholder="Buscar por pedido o cliente" value={q} onChange={reset(setQ)} className={cn(sel, "sm:col-span-2")} />
        <select aria-label="Asesor" className={sel} value={fa} onChange={reset(setFa)}>
          <option value="">Todos los asesores</option>
          {Object.values(ASESORES).map((a) => <option key={a}>{a}</option>)}
        </select>
        <select aria-label="Status" className={sel} value={fstatus} onChange={reset(setFstatus)}>
          <option value="">Todos los status</option>
          {["Entregado", "En ruta", "No entregado", "Sin status"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Departamento" className={sel} value={fdep} onChange={(e) => { reset(setFdep)(e); setFprov(""); setFd(""); }}>
          <option value="">Departamento</option>
          {deps.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select aria-label="Provincia" className={sel} value={fprov} onChange={(e) => { reset(setFprov)(e); setFd(""); }}>
          <option value="">Provincia</option>
          {provs.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select aria-label="Distrito" className={sel} value={fd} onChange={reset(setFd)}>
          <option value="">Distrito</option>
          {distritos.map((d) => <option key={d}>{d}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" aria-label="Desde" title="Desde" className={sel} value={desde} onChange={reset(setDesde)} />
          <input type="date" aria-label="Hasta" title="Hasta" className={sel} value={hasta} onChange={reset(setHasta)} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Status" className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Pedidos por status <span className="font-normal text-muted-foreground">(página actual)</span></h2>
          <DonutStatus counts={conteoStatus} active={fstatus} onSelect={(s) => { setFstatus(s); setPage(0); }} />
        </section>
        <section aria-label="Distritos" className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Top distritos</h2>
          <ul className="space-y-1.5">
            {porDistrito.map(([d, n]) => (
              <li key={d}>
                <button onClick={() => { setFd(fd === d ? "" : d); setPage(0); }} className="flex w-full items-center gap-2 text-left text-sm">
                  <span className={cn("w-32 shrink-0 truncate", fd === d && "font-semibold")}>{d}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${(n / maxD) * 100}%` }} /></span>
                  <b className="w-8 text-right tabular-nums">{n}</b>
                </button>
              </li>
            ))}
            {!porDistrito.length && <li className="text-sm text-muted-foreground">Sin datos.</li>}
          </ul>
        </section>
      </div>

      {entregas?.error && <p role="status" className="text-sm text-status-pending">{entregas.error} Los pedidos siguen disponibles.</p>}
      {entregas && !entregas.configurado && <p role="status" className="text-sm text-muted-foreground">DispatchTrack no está configurado; los pedidos se muestran sin status.</p>}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Pedidos</h2>
        <Button variant="outline" size="sm" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Expandir SKU" : "Contraer SKU"}</Button>
      </div>
      <TablaPedidos rows={visibles} collapsed={collapsed} isLoading={isLoading} error={error} emptyMsg={all.length ? "Ningún pedido coincide con los filtros." : "No hay pedidos en los últimos 45 días por Fecha documento."} showStatus />

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Anterior</Button>
          <span className="text-muted-foreground">Página {cur + 1} de {pages}</span>
          <Button variant="outline" size="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Siguiente</Button>
        </div>
      )}
    </div>
  );
}
