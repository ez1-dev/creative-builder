/**
 * Wrapper minimalista que adiciona PageDataProvider (com dados vazios)
 * + os 3 slots padrão (kpis, charts, tables) ao final de uma página.
 *
 * Usado em páginas que ainda não publicam dados via PageDataProvider, para
 * que o usuário consiga aplicar componentes da Biblioteca BI em qualquer tela.
 */
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { UserWidgetsSlot } from '@/components/bi';

export function BiAutoSlots({ pageKey }: { pageKey: string }) {
  return (
    <PageDataProvider pageKey={pageKey}>
      <div className="space-y-4 mt-4">
        <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />
        <UserWidgetsSlot section="charts" cols={3} emptyHint={false} />
        <UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
      </div>
    </PageDataProvider>
  );
}
