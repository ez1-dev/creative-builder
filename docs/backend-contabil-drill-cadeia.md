# Drill-down contábil — cadeia Indicador → Aglutinador → Conta → Razão

Atualizado em 23/07/2026. Frontend integrado em `IndicadoresContabeisPage.tsx`.

## Endpoints consumidos

### 1. `GET /api/contabil/aglutinadores/{codagl}/drill`

Retorna um nível abaixo do aglutinador.

Query: `anomes_ini`, `anomes_fim`, `codemp` (obrigatórios); `codfil`, `base` (opcionais).

Resposta:

```jsonc
{
  "codagl": 8,
  "descricao": "CUSTO DOS PRODUTOS VENDIDOS...",
  "base": "movimento",
  "total": 64212438.43,
  "componentes": [
    {
      "tipo": "aglutinador",
      "operador": "+",
      "codagl": 9,
      "descricao": "Custo das Mercadorias",
      "valor": 41291508.27,
      "drill": {
        "tipo": "aglutinador",
        "endpoint": "/api/contabil/aglutinadores/9/drill",
        "params": { "anomes_ini": 202601, "anomes_fim": 202606 }
      }
    },
    {
      "tipo": "conta",
      "operador": "+",
      "ctared": 612,
      "clacta": "313",
      "descricao": "CUSTOS DOS SERVIÇOS...",
      "valor": 22920930.16,
      "drill": {
        "tipo": "razao",
        "endpoint": "/api/contabil/drill-lancamentos",
        "params": { "ctared": 612, "anomes_ini": 202601, "anomes_fim": 202606 }
      }
    }
  ]
}
```

- `operador` e `valor` já vêm com o sinal aplicado.
- A UI mostra `soma(componentes.valor)` vs `total` — quando diverge > 0,01, badge amarelo "dif.".

### 2. `GET /api/contabil/contas/{ctared}/rollup`

Caminho reverso — "onde este número entra?".

Query: `codemp` (obrigatório).

Resposta:

```jsonc
{
  "ctared": 612,
  "conta": { "clacta": "313", "descricao": "CUSTOS DOS SERVIÇOS..." },
  "aglutinadores": [
    { "codagl": 9, "descricao": "Custo das Mercadorias", "direto": true },
    { "codagl": 8, "descricao": "CPV", "direto": false }
  ],
  "indicadores_afetados": ["Custo", "Resultado Bruto", "Lucro Líquido", "EBITDA", "ROE", "ROA"]
}
```

### 3. Contrato do indicador

O item de `/api/contabil/indicadores` agora aceita o campo opcional `drill`:

```jsonc
{
  "indicador": "EBITDA",
  "valor": 12345.67,
  "unidade": "R$",
  "drill": {
    "aglutinadores": [
      { "codagl": 17, "descricao": "LUCRO OPERACIONAL LIQUIDO",
        "endpoint": "/api/contabil/aglutinadores/17/drill",
        "params": { "anomes_ini": 202601, "anomes_fim": 202606 } }
    ],
    "contas": [
      { "ctared": 1589,
        "endpoint": "/api/contabil/drill-lancamentos",
        "params": { "ctared": 1589, "anomes_ini": 202601, "anomes_fim": 202606 } }
    ]
  }
}
```

Ausência de `drill` desativa o botão de drill-down (mensagem "sem drill exposto").

## Arquivos front

| Arquivo | Papel |
|---|---|
| `src/lib/contabil/drillAglutinadorApi.ts` | Cliente dos dois endpoints |
| `src/hooks/contabil/useAglutinadorDrill.ts` | React Query hooks (`useAglutinadorDrill`, `useContaRollup`) |
| `src/components/contabil/DrillAglutinadorTree.tsx` | Tree-table expansível recursiva (limite 8 níveis) |
| `src/components/contabil/DrillIndicadorDrawer.tsx` | Drawer aberto ao clicar num indicador |
| `src/components/contabil/RollupContaPanel.tsx` | Dialog do "Onde entra?" — chips navegam para `/contabilidade/indicadores?highlight=...` |
| `src/components/dre-studio/DrillDrawer.tsx` | Ganha botão **Onde entra?** no header e aceita modo `ctared`-only |

## UX

1. Usuário clica num indicador → abre `DrillIndicadorDrawer`.
2. Cada ramo (aglutinador) mostra tree expansível com operador (+/−) e valor.
3. Ao chegar numa conta folha, botão **Ver razão →** abre `DrillDrawer` (mesma tela do BI DRE/Balanço).
4. Dentro do razão, botão **Onde entra?** abre `RollupContaPanel` com a cadeia + chips clicáveis dos indicadores impactados.
