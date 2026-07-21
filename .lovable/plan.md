
# Configuração dinâmica de modelos oficiais (DRE / Balanço)

Objetivo: eliminar os UUIDs fixos `MODELO_DRE_OFICIAL_ID` / `MODELO_BALANCO_OFICIAL_ID` (e fallback via `app_settings`) e passar a resolver os modelos oficiais exclusivamente pelo endpoint `GET /api/contabil/configuracao`, com tratamento explícito de pendências (`NAO_DEFINIDO`, `MODELO_INEXISTENTE`, `MODELO_INATIVO`, `MODELO_SEM_VINCULOS`) e criação da página `/contabilidade/balanco-padrao`.

## Arquivos alterados / criados

Criados:
- `src/hooks/contabil/useContabilConfiguracao.ts` — hook único (React Query) consumindo `GET /api/contabil/configuracao?codemp=` e mutação `PUT /api/contabil/configuracao`. Tipagem `ContabilConfiguracaoResponse` conforme spec (tolerante a campos extras). QueryKey `["contabil-configuracao", codemp]`. Helpers: `resolverPendencia(configuracao, "DRE"|"BALANCO")`, `modelosDisponiveisPorTipo`.
- `src/pages/contabilidade/balanco-padrao/BalancoPadraoPage.tsx` — análoga à `DrePadraoPage`, chama `GET /api/contabil/modelos/{id}/resultado-cache` com os parâmetros da spec (item 5). Reaproveita a visualização do Balanço já existente em modo bloqueado.
- `src/components/contabil/ModeloOficialPendenciaCard.tsx` — componente compartilhado que renderiza os quatro estados (`NAO_DEFINIDO`, `MODELO_INEXISTENTE`, `MODELO_INATIVO`, `MODELO_SEM_VINCULOS`) com CTA "Definir/Abrir configurações" para admin.

Alterados:
- `src/lib/contabilConfig.ts` — remover `MODELO_DRE_OFICIAL_ID` e `MODELO_BALANCO_OFICIAL_ID`. Manter `API_BASE_URL`, `CODEMP`, `CODFIL`.
- `src/hooks/contabil/useDreModeloPadrao.ts` — deprecar/remover. Substituído por `useContabilConfiguracao`. Excluir também a leitura em `app_settings` (`contabil_dre_modelo_padrao_id`).
- `src/pages/contabilidade/dre-padrao/DrePadraoPage.tsx` — passar a usar `useContabilConfiguracao`. Renderizar `ModeloOficialPendenciaCard` conforme `pendencias` e só montar `DreStudioVisualizacaoPage` quando houver `dre_modelo_padrao_id` sem pendência bloqueante. Exibir header "Modelo utilizado: {nome}" + "Configuração oficial da empresa" + botão "Alterar modelo oficial" (admin) apontando para `/contabilidade/configuracoes`.
- `src/pages/contabilidade/dre-studio/DreStudioConfiguracoesPage.tsx` — remover o `ModeloPadraoCard` baseado em `app_settings`. Adicionar seção "Modelos oficiais" com dois combos (DRE / Balanço) populados por `configuracao.modelos_disponiveis`, filtrados por `tipo_modelo` (aceitar `BALANCO`/`BALANÇO`), mostrando `nome · N linhas · N contas vinculadas · status`. Botão "Salvar" chama `PUT /api/contabil/configuracao` e invalida `["contabil-configuracao", codemp]`, `["dre-matriz"]`, `["balanco-resultado"]`, `["contabil-modelos"]`. Exibir `error.response.data.detail` do backend em toast.
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — remover uso de `MODELO_DRE_OFICIAL_ID` (linha 306 `isModeloDREOficial`). Trocar por comparação com `configuracao?.dre_modelo_padrao_id`.
- `src/components/dre-studio/ConciliacaoDREBalancoPanel.tsx` — trocar `MODELO_BALANCO_OFICIAL_ID` por `configuracao?.balanco_modelo_padrao_id` via hook; exibir aviso se não configurado.
- `src/hooks/dashboardGeral/useFinanceiro.ts` e `useContabilidade.ts` — obter `modelo_id` do hook `useContabilConfiguracao`; queries `enabled` apenas quando houver `dre_modelo_padrao_id`; incluir `codemp` + `modeloId` na `queryKey`.
- `src/App.tsx` — registrar rota `/contabilidade/balanco-padrao`.
- `src/config/menuCatalog.ts` — incluir "Balanço Padrão" ao lado de "DRE Padrão".

