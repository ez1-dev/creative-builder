# Backend — Impressão de OP em Lote via Job Assíncrono (PDF completo)

Frontend: `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` (botão **Gerar PDF completo com desenhos**), hook `src/hooks/useImpressaoPdfJob.ts`, wrapper `src/lib/producao/opImpressaoPdfJob.ts`.

Motivação: a impressão em lote anterior baixava todos os desenhos no navegador via `/api/producao/ordem-producao/desenho/impressao-a4/pagina` e renderizava todas as OPs em React antes de `window.print()`. Acima de algumas dezenas de OPs com desenhos o navegador travava. Toda a geração do PDF completo passa a ser feita no backend.

## Fluxo

1. Frontend monta a lista de OPs selecionadas (sem limite de quantidade) e chama `POST .../pdf-job`.
2. Backend devolve `job_id` imediatamente (HTTP `202`) e processa em background.
3. Frontend faz polling a cada **3s** em `GET .../pdf-job/{job_id}/status`.
4. Quando `status = "CONCLUIDO"`, o frontend mostra o botão **Baixar PDF** que abre `GET .../pdf-job/{job_id}/download`.

## Rotas

### `POST /api/producao/ordem-producao/impressao/pdf-job`

Body JSON:

```json
{
  "ops": [
    { "codemp": 1, "codori": "240", "numorp": 10171 },
    { "codemp": 1, "codori": "240", "numorp": 10172 }
  ],
  "incluir_desenhos": true,
  "incluir_componentes": true,
  "incluir_operacoes": true,
  "qualidade_desenhos": "alta"
}
```

Regras:
- Sem limite de itens em `ops[]`.
- Rejeitar `codori = "100"` e OPs com `sit_orp = "C"` (silenciosamente ou via `mensagem` no status).
- `incluir_desenhos = true` → cada OP deve trazer suas páginas A4 retrato já normalizadas (mesma lógica de `/desenho/impressao-a4`) embutidas no PDF final.
- `incluir_componentes`, `incluir_operacoes` controlam blocos do relatório (mesma semântica de `/impressao`).
- `qualidade_desenhos` opcional: `"alta"` (default, 200 DPI — A4 1654×2338) ou `"normal"` (150 DPI — A4 1240×1754). Use a normal para impressão em massa com OPs muitas.

Resposta `202`:

```json
{ "job_id": "f1c5e8d4-..." }
```

### `GET /api/producao/ordem-producao/impressao/pdf-job/{job_id}/status`

Resposta:

```json
{
  "job_id": "f1c5e8d4-...",
  "status": "PENDENTE | PROCESSANDO | CONCLUIDO | ERRO",
  "etapa": "NORMALIZANDO_DESENHOS",
  "total_ops": 244,
  "processadas": 87,
  "percentual": 35,
  "progresso": 0.35,
  "mensagem": "Normalizando desenhos 87 de 244",
  "erro": null,
  "quantidade_ops": 244,
  "tamanho_bytes": 1234567
}
```

- `etapa`: enum — `BUSCANDO_OPS`, `BUSCANDO_COMPONENTES`, `BUSCANDO_OPERACOES`, `LOCALIZANDO_DESENHOS`, `NORMALIZANDO_DESENHOS`, `MONTANDO_PDF`, `CONCLUIDO`.
- `total_ops` / `processadas`: contagem ao vivo durante `NORMALIZANDO_DESENHOS` e `MONTANDO_PDF`.
- `percentual`: 0..100 (preferido pelo frontend). `progresso` (0..1) continua aceito por compat — se ambos vierem, o frontend usa `percentual`.
- `mensagem`: texto livre para exibição.
- `erro`: preencher somente quando `status = "ERRO"`.
- `tamanho_bytes`: preencher quando `status = "CONCLUIDO"`.

### `GET /api/producao/ordem-producao/impressao/pdf-job/{job_id}/download`

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="ordens-producao-{job_id}.pdf"`
- PDF final contendo, na ordem das OPs enviadas: cabeçalho + componentes + operações + desenhos A4 retrato (quando `incluir_desenhos = true`), com a mesma normalização página a página já documentada em `docs/backend-impressao-ordem-producao.md` (seção "Desenhos — A4 retrato pronto para impressão").
- Aceita `access_token` na query string (mesmo padrão dos demais downloads usados pelo frontend via `api.getExportUrl`).

## Persistência / TTL

- Manter o PDF gerado por pelo menos 1h após `CONCLUIDO`.
- `404` quando `job_id` desconhecido ou expirado.

## Erros

- `400` — payload inválido (sem `ops`, OP com `codori = 100`, etc.).
- `404` — `job_id` desconhecido.
- `500` — falha inesperada (também refletir em `status = "ERRO"` com `erro` descritivo).

## Recomendações de performance (não normativas)

A versão inicial do endpoint trava com lotes grandes (244+ OPs) porque normaliza desenhos a cada chamada e roda tudo serial. O frontend já está pronto para mostrar progresso por etapa — basta o backend implementar:

1. **Cache em disco dos A4 normalizados.**
   - Pasta dedicada (ex.: `./cache_desenhos_a4/`).
   - Chave: `md5(nome_arquivo + mtime + size + pagina + dpi)`.
   - Se o cache existir e o arquivo de origem não mudou, reutiliza o JPG A4 pronto. Segunda geração de lotes parecidos cai de minutos para segundos.
   - Lembre que o endpoint atual `/desenho/impressao-a4/pagina` responde `Cache-Control: no-store` — o cache **interno** do servidor é independente disso.

2. **Não chamar HTTP interno para montar o PDF.**
   - Ler o desenho direto do filesystem via `Path(PASTA_DESENHOS_OP_PADRAO) / nome_arquivo`.
   - Elimina HTTP loopback, JWT, CORS, ngrok, timeouts.

3. **Paralelismo controlado.**
   - `ThreadPoolExecutor(max_workers=4)` (2 em servidor fraco, 6 em servidor bom) para a etapa de normalização A4.
   - Atualizar `processadas` no status do job a cada desenho concluído (via lock).

4. **DPI configurável via `qualidade_desenhos`.**
   - `"alta"` → 200 DPI (1654×2338). `"normal"` → 150 DPI (1240×1754). 150 DPI reduz tempo e tamanho final significativamente para impressão em massa.

5. **Montar o PDF sem HTML pesado.**
   - Para o miolo (capa + componentes + operações) use `reportlab` (`SimpleDocTemplate` ou Canvas).
   - Para as páginas de desenho, encaixe os JPGs A4 já normalizados diretamente — `reportlab.Canvas.drawImage` ou `img2pdf` (mais rápido por não reprocessar).

6. **Atualização de status por etapa.**
   Sequência sugerida: `BUSCANDO_OPS` → `BUSCANDO_COMPONENTES` → `BUSCANDO_OPERACOES` → `LOCALIZANDO_DESENHOS` → `NORMALIZANDO_DESENHOS` (com contador) → `MONTANDO_PDF` (com contador) → `CONCLUIDO`. Sempre preencher `percentual` e, quando aplicável, `processadas`/`total_ops` para o frontend mostrar barra + "X de Y OPs".
