import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Save } from 'lucide-react';
import { useCriarModelo, useCriarLinha } from '@/hooks/contabil/useDreStudio';
import * as dreApi from '@/lib/contabil/dreStudioApi';
import { toast } from 'sonner';
import type { TipoModelo } from '@/lib/contabil/dreStudioTypes';

type PadraoOpt = 'vazio' | 'dre' | 'balanco';

export default function DreStudioModeloNovoPage() {
  const nav = useNavigate();
  const [codemp, setCodemp] = useState(1);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<TipoModelo>('DRE');
  const [padrao, setPadrao] = useState<PadraoOpt>('vazio');
  const [saving, setSaving] = useState(false);

  const criar = useCriarModelo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe o nome do modelo.'); return; }
    setSaving(true);
    try {
      const model = await criar.mutateAsync({ codemp, nome: nome.trim(), tipo_modelo: tipo, descricao: descricao || null, ativo: true });

      if (padrao !== 'vazio') {
        try {
          const estrutura = await dreApi.fetchEstruturaPadrao(padrao === 'dre' ? 'DRE' : 'BALANCO');
          const linhas: any[] = Array.isArray(estrutura?.linhas) ? estrutura.linhas : Array.isArray(estrutura) ? estrutura : [];
          // grava em sequência para preservar linha_pai_id por código
          const codigoToId = new Map<string, string>();
          for (const l of linhas) {
            const paiCodigo = l.linha_pai_codigo ?? l.pai_codigo ?? null;
            const linha_pai_id = paiCodigo ? codigoToId.get(paiCodigo) ?? null : null;
            const nova = await dreApi.criarLinha(model.id, {
              linha_pai_id,
              ordem: Number(l.ordem ?? 10),
              codigo: String(l.codigo ?? ''),
              descricao: String(l.descricao ?? ''),
              tipo_linha: l.tipo_linha ?? 'ANALITICA',
              natureza: l.natureza ?? 'OUTROS',
              operador: l.operador ?? 'SOMA',
              sinal: (l.sinal === -1 ? -1 : 1),
              exibir: l.exibir ?? true,
              negrito: l.negrito ?? false,
              formula: l.formula ?? null,
            });
            codigoToId.set(nova.codigo, nova.id);
          }
          toast.success(`Modelo criado com estrutura padrão (${linhas.length} linhas).`);
        } catch (err: any) {
          toast.warning('Modelo criado, mas não foi possível aplicar a estrutura padrão: ' + (err?.message ?? ''));
        }
      } else {
        toast.success('Modelo criado.');
      }
      nav(`/contabilidade/dre-studio/modelos/${model.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao criar modelo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <Button size="sm" variant="ghost" onClick={() => nav(-1)} className="gap-1"><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Button>
      <h1 className="text-xl font-semibold">Novo modelo</h1>

      <form onSubmit={handleSubmit}>
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Empresa</Label>
              <Input type="number" value={codemp} onChange={(e) => setCodemp(Number(e.target.value) || 1)} />
            </div>
            <div className="space-y-1"><Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoModelo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRE">DRE</SelectItem>
                  <SelectItem value="BALANCO">Balanço Patrimonial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="DRE Gerencial" required />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Estrutura inicial</Label>
            <RadioGroup value={padrao} onValueChange={(v) => setPadrao(v as PadraoOpt)} className="space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="vazio" /> Iniciar vazio
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="dre" /> Usar estrutura padrão DRE
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="balanco" /> Usar estrutura padrão Balanço
              </label>
            </RadioGroup>
          </div>

          <div className="pt-2">
            <Button type="submit" className="gap-1" disabled={saving}>
              <Save className="h-3.5 w-3.5" /> {saving ? 'Criando…' : 'Criar modelo'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
