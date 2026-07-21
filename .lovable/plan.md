# Plano — DRE Padrão (Contabilidade)

Objetivo: criar `/contabilidade/dre-padrao` como visão bloqueada (somente consulta + drill + export) do modelo DRE oficial, reutilizando integralmente o que já existe em `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` e componentes de `src/components/contabil` / `src/components/dre-studio`.

Nenhuma lógica de cálculo, sinal, hierarquia ou drill será reimplementada — apenas encapsulada.

## 1. Configuração do modelo padrão

- Hoje o modelo oficial vive hardcoded em `src/lib/contabilConfig.ts` (`MODELO_DRE_OFICIAL_ID`).
- Persistir a escolha em `public.app_settings` (tabela já usada em todo o projeto) com a chave `contabil_dre_modelo_padrao_id` (valor = UUID do modelo).
- Criar hook `useDreModeloPadrao()` em `src/hooks/contabil/useDreModeloPadrao.ts`:
  1. Se backend expuser `GET /api/contabil/configuracao?codemp=1`, usa a resposta (`dre_modelo_padrao_id` + `dre_modelo_padrao`).
  2. Fallback: lê `app_settings` (`contabil_dre_modelo_padrao_id`).
  3. Fallback final: constante `MODELO_DRE_OFICIAL_ID` (para não quebrar).
- Escrita da configuração fica na tela existente `Contabilidade → Configurações` (`DreStudioConfiguracoesPage.tsx`): adicionar um combo "Modelo DRE padrão" listando modelos DRE ativos (via `fetchDreModelos`) e gravando em `app_settings` (mesmo padrão de upsert já usado na página).

## 2. Rota e menu

- Nova rota `/contabilidade/dre-padrao` em `src/App.tsx` (ou onde o router principal registra as rotas de contabilidade), renderizando `DrePadraoPage`.
- Adicionar item no `src/config/menuCatalog.ts`, subgrupo `erp-financeiro`, antes de "DRE Studio — Visão Geral":
  ```
  { title: 'DRE Padrão', url: '/contabilidade/dre-padrao', icon: Landmark }
  ```
- Título "DRE Padrão", subtítulo "Demonstração do Resultado do Exercício".

## 3. Página e componentização

Estratégia: extrair o miolo da `DreStudioVisualizacaoPage.tsx` num componente reutilizável e apresentar dois consumidores (Studio e Padrão) sem duplicar lógica.

- Criar `src/components/dre-studio/DreVisualizacaoView.tsx` com props:
  ```
  { modeloId: string; modeloNome?: string;
    modoBloqueado?: boolean;         // esconde ações de edição
    permiteConfigurar?: boolean;     // exibe botão "Configurar modelo"
    onConfigurar?: () => void;
    tituloOverride?: string;
    subtituloOverride?: string; }
  ```
  Esse componente contém tudo que hoje está na `DreStudioVisualizacaoPage` (filtros, KPIs, matriz, drills, Razão, exportações, materialização assíncrona, auto-execução, etc.). É um refactor por *extract component*, não uma reimplementação: a página atual passa a chamar `<DreVisualizacaoView modeloId={id} />` sem `modoBloqueado`.
- Criar `src/pages/contabilidade/dre-padrao/DrePadraoPage.tsx`:
  - Usa `useDreModeloPadrao()` para obter `modeloId`.
  - Estados especiais (renderiza mensagens amigáveis conforme requisito 20):
    - Modelo não configurado → CTA "Definir modelo padrão" (só admin) para `/contabilidade/dre-studio/configuracoes`.
    - Modelo inativo → mensagem correspondente.
    - Erros de API preservam filtros (já é assim no view extraído).
  - Passa `modoBloqueado`, `permiteConfigurar={isAdmin && has('DRE_MODELOS_CONFIGURAR')}`, `onConfigurar={() => navigate('/contabilidade/dre-studio/modelos/' + modeloId)}`.

## 4. Modo bloqueado no `DreVisualizacaoView`

