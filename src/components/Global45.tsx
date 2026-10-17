import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPedidosBase, getEntregas } from "@/lib/pedidos-sheet.functions";
import { group, norm } from "@/lib/pedidos-csv";
import { ASESORES } from "@/lib/pedidos-xlsx";
import { TablaPedidos, f0, f2, type FilaTabla } from "@/components/TablaPedidos";
import { cn } from "@/lib/utils";

const PAGE = 25;
const sel = "rounded-md border bg-background px-3 py-2 text-sm min-w-[140px]";

function clasifica(s: string): string {
  const n = norm(s);
  if (!n) return "Sin estado";
  if (n.includes("ENTREG") && !n.includes("NO")) return "Entregado";
  if (n.includes("RUTA") || n.includes("TRANSITO") || n.includes("CAMINO")) return "En ruta";
  if (n.includes("NO") || n.includes("FALLID") || n.includes("RECHAZ") || n.includes("ANULAD")) return "No entregado";
  return "Sin estado";
}

export function Global45() {
  const fetchBase = useServerFn(getPedidosBase);
  const fetchEntregas = useServerFn(getEntregas);
  const { data, isLoading, error, isFetching, refetch } = useQuery({ queryKey: ["pedidos_base"], queryFn: () => fetchBase(), staleTime: 5 * 60_000 });
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
    const dDesde = desde ? new Date(desde + "T00:00:00").getTime() : 0;
    const dHasta = hasta ? new Date(hasta + "T23:59:59").getTime() : Infinity;
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
  const pageRows = view.rows.slice(cur * PAGE, cur * PAGE + 25);

  // Status solo para los pedidos de la página visible, cacheado 5 min
  const ids = pageRows.map((r) => r.g.p).sort().join(",");
  const { data: entregas } = useQuery({
    queryKey: ["entregas", ids],
    queryFn: () => fetchEntregas({ data: { pedidos: ids ? ids.split(",") : [] } }),
    enabled: !!ids,
    staleTime: 5 * 60_000,
  });
  const statusPorPedido = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entregas?.entregas ?? []) m.set(e.p, clasifica(e.status));
    return m;
  }, [entregas]);

  const rowsConStatus = pageRows.map((r) => ({ ...r, status: statusPorPedido.get(r.g.p) ?? "Sin estado" }));
  const visibles = fstatus ? rowsConStatus.filter((r) => r.status === fstatus) : rowsConStatus;
  const entregados = rowsConStatus.filter((r) => r.status === "Entregado").length;
  const avance = rowsConStatus.length ? (entregados / rowsConStatus.length) * 100 : 0;

  const reset = (fn: (v: string) => void) => (e: { target: { value: string } }) => { fn(e.target.value); setPage(0); };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="text-muted-foreground">
          {data ? "Últimos 45 días · leído " + new Date(data.leido).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "Cargando base…"}
        </div>
        <button disabled={isFetching} onClick={() => refetch()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {isFetching ? "Actualizando…" : "Actualizar desde la hoja"}
        </button>
      </div>

      <section aria-label="Resumen global" className="grid grid-cols-2 overflow-hidden rounded-lg bg-primary text-primary-foreground sm:grid-cols-4">
        {[[f0.format(view.rows.length), "Pedidos"], ["S/ " + f0.format(view.val), "Valorizado"], [f2.format(view.vol), "M3"], [f0.format(avance) + " %", "Avance de entregas"]].map(([v, l], i) => (
          <div key={l} className={cn("p-3 sm:px-5 sm:py-4", i > 0 && "border-l border-primary-foreground/30")}>
            <b className="block font-display text-2xl font-bold leading-tight sm:text-3xl">{v}</b>
            <span className="text-xs font-medium opacity-90 sm:text-sm">{l}</span>
          </div>
        ))}
      </section>
      {view.sinVal > 0 && (
        <p className="mx-0.5 mt-2 text-sm text-status-pending">
          {view.sinVal} de {view.lineas} líneas no tienen precio en la hoja SKU; el total puede estar subestimado.
        </p>
      )}

      <div className="mb-2.5 mt-4 flex flex-wrap gap-2">
        <select aria-label="Asesor" className={sel} value={fa} onChange={reset(setFa)}>
          <option value="">Todos los asesores</option>
          {Object.values(ASESORES).map((a) => <option key={a}>{a}</option>)}
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
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Desde <input type="date" className={cn(sel, "min-w-0")} value={desde} onChange={reset(setDesde)} />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Hasta <input type="date" className={cn(sel, "min-w-0")} value={hasta} onChange={reset(setHasta)} />
        </label>
        <select aria-label="Status" className={sel} value={fstatus} onChange={reset(setFstatus)}>
          <option value="">Todos los status</option>
          {["Entregado", "En ruta", "No entregado", "Sin estado"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="search" aria-label="Buscar" placeholder="Buscar por pedido o cliente" value={q} onChange={reset(setQ)} className={cn(sel, "min-w-[180px] flex-1")} />
        <button onClick={() => setCollapsed(!collapsed)} className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary">
          {collapsed ? "Expandir SKU" : "Contraer SKU"}
        </button>
      </div>

      <TablaPedidos rows={visibles} collapsed={collapsed} isLoading={isLoading} error={error} emptyMsg="Ningún pedido coincide con los filtros." showStatus />

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button disabled={cur === 0} onClick={() => setPage(cur - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-50">Anterior</button>
          <span className="text-muted-foreground">Página {cur + 1} de {pages}</span>
          <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-50">Siguiente</button>
        </div>
      )}
    </div>
  );
}
