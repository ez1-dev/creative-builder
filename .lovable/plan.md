## Situação

O filtro de Unidade de Negócio **não está faltando** — ele já foi implementado na rodada anterior e está presente em `DreStudioVisualizacaoPage.tsx` (barra "Dados", linhas ~2179-2197). A renderização é controlada por `mostrarFiltroUnidade = unidadeCaps.carregado && unidadeCaps.suportaFiltro`.

Hoje, na tela `/contabilidade/dre-padrao`, o Select está oculto porque o backend está respondendo `meta.suporta_filtro_unidade: false` em `/api/contabil/dre/matriz` (e/ou `resultado-pronto`). Por isso a página exibe o badge "Visão consolidada" e o aviso azul com `unidade_indisponivel_motivo`.

## Decisão

Manter o comportamento atual: **ativação silenciosa**. Nenhuma alteração de código é necessária no frontend.

Quando o backend passar a devolver:

```json
{
  "meta": {
    "suporta_filtro_unidade": true,
    "unidades_negocio": [{ "codigo": "GENIUS", "nome": "..." }, ...]
  }
}
```

o Select aparecerá automaticamente na barra "Dados" da DRE Padrão, sem redeploy do frontend, e passará a enviar `?unidade=` para `/matriz`, `/resultado-pronto` e todos os drills. O badge "Visão consolidada" e o aviso azul somem sozinhos.

## Próximo passo

Ação está com o time de backend: habilitar `suporta_filtro_unidade` na meta desses dois endpoints e popular `unidades_negocio`.

Se você quiser, posso em vez disso: (a) validar via inspeção da resposta atual da `/matriz` que o campo realmente vem `false` — útil se você suspeita que o backend já habilitou e o frontend não está lendo; ou (b) mudar a política para "Select desabilitado + tooltip" quando não suportado. É só me dizer.