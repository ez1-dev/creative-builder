/**
 * Editor "Aparência e leitura do gráfico".
 *
 * Controlado por value/onChange — quem usa decide quando persistir.
 * Não chama nenhuma API. Botão "Restaurar padrão" volta a
 * DEFAULT_VISUAL_CONFIG.
 */
import { useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_VISUAL_CONFIG,
  mergeVisualConfig,
  FONT_FAMILY_OPTIONS,
  type VisualConfig,
  type LegendPosition,
  type DataLabelFormat,
  type DataLabelPosition,
  type TitleAlign,
  type ResultDescriptionPosition,
  type CardDensity,
  type FontFamilyKey,
} from '@/lib/bi/visualConfig';

interface Props {
  value: Partial<VisualConfig> | null | undefined;
  onChange: (next: VisualConfig) => void;
  /** Chaves de série disponíveis (ex.: ["valor", "quantidade"]) para renomear na legenda. */
  availableSeriesKeys?: string[];
}

const cloneDeep = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export function VisualConfigEditor({ value, onChange, availableSeriesKeys = ['valor'] }: Props) {
  const cfg = mergeVisualConfig(value);

  const update = useCallback(
    (patch: (draft: VisualConfig) => void) => {
      const next = cloneDeep(cfg);
      patch(next);
      onChange(next);
    },
    [cfg, onChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Aparência e leitura do gráfico</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(cloneDeep(DEFAULT_VISUAL_CONFIG))}
        >
          Restaurar padrão
        </Button>
      </div>

      <Tabs defaultValue="titulo">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="titulo">Título</TabsTrigger>
          <TabsTrigger value="legenda">Legenda</TabsTrigger>
          <TabsTrigger value="rotulos">Rótulos</TabsTrigger>
          <TabsTrigger value="descricao">Descrição</TabsTrigger>
          <TabsTrigger value="eixos">Eixos & Grade</TabsTrigger>
          <TabsTrigger value="card">Card</TabsTrigger>
        </TabsList>

        {/* ===== Título e subtítulo ===== */}
        <TabsContent value="titulo" className="space-y-3 pt-3">
          <Row>
            <Switch checked={cfg.title.visible} onCheckedChange={(v) => update((d) => { d.title.visible = v; })} />
            <Label>Exibir título</Label>
          </Row>
          <div>
            <Label className="text-xs">Texto do título</Label>
            <Input value={cfg.title.text} onChange={(e) => update((d) => { d.title.text = e.target.value; })} placeholder="Deixe vazio para usar o padrão" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Alinhamento</Label>
              <Select value={cfg.title.align} onValueChange={(v) => update((d) => { d.title.align = v as TitleAlign; })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Fonte do título (px)" value={cfg.title.fontSize} min={10} max={32}
              onChange={(n) => update((d) => { d.title.fontSize = n; })} />
          </div>
          <FontFamilyField label="Família da fonte do título" value={cfg.title.fontFamily}
            onChange={(v) => update((d) => { d.title.fontFamily = v; })} />

          <hr className="my-2" />

          <Row>
            <Switch checked={cfg.subtitle.visible} onCheckedChange={(v) => update((d) => { d.subtitle.visible = v; })} />
            <Label>Exibir subtítulo</Label>
          </Row>
          <div>
            <Label className="text-xs">Texto do subtítulo</Label>
            <Input value={cfg.subtitle.text} onChange={(e) => update((d) => { d.subtitle.text = e.target.value; })} />
          </div>
          <NumberField label="Fonte do subtítulo (px)" value={cfg.subtitle.fontSize} min={8} max={24}
            onChange={(n) => update((d) => { d.subtitle.fontSize = n; })} />
          <FontFamilyField label="Família da fonte do subtítulo" value={cfg.subtitle.fontFamily}
            onChange={(v) => update((d) => { d.subtitle.fontFamily = v; })} />
        </TabsContent>

        {/* ===== Legenda ===== */}
        <TabsContent value="legenda" className="space-y-3 pt-3">
          <Row>
            <Switch checked={cfg.legend.visible} onCheckedChange={(v) => update((d) => { d.legend.visible = v; })} />
            <Label>Exibir legenda</Label>
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Posição</Label>
              <Select value={cfg.legend.position} onValueChange={(v) => update((d) => { d.legend.position = v as LegendPosition; })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Superior</SelectItem>
                  <SelectItem value="bottom">Inferior</SelectItem>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Fonte da legenda (px)" value={cfg.legend.fontSize} min={8} max={20}
              onChange={(n) => update((d) => { d.legend.fontSize = n; })} />
          </div>
          <FontFamilyField label="Família da fonte da legenda" value={cfg.legend.fontFamily}
            onChange={(v) => update((d) => { d.legend.fontFamily = v; })} />
          {availableSeriesKeys.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Nome amigável das séries</Label>
              {availableSeriesKeys.map((key) => (
                <div key={key} className="grid grid-cols-[120px_1fr] items-center gap-2">
                  <span className="truncate text-xs text-muted-foreground">{key}</span>
                  <Input
                    placeholder={key}
                    value={cfg.legend.seriesLabels[key] ?? ''}
                    onChange={(e) => update((d) => {
                      if (e.target.value) d.legend.seriesLabels[key] = e.target.value;
                      else delete d.legend.seriesLabels[key];
                    })}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== Rótulos de dados ===== */}
        <TabsContent value="rotulos" className="space-y-3 pt-3">
          <Row>
            <Switch checked={cfg.dataLabels.visible} onCheckedChange={(v) => update((d) => { d.dataLabels.visible = v; })} />
            <Label>Exibir valores no gráfico</Label>
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Posição</Label>
              <Select value={cfg.dataLabels.position} onValueChange={(v) => update((d) => { d.dataLabels.position = v as DataLabelPosition; })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Acima</SelectItem>
                  <SelectItem value="bottom">Abaixo</SelectItem>
                  <SelectItem value="inside">Dentro</SelectItem>
                  <SelectItem value="outside">Fora</SelectItem>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Fonte (px)" value={cfg.dataLabels.fontSize} min={8} max={20}
              onChange={(n) => update((d) => { d.dataLabels.fontSize = n; })} />
            <FontFamilyField label="Família da fonte" value={cfg.dataLabels.fontFamily}
              onChange={(v) => update((d) => { d.dataLabels.fontFamily = v; })} />
            <div>
              <Label className="text-xs">Formato</Label>
              <Select value={cfg.dataLabels.format} onValueChange={(v) => update((d) => { d.dataLabels.format = v as DataLabelFormat; })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="int">Número inteiro</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                  <SelectItem value="currency">Moeda (R$)</SelectItem>
                  <SelectItem value="percent">Percentual</SelectItem>
                  <SelectItem value="compact">Compacto (1,2 mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Casas decimais" value={cfg.dataLabels.decimals} min={0} max={4}
              onChange={(n) => update((d) => { d.dataLabels.decimals = n; })} />
            <div>
              <Label className="text-xs">Prefixo</Label>
              <Input value={cfg.dataLabels.prefix} onChange={(e) => update((d) => { d.dataLabels.prefix = e.target.value; })} placeholder="R$ " />
            </div>
            <div>
              <Label className="text-xs">Sufixo</Label>
              <Input value={cfg.dataLabels.suffix} onChange={(e) => update((d) => { d.dataLabels.suffix = e.target.value; })} placeholder="kg / un / %" />
            </div>
          </div>
        </TabsContent>

        {/* ===== Descrição do resultado ===== */}
        <TabsContent value="descricao" className="space-y-3 pt-3">
          <Row>
            <Switch checked={cfg.resultDescription.visible} onCheckedChange={(v) => update((d) => { d.resultDescription.visible = v; })} />
            <Label>Exibir descrição do resultado</Label>
          </Row>
          <div>
            <Label className="text-xs">Texto</Label>
            <Textarea
              rows={3}
              value={cfg.resultDescription.text}
              onChange={(e) => update((d) => { d.resultDescription.text = e.target.value; })}
              placeholder="Ex.: Este gráfico apresenta o faturamento acumulado por mês."
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Variáveis: {'{total}'}, {'{periodo}'}, {'{maior_valor}'}, {'{menor_valor}'}, {'{quantidade_registros}'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Posição</Label>
              <Select value={cfg.resultDescription.position} onValueChange={(v) => update((d) => { d.resultDescription.position = v as ResultDescriptionPosition; })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Acima do gráfico</SelectItem>
                  <SelectItem value="below">Abaixo do gráfico</SelectItem>
                  <SelectItem value="beforeLegend">Antes da legenda</SelectItem>
                  <SelectItem value="afterChart">Depois do gráfico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Fonte (px)" value={cfg.resultDescription.fontSize} min={9} max={20}
              onChange={(n) => update((d) => { d.resultDescription.fontSize = n; })} />
          </div>
          <FontFamilyField label="Família da fonte" value={cfg.resultDescription.fontFamily}
            onChange={(v) => update((d) => { d.resultDescription.fontFamily = v; })} />
        </TabsContent>

        {/* ===== Eixos e grade ===== */}
        <TabsContent value="eixos" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Row>
              <Switch checked={cfg.axis.xVisible} onCheckedChange={(v) => update((d) => { d.axis.xVisible = v; })} />
              <Label>Eixo X</Label>
            </Row>
            <Row>
              <Switch checked={cfg.axis.yVisible} onCheckedChange={(v) => update((d) => { d.axis.yVisible = v; })} />
              <Label>Eixo Y</Label>
            </Row>
            <div>
              <Label className="text-xs">Nome do eixo X</Label>
              <Input value={cfg.axis.xLabel} onChange={(e) => update((d) => { d.axis.xLabel = e.target.value; })} />
            </div>
            <div>
              <Label className="text-xs">Nome do eixo Y</Label>
              <Input value={cfg.axis.yLabel} onChange={(e) => update((d) => { d.axis.yLabel = e.target.value; })} />
            </div>
            <NumberField label="Fonte dos eixos (px)" value={cfg.axis.fontSize} min={8} max={16}
              onChange={(n) => update((d) => { d.axis.fontSize = n; })} />
          </div>
          <hr className="my-2" />
          <Row>
            <Switch checked={cfg.grid.visible} onCheckedChange={(v) => update((d) => { d.grid.visible = v; })} />
            <Label>Linhas de grade</Label>
          </Row>
          <Row>
            <Switch checked={cfg.tooltip.visible} onCheckedChange={(v) => update((d) => { d.tooltip.visible = v; })} />
            <Label>Tooltip ao passar o mouse</Label>
          </Row>
        </TabsContent>

        {/* ===== Card ===== */}
        <TabsContent value="card" className="space-y-3 pt-3">
          <Row>
            <Switch checked={cfg.card.showHeader} onCheckedChange={(v) => update((d) => { d.card.showHeader = v; })} />
            <Label>Cabeçalho do card</Label>
          </Row>
          <Row>
            <Switch checked={cfg.card.showBorder} onCheckedChange={(v) => update((d) => { d.card.showBorder = v; })} />
            <Label>Borda do card</Label>
          </Row>
          <div>
            <Label className="text-xs">Densidade visual</Label>
            <Select value={cfg.card.density} onValueChange={(v) => update((d) => { d.card.density = v as CardDensity; })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compacta">Compacta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="detalhada">Detalhada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>;
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}
