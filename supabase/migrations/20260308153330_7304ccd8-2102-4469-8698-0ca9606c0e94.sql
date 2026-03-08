
-- Create delivery_zones table
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on delivery_zones"
  ON public.delivery_zones FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on delivery_zones"
  ON public.delivery_zones FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on delivery_zones"
  ON public.delivery_zones FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on delivery_zones"
  ON public.delivery_zones FOR DELETE USING (auth.role() = 'authenticated');

-- Create store_hours table
CREATE TABLE public.store_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_type text NOT NULL UNIQUE,
  label text NOT NULL,
  open_hour integer NOT NULL DEFAULT 19,
  open_minute integer NOT NULL DEFAULT 0,
  close_hour integer NOT NULL DEFAULT 23,
  close_minute integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.store_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on store_hours"
  ON public.store_hours FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on store_hours"
  ON public.store_hours FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on store_hours"
  ON public.store_hours FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on store_hours"
  ON public.store_hours FOR DELETE USING (auth.role() = 'authenticated');

-- Update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_delivery_zones_updated_at
  BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_hours_updated_at
  BEFORE UPDATE ON public.store_hours
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default delivery zones
INSERT INTO public.delivery_zones (key, name, fee, display_order) VALUES
  ('residence', 'Residence Club Dr. Moacyr André Gomes', 0, 1),
  ('dois_unidos', 'Dois Unidos', 3, 2);

-- Seed default store hours
INSERT INTO public.store_hours (day_type, label, open_hour, open_minute, close_hour, close_minute) VALUES
  ('weekday', 'Seg a Sex', 19, 0, 23, 0),
  ('weekend', 'Sáb e Dom', 17, 0, 0, 0);
