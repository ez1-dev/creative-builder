import { Component, ReactNode } from 'react';
import { logError } from '@/lib/errorLogger';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Erro desconhecido' };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logError({
      module: 'react/error-boundary',
      message: error?.message ?? 'Erro desconhecido',
      details: { stack: error?.stack, componentStack: info?.componentStack },
    });
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full rounded-lg border border-destructive/40 bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Ocorreu um erro inesperado ao renderizar a tela. Tente recarregar a página. Se o problema
              persistir, abra o console (F12) para ver detalhes técnicos.
            </p>
            {this.state.message && (
              <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto mb-4 text-foreground">
                {this.state.message}
              </pre>
            )}
            <div className="flex gap-2">
              <Button onClick={this.handleReload} variant="default">Recarregar</Button>
              <Button onClick={this.handleReset} variant="outline">Tentar novamente</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
