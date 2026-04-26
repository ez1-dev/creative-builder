import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    // Supabase consome automaticamente o token presente no hash via detectSessionInUrl.
    // Aguardamos a sessão ser estabelecida e redirecionamos.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        toast.success('Login realizado com sucesso!');
        navigate('/estoque', { replace: true });
      } else {
        toast.error('Não foi possível concluir o login.');
        navigate('/login', { replace: true });
      }
    }, 400);
    return () => { mounted = false; clearTimeout(t); };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(215,70%,22%)] to-[hsl(215,60%,35%)] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        <p>Concluindo login Microsoft…</p>
      </div>
    </div>
  );
}
