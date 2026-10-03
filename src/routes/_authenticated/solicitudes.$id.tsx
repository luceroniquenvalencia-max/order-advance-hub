import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ESTADOS, estadoLabel, fmtDate, fmtDateTime, type Estado, type Historial, type Solicitud } from "@/lib/solicitudes";

export const Route = createFileRoute("/_authenticated/solicitudes/$id")({
  head: () => ({ meta: [{ title: "Detalle de solicitud — Adelantos de Envío" }] }),
  component: Detalle,
});

function toLocalInput(d?: string | null) {
  const dt = d ? new Date(d) : new Date();
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function Detalle() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["solicitud", id],
    queryFn: async () => {
      const [{ data: s, error }, { data: h }] = await Promise.all([
        supabase.from("solicitudes").select("*").eq("id", id).maybeSingle(),
        supabase.from("solicitud_historial").select("*").eq("solicitud_id", id).order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      return { s: s as Solicitud | null, h: (h ?? []) as Historial[] };
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`sol-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "solicitudes", filter: `id=eq.${id}` }, () =>
        qc.invalidateQueries({ queryKey: ["solicitud", id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  if (isLoading) return <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-lg bg-muted" />;
  if (!data?.s) return <p className="text-center text-muted-foreground">Solicitud no encontrada.</p>;
  const s = data.s;

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 font-medium">{value || "—"}</dd></div>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/panel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Volver</Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-muted-foreground">{s.codigo}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Pedido {s.numero_pedido}</h1>
        </div>
        <StatusBadge estado={s.estado} className="px-4 py-2 text-sm" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 font-display font-bold">Solicitud</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Field label="Asesor" value={s.asesor_nombre} />
              <Field label="Correo" value={s.asesor_email} />
              <Field label="Registrada" value={fmtDateTime(s.created_at)} />
              <Field label="Fecha solicitada" value={fmtDate(s.fecha_solicitada)} />
              <Field label="Motivo" value={s.motivo} />
              <div className="sm:col-span-2"><Field label="Observación del asesor" value={s.observacion_asesor} /></div>
            </dl>
          </section>

          {me?.isAdmin ? (
            <AtencionForm s={s} adminEmail={me.email} onSaved={() => qc.invalidateQueries()} />
          ) : (
            <section className="rounded-lg border bg-card p-5">
              <h2 className="mb-4 font-display font-bold">Resultado de la atención</h2>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <Field label="Estado" value={estadoLabel(s.estado)} />
                <Field label="Fecha de atención" value={fmtDateTime(s.fecha_atencion)} />
                <Field label="Atendido por" value={s.atendido_por} />
                <Field label="Fecha programada" value={fmtDate(s.fecha_programada)} />
                <div className="sm:col-span-2"><Field label="Comentario" value={s.comentario_atencion} /></div>
                <div className="sm:col-span-2"><Field label="Observación final" value={s.observacion_final} /></div>
              </dl>
            </section>
          )}
        </div>

        <aside className="rounded-lg border bg-card p-5">
          <h2 className="mb-4 font-display font-bold">Historial de cambios</h2>
          <ol className="relative space-y-5 border-l pl-5">
            {data.h.map((h) => (
              <li key={h.id} className="relative">
                <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-accent ring-4 ring-card" />
                <p className="text-xs text-muted-foreground">{fmtDateTime(h.created_at)}</p>
                <p className="text-sm font-semibold">{h.accion === "CREADA" ? "Solicitud creada" : "Actualización"}</p>
                {h.estado_anterior && h.estado_nuevo && h.estado_anterior !== h.estado_nuevo && (
                  <p className="text-xs">{estadoLabel(h.estado_anterior)} → <b>{estadoLabel(h.estado_nuevo)}</b></p>
                )}
                {h.detalle && <p className="mt-1 rounded bg-muted p-2 text-xs">{h.detalle}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{h.usuario_email}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

function AtencionForm({ s, adminEmail, onSaved }: { s: Solicitud; adminEmail: string; onSaved: () => void }) {
  const [estado, setEstado] = useState<Estado>(s.estado);
  const [fechaAt, setFechaAt] = useState(toLocalInput(s.fecha_atencion));
  const [comentario, setComentario] = useState(s.comentario_atencion ?? "");
  const [fechaProg, setFechaProg] = useState(s.fecha_programada ?? "");
  const [obsFinal, setObsFinal] = useState(s.observacion_final ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("solicitudes").update({
      estado, fecha_atencion: new Date(fechaAt).toISOString(), atendido_por: adminEmail,
      comentario_atencion: comentario.trim() || null, fecha_programada: fechaProg || null,
      observacion_final: obsFinal.trim() || null,
    }).eq("id", s.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitud actualizada");
    onSaved();
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-lg border-2 border-accent bg-card p-5">
      <h2 className="font-display font-bold">Atención del administrador</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ESTADOS.map((e) => (
          <button type="button" key={e.value} onClick={() => setEstado(e.value)}
            className={`rounded-md border p-2 transition-all ${estado === e.value ? "border-primary ring-2 ring-primary/20" : "opacity-60 hover:opacity-100"}`}>
            <StatusBadge estado={e.value} />
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Fecha y hora de atención</Label><Input type="datetime-local" value={fechaAt} onChange={(e) => setFechaAt(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Fecha programada</Label><Input type="date" value={fechaProg} onChange={(e) => setFechaProg(e.target.value)} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Usuario que atiende</Label><Input value={adminEmail} disabled /></div>
      </div>
      <div className="space-y-2"><Label>Comentario de atención</Label><Textarea rows={3} maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)} /></div>
      <div className="space-y-2"><Label>Observación final</Label><Textarea rows={2} maxLength={1000} value={obsFinal} onChange={(e) => setObsFinal(e.target.value)} /></div>
      <Button type="submit" disabled={saving}><Save className="size-4" /> Guardar atención</Button>
    </form>
  );
}
