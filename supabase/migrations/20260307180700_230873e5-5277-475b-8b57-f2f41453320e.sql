
-- Allow authenticated users to manage products and acompanhamentos
CREATE POLICY "Allow authenticated insert on products"
  ON public.products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on products"
  ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on products"
  ON public.products FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on acompanhamentos"
  ON public.acompanhamentos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on acompanhamentos"
  ON public.acompanhamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on acompanhamentos"
  ON public.acompanhamentos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated update on orders"
  ON public.orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
