## Objetivo

Substituir os campos de texto livre de **produto/componente**, **centro de custo** e **projeto/obra** nas telas de requisição por autocompletes remotos ligados aos endpoints reais do backend, mantendo o serviço centralizado, o layout atual e as regras de negócio.

## Contratos reais confirmados (docs/backend-cadastros-*)

- **`GET /api/cadastros/produtos`** — resposta paginada `{ dados: [...] }`. Campos: `codigo_produto`, `descricao_produto`, `unidade_medida`, `codigo_familia`, `descricao_familia`, `codigo_derivacao` (quando `incluir_derivacoes=true`). Filtros: `codpro`, `despro`, `codfam`, `codori`, `somente_ativos`, `pagina`, `tamanho_pagina`.
- **`GET /api/cadastros/centros-custo?q=`** — array `[{ codigo, descricao, label }]` (padrão `CodCcu/DesCcu`). Já existe `fetchCentrosCusto` em `src/hooks/useCadastrosErp.ts`.
- **`GET /api/cadastros/projetos?q=`** — **NÃO documentado**. Vamos chamá-lo; se retornar 404, mostrar mensagem e desabilitar o autocomplete (sem fallback silencioso).

## Onde entra

Telas afetadas:
- `src/pages/requisicoes/NovaRequisicaoAvulsaPage.tsx` — troca CC (`Input`), Projeto (`Input`) e a coluna Componente da tabela (`Input codcmp`) por autocompletes. Descrição e UM viram readonly e são preenchidas ao selecionar produto.
- Considerar habilitar CC/Projeto do cabeçalho na `NovaRequisicaoOpPage.tsx` **somente onde já existe hoje** (não hoje) — não vamos adicionar novos campos; o produto na tela de OP continua vindo da E900CMO (não trocar, conforme regra 6).

## Serviço centralizado (`src/services/requisicoesApi.ts`)

Adicionar três funções de lookup (todas usando o `apiGet` existente):

```ts
export interface ProdutoLookup {
  codpro: string;         // codigo_produto
  despro: string;         // descricao_produto
  unimed?: string;        // unidade_medida
  codfam?: string;        // codigo_familia
  desfam?: string;        // descricao_familia
  codder?: string;        // codigo_derivacao (quando incluir_derivacoes)
}
export interface CentroCustoLookup { codccu: string; desccu: string; }
export interface ProjetoLookup {
  numprj: number | string;
  desprj?: string;
  obra?: string;
  codfpj?: string;        // fase quando presente
}

buscarProdutos(params: { q?: string; codemp?: number; codori?: string; codfam?: string; incluir_derivacoes?: boolean; tamanho_pagina?: number }): Promise<ProdutoLookup[]>
buscarCentrosCusto(params: { q?: string; codemp?: number }): Promise<CentroCustoLookup[]>
buscarProjetos(params: { q?: string }): Promise<ProjetoLookup[]>
```

- `buscarProdutos` monta query: se `q` parece numérico usa `codpro=q`, senão `despro=q`; sempre envia `somente_ativos=true` e `tamanho_pagina=50`. Faz mapeamento explícito das chaves `codigo_produto → codpro`, `unidade_medida → unimed`, etc.
- `buscarCentrosCusto` reaproveita `/api/cadastros/centros-custo?q=…&codemp=…`, mapeando `codigo/CodCcu → codccu`, `descricao/DesCcu → desccu`.
- `buscarProjetos` chama `/api/cadastros/projetos?q=…`. Ao receber `RequisicaoApiError` com status 404, lança `ProjetosIndisponiveisError` (nova classe pequena) para a UI mostrar mensagem tratada.

## Componente novo `RemoteCombobox` (`src/components/requisicoes/RemoteCombobox.tsx`)

Genérico e tipado, baseado no padrão do `AutocompleteAsync` já existente, mas mais adequado às regras 5/6/7:

- Props: `value`, `label`, `onSelect(item)`, `fetcher(q) => Promise<T[]>`, `renderItem(item)`, `getKey(item)`, `getLabel(item)`, `getSecondaryText?(item)`, `minChars` (default 2), `debounceMs` (default 350), `disabled`, `placeholder`, `emptyMessage`, `errorMessage`, `unavailableMessage`.
- Estados internos: idle → typing (`Digite pelo menos 2 caracteres`), loading (`Buscando…`), empty (`Nenhum resultado encontrado`), error (`Não foi possível consultar a API`), unavailable (mensagem tratada quando o fetcher rejeitar com `EndpointIndisponivelError`).
- Navegação por teclado (setas/Enter) via `cmdk`, botão limpar (X), highlight do termo, primeira busca só após `minChars`.
- Nunca faz debounce zero; nunca engole erro silenciosamente (regra 10).

Reutilizado nos três casos, apenas mudando `fetcher` e renderer:

- Produto: `CHA022 — Chapa de aço 3,00 mm` + `Família: … · Unidade: …`.
- CC: `311020003 — Oficina / Corte`.
- Projeto: `GS-11661 — Galpão Industrial` + `Projeto: 11661`.

## Ajustes na `NovaRequisicaoAvulsaPage.tsx`

