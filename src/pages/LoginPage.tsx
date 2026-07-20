import { forwardRef, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { HubLogo } from '@/components/brand/HubLogo';

// Logotipo Microsoft (4 quadrados) inline
const MicrosoftLogo = forwardRef<SVGSVGElement, { className?: string }>(
  ({ className = 'h-5 w-5' }, ref) => (
    <svg ref={ref} viewBox="0 0 23 23" className={className} aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  )
);
MicrosoftLogo.displayName = 'MicrosoftLogo';

// Aceita apenas caminhos relativos internos (evita open redirect).
function sanitizeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = sanitizeNext(params.get('next'));

  useEffect(() => {
    // Persiste destino pós-login (o fluxo Azure não propaga query string).
    if (next) {
      try { sessionStorage.setItem('post_login_next', next); } catch { /* ignore */ }
    }
  }, [next]);

  useEffect(() => {
    if (isAuthenticated) {
      let target = '/';
      try {
        const saved = sessionStorage.getItem('post_login_next');
        if (saved && saved.startsWith('/') && !saved.startsWith('//')) target = saved;
        sessionStorage.removeItem('post_login_next');
      } catch { /* ignore */ }
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('azure-auth-start', {
        body: { origin: window.location.origin },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('URL de autenticação ausente');
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao iniciar login Microsoft');
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0B1D33] to-[#1565FF]">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <HubLogo variant="horizontal" wordmarkClassName="text-foreground" />
          </div>
          <CardTitle className="text-base font-medium text-muted-foreground">
            Do dado à <span style={{ color: '#22C55E' }}>decisão.</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Acesso restrito a contas corporativas Microsoft
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full gap-2 bg-[#2F2F2F] hover:bg-[#1f1f1f] text-white"
          >
            <MicrosoftLogo />
            {loading ? 'Redirecionando…' : 'Entrar com Microsoft'}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Após o primeiro acesso, aguarde a aprovação de um administrador.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
