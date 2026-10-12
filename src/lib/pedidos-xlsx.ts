import * as XLSX from "xlsx";
import { norm, type Fila } from "@/lib/pedidos-csv";

const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  if (!s || s === "-") return null;
  const t = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
};

export function fromXLSX(buf: ArrayBuffer): { fecha: string; filas: Fila[] } {
  const wb = XLSX.read(buf, { type: "array" });
  const name = wb.SheetNames.find((n) => norm(n) === "PEDIDOS PROGRAMADOS");
  if (!name) throw new Error('No encuentro la hoja "PEDIDOS PROGRAMADOS" en el archivo.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, defval: "", raw: true });
  const hi = rows.slice(0, 10).findIndex((r) => r.some((c) => norm(c) === "CODIGO DE SEGUIMIENTO"));
  if (hi < 0) throw new Error('No encuentro la columna "Codigo de Seguimiento" en las primeras 10 filas.');
  const h = rows[hi]!.map(norm);
  const ix = (n: string) => h.indexOf(norm(n));
  const c = { p: ix("Codigo de Seguimiento"), k: ix("SKU"), s: ix("DESCRIPCION SKU"), q: ix("PIEZAS"), v: ix("VALORIZADO"), cl: ix("NOMBRE CONSIGNATARIO"), m: ix("VOLUMEN"), d: ix("DISTRITO") };
  const miss = ([["q", "PIEZAS"], ["v", "VALORIZADO"], ["m", "VOLUMEN"], ["d", "DISTRITO"]] as const).filter((x) => c[x[0]] < 0).map((x) => x[1]);
  if (miss.length) throw new Error("No encuentro estas columnas: " + miss.join(", "));
  const g = (r: unknown[], i: number) => (i < 0 ? "" : String(r[i] ?? "").trim());
  const filas: Fila[] = [];
  for (const r of rows.slice(hi + 1)) {
    const p = g(r, c.p).replace(/\.0+$/, "");
    if (!p) continue;
    const q = num(r[c.q]) ?? 0;
    const vu = num(r[c.v]), mu = num(r[c.m]);
    const sku = g(r, c.k), desc = g(r, c.s);
    filas.push({ p, c: g(r, c.cl), d: g(r, c.d), s: [sku, desc].filter(Boolean).join(" · "), a: "", q, v: vu == null ? null : vu * q, m: mu == null ? null : mu * q });
  }
  if (!filas.length) throw new Error("La hoja no tiene pedidos.");
  return { fecha: "", filas };
}
