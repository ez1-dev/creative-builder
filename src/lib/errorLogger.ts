import { supabase } from '@/integrations/supabase/client';

interface ErrorLogEntry {
  module: string;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
}

let _loggingInProgress = false;

export async function logError({ module, message, statusCode, details }: ErrorLogEntry) {
  // Prevent recursive logging if supabase insert itself fails
  if (_loggingInProgress) return;
  _loggingInProgress = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('error_logs' as any).insert({
      user_email: user?.email || null,
      module,
      message: message.substring(0, 1000),
      status_code: statusCode || null,
      details: details || null,
    });
  } catch {
    // Silently fail — we don't want error logging to cause more errors
  } finally {
    _loggingInProgress = false;
  }
}

export function setupGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    logError({
      module: 'global/js-error',
      message: event.message || 'Erro JavaScript desconhecido',
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason?.toString() || 'Promise rejeitada';
    logError({
      module: 'global/unhandled-rejection',
      message: message.substring(0, 1000),
      details: {
        stack: event.reason?.stack?.substring(0, 2000),
      },
    });
  });
}
