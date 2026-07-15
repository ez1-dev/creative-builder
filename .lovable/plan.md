## Objetivo

Refazer o drill de "Lançamentos" da DRE para funcionar como o **Razão / Extrato Contábil** do ERP Senior: uma única conta contábil selecionada, com Mov. Débito, Mov. Crédito e Saldo acumulado, incluindo linhas SALDO inicial/final e rodapé de totais.

## Fluxo de UX

1. Usuário clica em uma linha da DRE e escolhe drill.
2. Se o drill for **Conta Contábil** → lista de contas (fluxo atual mantido).
3. Ao clicar em uma conta específica → abre o **Razão** (novo drawer) já com `ctared` selecionado.
4. Se o usuário selecionar **Lançamentos** direto em linha com múltiplas contas → o drawer exige seleção de conta antes de renderizar o Razão (mostra combo/lista de contas da linha).
5. Se a linha tiver apenas uma conta → abre direto.

## Componentes / arquivos

Novos:
- `src/components/dre-studio/RazaoContaDrawer.tsx` — drawer principal (Razão de uma `ctared`).
- `src/components/dre-studio/RazaoContaSelector.tsx` — passo intermediário quando não há `ctared` definida (lista as contas resolvidas pela linha para o usuário escolher).
- `src/components/dre-studio/RazaoLancamentoDetalhePanel.tsx` — painel secundário com detalhes do lançamento selecionado.
- `src/hooks/contabil/useRazaoConta.ts` — hook do novo endpoint.
- `src/lib/contabil/razaoContaApi.ts` — cliente + tipos do novo contrato.

Alterados:
- `src/components/dre-studio/DrillResultadoPanel.tsx` — quando `agrupar_por === 'lancamento'` OU quando o usuário escolhe uma conta no drill `conta_contabil`, delegar para `RazaoContaDrawer`. Remover as colunas `debito`/`credito` como moeda (não são valores monetários).
- `src/components/dre-studio/DrillDrawer.tsx` — substituir a tabela atual pelo novo `RazaoContaDrawer` (mantém compatibilidade da assinatura). Remover uso de `r.debito`/`r.credito` como dinheiro.
- Contratos: adicionar campos `ctared`, `codigo_reduzido`, `classificacao`, `descricao_conta` no ponto onde a linha da DRE expõe contas (para navegação conta → razão).

## Contrato do backend consumido

`GET /api/contabil/drill-lancamentos` (mesma rota; contrato ampliado):

Query:
- `modelo_id`, `linha_id`, `ctared` (obrigatório), `anomes_ini`, `anomes_fim`, `codemp`, `codfil`, `limite`.
- Nunca enviar `clacta` ou código visual da linha como `ctared`.

Resposta esperada:
```json
{
  "meta": { "modelo_id","linha_id","ctared","clacta","descricao_conta","data_ini","data_fim" },
  "saldo_inicial": number,
  "total_debito": number,
  "total_credito": number,
  "saldo_final": number,
  "qtd_total": number,
  "truncado": boolean,
  "itens": [{
    "lancamento","lote","data","ctared","clacta","conta_descricao",
    "historico","origem_codigo","origem_descricao",
    "usuario_origem","usuario_lancamento",
    "saldo_anterior","mov_debito","mov_credito","saldo",
    "codemp","codfil","conta_debito","conta_credito","codccu","descccu",
    "documento","valor_integral","valor_rateado","debcre"
  }]
}
```

Frontend **não recalcula** saldo nem movimento — apenas renderiza. Se o backend ainda não expuser esses campos, a UI mostra estado "aguardando contrato do backend" com detalhe técnico do que falta (sem inventar valores).

## Layout do Razão (RazaoContaDrawer)

Cabeçalho:
- Título: **Lançamentos**
- Subtítulo: `Conta {ctared} — {descricao_conta}` · `Classificação: {clacta}` · `Período: {data_ini BR} a {data_fim BR}`
- Resumo: Saldo Anterior, Total Débito, Total Crédito, **Saldo Final**.

Tabela (cabeçalho fixo, scroll horizontal, linhas alternadas, cabeçalho azul escuro com texto branco via tokens semânticos do design system — sem cores hardcoded):

| ● | Lançamento | Data | # (ctared) | Conta Contábil (clacta + desc) | Obs. | # (origem_codigo) | Origem Lcto. | Usuário Origem | Usuário Lcto. | Saldo Anterior | Mov. Débito | Mov. Crédito | Saldo |

Linhas especiais:
- **Linha SALDO inicial** (primeira): data = `data_ini`, origem = "SALDO", valor em Saldo Anterior = `saldo_inicial`. Sem lançamento/movimento.
- **Linha SALDO final** (última): data = `data_fim`, origem = "SALDO", Saldo = `saldo_final`.

Rodapé fixo (azul):
- `Mov. Débito: fmtBRL(total_debito)`
- `Mov. Crédito: fmtBRL(total_credito)`
- `Saldo Final: fmtBRL(saldo_final)`

Formatação:
```ts
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0);
```
Células vazias quando `mov_debito`/`mov_credito` for 0 ou null.

## Detalhe do lançamento

Clique na bolinha (●) ou na linha abre `RazaoLancamentoDetalhePanel` (Popover/Sheet secundária) com: empresa, filial, lote, número, conta débito, conta crédito, conta selecionada, CCU, histórico completo, documento, origem, usuário, valor integral, valor rateado, lado D/C.

## Seleção de conta quando não há ctared

`RazaoContaSelector` lista as contas resolvidas para a linha (reaproveita o drill `conta_contabil` já existente) mostrando: reduzida, classificação, descrição, saldo do período. Ao clicar, define `ctared` e monta o Razão. Não misturar contas.

## Design system

Usar tokens semânticos existentes (`bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border`) — proibido `bg-blue-900`, `text-white`, `bg-[#...]`. Tema azul corporativo já configurado no `index.css` cobre o visual azul escuro do Senior.

## Critérios de aceite

Todos os 14 pontos listados pelo usuário. Ao final, o assistente reporta: arquivos alterados, endpoint utilizado, contrato recebido, componentes de tabela/rodapé, e confirmação de que `debito`/`credito` NÃO são usados como moeda e que `mov_debito`, `mov_credito`, `saldo_anterior`, `saldo`, `saldo_inicial`, `saldo_final` são a fonte dos valores monetários.

## Dependência de backend

O contrato descrito (com `saldo_inicial`, `mov_debito`, `mov_credito`, `saldo`, `saldo_final`, `total_debito`, `total_credito`, `usuario_*`, `origem_*`) **precisa existir no FastAPI** em `/api/contabil/drill-lancamentos`. Se o backend ainda não retornar esses campos, a UI vai renderizar apenas o cabeçalho + aviso "backend ainda não expõe campos do Razão", listando exatamente o que falta — sem cálculo no frontend. Confirmar se o backend já foi atualizado antes de implementar, ou implementar assumindo o contrato e documentar em `docs/backend-contabil-razao-conta.md`.