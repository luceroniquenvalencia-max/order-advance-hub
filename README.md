# Order Advance Hub

Quiero crear una aplicación web interna para gestionar solicitudes de

adelanto de envío de pedidos para un equipo de asesores.

La aplicación debe conectarse a un Google Sheet existente, que será la

fuente principal de información.

OBJETIVO:

Reemplazar un proceso actual basado en Google Forms, Google Sheets y

reportes manuales mediante capturas de pantalla.

ROLES:

1. ASESOR

- Debe iniciar sesión con su correo.

- Puede registrar una nueva solicitud de adelanto.

- Puede consultar únicamente sus propias solicitudes.

- Puede ver el estado de cada solicitud.

- Puede ver comentarios y resultado de la atención.

- Puede filtrar por estado, pedido, observacion y fecha.

2. ADMIN

- Puede visualizar todas las solicitudes.

- Puede filtrar por asesor, estado, motivo, pedido y fecha.

- Puede modificar el estado.

- Puede agregar comentarios.

- Puede registrar la fecha y hora de atención.

- Puede visualizar indicadores generales.

ESTADOS:

- PENDIENTE

- EN VALIDACIÓN

- ATENDIDO

- NO ATENDIDO

FORMULARIO DE SOLICITUD:

- ID de solicitud automático

- Fecha y hora de solicitud automática

- Nombre del asesor

- Correo del asesor

- Número de pedido

- Fecha solicitada

- Motivo del adelanto

- Observación del asesor

ATENCIÓN ADMIN:

- Estado

- Fecha de atención

- Usuario que atendió

- Comentario de atención

- Fecha programada

- Observación final

REGLAS:

- Cada asesor solamente puede consultar sus propias solicitudes.

- El administrador puede consultar todas.

- Cuando el administrador actualice una solicitud en Google Sheets,

  el asesor debe visualizar el nuevo estado.

- Mostrar claramente los estados mediante indicadores visuales.

- Mantener un historial de cambios.

- No permitir que el asesor modifique el resultado de una solicitud

  después de enviarla.

DASHBOARD DEL ASESOR:

Mostrar:

- Total de solicitudes

- Pendientes

- Atendidas

- No atendidas

Mostrar una tabla con:

ID, pedido, motivo, fecha solicitada, estado, fecha de atención

y comentario.

DASHBOARD ADMIN:

Mostrar:

- Total de solicitudes

- Solicitudes pendientes

- Atendidas

- No atendidas

- Porcentaje de atención

- Solicitudes por asesor

Agregar filtros por:

- asesor

- estado

- fecha

- pedido

DISEÑO:

Crear una interfaz profesional, limpia y moderna para una empresa

de logística/operaciones.

La aplicación debe funcionar correctamente en computadora y celular.

Primero crea la estructura de la aplicación, las pantallas, roles,

tablas y flujo de navegación. Luego conecta Google Sheets.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a89c15a7-a36a-42a6-8ad8-bc32d673712d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
