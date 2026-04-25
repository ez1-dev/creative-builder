# Exportação Excel da árvore de rateios — Contas a Pagar

## Situação atual

O botão **Exportar Excel** em `/contas-pagar` sempre chama `/api/export/contas-pagar`, que devolve a visão "flat" de títulos. Quando o usuário ativa **Modo árvore de rateio**, o Excel exportado **não traz as linhas de rateio** (E075RAT) — apenas os títulos, exatamente como no modo lista.

## Objetivo

Quando o flag **Modo árvore de rateio** estiver ligado, a exportação deve gerar um Excel com a mesma estrutura hierárquica exibida na tela: 1 linha por título + N linhas filhas de rateio (CCU, descrição CCU, % rateio, valor rateado, projeto/fase, origem).

## Abordagem (Opção A — backend-driven)

Criar um novo endpoint de exportação no backend FastAPI dedicado ao modo árvore, e fazer o frontend alternar dinamicamente entre os dois endpoints conforme o flag.

### 1. Backend (documentação + spec) — fora deste repositório

Criar `docs/backend-export-contas-pagar-arvore.md` especificando para o time de backend:

- **Novo endpoint:** `GET /api/export/contas-pagar-arvore`
- **Parâmetros:** os mesmos aceitos por `/api/contas-pagar-arvore` (todos os filtros atuais: `fornecedor`, `numero_titulo`, `tipo_titulo`, `filial`, `centro_custo`, `numero_projeto`/`projeto`, `status_titulo`, datas de vencimento/emissão, etc.).
- **Fonte de dados:** mesma query usada por `/api/contas-pagar-arvore` (E060IPC + E075RAT, com `LEFT JOIN` em projeto/fase/CCU já corrigidos conforme `docs/backend-contas-centro-custo-projeto.md`).
- **Layout do XLSX:**
  - Colunas: `Tipo Linha` (TITULO/RATEIO), `Nº Título`, `Fornecedor`, `Vencimento`, `Status`, `Valor Original`, `Valor Aberto`, `CCU`, `Descrição CCU`, `Projeto`, `Fase`, `% Rateio`, `Valor Rateado`, `Origem Rateio`.
  - Linhas-filhas (RATEIO) indentadas via prefixo na coluna `Tipo Linha` ou `outline level` do openpyxl (group/outline) para o usuário poder colapsar no Excel.
  - Linhas de título com fundo cinza claro (cabeçalho de grupo).
  - Garantir que títulos sem rateios cadastrados apareçam com a marcação `sem rateios cadastrados` na coluna Origem.
- **Nome do arquivo:** `contas_pagar_arvore_<YYYYMMDD_HHMM>.xlsx`.
- **Headers:** `Content-Disposition: attachment; filename=...`, `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

### 2. Frontend — neste repositório

**Arquivo:** `src/pages/ContasPagarPage.tsx`

- Substituir a action atual do `PageHeader` por um `ExportButton` cujo `endpoint` muda em função de `modoArvoreAtivo`:
  ```ts
  const exportEndpoint = modoArvoreAtivo
    ? '/api/export/contas-pagar-arvore'
    : '/api/export/contas-pagar';
  const exportLabel = modoArvoreAtivo
    ? 'Exportar Excel (Árvore)'
    : 'Exportar Excel';
  ```
- Manter `exportParams = { ...filters }` (os mesmos filtros já são aceitos por ambos endpoints).
- Tooltip/label deve deixar claro ao usuário qual visão será exportada.

**Arquivo:** `src/components/erp/ExportButton.tsx`

- Adicionar tratamento gracioso para resposta `404`/`501` no novo endpoint (caso o backend ainda não tenha implementado): exibir toast `Exportação em árvore ainda não disponível no backend. Veja docs/backend-export-contas-pagar-arvore.md.` em vez de erro genérico.

### 3. Testes automatizados

**Arquivo novo:** `src/components/erp/__tests__/ExportButton.arvore.test.tsx`

- Renderiza `ContasPagarPage` (ou um wrapper mínimo) com `modoArvoreAtivo=true` e verifica que o `fetch` é chamado em `/api/export/contas-pagar-arvore`.
- Mesmo teste com `modoArvoreAtivo=false` confirma o endpoint legado `/api/export/contas-pagar`.
- Teste de fallback: resposta 404 dispara toast com a mensagem documentada.

## Arquivos afetados

- `docs/backend-export-contas-pagar-arvore.md` (novo — spec para o backend)
- `src/pages/ContasPagarPage.tsx` (alternar endpoint conforme flag)
- `src/components/erp/ExportButton.tsx` (mensagem amigável p/ 404/501)
- `src/components/erp/__tests__/ExportButton.arvore.test.tsx` (novo)
- `.lovable/plan.md` (registro)

## Fora de escopo

- Implementar o endpoint no FastAPI (vive em outro repositório).
- Mudar o layout visual da árvore na tela.
- Exportar para outros formatos (CSV/PDF).

## Observação

Enquanto o backend não publicar `/api/export/contas-pagar-arvore`, o botão em modo árvore ainda funcionará — apenas exibirá o toast avisando que a exportação hierárquica está pendente, mantendo o restante da UI intacto.
