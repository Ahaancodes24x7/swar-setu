-- Fix security issues from previous migration

-- Drop the security definer view and recreate as regular table-based query
DROP VIEW IF EXISTS public.principal_dashboard_stats;

-- Fix function search path
CREATE OR REPLACE FUNCTION public.set_parent_linked_at()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND OLD.parent_id IS NULL THEN
    NEW.parent_linked_at = now();
  END IF;
  RETURN NEW;
END;
$$;