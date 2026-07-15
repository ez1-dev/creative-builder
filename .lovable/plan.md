## Objetivo

Adicionar um **Modo Edição** nas telas de **Visualização** do **DRE Studio** e do **Balanço Patrimonial**, permitindo reestruturar a árvore ao vivo (arrastar, editar, incluir/excluir linhas e reclassificar contas contábeis), com **totais recalculando automaticamente** e **versões nomeadas** que podem ser salvas e restauradas.

## Modelo mental

- **Rascunho pessoal** (padrão de todos): cópia da estrutura oficial, só o autor enxerga; ideal para simular cenários sem afetar ninguém.
- **Modelo oficial** (admin ou `can_edit` na tela): a versão que aparece para toda a empresa.
- Alternância via **toggle "Editando: [meu rascunho] / [oficial]"** dentro do modo edição.
- **Versão salva** = snapshot nomeado (ex.: "Fechamento 2026-Q1") — dá para restaurar a qualquer momento, transformando o snapshot no rascunho/oficial atual.

## Escopo funcional

Operações disponíveis no modo edição:

1. **Arrastar linhas** para reordenar (`ordem`) e mudar hierarquia (`linha_pai`/`nivel`).
2. **Editar** descrição, sinal, flags (negrito, totalizadora, exibir, permite drill).
3. **Incluir** nova linha (analítica, subtotal ou fórmula) e **excluir** (soft delete `ativo=false`).
4. **Reclassificar contas contábeis**: arrastar uma conta (`CTARED / máscara`) de uma linha para outra — atualiza `bi_dre_depara_conta_ccu` (DRE) ou `bi_dre_mascara` (Balanço).
5. **Recalcular totais ao vivo**: após qualquer mudança, o front recomputa localmente os subtotais/totais sobre os valores já carregados (sem ida ao servidor). Botão **"Recarregar do banco"** para refetch completo.
6. **Salvar como versão**: cria snapshot nomeado com opção de descrição.
7. **Restaurar versão**: substitui a estrutura atual pela do snapshot (após confirmação).
8. **Publicar** (admin): promove o rascunho pessoal para o modelo oficial (cria uma versão de backup do oficial antes).

## Permissões

- **Entrar em modo edição** e criar/editar **rascunho pessoal**: qualquer usuário autenticado com acesso à tela.
- **Editar o modelo oficial** e **publicar**: `is_admin(auth.uid())` OU `can_edit` na tela correspondente (novas funções `can_edit_dre_oficial`, `can_edit_balanco_oficial` reusam padrão `user_access → profile_screens`).

## Mudanças no banco

### Tabelas novas

1. **`bi_dre_estrutura_rascunho`** — rascunho pessoal por usuário para DRE.
   Colunas: `id`, `user_id`, `modelo_id` (referência ao oficial que originou), `linhas jsonb` (array com estrutura completa: ordem, código, descrição, nivel, pai, flags, formula), `depara jsonb` (mapa conta→linha), `updated_at`.
   RLS: `USING/WITH CHECK (user_id = auth.uid())`. Um rascunho por (user, modelo).

2. **`bi_balanco_estrutura_rascunho`** — idem para Balanço (Balanço hoje não tem `modelo_id`; rascunho referencia a "estrutura oficial única").

3. **`bi_dre_snapshots`** e **`bi_balanco_snapshots`** — versões nomeadas.
   Colunas: `id`, `nome`, `descricao`, `escopo` (`'oficial' | 'pessoal'`), `owner_id` (NULL quando oficial), `modelo_id`, `linhas jsonb`, `depara jsonb`, `criado_por`, `created_at`.
   RLS:
   - `SELECT`: `escopo='oficial'` (todos autenticados) OU `owner_id = auth.uid()`.
   - `INSERT/DELETE`: pessoais = próprio user; oficiais = `is_admin` OU `can_edit` da tela.

### Funções (SECURITY DEFINER)

