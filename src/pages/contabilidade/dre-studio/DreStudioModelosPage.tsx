import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Power, Trash2, Landmark } from 'lucide-react';
import { DreHealthBanner } from '@/components/dre-studio/DreHealthBanner';
import {
  useDreStudioModelos, useAtualizarModelo, useExcluirModelo,
} from '@/hooks/contabil/useDreStudio';
import { toast } from 'sonner';

export default function DreStudioModelosPage() {
  const nav = useNavigate();
  const [codemp, setCodemp] = useState<number>(1);
  const modelosQ = useDreStudioModelos(codemp);
  const atualizar = useAtualizarModelo();
  const excluir = useExcluirModelo();

  const modelos = modelosQ.data ?? [];

  const toggleAtivo = async (id: string, atual: boolean) => {
    try { await atualizar.mutateAsync({ id, patch: { ativo: !atual } }); toast.success(!atual ? 'Modelo ativado.' : 'Modelo inativado.'); }
    catch (e: any) { toast.error(e?.message ?? 'Falha ao atualizar.'); }
  };
  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Excluir modelo "${nome}"? Esta ação é irreversível.`)) return;
    try { await excluir.mutateAsync(id); toast.success('Modelo excluído.'); }
    catch (e: any) { toast.error(e?.message ?? 'Falha ao excluir.'); }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Landmark className="h-5 w-5" /> DRE Studio — Modelos</h1>
          <p className="text-xs text-muted-foreground">Gerencie os modelos de DRE e Balanço.</p>
        </div>
        <Button size="sm" onClick={() => nav('/contabilidade/dre-studio/modelos/novo')} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Novo modelo
        </Button>
      </div>

      <DreHealthBanner />

      <Card className="p-3 flex items-center gap-3">
        <label className="text-xs text-muted-foreground">Empresa</label>
        <Input type="number" className="h-8 w-24" value={codemp} onChange={(e) => setCodemp(Number(e.target.value) || 1)} />
        <Button size="sm" variant="ghost" onClick={() => modelosQ.refetch()}>Atualizar</Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground border-b">
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Descrição</th>
              <th className="text-left px-3 py-2">Empresa</th>
              <th className="text-left px-3 py-2">Situação</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {modelosQ.isFetching && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
            )}
            {!modelosQ.isFetching && modelos.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum modelo cadastrado para esta empresa.</td></tr>
            )}
            {modelos.map((m) => (
              <tr key={m.id} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{m.nome}</td>
                <td className="px-3 py-2"><Badge variant="outline">{m.tipo_modelo}</Badge></td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{m.descricao || '—'}</td>
                <td className="px-3 py-2 tabular-nums">{m.codemp}</td>
                <td className="px-3 py-2">
                  {m.ativo
                    ? <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30" variant="outline">Ativo</Badge>
                    : <Badge variant="secondary">Inativo</Badge>}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => nav(`/contabilidade/dre-studio/modelos/${m.id}`)}>
                      <Pencil className="h-3 w-3" /> Abrir
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => toggleAtivo(m.id, m.ativo)}>
                      <Power className="h-3 w-3" /> {m.ativo ? 'Inativar' : 'Ativar'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => handleDelete(m.id, m.nome)}>
                      <Trash2 className="h-3 w-3" /> Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
