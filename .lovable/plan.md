## Objetivo
Na tela **Nova requisição — com OP**, permitir escolher a OP num autocomplete pré-carregado (em vez de digitar CODORI e NUMORP manualmente), preenchendo automaticamente os dois campos e disparando a consulta.

## Mudanças
Arquivo único: `src/pages/requisicoes/NovaRequisicaoOpPage.tsx`.

1. Usar o componente já existente `OpAutocomplete` (`src/components/producao/OpAutocomplete.tsx`) alimentado pelo hook `useOpcoesImpressaoOp().searchOps` — mesma fonte usada nas telas de Impressão de OP, que traz OPs com `cod_ori` + `num_orp` + produto/descrição.
2. Pré-carga: ao montar a página, disparar `searchOps('')` para trazer a lista inicial (limite 1000, já sanitizada — sem OPs canceladas e sem origem 100).
3. Layout do card de busca:
   - Campo principal: `OpAutocomplete` (busca por número, produto ou descrição).
   - Campos `CODORI` e `NUMORP` continuam visíveis, porém preenchidos automaticamente ao selecionar uma OP; permanecem editáveis para quem quiser digitar manualmente.
   - Ao selecionar uma OP no autocomplete: setar `codori`/`numorp` e já executar `setBuscar(...)` para carregar componentes sem precisar clicar em "Consultar OP".
   - Botão "Consultar OP" mantido como fallback para entrada manual.
4. Nada de mudança em regras, cálculos, envio ao SID, ou payload — só a UX de seleção da OP.

## Fora de escopo
- Alterar contrato de API, payload do POST ou lógica de atendimento.
- Alterar a página `Nova requisição sem OP` ou o Portal.
