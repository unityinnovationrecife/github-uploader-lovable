
-- Function to safely increment coupon uses_count
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(coupon_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.coupons
  SET uses_count = uses_count + 1
  WHERE id = coupon_id;
$$;
