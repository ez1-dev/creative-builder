/**
 * Wrapper que aplica cor de fonte e/ou negrito ao TÍTULO do widget renderizado.
 *
 * Não interfere quando nenhuma personalização foi definida (mantém estilos
 * originais do Card/Kpi). A correspondência com o título é feita via CSS
 * em `src/index.css` usando `[data-widget-title-style]` como escopo.
 */
import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type WidgetTitleColorPreset =
  | 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';

const PRESET_HSL: Record<WidgetTitleColorPreset, string | null> = {
  default: null,
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
  info: 'hsl(var(--info, 215 70% 45%))',
  muted: 'hsl(var(--muted-foreground))',
};

export const TITLE_COLOR_PRESETS: { key: WidgetTitleColorPreset; label: string; swatch: string }[] = [
  { key: 'default',     label: 'Padrão',    swatch: 'hsl(var(--foreground))' },
  { key: 'primary',     label: 'Primária',  swatch: 'hsl(var(--primary))' },
  { key: 'success',     label: 'Sucesso',   swatch: 'hsl(var(--success, 142 70% 40%))' },
  { key: 'warning',     label: 'Atenção',   swatch: 'hsl(var(--warning, 38 92% 50%))' },
  { key: 'destructive', label: 'Crítico',   swatch: 'hsl(var(--destructive))' },
  { key: 'info',        label: 'Info',      swatch: 'hsl(var(--info, 215 70% 45%))' },
  { key: 'muted',       label: 'Discreto',  swatch: 'hsl(var(--muted-foreground))' },
];

export function resolveTitleColor(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value in PRESET_HSL) return PRESET_HSL[value as WidgetTitleColorPreset];
  // Aceita hex / rgb / hsl / var() literalmente.
  return value;
}

interface Props {
  color?: string | null;
  bold?: boolean | null;
  children: ReactNode;
}

export function WidgetTitleStyle({ color, bold, children }: Props) {
  const resolved = resolveTitleColor(color);
  const hasStyle = !!resolved || !!bold;
  if (!hasStyle) return <>{children}</>;
  const style: CSSProperties & Record<string, string> = {};
  if (resolved) style['--widget-title-color'] = resolved;
  return (
    <div
      data-widget-title-style
      className={cn('contents', bold && 'widget-title-bold')}
      style={style}
    >
      {children}
    </div>
  );
}
