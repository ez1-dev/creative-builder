import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Cog, Lock, AlertCircle } from 'lucide-react';
import { MaquinasDashboard, type ManutencaoMaquina } from '@/components/maquinas/MaquinasDashboard';
import { deriveEffectiveToken } from '@/components/maquinas/MaquinasShareLinksDialog';
import { PublicVisualsProvider } from '@/contexts/PublicVisualsContext';

type State = 'loading' | 'invalid' | 'expired' | 'password' | 'ok' | 'wrong-password';

export default function ManutencaoMaquinasCompartilhadoPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const requiresPassword = params.get('p') === '1';

  const [state, setState] = useState<State>('loading');
  const [password, setPassword] = useState('');
  const [data, setData] = useState<ManutencaoMaquina[]>([]);
  const [hiddenVisuals, setHiddenVisuals] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    if (requiresPassword) setState('password');
    else loadData(token);
  }, [token, requiresPassword]);

  const loadData = async (effectiveToken: string) => {
    setSubmitting(true);
    const [{ data: rows, error }, { data: visuals }] = await Promise.all([
      (supabase.rpc as any)('get_maquinas_via_token', { _token: effectiveToken }),
      (supabase.rpc as any)('get_maquinas_share_link_visuals', { _token: effectiveToken }),
    ]);
    setSubmitting(false);
    if (error) { setState(requiresPassword ? 'wrong-password' : 'invalid'); return; }
    setData((rows as ManutencaoMaquina[]) ?? []);
    setHiddenVisuals((visuals as string[]) ?? []);
    setState('ok');
  };

  const handlePasswordSubmit = async () => {
    if (!password) return;
    const effective = await deriveEffectiveToken(token, password);
    await loadData(effective);
  };

  if (state === 'loading') return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;

  if (state === 'invalid' || state === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-lg font-bold">Link {state === 'expired' ? 'expirado' : 'inválido'}</h1>
            <p className="text-sm text-muted-foreground">
              {state === 'expired' ? 'Este link expirou. Solicite um novo ao administrador.' : 'Este link não existe ou foi revogado.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'password' || state === 'wrong-password') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 space-y-4">
            <div className="text-center space-y-2">
              <Lock className="h-10 w-10 text-primary mx-auto" />
              <h1 className="text-lg font-bold">Manutenção de Máquinas</h1>
              <p className="text-sm text-muted-foreground">Este conteúdo é protegido por senha</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }} className="space-y-3">
              <div>
                <Label htmlFor="senha-maquinas-compartilhado">Senha</Label>
                <Input id="senha-maquinas-compartilhado" name="senha-maquinas-compartilhado" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              </div>
              {state === 'wrong-password' && <p className="text-xs text-destructive">Senha incorreta.</p>}
              <Button type="submit" className="w-full" disabled={submitting || !password}>
                {submitting ? 'Verificando...' : 'Acessar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PublicVisualsProvider hiddenVisuals={hiddenVisuals}>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-7xl 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-none mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
            <Cog className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Manutenção de Máquinas</h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Visualização compartilhada · somente leitura</p>
            </div>
          </div>
        </header>
        <main className="max-w-7xl 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-none mx-auto p-2 sm:p-4">
          <MaquinasDashboard data={data} shareToken={token} readOnly />
        </main>
        <footer className="text-center text-[11px] sm:text-xs text-muted-foreground py-4 px-3">
          EZ ERP IA · Acesso somente leitura
        </footer>
      </div>
    </PublicVisualsProvider>
  );
}
