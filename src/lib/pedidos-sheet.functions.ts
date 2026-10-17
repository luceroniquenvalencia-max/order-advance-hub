import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fromRows } from "@/lib/pedidos-xlsx";
import { buildSkuMap, fromBaseRows } from "@/lib/pedidos-base";

const gheaders = () => {
  const lk = process.env['LOVABLE_API_KEY'];
  const ck = process.env['GOOGLE_SHEETS_API_KEY'];
  if (!lk || !ck) throw new Error("La conexión con Google Sheets no está configurada.");
  return { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck };
};

const SHEET_ID = "1GzUvo6K8yCuMovPB78nqtWYZy2EljnQH3_mhy5L0IgQ";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

export const getPedidosSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const lk = process.env['LOVABLE_API_KEY'];
    const ck = process.env['GOOGLE_SHEETS_API_KEY'];
    if (!lk || !ck) throw new Error("La conexión con Google Sheets no está configurada.");
    const res = await fetch(`${GATEWAY_URL}/spreadsheets/${SHEET_ID}/values/'PEDIDOS PROGRAMADOS'!A1:BZ?valueRenderOption=UNFORMATTED_VALUE`, {
      headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Sheets [${res.status}]: ${body}`);
      throw new Error(`No pude leer la hoja (${res.status}).`);
    }
    const json = (await res.json()) as { values?: unknown[][] };
    const d = fromRows(json.values ?? []);
    return { ...d, leido: new Date().toISOString() };
  });

export const getPedidosBase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const ranges = ["'BASE '!A1:AA1000", "SKU!A1:A160000", "SKU!J1:J160000", "SKU!L1:L160000"];
    const url = `${GATEWAY_URL}/spreadsheets/${SHEET_ID}/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&` + ranges.map((r) => `ranges=${r}`).join("&");
    const res = await fetch(url, { headers: gheaders() });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Sheets BASE [${res.status}]: ${body}`);
      throw new Error(`No pude leer la hoja BASE (${res.status}).`);
    }
    const json = (await res.json()) as { valueRanges?: { values?: unknown[][] }[] };
    const [base, skuA, skuJ, skuL] = (json.valueRanges ?? []).map((v) => v.values ?? []);
    const skuRows: unknown[][] = (skuA ?? []).map((r, i) => [r?.[0], ...Array(8).fill(""), skuJ?.[i]?.[0], "", skuL?.[i]?.[0]]);
    const filas = fromBaseRows(base ?? [], buildSkuMap(skuRows));
    return { filas, leido: new Date().toISOString() };
  });

export type Entrega = { p: string; status: string };

export const getEntregas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { pedidos: string[] }) => ({ pedidos: (data?.pedidos ?? []).slice(0, 50).map(String) }))
  .handler(async ({ data }) => {
    const key = process.env['DISPATCHTRACK_API_KEY'];
    const baseUrl = process.env['DISPATCHTRACK_API_URL'];
    if (!key || !baseUrl || !data.pedidos.length) return { entregas: [] as Entrega[], configurado: false };
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/status?ids=${data.pedidos.join(",")}`, {
      headers: { Authorization: `Bearer ${key}`, "X-API-Key": key },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`DispatchTrack [${res.status}]: ${body}`);
      throw new Error(`DispatchTrack respondió con error ${res.status}.`);
    }
    const json = (await res.json()) as { items?: { id: string; status: string }[] };
    return { entregas: (json.items ?? []).map((i) => ({ p: String(i.id), status: i.status })), configurado: true };
  });
