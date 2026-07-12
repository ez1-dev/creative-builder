import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useModelo } from "@/hooks/contabil/api";

export function ContasBadge({ modeloId }: { modeloId: string }) {
  const { data, isLoading } = useModelo(modeloId, { staleTime: 60_000 });
  if (isLoading || !data) return <Skeleton className="h-5 w-20" />;
  const n = data.contas?.length ?? 0;
  if (n > 0) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        Com contas ({n})
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
      Sem contas
    </Badge>
  );
}
