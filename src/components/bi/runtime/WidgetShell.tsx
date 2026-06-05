/**
 * Wrapper genérico que aplica `WidgetOptions` de aparência/layout em torno
 * do conteúdo renderizado por `BiComponentDef.render`. Aplica:
 * - cor de destaque (border lateral)
 * - variante (ghost / gradient)
 * - altura mínima
 * - rodapé com nota/fonte
 *
 * `density`, `hideTitle`, `subtitle`, `valueFormat`, `icon`, `topN`, `sort`,
 * `meta`, `comparacao` são propagados via `options` ao componente interno
 * (que decide como aplicar).
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  type WidgetOptions, colorAccentClass, heightClass, colorCss,
} from '@/lib/bi/widgetOptions';

export function WidgetShell({
  options, children,
}: {
  options?: WidgetOptions;
  children: ReactNode;
}) {
  const o = options ?? {};
  const accent = colorAccentClass(o.color);
  const variant = o.variant ?? 'solid';
  const isGradient = variant === 'gradient';
  const isGhost = variant === 'ghost';
  const isOutline = variant === 'outline';

  const wrapperCls = cn(
    'group/widget-shell relative flex h-full flex-col rounded-md',
    accent ? `border-l-4 ${accent}` : '',
    isOutline && 'ring-1 ring-border',
    isGhost && 'bg-muted/30',
    heightClass(o.height),
  );

  const wrapperStyle = isGradient
    ? { background: `linear-gradient(135deg, ${colorCss(o.color)}10, transparent 60%)` }
    : undefined;

  return (
    <div className={wrapperCls} style={wrapperStyle}>
      <div className="flex-1 min-h-0 [&>*]:h-full">{children}</div>
      {o.footerNote && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50 italic">
          {o.footerNote}
        </div>
      )}
    </div>
  );
}
