import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';

// Logotipo Microsoft (4 quadrados) inline
function MicrosoftLogo({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/estoque', { replace: true });
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(215,70%,22%)] to-[hsl(215,60%,35%)]">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">ERP Sapiens</CardTitle>
          <p className="text-sm text-muted-foreground">
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
