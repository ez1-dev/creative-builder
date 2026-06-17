import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { criarModeloRascunho, listarLinhas, listarModelos } from '@/lib/bi/dreConfigApi';
import type { DreLinhaConfig, DreModelo } from '@/lib/bi/dreConfigTypes';
import { EstruturaTreeTab } from '@/components/bi/contabilidade/configuracao/EstruturaTreeTab';
import { RegrasLinhaTab } from '@/components/bi/contabilidade/configuracao/RegrasLinhaTab';
import { ContasErpTab } from '@/components/bi/contabilidade/configuracao/ContasErpTab';
import { SimulacaoTab } from '@/components/bi/contabilidade/configuracao/SimulacaoTab';

export default function DreConfiguracaoPage() {
  const [modelos, setModelos] = useState<DreModelo[]>([]);
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<DreLinhaConfig[]>([]);
  const [codigoSelecionado, setCodigoSelecionado] = useState<string | null>(null);
  const [tab, setTab] = useState('estrutura');

  const modelo = modelos.find(m => m.id === modeloId) ?? null;

  const carregarModelos = async () => {
    const arr = await listarModelos();
    setModelos(arr);
    if (!modeloId && arr.length) setModeloId(arr.find(m => m.status === 'rascunho')?.id ?? arr[0].id);
  };

  const carregarLinhas = async () => {
    if (!modeloId) { setLinhas([]); return; }
    setLinhas(await listarLinhas(modeloId));
  };

  useEffect(() => { carregarModelos(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { carregarLinhas(); /* eslint-disable-next-line */ }, [modeloId]);

  const novoRascunho = async () => {
    const nome = prompt('Nome do novo modelo (rascunho):', `DRE rascunho ${new Date().toLocaleDateString('pt-BR')}`);
    if (!nome) return;
    try {
      const m = await criarModeloRascunho(nome);
      toast({ title: 'Rascunho criado' });
      await carregarModelos();
      setModeloId(m.id);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Configuração da DRE Gerencial</CardTitle>
              <p className="text-xs text-muted-foreground">
                Monte a estrutura, regras e vínculos com o plano de contas. Trabalhe em rascunho e publique após simular.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Modelo</label>
                <Select value={modeloId ?? ''} onValueChange={setModeloId}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                  <SelectContent>
                    {modelos.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} <span className="text-muted-foreground">— v{m.versao} ({m.status})</span>
                      </SelectItem>
                    ))}
                    {!modelos.length && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum modelo</div>}
                  </SelectContent>
                </Select>
              </div>
              {modelo && <Badge variant={modelo.status === 'publicado' ? 'default' : 'secondary'}>{modelo.status}</Badge>}
              <Button variant="outline" onClick={novoRascunho}>+ Novo rascunho</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!modelo && (
            <div className="text-sm text-muted-foreground p-8 text-center">
              Crie um modelo rascunho para começar.
            </div>
          )}
          {modelo && (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="estrutura">1. Estrutura da DRE</TabsTrigger>
                <TabsTrigger value="regras">2. Regras da Linha {codigoSelecionado && <span className="ml-1 text-muted-foreground">({codigoSelecionado})</span>}</TabsTrigger>
                <TabsTrigger value="contas">3. Contas do ERP</TabsTrigger>
                <TabsTrigger value="simulacao">4. Simulação</TabsTrigger>
              </TabsList>
              <TabsContent value="estrutura" className="mt-3">
                <EstruturaTreeTab
                  modeloId={modelo.id}
                  linhas={linhas}
                  onChange={carregarLinhas}
                  onSelect={(c) => { setCodigoSelecionado(c); }}
                  selecionadoCodigo={codigoSelecionado ?? undefined}
                />
              </TabsContent>
              <TabsContent value="regras" className="mt-3">
                <RegrasLinhaTab modeloId={modelo.id} codigoLinha={codigoSelecionado} />
              </TabsContent>
              <TabsContent value="contas" className="mt-3">
                <ContasErpTab modeloId={modelo.id} codigoLinhaSelecionada={codigoSelecionado} onAposVincular={() => setTab('regras')} />
              </TabsContent>
              <TabsContent value="simulacao" className="mt-3">
                <SimulacaoTab modelo={modelo} onPublicado={carregarModelos} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
