import { useEffect, useState } from 'react';
import { ReportList } from '@/components/relatorios/ReportList';
import { ReportEditor } from '@/components/relatorios/ReportEditor';
import { deleteRelatorio, duplicarRelatorio, listRelatorios, updateRelatorio } from '@/lib/relatorios/api';
import type { Relatorio } from '@/lib/relatorios/types';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';

export default function DesenvolvimentoRelatoriosPage() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  async function reload() {
    try {
      const data = await listRelatorios();
      setRelatorios(data);
    } catch (e: any) {
      toast.error(`Erro ao listar: ${e.message}`);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Desenvolvimento de Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Crie, edite e publique relatórios SQL para os módulos do sistema.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 h-[calc(100vh-180px)]">
        <Card className="p-4 overflow-hidden flex flex-col">
          <ReportList
            relatorios={relatorios}
            selectedId={selectedId}
            onSelect={(id) => { setSelectedId(id); setEditing(id); }}
            onNew={() => { setSelectedId(null); setEditing('new'); }}
            onDuplicate={async (id) => {
              try {
                const novo = await duplicarRelatorio(id);
                toast.success('Relatório duplicado');
                await reload();
                setSelectedId(novo.id);
                setEditing(novo.id);
              } catch (e: any) {
                toast.error(`Erro: ${e.message}`);
              }
            }}
            onPublicar={async (r) => {
              try {
                await updateRelatorio(r.id, { status: 'publicado' });
                toast.success('Relatório publicado');
                reload();
              } catch (e: any) { toast.error(e.message); }
            }}
            onInativar={async (r) => {
              try {
                await updateRelatorio(r.id, { status: 'inativo' });
                toast.success('Relatório inativado');
                reload();
              } catch (e: any) { toast.error(e.message); }
            }}
            onDelete={async (r) => {
              try {
                await deleteRelatorio(r.id);
                toast.success('Relatório excluído');
                if (selectedId === r.id) { setSelectedId(null); setEditing(null); }
                reload();
              } catch (e: any) { toast.error(`Erro ao excluir: ${e.message}`); }
            }}
          />
        </Card>

        <Card className="p-4 overflow-hidden flex flex-col">
          {editing ? (
            <ReportEditor
              key={editing}
              id={editing === 'new' ? null : editing}
              onClose={() => setEditing(null)}
              onSaved={reload}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Selecione um relatório ou clique em "Novo" para começar.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
