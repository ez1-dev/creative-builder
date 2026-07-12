import { DataTableBI, type Column } from '@/components/bi';
import { formatCurrency } from '@/components/bi';
import type { DreRealizadoMensalRow } from '@/lib/bi/dreConfiguravelTypes';

function formatAnomes(anomes: string): string {
  if (!anomes || anomes.length < 6) return anomes || '-';
  return `${anomes.slice(4, 6)}/${anomes.slice(0, 4)}`;
}

export interface DreMensalTableProps {
  data: DreRealizadoMensalRow[];
  loading?: boolean;
  onSelecionarMes?: (anomes: string) => void;
}

export function DreMensalTable({ data, loading, onSelecionarMes }: DreMensalTableProps) {
  const columns: Column<DreRealizadoMensalRow>[] = [
    {
      key: 'anomes',
      header: 'ANOMES',
      align: 'left',
      render: (v) => <span className="font-medium tabular-nums">{formatAnomes(String(v))}</span>,
    },
    { key: 'receita_operacional', header: 'Receita Operacional', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'receita_bruta', header: 'Receita Bruta', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'deducoes', header: 'Deduções', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'custos', header: 'Custos', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'despesas', header: 'Despesas', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'receitas_nao_operacionais', header: 'Rec. Não Operacionais', align: 'right', render: (v) => formatCurrency(v) },
    {
      key: 'resultado_dre',
      header: 'Resultado DRE',
      align: 'right',
      render: (v) => (
        <span className={Number(v) >= 0 ? 'text-[hsl(var(--success,142_71%_35%))] font-semibold' : 'text-[hsl(var(--destructive))] font-semibold'}>
          {formatCurrency(v)}
        </span>
      ),
    },
  ];

  return (
    <DataTableBI<DreRealizadoMensalRow>
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="Sem lançamentos no período"
      onRowClick={(row) => {
        // TODO: abrir drill-down por conta (Tela 2) usando GET /api/contabil/realizado/contas
        console.log('[DRE CONFIGURAVEL] selecionar mês', row.anomes);
        onSelecionarMes?.(row.anomes);
      }}
    />
  );
}