Quando `modoBloqueado`, esconder/desativar apenas botões de edição (criar linha, editar, vincular contas, excluir, materializar-com-recalculo forçado do modelo etc.). Ações mantidas: filtros, expandir/recolher, drill (menu completo), Razão, "Atualizar dados" (materialização), exportações, tela cheia, "Configurar modelo" (quando permitido).

Nada muda no backend nem no cálculo — apenas visibilidade dos controles.

## 5. Filtros / KPIs / matriz / drills / Razão

Todos reutilizados sem alterações:
- Filtros: empresa/filial/ano/mes_ini/mes_fim/unidade_negocio/codccu/visualização (já existentes no view). "Unidade de Negócio" segue tolerante (defensivo) até o backend consolidar.
- Chamada: `fetchDreMatriz` em `src/lib/contabil/dreMatrizApi.ts` já usa `modelo_id`, `codemp/codfil` implícitos no client, `anomes_ini/fim`, `unidade`. Nada novo.
- KPIs: leitura por `codigo_linha`/`codigo` semântico (já implementado); cards ausentes ficam ocultos.
- Drills: usam `linha.drills` + `linha.drillavel` + `meta.modelo_id` + `linha.linha_id` (já é o contrato atual).
- Razão: reaproveitar `DrillDrawer.tsx` como está — inclui documento, transação, centro de custo, usuários origem/lcto., modal de detalhe.

## 6. Exportações

Reaproveitar `ExportActions` já embutido no view (Excel/PDF/Imprimir). Cabeçalho já contempla empresa/filial/período/modelo/data — só ajustar o título para "DRE Padrão" quando `tituloOverride` estiver presente.

## 7. Permissões

- Ler flags do `PermissionsContext`. Se ainda não existirem, adicionar 4 constantes lógicas no lado do frontend (usadas em `hasPermission`):
  `DRE_PADRAO_VISUALIZAR`, `DRE_PADRAO_DRILL`, `DRE_PADRAO_EXPORTAR`, `DRE_MODELOS_CONFIGURAR`.
- Guard na rota: sem `DRE_PADRAO_VISUALIZAR` → redirect / mensagem de acesso negado (padrão do projeto).
- Botão "Configurar modelo" e ações de edição só aparecem com `DRE_MODELOS_CONFIGURAR`.

## 8. Critérios de aceite

- Rota `/contabilidade/dre-padrao` operacional; item de menu em Contabilidade.
- Abre automaticamente o modelo definido em `app_settings` (ou endpoint de configuração quando existir).
- Matriz, KPIs, drills, Razão, exportações, materialização e auto-execução idênticos aos da DRE Studio (porque é o mesmo componente).
- Nenhuma edição de modelo/linhas/contas na página. Admin vê botão "Configurar modelo" que abre a tela do modelo em Modelos.
- Nenhum UUID de modelo fixo em componentes novos.
- Zero duplicação de cálculo/SQL — a página é uma casca sobre o motor existente.

## Detalhes técnicos

Arquivos que serão criados/alterados:

Criados
- `src/hooks/contabil/useDreModeloPadrao.ts`
- `src/pages/contabilidade/dre-padrao/DrePadraoPage.tsx`
- `src/components/dre-studio/DreVisualizacaoView.tsx` (extração do miolo da página existente)

Alterados
- `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx` — passa a delegar para `DreVisualizacaoView`.
- `src/config/menuCatalog.ts` — novo item "DRE Padrão".
- `src/App.tsx` (router) — nova rota.
- `src/pages/contabilidade/dre-studio/DreStudioConfiguracoesPage.tsx` — combo "Modelo DRE padrão" gravando em `app_settings`.
- (Opcional) `src/lib/contabilConfig.ts` — manter `MODELO_DRE_OFICIAL_ID` só como fallback.

Sem migrações de banco (usa `app_settings` já existente). Sem novos endpoints obrigatórios — o `GET /api/contabil/configuracao` é opcional; o frontend degrada para `app_settings` + fallback constante.
