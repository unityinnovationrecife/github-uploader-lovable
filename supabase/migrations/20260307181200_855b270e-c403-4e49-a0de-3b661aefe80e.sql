
-- Criar bucket público para imagens de produtos
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- RLS: qualquer um pode ver as imagens (público)
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- RLS: apenas autenticados podem fazer upload
CREATE POLICY "Authenticated upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- RLS: apenas autenticados podem deletar
CREATE POLICY "Authenticated delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

-- RLS: apenas autenticados podem atualizar
CREATE POLICY "Authenticated update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');
