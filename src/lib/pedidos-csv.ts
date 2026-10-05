export type Fila = { p: string; c: string; d: string; s: string; a: string; q: number; v: number | null; m: number | null };
export type Grupo = { p: string; c: string; d: string; a: string; ls: Fila[] };

export const norm = (s: unknown) =>
  String(s == null ? "" : s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export function parseCSV(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0];
  const d = ([";", "\t", ","] as const).map((c) => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === d) { row.push(f); f = ""; }
    else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; }
    else if (c !== "\r") f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}

export const money = (v: unknown) => {
  const s = String(v == null ? "" : v).trim().replace(/\./g, "").replace(",", ".");
  if (s === "" || s === "-") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};
export const qty = (v: unknown) => { const n = parseFloat(String(v == null ? "" : v).trim().replace(",", ".")); return isNaN(n) ? 0 : n; };

export function fromCSV(buf: ArrayBuffer): { fecha: string; filas: Fila[] } {
  const rows = parseCSV(new TextDecoder("windows-1252").decode(buf));
  const h = (rows[0] || []).map(norm);
  const ix = (n: string) => h.indexOf(norm(n));
  const c = { p: ix("Codigo de Seguimiento"), c: ix("NombreCliente"), c2: ix("NOMBRE CONSIGNATARIO"), d: ix("DISTRITO"), s: ix("DESCRIPCION SKU"), a: ix("Asesor"), q: ix("PIEZAS"), v: ix("Valorizado"), m: ix("Volumen"), f: ix("FECHA") };
  const miss = ([["p", "Codigo de Seguimiento"], ["d", "DISTRITO"], ["s", "DESCRIPCIÓN SKU"], ["q", "PIEZAS"], ["v", "Valorizado"], ["m", "Volumen"]] as const)
    .filter((x) => c[x[0]] < 0).map((x) => x[1]);
  if (miss.length) throw new Error("No encuentro estas columnas en el archivo: " + miss.join(", "));
  const g = (r: string[], i: number) => (i < 0 ? "" : String(r[i] == null ? "" : r[i]).trim());
  const filas: Fila[] = [];
  let fecha = "";
  for (const r of rows.slice(1)) {
    const p = g(r, c.p).replace(/\.0+$/, "");
    if (!/^\d+$/.test(p)) continue;
    if (!fecha) fecha = g(r, c.f);
    filas.push({ p, c: g(r, c.c) || g(r, c.c2), d: g(r, c.d), s: g(r, c.s), a: g(r, c.a), q: qty(r[c.q]), v: money(r[c.v]), m: money(r[c.m]) });
  }
  if (!filas.length) throw new Error("El archivo no tiene pedidos.");
  return { fecha, filas };
}

export function group(filas: Fila[]): Grupo[] {
  const map = new Map<string, Grupo>();
  for (const l of filas) {
    if (!map.has(l.p)) map.set(l.p, { p: l.p, c: l.c, d: l.d, a: "", ls: [] });
    const g = map.get(l.p)!;
    if (!g.a && l.a) g.a = l.a;
    g.ls.push(l);
  }
  return [...map.values()];
}
