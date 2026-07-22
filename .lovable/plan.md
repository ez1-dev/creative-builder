# Plano — Entregar apenas DRE Padrão nesta etapa

Manter toda a arquitetura dinâmica de configuração já implementada (`useContabilConfiguracao`, `ModeloOficialPendenciaCard`, endpoint `GET/PUT /api/contabil/configuracao`), mas expor ao usuário somente a página **DRE Padrão**. O Balanço Padrão fica preservado no código para a próxima entrega, apenas invisível no menu e sem rota ativa.

## Alterações

1. **`src/config/menuCatalog.ts`**
   - Remover a entrada `{ title: 'Balanço Padrão', url: '/contabilidade/balanco-padrao', ... }` do subgrupo `erp-financeiro`.
   - Manter `DRE Padrão` como está.

2. **`src/App.tsx`**
   - Comentar/remover a rota `/contabilidade/balanco-padrao` (mantendo o import da página fora do bundle via remoção do import).
   - Nenhuma outra rota é afetada.

3. **`src/pages/contabilidade/dre-studio/DreStudioConfiguracoesPage.tsx`**
   - Na seção "Modelos oficiais", ocultar temporariamente o seletor de **Modelo padrão de Balanço**, deixando apenas o seletor de **Modelo padrão de DRE** visível.
   - Não remover o código do seletor de Balanço — apenas envolver em um bloco condicional/flag local `MOSTRAR_BALANCO_PADRAO = false` para reativação futura em um único ponto.

4. **Arquivos preservados (sem alteração agora)**
   - `src/pages/contabilidade/balanco-padrao/BalancoPadraoPage.tsx` fica no repositório para a próxima etapa.
   - `useContabilConfiguracao`, `ModeloOficialPendenciaCard` e helpers continuam servindo à DRE Padrão e serão reaproveitados quando o Balanço voltar.

## Fora do escopo
- Não mexer em `ConciliacaoDREBalancoPanel` nem em hooks de dashboard geral: eles continuam resolvendo o modelo de balanço dinamicamente pelo backend, o que é inofensivo mesmo sem a página exposta.
- Não alterar layouts personalizados de usuários (`menu_layout_user`) — como o item de Balanço nunca foi propagado a esses layouts customizados, basta ele sumir do catálogo base.

## Validação
- Após o build: menu ERP → Financeiro e Contábil mostra "DRE Padrão" e não mostra "Balanço Padrão".
- Rota `/contabilidade/balanco-padrao` deixa de existir (cai no NotFound).
- Página de Configurações Contábeis mostra apenas o card de modelo oficial da DRE.
