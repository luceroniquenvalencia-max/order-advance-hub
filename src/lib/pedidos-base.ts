import { norm, type Fila } from "@/lib/pedidos-csv";
import { asesorDe } from "@/lib/pedidos-xlsx";
import { distritoInfo } from "@/lib/distritos";

export type BaseFila = Fila & { fecha: string; ts: number; dep: string; prov: string };

const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s || s === "-") return null;
  const t = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
};

// "07/08/2026" -> timestamp (mes/día detectado: la hoja es es_PE, día primero)
export function parseFecha(v: unknown): { fecha: string; ts: number } {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) return { fecha: s, ts: 0 };
  const d = +m[1]!, mo = +m[2]!, y = +(m[3]!.length === 2 ? "20" + m[3]! : m[3]!);
  const ts = new Date(y, mo - 1, d).getTime();
  return { fecha: `${String(d).padStart(2, "0")}/${String(mo).padStart(2, "0")}/${y}`, ts };
}

// Mapa SKU (hoja SKU): Artículo -> { precio, m3 }
export function buildSkuMap(rows: unknown[][]): Map<string, { p: number; m: number }> {
  const map = new Map<string, { p: number; m: number }>();
  for (const r of rows) {
    const k = String(r[0] ?? "").trim();
    if (!k || norm(k) === "ARTICULO") continue;
    const p = num(r[9]) ?? 0; // Precio Bruto (col J)
    const m = num(r[11]) ?? 0; // Volúmen (col L)
    if (!map.has(k)) map.set(k, { p, m });
  }
  return map;
}

export function fromBaseRows(rows: unknown[][], sku: Map<string, { p: number; m: number }>, dias = 45): BaseFila[] {
  const hi = rows.slice(0, 10).findIndex((r) => r.some((c) => norm(c) === "NO DE PEDIDO" || norm(c) === "N DE PEDIDO" || norm(c) === "Nº DE PEDIDO" || norm(c) === "NUMERO DE PEDIDO"));
  const hdrIdx = hi >= 0 ? hi : rows.slice(0, 10).findIndex((r) => r.some((c) => norm(c).includes("PEDIDO")));
  if (hdrIdx < 0) throw new Error('No encuentro la fila de encabezados en la hoja "BASE".');
  const h = rows[hdrIdx]!.map(norm);
  const ix = (n: string) => h.indexOf(norm(n));
  const ixa = (n: string) => { const i = ix(n); if (i >= 0) return i; return h.findIndex((x) => x.includes(norm(n))); };
  const c = {
    p: ixa("Nº de pedido"),
    f: ixa("Fecha documento"),
    cl: ixa("Nombre Cliente"),
    a: ixa("Asesor"),
    k: ixa("Artículo"),
    s: ixa("Denominación"),
    q: ixa("Cantidad de pedido"),
    d: ixa("Distrito receptor"),
    prov: ixa("Provincia receptor"),
    dep: ixa("Departamento receptor"),
  };
  const miss = ([["p", "Nº de pedido"], ["f", "Fecha documento"], ["cl", "Nombre Cliente"], ["a", "Asesor (e-mail)"], ["k", "Artículo (SKU)"], ["q", "Cantidad de pedido (piezas)"], ["d", "Distrito receptor"]] as const)
    .filter((x) => c[x[0]] < 0).map((x) => x[1]);
  if (miss.length) throw new Error("La hoja BASE no trae estas columnas: " + miss.join(", "));
  const g = (r: unknown[], i: number) => (i < 0 ? "" : String(r[i] ?? "").trim());
  const limite = Date.now() - dias * 86400_000;
  const filas: BaseFila[] = [];
  for (const r of rows.slice(hdrIdx + 1)) {
    const p = g(r, c.p).replace(/\.0+$/, "");
    if (!p) continue;
    const { fecha, ts } = parseFecha(r[c.f]);
    if (!ts || ts < limite) continue; // solo últimos 45 días
    const q = num(r[c.q]) ?? 0;
    const skuCode = g(r, c.k);
    const info = sku.get(skuCode);
    const distrito = g(r, c.d);
    let prov = g(r, c.prov), dep = g(r, c.dep);
    if (!prov || !dep) {
      const di = distritoInfo(distrito);
      prov = prov || di?.prov || "";
      dep = dep || di?.dep || "";
    }
    filas.push({
      p, c: g(r, c.cl), d: distrito, s: [skuCode, g(r, c.s)].filter(Boolean).join(" · "),
      a: asesorDe(g(r, c.a)), q,
      v: info ? info.p * q : null,
      m: info ? info.m * q : null,
      fecha, ts, dep, prov,
    });
  }
  if (!filas.length) throw new Error("No hay pedidos en los últimos " + dias + " días.");
  return filas;
}
