import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, ChevronRight, ChevronLeft, Save, Upload, RotateCcw, Loader2 } from "lucide-react";
import {
  carregarBalancoOficial, carregarBalancoRascunho, salvarBalancoRascunho, descartarBalancoRascunho, publicarBalancoRascunho,
  listarBalancoSnapshots, salvarBalancoSnapshot, restaurarBalancoSnapshot, excluirBalancoSnapshot, podeEditarBalancoOficial,
  type BalancoLinhaEditavel,
} from "@/lib/contabil/estruturaEdicaoApi";
import { SnapshotsDialog } from "./SnapshotsDialog";

interface Props { open: boolean; onClose: () => void; onPublicado?: () => void; }

const novaLinha = (ordem: number): BalancoLinhaEditavel => ({
  ordem, mascara: "", descricao: "Nova linha", nivel: 1, sinal: 1, totalizadora: false, ativo: true,
});

function Row({ linha, idx, onChange, onRemove, onIndent }: {
  linha: BalancoLinhaEditavel; idx: number;
  onChange: (p: Partial<BalancoLinhaEditavel>) => void;
  onRemove: () => void;
  onIndent: (d: -1 | 1) => void;
}) {
  const key = linha.id ?? `tmp-${idx}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <tr ref={setNodeRef} style={style} className={`border-t hover:bg-accent/20 ${!linha.ativo ? "opacity-50" : ""}`}>
      <td className="p-1 w-6 cursor-grab" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </td>
      <td className="p-1 w-24">
        <Input className="h-7 text-xs font-mono" value={linha.mascara}
          onChange={(e) => onChange({ mascara: e.target.value })} placeholder="1.1.01" />
      </td>
      <td className="p-1">
        <div className="flex items-center gap-1" style={{ paddingLeft: (linha.nivel - 1) * 12 }}>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onIndent(-1)} disabled={linha.nivel <= 1}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onIndent(1)} disabled={linha.nivel >= 5}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Input className="h-7 text-xs" value={linha.descricao} onChange={(e) => onChange({ descricao: e.target.value })} />
        </div>
      </td>
      <td className="p-1 w-20 text-center">
        <Input className="h-7 text-xs text-center" type="number" value={linha.sinal}
          onChange={(e) => onChange({ sinal: Number(e.target.value) || 1 })} />
      </td>
      <td className="p-1 w-20 text-center">
        <Checkbox checked={linha.totalizadora} onCheckedChange={(c) => onChange({ totalizadora: !!c })} />
      </td>
      <td className="p-1 w-16 text-center">
        <Checkbox checked={linha.ativo} onCheckedChange={(c) => onChange({ ativo: !!c })} />
      </td>
      <td className="p-1 w-8">
        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </td>
    </tr>
  );
}

export function BalancoEstruturaEditor({ open, onClose, onPublicado }: Props) {
  const [linhas, setLinhas] = useState<BalancoLinhaEditavel[]>([]);
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
        carregarBalancoRascunho(), carregarBalancoOficial(), podeEditarBalancoOficial(),
      ]);
      setPodeOficial(pode);
      if (rasc && rasc.length > 0) { setLinhas(rasc); setTemRascunho(true); }
      else { setLinhas(oficial); setTemRascunho(false); }
      setDirty(false);
    } catch (e: any) { toast.error(e?.message || "Falha ao carregar"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (open) carregar(); }, [open]);

  const update = (i: number, p: Partial<BalancoLinhaEditavel>) => {
    setLinhas((prev) => prev.map((l, idx) => idx === i ? { ...l, ...p } : l)); setDirty(true);
  };
  const remover = (i: number) => { setLinhas((p) => p.filter((_, idx) => idx !== i)); setDirty(true); };
  const adicionar = () => { setLinhas((p) => [...p, novaLinha(p.length)]); setDirty(true); };
  const indent = (i: number, d: -1 | 1) =>
    setLinhas((p) => p.map((l, idx) => idx === i ? { ...l, nivel: Math.max(1, Math.min(5, l.nivel + d)) } : l));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setLinhas((prev) => {
      const ids = prev.map((l, i) => l.id ?? `tmp-${i}`);
      const from = ids.indexOf(String(active.id)); const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to).map((l, i) => ({ ...l, ordem: i }));
    });
    setDirty(true);
  };

  const salvarRascunho = async () => {
    setSaving(true);
    try {
      await salvarBalancoRascunho(linhas.map((l, i) => ({ ...l, ordem: i })));
      setTemRascunho(true); setDirty(false); toast.success("Rascunho salvo");
    } catch (e: any) { toast.error(e?.message || "Falha ao salvar rascunho"); }
    finally { setSaving(false); }
  };
  const publicar = async () => {
    if (!podeOficial) return;
    if (!confirm("Publicar rascunho no BALANÇO OFICIAL? Backup automático será criado.")) return;
    setPublishing(true);
    try {
      if (dirty) await salvarBalancoRascunho(linhas.map((l, i) => ({ ...l, ordem: i })));
      await publicarBalancoRascunho();
      toast.success("Publicado"); setTemRascunho(false); setDirty(false);
      onPublicado?.(); onClose();
    } catch (e: any) { toast.error(e?.message || "Falha ao publicar"); }
    finally { setPublishing(false); }
  };
  const descartar = async () => {
    if (!confirm("Descartar rascunho?")) return;
    await descartarBalancoRascunho(); setTemRascunho(false); await carregar(); toast.success("Descartado");
  };

  const ids = useMemo(() => linhas.map((l, i) => l.id ?? `tmp-${i}`), [linhas]);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar estrutura do Balanço
              {temRascunho && <Badge variant="secondary">Rascunho pessoal</Badge>}
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
              {temRascunho && <Button size="sm" variant="ghost" onClick={descartar}>Descartar</Button>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={salvarRascunho} disabled={saving || !dirty}>
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Salvando…" : "Salvar rascunho"}
              </Button>
              {podeOficial && (
                <Button size="sm" onClick={publicar} disabled={publishing}>
                  <Upload className="h-3.5 w-3.5 mr-1" />{publishing ? "Publicando…" : "Publicar no oficial"}
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded border">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="inline h-4 w-4 animate-spin mr-2" />Carregando…
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="p-2 w-6"></th>
                      <th className="p-2 w-24">Máscara</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 w-20 text-center">Sinal</th>
                      <th className="p-2 w-20 text-center">Total</th>
                      <th className="p-2 w-16 text-center">Ativo</th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                      {linhas.map((l, i) => (
                        <Row key={l.id ?? `tmp-${i}`} linha={l} idx={i}
                          onChange={(p) => update(i, p)} onRemove={() => remover(i)} onIndent={(d) => indent(i, d)} />
                      ))}
                    </SortableContext>
                    {linhas.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma linha.</td></tr>
                    )}
                  </tbody>
                </table>
              </DndContext>
            )}
          </div>

          <DialogFooter className="pt-2">
            <div className="text-[10px] text-muted-foreground mr-auto">{linhas.length} linhas</div>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SnapshotsDialog
        open={snapshotsOpen}
        onClose={() => setSnapshotsOpen(false)}
        title="Versões da estrutura do Balanço"
        podeEditarOficial={podeOficial}
        listar={async () => (await listarBalancoSnapshots()).map((s) => ({
          id: s.id, nome: s.nome, descricao: s.descricao, escopo: s.escopo, created_at: s.created_at,
        }))}
        salvar={async ({ nome, descricao, escopo }) => {
          await salvarBalancoSnapshot({ nome, descricao, escopo, linhas });
        }}
        restaurar={async (id, destino) => {
          await restaurarBalancoSnapshot(id, destino);
          await carregar(); onPublicado?.();
        }}
        excluir={excluirBalancoSnapshot}
      />
    </>
  );
}
