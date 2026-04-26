# Correção do filtro `tipo_item` no Painel de Compras

## Diagnóstico (confirmado em rede)

Capturei a chamada real do preview:

- Request: `GET /api/painel-compras?tipo_item=SERVICO&somente_pendentes=true&...`
- Response: `total_registros: 2278`, `dados[*].tipo_item = "PRODUTO"` em todas as linhas amostradas.

Comparado à chamada sem filtro (`tipo_item` ausente), o backend devolve **exatamente o mesmo total (2278)** e os mesmos itens. Ou seja: o backend está **ignorando** `tipo_item=SERVICO`.

Causa provável (conforme descrito): no FastAPI a condição que aplica o `WHERE` compara contra a lista `("PRODUTO", "SERVIÇO")` (com cedilha). Como o front envia `SERVICO` sem acento, a comparação falha e nenhum filtro é aplicado.

Como o repositório Lovable contém apenas o frontend (a API roda em FastAPI atrás de ngrok), a correção definitiva tem que ser feita no projeto do backend. Vou produzir um documento técnico claro para o time aplicar e, em paralelo, **opcionalmente** aplicar uma mitigação no front.

## O que será feito neste plano

### 1. Criar `docs/backend-painel-compras-tipo-item.md`

Documento de patch endereçado ao backend, contendo:

- **Resumo do bug** com payload real capturado (request + amostra do response provando que `tipo_item=SERVICO` é ignorado).
- **Endpoints afetados:**
  - `GET /api/painel-compras`
  - `GET /api/export/painel-compras`
- **Patch esperado** em `consultar_painel_compras` (pseudocódigo Python/SQLAlchemy):

  ```python
  def normalizar_tipo_item(valor: str | None) -> str:
      if not valor:
          return "TODOS"
      v = valor.strip().upper().replace("Ç", "C")
      if v in {"SERVICO", "SERVICOS", "S"}:
          return "SERVICO"
      if v in {"PRODUTO", "PRODUTOS", "P"}:
          return "PRODUTO"
      return "TODOS"

  def normalizar_tipo_oc(valor: str | None) -> str:
      if not valor:
          return "TODOS"
      v = valor.strip().upper().replace("Ç", "C")
      if v in {"SERVICO", "SERVICOS", "S"}:
          return "SERVICO"
      if v == "PRODUTO":
          return "PRODUTO"
      if v == "MISTA":
          return "MISTA"
      if v == "NORMAL":
          return "NORMAL"
      return "TODOS"
  ```

  Aplicação no WHERE:

  ```python
  tipo = normalizar_tipo_item(params.tipo_item)
  if tipo == "PRODUTO":
      query = query.where(Q.tipo_item == "PRODUTO")
  elif tipo == "SERVICO":
      query = query.where(Q.tipo_item.in_(["SERVICO", "SERVIÇO"]))
  # TODOS => sem filtro
  ```

- **Padronização do retorno** (output do SELECT) para que `tipo_item` seja sempre `'PRODUTO'` ou `'SERVICO'` (sem acento), evitando que o front precise tratar variações.
- **Mesma normalização para `tipo_oc`** aceitando `SERVICO`/`SERVIÇO`, `PRODUTO`, `MISTA`, `NORMAL`.
- **Garantia** de que `/api/export/painel-compras` use a mesma função (já que reutiliza `consultar_painel_compras` e repassa `tipo_item`).
- **Checklist de validação** para o backend executar:
  ```
  GET /api/painel-compras?tipo_item=SERVICO&somente_pendentes=false
    -> dados[*].tipo_item ∈ {SERVICO, SERVIÇO}
    -> total_registros diferente de quando tipo_item=PRODUTO
    -> total_registros diferente da consulta sem filtro
  GET /api/painel-compras?tipo_item=PRODUTO  -> só PRODUTO
  GET /api/painel-compras?tipo_item=TODOS    -> ambos
  GET /api/painel-compras?tipo_item=SERVIÇO  -> idem SERVICO
  GET /api/painel-compras?tipo_item=S        -> idem SERVICO
  GET /api/export/painel-compras?tipo_item=SERVICO -> XLSX só com serviços
  ```

### 2. Mitigação no frontend (em paralelo, defensiva)

Em `src/pages/PainelComprasPage.tsx`, na função `search()`, após receber o response, **se** `filters.tipo_item !== 'TODOS'` aplicar um `.filter()` no `data.dados` para manter apenas os itens cujo `tipo_item` (normalizado por `replace('Ç','C').toUpperCase()`) bata com o filtro selecionado. Também recomputar `resumo.itens_produto/itens_servico` e `total_registros` localmente quando o filtro estiver ativo, para que os KPIs fiquem coerentes.

Aviso visual: quando o filtro `tipo_item` ≠ TODOS estiver ativo e o backend devolver linhas que não bateriam, exibir um pequeno toast `"Filtro aplicado localmente — backend ainda não suporta SERVICO sem acento"` (uma vez por sessão) para deixar transparente que é mitigação. Esse trecho pode ser removido depois que o backend for corrigido.

> Esta etapa só é executada se você optar por mitigar no front. Se preferir aguardar a correção do backend, o documento sozinho já basta.

## Arquivos

- criar: `docs/backend-painel-compras-tipo-item.md`
- editar (opcional, mitigação): `src/pages/PainelComprasPage.tsx`

## Observações

- Memória `mem://features/painel-compras` será atualizada para registrar o caveat `tipo_item` enquanto o patch do backend não chega.
- A paginação continuará vindo do backend (`total_registros`), então a mitigação no front é apenas paliativa para a página atual — só a correção do backend resolve de forma completa.
