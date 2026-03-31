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

        </CardContent>
      </Card>
    </div>
  );
}
