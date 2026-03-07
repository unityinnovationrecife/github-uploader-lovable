
-- Tabela de produtos
CREATE TABLE public.products (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL,
  image text NOT NULL,
  category text NOT NULL,
  emoji text NOT NULL DEFAULT '',
  has_flavors boolean NOT NULL DEFAULT false,
  available_flavors text[] DEFAULT NULL,
  max_flavors integer DEFAULT NULL,
  allow_duplicate_flavors boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on products"
  ON public.products FOR SELECT USING (true);

-- Tabela de acompanhamentos
CREATE TABLE public.acompanhamentos (
  id serial PRIMARY KEY,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.acompanhamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on acompanhamentos"
  ON public.acompanhamentos FOR SELECT USING (true);

-- Tabela de pedidos
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  address text NOT NULL,
  delivery_zone text NOT NULL,
  delivery_zone_name text NOT NULL,
  payment_method text NOT NULL,
  subtotal numeric NOT NULL,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on orders"
  ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon select on orders"
  ON public.orders FOR SELECT USING (true);

-- Tabela de itens do pedido
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  selected_flavors text[] DEFAULT NULL,
  selected_acomp text[] DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on order_items"
  ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon select on order_items"
  ON public.order_items FOR SELECT USING (true);
