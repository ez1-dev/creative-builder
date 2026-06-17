# Configuração da DRE Gerencial — endpoints FastAPI

Tela: `/bi/contabilidade/dre/configuracao` (Lovable). A persistência da configuração (modelos, linhas, regras, auditoria) está 100% no Lovable Cloud nas tabelas:

- `public.bi_dre_modelos`
- `public.bi_dre_estrutura_v2`
- `public.bi_dre_linha_regra`
- `public.bi_dre_auditoria`

O frontend só chama o FastAPI para:

1. Consultar plano de contas do ERP (aba "Contas do ERP").
2. Simular o realizado/orçado por linha aplicando as regras do **rascunho** (aba "Simulação").

Ambos os endpoints exigem `Authorization: Bearer <token>` e `ngrok-skip-browser-warning: true`.

## 1) `GET /api/erp/plano-contas`

Query params:

| Param    | Tipo   | Obs                                          |
|----------|--------|----------------------------------------------|
| `busca`  | string | filtra por máscara, reduzido ou descrição.   |
| `pagina` | int    | default 1                                    |
| `tamanho`| int    | default 50                                   |

Resposta:
```json
{
  "itens": [
    { "cd_conta": "1234", "cd_reduzido": "00123", "mascara": "3.1.01.001", "ds_conta": "RECEITA DE VENDAS", "analitica": true, "nivel": 5 }
  ],
  "total": 1
}
```

## 2) `POST /api/bi/contabilidade/dre/simular`

Body:
```json
{ "modelo_id": "uuid", "ano": 2026, "mes_ini": 1, "mes_fim": 6, "unidade": null }
```

Implementação esperada:
- Buscar `bi_dre_estrutura_v2` + `bi_dre_linha_regra` do `modelo_id` (rascunho ou publicado) no Lovable Cloud.
- Materializar as regras como CTE temporária e classificar `bi_vm_lanc_contabil` no Postgres do FastAPI seguindo a mesma cadeia de prioridade do drill existente.
- Quando `unidade` for vazio/`TODAS`/`ALL`, tratar como `NULL`.

Resposta:
```json
{
  "linhas": [
    {
      "codigo_linha": "RECEITA_BRUTA",
      "descricao": "(=) Receita Bruta",
      "nivel": 1,
      "tipo_linha": "ANALITICA",
      "realizado": 1234567.89,
      "orcado": 1200000.00,
      "diferenca": 34567.89,
      "pct": 102.9,
      "qtd_lancamentos": 245
    }
  ]
}
```

## Regras invariantes (frontend)
- `codigo_linha` sempre **técnico** (UPPER_SNAKE). Nunca enviar descrição/label.
- O botão "Publicar modelo" do frontend só habilita após simulação bem-sucedida na sessão atual.
- Toda mutação no Cloud gera registro em `bi_dre_auditoria`.
