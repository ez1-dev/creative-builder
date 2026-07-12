/**
 * Seção "Modo Demonstração" em Configurações.
 * Permite ao usuário configurar quais módulos, gráficos e dados serão ocultados/mascarados
 * para apresentar o produto a investidores.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { EyeOff, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useDemoMode, type MaskDocKind, type MaskNameKind, type TextReplacement } from '@/contexts/DemoModeContext';
import { VISUAL_CATALOG } from '@/lib/visualCatalog';

const MODULE_GROUPS: { label: string; items: { path: string; name: string }[] }[] = [
  {
    label: 'Financeiro / Fiscal',
    items: [
      { path: '/contas-pagar', name: 'Contas a Pagar' },
      { path: '/contas-receber', name: 'Contas a Receber' },
      { path: '/contabilidade/balanco', name: 'Balanço Patrimonial' },
      { path: '/bi/contabilidade/dre', name: 'DRE Contábil' },
      { path: '/bi/financeiro/dre-configuravel', name: 'DRE Configurável' },
      { path: '/auditoria-tributaria', name: 'Auditoria Tributária' },
      { path: '/conciliacao-edocs', name: 'Conciliação EDocs' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { path: '/bi/comercial', name: 'BI Comercial' },
      { path: '/bi/comercial/metas', name: 'Metas de Faturamento' },
      { path: '/bi/faturamento-validacao', name: 'Validação Faturamento' },
      { path: '/faturamento-genius', name: 'Faturamento Genius' },
      { path: '/auditoria-apontamento-genius', name: 'Auditoria Apont. Genius' },
    ],
  },
  {
    label: 'RH',
    items: [
      { path: '/rh', name: 'RH — Índice' },
      { path: '/rh/resumo-folha', name: 'Resumo Folha' },
      { path: '/rh/quadro-colaboradores', name: 'Quadro de Colaboradores' },
      { path: '/rh/contrato-experiencia', name: 'Contrato Experiência' },
      { path: '/rh/programacao-ferias', name: 'Programação de Férias' },
      { path: '/rh/turnover', name: 'Turnover' },
      { path: '/rh/absenteismo', name: 'Absenteísmo' },
      { path: '/rh/relatorio-gerencial', name: 'Relatório Gerencial RH' },
    ],
  },
  {
    label: 'Produção / Estoque',
    items: [
      { path: '/estoque', name: 'Consulta de Estoques' },
      { path: '/estoque-min-max', name: 'Estoque Min/Max' },
      { path: '/painel-compras', name: 'Painel de Compras' },
      { path: '/producao/dashboard', name: 'Produção — Dashboard' },
      { path: '/producao/programacao', name: 'Sequenciamento' },
      { path: '/manutencao-maquinas', name: 'Manutenção de Máquinas' },
      { path: '/frota', name: 'Manutenção de Frota' },
      { path: '/passagens-aereas', name: 'Passagens Aéreas' },
    ],
  },
  {
    label: 'Administração / Interno',
    items: [
      { path: '/etl', name: 'Central ETL' },
      { path: '/regras-senior', name: 'Regras Senior' },
      { path: '/monitor-usuarios-senior', name: 'Monitor Usuários Senior' },
      { path: '/monitor-telas', name: 'Monitor de Telas' },
      { path: '/gestao-sgu-usuarios', name: 'Gestão SGU' },
      { path: '/relatorios/desenvolvimento', name: 'Criador de Relatórios' },
    ],
  },
];

const NAME_KINDS: { kind: MaskNameKind; label: string }[] = [
  { kind: 'cliente', label: 'Clientes' },
  { kind: 'fornecedor', label: 'Fornecedores' },
  { kind: 'colaborador', label: 'Colaboradores' },
  { kind: 'motorista', label: 'Motoristas' },
  { kind: 'revenda', label: 'Revendas' },
];

const DOC_KINDS: { kind: MaskDocKind; label: string }[] = [
  { kind: 'cnpj', label: 'CNPJ' },
  { kind: 'cpf', label: 'CPF' },
  { kind: 'placa', label: 'Placas de veículos' },
  { kind: 'nota', label: 'Números de nota fiscal' },
];

export function DemoModeSection() {
  const { prefs, save, loading } = useDemoMode();
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState(prefs);
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');

  // Sincroniza local quando os prefs chegam do servidor.
  useState(() => setLocal(prefs));
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  const toggleModule = (path: string) => {
    const set = new Set(local.hidden_modules);
    set.has(path) ? set.delete(path) : set.add(path);
    setLocal({ ...local, hidden_modules: [...set] });
  };

  const toggleVisual = (key: string) => {
    const set = new Set(local.hidden_visuals);
    set.has(key) ? set.delete(key) : set.add(key);
    setLocal({ ...local, hidden_visuals: [...set] });
  };

  const addReplacement = () => {
    if (!newFrom.trim()) return;
    const next: TextReplacement[] = [...(local.text_replacements ?? []), { from: newFrom, to: newTo }];
    setLocal({ ...local, text_replacements: next });
    setNewFrom(''); setNewTo('');
  };

  const removeReplacement = (i: number) => {
    const next = local.text_replacements.filter((_, idx) => idx !== i);
    setLocal({ ...local, text_replacements: next });
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await save(local);
      toast.success('Modo Demonstração salvo');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-primary" />
              Modo Demonstração
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Esconda módulos inteiros, gráficos específicos e mascare dados sensíveis (nomes,
              valores, documentos) para apresentar o produto a investidores sem expor
              informações reais. Os dados no banco não são alterados.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Label htmlFor="demo-enabled" className="text-sm">Ativar</Label>
            <Switch
              id="demo-enabled"
              checked={local.enabled}
              onCheckedChange={(v) => setLocal({ ...local, enabled: v })}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={doSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> Salvar preferências
          </Button>
        </CardContent>
      </Card>

      {/* Módulos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Módulos ocultos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Itens marcados desaparecem do menu lateral e a rota é redirecionada para o Dashboard Geral.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {MODULE_GROUPS.map((g) => (
            <div key={g.label}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g.label}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.items.map((it) => {
                  const checked = local.hidden_modules.includes(it.path);
                  return (
                    <label key={it.path} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                      <Checkbox checked={checked} onCheckedChange={() => toggleModule(it.path)} />
                      <span className="text-sm">{it.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          {local.hidden_modules.length > 0 && (
            <Badge variant="secondary">{local.hidden_modules.length} módulo(s) oculto(s)</Badge>
          )}
        </CardContent>
      </Card>

      {/* Visuais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gráficos e mapas ocultos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Esconde gráficos específicos dentro das páginas visíveis. Reaproveita o catálogo
            usado em "Perfis de Acesso › Gráficos e Mapas".
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {VISUAL_CATALOG.map((g) => (
            <div key={g.module}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{g.module}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.items.map((it) => {
                  const checked = local.hidden_visuals.includes(it.key);
                  return (
                    <label key={it.key} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                      <Checkbox checked={checked} onCheckedChange={() => toggleVisual(it.key)} />
                      <span className="text-sm">{it.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mascaramento de dados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mascaramento de dados</CardTitle>
          <p className="text-xs text-muted-foreground">
            Aplica-se aos componentes já instrumentados com <code>&lt;DemoText&gt;</code>,
            <code>&lt;DemoMoney&gt;</code> e <code>&lt;DemoDoc&gt;</code>. Novas telas
            podem ser instrumentadas gradualmente.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-semibold">Substituir nomes por fictícios</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NAME_KINDS.map(({ kind, label }) => (
                <label key={kind} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={!!local.mask_names[kind]}
                    onCheckedChange={(v) =>
                      setLocal({ ...local, mask_names: { ...local.mask_names, [kind]: !!v } })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">Valores monetários</Label>
            <RadioGroup
              value={local.mask_values.mode}
              onValueChange={(v) => setLocal({ ...local, mask_values: { ...local.mask_values, mode: v as any } })}
              className="mt-2 grid gap-2 sm:grid-cols-3"
            >
              <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="keep" /> <span className="text-sm">Manter reais</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="scale" />
                <span className="text-sm">Escalar × </span>
                <Input
                  type="number" step="0.01" className="h-7 w-20"
                  value={local.mask_values.factor ?? 1}
                  onChange={(e) => setLocal({ ...local, mask_values: { ...local.mask_values, factor: parseFloat(e.target.value) || 1 } })}
                />
              </label>
              <label className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="hide" /> <span className="text-sm">Ocultar (R$ ●●●)</span>
              </label>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-semibold">Documentos mascarados</Label>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DOC_KINDS.map(({ kind, label }) => (
                <label key={kind} className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50">
                  <Checkbox
                    checked={!!local.mask_docs[kind]}
                    onCheckedChange={(v) =>
                      setLocal({ ...local, mask_docs: { ...local.mask_docs, [kind]: !!v } })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Substituições de texto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Substituições de texto</CardTitle>
          <p className="text-xs text-muted-foreground">
            Aplicadas dentro dos componentes <code>&lt;DemoText&gt;</code>. Útil para renomear
            "Empresa X" → "ACME Corp" em toda a UI instrumentada.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1">
              <Label className="text-xs">De</Label>
              <Input value={newFrom} onChange={(e) => setNewFrom(e.target.value)} placeholder="Texto original" />
            </div>
            <div className="flex-1">
              <Label className="text-xs">Para</Label>
              <Input value={newTo} onChange={(e) => setNewTo(e.target.value)} placeholder="Substituição" />
            </div>
            <Button variant="outline" onClick={addReplacement} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          {local.text_replacements.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma substituição cadastrada.</p>
          ) : (
            <ul className="space-y-1">
              {local.text_replacements.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-sm rounded-md border px-3 py-1.5">
                  <span className="font-mono">{r.from}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono">{r.to}</span>
                  <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => removeReplacement(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={doSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> Salvar preferências
        </Button>
      </div>
    </div>
  );
}
