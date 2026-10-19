import { describe, expect, test } from "bun:test";
import { baseNumber, buildSkuMap, fromBaseRows, parseFecha } from "./pedidos-base";
import { group } from "./pedidos-csv";

const now = Date.UTC(2026, 9, 19, 12);
const headers = [" Nº   DE PEDIDO ", "Fecha documento", " nombre  cliente ", "Distrito receptor", "Cantidad de pedido", "ARTICULO", "E-MAIL"];
const row = (date: unknown, sku = "ABC", id = "123") => [id, date, "Cliente", "LIMA", "2", sku, "agomezr@lacuracao.com.pe"];
const sku = buildSkuMap([["Volúmen", "Artículo", " Precio   Bruto "], [0.5, "ABC", "S/ 1,234.50"]]);

describe("BASE global rules", () => {
  test("removes currency, commas and whitespace from numeric inputs", () => {
    expect(baseNumber(" S/ 1,234.50 ")).toBe(1234.5);
    expect(baseNumber("bad")).toBe(0);
  });
  test("matches normalized headers and values quantity times SKU price and volume", () => {
    const result = fromBaseRows([headers, row("18/10/2026")], sku, 45, now);
    expect(result[0]?.v).toBe(2469);
    expect(result[0]?.m).toBe(1);
    expect(result[0]?.a).toBe("Andrea Gomez");
  });
  test("missing SKU contributes zero", () => {
    const result = fromBaseRows([headers, row("18/10/2026", "MISSING")], sku, 45, now);
    expect(result[0]?.v).toBe(0);
    expect(result[0]?.m).toBe(0);
  });
  test("includes exactly 45 Peru calendar days, excluding older and future dates", () => {
    const result = fromBaseRows([headers, row("05/09/2026"), row("04/09/2026"), row("19/10/2026"), row("20/10/2026")], sku, 45, now);
    expect(result.map(r => r.fecha)).toEqual(["05/09/2026", "19/10/2026"]);
  });
  test("handles unformatted Google Sheets date serials and dd/mm/yyyy", () => {
    const serial = (Date.UTC(2026, 9, 18) - Date.UTC(1899, 11, 30)) / 86400_000;
    expect(parseFecha(serial)).toEqual(parseFecha("18/10/2026"));
    expect(fromBaseRows([headers, row(serial)], sku, 45, now)).toHaveLength(1);
    expect(parseFecha("31/02/2026").ts).toBe(0);
  });
  test("groups order lines and counts unique orders", () => {
    const result = group(fromBaseRows([headers, row("18/10/2026"), row("18/10/2026"), row("18/10/2026", "ABC", "456")], sku, 45, now));
    expect(result).toHaveLength(2);
    expect(result[0]?.ls.reduce((sum, r) => sum + (r.v ?? 0), 0)).toBe(4938);
  });
  test("lists missing BASE and SKU columns", () => {
    expect(() => fromBaseRows([["Nº de pedido"]], sku, 45, now)).toThrow("Nombre Cliente");
    expect(() => buildSkuMap([["Artículo"]])).toThrow("Precio Bruto, Volumen");
  });
  test("empty date window returns an empty result, not a loading error", () => {
    expect(fromBaseRows([headers, row("07/08/2026")], sku, 45, now)).toEqual([]);
  });
});