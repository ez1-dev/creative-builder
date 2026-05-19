import { useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Printer, FileDown, Search, Eraser, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useImpressaoOrdemProducao } from '@/hooks/useImpressaoOrdemProducao';
import type { ImpressaoOpFiltros } from '@/lib/producao/opImpressao';
import { OpPrintSheet } from '@/components/producao/OpPrintSheet';
import { useAuth } from '@/contexts/AuthContext';

const EMPTY: ImpressaoOpFiltros = {
  cod_emp: '',
  cod_ori: '',
  num_orp: '',
  listar_componentes: 'S',
  listar_desenho: 'N',
  cod_etg: '',
  cod_cre: '',
};

export default function ImpressaoOrdemProducaoPage() {
  const { displayName, erpUser } = useAuth();
  const [filtros, setFiltros] = useState<ImpressaoOpFiltros>(EMPTY);
  const [preview, setPreview] = useState(false);
  const [lastConsulta, setLastConsulta] = useState<ImpressaoOpFiltros | null>(null);
  const { data, loading, error, fetchData, reset, retry } = useImpressaoOrdemProducao();

  const set = <K extends keyof ImpressaoOpFiltros>(k: K, v: ImpressaoOpFiltros[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));

  const consultar = async () => {
    if (!filtros.cod_emp || !filtros.cod_ori || !filtros.num_orp) {
      toast.info('Informe Empresa, Origem e Nº da O.P.');
      return;
    }
    setLastConsulta({ ...filtros });
    await fetchData(filtros);
  };

  const limpar = () => {
    setFiltros(EMPTY);
    setPreview(false);
    setLastConsulta(null);
    reset();
  };

  const imprimir = () => {
    if (!data?.cabecalho) {
      toast.info('Consulte uma O.P. antes de imprimir.');
      return;
    }
    window.print();
  };

  const gerarPdf = () => {
    if (!data?.cabecalho) {
      toast.info('Consulte uma O.P. antes de gerar o PDF.');
      return;
    }
    toast.info('Use "Salvar como PDF" no diálogo de impressão do navegador.');
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-3">
      <div className="no-print">
        <PageHeader
          title="Impressão de Ordem de Produção"
          description="MCAP700.GER - Genius - Ordem de Produção p/ Operações"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={consultar} disabled={loading}>
                {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Search className="mr-1 h-3 w-3" />}
                Consultar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)} disabled={!data?.cabecalho}>
                <Eye className="mr-1 h-3 w-3" />
                {preview ? 'Sair da Visualização' : 'Visualizar Impressão'}
              </Button>
              <Button size="sm" variant="outline" onClick={imprimir}>
                <Printer className="mr-1 h-3 w-3" />
                Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={gerarPdf}>
                <FileDown className="mr-1 h-3 w-3" />
                Gerar PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={limpar}>
                <Eraser className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            </div>
          }
        />
      </div>

      {!preview && (
        <Card className="no-print">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              <Field label="Empresa">
                <Input value={filtros.cod_emp} onChange={(e) => set('cod_emp', e.target.value)} className="h-8" />
              </Field>
              <Field label="Origem">
                <Input value={filtros.cod_ori} onChange={(e) => set('cod_ori', e.target.value)} className="h-8" />
              </Field>
              <Field label="Nº O.P.">
                <Input value={filtros.num_orp} onChange={(e) => set('num_orp', e.target.value)} className="h-8" />
              </Field>
              <Field label="Listar Componentes">
                <SimpleSN value={filtros.listar_componentes} onChange={(v) => set('listar_componentes', v)} />
              </Field>
              <Field label="Listar Desenho">
                <SimpleSN value={filtros.listar_desenho} onChange={(v) => set('listar_desenho', v)} />
              </Field>
              <Field label="Estágio">
                <Input value={filtros.cod_etg} onChange={(e) => set('cod_etg', e.target.value)} className="h-8" />
              </Field>
              <Field label="Centro de Recurso">
                <Input value={filtros.cod_cre} onChange={(e) => set('cod_cre', e.target.value)} className="h-8" />
              </Field>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="no-print">
          <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando ordem de produção...
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card className="no-print">
          <CardContent className="space-y-2 p-6 text-center">
            {/Not Found|404/i.test(error) ? (
              <>
                <p className="text-sm font-medium text-destructive">
                  Endpoint indisponível no backend (<code>/api/producao/ordem-producao/impressao</code>).
                </p>
                <p className="text-xs text-muted-foreground">
                  Solicite ao time de backend implementar conforme <code>docs/backend-impressao-ordem-producao.md</code>.
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <Button size="sm" variant="outline" onClick={retry}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !data?.cabecalho && lastConsulta && (
        <Card className="no-print">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Ordem de produção não encontrada para Empresa {lastConsulta.cod_emp} / Origem {lastConsulta.cod_ori} / OP {lastConsulta.num_orp}.
          </CardContent>
        </Card>
      )}

      {!loading && !error && !data?.cabecalho && !lastConsulta && (
        <Card className="no-print">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Informe os filtros e clique em Consultar.
          </CardContent>
        </Card>
      )}

      {data?.cabecalho && (
        <OpPrintSheet data={data} preview={preview} usuario={displayName ?? erpUser ?? null} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SimpleSN({ value, onChange }: { value: 'S' | 'N' | '' | undefined; onChange: (v: 'S' | 'N') => void }) {
  return (
    <Select value={value || 'N'} onValueChange={(v) => onChange(v as 'S' | 'N')}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="S">Sim</SelectItem>
        <SelectItem value="N">Não</SelectItem>
      </SelectContent>
    </Select>
  );
}
