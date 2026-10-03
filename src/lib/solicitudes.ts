import type { Database } from "@/integrations/supabase/types";

export type Solicitud = Database["public"]["Tables"]["solicitudes"]["Row"];
export type Historial = Database["public"]["Tables"]["solicitud_historial"]["Row"];
export type Estado = Database["public"]["Enums"]["estado_solicitud"];

export const ESTADOS: { value: Estado; label: string }[] = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_VALIDACION", label: "En validación" },
  { value: "ATENDIDO", label: "Atendido" },
  { value: "NO_ATENDIDO", label: "No atendido" },
];

export const MOTIVOS = [
  "Cliente requiere entrega urgente",
  "Evento o fecha especial",
  "Reprogramación por error operativo",
  "Cliente corporativo / prioridad comercial",
  "Otro",
];

export const estadoLabel = (e: Estado) => ESTADOS.find((x) => x.value === e)?.label ?? e;

export function fmtDate(d?: string | null) {
  if (!d) return "—";
  const date = d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
  return date.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-PE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function stats(rows: Solicitud[]) {
  const total = rows.length;
  const pendientes = rows.filter((r) => r.estado === "PENDIENTE" || r.estado === "EN_VALIDACION").length;
  const atendidas = rows.filter((r) => r.estado === "ATENDIDO").length;
  const noAtendidas = rows.filter((r) => r.estado === "NO_ATENDIDO").length;
  const cerradas = atendidas + noAtendidas;
  const pct = total ? Math.round((cerradas / total) * 100) : 0;
  return { total, pendientes, atendidas, noAtendidas, pct };
}
