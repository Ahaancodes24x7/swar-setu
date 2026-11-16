-- Migration: Add extended ML pipeline fields to predictions table
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS conformal_intervals JSONB;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS shap_attributions JSONB;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS temperature_used FLOAT;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS mc_samples_used INTEGER DEFAULT 30;
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS prediction_type TEXT DEFAULT 'individual';
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS feature_vector FLOAT[];
