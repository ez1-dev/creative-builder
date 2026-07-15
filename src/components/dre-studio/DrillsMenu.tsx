import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Building2,
  BookOpen,
  FileText,
  Receipt,
  Landmark,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import {
  agruparDrillsMenu,
  normalizarDrillsMenu,
  possuiDrill,
  type DrillMenuItem,
  type LinhaDrillContract,
} from '@/lib/contabil/drillsMenu';

interface Props {
  linha: LinhaDrillContract;
  onSelect: (item: DrillMenuItem) => void;
  disabled?: boolean;
}

function iconFor(agruparPor?: string) {
  const v = String(agruparPor ?? '').toLowerCase();
  if (v === 'centro_custo' || v === 'ccu' || v === 'centro_de_custo' || v === 'centro') return Building2;
  if (v === 'conta' || v === 'conta_contabil') return BookOpen;
  if (v === 'historico' || v === 'hist') return FileText;
  if (v === 'lancamento' || v === 'lct' || v === 'lancto') return Receipt;
  if (v === 'unidade_negocio' || v === 'unidade' || v === 'un') return Landmark;
  return MoreHorizontal;
}

export function DrillsMenu({ linha, onSelect, disabled }: Props) {
  if (!possuiDrill(linha)) return null;
  const grupos = agruparDrillsMenu(normalizarDrillsMenu(linha));
  if (grupos.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          aria-label="Abrir menu de drill"
          title="Drill-down"
        >
          <Search className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[240px]">
        {grupos.map(({ grupo, itens }, gi) => (
          <div key={grupo}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {grupo}
            </DropdownMenuLabel>
            {itens.map((it, i) => {
              const Icon = iconFor(it.agrupar_por);
              const label = it.label || it.agrupar_por || it.chave || 'Item';
              return (
                <DropdownMenuItem
                  key={`${grupo}-${i}-${it.agrupar_por ?? it.chave ?? label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(it);
                  }}
                  className="gap-2 text-sm"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
