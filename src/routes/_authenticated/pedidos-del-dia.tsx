import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { fromCSV, group, norm, type Fila } from "@/lib/pedidos-csv";
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

type Data = { fecha: string; subido: string | null; filas: Fila[] };

async function loadReporte(): Promise<Data | null> {
  const { data, error } = await supabase.from("pedidos_dia").select("*").order("orden").limit(20000);
  if (error) throw error;
  if (!data?.length) return null;
  return {
    fecha: data[0].fecha_despacho,
    subido: data[0].subido_at,
    filas: data.map((r) => ({
      p: r.pedido, c: r.cliente, d: r.distrito, s: r.sku, a: r.asesor,
      q: Number(r.cantidad), v: r.valorizado == null ? null : Number(r.valorizado), m: r.volumen == null ? null : Number(r.volumen),
    })),
  };
}

function Page() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["pedidos_dia"], queryFn: loadReporte });
  const [fa, setFa] = useState("");
  const [fd, setFd] = useState("");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => (data ? group(data.filas) : []), [data]);
  const asesores = useMemo(() => [...new Set(all.map((g) => g.a).filter(Boolean))].sort(), [all]);
  const distritos = useMemo(() => [...new Set(all.map((g) => g.d).filter(Boolean))].sort(), [all]);

  const view = useMemo(() => {
    const nq = norm(q);
    const gs = all.filter((g) => (!fa || (fa === "__none" ? !g.a : g.a === fa)) && (!fd || g.d === fd) && (!nq || norm(g.p + " " + g.c).includes(nq)));
    let val = 0, vol = 0, sinVal = 0, lineas = 0;
    const rows = gs.map((g) => {
      let gv = 0, miss = 0, gq = 0;
      for (const l of g.ls) { lineas++; gq += l.q; if (l.v == null) { miss++; sinVal++; } else gv += l.v; vol += l.m || 0; }
      val += gv;
      return { g, gv, miss, gq };
    });
    return { rows, val, vol, sinVal, lineas };
  }, [all, fa, fd, q]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const d = fromCSV(await f.arrayBuffer());
      const filas = d.filas.map((l) => ({ ...l, fecha: d.fecha }));
      const { error } = await supabase.rpc("reemplazar_pedidos_dia", { _filas: filas, _archivo: f.name });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["pedidos_dia"] });
      setMsg({ t: "Reporte publicado: los asesores ya lo ven." });
    } catch (err) {
      setMsg({ t: err instanceof Error ? err.message : "No pude leer el archivo.", err: true });
    } finally { setBusy(false); }
  }

  let sub = "Sin reporte cargado";
  if (data) {
    sub = "Despacho " + (data.fecha || "—");
    if (data.subido) sub += " · actualizado " + new Date(data.subido).toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  const sel = "rounded-md border bg-background px-3 py-2 text-sm min-w-[150px]";
  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Pedidos programados</h1>
          <div className="mt-1 text-muted-foreground">{sub}</div>
        </div>
        {me?.isAdmin && (
          <div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
            <button disabled={busy} onClick={() => fileRef.current?.click()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busy ? "Cargando…" : "Cargar reporte del día"}
            </button>
          </div>
        )}
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

      <div className="mb-2.5 mt-4 flex flex-wrap gap-2">
        <select aria-label="Asesor" className={sel} value={fa} onChange={(e) => setFa(e.target.value)}>
          <option value="">Todos los asesores</option>
          <option value="__none">Sin asesor</option>
          {asesores.map((a) => <option key={a}>{a}</option>)}
        </select>
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
              {["Pedido / SKU", "Cliente", "Distrito", "Asesor"].map((h) => <th key={h} className="whitespace-nowrap px-2.5 py-2 font-semibold">{h}</th>)}
              <th className="px-2.5 py-2 text-right font-semibold">Cantidad</th>
              <th className="px-2.5 py-2 text-right font-semibold">Valorizado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-destructive">No pude leer el reporte compartido.</td></tr>
            ) : !data ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Aún no hay un reporte cargado. Vuelve a revisar en unos minutos.</td></tr>
            ) : !view.rows.length ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Ningún pedido coincide con los filtros.</td></tr>
            ) : view.rows.flatMap(({ g, gv, miss, gq }) => {
              const none = miss === g.ls.length;
              return [
                <tr key={g.p} className="border-t bg-accent font-semibold">
                  <td className="px-2.5 py-1.5">{g.p}</td>
                  <td className="px-2.5 py-1.5">{g.c}</td>
                  <td className="px-2.5 py-1.5">{g.d}</td>
                  <td className="px-2.5 py-1.5">{g.a || <span className="text-muted-foreground">Sin asesor</span>}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">{f0.format(gq)}</td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 text-right tabular-nums">
                    {none ? <span className="text-muted-foreground">—</span> : "S/ " + f2.format(gv)}
                    {miss > 0 && <span className="ml-1.5 text-xs font-medium text-status-pending">{none ? "sin valorizar" : "parcial"}</span>}
                  </td>
                </tr>,
                ...(collapsed ? [] : g.ls.map((l, i) => (
                  <tr key={g.p + "-" + i}>
                    <td className="py-1.5 pl-7 pr-2.5 text-muted-foreground">{l.s}</td>
                    <td /><td /><td />
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
