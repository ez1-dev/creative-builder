import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Share2, Upload, RefreshCw, Trash2 } from 'lucide-react';
import { FrotaDashboard, type ManutencaoFrota } from '@/components/frota/FrotaDashboard';
import { FrotaShareLinksDialog } from '@/components/frota/FrotaShareLinksDialog';
import { ImportarFrotaDialog } from '@/components/frota/ImportarFrotaDialog';

const PATH = '/frota';

const TIPO_OPTS = ['LEVE', 'CAMINHÃO', 'CARRETA', 'GUINDASTE', 'CAÇAMBA', 'MUCK', 'OUTRO'];

const emptyForm = (): Partial<ManutencaoFrota> => ({
  data: new Date().toISOString().slice(0, 10),
  placa: '', veiculo_descricao: '', fornecedor: '', descricao: '',
  quilometragem: null, valor: 0, motorista: '', centro_custo: '',
  segmento: 'FROTA', tipo_veiculo: 'LEVE', observacoes: '',
});

export default function ManutencaoFrotaPage() {
  const { canEdit, isAdmin } = useUserPermissions();
  const editAllowed = canEdit(PATH);
  const { toast } = useToast();

  const [data, setData] = useState<ManutencaoFrota[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<ManutencaoFrota | null>(null);
  const [form, setForm] = useState<Partial<ManutencaoFrota>>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('manutencao_frota')
      .select('*')
      .order('data', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    else setData((rows as ManutencaoFrota[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel('manutencao_frota_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manutencao_frota' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleOpenNew = () => { setEditing(null); setForm(emptyForm()); setOpenForm(true); };
  const handleOpenEdit = (r: ManutencaoFrota) => { setEditing(r); setForm({ ...r }); setOpenForm(true); };

  const handleSave = async () => {
    if (!form.placa || !form.data || form.valor === undefined) {
      toast({ title: 'Preencha placa, data e valor', variant: 'destructive' });
      return;
    }
    const payload = {
      data: form.data,
      placa: (form.placa || '').trim().toUpperCase(),
      veiculo_descricao: form.veiculo_descricao || null,
      fornecedor: form.fornecedor || null,
      descricao: form.descricao || null,
      quilometragem: form.quilometragem != null && form.quilometragem !== ('' as any) ? Number(form.quilometragem) : null,
      valor: Number(form.valor) || 0,
      motorista: form.motorista || null,
      centro_custo: form.centro_custo || null,
      segmento: form.segmento || null,
      observacoes: form.observacoes || null,
    };
    if (editing) {
      const { error } = await supabase.from('manutencao_frota').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Atualizado' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('manutencao_frota').insert({ ...payload, created_by: user?.id });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Criado' });
    }
    setOpenForm(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('manutencao_frota').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído' }); load(); }
    setDeleteId(null);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    const { error } = await supabase
      .from('manutencao_frota')
      .delete()
      .gte('data', '1900-01-01');
    setDeletingAll(false);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Todos os registros foram excluídos' });
    setDeleteAllOpen(false);
    setDeleteAllText('');
    load();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Manutenção de Frota"
        description="Cadastro e análise das despesas de manutenção de veículos"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
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
              <Button
                variant="destructive" size="sm"
                onClick={() => { setDeleteAllText(''); setDeleteAllOpen(true); }}
                disabled={data.length === 0}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Excluir todos
              </Button>
            )}
          </>
        }
      />

      <FrotaDashboard
        data={data}
        loading={loading}
        onEdit={editAllowed ? handleOpenEdit : undefined}
        onDelete={editAllowed ? setDeleteId : undefined}
      />

      <FrotaShareLinksDialog open={shareOpen} onOpenChange={setShareOpen} />
      <ImportarFrotaDialog open={importOpen} onOpenChange={setImportOpen} onImported={load} />

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} registro de manutenção</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><Label>Data *</Label><Input type="date" value={form.data ?? ''} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Placa *</Label><Input value={form.placa ?? ''} onChange={(e) => setForm({ ...form, placa: e.target.value })} placeholder="ABC1D23" /></div>
            <div>
              <Label>Segmento</Label>
              <Select value={form.segmento ?? 'FROTA'} onValueChange={(v) => setForm({ ...form, segmento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FROTA">FROTA</SelectItem>
                  <SelectItem value="OBRA">OBRA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3"><Label>Descrição do veículo</Label><Input value={form.veiculo_descricao ?? ''} onChange={(e) => setForm({ ...form, veiculo_descricao: e.target.value })} placeholder="CAMINHÃO IVECO STRALIS" /></div>
            <div className="md:col-span-2"><Label>Fornecedor</Label><Input value={form.fornecedor ?? ''} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
            <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
            <div className="md:col-span-3"><Label>Descrição do serviço</Label><Textarea value={form.descricao ?? ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
            <div><Label>Quilometragem (KM)</Label><Input type="number" value={form.quilometragem ?? ''} onChange={(e) => setForm({ ...form, quilometragem: e.target.value === '' ? null : Number(e.target.value) })} /></div>
            <div><Label>Motorista</Label><Input value={form.motorista ?? ''} onChange={(e) => setForm({ ...form, motorista: e.target.value })} /></div>
            <div><Label>Centro de Custo</Label><Input value={form.centro_custo ?? ''} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} /></div>
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
              Esta ação não pode ser desfeita. Serão removidos {data.length} registro(s) de Manutenção de Frota.
              Para confirmar, digite <strong>EXCLUIR TODOS</strong> abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={deleteAllText} onChange={(e) => setDeleteAllText(e.target.value)} placeholder="EXCLUIR TODOS" autoFocus />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deleteAllText.trim() !== 'EXCLUIR TODOS' || deletingAll}
              className="bg-destructive"
            >
              {deletingAll ? 'Excluindo...' : 'Excluir tudo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
