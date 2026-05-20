import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRelatorio,
  getRelatorio,
  saveColunas,
  saveLayout,
  saveParametros,
  updateRelatorio,
} from '@/lib/relatorios/api';
import type {
  Relatorio,
  RelatorioColuna,
  RelatorioLayout,
  RelatorioParametro,
} from '@/lib/relatorios/types';
import { checkSqlSafe } from '@/lib/relatorios/parseSqlParams';
import { inferTipoFromColuna } from '@/lib/relatorios/format';
import type { ColunaAlinhamento } from '@/lib/relatorios/types';
import { DadosGeraisTab } from './tabs/DadosGeraisTab';
import { SqlTab } from './tabs/SqlTab';
import { ParametersEditor } from './ParametersEditor';
import { ColumnsEditor } from './ColumnsEditor';
import { LayoutEditor } from './LayoutEditor';
import { ReportPreview } from './ReportPreview';
import { ReportExecutionHistory } from './ReportExecutionHistory';

interface Props {
  id: string | null;
  onClose: () => void;
  onSaved: () => void;
}

type ParamDraft = Omit<RelatorioParametro, 'id' | 'relatorio_id'>;
type ColDraft = Omit<RelatorioColuna, 'id' | 'relatorio_id'>;

function emptyLayout(relatorioId: string): RelatorioLayout {
  return {
    relatorio_id: relatorioId,
    tipo: 'tabela_simples',
    titulo: null,
    subtitulo: null,
    mostrar_filtros: true,
    mostrar_totais: true,
    mostrar_data_hora: true,
    mostrar_usuario: true,
    agrupar_por: null,
    config: {},
  };
}

