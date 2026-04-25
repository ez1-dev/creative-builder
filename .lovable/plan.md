## Contexto

O SQL que dispara o erro **"Nome de coluna 'CUSMED' inválido"** roda no **backend FastAPI externo** (endpoints `/api/faturamento-genius-dashboard` e `/api/faturamento-genius`), que não está neste repositório Lovable. Este projeto contém apenas o frontend (`src/pages/FaturamentoGeniusPage.tsx`) que consome esses endpoints.

Busca confirmou:
- Nenhuma ocorrência de `CUSMED`, `PREMED`, `E075DER` ou SQL do Faturamento Genius no repositório.
- Não existe documento `docs/backend-faturamento-genius.md` (só existem docs para outros módulos: contas, estoque, sugestão min/max, etc.).

Portanto, o que dá pra entregar **dentro deste projeto** é:

1. Criar a especificação de backend que o time do FastAPI deve aplicar (mesmo padrão dos outros docs `backend-*.md`).
2. Tornar o erro mais legível no frontend até a correção subir.

---

## Plano

### 1. Criar `docs/backend-faturamento-genius-cusmed.md`

Conteúdo:
- Descrição do erro retornado pelo SQL Server (`Nome de coluna 'CUSMED' inválido`).
- Causa: `E075DER` no Senior expõe `PREMED` (preço médio) e `PRECUS` (preço de custo); não existe `CUSMED`.
- Substituições obrigatórias: trocar todo `DER.CUSMED` por `DER.PREMED` no SQL dos endpoints `/api/faturamento-genius-dashboard` e `/api/faturamento-genius`.
- JOIN canônico:
  ```sql
  LEFT JOIN dbo.E075DER DER
      ON  DER.CODEMP = IPV.CODEMP
      AND DER.CODPRO = IPV.CODPRO
      AND COALESCE(DER.CODDER, '') = COALESCE(IPV.CODDER, '')
  ```
- Cálculo agregado:
  ```sql
  CAST(SUM(COALESCE(DER.PREMED, 0) * COALESCE(IPV.QTDFAT, 0)) AS FLOAT) AS valor_custo
  ```
- Cálculo no detalhe:
  ```sql
  CAST(COALESCE(DER.PREMED, 0) * COALESCE(IPV.QTDFAT, 0) AS FLOAT) AS valor_custo
  ```
- Checklist de validação: grep por `CUSMED` no projeto FastAPI deve retornar zero ocorrências; smoke test chamando os dois endpoints e validando que `valor_custo > 0` para um período conhecido.

### 2. Ajustar mensagem de erro em `src/pages/FaturamentoGeniusPage.tsx`

Hoje o `catch` da consulta exibe `err?.message` cru no toast. Vou adicionar um mapeamento extra: quando a mensagem contiver `CUSMED` ou `Nome de coluna .* inválido`, exibir um toast/aviso amigável citando que o backend precisa aplicar a correção descrita em `docs/backend-faturamento-genius-cusmed.md`. Sem mudar lógica de dados.

---

## Fora de escopo

- Não há como editar o SQL do FastAPI a partir deste projeto — a correção real precisa ser feita no repositório do backend pelo time responsável, seguindo o doc criado.
