import { AlertTriangle } from 'lucide-react';

export function AvisoErpBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <p className="text-foreground/80">
        Alterar identificadores pode mudar o comportamento do ERP Senior e pode exigir reinício do ERP/Middleware.
      </p>
    </div>
  );
}
