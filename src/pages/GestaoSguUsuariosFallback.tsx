import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

interface Props {
  variant?: 'unauthenticated' | 'forbidden';
}

export default function GestaoSguUsuariosFallback({ variant = 'unauthenticated' }: Props) {
  const navigate = useNavigate();
  const isForbidden = variant === 'forbidden';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(215,70%,22%)] to-[hsl(215,60%,35%)] p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            {isForbidden ? (
              <ShieldAlert className="h-7 w-7 text-primary-foreground" />
            ) : (
              <Lock className="h-7 w-7 text-primary-foreground" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isForbidden ? 'Sem permissão de acesso' : 'Acesso restrito'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {isForbidden ? (
              <>
                Sua conta não tem permissão para acessar{' '}
                <strong className="text-foreground">Gestão SGU - Usuários ERP Senior</strong>.
                Solicite ao administrador a liberação em <em>Configurações → Perfis de Acesso</em>.
              </>
            ) : (
              <>
                Você precisa estar autenticado para acessar{' '}
                <strong className="text-foreground">Gestão SGU - Usuários ERP Senior</strong>.
                Faça login com sua conta corporativa Microsoft para continuar.
              </>
            )}
          </p>

          <div className="flex flex-col gap-2">
            {!isForbidden && (
              <Button onClick={() => navigate('/login')} className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Entrar com Microsoft
              </Button>
            )}
            <Button
              variant={isForbidden ? 'default' : 'outline'}
              onClick={() => navigate('/estoque')}
              className="w-full gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
