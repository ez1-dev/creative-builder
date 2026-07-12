import { useParams } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { MonthPicker } from "@/components/contabil/MonthPicker";
import { ConciliacaoSeniorMensalTable } from "@/components/contabil/ConciliacaoSeniorMensalTable";
import { useConciliacaoSeniorMensal } from "@/hooks/contabil/useConciliacaoSeniorMensal";
import { useModelo, isValidId } from "@/hooks/contabil/api";
import { CODEMP, CODFIL } from "@/lib/contabilConfig";
import { ApiError } from "@/lib/contabilApi";

function defaultAnomes() {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

function ConciliacaoPage() {
  const { id } = useParams() as any;
  const valido = isValidId(id);
  const { data: modeloData } = useModelo(valido ? id : undefined);
  const [anomes, setAnomes] = useState<number>(defaultAnomes());

  const conciliacao = useConciliacaoSeniorMensal(
    { modelo_id: id, anomes, codemp: CODEMP, codfil: CODFIL },
    valido,
  );

  const tipo = modeloData?.modelo?.tipo_modelo;
  if (modeloData && tipo !== "BALANCO") {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Apenas para modelos do tipo Balanço</AlertTitle>
          <AlertDescription>
            A conciliação Senior x Sistema (E650SAL.SALMES) só está disponível para modelos
            de Balanço Patrimonial.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const err = conciliacao.error as ApiError | undefined;
  const endpointAusente = err?.status === 404;
  const linhas = conciliacao.data?.linhas ?? [];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Conciliação Balanço Senior x Sistema (E650SAL.SALMES)
        </h2>
        <p className="text-xs text-slate-500">
          Fonte: <code>public.v_bi_contabil_conciliacao_senior_mensal</code> (via API contábil).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Empresa</span>
          <span className="rounded border bg-slate-50 px-3 py-1.5 text-sm font-mono">{CODEMP}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">Filial</span>
          <span className="rounded border bg-slate-50 px-3 py-1.5 text-sm font-mono">{CODFIL}</span>
        </div>
        <MonthPicker label="Competência" value={anomes} onChange={setAnomes} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => conciliacao.refetch()}
            disabled={conciliacao.isFetching}
          >
            {conciliacao.isFetching ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Recarregar
          </Button>
        </div>
      </div>

      <Alert className="border-sky-300 bg-sky-50">
        <AlertTriangle className="h-4 w-4 text-sky-700" />
        <AlertTitle className="text-sky-900">Sobre esta visão</AlertTitle>
        <AlertDescription className="text-sky-800">
          Esta tela compara duas fontes: <strong>SENIOR</strong> (referência oficial Senior)
          × <strong>Sistema (E650SAL.SALMES)</strong>. A coluna <strong>DIF</strong> vem
          diretamente da view <code>v_bi_contabil_conciliacao_senior_mensal</code>. O modo
          <code className="mx-1">MENSAL_E650SAL</code> não é alterado.
        </AlertDescription>
      </Alert>

      {endpointAusente && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Endpoint não disponível na API contábil</AlertTitle>
          <AlertDescription>
            A API ainda não expõe{" "}
            <code>/api/contabil/modelos/{id}/conciliacao-senior-mensal</code> (404).
            Solicite ao backend a publicação deste endpoint, que deve ler a view{" "}
            <code>public.v_bi_contabil_conciliacao_senior_mensal</code>.
          </AlertDescription>
        </Alert>
      )}

      {!endpointAusente && conciliacao.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar conciliação</AlertTitle>
          <AlertDescription>{(err as Error)?.message}</AlertDescription>
        </Alert>
      )}

      {conciliacao.data && linhas.length === 0 && !conciliacao.isFetching && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Nenhum dado para {anomes}</AlertTitle>
          <AlertDescription>
            A view não retornou linhas para esta competência com os filtros atuais.
          </AlertDescription>
        </Alert>
      )}

      {linhas.length > 0 && (
        <ConciliacaoSeniorMensalTable linhas={linhas} anomes={anomes} />
      )}
    </div>
  );
}

export default ConciliacaoPage;