Cabeçalho:
- Trocar `<Input>` do **Centro de custo** por `<RemoteCombobox<CentroCustoLookup>>` com `fetcher={(q) => requisicoesApi.buscarCentrosCusto({ q, codemp: Number(codemp) })}`. Armazenar `{ codccu, desccu }` em estado (`cc` vira `{ codigo, descricao } | null`). Ao mudar `codemp`, limpar o CC.
- Trocar `<Input>` do **Projeto/Obra** por `<RemoteCombobox<ProjetoLookup>>`. Se o fetcher lançar `ProjetosIndisponiveisError`, mostrar `unavailableMessage`. Armazenar `{ numprj, desprj, obra, codfpj }`. Se retornar `codfpj`, pré-preencher **Fase** e deixá-la em modo readonly com botão "Alterar" só para admin.
- **Obrigatoriedade** (regra 7/8):
  - CC obrigatório quando `tipo` ∈ `CONSUMO`, `EMERGENCIAL` (equivalente a manutenção/consumo interno/administrativo). Opcional para `TRANSFERENCIA` e `DEVOLUCAO`.
  - Projeto obrigatório só se `codemp` estiver marcada como "exige projeto" (config carregada de `requisicoesApi.configuracoes()` — usar campo já existente se houver; caso não haja, deixar sempre opcional). Sem chumbar.
  - Marcar `*` no label conforme a regra ativa. Botão "Criar/Enviar" bloqueia com mensagem específica quando obrigatório e vazio.

Tabela de itens (`Linha`):
- Adicionar `codpro`, `codder`, `codfam` ao tipo `Linha`; manter `descricao` e `unidade` (agora **readonly**).
- Coluna **Componente**: `<RemoteCombobox<ProdutoLookup>>` com `fetcher={(q) => requisicoesApi.buscarProdutos({ q, codemp: Number(codemp), incluir_derivacoes: true })}`. Ao selecionar:
  - Preencher `codcmp = codpro`, `descricao = despro`, `unidade = unimed`, `codfam`, `codder`.
  - Limpar `deposito_origem`, `deposito_destino`, `lote` da linha (dados dependentes — regra 6).
- Colunas **Descrição** e **UM** viram `readonly`/exibição (sem `<Input onChange>`).
- Bloquear submit se alguma linha tiver `codcmp` sem `codpro` selecionado (não permite produto "digitado à mão" — regra 6/11).

Reordenar colunas conforme regra 9: Componente · Descrição · Derivação · UM · Qtd · Dep. origem · Dep. destino · Lote · Obs.

## Layout (regra 9)

- Cabeçalho da avulsa em grid `md:grid-cols-12`: Tipo (2), Prioridade (2), Empresa (2), Filial (2), Setor (4), CC (6), Projeto (4), Fase (2), Data (4), Justificativa (8), Observações (12).
- Mobile: `grid-cols-1` (empilhado).
- Tabela mantém layout atual; produto ocupa a coluna mais larga.

## Regras que NÃO mudam

- Autenticação, permissões (`useUserPermissions`), tema, tokens, `PageHeader`, `IntegracaoOfflineBanner`, `useSidWriteEnabled`, gating do botão Enviar.
- Produto vindo da OP (E900CMO) na `NovaRequisicaoOpPage` **não é substituído** — o autocomplete só aparece na avulsa e em qualquer futura tela de material alternativo (fora do escopo agora).
- Nenhum mock nem fallback silencioso. `VITE_USE_REQUISICOES_MOCK` continua controlando só o resto do módulo.

## Critérios de aceite mapeados

- Produto pesquisável por código/descrição ✔ (`buscarProdutos`).
- Descrição/UM autopreenchidas e readonly ✔.
- Produto inválido/manual não pode ser salvo ✔ (valida `codpro` presente).
- CC/Projeto com busca remota, código+descrição armazenados juntos ✔.
- CC filtrado pela empresa e limpo ao trocar `codemp` ✔.
- Trocar produto limpa dados dependentes ✔.
- Sem `fetch`/`axios` direto nos componentes — tudo via `requisicoesApi` ✔.
- Debounce, loading, vazio, erro no combobox ✔.
- Sem fallback para mock ao 404 do endpoint de projetos ✔.
- Layout atual preservado ✔.
- Campos vindos da OP não são alterados ✔.

## Riscos e mitigações

- Nomes reais das chaves do endpoint de produtos foram confirmados via `docs/backend-cadastros-produtos.md`. Se o backend retornar chaves diferentes (`CodPro`, `DesPro`…), o normalizador no serviço aceita ambos formatos (tenta `codigo_produto` e depois `CodPro`).
- Endpoint de projetos pode não existir → tratamento explícito com `ProjetosIndisponiveisError` e mensagem "A busca de projetos ainda não foi disponibilizada pela API."; campo fica desabilitado (não vira input livre).

## Arquivos a criar/alterar

- **novo** `src/components/requisicoes/RemoteCombobox.tsx`
- **alterar** `src/services/requisicoesApi.ts` — adicionar tipos e funções `buscarProdutos`, `buscarCentrosCusto`, `buscarProjetos`, classe `ProjetosIndisponiveisError`.
- **alterar** `src/pages/requisicoes/NovaRequisicaoAvulsaPage.tsx` — substituir os três campos, reordenar cabeçalho, aplicar readonly, aplicar regras de obrigatoriedade e validação de submit.
- Nenhum arquivo removido; sem migração no backend.
