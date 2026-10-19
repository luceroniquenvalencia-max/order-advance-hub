import { norm, type Fila } from "@/lib/pedidos-csv";
import { asesorDe } from "@/lib/pedidos-xlsx";
import { distritoInfo } from "@/lib/distritos";

export type BaseFila = Fila & { fecha: string; ts: number; dep: string; prov: string };
export const headerKey = (v: unknown) => norm(v).replace(/\s+/g, " ");
export const baseNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const raw = String(v ?? "").replace(/S\//gi, "").replace(/\s/g, "");
  // SKU stores text prices in es-PE (1.201,30), but accepts 1,234.50 too.
  const decimalComma = /,\d{1,2}$/.test(raw) && raw.lastIndexOf(",") > raw.lastIndexOf(".");
  const cleaned = decimalComma ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};
export const skuKey = (v: unknown) => headerKey(v).replace(/\.0+$/, "");

export function parseFecha(v: unknown): { fecha: string; ts: number } {
  // Sheets may return a date serial when requesting unformatted values.
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400_000);
    return parseFecha(`${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`);
  }
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})(?:\s.*)?$/);
  if (!m) return { fecha: s, ts: 0 };
  const day = Number(m[1]), month = Number(m[2]), year = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { fecha: s, ts: 0 };
  return { fecha: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`, ts: date.getTime() };
}

function columns(rows: unknown[][], sheet: string, fields: Record<string, string[]>) {
  const hi = rows.slice(0, 10).findIndex(r => r.some(v => fields['p']?.some(n => headerKey(v) === headerKey(n))));
  if (hi < 0) throw new Error(`La hoja ${sheet} no trae la columna ${fields['p']?.[0] ?? "de identificación"} en las primeras 10 filas.`);
  const h = (rows[hi] ?? []).map(headerKey);
  const c = Object.fromEntries(Object.entries(fields).map(([key, names]) => [key, h.findIndex(v => names.some(n => headerKey(n) === v))]));
  return { hi, c };
}
export function baseColumns(rows: unknown[][]) {
  const result = columns(rows, "BASE", {
    p: ["Nº de pedido", "N° de pedido", "Numero de pedido", "No de pedido"],
    f: ["Fecha documento", "Fecha del pedido", "Fecha pedido"],
    cl: ["Nombre Cliente"], a: ["E-MAIL", "EMAIL", "E MAIL", "Asesor"],
    k: ["Artículo", "SKU"], s: ["Denominación", "DESCRIPCIÓN SKU"],
    q: ["Cantidad de pedido"], d: ["Distrito receptor"],
    prov: ["Provincia receptor", "Provincia"], dep: ["Departamento receptor", "Departamento"],
  });
  const required = { p: "Nº de pedido", f: "Fecha documento (fecha del pedido)", cl: "Nombre Cliente", a: "E-MAIL / Asesor", k: "Artículo / SKU", q: "Cantidad de pedido", d: "Distrito receptor" };
  const missing = Object.entries(required).filter(([k]) => (result.c[k] ?? -1) < 0).map(([, label]) => label);
  if (missing.length) throw new Error("La hoja BASE no trae estas columnas: " + missing.join(", "));
  return result;
}
export function skuColumns(rows: unknown[][]) {
  const result = columns(rows, "SKU", { p: ["Artículo", "SKU"], price: ["Precio Bruto"], volume: ["Volúmen", "Volumen", "M3"] });
  const missing = Object.entries({ p: "Artículo / SKU", price: "Precio Bruto", volume: "Volumen" }).filter(([k]) => (result.c[k] ?? -1) < 0).map(([, label]) => label);
  if (missing.length) throw new Error("La hoja SKU no trae estas columnas: " + missing.join(", "));
  return result;
}
export function buildSkuMap(rows: unknown[][]): Map<string, { p: number; m: number }> {
  const { hi, c } = skuColumns(rows);
  const map = new Map<string, { p: number; m: number }>();
  for (const r of rows.slice(hi + 1)) {
    const k = skuKey(r[c['p'] ?? -1]);
    if (k && !map.has(k)) map.set(k, { p: baseNumber(r[c['price'] ?? -1]), m: baseNumber(r[c['volume'] ?? -1]) });
  }
  return map;
}
export function fromBaseRows(rows: unknown[][], sku: Map<string, { p: number; m: number }>, dias = 45, now = Date.now()): BaseFila[] {
  const { hi, c } = baseColumns(rows);
  const g = (r: unknown[], key: string) => String(r[c[key] ?? -1] ?? "").trim();
  // Peru calendar day, inclusive of today and the preceding 44 days.
  const today = new Date(now - 5 * 3600_000);
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const start = end - (dias - 1) * 86400_000;
  const filas: BaseFila[] = [];
  for (const r of rows.slice(hi + 1)) {
    const p = g(r, 'p').replace(/\.0+$/, "");
    if (!p) continue;
    const { fecha, ts } = parseFecha(r[c['f'] ?? -1]);
    if (!ts || ts < start || ts > end) continue;
    const q = baseNumber(r[c['q'] ?? -1]);
    const code = g(r, 'k'), info = sku.get(skuKey(code));
    const distrito = g(r, 'd');
    const di = distritoInfo(distrito);
    filas.push({ p, c: g(r, 'cl'), d: distrito, s: [code, g(r, 's')].filter(Boolean).join(" · "), a: asesorDe(g(r, 'a')), q,
      v: (info?.p ?? 0) * q, m: (info?.m ?? 0) * q,
      fecha, ts, dep: g(r, 'dep') || di?.dep || "", prov: g(r, 'prov') || di?.prov || "" });
  }
  return filas;
}
