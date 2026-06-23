## Objetivo

Atualizar a tela `/bi/contabilidade/dre-montador` para os novos contratos do FastAPI: (1) catálogo de contas com centros de custo expandíveis vindo de `/api/bi/contabilidade/plano-contas-disponivel`, (2) CRUD de modelo e linhas via `/api/dre/modelos` e `/api/dre/linhas`, mantendo o vínculo via `/api/bi/contabilidade/dre-dinamica/vincular-contas`.

Escopo restrito ao Montador. Não alterar `DreConfiguravelPainelPage`, `DreConfiguracaoPage`, nem o restante do app (que continua usando `listarModelos`/`listarLinhas` no Cloud).

## 1) Catálogo de contas — novo endpoint

**Arquivo:** `src/lib/bi/dreMontadorApi.ts`

- Trocar a URL de `fetchPlanoContasDinamica` para `GET /api/bi/contabilidade/plano-contas-disponivel`.
- Query params canônicos: `modelo_id?`, `empresa_id` (default `"1"`), `somente_resultado` (default `true`), `q?`, `anomes_ini`, `anomes_fim`. **Sempre enviar período.**
- Parsear resposta `{ total, dados: [...] }`. Mapear:
  - `cd_mascara`, `ds_mascara`, `cd_conta_contabil` (nullable), `nivel` (nullable).
  - `qtd_lancamentos`, `vl_realizado` (→ `valor_total` no front, via `toNumberBI`).
  - `ja_usada` → `ja_vinculada`; `codigo_linha`/`linha_vinculada` → `linhas_vinculadas` (array de 1, se houver).
  - `qtd_centros`, `centros_custo[]` com campos canônicos `cd_centro_custos`, `cd_centro_custos_3`, `ds_centro_custos`, `qtd_lancamentos`, `valor_total`, `vl_realizado`.
- Aceitar `vl_realizado` ou `valor_total` (defensivo). Atualizar tipos `PlanoContaErp` / `PlanoContaCentroCusto` para incluir `ds_mascara` e `ds_centro_custos`.
- Remover filtros que não existem mais (`somente_nao_vinculadas`, `somente_vinculadas`, `limite`, `busca`); usar apenas `q` para busca. Tirar essas opções da UI.

## 2) CRUD de modelo e linha — FastAPI

**Novo arquivo:** `src/lib/bi/dreMontadorModelosApi.ts`

Funções com `Authorization: Bearer` + `ngrok-skip-browser-warning: true`:

- `listarModelosFastApi()` → `GET /api/dre/modelos` → `{ id, nome, padrao, ativo, descricao }[]`.
- `criarModelo({ nome, descricao?, padrao, ativo })` → `POST /api/dre/modelos`.
- `atualizarModelo(id, payload)` → `PATCH /api/dre/modelos/{id}`.
- `criarLinha({ modelo_id, codigo_linha, descricao, tipo_linha, ordem, formula?, ativo })` → `POST /api/dre/linhas`.
- `atualizarLinha(id, payload)` → `PATCH /api/dre/linhas/{id}`.
- `desativarLinha(id)` → `DELETE /api/dre/linhas/{id}`.

Tipos `MontadorModelo` e `MontadorLinha` definidos no mesmo arquivo (sem mexer em `dreConfigTypes.ts`).

## 3) UI do Montador

**Arquivo:** `src/pages/bi/contabilidade/DreMontadorPage.tsx`

- Trocar `listarModelos` (Cloud) por `listarModelosFastApi`. Adaptar `Select` de modelo: rótulo `nome` + (se `padrao`) badge "padrão".
- Botões ao lado do `Select` de modelo: **Novo modelo**, **Editar modelo** (abrem `ModeloFormDialog`).
- Card "Linhas da DRE":
  - Botão **Nova linha** no header → abre `LinhaFormDialog` (campos: `codigo_linha`, `descricao`, `tipo_linha` `CONTA|CALCULO|TOTAL`, `ordem`, `formula` (visível só p/ `CALCULO`/`TOTAL`), `ativo`).
  - Por linha: botões **Editar** e **Excluir** (DELETE = desativar). Após salvar/excluir, recarregar linhas e DRE dinâmica.
- Card "Contas disponíveis do ERP":
  - Substituir os filtros de "vinculadas/limite" pela busca `q` (já existe `busca`, basta renomear o param da chamada).
  - Renderizar badge `qtd_centros` (já existe, ajustar texto: `"{n} CC"`).
  - Expansão: adicionar coluna `ds_centro_custos`; formato exibido `cd_centro_custos — ds_centro_custos — R$ valor_total`.
  - Quando `centros_custo` vazio: manter "Sem centro de custo no período".
- Vincular: continuar usando `vincularContasDinamica` (`/dre-dinamica/vincular-contas`). `linha_id` agora vem direto do objeto retornado por `listarLinhas` (FastAPI) — eliminar `resolverLinhaId` no fluxo principal (mantém fallback Cloud por segurança).

## 4) Diálogos novos

- `src/components/bi/contabilidade/ModeloFormDialog.tsx`
- `src/components/bi/contabilidade/LinhaFormDialog.tsx`

Componentes shadcn (`Dialog`, `Input`, `Select`, `Switch`, `Button`) chamando as funções de `dreMontadorModelosApi.ts`. Validação mínima: `nome` obrigatório no modelo; `codigo_linha`+`descricao`+`tipo_linha` obrigatórios na linha; `formula` obrigatória se `tipo_linha != CONTA`.

## Fora do escopo

- Demais telas que consomem modelos/linhas do Cloud (`DreConfiguracaoPage`, `DreConfiguravelPainelPage`) — não alterar.
- Backend / migrations.
- Estilos: usar tokens semânticos existentes; sem cores hardcoded.

## Arquivos

| Tipo | Caminho |
|---|---|
| edit | `src/lib/bi/dreMontadorApi.ts` |
| new  | `src/lib/bi/dreMontadorModelosApi.ts` |
| edit | `src/pages/bi/contabilidade/DreMontadorPage.tsx` |
| new  | `src/components/bi/contabilidade/ModeloFormDialog.tsx` |
| new  | `src/components/bi/contabilidade/LinhaFormDialog.tsx` |
