import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Save } from 'lucide-react';
import {
  fetchDeParaTelas, upsertDeParaTela,
  type DeParaMapeada, type DeParaNaoMapeada,
} from '@/lib/telemetriaNativaDeparaApi';
import { formatDateTimeBR, formatNumberBR } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

type DraftPendente = { nome_tela: string; modulo: string; obs: string; saving?: boolean };
type DraftMapeada = { nome_tela: string; modulo: string; ativo: boolean; obs: string; saving?: boolean };

export function DeParaTelasModal({ open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [nao, setNao] = useState<DeParaNaoMapeada[]>([]);
  const [map, setMap] = useState<DeParaMapeada[]>([]);
  const [draftsPend, setDraftsPend] = useState<Record<string, DraftPendente>>({});
  const [draftsMap, setDraftsMap] = useState<Record<string, DraftMapeada>>({});
  const [savedAny, setSavedAny] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetchDeParaTelas();
      const sortedNao = [...r.nao_mapeadas].sort((a, b) => (b.acessos ?? 0) - (a.acessos ?? 0));
      setNao(sortedNao);
      setMap(r.mapeadas);
      setDraftsPend(Object.fromEntries(sortedNao.map((n) => [n.sig_processo, { nome_tela: '', modulo: '', obs: '' }])));
      setDraftsMap(Object.fromEntries(r.mapeadas.map((m) => [m.sig_processo, {
        nome_tela: m.nome_tela ?? '', modulo: m.modulo ?? '', ativo: !!m.ativo, obs: m.obs ?? '',
      }])));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSavedAny(false);
      load();
    }
  }, [open, load]);

  const handleClose = (v: boolean) => {
    if (!v && savedAny) onSaved?.();
    onOpenChange(v);
  };

  const errorMsg = useMemo(() => {
    if (!error) return null;
    if (error?.statusCode === 401) return 'Sessão expirada. Faça login novamente.';
    return 'Não foi possível carregar o de-para de telas.';
  }, [error]);

  const salvarPendente = async (sig: string) => {
    const d = draftsPend[sig];
    if (!d || !d.nome_tela.trim() || !d.modulo.trim()) return;
    setDraftsPend((prev) => ({ ...prev, [sig]: { ...d, saving: true } }));
    try {
      await upsertDeParaTela({
        sig_processo: sig,
        nome_tela: d.nome_tela.trim(),
        modulo: d.modulo.trim(),
        ativo: true,
        obs: d.obs.trim() || undefined,
      });
      toast.success(`Sigla ${sig} mapeada.`);
      setSavedAny(true);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar mapeamento.');
      setDraftsPend((prev) => ({ ...prev, [sig]: { ...d, saving: false } }));
    }
  };

  const salvarMapeada = async (sig: string) => {
    const d = draftsMap[sig];
    if (!d || !d.nome_tela.trim() || !d.modulo.trim()) return;
    setDraftsMap((prev) => ({ ...prev, [sig]: { ...d, saving: true } }));
    try {
      await upsertDeParaTela({
        sig_processo: sig,
        nome_tela: d.nome_tela.trim(),
        modulo: d.modulo.trim(),
        ativo: d.ativo,
        obs: d.obs.trim() || undefined,
      });
      toast.success(`Sigla ${sig} atualizada.`);
      setSavedAny(true);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar mapeamento.');
      setDraftsMap((prev) => ({ ...prev, [sig]: { ...d, saving: false } }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>De-Para de Telas Senior</DialogTitle>
          <DialogDescription>
            Mapeie as siglas/processos capturados no ERP Senior para nomes amigáveis e módulos.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Falha</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="a-mapear">
            <TabsList>
              <TabsTrigger value="a-mapear">A mapear ({nao.length})</TabsTrigger>
              <TabsTrigger value="mapeadas">Mapeadas ({map.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="a-mapear" className="mt-3">
              <div className="max-h-[55vh] overflow-auto">
                {nao.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Não há novas siglas para mapear.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sigla / Processo</TableHead>
                        <TableHead className="text-right">Acessos</TableHead>
                        <TableHead>Último Acesso</TableHead>
                        <TableHead>Nome da Tela *</TableHead>
                        <TableHead>Módulo *</TableHead>
                        <TableHead>Obs</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nao.map((row, idx) => {
                        const d = draftsPend[row.sig_processo] ?? { nome_tela: '', modulo: '', obs: '' };
                        const destaque = idx < 3 && (row.acessos ?? 0) > 0;
                        const canSave = !!d.nome_tela.trim() && !!d.modulo.trim() && !d.saving;
                        return (
                          <TableRow key={row.sig_processo} className={destaque ? 'bg-orange-500/5' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{row.sig_processo}</span>
                                <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15">Pendente</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatNumberBR(row.acessos)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(row.ultimo_acesso)}</TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={d.nome_tela}
                                onChange={(e) => setDraftsPend((p) => ({ ...p, [row.sig_processo]: { ...d, nome_tela: e.target.value } }))}
                                placeholder="Ex.: Nota Fiscal de Entrada"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={d.modulo}
                                onChange={(e) => setDraftsPend((p) => ({ ...p, [row.sig_processo]: { ...d, modulo: e.target.value } }))}
                                placeholder="Ex.: Compras"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={d.obs}
                                onChange={(e) => setDraftsPend((p) => ({ ...p, [row.sig_processo]: { ...d, obs: e.target.value } }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" disabled={!canSave} onClick={() => salvarPendente(row.sig_processo)} className="gap-1">
                                {d.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Salvar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="mapeadas" className="mt-3">
              <div className="max-h-[55vh] overflow-auto">
                {map.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum de-para cadastrado ainda.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sigla / Processo</TableHead>
                        <TableHead>Nome da Tela</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {map.map((row) => {
                        const d = draftsMap[row.sig_processo] ?? {
                          nome_tela: row.nome_tela ?? '', modulo: row.modulo ?? '', ativo: !!row.ativo, obs: row.obs ?? '',
                        };
                        const canSave = !!d.nome_tela.trim() && !!d.modulo.trim() && !d.saving;
                        return (
                          <TableRow key={row.sig_processo}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{row.sig_processo}</span>
                                {d.ativo ? (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15">Mapeada</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={d.nome_tela}
                                onChange={(e) => setDraftsMap((p) => ({ ...p, [row.sig_processo]: { ...d, nome_tela: e.target.value } }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={d.modulo}
                                onChange={(e) => setDraftsMap((p) => ({ ...p, [row.sig_processo]: { ...d, modulo: e.target.value } }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={d.ativo}
                                onCheckedChange={(v) => setDraftsMap((p) => ({ ...p, [row.sig_processo]: { ...d, ativo: v } }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8"
                                value={d.obs}
                                onChange={(e) => setDraftsMap((p) => ({ ...p, [row.sig_processo]: { ...d, obs: e.target.value } }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Button size="sm" disabled={!canSave} onClick={() => salvarMapeada(row.sig_processo)} className="gap-1">
                                {d.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Salvar
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
