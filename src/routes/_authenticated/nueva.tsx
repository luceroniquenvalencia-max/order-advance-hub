import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MOTIVOS, fmtDateTime } from "@/lib/solicitudes";

export const Route = createFileRoute("/_authenticated/nueva")({
  head: () => ({ meta: [{ title: "Nueva solicitud — Adelantos de Envío" }] }),
  component: Nueva,
});

function Nueva() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pedido, setPedido] = useState("");
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0]!);
  const [obs, setObs] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("solicitudes")
      .insert({
        asesor_id: me.id, asesor_nombre: me.nombre, asesor_email: me.email,
        numero_pedido: pedido.trim(), fecha_solicitada: fecha, motivo, observacion_asesor: obs.trim() || null,
      })
      .select("id, codigo")
      .single();
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Solicitud ${data.codigo} registrada`);
    qc.invalidateQueries({ queryKey: ["solicitudes"] });
    navigate({ to: "/solicitudes/$id", params: { id: data.id } });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Formulario</p>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Nueva solicitud de adelanto</h1>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-lg border bg-card p-5 sm:p-6">
        <div className="grid gap-4 rounded-md bg-muted p-4 text-sm sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">ID de solicitud</p><p className="font-mono font-semibold">Automático</p></div>
          <div><p className="text-xs text-muted-foreground">Fecha y hora</p><p className="font-medium">{fmtDateTime(new Date().toISOString())}</p></div>
          <div><p className="text-xs text-muted-foreground">Asesor</p><p className="font-medium">{me?.nombre}</p></div>
          <div><p className="text-xs text-muted-foreground">Correo</p><p className="truncate font-medium">{me?.email}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pedido">Número de pedido *</Label>
            <Input id="pedido" required maxLength={50} value={pedido} onChange={(e) => setPedido(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha solicitada *</Label>
            <Input id="fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo del adelanto *</Label>
          <select id="motivo" className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="obs">Observación</Label>
          <Textarea id="obs" rows={4} maxLength={1000} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">Una vez enviada, la solicitud no podrá modificarse.</p>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto"><Send className="size-4" /> Enviar solicitud</Button>
      </form>
    </div>
  );
}
