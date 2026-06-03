import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, RotateCcw, Save, History, FlaskConical, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  atualizarSqlAcao,
  buscarComandoSql,
  listarVersoesSql,
  restaurarVersaoSql,
  testarSqlAcao,
  type EtlAcao,
  type EtlAcaoSqlVersao,
  type TestarSqlResponse,
} from '@/lib/etl/api';
import {
  validarPlaceholders,
  validarParaSalvar,
  validarValores,
  extrairPlaceholders,
  PLACEHOLDER_SPECS,
  PLACEHOLDERS_SUPORTADOS,
} from '@/lib/etl/placeholders';
import { safeLower, safeUpper } from '@/lib/etl/safeString';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acao: EtlAcao | null;
  podeEditar: boolean;
  onSalvo?: () => void;
}

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('pt-BR') : '—');

/** Acesso à célula tolerante a casing — backend pode devolver chaves em outra caixa. */
const pickCell = (row: Record<string, any> | null | undefined, col: unknown): any => {
  if (!row || typeof row !== 'object') return undefined;
  const key = String(col ?? '');
  if (!key) return undefined;
  if (row[key] !== undefined) return row[key];
  const lower = safeLower(key);
  if (row[lower] !== undefined) return row[lower];
  const upper = safeUpper(key);
  if (row[upper] !== undefined) return row[upper];
  const found = Object.keys(row).find((x) => safeLower(x) === lower);
  return found ? row[found] : undefined;
};

const anomesAtual = () => {
  const d = new Date();
  return String(d.getFullYear() * 100 + (d.getMonth() + 1));
};
const isoHoje = () => new Date().toISOString().slice(0, 10);

const valorInicial = (nome: string): string => {
  const spec = PLACEHOLDER_SPECS[nome];
  if (!spec) return '';
  if (spec.tipo === 'anomes') return anomesAtual();
  if (spec.tipo === 'data') return isoHoje();
  if (spec.tipo === 'inteiro') return '1';
  if (spec.tipo === 'inteiro_list') return '1';
  return '';
};

