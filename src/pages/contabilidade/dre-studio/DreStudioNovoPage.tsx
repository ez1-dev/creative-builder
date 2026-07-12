import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateModelo } from "@/hooks/contabil/api";
import { ModeloForm } from "@/components/contabil/ModeloForm";

function NovoModelo() {
  const navigate = useNavigate();
  const create = useCreateModelo();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/contabilidade/dre-studio"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      </Button>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Novo Modelo</h1>
        <p className="text-sm text-slate-500">Crie um modelo de DRE ou Balanço Patrimonial.</p>
      </div>
      <ModeloForm
        submitLabel="Criar e abrir editor"
        isSubmitting={create.isPending}
        onCancel={() => navigate("/contabilidade/dre-studio")}
        onSubmit={async (v) => {
          const m = await create.mutateAsync(v);
          if (!m?.id) {
            toast.error("Modelo criado sem id — volte e abra pela lista.");
            return;
          }
          navigate(`/contabilidade/dre-studio/modelo/${m.id}/estrutura`);
        }}
      />
    </div>
  );
}

export default NovoModelo;

