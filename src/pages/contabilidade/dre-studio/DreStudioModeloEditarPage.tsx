import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useModelo, useUpdateModelo } from "@/hooks/contabil/api";
import { ModeloForm } from "@/components/contabil/ModeloForm";

function EditarModelo() {
  const { id } = useParams() as any;
  const navigate = useNavigate();
  const { data, isLoading } = useModelo(id);
  const update = useUpdateModelo();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Editar Modelo</h1>
        <p className="text-sm text-slate-500">Atualize nome, tipo, descrição e status.</p>
      </div>
      {isLoading || !data ? (
        <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : (
        <ModeloForm
          initial={data.modelo}
          submitLabel="Salvar alterações"
          isSubmitting={update.isPending}
          onCancel={() => navigate(`/contabilidade/dre-studio/modelo/${id}/estrutura`)}
          onSubmit={async (v) => {
            await update.mutateAsync({ id, ...v });
            navigate(`/contabilidade/dre-studio/modelo/${id}/estrutura`);
          }}
        />
      )}
    </div>
  );
}

export default EditarModelo;

