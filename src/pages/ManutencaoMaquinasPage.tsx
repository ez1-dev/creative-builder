import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Share2, Upload, RefreshCw, Trash2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MaquinasDashboard, type ManutencaoMaquina, TIPO_MAQUINA_OPTIONS } from '@/components/maquinas/MaquinasDashboard';
import { MaquinasShareLinksDialog } from '@/components/maquinas/MaquinasShareLinksDialog';
import { ImportarMaquinasDialog } from '@/components/maquinas/ImportarMaquinasDialog';

const PATH = '/manutencao-maquinas';

const emptyForm = (): Partial<ManutencaoMaquina> => ({
  data: new Date().toISOString().slice(0, 10),
  maquina: '', tipo_maquina: 'OUTROS', fornecedor: '', descricao: '',
  quantidade: 1, valor: 0, ordem_compra: '', nota_fiscal: '',
  centro_custo: '', observacoes: '',
});

export default function ManutencaoMaquinasPage() {
  const { canEdit, isAdmin } = useUserPermissions();
  const editAllowed = canEdit(PATH);
  const { toast } = useToast();

  const [data, setData] = useState<ManutencaoMaquina[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ManutencaoMaquina | null>(null);
  const [form, setForm] = useState<Partial<ManutencaoMaquina>>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await (supabase as any)
      .from('manutencao_maquinas').select('*').order('data', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    else setData((rows as ManutencaoMaquina[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('manutencao_maquinas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manutencao_maquinas' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleOpenNew = () => { setEditing(null); setForm(emptyForm()); setOpenForm(true); };
  const handleOpenEdit = (r: ManutencaoMaquina) => { setEditing(r); setForm({ ...r }); setOpenForm(true); };

  const handleSave = async () => {
    if (!form.maquina || !form.data || form.valor === undefined) {
      toast({ title: 'Preencha máquina, data e valor', variant: 'destructive' });
      return;
    }
    const payload = {
      data: form.data,
      maquina: (form.maquina || '').trim().toUpperCase(),
      tipo_maquina: form.tipo_maquina || null,
      fornecedor: form.fornecedor || null,
      descricao: form.descricao || null,
      quantidade: form.quantidade != null && form.quantidade !== ('' as any) ? Number(form.quantidade) : null,
      ordem_compra: form.ordem_compra || null,
      nota_fiscal: form.nota_fiscal || null,
      valor: Number(form.valor) || 0,
      centro_custo: form.centro_custo || null,
      observacoes: form.observacoes || null,
    };
    if (editing) {
      const { error } = await (supabase as any).from('manutencao_maquinas').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Atualizado' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('manutencao_maquinas').insert({ ...payload, created_by: user?.id });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Criado' });
    }
    setOpenForm(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from('manutencao_maquinas').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído' }); load(); }
    setDeleteId(null);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const { error } = await (supabase as any).from('manutencao_maquinas').delete().gte('data', '1900-01-01');
    setDeletingAll(false);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Todos os registros foram excluídos' });
    setDeleteAllOpen(false);
    setDeleteAllText('');
    load();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manutenção de Máquinas"
        description="Cadastro e análise das despesas de manutenção de máquinas e equipamentos"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/manutencao-maquinas/relatorio-executivo">
                <FileText className="mr-1 h-4 w-4" /> Relatório Executivo
              </Link>
            </Button>
            {editAllowed && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="mr-1 h-4 w-4" /> Compartilhar
              </Button>
            )}
            {editAllowed && (
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1 h-4 w-4" /> Importar planilha
              </Button>
            )}
            {editAllowed && (
              <Button size="sm" onClick={handleOpenNew}>
                <Plus className="mr-1 h-4 w-4" /> Novo registro
              </Button>
            )}
            {isAdmin && (
              <Button variant="destructive" size="sm"
                onClick={() => { setDeleteAllText(''); setDeleteAllOpen(true); }}
                disabled={data.length === 0}>
                <Trash2 className="mr-1 h-4 w-4" /> Excluir todos
              </Button>
            )}
          </>
        }
      />

      <MaquinasDashboard
        data={data} loading={loading}
        onEdit={editAllowed ? handleOpenEdit : undefined}
        onDelete={editAllowed ? setDeleteId : undefined}
      />

      <MaquinasShareLinksDialog open={shareOpen} onOpenChange={setShareOpen} />
      <ImportarMaquinasDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} registro de manutenção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><Label>Data *</Label><Input type="date" value={form.data ?? ''} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Máquina *</Label><Input value={form.maquina ?? ''} onChange={(e) => setForm({ ...form, maquina: e.target.value })} placeholder="PONTE ROLANTE PINTURA" /></div>
            <div>
              <Label>Tipo de Máquina</Label>
              <Select value={form.tipo_maquina ?? 'OUTROS'} onValueChange={(v) => setForm({ ...form, tipo_maquina: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_MAQUINA_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>Fornecedor</Label><Input value={form.fornecedor ?? ''} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Descrição do item / serviço</Label><Textarea value={form.descricao ?? ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
            <div><Label>Quantidade</Label><Input type="number" step="0.01" value={form.quantidade ?? ''} onChange={(e) => setForm({ ...form, quantidade: e.target.value === '' ? null : Number(e.target.value) })} /></div>
            <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
            <div><Label>Centro de Custo</Label><Input value={form.centro_custo ?? ''} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} /></div>
            <div><Label>Ordem de Compra</Label><Input value={form.ordem_compra ?? ''} onChange={(e) => setForm({ ...form, ordem_compra: e.target.value })} /></div>
            <div><Label>Nota Fiscal</Label><Input value={form.nota_fiscal ?? ''} onChange={(e) => setForm({ ...form, nota_fiscal: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Observações</Label><Textarea value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllOpen} onOpenChange={(o) => { if (!o) { setDeleteAllOpen(false); setDeleteAllText(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir TODOS os registros?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão removidos {data.length} registro(s). Para confirmar, digite <strong>EXCLUIR TODOS</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteAllText} onChange={(e) => setDeleteAllText(e.target.value)} placeholder="EXCLUIR TODOS" autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}
              disabled={deleteAllText.trim() !== 'EXCLUIR TODOS' || deletingAll}
              className="bg-destructive">
              {deletingAll ? 'Excluindo...' : 'Excluir tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
