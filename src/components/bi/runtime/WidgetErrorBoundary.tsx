/**
 * Error Boundary local para widgets do BI.
 *
 * Captura erros de renderização de um único widget para que ele não derrube
 * a tela inteira (causa típica: `Cannot convert undefined or null to object`
 * vindo de `Object.keys/values/entries` ou spread sobre objetos nulos).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Identificador do widget — útil para gerar `key` estável e logs. */
  widgetKey?: string;
  /** Título amigável para exibir no fallback. */
  title?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error ?? ''),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[WidgetErrorBoundary]', this.props.widgetKey ?? '', error, info?.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.widgetKey !== this.props.widgetKey && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-full min-h-[120px] flex-col items-start justify-center gap-1 rounded-md border border-dashed border-destructive/50 bg-destructive/5 p-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          {this.props.title ?? 'Componente indisponível'}
        </div>
        <div className="text-muted-foreground">
          Não foi possível carregar este componente do dashboard. Verifique a configuração do widget.
        </div>
        {this.state.message && (
          <code className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {this.state.message}
          </code>
        )}
      </div>
    );
  }
}
