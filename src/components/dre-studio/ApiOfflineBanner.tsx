import { AlertTriangle, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useHealth } from "@/hooks/contabil/api";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ApiOfflineBanner() {
  const q = useHealth();
  const qc = useQueryClient();

  const offline = !q.isLoading && (q.isError || q.data?.ok === false);
  if (!offline) return null;

  const handleRetry = async () => {
    await q.refetch();
    qc.invalidateQueries();
  };

  return (
    <div className="sticky top-0 z-40 border-b border-red-200 bg-red-50/95 backdrop-blur px-4 py-2">
      <Alert variant="destructive" className="border-0 bg-transparent p-0 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 mt-0.5" />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm">API fora do ar</AlertTitle>
          <AlertDescription className="text-xs">
            Não foi possível conectar ao servidor. Os dados exibidos podem estar desatualizados.
          </AlertDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={q.isFetching}
          className="shrink-0 bg-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${q.isFetching ? "animate-spin" : ""}`} />
          Tentar novamente
        </Button>
      </Alert>
    </div>
  );
}
