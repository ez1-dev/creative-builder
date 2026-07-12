import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function DreLayout() {
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );
}

function DreNotFound() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 p-6">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-sm font-medium uppercase tracking-wide text-slate-500">Área Contábil</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-600">
          Não encontramos essa página dentro de DRE/Balanço. Acesse a listagem ou as configurações contábeis pelo menu.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/contabilidade/dre-studio">Voltar para DRE/Balanço</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contabilidade/dre-studio/configuracoes">Configurações Contábeis</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DreLayout;

