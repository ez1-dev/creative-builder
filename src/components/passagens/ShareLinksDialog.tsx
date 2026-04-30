import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Link as LinkIcon, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { VISUAL_CATALOG } from '@/lib/visualCatalog';

const PASSAGENS_VISUALS =
  VISUAL_CATALOG.find((g) => g.module === 'Passagens Aéreas')?.items ?? [];

interface ShareLink {
  id: string;
  token: string;
  nome: string;
  password_hash: string | null;
  expires_at: string | null;
  active: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  hidden_visuals: string[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const VALIDITY_DAYS = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
  { label: 'Sem expiração', value: '0' },
];

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Deriva o token efetivo (armazenado no banco) a partir do token público + senha.
// Se não houver senha, o token efetivo é o próprio token público.
export async function deriveEffectiveToken(publicToken: string, password: string | null): Promise<string> {
  if (!password) return publicToken;
  const data = new TextEncoder().encode(`${publicToken}::${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function ShareLinksDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [validade, setValidade] = useState('30');
  const [senha, setSenha] = useState('');
  const [novoLink, setNovoLink] = useState<string | null>(null);
  const [novoLinkProtegido, setNovoLinkProtegido] = useState(false);
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PASSAGENS_VISUALS.map((v) => [v.key, true])),
  );

  const baseUrl = window.location.origin;

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('passagens_aereas_share_links')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    else setLinks((data as ShareLink[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const handleCreate = async () => {
    if (!nome.trim()) {
      toast({ title: 'Informe um nome para o link', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const publicToken = generateToken();
    const password = senha.trim() || null;
    const effectiveToken = await deriveEffectiveToken(publicToken, password);
    const expiresAt = validade !== '0'
      ? new Date(Date.now() + Number(validade) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const hiddenVisuals = PASSAGENS_VISUALS
      .filter((v) => !visiveis[v.key])
      .map((v) => v.key);

    const { error } = await supabase.rpc('create_passagens_share_link', {
      _token: effectiveToken,
      _nome: nome,
      // Sentinela 'protected' indica à UI que o link exige senha; a senha em si
      // já está embutida no effectiveToken (SHA-256 no cliente) e validate_share_token
      // reconhece esse sentinela, considerando o match do token suficiente.
      _password: password ? 'protected' : null,
      _expires_at: expiresAt,
      _hidden_visuals: hiddenVisuals,
    });

    if (error) {
      toast({ title: 'Erro ao criar link', description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }

    // Quando há senha, o link público mostra apenas o publicToken + flag p=1
    // Sem senha, mostra o effectiveToken (que é igual ao publicToken)
    const linkParam = password ? publicToken : effectiveToken;
    const link = `${baseUrl}/passagens-aereas/compartilhado?token=${linkParam}${password ? '&p=1' : ''}`;
    setNovoLink(link);
    setNovoLinkProtegido(!!password);
    setNome(''); setSenha(''); setValidade('30');
    setVisiveis(Object.fromEntries(PASSAGENS_VISUALS.map((v) => [v.key, true])));
    load();
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from('passagens_aereas_share_links')
      .update({ active: false })
      .eq('id', id);
    if (error) toast({ title: 'Erro ao revogar', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Link revogado' }); load(); }
  };

  const copyOpenLink = (token: string) => {
    // Só funciona para links sem senha (token efetivo == público)
    const link = `${baseUrl}/passagens-aereas/compartilhado?token=${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" /> Compartilhar Passagens Aéreas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <h3 className="text-sm font-semibold">Gerar novo link</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <Label className="text-xs">Nome / Descrição *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Diretoria abril" />
              </div>
              <div>
                <Label className="text-xs">Validade</Label>
                <Select value={validade} onValueChange={setValidade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VALIDITY_DAYS.map((v) => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Senha (opcional)</Label>
                <Input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Vazio = sem senha" />
              </div>
            </div>

            {PASSAGENS_VISUALS.length > 0 && (
              <div className="rounded-md border bg-background p-3 space-y-2">
                <Label className="text-xs font-semibold">Gráficos e mapas visíveis no link</Label>
                <p className="text-xs text-muted-foreground">
                  Desmarque o que NÃO deve aparecer para quem abrir este link público.
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {PASSAGENS_VISUALS.map((v) => (
                    <label key={v.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={visiveis[v.key] ?? true}
                        onCheckedChange={(c) =>
                          setVisiveis((prev) => ({ ...prev, [v.key]: c === true }))
                        }
                      />
                      <span>{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Gerando...' : 'Gerar link'}
            </Button>
            {novoLink && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {novoLinkProtegido
                    ? '⚠️ Copie o link agora — links com senha NÃO podem ser recuperados depois.'
                    : 'Link gerado. Copie e envie ao destinatário.'}
                </p>
                <div className="rounded-md bg-background border p-2 flex items-center gap-2">
                  <Input value={novoLink} readOnly className="text-xs font-mono" />
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(novoLink); toast({ title: 'Link copiado!' }); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Links ativos</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Senha</TableHead>
                    <TableHead>Visuais</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Acessos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : links.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Nenhum link criado</TableCell></TableRow>
                  ) : links.map((l) => {
                    const expired = l.expires_at && new Date(l.expires_at) < new Date();
                    const hasPassword = !!l.password_hash;
                    const hiddenCount = (l.hidden_visuals ?? []).length;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.nome}</TableCell>
                        <TableCell>{hasPassword ? 'Sim' : 'Não'}</TableCell>
                        <TableCell className="text-xs">
                          {hiddenCount === 0
                            ? 'Todos'
                            : `${hiddenCount} oculto${hiddenCount > 1 ? 's' : ''}`}
                        </TableCell>
                        <TableCell>{l.expires_at ? formatDate(l.expires_at) : 'Nunca'}</TableCell>
                        <TableCell>{l.access_count}</TableCell>
                        <TableCell>
                          {!l.active ? <span className="text-destructive text-xs">Revogado</span>
                            : expired ? <span className="text-muted-foreground text-xs">Expirado</span>
                            : <span className="text-[hsl(var(--success))] text-xs">Ativo</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {l.active && !hasPassword && <Button size="icon" variant="ghost" onClick={() => copyOpenLink(l.token)} title="Copiar link"><Copy className="h-3.5 w-3.5" /></Button>}
                            {l.active && <Button size="icon" variant="ghost" onClick={() => handleRevoke(l.id)} title="Revogar"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Links protegidos por senha não aparecem com botão de copiar — eles só podem ser copiados no momento da criação.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
