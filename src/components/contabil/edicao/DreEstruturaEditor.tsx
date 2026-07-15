import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, ChevronRight, ChevronLeft, Save, Upload, RotateCcw, Loader2 } from "lucide-react";
import {
  carregarDreOficial, carregarDreRascunho, salvarDreRascunho, descartarDreRascunho, publicarDreRascunho,
  listarDreSnapshots, salvarDreSnapshot, restaurarDreSnapshot, excluirDreSnapshot, podeEditarDreOficial,
  type DreLinhaEditavel,
} from "@/lib/contabil/estruturaEdicaoApi";
import { SnapshotsDialog } from "./SnapshotsDialog";

interface Props {
  open: boolean;
  modeloId: string;
  onClose: () => void;
  onPublicado?: () => void;
}

function novaLinha(ordem: number): DreLinhaEditavel {
  return {
    ordem, codigo_linha: "", descricao: "Nova linha", nivel: 1, linha_pai_codigo: null,
    tipo_linha: "ANALITICA", formula: null, ativo: true,
    flag_soma: true, flag_inverte_sinal: false, flag_exibe_dre: true, flag_permite_drill: true,
    flag_negrito: false, flag_totalizadora: false,
  };
}

function SortableRow({ linha, idx, onChange, onRemove, onIndent }: {
  linha: DreLinhaEditavel; idx: number;
  onChange: (patch: Partial<DreLinhaEditavel>) => void;
  onRemove: () => void;
  onIndent: (delta: -1 | 1) => void;
}) {
  const key = linha.id ?? `tmp-${idx}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <tr ref={setNodeRef} style={style} className={`border-t hover:bg-accent/20 ${!linha.ativo ? "opacity-50" : ""}`}>
      <td className="p-1 w-6 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </td>
      <td className="p-1 w-16">
        <Input className="h-7 text-xs font-mono" value={linha.codigo_linha}
          onChange={(e) => onChange({ codigo_linha: e.target.value.toUpperCase() })} placeholder="COD" />
      </td>
      <td className="p-1">
        <div className="flex items-center gap-1" style={{ paddingLeft: (linha.nivel - 1) * 12 }}>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onIndent(-1)} disabled={linha.nivel <= 1}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onIndent(1)} disabled={linha.nivel >= 5}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Input className={`h-7 text-xs ${linha.flag_negrito ? "font-bold" : ""}`} value={linha.descricao}
            onChange={(e) => onChange({ descricao: e.target.value })} />
        </div>
      </td>
      <td className="p-1 w-28">
        <Select value={linha.tipo_linha} onValueChange={(v) => onChange({ tipo_linha: v as any })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ANALITICA">ANALÍTICA</SelectItem>
            <SelectItem value="SUBTOTAL">SUBTOTAL</SelectItem>
            <SelectItem value="TOTAL">TOTAL</SelectItem>
            <SelectItem value="FORMULA">FÓRMULA</SelectItem>
            <SelectItem value="GRUPO">GRUPO</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="p-1 text-center">
        <Checkbox checked={linha.flag_totalizadora} onCheckedChange={(c) => onChange({ flag_totalizadora: !!c })} />
      </td>
      <td className="p-1 text-center">
        <Checkbox checked={linha.flag_negrito} onCheckedChange={(c) => onChange({ flag_negrito: !!c })} />
      </td>
      <td className="p-1 text-center">
        <Checkbox checked={linha.flag_inverte_sinal} onCheckedChange={(c) => onChange({ flag_inverte_sinal: !!c })} />
      </td>
      <td className="p-1 text-center">
        <Checkbox checked={linha.flag_exibe_dre} onCheckedChange={(c) => onChange({ flag_exibe_dre: !!c })} />
      </td>
      <td className="p-1 w-8">
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}

export function DreEstruturaEditor({ open, modeloId, onClose, onPublicado }: Props) {
  const [linhas, setLinhas] = useState<DreLinhaEditavel[]>([]);
  const [baseVersao, setBaseVersao] = useState<number | null>(null);
  const [temRascunho, setTemRascunho] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [podeOficial, setPodeOficial] = useState(false);
  const [snapshotsOpen, setSnapshotsOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const carregar = async () => {
    setLoading(true);
    try {
      const [rasc, oficial, pode] = await Promise.all([
        carregarDreRascunho(modeloId),
        carregarDreOficial(modeloId),
        podeEditarDreOficial(),
      ]);
      setPodeOficial(pode);
      if (rasc && rasc.linhas.length > 0) {
        setLinhas(rasc.linhas);
        setBaseVersao(rasc.base_versao);
        setTemRascunho(true);
      } else {
        setLinhas(oficial);
        setBaseVersao(null);
        setTemRascunho(false);
      }
      setDirty(false);
    } catch (e: any) { toast.error(e?.message || "Falha ao carregar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) carregar(); }, [open, modeloId]);

  const update = (idx: number, patch: Partial<DreLinhaEditavel>) => {
    setLinhas((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    setDirty(true);
  };
  const remover = (idx: number) => { setLinhas((prev) => prev.filter((_, i) => i !== idx)); setDirty(true); };
  const adicionar = () => { setLinhas((prev) => [...prev, novaLinha(prev.length)]); setDirty(true); };
  const indent = (idx: number, delta: -1 | 1) =>
    setLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, nivel: Math.max(1, Math.min(5, l.nivel + delta)) } : l));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLinhas((prev) => {
      const ids = prev.map((l, i) => l.id ?? `tmp-${i}`);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return prev;
      const arr = arrayMove(prev, from, to);
      return arr.map((l, i) => ({ ...l, ordem: i }));
    });
    setDirty(true);
  };

  const salvarRascunho = async () => {
    setSaving(true);
    try {
      const normalizadas = linhas.map((l, i) => ({ ...l, ordem: i }));
      await salvarDreRascunho(modeloId, normalizadas, baseVersao);
      setTemRascunho(true); setDirty(false);
      toast.success("Rascunho salvo");
    } catch (e: any) { toast.error(e?.message || "Falha ao salvar rascunho"); }
    finally { setSaving(false); }
  };

  const publicar = async () => {
    if (!podeOficial) return;
    if (!confirm("Publicar seu rascunho no modelo OFICIAL? Um backup automático da versão atual será criado.")) return;
    setPublishing(true);
    try {
      if (dirty) await salvarDreRascunho(modeloId, linhas.map((l, i) => ({ ...l, ordem: i })), baseVersao);
      await publicarDreRascunho(modeloId, baseVersao);
      toast.success("Publicado no modelo oficial");
      setTemRascunho(false); setDirty(false);
      onPublicado?.();
      onClose();
    } catch (e: any) { toast.error(e?.message || "Falha ao publicar"); }
    finally { setPublishing(false); }
  };

  const descartar = async () => {
    if (!confirm("Descartar seu rascunho e voltar para a estrutura oficial?")) return;
    await descartarDreRascunho(modeloId);
    setTemRascunho(false);
    await carregar();
    toast.success("Rascunho descartado");
  };

  const ids = useMemo(() => linhas.map((l, i) => l.id ?? `tmp-${i}`), [linhas]);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar estrutura da DRE
              {temRascunho && <Badge variant="secondary">Editando rascunho pessoal</Badge>}
              {!temRascunho && <Badge variant="outline">Cópia do oficial</Badge>}
              {dirty && <Badge variant="destructive">Não salvo</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 py-2 border-b">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={adicionar}><Plus className="h-3.5 w-3.5 mr-1" />Nova linha</Button>
              <Button size="sm" variant="outline" onClick={() => setSnapshotsOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />Versões salvas
              </Button>
              {temRascunho && (
                <Button size="sm" variant="ghost" onClick={descartar}>Descartar rascunho</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={salvarRascunho} disabled={saving || !dirty}>
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Salvando…" : "Salvar rascunho"}
              </Button>
              {podeOficial && (
                <Button size="sm" variant="default" onClick={publicar} disabled={publishing}>
                  <Upload className="h-3.5 w-3.5 mr-1" />{publishing ? "Publicando…" : "Publicar no oficial"}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded border">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />Carregando estrutura…
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="p-2 w-6"></th>
                      <th className="p-2 w-16">Código</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 w-28">Tipo</th>
                      <th className="p-2 w-16 text-center" title="Totalizadora">Total</th>
                      <th className="p-2 w-16 text-center" title="Negrito">Negrito</th>
                      <th className="p-2 w-16 text-center" title="Inverte sinal">Inv</th>
                      <th className="p-2 w-16 text-center" title="Exibir">Exibir</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                      {linhas.map((l, i) => (
                        <SortableRow
                          key={l.id ?? `tmp-${i}`}
                          linha={l}
                          idx={i}
                          onChange={(patch) => update(i, patch)}
                          onRemove={() => remover(i)}
                          onIndent={(d) => indent(i, d)}
                        />
                      ))}
                    </SortableContext>
                    {linhas.length === 0 && (
                      <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Nenhuma linha. Clique em "Nova linha".</td></tr>
                    )}
                  </tbody>
                </table>
              </DndContext>
            )}
          </div>

          <DialogFooter className="pt-2">
            <div className="text-[10px] text-muted-foreground mr-auto">
              {linhas.length} linhas · totais recalculam automaticamente na visualização após salvar/publicar
            </div>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SnapshotsDialog
        open={snapshotsOpen}
        onClose={() => setSnapshotsOpen(false)}
        title="Versões da estrutura da DRE"
        podeEditarOficial={podeOficial}
        listar={async () => (await listarDreSnapshots(modeloId)).map((s) => ({
          id: s.id, nome: s.nome, descricao: s.descricao, escopo: s.escopo,
          created_at: s.created_at, versao_origem: s.versao_origem,
        }))}
        salvar={async ({ nome, descricao, escopo }) => {
          await salvarDreSnapshot({ modeloId, nome, descricao, escopo, linhas, versaoOrigem: baseVersao });
        }}
        restaurar={async (id, destino) => {
          await restaurarDreSnapshot(id, destino);
          await carregar();
          onPublicado?.();
        }}
        excluir={excluirDreSnapshot}
      />
    </>
  );
}
