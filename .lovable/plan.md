
## Objetivo

Na tela `/producao/impressao-op`, substituir os inputs de texto livre por selects pesquisáveis alimentados pelo endpoint `GET /api/producao/ordem-producao/opcoes`, com recargas em cascata conforme o usuário escolhe Empresa → Origem → OP → Estágio → Centro de Recurso.

## Mudanças no frontend

### 1. Novo tipo + hook de opções

Criar `src/lib/producao/opcoesImpressao.ts`:

- `OpcaoEmpresa { cod_emp, nome_emp }`
- `OpcaoOrigem { cod_ori, descricao }`
- `OpcaoOp { cod_emp, cod_ori, num_orp, produto, descricao_produto, label }`
- `OpcaoEstagio { cod_etg, descricao }`
- `OpcaoCentroRecurso { cod_cre, descricao }`
- `OpcoesImpressao { empresas, origens, ordens_producao, estagios, centros_recurso }`
- `OpcoesParams { cod_emp?, cod_ori?, num_orp?, cod_etg?, cod_cre?, q?, limite_ops? }`

Criar `src/hooks/useOpcoesImpressaoOp.ts`:

- Função `fetchOpcoes(params)` que chama `api.get('/api/producao/ordem-producao/opcoes', params)`.
- Estado local para cada lista, mais flag de loading por campo.
- Helpers `reloadBase`, `reloadByEmpresa`, `reloadByOrigem`, `reloadEstagios(num_orp)`, `reloadCres(num_orp, cod_etg)`.
- `searchOps(q)` debounced (300 ms) usado pelo autocomplete de OP. Sempre envia `limite_ops=80`.

### 2. Reescrever filtros em `ImpressaoOrdemProducaoPage.tsx`

Substituir os 7 `<Input>` por componentes pesquisáveis:

- **Empresa** — Combobox com `empresas`. Label `cod_emp - nome_emp`. Ao mudar: limpar Origem/OP/Estágio/Centro e chamar `reloadByEmpresa(cod_emp)`.
- **Origem** — Combobox com `origens`. Habilitado quando há empresa. Ao mudar: limpar OP/Estágio/Centro e chamar `reloadByOrigem(cod_emp, cod_ori)`.
- **Número da O.P.** — Autocomplete assíncrono (reusar padrão de `AutocompleteAsync.tsx` com fetcher custom). Pesquisa por `q`, exibe `"{cod_ori} / {num_orp} - {produto} - {descricao_produto}"`. Ao selecionar, popular `cod_emp`/`cod_ori`/`num_orp` no estado de filtros (sobrescrevendo empresa/origem se vierem da OP) e chamar `reloadEstagios(num_orp)` + `reloadCres(num_orp)`.
- **Listar Componentes / Listar Desenho** — manter Select S/N existente.
- **Estágio** — Combobox com `estagios`. Label `cod_etg - descricao`. Ao mudar: chamar `reloadCres(num_orp, cod_etg)`.
- **Centro de Recurso** — Combobox com `centros_recurso`. Label `cod_cre - descricao`.

Componente reutilizável local `SelectBuscavel` (Popover + Command, padrão do `AutocompleteAsync`) — adicionar dentro de `src/components/producao/SelectBuscavel.tsx` para suportar lista síncrona com busca em memória, ou reaproveitar `AutocompleteAsync` passando um fetcher que filtra in-memory.

### 3. Carga inicial

No `useEffect` da página, chamar `reloadBase()` → `GET /opcoes?limite_ops=80`. Mostrar skeleton/loader leve nos selects enquanto carrega.

### 4. Validação do botão Consultar

Em `consultar()`: se `!filtros.num_orp` → `toast.info('Informe ou selecione uma Ordem de Produção.')`. Como Empresa/Origem agora vêm sempre da OP selecionada (ou do select), validar apenas `num_orp`. Manter chamada existente a `fetchData(filtros)`.

### 5. Limpar

Em `limpar()`: resetar estado e recarregar `reloadBase()` para repopular listas-base.

## Fora de escopo

- Backend FastAPI (assumimos endpoint `/opcoes` já existe ou será implementado em paralelo). Se 404, manter a mensagem de erro atual.
- Layout do A4 de impressão, código de barras e demais regras já entregues.
- Permissões, sidebar e design tokens.

## Validação

1. Abrir `/producao/impressao-op` → ver chamada `GET /opcoes?limite_ops=80` no Network e selects populados.
2. Selecionar Empresa → nova chamada com `cod_emp`.
3. Selecionar Origem → nova chamada com `cod_emp&cod_ori`.
4. Digitar 3 chars no campo OP → chamada com `q=` e dropdown com `Origem / OP - Produto - Descrição`.
5. Selecionar OP → Estágio recarrega; selecionar Estágio → Centro recarrega.
6. Clicar Consultar sem OP → toast "Informe ou selecione uma Ordem de Produção."
7. Com OP selecionada → chamada a `/impressao` com todos os parâmetros e folha A4 renderizada.
