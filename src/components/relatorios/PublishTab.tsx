import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  listPublicacoes,
  publicarRelatorio,
  desativarPublicacao,
  listAccessProfiles,
  listPermissoes,
  savePermissoes,
} from '@/lib/relatorios/api';
import type { Relatorio, RelatorioPublicacao, RelatorioPermissao } from '@/lib/relatorios/types';

interface Props {
  relatorio: Partial<Relatorio>;
}

type PermDraft = { profile_id: string; can_view: boolean; can_export: boolean; can_print: boolean };

export function PublishTab({ relatorio }: Props) {
  const [pubs, setPubs] = useState<RelatorioPublicacao[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [perms, setPerms] = useState<PermDraft[]>([]);
  const [menuPath, setMenuPath] = useState('');
  const [moduloPub, setModuloPub] = useState(relatorio.modulo ?? '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function reload() {
    if (!relatorio.id) return;
    setLoading(true);
    try {
      const [p, profs, perm] = await Promise.all([
        listPublicacoes(relatorio.id),
        listAccessProfiles(),
        listPermissoes(relatorio.id),
      ]);
      setPubs(p);
      setProfiles(profs);
      const map = new Map<string, RelatorioPermissao>(perm.map((x) => [x.profile_id, x]));
      setPerms(
        profs.map((pr) => {
          const existing = map.get(pr.id);
          return {
            profile_id: pr.id,
            can_view: existing?.can_view ?? false,
            can_export: existing?.can_export ?? false,
            can_print: existing?.can_print ?? false,
          };
        }),
      );
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [relatorio.id]);

  async function handlePublicar() {
    if (!relatorio.id) return;
    setSaving(true);
    try {
      await publicarRelatorio({
        relatorio_id: relatorio.id,
        modulo: moduloPub || null,
        menu_path: menuPath || null,
      });
      toast.success('Relatório publicado');
      reload();
    } catch (e: any) {
      toast.error(`Erro ao publicar: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDesativar(id: string) {
    try {
      await desativarPublicacao(id);
      toast.success('Publicação desativada');
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleSavePerms() {
    if (!relatorio.id) return;
    setSaving(true);
    try {
      const filtered = perms.filter((p) => p.can_view || p.can_export || p.can_print);
      await savePermissoes(relatorio.id, filtered);
      toast.success('Permissões salvas');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!relatorio.id) {
    return <div className="text-sm text-muted-foreground py-8">Salve o relatório antes de configurar publicação.</div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Publicar nova versão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="modulo_pub">Módulo de destino</Label>
            <Input id="modulo_pub" value={moduloPub} onChange={(e) => setModuloPub(e.target.value)} placeholder="ex.: Compras" />
          </div>
          <div>
            <Label htmlFor="menu_path">Menu / rota</Label>
            <Input id="menu_path" value={menuPath} onChange={(e) => setMenuPath(e.target.value)} placeholder="/relatorios/codigo" />
          </div>
        </div>
        <Button onClick={handlePublicar} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
          Publicar
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Histórico de publicações</h3>
        <div className="rounded-md border border-border overflow-auto max-h-64">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Rota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pubs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Nenhuma publicação.</TableCell></TableRow>
              )}
              {pubs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{format(new Date(p.publicado_em), 'dd/MM/yy HH:mm')}</TableCell>
                  <TableCell className="text-xs">{p.modulo ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{p.menu_path ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? 'default' : 'secondary'}>{p.ativo ? 'Ativa' : 'Inativa'}</Badge>
                  </TableCell>
                  <TableCell>
                    {p.ativo && (
                      <Button size="sm" variant="ghost" onClick={() => handleDesativar(p.id)}>
                        <Archive className="h-3 w-3 mr-1" /> Desativar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Permissões por perfil de acesso</h3>
          <Button onClick={handleSavePerms} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Salvar permissões
          </Button>
        </div>
        <div className="rounded-md border border-border overflow-auto max-h-96">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Perfil</TableHead>
                <TableHead className="w-24 text-center">Visualizar</TableHead>
                <TableHead className="w-24 text-center">Exportar</TableHead>
                <TableHead className="w-24 text-center">Imprimir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perms.map((p) => {
                const profile = profiles.find((x) => x.id === p.profile_id);
                return (
                  <TableRow key={p.profile_id}>
                    <TableCell className="text-sm">{profile?.name ?? p.profile_id}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={p.can_view} onCheckedChange={(v) => setPerms((curr) => curr.map((x) => x.profile_id === p.profile_id ? { ...x, can_view: v } : x))} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={p.can_export} onCheckedChange={(v) => setPerms((curr) => curr.map((x) => x.profile_id === p.profile_id ? { ...x, can_export: v } : x))} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={p.can_print} onCheckedChange={(v) => setPerms((curr) => curr.map((x) => x.profile_id === p.profile_id ? { ...x, can_print: v } : x))} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
