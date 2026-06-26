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
  "qualidade_desenhos": "normal",
  "dpi": 150
}
```

Regras:
- Sem limite de itens em `ops[]`.
- Rejeitar `codori = "100"` e OPs com `sit_orp = "C"` (silenciosamente ou via `mensagem` no status).
- `incluir_desenhos = true` → cada OP deve trazer suas páginas A4 retrato já normalizadas (mesma lógica de `/desenho/impressao-a4`) embutidas no PDF final.
- `incluir_componentes`, `incluir_operacoes` controlam blocos do relatório (mesma semântica de `/impressao`).
- **`qualidade_desenhos`** opcional, valores aceitos: `"rapida"` (120 DPI), `"normal"` (150 DPI, **default**) ou `"alta"` (200 DPI). O default mudou para `"normal"` por causa de performance em lotes grandes.
- **`dpi`** opcional (`number`). O frontend sempre envia `dpi` derivado de `qualidade_desenhos` (rapida→120, normal→150, alta→200). Quando `dpi` está presente, o backend deve usar esse valor diretamente e ignorar o mapeamento interno de `qualidade_desenhos`.

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
  "tamanho_bytes": 1234567,
  "tempos_por_etapa": {
    "BUSCANDO_OPS": 1.2,
    "BUSCANDO_COMPONENTES": 2.4,
    "BUSCANDO_OPERACOES": 0.9,
    "LOCALIZANDO_DESENHOS": 0.8
  },
  "tempo_etapa_atual": 14.8,
  "tempo_total": 20.1,
  "avisos": [
    "Pasta de desenhos inacessível: /mnt/desenhos_op",
    "Nenhum desenho encontrado para o produto 12345 na pasta /mnt/desenhos_op"
  ],
  "desenhos_resumo": {
    "ops_total": 244,
    "ops_com_desenho": 198,
    "ops_sem_desenho": 46,
    "paginas_incluidas": 312
  },
  "pasta_desenhos": {
    "configurada": "/mnt/desenhos_op",
    "existe": true,
    "eh_diretorio": true
  }
}
```

- `etapa`: enum — `BUSCANDO_OPS`, `BUSCANDO_COMPONENTES`, `BUSCANDO_OPERACOES`, `LOCALIZANDO_DESENHOS`, `NORMALIZANDO_DESENHOS`, `MONTANDO_PDF`, `GRAVANDO_ARQUIVO`, `CONCLUIDO`.
- `total_ops` / `processadas`: contagem ao vivo durante `NORMALIZANDO_DESENHOS` e `MONTANDO_PDF`.
- `percentual`: 0..100 (preferido pelo frontend). `progresso` (0..1) continua aceito por compat — se ambos vierem, o frontend usa `percentual`.
- `mensagem`: texto livre para exibição.
- `erro`: preencher somente quando `status = "ERRO"`.
- `tamanho_bytes`: preencher quando `status = "CONCLUIDO"`.
- `tempos_por_etapa` (opcional): mapa `EtapaNome → segundos`, somente etapas **já concluídas**. O frontend exibe em linha compacta na ordem canônica.
- `tempo_etapa_atual` (opcional): segundos decorridos na etapa em andamento. Exibido ao lado do label da etapa.
- `tempo_total` (opcional): segundos desde o início do job. Exibido no canto direito do card de progresso.
- `avisos` (opcional): array de strings com avisos **não-fatais** acumulados durante a execução. Ver seção dedicada abaixo.
- `desenhos_resumo` (opcional): resumo de cobertura de desenhos no PDF final. Exibido no alerta amarelo ao concluir.
- `pasta_desenhos` (opcional): snapshot do estado da pasta no momento da execução. Quando `existe=false` ou `eh_diretorio=false`, o frontend mostra alerta destacando o caminho configurado.

## Avisos não-fatais (`avisos[]`)

O job **não deve falhar silenciosamente** quando não conseguir incluir desenhos. Em vez disso, deve acumular mensagens em `avisos[]` e continuar gerando o PDF (sem os desenhos faltantes). Casos obrigatórios:

1. **Pasta inacessível** — quando `PASTA_DESENHOS_OP` não existir ou não for diretório:
   - Adicionar **uma vez por job** (não repetir por OP): `"Pasta de desenhos inacessível: <caminho_configurado>"`
   - Preencher `pasta_desenhos = { configurada, existe: false, eh_diretorio: false }`.
2. **Produto sem desenho** — pasta acessível, mas nenhum arquivo casa com o `cod_pro` da OP:
   - Adicionar **uma vez por OP**: `"Nenhum desenho encontrado para o produto <cod_pro> na pasta <caminho_configurado>"`
3. **Erro de render** — falha ao abrir/normalizar um desenho específico:
   - Adicionar: `"Erro ao normalizar desenho <nome_arquivo>: <detalhe>"`

