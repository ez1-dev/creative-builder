import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors, closestCenter,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  ChevronDown, ChevronRight, Pencil, Trash2, GripVertical,
  Layers, Sigma, FileText, Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LinhaModelo, TipoLinha } from "@/types/contabil";
import { cn } from "@/lib/utils";

export type EstruturaTreeHandle = {
  expand: (id: string) => void;
  expandAll: () => void;
};

const ACCEPTS_CHILDREN: Record<TipoLinha, boolean> = {
  GRUPO: true,
  SUBTOTAL: true,
  TOTAL: true,
  FORMULA: true,
  ANALITICA: false,
};

const tipoIcon = (t: TipoLinha) => {
  switch (t) {
    case "GRUPO": return <Layers className="h-3.5 w-3.5 text-slate-500" />;
    case "ANALITICA": return <FileText className="h-3.5 w-3.5 text-sky-600" />;
    case "SUBTOTAL": return <Sigma className="h-3.5 w-3.5 text-amber-600" />;
    case "TOTAL": return <Sigma className="h-3.5 w-3.5 text-emerald-700" />;
    case "FORMULA": return <Calculator className="h-3.5 w-3.5 text-violet-600" />;
  }
};

type Zone = "before" | "into" | "after";
type DropTarget = { linhaId: string; zone: Zone };

function parseDropId(id: string): DropTarget | null {
  // dropzone-{zone}-{linhaId} or "root-end"
  if (id === "root-end") return { linhaId: "__root__", zone: "after" };
  const m = id.match(/^dropzone-(before|into|after)-(.+)$/);
  if (!m) return null;
  return { linhaId: m[2], zone: m[1] as Zone };
}

function isDescendant(
  candidateAncestorId: string,
  nodeId: string,
  parentOf: Map<string, string | null>,
): boolean {
  let cur: string | null | undefined = nodeId;
  while (cur) {
    if (cur === candidateAncestorId) return true;
    cur = parentOf.get(cur);
  }
  return false;
}

export type ReorderUpdate = { id: string; linha_pai_id: string | null; ordem: number };

