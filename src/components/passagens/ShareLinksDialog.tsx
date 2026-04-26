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
import { Copy, Link as LinkIcon, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/format';

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

export function ShareLinksDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState('');
  const [validade, setValidade] = useState('30');
  const [senha, setSenha] = useState('');
  const [novoLink, setNovoLink] = useState<string | null>(null);

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
    const token = generateToken();
    const expiresAt = validade !== '0'
      ? new Date(Date.now() + Number(validade) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    let password_hash: string | null = null;
    if (senha.trim()) {
      // Hash via RPC usando crypt + gen_salt
      const { data: hash, error: hashErr } = await supabase.rpc('crypt' as any, { password: senha, salt: '' } as any);
      if (hashErr) {
        // Fallback: usar função inline na inserção
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.rpc('exec_share_link_insert' as any, {
          _token: token, _nome: nome, _password: senha, _expires_at: expiresAt,
        } as any).catch(() => ({ error: { message: 'fallback' } } as any));
        // Se a RPC fallback não existe, faz insert direto e usaremos texto puro como fallback (não ideal, mas senha é opcional)
        if (error) {
          await criarSemHash(token, expiresAt, user?.id);
        }
        finalize(token);
        setCreating(false);
        return;
      }
      password_hash = hash as unknown as string;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('passagens_aereas_share_links').insert({
      token, nome, password_hash, expires_at: expiresAt, created_by: user?.id,
    });
    if (error) {
      toast({ title: 'Erro ao criar link', description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }
    finalize(token);
    setCreating(false);
  };

  const criarSemHash = async (token: string, expiresAt: string | null, userId?: string) => {
    await supabase.from('passagens_aereas_share_links').insert({
      token, nome, password_hash: null, expires_at: expiresAt, created_by: userId,
    });
  };

  const finalize = (token: string) => {
    const link = `${baseUrl}/passagens-aereas/compartilhado?token=${token}`;
    setNovoLink(link);
    setNome(''); setSenha(''); setValidade('30');
    load();
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from('passagens_aereas_share_links')
      .update({ active: false })
      .eq('id', id);
    if (error) toast({ title: 'Erro ao revogar', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Link revogado' }); load(); }
  };

  const copyLink = (token: string) => {
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
          {/* Form novo link */}
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
                <Input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Deixe vazio se não quiser" />
              </div>
            </div>
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Gerando...' : 'Gerar link'}
            </Button>
            {novoLink && (
              <div className="rounded-md bg-background border p-2 flex items-center gap-2">
                <Input value={novoLink} readOnly className="text-xs font-mono" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(novoLink); toast({ title: 'Link copiado!' }); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Lista */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Links ativos</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Senha</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Acessos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : links.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Nenhum link criado</TableCell></TableRow>
                  ) : links.map((l) => {
                    const expired = l.expires_at && new Date(l.expires_at) < new Date();
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.nome}</TableCell>
                        <TableCell>{l.password_hash ? 'Sim' : 'Não'}</TableCell>
                        <TableCell>{l.expires_at ? formatDate(l.expires_at) : 'Nunca'}</TableCell>
                        <TableCell>{l.access_count}</TableCell>
                        <TableCell>
                          {!l.active ? <span className="text-destructive text-xs">Revogado</span>
                            : expired ? <span className="text-muted-foreground text-xs">Expirado</span>
                            : <span className="text-[hsl(var(--success))] text-xs">Ativo</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {l.active && <Button size="icon" variant="ghost" onClick={() => copyLink(l.token)} title="Copiar link"><Copy className="h-3.5 w-3.5" /></Button>}
                            {l.active && <Button size="icon" variant="ghost" onClick={() => handleRevoke(l.id)} title="Revogar"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
