import { norm } from "@/lib/pedidos-csv";

export const DISTRITOS: Record<string, [number, number]> = {
  "ANCON": [-11.7739, -77.1757], "ATE": [-12.0261, -76.9186], "BARRANCO": [-12.1491, -77.0214], "BRENA": [-12.0597, -77.0503],
  "CARABAYLLO": [-11.8636, -77.0347], "CERCADO DE LIMA": [-12.0464, -77.0428], "LIMA": [-12.0464, -77.0428], "CHACLACAYO": [-11.9767, -76.7686],
  "CHORRILLOS": [-12.1717, -77.0181], "CIENEGUILLA": [-12.1169, -76.8137], "COMAS": [-11.9306, -77.0533], "EL AGUSTINO": [-12.0436, -77.0011],
  "INDEPENDENCIA": [-11.9917, -77.0539], "JESUS MARIA": [-12.0767, -77.0475], "LA MOLINA": [-12.0867, -76.9361], "LA VICTORIA": [-12.0653, -77.0303],
  "LINCE": [-12.0839, -77.0336], "LOS OLIVOS": [-11.9697, -77.0731], "LURIGANCHO": [-11.9364, -76.6994], "CHOSICA": [-11.9364, -76.6994],
  "LURIN": [-12.2747, -76.8708], "MAGDALENA DEL MAR": [-12.0911, -77.0697], "MIRAFLORES": [-12.1211, -77.0297], "PACHACAMAC": [-12.2297, -76.8597],
  "PUCUSANA": [-12.4817, -76.7972], "PUEBLO LIBRE": [-12.0742, -77.0636], "PUENTE PIEDRA": [-11.8667, -77.0761], "PUNTA HERMOSA": [-12.3347, -76.8236],
  "PUNTA NEGRA": [-12.3664, -76.7947], "RIMAC": [-12.0294, -77.0422], "SAN BARTOLO": [-12.3897, -76.7797], "SAN BORJA": [-12.1008, -76.9997],
  "SAN ISIDRO": [-12.0975, -77.0364], "SAN JUAN DE LURIGANCHO": [-11.9767, -77.0050], "SAN JUAN DE MIRAFLORES": [-12.1572, -76.9708],
  "SAN LUIS": [-12.0761, -76.9939], "SAN MARTIN DE PORRES": [-12.0083, -77.0839], "SAN MIGUEL": [-12.0775, -77.0911], "SANTA ANITA": [-12.0431, -76.9714],
  "SANTA MARIA DEL MAR": [-12.4022, -76.7742], "SANTA ROSA": [-11.7925, -77.1650], "SANTIAGO DE SURCO": [-12.1450, -76.9917], "SURCO": [-12.1450, -76.9917],
  "SURQUILLO": [-12.1117, -77.0156], "VILLA EL SALVADOR": [-12.2133, -76.9364], "VILLA MARIA DEL TRIUNFO": [-12.1597, -76.9289],
  "CALLAO": [-12.0566, -77.1181], "BELLAVISTA": [-12.0617, -77.1083], "CARMEN DE LA LEGUA": [-12.0436, -77.0928], "CARMEN DE LA LEGUA REYNOSO": [-12.0436, -77.0928],
  "LA PERLA": [-12.0697, -77.1186], "LA PUNTA": [-12.0719, -77.1631], "VENTANILLA": [-11.8747, -77.1292], "MI PERU": [-11.8556, -77.1253],
};

const keys = Object.keys(DISTRITOS).sort((a, b) => b.length - a.length);
export function ubicar(nombre: string): [number, number] | null {
  const n = norm(nombre).replace(/\s+/g, " ");
  if (!n) return null;
  if (DISTRITOS[n]) return DISTRITOS[n]!;
  const k = keys.find((k) => k.startsWith(n) && n.length >= 4) ?? keys.find((k) => n.startsWith(k));
  return k ? DISTRITOS[k]! : null;
}
