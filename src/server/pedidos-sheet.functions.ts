import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fromRows } from "@/lib/pedidos-xlsx";

const SHEET_ID = "1GzUvo6K8yCuMovPB78nqtWYZy2EljnQH3_mhy5L0IgQ";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

export const getPedidosSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const lk = process.env.LOVABLE_API_KEY;
    const ck = process.env.GOOGLE_SHEETS_API_KEY;
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