export function ReportEditor({ id, onClose, onSaved }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('geral');
  const [relatorio, setRelatorio] = useState<Partial<Relatorio>>({
    nome: '',
    sql_query: '',
    status: 'rascunho',
    permite_excel: true,
    permite_pdf: true,
    permite_csv: true,
    tipo_fonte: 'sql',
  });
  const [parametros, setParametros] = useState<ParamDraft[]>([]);
  const [colunas, setColunas] = useState<ColDraft[]>([]);
  const [layout, setLayout] = useState<RelatorioLayout>(emptyLayout(''));
  const [lastPreviewCols, setLastPreviewCols] = useState<{ cols: string[]; sample?: Record<string, unknown> } | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const isApiRest = relatorio.tipo_fonte === 'api_rest';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getRelatorio(id)
      .then(({ relatorio: r, parametros: ps, colunas: cs, layout: l }) => {
        if (r) setRelatorio(r);
        setParametros(ps.map(({ id: _, relatorio_id: __, ...rest }) => rest));
        setColunas(cs.map(({ id: _, relatorio_id: __, ...rest }) => rest));
        setLayout(l ?? emptyLayout(id));
      })
      .catch((e) => toast.error(`Erro ao carregar: ${e.message}`))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!relatorio.nome || relatorio.nome.trim() === '') {
      toast.error('Informe o nome do relatório');
      setTab('geral');
      return;
    }
    if (!isApiRest) {
      const safe = checkSqlSafe(relatorio.sql_query ?? '');
      if (safe) {
        toast.error(safe);
        setTab('sql');
        return;
      }
    }
    setSaving(true);
    try {
      let saved: Relatorio;
      if (relatorio.id) {
        saved = await updateRelatorio(relatorio.id, relatorio);
      } else {
        saved = await createRelatorio(relatorio);
      }
      await Promise.all([
        saveParametros(saved.id, parametros),
        saveColunas(saved.id, colunas),
        saveLayout({ ...layout, relatorio_id: saved.id }),
      ]);
      toast.success('Relatório salvo');
      setRelatorio(saved);
      onSaved();
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDetectParams(detected: string[]) {
    const existing = new Map(parametros.map((p) => [p.nome, p]));
    const next: ParamDraft[] = detected.map((nome, idx) => {
      const prev = existing.get(nome);
      return prev ?? {
        nome,
        label: nome.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase()),
        tipo: nome.startsWith('data_') ? 'data' : nome.startsWith('cod_') ? 'numero' : 'texto',
        obrigatorio: true,
        valor_padrao: '',
        ordem: idx,
        sql_lista: '',
      };
    });
    // mantém manuais que não estão na SQL
    const detectedSet = new Set(detected);
    const manuais = parametros.filter((p) => !detectedSet.has(p.nome));
    setParametros([...next, ...manuais.map((p, i) => ({ ...p, ordem: next.length + i }))]);
  }

  function handleColumnsFromPreview(cols: string[], sample?: Record<string, unknown>) {
    setLastPreviewCols({ cols, sample });
    if (colunas.length > 0) return;
    setColunas(cols.map((c, idx) => {
      const tipo = inferTipoFromColuna(c, sample?.[c]);
      return {
        campo: c,
        titulo: c.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase()),
        visivel: true,
        ordem: idx,
        tipo,
        formato: null,
        alinhamento: (tipo === 'numero' || tipo === 'moeda' || tipo === 'percentual' ? 'direita' : 'esquerda') as ColunaAlinhamento,
        largura: null,
        totalizar: false,
        agrupar: false,
      };
    }));
  }

  function handleRestoreColumns() {
    if (!lastPreviewCols) {
      toast.error('Execute a pré-visualização antes de restaurar.');
      return;
    }
    const { cols, sample } = lastPreviewCols;
    setColunas(cols.map((c, idx) => {
      const tipo = inferTipoFromColuna(c, sample?.[c]);
      return {
        campo: c,
        titulo: c.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase()),
        visivel: true,
        ordem: idx,
        tipo,
        formato: null,
        alinhamento: (tipo === 'numero' || tipo === 'moeda' || tipo === 'percentual' ? 'direita' : 'esquerda') as ColunaAlinhamento,
        largura: null,
        totalizar: false,
        agrupar: false,
      };
    }));
  }

  async function handleSaveColumnsOnly() {
    if (!relatorio.id) {
      toast.error('Salve o relatório antes de salvar a configuração de colunas.');
      return;
    }
    await saveColunas(relatorio.id, colunas);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div>
          <h2 className="text-lg font-bold">{relatorio.id ? relatorio.nome : 'Novo relatório'}</h2>
          <div className="flex items-center gap-2 mt-1">
            {relatorio.codigo && <span className="text-xs font-mono text-muted-foreground">{relatorio.codigo}</span>}
            {relatorio.status && (
              <Badge variant={relatorio.status === 'publicado' ? 'default' : relatorio.status === 'inativo' ? 'destructive' : 'secondary'}>
                {relatorio.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
          <Button onClick={onClose} variant="ghost" size="sm"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList>
          <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
          <TabsTrigger value="sql">SQL</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros</TabsTrigger>
          <TabsTrigger value="colunas">Colunas</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
          {relatorio.id && <TabsTrigger value="historico">Histórico</TabsTrigger>}
        </TabsList>
        <div className="flex-1 overflow-auto pt-4">
          <TabsContent value="geral">
            <DadosGeraisTab value={relatorio} onChange={(p) => setRelatorio((r) => ({ ...r, ...p }))} />
          </TabsContent>
          <TabsContent value="sql">
            <SqlTab
              sql={relatorio.sql_query ?? ''}
              onChange={(sql) => setRelatorio((r) => ({ ...r, sql_query: sql }))}
              onDetectParams={handleDetectParams}
              onPreview={() => setTab('preview')}
            />
          </TabsContent>
          <TabsContent value="parametros">
            <ParametersEditor parametros={parametros} onChange={setParametros} />
          </TabsContent>
          <TabsContent value="colunas">
            <ColumnsEditor
              colunas={colunas}
              onChange={setColunas}
              onSave={handleSaveColumnsOnly}
              onRestoreDefault={handleRestoreColumns}
              canSave={!!relatorio.id}
            />
          </TabsContent>
          <TabsContent value="layout">
            <LayoutEditor layout={layout} colunas={colunas} onChange={setLayout} />
          </TabsContent>
          <TabsContent value="preview">
            <ReportPreview
              relatorio={relatorio}
              parametros={parametros}
              colunasConfig={colunas}
              onColumnsDetected={handleColumnsFromPreview}
              onExecucaoGravada={() => setHistoryRefresh((n) => n + 1)}
            />
          </TabsContent>
          {relatorio.id && (
            <TabsContent value="historico">
              <ReportExecutionHistory relatorioId={relatorio.id} refreshKey={historyRefresh} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
