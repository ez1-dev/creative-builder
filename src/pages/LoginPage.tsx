import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiUrl());
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const isAdmin = localStorage.getItem('erp_is_admin') === 'true';
  const { login, signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/estoque', { replace: true });
  }, [isAuthenticated, navigate]);

  const checkApi = async () => {
    setApiStatus('checking');
    try {
      await fetch(getApiUrl(), { method: 'GET', signal: AbortSignal.timeout(5000), headers: { 'ngrok-skip-browser-warning': 'true' } });
      setApiStatus('online');
    } catch {
      setApiStatus('offline');
    }
  };

  useEffect(() => { checkApi(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !senha.trim()) {
      toast.error('Preencha email e senha');
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, senha);
        toast.success('Cadastro realizado! Verifique seu email para confirmar a conta.', { duration: 6000 });
      } else {
        await login(email, senha);
        toast.success('Login realizado com sucesso!');
        navigate('/estoque');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = () => {
    const trimmed = apiUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    localStorage.setItem('erp_api_url', trimmed);
    setApiUrl(trimmed);
    setShowConfig(false);
    toast.success('URL da API atualizada');
    checkApi();
  };

  const handleResetUrl = () => {
    localStorage.removeItem('erp_api_url');
    const defaultUrl = getApiUrl();
    setApiUrl(defaultUrl);
    setShowConfig(false);
    toast.success('URL restaurada para o padrão');
    checkApi();
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
            {isSignup ? 'Crie sua conta para acessar o sistema' : 'Faça login para acessar o sistema'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pl-9"
                  placeholder="Sua senha"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isSignup ? 'Cadastrando...' : 'Entrando...') : (isSignup ? 'Cadastrar' : 'Entrar')}
            </Button>
          </form>

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            >
              {isSignup ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>

          {isAdmin && (
            <>
              {/* API Status */}
              <div className="mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {apiStatus === 'online' ? (
                    <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-xs font-normal">
                      <Wifi className="h-3 w-3" /> API Online
                    </Badge>
                  ) : apiStatus === 'offline' ? (
                    <Badge variant="destructive" className="gap-1 text-xs font-normal">
                      <WifiOff className="h-3 w-3" /> API Offline
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal">
                      Verificando...
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="h-3 w-3" /> Configurar API
                </button>
              </div>

              <p className="mt-1.5 text-[10px] text-muted-foreground truncate" title={getApiUrl()}>
                {getApiUrl()}
              </p>

              {showConfig && (
                <div className="mt-3 space-y-2 rounded-md border p-3">
                  <Label htmlFor="api-url" className="text-xs">URL da API</Label>
                  <Input
                    id="api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://sua-api.ngrok.io"
                    className="text-xs h-8"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="text-xs h-7 flex-1" onClick={handleSaveUrl}>
                      Salvar
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="text-xs h-7" onClick={handleResetUrl}>
                      Resetar
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
