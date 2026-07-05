
-- 1) settings: add branding + defaults
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS establishment_name text DEFAULT 'Santo Antônio',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS service_fee_pct numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS default_theme text NOT NULL DEFAULT 'light';

-- 2) menu_categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;
GRANT ALL ON public.menu_categories TO service_role;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_categories_select_all" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "menu_categories_write_auth" ON public.menu_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER menu_categories_touch BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  image_url text,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_items_select_all" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "menu_items_write_auth" ON public.menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER menu_items_touch BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4) orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  table_number integer NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open | closed | cancelled
  subtotal numeric NOT NULL DEFAULT 0,
  service_fee_pct numeric NOT NULL DEFAULT 10,
  service_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_all" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_insert_all" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update_all" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "orders_delete_auth" ON public.orders FOR DELETE TO authenticated USING (true);
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_table_id_idx ON public.orders(table_id);

-- 5) order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new', -- new | preparing | ready | delivered | cancelled
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select_all" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert_all" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_update_all" ON public.order_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "order_items_delete_all" ON public.order_items FOR DELETE USING (true);
CREATE TRIGGER order_items_touch BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_status_idx ON public.order_items(status);

-- 6) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_categories;
