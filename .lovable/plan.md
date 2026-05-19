# Erro 22007 — conversão nvarchar → datetime no Demonstrativo

A mensagem `[22007] ... conversão de um tipo de dados nvarchar em um tipo de dados datetime resultou em um valor fora do intervalo (242)` vem do **SQL Server**, na execução da query do endpoint `GET /api/demonstrativo-compras-recebimentos`. Não é erro de frontend — o backend FastAPI está enviando uma string que o driver ODBC não consegue converter para `datetime`.

Causas típicas:
- `data_ini` / `data_fim` chegando vazios e o SQL concatenando algo como `CONVERT(datetime, '')`.
- `mes_competencia` recebido como `YYYY-MM` e usado direto em conversão para `datetime` (precisa virar `YYYY-MM-01`).
- Defaults no backend tipo `'0001-01-01'` ou `'9999-12-31'` fora do range aceito pelo `datetime` (1753-9999).
- Filtros novos (`numero_oc`, `numero_nf`, `documento`, `tipo_item`, `familia`, `origem_material`, `deposito`) sendo interpretados como data em alguma cláusula errada.

## Escopo

1. **Frontend — defensivo**: enviar `data_ini`/`data_fim` apenas quando forem datas válidas no formato `YYYY-MM-DD` e `mes_competencia` apenas no formato `YYYY-MM` (regex). Mostrar toast quando o usuário digitar algo inválido. Isso evita gatilhar o erro por entrada mal formada.
2. **Documentação backend**: criar/atualizar `docs/backend-demonstrativo-erro-22007.md` listando os pontos a corrigir no FastAPI:
   - Receber `data_ini`/`data_fim` como `Optional[date]` (Pydantic) — qualquer string fora do `YYYY-MM-DD` cai em 422 antes do SQL.
   - Construir o `WHERE` com placeholders parametrizados (`?` no pyodbc) em vez de concatenar strings — evita injeção e conversões implícitas.
   - Tratar `mes_competencia` como `YYYY-MM`: derivar `inicio = data(yyyy, mm, 1)` e `fim = último dia do mês`; nunca passar `'2026-05'` direto em `CONVERT(datetime, ...)`.
   - Validar que defaults não usem `'0001-01-01'` (fora do range `datetime`). Usar `datetime2` ou aplicar limites `>= 1900-01-01`.
   - Garantir que os novos filtros opcionais (`numero_oc`, `numero_nf`, `documento`, `tipo_item`, `deposito`, `familia`, `origem_material`, `transacao`) sejam aplicados como `nvarchar` no `WHERE`, nunca como `datetime`.
3. **Apoio ao diagnóstico**: ao receber 500 nesse endpoint, mostrar no frontend uma mensagem amigável + link "Tentar novamente" (já temos `ErrorState`), e logar `filtros_aplicados` enviados para facilitar reproduzir.

## Detalhes técnicos

### `src/pages/DemonstrativoComprasRecebimentosPage.tsx`
- Adicionar `sanitizeFilters(filters)` chamado dentro de `buildParams()`:
  - `data_ini`, `data_fim`: aceitar apenas se `/^\d{4}-\d{2}-\d{2}$/` e `!Number.isNaN(Date.parse(v))`; caso contrário descartar.
  - `mes_competencia`: aceitar apenas se `/^\d{4}-(0[1-9]|1[0-2])$/`; caso contrário descartar.
  - `tipo_item`: aceitar apenas `PRODUTO`/`SERVICO`/`''`.
- Em `fetchData`, quando o erro `statusCode === 500` e mensagem contiver `22007`/`datetime`, mostrar toast: "O backend rejeitou os filtros de data. Confira período inicial/final e mês competência."

### `docs/backend-demonstrativo-erro-22007.md` (novo)
- Diagnóstico do erro 22007.
- Checklist de correção no FastAPI/pyodbc com exemplos de `WHERE` parametrizado.
- Exemplo de Pydantic model com `Optional[date]` e validador para `mes_competencia`.

## Fora de escopo
- Alterar código do backend FastAPI (não está no repo).
- Mudar layout/visual ou outros módulos.

## Arquivos afetados
- `src/pages/DemonstrativoComprasRecebimentosPage.tsx` (sanitização + mensagem amigável).
- `docs/backend-demonstrativo-erro-22007.md` (novo guia para o backend).
