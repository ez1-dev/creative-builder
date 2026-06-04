import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | undefined;

    // Tenta detectar a sessão por polling (Supabase consome o token do hash via detectSessionInUrl).
    // Também escuta onAuthStateChange como atalho assim que a sessão for criada.
    const tryRedirect = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return false;
      if (data.session) {
        toast.success('Login realizado com sucesso!');
        navigate('/', { replace: true });
        return true;
      }
      return false;
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        toast.success('Login realizado com sucesso!');
        navigate('/', { replace: true });
      }
    });
    unsub = () => sub.subscription.unsubscribe();

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      const ok = await tryRedirect();
      if (ok || attempts >= 20) {
        clearInterval(interval);
        if (!ok && mounted) {
          toast.error('Não foi possível concluir o login.');
          navigate('/login', { replace: true });
        }
      }
    }, 250);

    return () => {
      mounted = false;
      clearInterval(interval);
      unsub?.();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(215,70%,22%)] to-[hsl(215,60%,35%)] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p>Concluindo login…</p>
      </div>
    </div>
  );
}
