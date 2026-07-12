import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { DreHealthBanner } from '@/components/dre-studio/DreHealthBanner';
import { DreModelTree } from '@/components/dre-studio/DreModelTree';
import { DreLineForm } from '@/components/dre-studio/DreLineForm';
import { DreAccountSelector } from '@/components/dre-studio/DreAccountSelector';
import {
  useDreStudioModelo, useCriarLinha, useAtualizarLinha, useExcluirLinha,
} from '@/hooks/contabil/useDreStudio';
import { toast } from 'sonner';
import type { DreLinha } from '@/lib/contabil/dreStudioTypes';

export default function DreStudioModeloEditorPage() {
  const { modeloId = '' } = useParams();
  const nav = useNavigate();
  const modeloQ = useDreStudioModelo(modeloId);
  const criar = useCriarLinha(modeloId);
  const atualizar = useAtualizarLinha(modeloId);
  const excluir = useExcluirLinha(modeloId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const linhas = modeloQ.data?.linhas ?? [];
  const selected = useMemo(() => linhas.find((l) => l.id === selectedId) ?? null, [linhas, selectedId]);

  const handleAddChild = async (parentId: string | null) => {
    try {
      const ordem = (linhas.filter((l) => l.linha_pai_id === parentId).reduce((m, l) => Math.max(m, l.ordem ?? 0), 0)) + 10;
      const nova = await criar.mutateAsync({
        linha_pai_id: parentId,
        ordem,
        codigo: `LINHA_${Date.now().toString().slice(-6)}`,
        descricao: 'Nova linha',
        tipo_linha: 'ANALITICA',
        natureza: 'OUTROS',
        operador: 'SOMA',
        sinal: 1,
        exibir: true,
        negrito: false,
        formula: null,
      });
      setSelectedId(nova.id);
      toast.success('Linha adicionada.');
    } catch (e: any) { toast.error(e?.message ?? 'Falha ao adicionar linha.'); }
  };

  const handleSaveLinha = async (patch: Partial<DreLinha>) => {
    if (!selected) return;
    try { await atualizar.mutateAsync({ id: selected.id, patch }); toast.success('Linha atualizada.'); }
    catch (e: any) { toast.error(e?.message ?? 'Falha ao salvar linha.'); }
  };

  const handleDeleteLinha = async (id: string) => {
    try {
      await excluir.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
      toast.success('Linha excluída.');
    } catch (e: any) { toast.error(e?.message ?? 'Falha ao excluir.'); }
  };

  if (modeloQ.isFetching && !modeloQ.data) {
    return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando modelo…</div>;
  }
  if (modeloQ.error) {
    return <div className="p-6 text-sm text-destructive">{(modeloQ.error as any)?.message ?? 'Erro ao carregar modelo.'}</div>;
  }
  if (!modeloQ.data) return null;

  const modelo = modeloQ.data.modelo;

  return (
    <div className="p-4 space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <Button size="sm" variant="ghost" onClick={() => nav('/contabilidade/dre-studio/modelos')} className="gap-1 -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Modelos
          </Button>
          <h1 className="text-lg font-semibold">{modelo.nome}</h1>
          <p className="text-xs text-muted-foreground">{modelo.tipo_modelo} · empresa {modelo.codemp} · {linhas.length} linha(s)</p>
        </div>
      </div>

      <DreHealthBanner />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-3 flex-1 min-h-0">
        <Card className="p-0 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-semibold">Estrutura</span>
            <Button size="sm" variant="ghost" className="h-6 gap-1" onClick={() => handleAddChild(null)}>
              <Plus className="h-3 w-3" /> Raiz
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <DreModelTree
              linhas={linhas}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddChild={handleAddChild}
              onDelete={handleDeleteLinha}
            />
          </div>
        </Card>

        <Card className="p-0 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b bg-muted/30">
            <span className="text-xs font-semibold">Atributos da linha</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DreLineForm
              linha={selected}
              linhasPai={linhas}
              onSave={handleSaveLinha}
              saving={atualizar.isPending}
            />
          </div>
        </Card>

        <Card className="p-0 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b bg-muted/30">
            <span className="text-xs font-semibold">Contas vinculadas</span>
          </div>
          <div className="flex-1 min-h-0">
            <DreAccountSelector
              modeloId={modeloId}
              linha={selected}
              codemp={modelo.codemp}
              tipoModelo={modelo.tipo_modelo}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