Aplicar nas funções `localizar_desenhos_produto` e `_pdf_job_resolver_desenhos` — principalmente no fluxo `POST /pdf-job` (lote). O `status` final continua `CONCLUIDO` (só vira `ERRO` em falhas estruturais — DB, disco cheio, etc.).

### Montagem do compartilhamento UNC em Linux/Docker

O valor padrão histórico de `PASTA_DESENHOS_OP` é:

```
\\EZORTEA-SRVSENI\Senior\Sapiens\Pasta de Desenho\02-JPG_OP
```

Esse UNC só funciona no Windows. Quando o FastAPI roda em Linux/Docker, o compartilhamento precisa ser montado no host (ex.: `cifs`) e a env apontar para o mount:

```bash
# /etc/fstab (exemplo)
//EZORTEA-SRVSENI/Senior/Sapiens/Pasta\040de\040Desenho/02-JPG_OP /mnt/desenhos_op cifs credentials=/etc/.smbcred,ro,uid=1000 0 0

# .env do FastAPI
PASTA_DESENHOS_OP=/mnt/desenhos_op
```



### `GET /api/producao/ordem-producao/impressao/pdf-job/{job_id}/download`

- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="ordens-producao-{job_id}.pdf"`
- PDF final contendo, na ordem das OPs enviadas: cabeçalho + componentes + operações + desenhos A4 retrato (quando `incluir_desenhos = true`), com a mesma normalização página a página já documentada em `docs/backend-impressao-ordem-producao.md` (seção "Desenhos — A4 retrato pronto para impressão").
- Aceita `access_token` na query string (mesmo padrão dos demais downloads usados pelo frontend via `api.getExportUrl`).

## Persistência / TTL

- Manter o PDF gerado por pelo menos 1h após `CONCLUIDO`.
- `404` quando `job_id` desconhecido ou expirado.

## Erros

- `400` — payload inválido (sem `ops`, OP com `codori = 100`, `dpi` fora de [72..400], etc.).
- `404` — `job_id` desconhecido.
- `500` — falha inesperada (também refletir em `status = "ERRO"` com `erro` descritivo).

## Recomendações de performance (não normativas)

A versão inicial do endpoint trava com lotes grandes (244+ OPs) porque normaliza desenhos a cada chamada e roda tudo serial. O frontend já está pronto para mostrar progresso por etapa e tempo por etapa — basta o backend implementar:

1. **Cache em disco dos A4 normalizados.**
   - Pasta dedicada (ex.: `./cache_desenhos_a4/`).
   - **Chave inclui DPI**: `md5(nome_arquivo + mtime + size + pagina + dpi)`.
   - Se o cache existir e o arquivo de origem não mudou, reutiliza o JPG A4 pronto. Segunda geração de lotes parecidos cai de minutos para segundos.
   - O frontend exibe um aviso explícito para lotes > 100 OPs informando que a **primeira** geração demora e as próximas são mais rápidas — esse aviso depende do cache existir.

2. **Não chamar HTTP interno para montar o PDF.**
   - Ler o desenho direto do filesystem via `Path(PASTA_DESENHOS_OP_PADRAO) / nome_arquivo`.
   - Elimina HTTP loopback, JWT, CORS, ngrok, timeouts.

3. **Paralelismo controlado.**
   - `ThreadPoolExecutor(max_workers=4)` (2 em servidor fraco, 6 em servidor bom) para a etapa de normalização A4.
   - Atualizar `processadas` no status do job a cada desenho concluído (via lock).

4. **DPI configurável.**
   - Aceitar `dpi` explícito do body; o frontend sempre envia. Faixa típica: 120/150/200.
   - Quando ausente, mapear de `qualidade_desenhos`: rapida→120, normal→150 (default), alta→200.
   - 120 DPI é o ideal para impressão em massa quando os desenhos são esquemáticos.

5. **Montar o PDF sem HTML pesado.**
   - Para o miolo (capa + componentes + operações) use `reportlab` (`SimpleDocTemplate` ou Canvas).
   - Para as páginas de desenho, encaixe os JPGs A4 já normalizados diretamente — `reportlab.Canvas.drawImage` ou `img2pdf` (mais rápido por não reprocessar).

6. **Atualização de status por etapa + tempo.**
   Sequência canônica: `BUSCANDO_OPS` → `BUSCANDO_COMPONENTES` → `BUSCANDO_OPERACOES` → `LOCALIZANDO_DESENHOS` → `NORMALIZANDO_DESENHOS` (com contador) → `MONTANDO_PDF` (com contador) → `GRAVANDO_ARQUIVO` → `CONCLUIDO`.
   - Sempre preencher `percentual` e, quando aplicável, `processadas`/`total_ops`.
   - Ao concluir cada etapa, gravar `tempos_por_etapa[ETAPA] = segundos`. Durante a etapa corrente, atualizar `tempo_etapa_atual` e `tempo_total` a cada heartbeat.
