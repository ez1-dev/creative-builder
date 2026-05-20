import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Printer, FileDown, Search, Eraser, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useImpressaoOrdemProducao } from '@/hooks/useImpressaoOrdemProducao';
import { useOpcoesImpressaoOp } from '@/hooks/useOpcoesImpressaoOp';
import type { ImpressaoOpFiltros } from '@/lib/producao/opImpressao';
import type { OpcaoOp } from '@/lib/producao/opcoesImpressao';
import { OpPrintSheet } from '@/components/producao/OpPrintSheet';
import { SelectBuscavel, type SelectOption } from '@/components/producao/SelectBuscavel';
import { OpAutocomplete } from '@/components/producao/OpAutocomplete';
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
  const [opLabel, setOpLabel] = useState<string>('');
  const [preview, setPreview] = useState(false);
  const [lastConsulta, setLastConsulta] = useState<ImpressaoOpFiltros | null>(null);
  const { data, loading, error, fetchData, reset, retry } = useImpressaoOrdemProducao();
  const opcoes = useOpcoesImpressaoOp();

  useEffect(() => { void opcoes.reloadBase(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const set = <K extends keyof ImpressaoOpFiltros>(k: K, v: ImpressaoOpFiltros[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));

  const empresaOpts: SelectOption[] = opcoes.empresas.map((e) => ({
    value: String(e.cod_emp),
    label: e.label || `${e.cod_emp}${e.nome_emp ? ' - ' + e.nome_emp : ''}`,
  }));
  const origemOpts: SelectOption[] = opcoes.origens.map((o) => ({
    value: String(o.cod_ori),
    label: o.label || `${o.cod_ori}${o.descricao ? ' - ' + o.descricao : ''}`,
  }));
  const estagioOpts: SelectOption[] = opcoes.estagios.map((e) => ({
    value: String(e.cod_etg),
    label: e.label || `${e.cod_etg}${e.descricao ? ' - ' + e.descricao : ''}`,
  }));
  const creOpts: SelectOption[] = opcoes.centrosRecurso.map((c) => ({
    value: String(c.cod_cre),
    label: c.label || `${c.cod_cre}${c.descricao ? ' - ' + c.descricao : ''}`,
  }));

  const onChangeEmpresa = async (v: string) => {
    setFiltros({ ...EMPTY, listar_componentes: filtros.listar_componentes, listar_desenho: filtros.listar_desenho, cod_emp: v });
    setOpLabel('');
    if (v) { try { await opcoes.reloadByEmpresa(v); } catch (e: any) { toast.error(e?.message || 'Falha ao carregar origens'); } }
    else { void opcoes.reloadBase(); }
  };

  const onChangeOrigem = async (v: string) => {
    setFiltros((f) => ({ ...f, cod_ori: v, num_orp: '', cod_etg: '', cod_cre: '' }));
    setOpLabel('');
    if (filtros.cod_emp && v) {
      try { await opcoes.reloadByOrigem(filtros.cod_emp, v); } catch (e: any) { toast.error(e?.message || 'Falha ao carregar OPs'); }
    }
  };

  const onSelectOp = async (op: OpcaoOp | null) => {
    if (!op) {
      setFiltros((f) => ({ ...f, num_orp: '', cod_etg: '', cod_cre: '' }));
      setOpLabel('');
      return;
    }
    const cod_emp = String(op.cod_emp ?? filtros.cod_emp ?? '');
    const cod_ori = String(op.cod_ori ?? filtros.cod_ori ?? '');
    const num_orp = String(op.num_orp ?? '');
    setFiltros((f) => ({ ...f, cod_emp, cod_ori, num_orp, cod_etg: '', cod_cre: '' }));
    setOpLabel(op.label || `${cod_ori} / ${num_orp}${op.produto ? ' - ' + op.produto : ''}${op.descricao_produto ? ' - ' + op.descricao_produto : ''}`);
    if (cod_emp && cod_ori && num_orp) {
      try { await opcoes.reloadEstagios(cod_emp, cod_ori, num_orp); } catch (e: any) { toast.error(e?.message || 'Falha ao carregar estágios'); }
    }
  };

  const onChangeEstagio = async (v: string) => {
    setFiltros((f) => ({ ...f, cod_etg: v, cod_cre: '' }));
    if (filtros.cod_emp && filtros.cod_ori && filtros.num_orp) {
      try { await opcoes.reloadCres(filtros.cod_emp, filtros.cod_ori, filtros.num_orp, v || undefined); }
      catch (e: any) { toast.error(e?.message || 'Falha ao carregar centros de recurso'); }
    }
  };

  const searchOpsFetcher = useCallback(
    (q: string) => opcoes.searchOps(q, filtros.cod_emp || undefined, filtros.cod_ori || undefined),
    [opcoes.searchOps, filtros.cod_emp, filtros.cod_ori],
  );

  const consultar = async () => {
    if (!filtros.num_orp) {
      toast.info('Informe ou selecione uma Ordem de Produção.');
      return;
    }
    setLastConsulta({ ...filtros });
    await fetchData(filtros);
  };

  const limpar = () => {
    setFiltros(EMPTY);
    setOpLabel('');
    setPreview(false);
    setLastConsulta(null);
    reset();
    void opcoes.reloadBase();
  };

  const imprimir = () => {
    if (!data?.cabecalho) { toast.info('Consulte uma O.P. antes de imprimir.'); return; }
    window.print();
  };

  const gerarPdf = () => {
    if (!data?.cabecalho) { toast.info('Consulte uma O.P. antes de gerar o PDF.'); return; }
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
                <Printer className="mr-1 h-3 w-3" /> Imprimir
              </Button>
              <Button size="sm" variant="outline" onClick={gerarPdf}>
                <FileDown className="mr-1 h-3 w-3" /> Gerar PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={limpar}>
                <Eraser className="mr-1 h-3 w-3" /> Limpar
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
                <SelectBuscavel value={filtros.cod_emp || ''} onChange={onChangeEmpresa} options={empresaOpts} placeholder="Empresa..." />
              </Field>
              <Field label="Origem">
                <SelectBuscavel value={filtros.cod_ori || ''} onChange={onChangeOrigem} options={origemOpts} placeholder="Origem..." disabled={!filtros.cod_emp} />
              </Field>
              <Field label="Nº O.P.">
                <OpAutocomplete
                  value={filtros.num_orp || ''}
                  displayLabel={opLabel}
                  onSelect={onSelectOp}
                  fetcher={searchOpsFetcher}
                />
              </Field>
              <Field label="Listar Componentes">
                <SimpleSN value={filtros.listar_componentes} onChange={(v) => set('listar_componentes', v)} />
              </Field>
              <Field label="Listar Desenho">
                <SimpleSN value={filtros.listar_desenho} onChange={(v) => set('listar_desenho', v)} />
              </Field>
              <Field label="Estágio">
                <SelectBuscavel value={filtros.cod_etg || ''} onChange={onChangeEstagio} options={estagioOpts} placeholder="Estágio..." disabled={!filtros.num_orp} />
              </Field>
              <Field label="Centro de Recurso">
                <SelectBuscavel value={filtros.cod_cre || ''} onChange={(v) => set('cod_cre', v)} options={creOpts} placeholder="Centro..." disabled={!filtros.num_orp} />
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
            Selecione uma Ordem de Produção e clique em Consultar.
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
