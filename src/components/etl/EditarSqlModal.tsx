import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, RotateCcw, Save, History } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  atualizarSqlAcao,
  listarVersoesSql,
  restaurarVersaoSql,
} from '@/lib/etl/api';
import { validarPlaceholders, PLACEHOLDERS_SUPORTADOS } from '@/lib/etl/placeholders';
import {
  type EtlAcao,
  type EtlAcaoSqlVersao,
} from '@/lib/etl/api';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acao: EtlAcao | null;
  podeEditar: boolean;
  onSalvo?: () => void;
}

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('pt-BR') : '—');

export function EditarSqlModal({ open, onOpenChange, acao, podeEditar, onSalvo }: Props) {
  const [sql, setSql] = useState('');
  const [comentario, setComentario] = useState('');
  const [versoes, setVersoes] = useState<EtlAcaoSqlVersao[]>([]);
  const [versaoVisualizada, setVersaoVisualizada] = useState<EtlAcaoSqlVersao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregandoHist, setCarregandoHist] = useState(false);

  useEffect(() => {
    if (open && acao) {
      setSql(acao.sql_template ?? '');
      setComentario('');
      setVersaoVisualizada(null);
      setCarregandoHist(true);
      listarVersoesSql(acao.id)
        .then(setVersoes)
        .catch(() => setVersoes([]))
        .finally(() => setCarregandoHist(false));
    }
  }, [open, acao]);

  const salvar = async () => {
    if (!acao) return;
    if (!comentario.trim()) {
      toast({ title: 'Comentário obrigatório', description: 'Descreva a mudança do SQL.', variant: 'destructive' });
      return;
    }
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
    }
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

  const sqlExibido = versaoVisualizada ? versaoVisualizada.sql_template ?? '' : sql;
  const readOnly = !!versaoVisualizada || !podeEditar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
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
            O SQL é executado pela FastAPI contra o ERP Senior. Use placeholders{' '}
            <code className="font-mono">:anomes_ini</code> e <code className="font-mono">:anomes_fim</code> (bind parameters — nunca concatenar string).
          </AlertDescription>
        </Alert>

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
      </DialogContent>
    </Dialog>
  );
}
