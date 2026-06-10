import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Tipo { id: string; nome: string; ativo: boolean; created_at: string; }

const PATH = '/manutencao-maquinas';

export default function TiposMaquinaPage() {
  const { canEdit, isAdmin } = useUserPermissions();
  const canManage = isAdmin || canEdit(PATH);
  const { toast } = useToast();

  const [rows, setRows] = useState<Tipo[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [novo, setNovo] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [deleteRow, setDeleteRow] = useState<Tipo | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('tipos_maquina').select('*').order('nome');
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setRows((data ?? []) as Tipo[]);

    const { data: usage } = await (supabase as any)
      .from('manutencao_maquinas').select('tipo_maquina');
    if (usage) {
      const m: Record<string, number> = {};
      for (const r of usage as any[]) {
        const k = (r.tipo_maquina || '').toUpperCase();
        if (k) m[k] = (m[k] ?? 0) + 1;
      }
      setUsageMap(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const nome = novo.trim().toUpperCase();
    if (!nome) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from('tipos_maquina').insert({ nome, created_by: user?.id });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Tipo cadastrado' });
    setNovo(''); load();
  };

  const handleToggle = async (r: Tipo) => {
    const { error } = await (supabase as any)
      .from('tipos_maquina').update({ ativo: !r.ativo }).eq('id', r.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else load();
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    const nome = editNome.trim().toUpperCase();
    if (!nome) return;
    const { error } = await (supabase as any)
      .from('tipos_maquina').update({ nome }).eq('id', editId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setEditId(null); setEditNome(''); load();
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    const { error } = await (supabase as any).from('tipos_maquina').delete().eq('id', deleteRow.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído' }); load(); }
    setDeleteRow(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tipos de Máquina"
        description="Catálogo de tipos usados nos registros de Manutenção de Máquinas"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/manutencao-maquinas"><ArrowLeft className="mr-1 h-4 w-4" /> Voltar</Link>
          </Button>
        }
      />

      {canManage && (
        <Card>
          <CardContent className="flex gap-2 p-4">
            <Input placeholder="Novo tipo (ex: TORNO CNC)" value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <Button onClick={handleAdd} disabled={!novo.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-32 text-right">Em uso</TableHead>
                <TableHead className="w-28">Ativo</TableHead>
                {canManage && <TableHead className="w-32 text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum tipo cadastrado.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {editId === r.id ? (
                      <Input value={editNome} onChange={(e) => setEditNome(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} autoFocus />
                    ) : (
                      <span className="font-medium">{r.nome}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{usageMap[r.nome] ?? 0}</TableCell>
                  <TableCell>
                    <Switch checked={r.ativo} onCheckedChange={() => handleToggle(r)} disabled={!canManage} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {editId === r.id ? (
                        <>
                          <Button variant="ghost" size="icon" onClick={handleSaveEdit}><Save className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { setEditId(null); setEditNome(''); }}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { setEditId(r.id); setEditNome(r.nome); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteRow(r)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tipo "{deleteRow?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow && (usageMap[deleteRow.nome] ?? 0) > 0
                ? `Este tipo está em uso em ${usageMap[deleteRow.nome]} registro(s). Os registros não serão alterados, mas o tipo deixará de aparecer nas sugestões.`
                : 'Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
