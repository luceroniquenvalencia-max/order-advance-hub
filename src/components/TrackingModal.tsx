import { useState } from "react";

// Widget de DispatchTrack (Beetrack) de tu cuenta
const WIDGET_URL = 'https://grupoefe.dispatchtrack.com/widget/4oclZ97JoHo6YzAFfhI37g';

export default function TrackingModal({ pedido, onClose }: { pedido: string; onClose: () => void }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pedido);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* si el navegador no deja copiar, no pasa nada */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Seguimiento de pedido</h2>
            <span className="rounded bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700">{pedido}</span>
            <button onClick={copiar} className="text-xs text-indigo-600 hover:underline">
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-700" aria-label="Cerrar">✕</button>
        </div>

        <iframe
          name="beetrack-widget"
          id="beetrack-widget"
          title="Seguimiento DispatchTrack"
          src={WIDGET_URL}
          frameBorder="0"
          width="100%"
          className="w-full flex-1 rounded-lg"
        />
      </div>
    </div>
  );
}
