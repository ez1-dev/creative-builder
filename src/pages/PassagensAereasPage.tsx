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
import { Plus, Share2 } from 'lucide-react';
import {
  PassagensDashboard, exportPassagensCsv, TIPO_DESPESA_OPTIONS, type Passagem,
} from '@/components/passagens/PassagensDashboard';
import { ShareLinksDialog } from '@/components/passagens/ShareLinksDialog';
import { ColaboradorCombobox } from '@/components/passagens/ColaboradorCombobox';

const PATH = '/passagens-aereas';

const emptyForm = (): Partial<Passagem> => ({
  data_registro: new Date().toISOString().slice(0, 10),
  colaborador: '', centro_custo: '', projeto_obra: '', fornecedor: '',
  cia_aerea: '', numero_bilhete: '', localizador: '', origem: '', destino: '',
  data_ida: '', data_volta: '', motivo_viagem: '',
  tipo_despesa: TIPO_DESPESA_OPTIONS[0], valor: 0, observacoes: '',
});

export default function PassagensAereasPage() {
  const { canEdit } = useUserPermissions();
  const editAllowed = canEdit(PATH);
  const { toast } = useToast();

  const [data, setData] = useState<Passagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Passagem | null>(null);
  const [form, setForm] = useState<Partial<Passagem>>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('passagens_aereas')
      .select('*')
      .order('data_registro', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    else setData((rows as Passagem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleOpenNew = () => { setEditing(null); setForm(emptyForm()); setOpenForm(true); };
  const handleOpenEdit = (p: Passagem) => { setEditing(p); setForm({ ...p }); setOpenForm(true); };

  const handleSave = async () => {
    if (!form.colaborador || !form.tipo_despesa || form.valor === undefined) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const payload = {
      data_registro: form.data_registro,
      colaborador: form.colaborador,
      centro_custo: form.centro_custo || null,
      projeto_obra: form.projeto_obra || null,
      fornecedor: form.fornecedor || null,
      cia_aerea: form.cia_aerea || null,
      numero_bilhete: form.numero_bilhete || null,
      localizador: form.localizador || null,
      origem: form.origem || null,
      destino: form.destino || null,
      data_ida: form.data_ida || null,
      data_volta: form.data_volta || null,
      motivo_viagem: form.motivo_viagem || null,
      tipo_despesa: form.tipo_despesa,
      valor: Number(form.valor) || 0,
      observacoes: form.observacoes || null,
    };

    if (editing) {
      const { error } = await supabase.from('passagens_aereas').update(payload).eq('id', editing.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Atualizado' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('passagens_aereas').insert({ ...payload, created_by: user?.id });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Criado' });
    }
    setOpenForm(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('passagens_aereas').delete().eq('id', deleteId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído' }); load(); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Passagens Aéreas"
        description="Cadastro manual de despesas com passagens aéreas"
        actions={
          <>
            {editAllowed && (
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="mr-1 h-4 w-4" /> Compartilhar
              </Button>
            )}
            {editAllowed && (
              <Button size="sm" onClick={handleOpenNew}>
                <Plus className="mr-1 h-4 w-4" /> Novo registro
              </Button>
            )}
          </>
        }
      />

      <PassagensDashboard
        data={data}
        loading={loading}
        onEdit={editAllowed ? handleOpenEdit : undefined}
        onDelete={editAllowed ? setDeleteId : undefined}
        onExport={exportPassagensCsv}
      />

      <ShareLinksDialog open={shareOpen} onOpenChange={setShareOpen} />

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} registro</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div><Label>Data registro *</Label><Input type="date" value={form.data_registro ?? ''} onChange={(e) => setForm({ ...form, data_registro: e.target.value })} /></div>
            <div className="md:col-span-2">
              <Label>Colaborador *</Label>
              <ColaboradorCombobox
                value={form.colaborador ?? ''}
                onChange={(v) => setForm({ ...form, colaborador: v })}
              />
            </div>
            <div><Label>Centro de Custo</Label><Input value={form.centro_custo ?? ''} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} /></div>
            <div><Label>Projeto / Obra</Label><Input value={form.projeto_obra ?? ''} onChange={(e) => setForm({ ...form, projeto_obra: e.target.value })} /></div>
            <div><Label>Fornecedor</Label><Input value={form.fornecedor ?? ''} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
            <div><Label>Cia Aérea</Label><Input value={form.cia_aerea ?? ''} onChange={(e) => setForm({ ...form, cia_aerea: e.target.value })} /></div>
            <div><Label>Nº Bilhete</Label><Input value={form.numero_bilhete ?? ''} onChange={(e) => setForm({ ...form, numero_bilhete: e.target.value })} /></div>
            <div><Label>Localizador</Label><Input value={form.localizador ?? ''} onChange={(e) => setForm({ ...form, localizador: e.target.value })} /></div>
            <div><Label>Origem</Label><Input value={form.origem ?? ''} onChange={(e) => setForm({ ...form, origem: e.target.value })} /></div>
            <div><Label>Destino</Label><Input value={form.destino ?? ''} onChange={(e) => setForm({ ...form, destino: e.target.value })} /></div>
            <div><Label>Data Ida</Label><Input type="date" value={form.data_ida ?? ''} onChange={(e) => setForm({ ...form, data_ida: e.target.value })} /></div>
            <div><Label>Data Volta</Label><Input type="date" value={form.data_volta ?? ''} onChange={(e) => setForm({ ...form, data_volta: e.target.value })} /></div>
            <div>
              <Label>Tipo de Despesa *</Label>
              <Select value={form.tipo_despesa ?? ''} onValueChange={(v) => setForm({ ...form, tipo_despesa: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_DESPESA_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
            <div className="md:col-span-3"><Label>Motivo da Viagem</Label><Input value={form.motivo_viagem ?? ''} onChange={(e) => setForm({ ...form, motivo_viagem: e.target.value })} /></div>
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
    </div>
  );
}
