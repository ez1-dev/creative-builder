## Objetivo

Quando o backend não conseguir incluir desenhos no PDF do job, o usuário precisa ver claramente o motivo. Hoje o job termina como `CONCLUIDO` sem nenhum aviso e o PDF sai sem desenhos. Vamos surfacing os avisos do backend no card de progresso, no resultado final e no diálogo de diagnóstico.

## Backend (contrato — `docs/backend-impressao-op-pdf-job.md`)

Adicionar ao schema do status (`GET .../pdf-job/{job_id}/status`) o campo:

- `avisos: string[] | null` — lista de mensagens curtas, acumuladas durante a execução. Exemplos:
  - `"Pasta de desenhos inacessível: <caminho_configurado>"`
  - `"Nenhum desenho encontrado para o produto <cod_pro> na pasta <caminho_configurado>"`
  - `"Erro ao normalizar desenho <arquivo>: <detalhe>"`
- `desenhos_resumo?: { ops_total, ops_com_desenho, ops_sem_desenho, paginas_incluidas }` — opcional, mostrado no resumo final.
- `pasta_desenhos?: { configurada, existe, eh_diretorio }` — opcional, para exibir nas falhas.

Regras adicionadas no doc:
1. `localizar_desenhos_produto` / `_pdf_job_resolver_desenhos` devem **adicionar avisos** em vez de falhar silenciosamente nos casos:
   - `PASTA_DESENHOS_OP` não existe / não é diretório → avisar uma vez por job.
   - Pasta acessível mas sem desenho para o `cod_pro` → avisar uma vez por OP.
   - Erro ao abrir/renderizar desenho específico → avisar com nome do arquivo.
2. O job continua até `CONCLUIDO` mesmo com avisos; só vira `ERRO` em falhas estruturais.
3. Endpoint `/desenhos/diagnostico` mantém os campos atuais (`pasta_configurada`, `pasta_existe`, `pasta_eh_diretorio`, `cod_pro`, `candidatos_testados`, `amostra_arquivos_na_pasta`, `desenhos_encontrados`) — apenas reforçar no doc que são contrato e devem permanecer.

## Frontend

### 1. Tipos — `src/lib/producao/opImpressaoPdfJob.ts`
Adicionar a `PdfJobStatus`:
```ts
avisos?: string[] | null;
desenhos_resumo?: {
  ops_total?: number;
  ops_com_desenho?: number;
  ops_sem_desenho?: number;
  paginas_incluidas?: number;
} | null;
pasta_desenhos?: {
  configurada?: string | null;
  existe?: boolean | null;
  eh_diretorio?: boolean | null;
} | null;
```

### 2. Hook — `src/hooks/useImpressaoPdfJob.ts`
Expor no retorno: `avisos`, `desenhosResumo`, `pastaDesenhos`. Passar os valores brutos vindos de `info`. Sem nova lógica de polling.

### 3. UI — `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`

**a) Durante o processamento** (card `pdfJob.isBusy`, ~linha 1234): se `avisos.length > 0`, mostrar uma linha discreta `⚠ N aviso(s)` com tooltip listando os primeiros 3.

**b) Após concluir** (logo abaixo do bloco `pdfJob.status === "CONCLUIDO"`, ~linha 1261): inserir um `<Alert>` `default` amarelo (variant `default` + ícone `AlertTriangle`) quando `pdfJob.avisos?.length > 0`. Conteúdo:
- Título: `PDF gerado com avisos`
- Detecção do caso especial: se algum aviso contém `"Pasta de desenhos inacessível"`, destacar primeiro e oferecer botão "Abrir diagnóstico" (reaproveita `setDiagOpen(true)` + execução de `consultarDiagnostico`).
- Lista expansível (`<details>`) com todos os avisos (`max-h-40 overflow-auto`).
- Se `desenhos_resumo` vier: linha resumo `"X de Y OPs com desenho • N páginas incluídas"`.

**c) Diálogo de diagnóstico** (~linha 1565): adicionar destaque visual quando `pasta_existe === false || pasta_eh_diretorio === false` — banner vermelho no topo: `"Pasta de desenhos inacessível no servidor. Verifique a variável PASTA_DESENHOS_OP no backend (ex.: /mnt/desenhos_op se rodando em Linux/Docker)."` Os campos `candidatos_testados` e `amostra_arquivos_na_pasta` já caem no `<details>` JSON completo, mas vamos renderizá-los também como blocos amigáveis acima do JSON.

### 4. Documentação
Atualizar `docs/backend-impressao-op-pdf-job.md` com:
- Nova seção **"Avisos não-fatais (`avisos[]`)"** descrevendo os 3 casos.
- Schema atualizado de `status` incluindo `avisos`, `desenhos_resumo`, `pasta_desenhos`.
- Nota sobre montagem do compartilhamento UNC (`\\EZORTEA-SRVSENI\...`) em ambiente Linux/Docker via `/mnt/desenhos_op` e env `PASTA_DESENHOS_OP`.
- Reforçar o contrato do endpoint `/desenhos/diagnostico`.

## Fora de escopo

- Não vou alterar nada no backend FastAPI (só o doc serve como spec para a equipe backend).
- Não vou mudar a UI de impressão individual — o foco é o job em lote.
- Sem reset de polling/timeouts: `avisos` chega no mesmo payload já consultado a cada 3s.
