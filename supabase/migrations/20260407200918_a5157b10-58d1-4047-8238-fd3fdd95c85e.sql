
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_email TEXT,
  module TEXT NOT NULL,
  message TEXT NOT NULL,
  status_code INTEGER,
  details JSONB
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
CREATE POLICY "Admins can read error_logs"
ON public.error_logs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Admins can delete logs
CREATE POLICY "Admins can delete error_logs"
ON public.error_logs
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Any authenticated user can insert logs (the app writes errors)
CREATE POLICY "Authenticated users can insert error_logs"
ON public.error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Index for faster queries by date
CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