export const EstruturaTree = forwardRef<EstruturaTreeHandle, {
  linhas: LinhaModelo[];
  contas: Array<{ linha_id: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (l: LinhaModelo) => void;
  onDelete: (id: string) => void;
  onReorder: (updates: ReorderUpdate[]) => void;
}>(function EstruturaTree({
  linhas,
  contas,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
}, ref) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const didInitialExpand = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const childrenOf = useMemo(() => {
    const m = new Map<string | null, LinhaModelo[]>();
    for (const l of linhas) {
      const k = l.linha_pai_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(l);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.ordem - b.ordem);
    return m;
  }, [linhas]);

  const parentOf = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const l of linhas) m.set(l.id, l.linha_pai_id);
    return m;
  }, [linhas]);

  const byId = useMemo(() => new Map(linhas.map((l) => [l.id, l])), [linhas]);

  const parentIdsWithChildren = useMemo(() => {
    const s = new Set<string>();
    for (const l of linhas) {
      if (l.linha_pai_id) s.add(l.linha_pai_id);
    }
    return s;
  }, [linhas]);

  useEffect(() => {
    if (!didInitialExpand.current && linhas.length > 0) {
      didInitialExpand.current = true;
      setExpanded(new Set(parentIdsWithChildren));
    }
  }, [linhas.length, parentIdsWithChildren]);

  useImperativeHandle(ref, () => ({
    expand: (id: string) => setExpanded((p) => {
      if (p.has(id)) return p;
      const n = new Set(p);
      n.add(id);
      return n;
    }),
    expandAll: () => setExpanded(new Set(parentIdsWithChildren)),
  }), [parentIdsWithChildren]);

  const toggle = (k: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const draggedId = String(active.id);
    const target = parseDropId(String(over.id));
    if (!target) return;

    let newParent: string | null;
    let referenceList: LinhaModelo[];
    let insertIndex: number;

    if (target.linhaId === "__root__") {
      newParent = null;
      referenceList = childrenOf.get(null) ?? [];
      insertIndex = referenceList.length;
    } else {
      const targetLinha = byId.get(target.linhaId);
      if (!targetLinha) return;
      if (target.zone === "into") {
        if (!ACCEPTS_CHILDREN[targetLinha.tipo_linha]) return;
        newParent = targetLinha.id;
        referenceList = childrenOf.get(newParent) ?? [];
        insertIndex = referenceList.length;
      } else {
        newParent = targetLinha.linha_pai_id;
        referenceList = childrenOf.get(newParent) ?? [];
        const idx = referenceList.findIndex((l) => l.id === target.linhaId);
        insertIndex = target.zone === "before" ? idx : idx + 1;
      }
    }

    // Bloquear ciclos: não mover um nó para dentro de si ou de seus descendentes.
    if (newParent && isDescendant(draggedId, newParent, parentOf)) return;

    // Reconstrói a lista de irmãos do destino sem o item arrastado.
    const filtered = referenceList.filter((l) => l.id !== draggedId);
    // Ajusta insertIndex caso o item esteja na própria lista antes do alvo.
    let finalIndex = insertIndex;
    if (referenceList === (childrenOf.get(newParent) ?? [])) {
      const draggedIdxInList = referenceList.findIndex((l) => l.id === draggedId);
      if (draggedIdxInList !== -1 && draggedIdxInList < insertIndex) {
        finalIndex = insertIndex - 1;
      }
    }
    filtered.splice(finalIndex, 0, byId.get(draggedId)!);

    const updates: ReorderUpdate[] = [];
    filtered.forEach((l, i) => {
      const newOrdem = i;
      if (l.id === draggedId) {
        if (l.linha_pai_id !== newParent || l.ordem !== newOrdem) {
          updates.push({ id: l.id, linha_pai_id: newParent, ordem: newOrdem });
        }
      } else if (l.ordem !== newOrdem) {
        updates.push({ id: l.id, linha_pai_id: newParent, ordem: newOrdem });
      }
    });

    // Se mudou de pai, reordena também os antigos irmãos remanescentes.
    const draggedOld = byId.get(draggedId)!;
    if (draggedOld.linha_pai_id !== newParent) {
      const oldSiblings = (childrenOf.get(draggedOld.linha_pai_id) ?? []).filter(
        (l) => l.id !== draggedId,
      );
      oldSiblings.forEach((l, i) => {
        if (l.ordem !== i) {
          updates.push({ id: l.id, linha_pai_id: draggedOld.linha_pai_id, ordem: i });
        }
      });
    }

    if (updates.length > 0) {
      // Garante expandido o novo pai para feedback visual
      if (newParent) setExpanded((p) => new Set(p).add(newParent!));
      onReorder(updates);
    }
  };

  const renderNode = (l: LinhaModelo, depth: number): React.ReactNode => {
    const children = childrenOf.get(l.id) ?? [];
    const isOpen = expanded.has(l.id);
    const isSelected = selectedId === l.id;
    const contaCount = contas.filter((c) => c.linha_id === l.id).length;
    const accepts = ACCEPTS_CHILDREN[l.tipo_linha];
    const isDragging = activeId === l.id;

    return (
      <div key={l.id} className={isDragging ? "opacity-40" : undefined}>
        <DropZone id={`dropzone-before-${l.id}`} depth={depth} />
        <NodeRow
          linha={l}
          depth={depth}
          isOpen={isOpen}
          isSelected={isSelected}
          hasChildren={children.length > 0}
          contaCount={contaCount}
          accepts={accepts}
          onToggle={() => toggle(l.id)}
          onSelect={() => onSelect(l.id)}
          onEdit={() => onEdit(l)}
          onDelete={() => onDelete(l.id)}
        />
        {isOpen && children.map((c) => renderNode(c, depth + 1))}
        {/* "after" só no último filho do nível para evitar ambiguidade */}
        <DropZone id={`dropzone-after-${l.id}`} depth={depth} hidden />
      </div>
    );
  };

  const roots = childrenOf.get(null) ?? [];
  // Fallback de indentação visual: quando todas as linhas são raízes
  // (caso típico do Balanço Padrão Senior recém-importado, antes do usuário
  // organizar via drag-and-drop), deriva a profundidade a partir do código
  // contábil (ex.: "1.1.01" => depth 2).
  const allFlat = linhas.length > 0 && roots.length === linhas.length;
  const depthFromCodigo = (codigo: string): number => {
    if (!codigo) return 0;
    return Math.max(0, codigo.split(".").length - 1);
  };

  const activeLinha = activeId ? byId.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div>
        {roots.map((l) =>
          renderNode(l, allFlat ? depthFromCodigo(l.codigo) : 0),
        )}
        <RootEndZone />
      </div>

      <DragOverlay>
        {activeLinha && (
          <div className="bg-white border rounded shadow-md px-3 py-1.5 text-sm flex items-center gap-2">
            {tipoIcon(activeLinha.tipo_linha)}
            <span className="font-mono text-xs text-slate-500">{activeLinha.codigo}</span>
            <span className={cn(activeLinha.negrito && "font-semibold")}>
              {activeLinha.descricao}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
});

