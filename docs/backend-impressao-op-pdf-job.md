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
  "incluir_operacoes": true
}
```

Regras:
- Sem limite de itens em `ops[]`.
- Rejeitar `codori = "100"` e OPs com `sit_orp = "C"` (silenciosamente ou via `mensagem` no status).
- `incluir_desenhos = true` → cada OP deve trazer suas páginas A4 retrato já normalizadas (mesma lógica de `/desenho/impressao-a4`) embutidas no PDF final.
- `incluir_componentes`, `incluir_operacoes` controlam blocos do relatório (mesma semântica de `/impressao`).

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
  "progresso": 0.42,
  "mensagem": "Processando OP 12 de 30",
  "erro": null,
  "quantidade_ops": 30,
  "tamanho_bytes": 1234567
}
```

- `progresso`: 0..1 (opcional).
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
