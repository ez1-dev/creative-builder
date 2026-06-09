import { useMemo, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PassagensLayoutGrid } from '@/components/passagens/PassagensLayoutGrid';
import { BlockHeader } from './BlockHeader';
import type { PassagensWidget } from '@/hooks/usePassagensLayout';
import type { DashboardBlock } from '@/hooks/useDashboardBlocks';

interface Props {
  blocks: DashboardBlock[];
  /** Widgets já com `blockId` resolvido (widgets pendentes podem ter blockId opcional). */
  widgets: (PassagensWidget & { blockId?: string | null; widgetId?: string | null })[];
  /** Mapa type -> ReactNode (igual ao `blocks` antigo do PassagensLayoutGrid). */
  renderMap: Record<string, ReactNode>;
  editing: boolean;
  onLayoutChange?: (next: { type: string; layout: { x: number; y: number; w: number; h: number } }[]) => void;
  onHide?: (type: string) => void;
  onConfigure?: (type: string) => void;
  configurableTypes?: string[];
  onDelete?: (type: string) => void;
  /** Ação ao clicar em "Adicionar componente" no header de um bloco. */
  onAddComponent?: (blockId: string) => void;
  /** Solicita mover um widget (por type) para outro bloco. */
  onMoveWidgetToBlock?: (type: string, blockId: string) => void;
  /** Block CRUD */
  onBlockCreate?: () => Promise<void> | void;
  onBlockRename?: (id: string, title: string) => Promise<void> | void;
  onBlockDelete?: (id: string) => Promise<void> | void;
  onBlockReorder?: (id: string, ordem: number) => Promise<void> | void;
}

/**
 * Renderiza N grids isolados — um por bloco — com cabeçalho próprio.
 *
 * REGRAS:
 * - Nenhum widget pode existir fora de um bloco. Widgets cujo `blockId` não corresponde a nenhum
 *   bloco conhecido vão para o primeiro bloco (fallback de segurança).
 * - Não há drag cross-bloco: cada `PassagensLayoutGrid` é isolado. Para trocar, o usuário usa
 *   o menu "Mover para…" no toolbar do componente.
 */
export function BlockedLayoutGrid({
  blocks,
  widgets,
  renderMap,
  editing,
  onLayoutChange,
  onHide,
  onConfigure,
  configurableTypes,
  onDelete,
  onAddComponent,
  onMoveWidgetToBlock,
  onBlockCreate,
  onBlockRename,
  onBlockDelete,
  onBlockReorder,
}: Props) {
  const fallbackBlockId = blocks[0]?.id ?? null;

  // Agrupa widgets por bloco — qualquer órfão cai no primeiro bloco.
  const widgetsByBlock = useMemo(() => {
    const map = new Map<string, typeof widgets>();
    blocks.forEach((b) => map.set(b.id, []));
    widgets.forEach((w) => {
      const bid = w.blockId && map.has(w.blockId) ? w.blockId : fallbackBlockId;
      if (!bid) return;
      if (!map.has(bid)) map.set(bid, []);
      map.get(bid)!.push(w);
    });
    return map;
  }, [blocks, widgets, fallbackBlockId]);

  // No layout change: o componente filho só emite layout dos widgets daquele bloco. Repassamos
  // para o pai, que mescla por type.
  const handleBlockLayoutChange = (blockId: string, items: { type: string; layout: any }[]) => {
    onLayoutChange?.(items);
  };

  const ordered = useMemo(() => [...blocks].sort((a, b) => a.ordem - b.ordem), [blocks]);

  return (
    <div className="space-y-4">
      {ordered.map((block, idx) => {
        const blockWidgets = widgetsByBlock.get(block.id) ?? [];
        const moveTargets = editing
          ? ordered.filter((b) => b.id !== block.id).map((b) => ({ id: b.id, title: b.title }))
          : undefined;
        return (
          <section key={block.id} className="rounded-lg border bg-card p-3 space-y-3">
            <BlockHeader
              title={block.title}
              count={blockWidgets.filter((w) => !w.hidden).length}
              editing={editing}
              canMoveUp={idx > 0}
              canMoveDown={idx < ordered.length - 1}
              onAddComponent={onAddComponent ? () => onAddComponent(block.id) : undefined}
              onRename={onBlockRename ? (next) => onBlockRename(block.id, next) : undefined}
              onDelete={
                onBlockDelete
                  ? async () => {
                      if (ordered.length === 1) {
                        toast.error('Não é possível excluir o único bloco do dashboard.');
                        return;
                      }
                      if (!confirm(`Excluir o bloco "${block.title}"? Os componentes serão movidos para outro bloco.`)) return;
                      try {
                        await onBlockDelete(block.id);
                        toast.success('Bloco excluído');
                      } catch (e: any) {
                        toast.error(e?.message ?? 'Erro ao excluir bloco');
                      }
                    }
                  : undefined
              }
              onMoveUp={onBlockReorder && idx > 0 ? () => onBlockReorder(block.id, ordered[idx - 1].ordem) : undefined}
              onMoveDown={
                onBlockReorder && idx < ordered.length - 1
                  ? () => onBlockReorder(block.id, ordered[idx + 1].ordem)
                  : undefined
              }
            />
            {blockWidgets.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum componente neste bloco.
                {editing && onAddComponent && (
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => onAddComponent(block.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar componente
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <PassagensLayoutGrid
                widgets={blockWidgets}
                blocks={renderMap}
                editing={editing}
                onLayoutChange={(items) => handleBlockLayoutChange(block.id, items)}
                onHide={onHide}
                onConfigure={onConfigure}
                configurableTypes={configurableTypes}
                onDelete={onDelete}
                moveTargets={moveTargets}
                onMoveToBlock={onMoveWidgetToBlock}
              />
            )}
          </section>
        );
      })}
      {editing && onBlockCreate && (
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            try {
              await onBlockCreate();
              toast.success('Bloco criado');
            } catch (e: any) {
              toast.error(e?.message ?? 'Erro ao criar bloco');
            }
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar novo bloco
        </Button>
      )}
    </div>
  );
}
