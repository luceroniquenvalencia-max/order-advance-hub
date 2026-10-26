import { useEffect, useState } from "react";

type Paso = { titulo: string; fecha: string; detalle?: string };
type Orden = {
  orden: string; pedidoEl: string; fechaGestion: string; cliente: string;
  identificador: string; direccion: string; transportista: string;
  departamento: string; auxiliar: string; estado: string;
  timeline: Paso[]; fotos: string[];
};

   const URL = "https://script.google.com/macros/s/XXXX/exec";
   const KEY = "luc3ro-visor-2026-xk92";

export default function TrackingModal({ pedido, onClose }: { pedido: string; onClose: () => void }) {
  const [data, setData] = useState<Orden | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCargando(true); setError(""); setData(null);
    fetch(`${URL}?orden=${encodeURIComponent(pedido)}&key=${encodeURIComponent(KEY)}`)
      .then((r) => r.json())
      .then((j) => { if (!vivo) return; j.ok ? setData(j.data) : setError(j.error || "Error"); })
      .catch(() => vivo && setError("No se pudo consultar DispatchTrack"))
      .finally(() => vivo && setCargando(false));
    return () => { vivo = false; };
  }, [pedido]);

  const entregado = data?.estado?.toLowerCase().includes("exitosa") || data?.estado?.toLowerCase().includes("entregado");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Seguimiento de pedido</h2>
            <p className="text-sm text-gray-500">{pedido}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-700" aria-label="Cerrar">✕</button>
        </div>

        {cargando && <p className="py-10 text-center text-sm text-gray-500">Consultando DispatchTrack...</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 border-y border-gray-200 py-4 text-sm sm:grid-cols-4">
              <Dato t="Orden" v={data.orden} />
              <Dato t="Pedido el" v={data.pedidoEl} />
              <Dato t="Fecha de gestión" v={data.fechaGestion} />
              <div>
                <p className="mb-1 text-xs text-gray-500">Estado</p>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entregado ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                  {data.estado || "—"}
                </span>
              </div>
            </div>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Seguimiento</h3>
              <ol className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:justify-between">
                {data.timeline.map((p, i) => (
                  <li key={i} className="flex-1 text-center">
                    <div className="mx-auto mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">{i + 1}</div>
                    <p className="text-xs font-semibold text-indigo-600">{p.titulo}</p>
                    <p className="text-xs text-gray-500">{p.fecha}</p>
                    {p.detalle && <p className="text-xs text-gray-400">{p.detalle}</p>}
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Información</h3>
              <div className="grid gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
                <Dato t="Cliente" v={data.cliente} />
                <Dato t="Identificador de contacto" v={data.identificador} />
                <Dato t="Dirección de destino" v={data.direccion} />
                <Dato t="Transportista" v={data.transportista} />
                <Dato t="Departamento" v={data.departamento} />
                <Dato t="Auxiliar" v={data.auxiliar} />
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Pruebas de entrega</h3>
              {data.fotos.length ? (
                <div className="flex flex-wrap gap-3">
                  {data.fotos.map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt={`Prueba ${i + 1}`} className="h-28 w-40 rounded-lg border border-gray-200 object-cover" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sin fotos de entrega.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <p className="mb-1 text-xs text-gray-500">{t}</p>
      <p className="font-medium text-gray-900">{v || "—"}</p>
    </div>
  );
}
