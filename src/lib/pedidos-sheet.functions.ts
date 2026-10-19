import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fromRows } from "@/lib/pedidos-xlsx";
import { baseColumns, skuColumns, headerKey, buildSkuMap, fromBaseRows } from "@/lib/pedidos-base";

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
    const lk = process.env['LOVABLE_API_KEY'];
    const ck = process.env['GOOGLE_SHEETS_API_KEY'];
    if (!lk || !ck) throw new Error("La conexión con Google Sheets no está configurada.");
    const headers = { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": ck };
    const read = async (path: string) => {
      const res = await fetch(`${GATEWAY_URL}/spreadsheets/${SHEET_ID}${path}`, { headers, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Sheets BASE/SKU [${res.status}]: ${body}`);
        throw new Error(`No pude leer BASE y SKU (${res.status}): ${body}`);
      }
      return res.json();
    };
    const metadata = await read("?fields=sheets.properties") as { sheets?: { properties: { title: string; gridProperties?: { rowCount: number } } }[] };
    const findSheet = (name: string) => {
      const sheet = metadata.sheets?.find(s => headerKey(s.properties.title) === name)?.properties;
      if (!sheet) throw new Error(`Falta la hoja "${name}" en Google Sheets.`);
      return sheet;
    };
    const base = findSheet("BASE"), sku = findSheet("SKU");
    const range = (title: string, cells: string) => `'${title.replace(/'/g, "''")}'!${cells}`;
    const batch = async (ranges: string[]) => {
      const query = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" });
      for (const r of ranges) query.append("ranges", r);
      const json = await read(`/values:batchGet?${query}`) as { valueRanges?: { values?: unknown[][] }[] };
      return (json.valueRanges ?? []).map(r => r.values ?? []);
    };
    const [baseHead = [], skuHead = []] = await batch([range(base.title, "A1:ZZ10"), range(sku.title, "A1:ZZ10")]);
    baseColumns(baseHead);
    const { hi, c } = skuColumns(skuHead);
    const letter = (index: number) => {
      let n = index + 1, result = "";
      while (n > 0) { result = String.fromCharCode(65 + (n - 1) % 26) + result; n = Math.floor((n - 1) / 26); }
      return result;
    };
    const keys = ['p', 'price', 'volume'];
    const skuRanges = keys.map(k => {
      const col = letter(c[k] ?? 0);
      return range(sku.title, `${col}${hi + 2}:${col}${sku.gridProperties?.rowCount ?? 1}`);
    });
    const [baseRows = [], ...skuCols] = await batch([range(base.title, `A1:AA${base.gridProperties?.rowCount ?? 1000}`), ...skuRanges]);
    const length = Math.max(0, ...skuCols.map(rows => rows.length));
    const skuRows: unknown[][] = [["Artículo", "Precio Bruto", "Volumen"]];
    for (let i = 0; i < length; i++) skuRows.push(skuCols.map(rows => rows[i]?.[0] ?? ""));
    const filas = fromBaseRows(baseRows, buildSkuMap(skuRows));
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
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/status?ids=${encodeURIComponent(data.pedidos.join(","))}`, {
        headers: { Authorization: `Bearer ${key}`, "X-API-Key": key }, signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        console.error(`DispatchTrack [${res.status}]: ${await res.text()}`);
        return { entregas: [] as Entrega[], configurado: true, error: "No se pudieron consultar los estados de DispatchTrack." };
      }
      const json = await res.json() as { items?: Record<string, unknown>[] };
      return { entregas: (json.items ?? []).map(i => ({ p: String(i['Nº de pedido'] ?? i['numero_pedido'] ?? i['id'] ?? ""), status: String(i['Estado'] ?? i['estado'] ?? "Sin status") })).filter(i => data.pedidos.includes(i.p)), configurado: true };
    } catch (error) {
      console.error("DispatchTrack", error);
      return { entregas: [] as Entrega[], configurado: true, error: "No se pudieron consultar los estados de DispatchTrack." };
    }
  });
