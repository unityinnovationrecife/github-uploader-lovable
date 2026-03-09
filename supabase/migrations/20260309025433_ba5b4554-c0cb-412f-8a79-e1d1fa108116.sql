
-- Create store_settings table for generic key/value config
CREATE TABLE public.store_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Public can read (so the WhatsApp button can fetch the number)
CREATE POLICY "Allow public read on store_settings"
  ON public.store_settings FOR SELECT USING (true);

-- Only authenticated (admin) can insert/update/delete
CREATE POLICY "Allow authenticated insert on store_settings"
  ON public.store_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on store_settings"
  ON public.store_settings FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated delete on store_settings"
  ON public.store_settings FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to auto-update updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default whatsapp_number row
INSERT INTO public.store_settings (key, value) VALUES ('whatsapp_number', '5581999999999')
  ON CONFLICT (key) DO NOTHING;
