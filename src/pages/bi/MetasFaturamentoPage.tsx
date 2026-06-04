import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

import {
  listMetas, upsertMeta, toggleAtivo, deleteMeta,
  type MetaFaturamento, type MetaFaturamentoInput,
} from '@/lib/bi/metasFaturamentoApi';

type UnidadeUI = 'GENIUS' | 'ESTRUTURAL ZORTEA';

const UNIDADES: UnidadeUI[] = ['GENIUS', 'ESTRUTURAL ZORTEA'];

const currency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatAnomes(anomes: string): string {
  if (!anomes || anomes.length < 6) return anomes;
  return `${anomes.slice(0, 4)}-${anomes.slice(4, 6)}`;
}
function parseAnomesInput(v: string): string {
  // aceita 'YYYY-MM' ou 'YYYYMM'
  return v.replace(/[^0-9]/g, '').slice(0, 6);
}

interface EditState {
  open: boolean;
  editing: MetaFaturamento | null;
}

export default function MetasFaturamentoPage() {
  const qc = useQueryClient();
  const anoAtual = new Date().getFullYear();
  const [anoFiltro, setAnoFiltro] = useState<string>(String(anoAtual));
  const [unidadeFiltro, setUnidadeFiltro] = useState<'TODAS' | UnidadeUI>('TODAS');

  const anomesIni = `${anoFiltro}01`;
  const anomesFim = `${anoFiltro}12`;

  const filtroIdAno = useId();
  const filtroIdUn = useId();

  const { data: metas = [], isLoading, error } = useQuery({
    queryKey: ['bi-metas', anomesIni, anomesFim],
    queryFn: () => listMetas(anomesIni, anomesFim),
  });

  const metasFiltradas = useMemo(
    () => (unidadeFiltro === 'TODAS' ? metas : metas.filter((m) => m.unidade_negocio === unidadeFiltro)),
    [metas, unidadeFiltro],
  );

  // Agrupa para mostrar linha CONSOLIDADO calculada
  const consolidadoPorMes = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of metas) {
      if (!m.ativo) continue;
      map.set(m.anomes_emissao, (map.get(m.anomes_emissao) || 0) + Number(m.vl_meta));
    }
    return Array.from(map.entries())
      .map(([anomes, total]) => ({ anomes, total }))
      .sort((a, b) => (a.anomes < b.anomes ? 1 : -1));
  }, [metas]);

  const [edit, setEdit] = useState<EditState>({ open: false, editing: null });
  const [delId, setDelId] = useState<string | null>(null);

  const mUpsert = useMutation({
    mutationFn: (input: MetaFaturamentoInput) => upsertMeta(input),
    onSuccess: () => {
      toast.success('Meta salva');
      qc.invalidateQueries({ queryKey: ['bi-metas'] });
      qc.invalidateQueries({ queryKey: ['bi-comercial', 'meta-cloud'] });
      setEdit({ open: false, editing: null });
    },
    onError: (e: any) => toast.error(e?.message || 'Falha ao salvar meta'),
  });

  const mToggle = useMutation({
    mutationFn: (m: MetaFaturamento) => toggleAtivo(m.id, !m.ativo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bi-metas'] });
      qc.invalidateQueries({ queryKey: ['bi-comercial', 'meta-cloud'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Falha ao alterar status'),
  });

  const mDelete = useMutation({
    mutationFn: (id: string) => deleteMeta(id),
    onSuccess: () => {
      toast.success('Meta excluída');
      qc.invalidateQueries({ queryKey: ['bi-metas'] });
      qc.invalidateQueries({ queryKey: ['bi-comercial', 'meta-cloud'] });
      setDelId(null);
    },
    onError: (e: any) => toast.error(e?.message || 'Falha ao excluir'),
  });

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Metas de Faturamento</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre metas mensais por unidade de negócio. O <b>CONSOLIDADO</b> é
            calculado automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor={filtroIdAno} className="text-xs">Ano</Label>
            <Input
              id={filtroIdAno}
              name="ano"
              type="number"
              min={2020}
              max={2099}
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              className="h-9 w-28"
            />
          </div>
          <div>
            <Label htmlFor={filtroIdUn} className="text-xs">Unidade</Label>
            <Select value={unidadeFiltro} onValueChange={(v) => setUnidadeFiltro(v as any)}>
              <SelectTrigger id={filtroIdUn} name="unidade_filtro" aria-label="Unidade" className="h-9 w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setEdit({ open: true, editing: null })}>
            <Plus className="mr-1 h-4 w-4" /> Nova meta
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas cadastradas — {anoFiltro}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Erro ao carregar metas: {(error as any)?.message}</p>
          ) : isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : metasFiltradas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left">Anomês</th>
                    <th className="px-2 py-2 text-left">Unidade</th>
                    <th className="px-2 py-2 text-right">Meta (R$)</th>
                    <th className="px-2 py-2 text-left">Observação</th>
                    <th className="px-2 py-2 text-left">Ativo</th>
                    <th className="px-2 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {metasFiltradas.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-muted/30">
                      <td className="px-2 py-2 font-mono">{formatAnomes(m.anomes_emissao)}</td>
                      <td className="px-2 py-2">
                        <Badge variant="outline">{m.unidade_negocio}</Badge>
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{currency(Number(m.vl_meta))}</td>
                      <td className="px-2 py-2 text-muted-foreground">{m.observacao || '—'}</td>
                      <td className="px-2 py-2">
                        <Switch
                          checked={m.ativo}
                          onCheckedChange={() => mToggle.mutate(m)}
                          aria-label={`Ativar meta ${m.unidade_negocio} ${formatAnomes(m.anomes_emissao)}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Editar meta"
                            onClick={() => setEdit({ open: true, editing: m })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Excluir meta"
                            onClick={() => setDelId(m.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {consolidadoPorMes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              CONSOLIDADO calculado (GENIUS + ESTRUTURAL ZORTEA, ativos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-2 py-2 text-left">Anomês</th>
                    <th className="px-2 py-2 text-right">Meta consolidada (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidadoPorMes.map((r) => (
                    <tr key={r.anomes} className="border-b">
                      <td className="px-2 py-2 font-mono">{formatAnomes(r.anomes)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{currency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <EditMetaDialog
        state={edit}
        onClose={() => setEdit({ open: false, editing: null })}
        onSubmit={(input) => mUpsert.mutate(input)}
        saving={mUpsert.isPending}
      />

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => delId && mDelete.mutate(delId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Dialog ---------------- */

function EditMetaDialog({
  state, onClose, onSubmit, saving,
}: {
  state: EditState;
  onClose: () => void;
  onSubmit: (input: MetaFaturamentoInput) => void;
  saving: boolean;
}) {
  const uid = useId();
  const editing = state.editing;
  const [anomes, setAnomes] = useState('');
  const [unidade, setUnidade] = useState<UnidadeUI>('GENIUS');
  const [valor, setValor] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [ativo, setAtivo] = useState(true);

  // reset ao abrir
  useMemo(() => {
    if (state.open) {
      setAnomes(editing?.anomes_emissao ?? '');
      setUnidade((editing?.unidade_negocio as UnidadeUI) ?? 'GENIUS');
      setValor(editing ? String(editing.vl_meta) : '');
      setObservacao(editing?.observacao ?? '');
      setAtivo(editing ? editing.ativo : true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, editing?.id]);

  const idAnomes = `${uid}-anomes`;
  const idUnidade = `${uid}-unidade`;
  const idValor = `${uid}-valor`;
  const idObs = `${uid}-obs`;
  const idAtivo = `${uid}-ativo`;

  const valorNum = Number((valor || '').toString().replace(',', '.'));
  const valid = anomes.length === 6 && !Number.isNaN(valorNum) && valorNum >= 0;

  const handleSave = () => {
    if (!valid) {
      toast.error('Preencha anomês (YYYYMM) e valor válido');
      return;
    }
    onSubmit({
      anomes_emissao: anomes,
      unidade_negocio: unidade,
      vl_meta: valorNum,
      observacao: observacao.trim() || null,
      ativo,
    });
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar meta' : 'Nova meta'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={idAnomes}>Anomês</Label>
              <Input
                id={idAnomes}
                name="anomes_emissao"
                placeholder="YYYY-MM"
                value={anomes ? `${anomes.slice(0, 4)}${anomes.length > 4 ? '-' + anomes.slice(4, 6) : ''}` : ''}
                onChange={(e) => setAnomes(parseAnomesInput(e.target.value))}
                disabled={!!editing}
              />
              <p className="mt-1 text-xs text-muted-foreground">Formato YYYY-MM (ex: 2026-06)</p>
            </div>
            <div>
              <Label htmlFor={idUnidade}>Unidade de negócio</Label>
              <Select
                value={unidade}
                onValueChange={(v) => setUnidade(v as UnidadeUI)}
                disabled={!!editing}
              >
                <SelectTrigger id={idUnidade} name="unidade_negocio" aria-label="Unidade de negócio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor={idValor}>Valor da meta (R$)</Label>
            <Input
              id={idValor}
              name="vl_meta"
              type="number"
              min={0}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div>
            <Label htmlFor={idObs}>Observação</Label>
            <Textarea
              id={idObs}
              name="observacao"
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id={idAtivo} checked={ativo} onCheckedChange={setAtivo} aria-label="Meta ativa" />
            <Label htmlFor={idAtivo} className="cursor-pointer">Meta ativa</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !valid}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
