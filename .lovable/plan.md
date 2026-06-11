## Objetivo

Aumentar a performance percebida da impressão em massa de OPs com desenhos: padrão DPI mais leve (150), três níveis de qualidade (Rápida 120 / Normal 150 / Alta 200), exibição da etapa atual do job + tempo por etapa quando o backend retornar, aviso para lotes grandes (>100 OPs) e reforço de que desenhos nunca são renderizados no navegador.

Escopo: somente frontend + atualização da doc de contrato do backend. Geração continua 100% no servidor.

## Mudanças por arquivo

### `src/lib/producao/opImpressaoPdfJob.ts`
- Substituir `PdfJobQualidade = "normal" | "alta"` por `"rapida" | "normal" | "alta"`.
- Adicionar mapeamento de DPI no frontend (`QUALIDADE_DPI = { rapida: 120, normal: 150, alta: 200 }`) e enviar **também** `dpi` no body (além de `qualidade_desenhos`), para o backend poder usar diretamente sem mapear de novo.
- Adicionar `"GRAVANDO_ARQUIVO"` em `PdfJobEtapa`.
- `PdfJobStatus` ganha campo opcional:
  - `tempos_por_etapa?: Record<string, number> | null` — duração em segundos por etapa já finalizada.
  - `tempo_etapa_atual?: number | null` — segundos decorridos na etapa em andamento.
  - `tempo_total?: number | null` — segundos desde o início do job.

### `src/hooks/useImpressaoPdfJob.ts`
- Expor `temposPorEtapa`, `tempoEtapaAtual`, `tempoTotal` no retorno (derivados de `info`).
- Sem mudança no polling.

### `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Estado `qualidadePdf` muda para `"rapida" | "normal" | "alta"`; **default agora é `"normal"`** (150 DPI).
- `Select` de qualidade passa a ter 3 opções:
  - "Rápida (120 DPI)"
  - "Normal (150 DPI) — recomendada"
  - "Alta (200 DPI)"
- `ETAPA_LABELS` ganha `GRAVANDO_ARQUIVO: "Gravando arquivo"`.
- Card de progresso (já existente):
  - Mostrar a linha **"Etapa atual: {label} — {tempoEtapaAtual}s"** quando `tempo_etapa_atual` vier.
  - Abaixo da barra, lista compacta de etapas concluídas com tempo: `Buscando ordens 1.2s • Normalizando 14.8s • Montando 3.1s` (renderizada apenas para chaves presentes em `temposPorEtapa`, na ordem canônica das etapas).
  - Mostrar `tempo_total` ao lado do percentual quando disponível.
- Acima do bloco do botão "Gerar PDF completo com desenhos", quando `selectedKeys.size > 100` e o job estiver em `IDLE`/`ERRO`, exibir um `Alert` informativo (variant default, ícone `Info`):
  > "A primeira geração pode demorar porque os desenhos estão sendo preparados em cache. As próximas gerações serão mais rápidas."
- Texto auxiliar do card de progresso continua: *"Os desenhos não são renderizados no navegador. O PDF é gerado no servidor."* (já está e fica reforçado).
- Nenhuma mudança no `imprimirTodas`/`window.print` — desenhos continuam fora do DOM no fluxo de PDF completo.

### `docs/backend-impressao-op-pdf-job.md`
- `qualidade_desenhos` aceita `"rapida" | "normal" | "alta"`; **default passa a ser `"normal"` (150 DPI)**. Mapeamento: rapida→120, normal→150, alta→200.
- Body pode trazer `dpi: number` explícito (120/150/200); quando presente, prevalece sobre `qualidade_desenhos`.
- Status pode retornar:
  ```json
  {
    "etapa": "NORMALIZANDO_DESENHOS",
    "tempos_por_etapa": { "BUSCANDO_OPS": 1.2, "LOCALIZANDO_DESENHOS": 0.8 },
    "tempo_etapa_atual": 14.8,
    "tempo_total": 17.0
  }
  ```
- Etapa `GRAVANDO_ARQUIVO` adicionada à sequência canônica: `BUSCANDO_OPS → BUSCANDO_COMPONENTES → BUSCANDO_OPERACOES → LOCALIZANDO_DESENHOS → NORMALIZANDO_DESENHOS → MONTANDO_PDF → GRAVANDO_ARQUIVO → CONCLUIDO`.
- Reforçar recomendação de cache A4 em disco — chave inclui `dpi`. Lotes grandes (>100 OPs) na primeira execução enchem cache; reexecuções devem ser dramaticamente mais rápidas.

## Fora de escopo

- Implementação real do cache, do contador de tempo por etapa e do mapeamento DPI no FastAPI.
- Cancelamento server-side, histórico persistido, mudanças na visualização em tela ou em `window.print`.
- Renderização de desenhos no navegador (continua proibida no fluxo de PDF completo).
