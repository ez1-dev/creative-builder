import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Database, Server, ShieldCheck, AlertTriangle, CheckCircle2, Info, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  buscarTabelasCandidatasErp,
  buscarColunasCandidatasErp,
  sincronizarDeparaDreErp,
  validarDeparaSupabase,
  type TabelaCandidata,
  type ColunaCandidata,
  type SyncDeparaResponse,
  type ValidacaoSupabase,
} from '@/lib/bi/dreSincronizacaoApi';

const LS_KEY = 'dre-depara-ultima-sync';

interface UltimaSync {
  quando: string;
  total: number;
  origem: string;
  destino: string;
}

function lerUltimaSync(): UltimaSync | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return null;
    return p as UltimaSync;
  } catch {
    return null;
  }
}

function gravarUltimaSync(s: UltimaSync) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export default function DreSincronizacaoDeparaPage() {
  const navigate = useNavigate();

  const [tabelas, setTabelas] = useState<TabelaCandidata[]>([]);
  const [colunas, setColunas] = useState<ColunaCandidata[]>([]);
  const [loadingTabelas, setLoadingTabelas] = useState(false);
  const [loadingColunas, setLoadingColunas] = useState(false);

  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState<SyncDeparaResponse | null>(null);
  const [erroSync, setErroSync] = useState<string | null>(null);

  const [validacao, setValidacao] = useState<ValidacaoSupabase | null>(null);
  const [loadingValidacao, setLoadingValidacao] = useState(false);

  const [ultima, setUltima] = useState<UltimaSync | null>(lerUltimaSync());

  const onBuscarTabelas = async () => {
    setLoadingTabelas(true);
    try {
      const r = await buscarTabelasCandidatasErp();
      setTabelas(Array.isArray(r) ? r : []);
    } catch (e: any) {
      toast.error(`Falha ao buscar tabelas: ${e?.message ?? e}`);
      setTabelas([]);
    } finally {
      setLoadingTabelas(false);
    }
  };

  const onBuscarColunas = async () => {
    setLoadingColunas(true);
    try {
      const r = await buscarColunasCandidatasErp();
      setColunas(Array.isArray(r) ? r : []);
    } catch (e: any) {
      toast.error(`Falha ao buscar colunas: ${e?.message ?? e}`);
      setColunas([]);
    } finally {
      setLoadingColunas(false);
    }
  };

  const onValidar = async () => {
    setLoadingValidacao(true);
    try {
      const r = await validarDeparaSupabase();
      setValidacao(r);
    } catch (e: any) {
      toast.error(`Falha ao validar: ${e?.message ?? e}`);
    } finally {
      setLoadingValidacao(false);
    }
  };

  const onSincronizar = async () => {
    setSincronizando(true);
    setErroSync(null);
    setResultadoSync(null);
    try {
      const r = await sincronizarDeparaDreErp();
      setResultadoSync(r);
      const u: UltimaSync = {
        quando: new Date().toISOString(),
        total: r.total_registros,
        origem: r.origem,
        destino: r.destino,
      };
      gravarUltimaSync(u);
      setUltima(u);
      toast.success(r.message || 'Sincronização concluída.');
      // Auto-validar Supabase
      void onValidar();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setErroSync(msg);
      toast.error('Erro ao sincronizar De/Para DRE.');
    } finally {
      setSincronizando(false);
    }
  };

  const tabelasRows = Array.isArray(tabelas) ? tabelas : [];
  const colunasRows = Array.isArray(colunas) ? colunas : [];
  const porMascara = Array.isArray(validacao?.porMascara) ? validacao!.porMascara : [];
  const ultimosRegistros = Array.isArray(validacao?.ultimos) ? validacao!.ultimos : [];

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Sincronização De/Para DRE"
        description="Sincroniza a tabela oficial de De/Para da DRE do ERP Senior para o Lovable Cloud."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/bi/contabilidade/dre">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />Voltar à DRE
            </Link>
          </Button>
        }
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm">Importante</AlertTitle>
        <AlertDescription className="text-xs">
          Esta sincronização usa o <strong>ERP Senior</strong> como fonte oficial.
          O UpQuery não é utilizado como origem de dados, apenas como referência de conferência.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1 — Fonte oficial */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" /> Fonte oficial
            </CardTitle>
            <CardDescription className="text-xs">
              Origem e destino da sincronização.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fonte</span>
              <span className="font-mono">ERP Senior / SQL Server</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destino</span>
              <span className="font-mono">Lovable Cloud / bi_dre_depara_conta_ccu</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              {ultima ? (
                <Badge variant="default" className="text-[10px]">Sincronizado</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Aguardando sincronização</Badge>
              )}
            </div>
            {ultima && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última sincronização</span>
                  <span>{new Date(ultima.quando).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total sincronizado</span>
                  <span className="font-mono">{ultima.total}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 3 — Sincronização (lado direito, par com fonte) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Sincronização De/Para DRE
            </CardTitle>
            <CardDescription className="text-xs">
              Copia o De/Para oficial do ERP Senior para o Lovable Cloud.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onSincronizar} disabled={sincronizando} className="w-full">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${sincronizando ? 'animate-spin' : ''}`} />
              {sincronizando ? 'Sincronizando...' : 'Sincronizar De/Para DRE do ERP'}
            </Button>

            {sincronizando && (
              <p className="text-xs text-muted-foreground">
                Sincronizando dados do ERP Senior para o Lovable Cloud...
              </p>
            )}

            {resultadoSync && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle className="text-sm">Sincronização concluída</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <div>{resultadoSync.message}</div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Origem</span><span className="font-mono">{resultadoSync.origem}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Destino</span><span className="font-mono">{resultadoSync.destino}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-mono">{resultadoSync.total_registros}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Executado em</span><span>{new Date().toLocaleString('pt-BR')}</span></div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" onClick={() => navigate('/bi/contabilidade/dre')}>
                      <RotateCw className="h-3.5 w-3.5 mr-1" /> Recarregar DRE
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {erroSync && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">Erro ao sincronizar De/Para DRE</AlertTitle>
                <AlertDescription className="text-xs space-y-2">
                  <div>
                    Verifique se a API está online e se a tabela oficial do ERP foi configurada.
                  </div>
                  <details className="text-[11px]">
                    <summary className="cursor-pointer text-muted-foreground">Detalhe técnico</summary>
                    <pre className="mt-1 whitespace-pre-wrap break-all bg-muted p-2 rounded">{erroSync}</pre>
                  </details>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card 2 — Diagnóstico ERP */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" /> Diagnóstico ERP
          </CardTitle>
          <CardDescription className="text-xs">
            Lista tabelas e colunas candidatas que o ERP Senior expõe para o De/Para da DRE.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onBuscarTabelas} disabled={loadingTabelas}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingTabelas ? 'animate-spin' : ''}`} />
              Buscar tabelas candidatas no ERP
            </Button>
            <Button size="sm" variant="outline" onClick={onBuscarColunas} disabled={loadingColunas}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingColunas ? 'animate-spin' : ''}`} />
              Buscar colunas candidatas no ERP
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium mb-1">Tabelas candidatas ({tabelasRows.length})</div>
              <div className="border rounded overflow-x-auto max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Schema</TableHead>
                      <TableHead>Tabela</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabelasRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-6">
                          {loadingTabelas ? 'Carregando...' : 'Nenhuma tabela candidata encontrada no ERP.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {tabelasRows.map((t, i) => (
                      <TableRow key={`${t.schema_name}.${t.table_name}.${i}`}>
                        <TableCell className="text-xs font-mono">{t.schema_name}</TableCell>
                        <TableCell className="text-xs font-mono">{t.table_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium mb-1">Colunas candidatas ({colunasRows.length})</div>
              <div className="border rounded overflow-x-auto max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Schema</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Coluna</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colunasRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-6">
                          {loadingColunas ? 'Carregando...' : 'Nenhuma coluna candidata encontrada no ERP.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {colunasRows.map((c, i) => (
                      <TableRow key={`${c.schema_name}.${c.table_name}.${c.column_name}.${i}`}>
                        <TableCell className="text-xs font-mono">{c.schema_name}</TableCell>
                        <TableCell className="text-xs font-mono">{c.table_name}</TableCell>
                        <TableCell className="text-xs font-mono">{c.column_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 4 — Validação Supabase */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Validação Lovable Cloud
          </CardTitle>
          <CardDescription className="text-xs">
            Confere o conteúdo atual da tabela <code className="font-mono">bi_dre_depara_conta_ccu</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="sm" variant="outline" onClick={onValidar} disabled={loadingValidacao}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingValidacao ? 'animate-spin' : ''}`} />
            Validar tabela De/Para no Cloud
          </Button>

          {validacao && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <KpiBox label="Registros ativos" value={validacao.totalAtivos} />
                <KpiBox label="Contas distintas" value={validacao.contasDistintas} />
                <KpiBox label="Centros distintos" value={validacao.centrosDistintos} />
                <KpiBox label="Máscaras" value={porMascara.length} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium mb-1">Por máscara DRE</div>
                  <div className="border rounded overflow-x-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Máscara</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {porMascara.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground text-xs py-6">
                              Nenhum registro.
                            </TableCell>
                          </TableRow>
                        )}
                        {porMascara.map((m) => (
                          <TableRow key={m.cd_mascara_dre}>
                            <TableCell className="text-xs font-mono">{m.cd_mascara_dre}</TableCell>
                            <TableCell className="text-xs font-mono text-right">{m.quantidade}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium mb-1">Últimos atualizados</div>
                  <div className="border rounded overflow-x-auto max-h-72">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Centro</TableHead>
                          <TableHead>Máscara</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Ativo</TableHead>
                          <TableHead>Atualizado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ultimosRegistros.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-6">
                              Nenhum registro.
                            </TableCell>
                          </TableRow>
                        )}
                        {ultimosRegistros.map((r, i) => (
                          <TableRow key={`${r.cd_conta_contabil}.${r.cd_centro_custos}.${i}`}>
                            <TableCell className="text-xs font-mono">{r.cd_conta_contabil ?? ''}</TableCell>
                            <TableCell className="text-xs font-mono">{r.cd_centro_custos ?? ''}</TableCell>
                            <TableCell className="text-xs font-mono">{r.cd_mascara_dre ?? ''}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate" title={r.descricao ?? ''}>
                              {r.descricao ?? '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={r.ativo ? 'default' : 'secondary'} className="text-[10px]">
                                {r.ativo ? 'Sim' : 'Não'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {r.updated_at ? new Date(r.updated_at).toLocaleString('pt-BR') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold font-mono">{value}</div>
    </div>
  );
}
