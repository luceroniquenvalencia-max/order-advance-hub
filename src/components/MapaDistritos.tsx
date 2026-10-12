import { useEffect, useRef } from "react";
import { ubicar } from "@/lib/distritos";

type Props = { conteo: { d: string; n: number }[]; activo: string; onSelect: (d: string) => void };

export function MapaDistritos({ conteo, activo, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const layer = useRef<any>(null);
  const cb = useRef(onSelect);
  cb.current = onSelect;

  useEffect(() => {
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (off || !el.current) return;
      if (!map.current) {
        map.current = L.map(el.current).setView([-12.06, -77.03], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 18 }).addTo(map.current);
      }
      layer.current?.remove();
      layer.current = L.layerGroup().addTo(map.current);
      const pts: [number, number][] = [];
      for (const { d, n } of conteo) {
        const ll = ubicar(d);
        if (!ll) continue;
        pts.push(ll);
        const on = d === activo;
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:var(--${on ? "destructive" : "primary"});color:var(--primary-foreground);border-radius:999px;min-width:28px;height:28px;padding:0 6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid var(--background);box-shadow:0 1px 4px rgba(0,0,0,.4)">${n}</div>`,
          iconSize: [28, 28], iconAnchor: [14, 14],
        });
        L.marker(ll, { icon, title: d }).bindTooltip(`${d}: ${n} pedidos`).on("click", () => cb.current(on ? "" : d)).addTo(layer.current);
      }
      if (pts.length) map.current.fitBounds(pts, { padding: [30, 30], maxZoom: 12 });
    })();
    return () => { off = true; };
  }, [conteo, activo]);

  useEffect(() => () => { map.current?.remove(); map.current = null; }, []);

  return <div ref={el} className="h-[340px] w-full rounded-lg border" />;
}