function DropZone({ id, depth, hidden }: { id: string; depth: number; hidden?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ paddingLeft: depth * 16 + 8 }}
      className={cn(
        "h-1.5 -my-0.5 transition-colors",
        hidden && !isOver ? "h-0" : "",
        isOver && "bg-sky-400 h-1.5 rounded",
      )}
    />
  );
}

function RootEndZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "root-end" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-8 mt-1 rounded border border-dashed text-[11px] flex items-center justify-center transition-colors",
        isOver ? "border-sky-400 bg-sky-50 text-sky-700" : "border-transparent text-slate-300",
      )}
    >
      Arraste para o final da raiz
    </div>
  );
}

function NodeRow({
  linha: l, depth, isOpen, isSelected, hasChildren, contaCount, accepts,
  onToggle, onSelect, onEdit, onDelete,
}: {
  linha: LinhaModelo;
  depth: number;
  isOpen: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  contaCount: number;
  accepts: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef: setDragRef } = useDraggable({ id: l.id });
  const { setNodeRef: setIntoRef, isOver: isOverInto } = useDroppable({
    id: `dropzone-into-${l.id}`,
    disabled: !accepts,
  });

  // Compose refs
  const setRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setIntoRef(node);
  };

  return (
    <div
      ref={setRef}
      className={cn(
        "group flex items-center gap-1 py-1 pr-2 text-sm cursor-pointer border-l-2",
        isSelected
          ? "bg-sky-50 border-sky-500"
          : "border-transparent hover:bg-slate-50",
        isOverInto && accepts && "bg-emerald-50 ring-1 ring-emerald-300",
      )}
      style={{ paddingLeft: depth * 16 + 8 }}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700"
        onClick={(e) => e.stopPropagation()}
        aria-label="Arrastar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {hasChildren ? (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="p-0.5"
        >
          {isOpen
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />}
        </button>
      ) : <span className="w-4" />}
      {tipoIcon(l.tipo_linha)}
      <span className="font-mono text-xs text-slate-500">{l.codigo}</span>
      <span className={cn("truncate", l.negrito && "font-semibold")}>
        {l.descricao}
      </span>
      <span className="text-xs text-slate-400 ml-1">{l.sinal === -1 ? "−" : "+"}</span>
      {contaCount > 0 && (
        <Badge variant="outline" className="ml-1 h-4 text-[10px]">{contaCount}</Badge>
      )}
      <div className="ml-auto opacity-0 group-hover:opacity-100 flex gap-0.5">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-3 w-3 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
