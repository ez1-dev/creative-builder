import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, Copy, Eye, Send, Archive, MoreHorizontal, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import type { Relatorio } from '@/lib/relatorios/types';

interface Props {
  relatorios: Relatorio[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onPublicar: (r: Relatorio) => void;
  onInativar: (r: Relatorio) => void;
}

export function ReportList({ relatorios, selectedId, onSelect, onNew, onDuplicate, onPublicar, onInativar }: Props) {
  const [search, setSearch] = useState('');

  const filtered = relatorios.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.nome.toLowerCase().includes(q) ||
      r.codigo.toLowerCase().includes(q) ||
      (r.modulo ?? '').toLowerCase().includes(q) ||
      (r.categoria ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código, módulo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button onClick={onNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </div>
      <div className="flex-1 overflow-auto mt-3 rounded-md border border-border">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-28">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-32">Atualizado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                  Nenhum relatório encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={selectedId === r.id ? 'bg-primary/5 cursor-pointer' : 'cursor-pointer hover:bg-muted/40'}
              >
                <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{r.nome}</span>
                    {r.tipo_fonte === 'api_rest' && (
                      <Badge variant="outline" className="text-[10px] py-0 h-4">API</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{r.modulo ?? '—'}</TableCell>
                <TableCell className="text-xs">{r.categoria ?? '—'}</TableCell>
                <TableCell className="text-xs">{r.fonte_dados ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'publicado' ? 'default' : r.status === 'inativo' ? 'destructive' : 'secondary'}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(r.updated_at), 'dd/MM/yy HH:mm')}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelect(r.id)}><Edit className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(r.id)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSelect(r.id)}><Eye className="h-4 w-4 mr-2" /> Pré-visualizar</DropdownMenuItem>
                      {r.status !== 'publicado' && (
                        <DropdownMenuItem onClick={() => onPublicar(r)}><Send className="h-4 w-4 mr-2" /> Publicar</DropdownMenuItem>
                      )}
                      {r.status !== 'inativo' && (
                        <DropdownMenuItem onClick={() => onInativar(r)} className="text-destructive">
                          <Archive className="h-4 w-4 mr-2" /> Inativar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