- `dre_publicar_rascunho(_modelo_id uuid)` — valida permissão, salva snapshot automático do oficial ("Backup pré-publicação — <ts>"), grava linhas do rascunho em `bi_dre_estrutura_v2` (upsert + soft-delete das removidas), grava depara em `bi_dre_depara_conta_ccu`, incrementa `bi_dre_modelos.versao`.
- `dre_restaurar_snapshot(_snapshot_id uuid, _destino text)` — `_destino ∈ ('oficial','rascunho')`. Substitui alvo pelo conteúdo do snapshot.
- `balanco_publicar_rascunho()` / `balanco_restaurar_snapshot(...)` — análogos, gravando em `bi_dre_estrutura` + `bi_dre_mascara`.
- Trigger `update_updated_at_column` nas tabelas novas.

Todas as tabelas seguem o padrão obrigatório: `GRANT SELECT,INSERT,UPDATE,DELETE ... TO authenticated`, `GRANT ALL ... TO service_role`, RLS ON, políticas explícitas.

## Mudanças no frontend

### Componentes novos (`src/components/dre-studio/edicao/`)

- **`ModoEdicaoToggle`** — botão "Editar estrutura" no header da visualização; abre a barra de edição.
- **`BarraEdicao`** — mostra alvo (Rascunho pessoal / Oficial), botões *Salvar versão*, *Restaurar versão*, *Publicar* (se permitido), *Descartar rascunho*, *Sair*.
- **`ArvoreEditavel`** — reaproveita a matriz atual mas com handles de arrastar (react-dnd ou `@dnd-kit/core` já compatível com o stack); linhas ficam com ações inline (renomear, add filho, remover).
- **`DialogSalvarVersao`** — nome + descrição + escopo (pessoal/oficial).
- **`DialogVersoes`** — lista snapshots com filtro por escopo, ações *Restaurar como rascunho* / *Restaurar como oficial*.
- **`DialogReclassificarConta`** — abre ao arrastar uma conta contábil para nova linha; confirma código-alvo.

### Hooks

- `useEstruturaEditavel(kind: 'dre'|'balanco', modeloId?)` — carrega oficial + rascunho, mantém estado local (linhas em memória), expõe `mutate*` puros no cliente e `salvar()`, `publicar()`, `descartar()`, `snapshots.listar()`, `snapshots.salvar()`, `snapshots.restaurar()`.
- `useTotaisRecalculados(linhas, valores)` — recomputa totalizadoras/fórmulas em memória a cada edição, alimentando a mesma matriz de visualização.

### Integração

- `DreStudioVisualizacaoPage`: quando `modoEdicao=true`, substitui a `MatrizDre` pela `ArvoreEditavel` alimentada por `useTotaisRecalculados` (mesmos valores da API, estrutura vinda do estado editável).
- `BalancoPatrimonialPage`: idem, com adapter que trata a estrutura por `máscara` em vez de `código_linha`.

### Sem impacto

- Cálculo de valores continua vindo dos endpoints atuais (`/api/contabil/…`) — o front só reestrutura como agrupa/exibe.
- Drill, export Excel, filtros e presets seguem funcionando (usam o mesmo `linhas` renderizado).

## Detalhes técnicos importantes

- **Recalcular ao vivo**: as linhas *analíticas* já vêm com valor por mês; totalizadoras/subtotais são somatórios de filhos multiplicados pelo `sinal`; fórmulas usam parser simples já disponível em `dreConfigTypes` (avaliação de expressão `A + B - C` sobre `codigo_linha`).
- **Reclassificação de conta**: no rascunho, guardo o override em `depara jsonb`; a matriz aplica esse override em cima do depara oficial ao renderizar. Só ao **publicar** é que `bi_dre_depara_conta_ccu` é reescrito.
- **Snapshots** guardam a árvore completa em JSON — barato (kilobytes) e permite restore atômico sem migração.
- **Concorrência**: publicar valida `versao` esperada vs atual (`bi_dre_modelos.versao`); se mudou, retorna conflito e pede refresh.

## Fora de escopo (fase 2, se necessário)

- Diff visual entre versões.
- Comentários por linha.
- Aprovação em duas etapas (editar → revisar → publicar).