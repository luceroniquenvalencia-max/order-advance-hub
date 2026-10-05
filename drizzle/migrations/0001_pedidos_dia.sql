CREATE TABLE public.pedidos_dia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido text NOT NULL,
  cliente text NOT NULL DEFAULT '',
  distrito text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  asesor text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL DEFAULT 0,
  valorizado numeric,
  volumen numeric,
  fecha_despacho text NOT NULL DEFAULT '',
  archivo text,
  orden int NOT NULL DEFAULT 0,
  subido_at timestamptz NOT NULL DEFAULT now(),
  subido_por uuid DEFAULT auth.uid()
);
GRANT SELECT ON public.pedidos_dia TO authenticated;
GRANT ALL ON public.pedidos_dia TO service_role;
ALTER TABLE public.pedidos_dia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_dia read" ON public.pedidos_dia FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.reemplazar_pedidos_dia(_filas jsonb, _archivo text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden cargar el reporte';
  END IF;
  DELETE FROM public.pedidos_dia WHERE true;
  INSERT INTO public.pedidos_dia (pedido, cliente, distrito, sku, asesor, cantidad, valorizado, volumen, fecha_despacho, archivo, orden, subido_por)
  SELECT f->>'p', coalesce(f->>'c',''), coalesce(f->>'d',''), coalesce(f->>'s',''), coalesce(f->>'a',''),
         coalesce((f->>'q')::numeric,0), (f->>'v')::numeric, (f->>'m')::numeric, coalesce(f->>'fecha',''), _archivo, (ord-1)::int, auth.uid()
  FROM jsonb_array_elements(_filas) WITH ORDINALITY AS t(f, ord);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.reemplazar_pedidos_dia(jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reemplazar_pedidos_dia(jsonb, text) TO authenticated;