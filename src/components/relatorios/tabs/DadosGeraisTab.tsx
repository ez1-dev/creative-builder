import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { relatorioFormSchema, type RelatorioFormValues } from '@/lib/relatorios/schemas';
import type { Relatorio } from '@/lib/relatorios/types';

interface Props {
  value: Partial<Relatorio>;
  onChange: (patch: Partial<Relatorio>) => void;
}

const MODULOS = [
  'Compras', 'Estoque', 'Produção', 'Engenharia', 'Financeiro',
  'Faturamento', 'Frota', 'Manutenção', 'RH', 'Contabilidade', 'Outros',
];

const CATEGORIAS = ['Gerencial', 'Operacional', 'Analítico', 'Auditoria', 'Fiscal'];

export function DadosGeraisTab({ value, onChange }: Props) {
  const form = useForm<RelatorioFormValues>({
    resolver: zodResolver(relatorioFormSchema),
    defaultValues: {
      nome: value.nome ?? '',
      descricao: value.descricao ?? '',
      modulo: value.modulo ?? '',
      categoria: value.categoria ?? '',
      fonte_dados: value.fonte_dados ?? '',
      status: (value.status as any) ?? 'rascunho',
      permite_excel: value.permite_excel ?? true,
      permite_pdf: value.permite_pdf ?? true,
      permite_csv: value.permite_csv ?? true,
    },
  });

  // Propaga mudanças up
  const watched = form.watch();
  const [last, setLast] = useState<string>('');
  useEffect(() => {
    const json = JSON.stringify(watched);
    if (json !== last) {
      setLast(json);
      onChange(watched as any);
    }
  }, [watched, last, onChange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
      <div className="md:col-span-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" {...form.register('nome')} />
        {form.formState.errors.nome && (
          <p className="text-xs text-destructive mt-1">{form.formState.errors.nome.message}</p>
        )}
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" rows={3} {...form.register('descricao')} />
      </div>
      <div>
        <Label>Módulo</Label>
        <Select value={watched.modulo ?? ''} onValueChange={(v) => form.setValue('modulo', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {MODULOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Categoria</Label>
        <Select value={watched.categoria ?? ''} onValueChange={(v) => form.setValue('categoria', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="fonte">Fonte de dados</Label>
        <Input id="fonte" placeholder="ex: ERP Senior" {...form.register('fonte_dados')} />
      </div>
      <div>
        <Label>Status</Label>
        <Select value={watched.status} onValueChange={(v) => form.setValue('status', v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="publicado">Publicado</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2 space-y-3 pt-2 border-t border-border">
        <Label className="text-sm font-semibold">Formatos de exportação permitidos</Label>
        <div className="flex items-center gap-6 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={watched.permite_excel} onCheckedChange={(v) => form.setValue('permite_excel', v)} />
            <span className="text-sm">Excel</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={watched.permite_pdf} onCheckedChange={(v) => form.setValue('permite_pdf', v)} />
            <span className="text-sm">PDF</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch checked={watched.permite_csv} onCheckedChange={(v) => form.setValue('permite_csv', v)} />
            <span className="text-sm">CSV</span>
          </label>
        </div>
      </div>
    </div>
  );
}
