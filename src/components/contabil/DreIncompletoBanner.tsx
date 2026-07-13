import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export interface DreIncompletoBannerProps {
  motivos: string[];
}

export function DreIncompletoBanner({ motivos }: DreIncompletoBannerProps) {
  if (!motivos.length) return null;
  return (
    <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-200">Dados possivelmente incompletos</AlertTitle>
      <AlertDescription className="text-amber-900/80 dark:text-amber-200/80">
        Atenção: existem competências com dados possivelmente incompletos. Verifique a última
        sincronização antes de validar os resultados.
        <ul className="mt-1 list-disc list-inside text-xs">
          {motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
