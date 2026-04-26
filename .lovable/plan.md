## Objetivo

Adicionar opção **"Agrupar por"** no widget de **Tabela** do dashboard de Passagens Aéreas. Ao escolher um campo (ex: Centro de Custo), a tabela passa a mostrar:

- Linha de **cabeçalho de grupo** destacada com o valor do agrupamento + quantidade de registros + **subtotal** do valor.
- Linhas dos registros indentadas abaixo de cada grupo.
- Grupos ordenados do maior subtotal para o menor.

A opção fica no **inspetor do widget** quando o tipo é Tabela: dropdown "Agrupar por" com as opções: *Sem agrupamento*, Centro de Custo, Colaborador, Tipo de Despesa, Cia Aérea, Projeto/Obra, Fornecedor, Origem, Destino. (Reaproveita os campos `text` já definidos em `PASSAGENS_FIELDS`.)

## Visual esperado

```text
Registros (80)
─────────────────────────────────────────────────────
[CENTRO DE CUSTO 4001] (12 reg.)        R$ 28.450,00
   01/04  João Silva  Demissão  GRU→CGB  R$ 1.200,00
   02/04  Maria S.    Folha     GRU→CWB  R$ 980,00
   ...
[CENTRO DE CUSTO 4002] (8 reg.)         R$ 19.800,00
   ...
```

## Mudanças técnicas

**1. `src/components/dashboard-builder/types.ts`**
- Adicionar campo opcional `groupBy?: string` em `WidgetConfig`.

**2. `src/components/dashboard-builder/WidgetRenderer.tsx`** (bloco `type === 'table'`)
- Se `config.groupBy` está vazio: renderiza tabela atual (sem mudança).
- Se preenchido: agrupa `rows` por aquele campo, calcula subtotal de `valor`, ordena por subtotal desc, renderiza linhas de grupo (com `colSpan` e classe `bg-muted/60 font-semibold`) seguidas dos registros indentados (`pl-6`).
- Mantém limite de 100 registros por grupo para performance.

**3. `src/components/dashboard-builder/WidgetInspector.tsx`**
- Quando `widget.type === 'table'`, mostrar um Select **"Agrupar por"** com:
  - "Sem agrupamento" (valor vazio)
  - Todos os campos `kind === 'text'` de `PASSAGENS_FIELDS`.
- Ocultar campos não aplicáveis (Dimensão, Métrica, Campo, Granularidade, Limite, Formato) para o tipo Tabela — eles não fazem sentido nessa view.

## O que não muda

- Não é necessária migração — `groupBy` cabe no `config jsonb` existente.
- Drill-down, cross-filter e demais widgets continuam iguais.

## Como o usuário usará

1. Em `/passagens-aereas`, clicar em **"Personalizar"** (ou "Editar padrão" se for admin).
2. Clicar no widget **"Registros"** (tabela).
3. No inspetor lateral, escolher **Agrupar por → Centro de Custo**.
4. Clicar em **Salvar**.
