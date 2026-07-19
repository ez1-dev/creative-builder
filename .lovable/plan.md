## Diagnóstico (verificado)

O autocomplete da tela `Nova requisição — com OP` chama `GET /api/producao/ordem-producao/opcoes?cod_emp=1&limite_ops=1000` (com opcional `q`). Confirmei no network que a resposta traz `empresas`, `origens`, `pedidos`, `relatorios_producao`, `situacoes` — mas **não** traz `ordens_producao`.

Isso bate com o contrato documentado em `docs/backend-impressao-ordem-producao.md` (linhas 151–163): o backend só popula `ordens_producao` quando a chamada inclui pelo menos um filtro de escopo (`cod_ori`, `num_ped`, `rel_prd`, `sit_orp`). Como a tela nova envia só `cod_emp` (+ eventual `q`), a lista volta vazia — por isso "não traz as OPs".

Na tela de Impressão de OP esse problema não existe porque o usuário escolhe primeiro Pedido/Origem/Relatório e só depois o combo de OPs é populado.

## Objetivo

Fazer o autocomplete retornar OPs úteis assim que o usuário abre a tela, sem exigir passo extra, mantendo compatibilidade com o backend atual (sem depender de mudança na FastAPI).

## O que fazer

1. **Passar um filtro de escopo padrão no fetcher**
   Alterar `fetchOps` em `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` para chamar `searchOps(q, { cod_emp: '1', sit_orp: 'A' })` — situação "Aberta" é o único estado em que faz sentido criar requisição, e satisfaz a exigência do backend de ter algum filtro de escopo.
   Idem para o `useEffect` de warm-up.

2. **Fallback quando `sit_orp` sozinho ainda não retornar OPs**
   Se após o item 1 a resposta seguir vindo sem `ordens_producao` (backend restrito à combinação `cod_ori + sit_orp`), acrescentar no autocomplete um seletor compacto de **Origem** (obrigatório antes de buscar OPs), reaproveitando o combo já disponível via `useOpcoesImpressaoOp().origens`. O `fetchOps` passa a enviar `{ cod_emp, cod_ori, sit_orp: 'A' }`. A UI mostra "Escolha a Origem para listar OPs" enquanto `cod_ori` estiver vazio.

3. **Aviso visual quando a busca retorna vazia**
   No `CommandEmpty` do `OpAutocomplete`, quando `results.length === 0` **e** já houve chamada, mostrar mensagem clara ("Nenhuma OP em aberto encontrada para os filtros atuais") em vez do genérico "Digite para buscar", ajudando o usuário a entender por que a lista está vazia.

4. **Validação no preview**
   Após a mudança do item 1, abrir `/requisicoes/nova-op`, abrir o autocomplete, conferir no Network que a chamada agora vai com `sit_orp=A` e que a resposta traz `ordens_producao` com itens. Se vier vazia, aplicar o item 2 no mesmo turno.

## Fora de escopo

- Nenhuma alteração no backend / FastAPI.
- Nenhuma mudança em cálculos, regras de requisição, gating do SID, tabela de componentes ou etapas seguintes.
- Nenhuma mudança na tela de Impressão de OP (que já funciona com fluxo em cascata).

## Arquivos que devem mudar

- `src/pages/requisicoes/NovaRequisicaoOpPage.tsx` — `fetchOps`, warm-up, e (se necessário) combo de Origem na aba "Buscar OP".
- `src/components/producao/OpAutocomplete.tsx` — apenas se precisar diferenciar o `CommandEmpty` "sem resultado" vs "digite para buscar" (mudança visual mínima).
