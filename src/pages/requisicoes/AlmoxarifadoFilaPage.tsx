import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useFilaAlmox } from '@/hooks/requisicoes';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/requisicoes/StatusBadge';

export default function AlmoxarifadoFilaPage() {
  const fila = useFilaAlmox();
  return (
    <div className="space-y-4">
      <PageHeader title="Fila do almoxarifado" description="Requisições com OP, avulsas, transferências, emergenciais e pendências de saldo." />
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requisição</TableHead>
              <TableHead>Componente (CODCMP)</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>OP</TableHead>
              <TableHead className="text-right">Solicit.</TableHead>
              <TableHead className="text-right">Aprov.</TableHead>
              <TableHead className="text-right">Separada</TableHead>
              <TableHead className="text-right">Atendida</TableHead>
              <TableHead className="text-right">Pendente</TableHead>
              <TableHead>Dep. Orig.</TableHead>
              <TableHead>Dep. Dest.</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Separando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fila.isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 14 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-14" /></TableCell>)}</TableRow>
            ))}
            {!fila.isLoading && (fila.data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={14} className="py-8 text-center text-sm text-muted-foreground">Nenhum item na fila.</TableCell></TableRow>
            )}
            {!fila.isLoading && fila.data?.map((f) => (
              <TableRow key={`${f.requisicao_id}-${f.item_seq}`}>
                <TableCell>{f.requisicao_numero}</TableCell>
                <TableCell className="font-mono text-xs">{f.codcmp}</TableCell>
                <TableCell>{f.descricao ?? '—'}</TableCell>
                <TableCell>{f.op ?? '—'}</TableCell>
                <TableCell className="text-right">{f.qtd_solicitada}</TableCell>
                <TableCell className="text-right">{f.qtd_aprovada}</TableCell>
                <TableCell className="text-right">{f.qtd_separada}</TableCell>
                <TableCell className="text-right">{f.qtd_atendida}</TableCell>
                <TableCell className="text-right">{f.qtd_pendente}</TableCell>
                <TableCell>{f.deposito_origem ?? '—'}</TableCell>
                <TableCell>{f.deposito_destino ?? '—'}</TableCell>
                <TableCell>{f.prioridade}</TableCell>
                <TableCell>{f.prazo ? new Date(f.prazo).toLocaleString('pt-BR') : '—'}</TableCell>
                <TableCell>{f.separacao_por ?? <span className="text-muted-foreground">livre</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Card><CardContent className="p-3 text-xs text-muted-foreground">
        Ações (assumir separação, reservar, separar, atender total/parcial, transferir, baixar OP,
        registrar falta, enviar para compras, cancelar saldo, estornar) chegam na Fase 3.
      </CardContent></Card>
    </div>
  );
}
