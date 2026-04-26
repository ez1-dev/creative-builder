import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/erp/PageHeader';
import { KPICard } from '@/components/erp/KPICard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plane, Pencil, Trash2, Plus, DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, Legend,
} from 'recharts';
import { formatCurrency, formatDate } from '@/lib/format';

const PATH = '/passagens-aereas';

const TIPO_DESPESA_OPTIONS = [
  'Folha de Campo',
  'Demissão',
  'Viagem Administrativa',
  'Contratação',
  'Transferência de Obra',
  'Outros',
];

const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

interface Passagem {
  id: string;
  data_registro: string;
  colaborador: string;
  centro_custo: string | null;
  projeto_obra: string | null;
  fornecedor: string | null;
  cia_aerea: string | null;
  numero_bilhete: string | null;
  localizador: string | null;
  origem: string | null;
  destino: string | null;
  data_ida: string | null;
  data_volta: string | null;
  motivo_viagem: string | null;
  tipo_despesa: string;
  valor: number;
  observacoes: string | null;
}

const emptyForm = (): Partial<Passagem> => ({
  data_registro: new Date().toISOString().slice(0, 10),
  colaborador: '',
  centro_custo: '',
  projeto_obra: '',
  fornecedor: '',
  cia_aerea: '',
  numero_bilhete: '',
  localizador: '',
  origem: '',
  destino: '',
  data_ida: '',
  data_volta: '',
  motivo_viagem: '',
  tipo_despesa: TIPO_DESPESA_OPTIONS[0],
  valor: 0,
  observacoes: '',
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

  // Filtros
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('passagens_aereas')
      .select('*')
      .order('data_registro', { ascending: false });
    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setData((rows as Passagem[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (filtroColaborador && !r.colaborador.toLowerCase().includes(filtroColaborador.toLowerCase())) return false;
      if (filtroCC && !(r.centro_custo ?? '').toLowerCase().includes(filtroCC.toLowerCase())) return false;
      if (filtroTipo !== 'todos' && r.tipo_despesa !== filtroTipo) return false;
      if (dataInicio && r.data_registro < dataInicio) return false;
      if (dataFim && r.data_registro > dataFim) return false;
      return true;
    });
  }, [data, filtroColaborador, filtroCC, filtroTipo, dataInicio, dataFim]);

  // KPIs
  const totalGeral = filtered.reduce((s, r) => s + Number(r.valor || 0), 0);
  const totalRegistros = filtered.length;
  const colaboradoresUnicos = new Set(filtered.map((r) => r.colaborador)).size;
  const ticketMedio = totalRegistros > 0 ? totalGeral / totalRegistros : 0;

  // Gráficos
  const porMes = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const mes = r.data_registro.slice(0, 7);
      map.set(mes, (map.get(mes) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => ({ mes, valor }));
  }, [filtered]);

  const porTipo = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      map.set(r.tipo_despesa, (map.get(r.tipo_despesa) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const porCentroCusto = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((r) => {
      const cc = r.centro_custo || 'Sem CC';
      map.set(cc, (map.get(cc) ?? 0) + Number(r.valor || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  const handleOpenNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpenForm(true);
  };

  const handleOpenEdit = (p: Passagem) => {
    setEditing(p);
    setForm({ ...p });
    setOpenForm(true);
  };

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
      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Registro atualizado' });
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('passagens_aereas').insert({ ...payload, created_by: user?.id });
      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Registro criado' });
    }
    setOpenForm(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('passagens_aereas').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Registro excluído' });
      load();
    }
    setDeleteId(null);
  };

  const exportCsv = () => {
    const headers = ['Data', 'Colaborador', 'Centro Custo', 'Projeto/Obra', 'Tipo', 'Origem', 'Destino', 'Cia', 'Bilhete', 'Valor'];
    const rows = filtered.map((r) => [
      r.data_registro, r.colaborador, r.centro_custo ?? '', r.projeto_obra ?? '',
      r.tipo_despesa, r.origem ?? '', r.destino ?? '', r.cia_aerea ?? '',
      r.numero_bilhete ?? '', r.valor,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passagens-aereas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Passagens Aéreas"
        description="Cadastro manual de despesas com passagens aéreas"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              Exportar CSV
            </Button>
            {editAllowed && (
              <Button size="sm" onClick={handleOpenNew}>
                <Plus className="mr-1 h-4 w-4" /> Novo registro
              </Button>
            )}
          </>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-5">
          <div>
            <Label className="text-xs">Colaborador</Label>
            <Input value={filtroColaborador} onChange={(e) => setFiltroColaborador(e.target.value)} placeholder="Buscar..." />
          </div>
          <div>
            <Label className="text-xs">Centro de Custo</Label>
            <Input value={filtroCC} onChange={(e) => setFiltroCC(e.target.value)} placeholder="Buscar..." />
          </div>
          <div>
            <Label className="text-xs">Tipo de Despesa</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {TIPO_DESPESA_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Data início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Data fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KPICard title="Total Geral" value={formatCurrency(totalGeral)} icon={<DollarSign className="h-5 w-5" />} variant="default" index={0} />
        <KPICard title="Registros" value={totalRegistros} icon={<Plane className="h-5 w-5" />} variant="info" index={1} />
        <KPICard title="Colaboradores" value={colaboradoresUnicos} icon={<Users className="h-5 w-5" />} variant="success" index={2} />
        <KPICard title="Ticket Médio" value={formatCurrency(ticketMedio)} icon={<TrendingUp className="h-5 w-5" />} variant="warning" index={3} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Evolução Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porMes}>
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Por Tipo de Despesa</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={porTipo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${((e.percent ?? 0) * 100).toFixed(0)}%`}>
                  {porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Top 10 Centros de Custo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porCentroCusto} layout="vertical">
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" fontSize={11} width={140} />
                <RTooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Registros ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>C. Custo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem → Destino</TableHead>
                <TableHead>Cia</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                {editAllowed && <TableHead className="w-24">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={editAllowed ? 8 : 7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={editAllowed ? 8 : 7} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.data_registro)}</TableCell>
                  <TableCell className="font-medium">{r.colaborador}</TableCell>
                  <TableCell>{r.centro_custo ?? '-'}</TableCell>
                  <TableCell>{r.tipo_despesa}</TableCell>
                  <TableCell>{r.origem ?? '-'} → {r.destino ?? '-'}</TableCell>
                  <TableCell>{r.cia_aerea ?? '-'}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(r.valor)}</TableCell>
                  {editAllowed && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} registro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label>Data registro *</Label>
              <Input type="date" value={form.data_registro ?? ''} onChange={(e) => setForm({ ...form, data_registro: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Colaborador *</Label>
              <Input value={form.colaborador ?? ''} onChange={(e) => setForm({ ...form, colaborador: e.target.value })} />
            </div>
            <div>
              <Label>Centro de Custo</Label>
              <Input value={form.centro_custo ?? ''} onChange={(e) => setForm({ ...form, centro_custo: e.target.value })} />
            </div>
            <div>
              <Label>Projeto / Obra</Label>
              <Input value={form.projeto_obra ?? ''} onChange={(e) => setForm({ ...form, projeto_obra: e.target.value })} />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Input value={form.fornecedor ?? ''} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
            </div>
            <div>
              <Label>Cia Aérea</Label>
              <Input value={form.cia_aerea ?? ''} onChange={(e) => setForm({ ...form, cia_aerea: e.target.value })} />
            </div>
            <div>
              <Label>Nº Bilhete</Label>
              <Input value={form.numero_bilhete ?? ''} onChange={(e) => setForm({ ...form, numero_bilhete: e.target.value })} />
            </div>
            <div>
              <Label>Localizador</Label>
              <Input value={form.localizador ?? ''} onChange={(e) => setForm({ ...form, localizador: e.target.value })} />
            </div>
            <div>
              <Label>Origem</Label>
              <Input value={form.origem ?? ''} onChange={(e) => setForm({ ...form, origem: e.target.value })} />
            </div>
            <div>
              <Label>Destino</Label>
              <Input value={form.destino ?? ''} onChange={(e) => setForm({ ...form, destino: e.target.value })} />
            </div>
            <div>
              <Label>Data Ida</Label>
              <Input type="date" value={form.data_ida ?? ''} onChange={(e) => setForm({ ...form, data_ida: e.target.value })} />
            </div>
            <div>
              <Label>Data Volta</Label>
              <Input type="date" value={form.data_volta ?? ''} onChange={(e) => setForm({ ...form, data_volta: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de Despesa *</Label>
              <Select value={form.tipo_despesa ?? ''} onValueChange={(v) => setForm({ ...form, tipo_despesa: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_DESPESA_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.valor ?? 0} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
            </div>
            <div className="md:col-span-3">
              <Label>Motivo da Viagem</Label>
              <Input value={form.motivo_viagem ?? ''} onChange={(e) => setForm({ ...form, motivo_viagem: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Observações</Label>
              <Textarea value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
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
