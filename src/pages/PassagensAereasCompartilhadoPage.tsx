import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plane, Lock, AlertCircle } from 'lucide-react';
import { PassagensDashboard, exportPassagensCsv, exportPassagensXlsx, type Passagem } from '@/components/passagens/PassagensDashboard';
import { deriveEffectiveToken } from '@/components/passagens/ShareLinksDialog';

type State = 'loading' | 'invalid' | 'expired' | 'password' | 'ok' | 'wrong-password';

export default function PassagensAereasCompartilhadoPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const requiresPassword = params.get('p') === '1';

  const [state, setState] = useState<State>('loading');
  const [linkName, setLinkName] = useState('Passagens Aéreas');
  const [password, setPassword] = useState('');
  const [data, setData] = useState<Passagem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    if (requiresPassword) {
      setState('password');
    } else {
      // Sem senha: o token na URL já é o token efetivo
      loadData(token);
    }
  }, [token, requiresPassword]);

  const loadData = async (effectiveToken: string) => {
    setSubmitting(true);
    const { data: rows, error } = await supabase.rpc('get_passagens_via_token', {
      _token: effectiveToken,
    });
    setSubmitting(false);
    if (error) {
      // Token inexistente, expirado ou senha incorreta
      if (requiresPassword) setState('wrong-password');
      else setState('invalid');
      return;
    }
    setData((rows as Passagem[]) ?? []);
    setState('ok');
  };

  const handlePasswordSubmit = async () => {
    if (!password) return;
    const effective = await deriveEffectiveToken(token, password);
    await loadData(effective);
  };

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (state === 'invalid' || state === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-lg font-bold">Link {state === 'expired' ? 'expirado' : 'inválido'}</h1>
            <p className="text-sm text-muted-foreground">
              {state === 'expired'
                ? 'Este link de compartilhamento expirou. Solicite um novo ao administrador.'
                : 'Este link não existe ou foi revogado pelo administrador.'}
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
              <h1 className="text-lg font-bold">{linkName}</h1>
              <p className="text-sm text-muted-foreground">Este conteúdo é protegido por senha</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit(); }} className="space-y-3">
              <div>
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
              </div>
              {state === 'wrong-password' && (
                <p className="text-xs text-destructive">Senha incorreta. Tente novamente.</p>
              )}
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Plane className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">Passagens Aéreas</h1>
            <p className="text-xs text-muted-foreground">{linkName} · Visualização compartilhada</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <PassagensDashboard data={data} readOnly onExport={exportPassagensCsv} onExportXlsx={exportPassagensXlsx} />
      </main>
      <footer className="text-center text-xs text-muted-foreground py-4">
        EZ ERP IA · Acesso somente leitura
      </footer>
    </div>
  );
}
