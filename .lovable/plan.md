# Plano — Transação do documento no modal do Razão

Alteração puramente de apresentação em **`src/components/dre-studio/DrillDrawer.tsx`**. Sem mudança no backend, sem consulta ao ERP, sem parsing do histórico.

## 1. Tipagem (interface `DocumentoOrigem`)

Adicionar o campo opcional:

```ts
transacao?: {
  codigo?: string | null;
  descricao?: string | null;
  multiplas?: Array<{ codigo?: string | null; descricao?: string | null }> | null;
} | null;
```

Leitura defensiva — se `documento_origem?.transacao` vier ausente/null, comportamento atual permanece.

## 2. Componente `TransacaoOrigemField`

Novo componente local no mesmo arquivo, seguindo o design system (usar `Tooltip` do shadcn já importado):

- `multiplas.length > 1` → renderiza `Várias (N)` com `Tooltip` listando todas no formato `codigo — descricao` (uma por linha).
- Caso único → `codigo — descricao` (join com `— `, filtrando vazios). Se só código: `codigo`. Se só descrição: `descricao`.
- Sem transação → `—`.
- Nunca escolhe apenas a primeira transação; nunca oculta multiplicidade.

## 3. Renderização no modal

No bloco **Documento/Movimento** (linhas ~1184-1210), inserir logo após `Série` (antes de Cliente/Fornecedor):

```tsx
{doc?.transacao && (
  <Info
    label="Transação"
    value={<TransacaoOrigemField transacao={doc.transacao} />}
  />
)}
```

`Info` hoje aceita `value: string`. Ajuste mínimo: permitir `ReactNode` para acomodar o tooltip de múltiplas transações (mantém compatibilidade com todas as chamadas existentes).

Também garantir que `temMovimento` considere `doc.transacao` como sinal de movimento presente, para casos em que só há transação sem número.

Observação: a linha **Transação** existente acima (linha 1157, derivada de `transacao_origem` do lançamento contábil) permanece inalterada — refere-se à transação da E085LAN e não é substituída pela transação do documento.

## 4. Exportação Excel (`exportarExcel`)

- Adicionar coluna **"Transação"** ao `header` (após "Origem", antes de "Usuário Origem" para manter proximidade da origem do documento).
- Para cada linha, montar valor a partir de `r.documento_origem?.transacao`:
  - Única: `codigo - descricao` (join `-`).
  - Múltiplas: `cod1 - desc1; cod2 - desc2` (nunca exportar apenas `Várias (N)`).
  - Ausente: `""`.
- Ajustar `!isDRE` blocks (linhas SALDO INICIAL/FINAL) para preservar o número de colunas (adicionar `""` na posição correspondente).
- Incluir "Transação" na regra de largura (`wch: 28`).

## 5. Casos de validação

- NFE 20567 → `5101S — Venda de Prod Estab C/SUSPENSAO-REIDI`
- NFE 20582 → `6101 — Venda de Produção do Estabelecimento`
- Múltiplas TNS → `Várias (N)` com lista completa no tooltip.

## Fora de escopo

- Backend `/api/contabil/drill-lancamentos` (o campo já é retornado).
- Grid de lançamentos do drawer (apenas modal + export, conforme prompt).
- Busca global na grid (o projeto não tem busca textual global no drawer hoje; se necessário depois, avaliar em nova iteração).

## Critérios de aceite

- Modal exibe linha "Transação" no bloco Documento/Movimento.
- Transação única mostra `código — descrição`.
- Múltiplas mostram `Várias (N)` + lista completa acessível via tooltip.
- Exportação Excel inclui coluna "Transação" com todas as transações em caso múltiplo.
- Nenhum outro campo do modal ou da grid é alterado.
- Nenhuma alteração no backend.
