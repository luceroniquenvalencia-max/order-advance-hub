import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock, CheckCircle2, XCircle, Percent, PlusCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { StatCard } from "@/components/app/StatCard";
import { SolicitudesTable } from "@/components/app/SolicitudesTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ESTADOS, MOTIVOS, stats, type Solicitud } from "@/lib/solicitudes";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({ meta: [{ title: "Panel — Adelantos de Envío" }] }),
  component: Panel,
});

const selectCls = "h-9 rounded-md border border-input bg-card px-3 text-sm";

function Panel() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["solicitudes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("solicitudes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Solicitud[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("solicitudes-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitudes" }, () =>
        qc.invalidateQueries({ queryKey: ["solicitudes"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const [f, setF] = useState({ asesor: "", estado: "", motivo: "", pedido: "", obs: "", desde: "", hasta: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const asesores = useMemo(() => Array.from(new Set(rows.map((r) => r.asesor_email))).sort(), [rows]);
  const filtered = rows.filter((r) =>
    (!f.asesor || r.asesor_email === f.asesor) &&
    (!f.estado || r.estado === f.estado) &&
    (!f.motivo || r.motivo === f.motivo) &&
    (!f.pedido || r.numero_pedido.toLowerCase().includes(f.pedido.toLowerCase())) &&
    (!f.obs || (r.observacion_asesor ?? "").toLowerCase().includes(f.obs.toLowerCase())) &&
    (!f.desde || r.fecha_solicitada >= f.desde) &&
    (!f.hasta || r.fecha_solicitada <= f.hasta),
  );
  const s = stats(rows);
  const isAdmin = !!me?.isAdmin;
  const hasFilters = Object.values(f).some(Boolean);

  const porAsesor = useMemo(() => {
    const m = new Map<string, { nombre: string; total: number; atendidas: number; pend: number }>();
    rows.forEach((r) => {
      const x = m.get(r.asesor_email) ?? { nombre: r.asesor_nombre, total: 0, atendidas: 0, pend: 0 };
      x.total++;
      if (r.estado === "ATENDIDO") x.atendidas++;
      if (r.estado === "PENDIENTE" || r.estado === "EN_VALIDACION") x.pend++;
      m.set(r.asesor_email, x);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [rows]);
  const maxA = Math.max(1, ...porAsesor.map(([, v]) => v.total));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{isAdmin ? "Administración" : "Mis solicitudes"}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Hola, {me?.nombre?.split(" ")[0] ?? ""}</h1>
        </div>
        {!isAdmin && (
          <Button asChild><Link to="/nueva"><PlusCircle className="size-4" /> Nueva solicitud</Link></Button>
        )}
      </header>

      <section className={`grid grid-cols-2 gap-3 ${isAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        <StatCard label="Total" value={s.total} icon={ClipboardList} />
        <StatCard label="Pendientes" value={s.pendientes} icon={Clock} tone="pending" hint="Incluye en validación" />
        <StatCard label="Atendidas" value={s.atendidas} icon={CheckCircle2} tone="done" />
        <StatCard label="No atendidas" value={s.noAtendidas} icon={XCircle} tone="rejected" />
        {isAdmin && <StatCard label="% Atención" value={`${s.pct}%`} icon={Percent} tone="review" hint="Cerradas / total" />}
      </section>

      {isAdmin && porAsesor.length > 0 && (
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 font-display font-bold">Solicitudes por asesor</h2>
          <ul className="space-y-3">
            {porAsesor.map(([email, v]) => (
              <li key={email} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[200px_1fr_auto]">
                <div className="truncate text-sm font-medium" title={email}>{v.nombre}</div>
                <div className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-muted sm:order-none sm:col-span-1">
                  <div className="flex h-full" style={{ width: `${(v.total / maxA) * 100}%` }}>
                    <div className="bg-status-done" style={{ width: `${(v.atendidas / v.total) * 100}%` }} />
                    <div className="bg-status-pending" style={{ width: `${(v.pend / v.total) * 100}%` }} />
                    <div className="flex-1 bg-status-rejected" />
                  </div>
                </div>
                <div className="text-right text-xs tabular-nums text-muted-foreground"><b className="text-foreground">{v.total}</b> · {v.atendidas} atend.</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          {isAdmin && (
            <select className={selectCls} value={f.asesor} onChange={set("asesor")} aria-label="Asesor">
              <option value="">Todos los asesores</option>
              {asesores.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          <select className={selectCls} value={f.estado} onChange={set("estado")} aria-label="Estado">
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          {isAdmin && (
            <select className={selectCls} value={f.motivo} onChange={set("motivo")} aria-label="Motivo">
              <option value="">Todos los motivos</option>
              {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
            </select>
          )}
          <Input className="h-9 w-36" placeholder="N° pedido" value={f.pedido} onChange={set("pedido")} />
          {!isAdmin && <Input className="h-9 w-40" placeholder="Observación" value={f.obs} onChange={set("obs")} />}
          <Input className="h-9 w-40" type="date" value={f.desde} onChange={set("desde")} aria-label="Desde" />
          <Input className="h-9 w-40" type="date" value={f.hasta} onChange={set("hasta")} aria-label="Hasta" />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setF({ asesor: "", estado: "", motivo: "", pedido: "", obs: "", desde: "", hasta: "" })}>
              <X className="size-4" /> Limpiar
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
        </div>
        {isLoading ? <div className="h-40 animate-pulse rounded-lg bg-muted" /> : <SolicitudesTable rows={filtered} showAsesor={isAdmin} />}
      </section>
    </div>
  );
}
