import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Copy, Pencil, AlertTriangle, Database, MessageSquare, Code2, ShieldAlert, History } from 'lucide-react';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP, RegraVersao } from '@/lib/senior/types';
import { StatusRegraBadge } from '@/components/regras-senior/StatusRegraBadge';
import { ClonarParaPortalDialog } from '@/components/regras-senior/ClonarParaPortalDialog';
import { VerCodigoLspDialog } from '@/components/regras-senior/VerCodigoLspDialog';
import { PageHeader } from '@/components/erp/PageHeader';
import { analisarFonteLsp, type LspAnalise, type LspRisco } from '@/lib/senior/lspAnalyzer';

function OrigemBadge({ value }: { value?: string | null }) {
  if (value === 'PORTAL') {
    return <Badge variant="outline" className="bg-accent/30 text-accent-foreground border-accent">Portal</Badge>;
  }
  return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">ERP Senior</Badge>;
}

function NivelBadge({ nivel }: { nivel: LspRisco['nivel'] }) {
  if (nivel === 'error') return <Badge variant="destructive">erro</Badge>;
  if (nivel === 'warning') return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">aviso</Badge>;
  return <Badge variant="outline">info</Badge>;
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value ?? '—'}</div>
    </div>
  );
}

export default function RegraNegocioPage() {
  const { id } = useParams<{ id: string }>();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateRegra = (location.state as { regra?: RegraLSP } | null)?.regra ?? null;

  const [regra, setRegra] = useState<RegraLSP | null>(stateRegra);
  const [loading, setLoading] = useState(true);
  const [versoes, setVersoes] = useState<RegraVersao[]>([]);
  const [validacoes, setValidacoes] = useState<{ nivel: string; mensagem: string }[]>([]);
  const [openClonar, setOpenClonar] = useState(false);
  const [openCodigo, setOpenCodigo] = useState(false);

  const isErp = id === 'erp' || regra?.origem === 'E098REG';

  const carregar = async () => {
    setLoading(true);
    try {
      if (id && id !== 'erp' && /^\d+$/.test(id)) {
        const r = await seniorApi.obterRegra(id);
        setRegra(r);
        if (r.id_regra != null) {
          const [vers, val] = await Promise.all([
            seniorApi.listarVersoes(r.id_regra).catch(() => []),
            seniorApi.validarRegra(r.id_regra).catch(() => ({ avisos: [] })),
          ]);
          setVersoes(vers);
          setValidacoes(val.avisos ?? []);
        }
      } else {
        // ERP via chave composta
        const codemp = sp.get('codemp');
        const modsis = sp.get('modsis') ?? undefined;
        const idereg = sp.get('idereg') ?? undefined;
        const codreg = sp.get('codreg');
        if (stateRegra) {
          setRegra(stateRegra);
        } else {
          const rows = await seniorApi.listarRegras({ idereg });
          const match = rows.find((r) =>
            r.origem === 'E098REG' &&
            (codemp == null || String(r.codemp ?? '') === codemp) &&
            (modsis == null || (r.modsis ?? '') === modsis) &&
            (codreg == null || String(r.codreg_erp ?? '') === codreg)
          ) ?? rows.find((r) => r.idereg === idereg) ?? null;
          setRegra(match);
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível carregar a regra de negócio');
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [id]);

  const analise: LspAnalise = useMemo(
    () => analisarFonteLsp(regra?.fonte_lsp ?? ''),
    [regra?.fonte_lsp]
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title={regra ? `Regra de negócio: ${regra.nome_regra || regra.codreg_erp || regra.idereg}` : 'Regra de negócio'}
        description="Resumo conceitual da regra, com vínculo no ERP e detalhes de implementação."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" />Voltar
            </Button>
            {regra?.origem === 'PORTAL' && regra.id_regra != null && (
              <Button size="sm" onClick={() => navigate(`/regras-senior/regras/${regra.id_regra}/editor`)}>
                <Pencil className="mr-1 h-4 w-4" />Abrir editor
              </Button>
            )}
          </div>
        }
      />

      {loading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {!loading && !regra && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">Regra não encontrada.</CardContent></Card>
      )}

      {!loading && regra && (
        <>
          <Card>
            <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Origem" value={<OrigemBadge value={regra.origem} />} />
              <Field label="Situação" value={<StatusRegraBadge value={regra.status_regra} />} />
              <Field label="Empresa" value={regra.codemp} />
              <Field label="Módulo" value={regra.modsis} />
              <Field label="Identificador" value={regra.idereg} />
              <Field label="Transação" value={regra.codtns} />
              <Field label="Código da regra" value={regra.codreg_erp} />
              <Field label="Ambiente" value={regra.ambiente} />
            </CardContent>
          </Card>

          {isErp && (
            <Card className="border-warning/40 bg-warning/5">
              <CardContent className="p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <div className="font-medium">Registro proveniente da E098REG</div>
                  <div className="text-muted-foreground">
                    Este registro vem da E098REG. Ele mostra o vínculo do identificador com o código da regra.
                    Para visualizar a lógica completa da regra, importe ou clone o fonte LSP para o portal.
                  </div>
                </div>
                <Button size="sm" onClick={() => setOpenClonar(true)}>
                  <Copy className="mr-1 h-4 w-4" />Clonar para portal / Importar fonte LSP
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo da regra de negócio</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Descrição</div>
                <div className="whitespace-pre-wrap">{regra.descricao || <span className="text-muted-foreground">—</span>}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Observação (OBSREG)</div>
                <div className="whitespace-pre-wrap">{regra.observacao || <span className="text-muted-foreground">—</span>}</div>
              </div>
              {!regra.descricao && !regra.observacao && (
                <div className="text-xs text-muted-foreground">Sem descrição/observação cadastrada na E098REG.</div>
              )}
            </CardContent>
          </Card>

          {regra.origem === 'PORTAL' && (
            <>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Code2 className="h-4 w-4" />Fonte LSP</CardTitle></CardHeader>
                <CardContent>
                  {regra.fonte_lsp ? (
                    <pre className="text-xs font-mono p-2 bg-muted/40 rounded border max-h-72 overflow-auto whitespace-pre">
                      {regra.fonte_lsp}
                    </pre>
                  ) : (
                    <div className="text-xs text-muted-foreground">Sem fonte LSP cadastrado ainda.</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Validações encontradas</CardTitle></CardHeader>
                <CardContent>
                  {validacoes.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sem avisos de validação.</div>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {validacoes.map((v, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <NivelBadge nivel={(v.nivel as any) ?? 'info'} />
                          <span>{v.mensagem}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" />Tabelas consultadas</CardTitle></CardHeader>
                  <CardContent>
                    {analise.tabelas_consultadas.length === 0
                      ? <div className="text-xs text-muted-foreground">Nenhuma identificada.</div>
                      : <div className="flex flex-wrap gap-1">{analise.tabelas_consultadas.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" />Tabelas alteradas</CardTitle></CardHeader>
                  <CardContent>
                    {analise.tabelas_alteradas.length === 0
                      ? <div className="text-xs text-muted-foreground">Nenhuma identificada.</div>
                      : <div className="flex flex-wrap gap-1">{analise.tabelas_alteradas.map((t) => <Badge key={t} variant="outline" className="bg-warning/10 text-warning border-warning/30">{t}</Badge>)}</div>}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Mensagens (GeraLog / Mensagem)</CardTitle></CardHeader>
                <CardContent>
                  {analise.mensagens.length === 0
                    ? <div className="text-xs text-muted-foreground">Nenhuma identificada.</div>
                    : <ul className="list-disc pl-5 text-sm space-y-0.5">{analise.mensagens.map((m, i) => <li key={i}>{m}</li>)}</ul>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Code2 className="h-4 w-4" />Comandos ExecSQL / ExecSQLEx</CardTitle></CardHeader>
                <CardContent>
                  {analise.comandos_sql.length === 0
                    ? <div className="text-xs text-muted-foreground">Nenhum comando identificado.</div>
                    : <div className="space-y-2">
                        {analise.comandos_sql.map((c, i) => (
                          <div key={i}>
                            <Badge variant="outline" className="mb-1">SQL</Badge>
                            <pre className="text-xs font-mono p-2 bg-muted/40 rounded border overflow-auto whitespace-pre-wrap">{c}</pre>
                          </div>
                        ))}
                      </div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Riscos</CardTitle></CardHeader>
                <CardContent>
                  {analise.riscos.length === 0
                    ? <div className="text-xs text-muted-foreground">Nenhum risco evidente identificado pela análise estática.</div>
                    : <ul className="space-y-1 text-sm">
                        {analise.riscos.map((r, i) => (
                          <li key={i} className="flex gap-2 items-start"><NivelBadge nivel={r.nivel} /><span>{r.mensagem}</span></li>
                        ))}
                      </ul>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" />Histórico de versões</CardTitle></CardHeader>
                <CardContent>
                  {versoes.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nenhuma versão registrada.</div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr><th className="text-left p-1">Versão</th><th className="text-left p-1">Status</th><th className="text-left p-1">Data</th><th className="text-left p-1">Autor</th><th className="text-left p-1">Motivo</th></tr>
                      </thead>
                      <tbody>
                        {versoes.map((v) => (
                          <tr key={v.id} className="border-t">
                            <td className="p-1">{v.versao}</td>
                            <td className="p-1"><StatusRegraBadge value={v.status_regra} /></td>
                            <td className="p-1">{v.criado_em ? new Date(v.criado_em).toLocaleString('pt-BR') : '—'}</td>
                            <td className="p-1">{v.criado_por ?? '—'}</td>
                            <td className="p-1">{v.motivo ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {openClonar && regra && (
        <ClonarParaPortalDialog regra={regra} onClose={() => setOpenClonar(false)} />
      )}
    </div>
  );
}