## Tratamento de erros HTTP

Ajuste central em `src/lib/contabil/contabilApi.ts` (ou onde os erros são traduzidos hoje) para preservar `status` e `detail`:
- 404 → "Modelo específico não encontrado." (sem retry automático).
- 409 → estado de configuração; exibir `detail` do backend, NÃO exibir "API contábil offline".
- 500 → "Erro interno do backend".
- Sem resposta → "API indisponível".

Em `DrePadraoPage` / `BalancoPadraoPage`, converter 409/404 do endpoint de matriz/resultado-cache em `ModeloOficialPendenciaCard` correspondente.

## Estados por pendência (compartilhados DRE e Balanço)

| Código | Mensagem | Ação admin |
|--------|----------|------------|
| `NAO_DEFINIDO` | "Nenhum modelo padrão de {DRE\|Balanço Patrimonial} foi definido para esta empresa." | "Definir modelo padrão" → `/contabilidade/configuracoes` |
| `MODELO_INEXISTENTE` | "O modelo configurado não foi encontrado. Selecione outro modelo oficial." | "Abrir configurações" |
| `MODELO_INATIVO` | "O modelo padrão está inativo." | "Abrir configurações" |
| `MODELO_SEM_VINCULOS` | "O modelo selecionado não possui contas contábeis vinculadas e produziria uma demonstração zerada." | "Selecionar outro modelo" / "Configurar vínculos" |

Enquanto houver pendência bloqueante, **não** disparar `GET /api/contabil/dre/matriz` nem `.../resultado-cache`.

## Fluxo de carregamento

1. Resolver `codemp` (contexto atual).
2. `useContabilConfiguracao(codemp)` — enquanto `isLoading`, exibir "Carregando configuração contábil...".
3. Se houver `pendencias` para o tipo alvo → renderizar `ModeloOficialPendenciaCard`.
4. Caso contrário → montar `DreStudioVisualizacaoPage` (bloqueada) com `modeloIdProp = configuracao.dre_modelo_padrao_id` ou a página do Balanço com o cache respectivo.
5. Ao trocar `codemp`, React Query descarta caches antigos (chave inclui `codemp`); nenhuma chamada é feita com `modeloId` da empresa anterior.

## Permissões

Usar `useUserPermissions().isAdmin` (padrão atual) para gate dos CTAs de configuração. A spec sugere claims (`CONTABIL_CONFIGURACAO_EDITAR`, etc.); como o projeto ainda usa `isAdmin`, mantemos esse gate agora e deixamos TODO para migrar quando as claims existirem.

## Critérios de aceite

- Nenhuma ocorrência de `MODELO_DRE_OFICIAL_ID` / `MODELO_BALANCO_OFICIAL_ID` no `src/` após o build (verificado por `rg`).
- `GET /api/contabil/configuracao` é a única fonte do `modelo_id`.
- `queryKey` de DRE, Balanço e Configuração inclui `codemp`.
- Erro 409 do backend não é mostrado como "API offline".
- `PUT /api/contabil/configuracao` propaga `detail` em toast e invalida os caches listados.
- Rotas `/contabilidade/dre-padrao` e `/contabilidade/balanco-padrao` carregam a demonstração do modelo retornado pela API.

## Fora do escopo

- Estrutura, cálculo, drills, exportação da DRE/Balanço (permanecem inalterados).
- Migração da chave `app_settings.contabil_dre_modelo_padrao_id` (será apenas ignorada — o backend passa a ser fonte única).