export function EditarSqlModal({ open, onOpenChange, acao, podeEditar, onSalvo }: Props) {
  const [sql, setSql] = useState('');
  const [sqlOriginal, setSqlOriginal] = useState('');
  const [comentario, setComentario] = useState('');
  const [versoes, setVersoes] = useState<EtlAcaoSqlVersao[]>([]);
  const [versaoVisualizada, setVersaoVisualizada] = useState<EtlAcaoSqlVersao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregandoHist, setCarregandoHist] = useState(false);
  const [confirmAvisos, setConfirmAvisos] = useState<string[] | null>(null);

  // Testar SQL
  const [testarOpen, setTestarOpen] = useState(false);
  const [valoresTeste, setValoresTeste] = useState<Record<string, string>>({});
  const [limite, setLimite] = useState(50);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<TestarSqlResponse | null>(null);
  const [erroTeste, setErroTeste] = useState<string | null>(null);

  const acaoRef = useMemo(() => {
    if (!acao) return null;
    return (
      (acao as any).codigo_acao ||
      (acao as any).id_acao ||
      (acao as any).nome ||
      acao.id
    );
  }, [acao]);

  useEffect(() => {
    if (open && acao) {
      const fallback = acao.sql_template ?? '';
      setSql(fallback);
      setSqlOriginal(fallback);
      setComentario('');
      setVersaoVisualizada(null);
      setTestarOpen(false);
      setResultadoTeste(null);
      setErroTeste(null);
      setCarregandoHist(true);
      listarVersoesSql(acao.id)
        .then(setVersoes)
        .catch(() => setVersoes([]))
        .finally(() => setCarregandoHist(false));
      // Pré-carrega comando_sql real do backend FastAPI (se disponível)
      if (acaoRef) {
        buscarComandoSql(acaoRef).then((r) => {
          const real = r?.comando_sql;
          if (real && real.trim()) {
            setSql(real);
            setSqlOriginal(real);
          }
        });
      }
    }
  }, [open, acao, acaoRef]);

  const sqlExibido = versaoVisualizada ? versaoVisualizada.sql_template ?? '' : sql;
  const readOnly = !!versaoVisualizada || !podeEditar;
  // `STATIC:NOME` é um ponteiro para um template hardcoded no backend, não SQL real.
  // Nada de detectar placeholders aqui — o backend resolve antes de executar.
  const isStaticPointer = /^\s*STATIC:/i.test(sqlExibido);

  // Atualiza valores de teste quando placeholders mudam
  const placeholdersTeste = useMemo(
    () =>
      isStaticPointer
        ? []
        : extrairPlaceholders(sqlExibido).filter((p) => PLACEHOLDERS_SUPORTADOS.includes(p)),
    [sqlExibido, isStaticPointer],
  );

  useEffect(() => {
    setValoresTeste((prev) => {
      const next: Record<string, string> = {};
      for (const p of placeholdersTeste) {
        next[p] = prev[p] ?? valorInicial(p);
      }
      return next;
    });
  }, [placeholdersTeste.join('|')]);

  const executarSalvar = async () => {
    if (!acao) return;
    setSalvando(true);
    try {
      await atualizarSqlAcao(acao.id, sql, comentario.trim());
      toast({ title: 'SQL atualizado', description: `Nova versão salva para ${acao.id_acao}.` });
      onSalvo?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message ?? 'Falha desconhecida', variant: 'destructive' });
    } finally {
      setSalvando(false);
      setConfirmAvisos(null);
    }
  };

  const salvar = async () => {
    if (!acao) return;
    if (!comentario.trim()) {
      toast({ title: 'Comentário obrigatório', description: 'Descreva a mudança do SQL.', variant: 'destructive' });
      return;
    }
    const r = validarParaSalvar(sql, { estrategia_carga: acao.estrategia_carga });
    if (!r.ok) {
      toast({
        title: 'Placeholders inválidos',
        description: r.erros.join(' • '),
        variant: 'destructive',
      });
      return;
    }
    if (r.avisos.length > 0) {
      setConfirmAvisos(r.avisos);
      return;
    }
    await executarSalvar();
  };

  const restaurar = async (versao: number) => {
    if (!acao) return;
    setSalvando(true);
    try {
      const atualizada = await restaurarVersaoSql(acao.id, versao);
      setSql(atualizada.sql_template ?? '');
      toast({ title: 'Versão restaurada', description: `v${versao} carregada como SQL atual.` });
      const novas = await listarVersoesSql(acao.id);
      setVersoes(novas);
      setVersaoVisualizada(null);
      onSalvo?.();
    } catch (e: any) {
      toast({ title: 'Erro ao restaurar', description: e?.message ?? 'Falha', variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const executarTeste = async () => {
    if (!acao) return;
    const v = validarValores(sqlExibido, valoresTeste);
    if (!v.ok) {
      setErroTeste(v.erros.join(' • '));
      return;
    }
    setTestando(true);
    setErroTeste(null);
    setResultadoTeste(null);
    try {
      // Converte valores para tipo apropriado; chaves em UPPERCASE
      const parametros: Record<string, string | number> = {};
      for (const p of placeholdersTeste) {
        const spec = PLACEHOLDER_SPECS[p];
        const raw = valoresTeste[p];
        parametros[p] =
          spec.tipo === 'anomes' || spec.tipo === 'inteiro' ? Number(raw) : raw;
      }
      const ref = acaoRef ?? acao.id;
      // Só envia sql_template se o usuário editou; caso contrário, backend usa comando_sql salvo
      const sqlEditado = sqlExibido !== sqlOriginal;
      const payload: { sql_template?: string; parametros: typeof parametros; limite: number } = {
        parametros,
        limite,
      };
      if (sqlEditado) payload.sql_template = sqlExibido;
      const resp = await testarSqlAcao(ref, payload);
      setResultadoTeste(resp);
    } catch (e: any) {
      setErroTeste(e?.message ?? 'Falha ao executar preview');
    } finally {
      setTestando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar SQL — <span className="font-mono">{acao?.id_acao}</span>
            {acao && <Badge variant="outline">v{acao.sql_versao}</Badge>}
            {versaoVisualizada && <Badge variant="secondary">Visualizando v{versaoVisualizada.versao}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Última alteração: {fmt(acao?.sql_atualizado_em ?? null)}
          </DialogDescription>
        </DialogHeader>

        <Alert className="py-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Placeholders no padrão UpQuery/Senior <code className="font-mono">$[NOME]</code>. Suportados:{' '}
            {PLACEHOLDERS_SUPORTADOS.map((p) => (
              <code key={p} className="font-mono mr-1">$[{p}]</code>
            ))}
            — substituídos pela FastAPI após validação de tipo.
          </AlertDescription>
        </Alert>

        {isStaticPointer && (
          <Alert className="py-2">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Esta ação aponta para um template estático do backend (<code className="font-mono">{sqlExibido.trim()}</code>).
              O SQL real e seus placeholders são resolvidos na FastAPI antes da execução — o Testar SQL envia os parâmetros e o backend usa o template registrado.
            </AlertDescription>
          </Alert>
        )}

        {!isStaticPointer && (() => {
          const { encontrados, desconhecidos } = validarPlaceholders(sqlExibido);
          if (encontrados.length === 0 && desconhecidos.length === 0) return null;
          return (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-muted-foreground">Placeholders:</span>
              {encontrados.map((p) => {
                const ok = PLACEHOLDERS_SUPORTADOS.includes(p);
                return (
                  <Badge
                    key={p}
                    variant={ok ? 'default' : 'destructive'}
                    className="font-mono text-[10px]"
                  >
                    $[{p}]{!ok && ' ?'}
                  </Badge>
                );
              })}
              {desconhecidos.length > 0 && (
                <span className="text-destructive">
                  Placeholder desconhecido — vai bloquear o salvar.
                </span>
              )}
            </div>
          );
        })()}

        <div className="grid grid-cols-[1fr_280px] gap-3 flex-1 min-h-0">
          {/* Editor */}
          <div className="border rounded overflow-hidden min-h-0">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <MonacoEditor
                language="sql"
                theme="vs-dark"
                value={sqlExibido}
                onChange={(v) => !readOnly && setSql(v ?? '')}
                options={{
                  readOnly,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </Suspense>
          </div>

          {/* Histórico */}
          <div className="border rounded flex flex-col min-h-0">
            <div className="px-3 py-2 border-b flex items-center gap-2 text-xs font-semibold">
              <History className="h-3.5 w-3.5" /> Histórico de versões
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {carregandoHist ? (
                  <Skeleton className="h-20 w-full" />
                ) : versoes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Sem versões anteriores.</p>
                ) : (
                  versoes.map((v) => (
                    <div
                      key={v.id}
                      className={`border rounded p-2 text-xs cursor-pointer hover:bg-accent ${
                        versaoVisualizada?.id === v.id ? 'bg-accent border-primary' : ''
                      }`}
                      onClick={() => setVersaoVisualizada(v)}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">v{v.versao}</Badge>
                        <span className="text-[10px] text-muted-foreground">{fmt(v.criado_em)}</span>
                      </div>
                      {v.comentario && <p className="mt-1 line-clamp-2">{v.comentario}</p>}
                      {podeEditar && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 mt-1 w-full"
                          disabled={salvando}
                          onClick={(e) => {
                            e.stopPropagation();
                            restaurar(v.versao);
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            {versaoVisualizada && (
              <div className="p-2 border-t">
                <Button size="sm" variant="outline" className="w-full" onClick={() => setVersaoVisualizada(null)}>
                  Voltar ao SQL atual
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Testar SQL */}
        <div className="border rounded">
          <button
            type="button"
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold hover:bg-accent"
            onClick={() => setTestarOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5" /> Testar SQL (preview, sem persistir)
            </span>
            {testarOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {testarOpen && (
            <div className="p-3 border-t space-y-3">
              {placeholdersTeste.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Sem placeholders no SQL — o preview vai rodar a query como está.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {placeholdersTeste.map((p) => {
                    const spec = PLACEHOLDER_SPECS[p];
                    return (
                      <div key={p}>
                        <Label className="text-[11px] font-mono">$[{p}]</Label>
                        <Input
                          type={spec.inputType}
                          value={valoresTeste[p] ?? ''}
                          onChange={(e) =>
                            setValoresTeste((s) => ({ ...s, [p]: e.target.value }))
                          }
                          placeholder={spec.exemplo}
                          className="h-8 text-xs"
                        />
                      </div>
                    );
                  })}
                  <div>
                    <Label className="text-[11px]">Limite</Label>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={limite}
                      onChange={(e) => setLimite(Math.min(500, Math.max(1, Number(e.target.value) || 50)))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={executarTeste} disabled={testando}>
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {testando ? 'Executando…' : 'Executar preview'}
                </Button>
                {resultadoTeste && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{resultadoTeste.qtd_linhas} linha(s)</Badge>
                    <Badge variant="outline">{resultadoTeste.tempo_ms} ms</Badge>
                    {resultadoTeste.truncado && <Badge variant="secondary">truncado</Badge>}
                  </div>
                )}
              </div>
              {erroTeste && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{erroTeste}</AlertDescription>
                </Alert>
              )}
              {resultadoTeste && resultadoTeste.linhas.length > 0 && (
                <ScrollArea className="max-h-64 border rounded">
                  <table className="text-xs w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {resultadoTeste.colunas.map((c, idx) => {
                          const colName = String((c as any)?.nome ?? (c as any)?.name ?? (c as any)?.column ?? `col_${idx}`);
                          return (
                            <th key={`${colName}-${idx}`} className="px-2 py-1 text-left font-mono whitespace-nowrap">
                              {colName}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoTeste.linhas.map((l, i) => (
                        <tr key={i} className="border-t">
                          {resultadoTeste.colunas.map((c, idx) => {
                            const colName = String((c as any)?.nome ?? (c as any)?.name ?? (c as any)?.column ?? `col_${idx}`);
                            const v = pickCell(l, colName);
                            return (
                              <td key={`${colName}-${idx}`} className="px-2 py-1 whitespace-nowrap">
                                {v === null || v === undefined ? (
                                  <span className="text-muted-foreground italic">null</span>
                                ) : (
                                  String(v)
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {podeEditar && !versaoVisualizada && (
          <div>
            <label className="text-xs font-semibold">Comentário da alteração *</label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Ex.: corrigido join com TGFCAB para considerar status A"
              rows={2}
              className="text-xs"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Fechar
          </Button>
          {podeEditar && !versaoVisualizada && (
            <Button onClick={salvar} disabled={salvando}>
              <Save className="h-4 w-4 mr-1" /> {salvando ? 'Salvando...' : 'Salvar nova versão'}
            </Button>
          )}
        </DialogFooter>

        <AlertDialog open={!!confirmAvisos} onOpenChange={(o) => !o && setConfirmAvisos(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar salvamento</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-xs">
                  <p>O SQL tem alertas que merecem revisão:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {(confirmAvisos ?? []).map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                  <p>Salvar mesmo assim?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={executarSalvar}>Salvar mesmo assim</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
