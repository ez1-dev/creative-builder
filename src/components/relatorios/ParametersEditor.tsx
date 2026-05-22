import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { RelatorioParametro } from '@/lib/relatorios/types';

type ParamDraft = Omit<RelatorioParametro, 'id' | 'relatorio_id'>;

interface Props {
  parametros: ParamDraft[];
  onChange: (p: ParamDraft[]) => void;
}

export function ParametersEditor({ parametros, onChange }: Props) {
  function update(idx: number, patch: Partial<ParamDraft>) {
    const next = parametros.map((p, i) => (i === idx ? { ...p, ...patch } : p));
    onChange(next);
  }
  function remove(idx: number) {
    onChange(parametros.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([
      ...parametros,
      { nome: '', label: '', tipo: 'texto', obrigatorio: false, valor_padrao: '', ordem: parametros.length, sql_lista: '' },
    ]);
  }
  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= parametros.length) return;
    const next = [...parametros];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.map((p, i) => ({ ...p, ordem: i })));
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Os parâmetros são preenchidos pelo usuário ao executar o relatório.
        </p>
        <Button size="sm" variant="outline" onClick={add}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Label</TableHead>
              <TableHead className="w-32">Tipo</TableHead>
              <TableHead className="w-24">Obrig.</TableHead>
              <TableHead>Valor padrão</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parametros.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                  Nenhum parâmetro. Use "Detectar parâmetros" na aba SQL ou adicione manualmente.
                </TableCell>
              </TableRow>
            )}
            {parametros.map((p, idx) => (
              <>
                <TableRow key={`row-${idx}`}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, -1)}>
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(idx, 1)}>
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell><Input value={p.nome} onChange={(e) => update(idx, { nome: e.target.value })} className="h-8" /></TableCell>
                  <TableCell><Input value={p.label ?? ''} onChange={(e) => update(idx, { label: e.target.value })} className="h-8" /></TableCell>
                  <TableCell>
                    <Select value={p.tipo} onValueChange={(v) => update(idx, { tipo: v as any })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto">Texto</SelectItem>
                        <SelectItem value="numero">Número</SelectItem>
                        <SelectItem value="data">Data</SelectItem>
                        <SelectItem value="periodo">Período</SelectItem>
                        <SelectItem value="lista">Lista fixa</SelectItem>
                        <SelectItem value="lista_sql">Lista SQL</SelectItem>
                        <SelectItem value="multi">Multi-seleção</SelectItem>
                        <SelectItem value="booleano">Booleano</SelectItem>
                        <SelectItem value="empresa">Empresa</SelectItem>
                        <SelectItem value="filial">Filial</SelectItem>
                        <SelectItem value="produto">Produto</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                        <SelectItem value="fornecedor">Fornecedor</SelectItem>
                        <SelectItem value="op">OP</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Switch checked={p.obrigatorio} onCheckedChange={(v) => update(idx, { obrigatorio: v })} /></TableCell>
                  <TableCell><Input value={p.valor_padrao ?? ''} onChange={(e) => update(idx, { valor_padrao: e.target.value })} className="h-8" /></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
                {(p.tipo === 'lista' || p.tipo === 'lista_sql' || p.tipo === 'multi') && (
                  <TableRow key={`sql-${idx}`}>
                    <TableCell />
                    <TableCell colSpan={6}>
                      <Textarea
                        value={p.sql_lista ?? ''}
                        onChange={(e) => update(idx, { sql_lista: e.target.value })}
                        placeholder={p.tipo === 'lista' ? 'Opções fixas separadas por | (ex: ATIVO|INATIVO)' : 'SELECT codigo, descricao FROM ...'}
                        rows={2}
                        className="font-mono text-xs"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
