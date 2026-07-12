import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useModelo, isValidId } from "@/hooks/contabil/api";
import { cn } from "@/lib/utils";

function ModeloLayout() {
  const { id } = useParams() as any;
  const pathname = useLocation().pathname;
  const valido = isValidId(id);
  const { data } = useModelo(valido ? id : undefined);

  if (!valido) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <h2 className="text-lg font-semibold mb-2">Modelo não selecionado</h2>
        <p className="text-sm text-slate-500 mb-4">
          Selecione ou crie um modelo antes de continuar.
        </p>
        <Button asChild>
          <Link to="/contabilidade/dre-studio">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para modelos
          </Link>
        </Button>
      </div>
    );
  }

  const isBalanco = data?.modelo?.tipo_modelo === "BALANCO";
  const base = `/contabilidade/dre-studio/${id}`;
  const tabs = [
    { to: `${base}/estrutura`, label: "Estrutura" },
    { to: `${base}/visualizacao`, label: "Visualização" },
    { to: `${base}/orcamento`, label: "Orçamento" },
    { to: `${base}/conciliacao`, label: "Conciliação" },
    { to: `${base}/editar`, label: "Editar modelo" },
  ] as const;
  void isBalanco;


  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b bg-white px-6 py-4">
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/contabilidade/dre-studio"><ArrowLeft className="h-4 w-4 mr-1" /> Modelos</Link>
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{data?.modelo?.nome ?? "Carregando..."}</h1>
              {data?.modelo && (
                <Badge variant={data.modelo.tipo_modelo === "DRE" ? "default" : "secondary"}>
                  {data.modelo.tipo_modelo}
                </Badge>
              )}
            </div>
            {data?.modelo?.descricao && (
              <p className="text-sm text-slate-500 mt-0.5">{data.modelo.descricao}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-1 border-b -mb-4">
          {tabs.map((t) => {
            const active = pathname.endsWith(t.to.split("/").pop()!);
            return (
              <Link
                key={t.to}
                to={t.to}
                params={{ id }}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
                  active
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
}

export default ModeloLayout;

