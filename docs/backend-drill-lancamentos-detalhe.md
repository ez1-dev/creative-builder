# Backend — Enriquecer `/api/contabil/drill-lancamentos`

Endpoint: `GET /api/contabil/drill-lancamentos`

Cada item em `itens[]` deve retornar TODOS os campos abaixo para popular o modal "Lançamento {numero}" do DRE Studio → Visualização (Razão). Campos ausentes aparecem como "—" na UI.

## Campos esperados por item

| Campo | Origem sugerida (Senior) | Observação |
|---|---|---|
| `lancamento` | E085LAN.NUMLAN | Nº técnico |
| `numero` | E085LAN.NUMLAN | Igual a `lancamento` quando não houver outra numeração |
| `lote` | E085LAN.NUMLOT | |
| `data` | E085LAN.DATLAN | ISO `YYYY-MM-DD` |
| `codemp` | E085LAN.CODEMP | |
| `codfil` | E085LAN.CODFIL | |
| `debcre` | Derivado | `'D'` ou `'C'` conforme lado do lançamento na conta selecionada |
| `conta_debito` | E100CTA (conta débito) | Formato `"CODCTA NOMCTA"` |
| `conta_credito` | E100CTA (conta crédito) | Formato `"CODCTA NOMCTA"` |
| `ctared` | Conta reduzida da conta selecionada | Numérica |
| `conta_descricao` | E100CTA.NOMCTA da conta selecionada | |
| `codccu` | E085LAN.CODCCU | |
| `desccu` | E101CCU.NOMCCU | |
| `documento` | E085LAN.NUMDOC | |
| `origem_codigo` | E085LAN.CODORI | |
| `origem_descricao` | E092TAB (descrição da origem) | |
| `usuario_origem` | Usuário do sistema de origem | |
| `usuario_lancamento` | Usuário que efetivou o lançamento contábil | |
| `valor_integral` | Valor original do lançamento (antes de rateio) | Numérico |
| `valor_rateado` | Valor atribuído ao CCU (quando houver rateio) | Numérico |
| `mov_debito` | Valor movimentado a débito na conta selecionada | |
| `mov_credito` | Valor movimentado a crédito na conta selecionada | |
| `saldo_anterior` | Saldo acumulado antes deste lançamento | |
| `saldo` | Saldo acumulado após este lançamento | |
| `historico` | E085LAN.HISLAN | Remover aspas duplas quando possível |

## Contrato JSON

```json
{
  "itens": [
    {
      "lancamento": 1301736552,
      "numero": 1301736552,
      "lote": 13338,
      "data": "2026-01-30",
      "codemp": 1,
      "codfil": 1,
      "debcre": "C",
      "conta_debito": "1101010001 Bancos c/ Movimento",
      "conta_credito": "4140100002 Receitas de Aplicações Financeiras",
      "ctared": 2291,
      "conta_descricao": "Receitas de Aplicações Financeiras",
      "codccu": "0101",
      "desccu": "Administração",
      "documento": null,
      "origem_codigo": "TES",
      "origem_descricao": "Tesouraria",
      "usuario_origem": "agendador",
      "usuario_lancamento": "agendador",
      "valor_integral": 1500.00,
      "valor_rateado": 1500.00,
      "mov_debito": 0,
      "mov_credito": 1500.00,
      "saldo_anterior": -32000.00,
      "saldo": -33500.00,
      "historico": "Rendimento aplicação 30/01/2026"
    }
  ],
  "truncado": false,
  "qtd_total": 1,
  "total_valor": 1500.00
}
```

## Front-end

- Tipagem: `src/lib/contabil/drillLancamentosApi.ts` (interface `DrillLancamentoItem`).
- UI: `src/components/dre-studio/DrillDrawer.tsx` — modal "Lançamento {numero}" já renderiza todos os campos e destaca em negrito o lado (débito/crédito) correspondente a `debcre`.
