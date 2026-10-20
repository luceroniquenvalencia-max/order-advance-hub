# Rediseño visual del Visor Global de Pedidos

- Reorganizar la navegación lateral y la barra superior para las vistas actuales, con menú compacto en móvil y colapsable en escritorio.
- Rediseñar GLOBAL 45 DÍAS con tarjetas KPI, filtros compactos, distribución visual por status y distrito, y tabla ancha con encabezado fijo y asesor.
- Reutilizar los datos, consultas, filtros, búsqueda, paginación y visor actuales; no cambiar autenticación ni sincronización.
- Validar la compilación y revisar visualmente la vista en escritorio y móvil.

## Detalles técnicos
- Mantener Tabs, componentes shadcn y tokens existentes.
- Los gráficos presentarán los datos de status disponibles en la página actual; la distribución por distrito usará los pedidos ya filtrados.
