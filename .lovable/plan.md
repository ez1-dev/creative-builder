## Problema
No editor de layout de `/passagens-aereas`, o bloco **"Top Destinos por Valor"** não exibe o botão ⚙️ "Configurar gráfico".

## Causa
Em `src/components/passagens/PassagensDashboard.tsx` (linha 639-642), a lista `CONFIGURABLE_CANONICAL` controla quais blocos canônicos exibem o botão de configuração. O tipo `chart-top-destinos-valor` foi esquecido nessa lista — apesar de a série `top_destinos_valor` já estar registrada no `pageRegistry` e exposta pelo `PageDataProvider`.

## Correção
Adicionar `'chart-top-destinos-valor'` ao array `CONFIGURABLE_CANONICAL`:

```ts
const CONFIGURABLE_CANONICAL = useMemo(
  () => [
    'chart-evolucao-mensal',
    'chart-motivo-viagem',
    'chart-top-cc',
    'chart-top-cidades',
    'chart-top-uf',
    'chart-top-destinos-valor', // ← adicionar
  ],
  [],
);
```

## Arquivos afetados
- `src/components/passagens/PassagensDashboard.tsx` (1 linha)

## Validação
1. Entrar em modo de edição em `/passagens-aereas`.
2. Verificar que o bloco "Top Destinos por Valor" agora mostra o botão ⚙️.
3. Abrir o ConfigureChartDialog, trocar tipo de gráfico/série, salvar e recarregar para confirmar persistência.

## Fora de escopo
Outros blocos não configuráveis intencionalmente (KPIs, mapa, tabela) permanecem como estão.