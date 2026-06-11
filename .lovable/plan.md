## Objetivo
Fazer o modo global de números escolhido em **Biblioteca BI — Componentes** (ex.: **Sem decimais**) continuar valendo no **BI Faturamento** mesmo após logout/login e recarga da página.

## O que vou ajustar
1. **Unificar a formatação do BI Faturamento com a Biblioteca BI**
   - Trocar os formatadores locais da tela de Faturamento pelos formatadores compartilhados da biblioteca BI.
   - Garantir que valores monetários e numéricos respeitem `bi_display_prefs.numberRounding.global`.
   - Manter percentuais com o comportamento atual.

2. **Reaplicar a preferência salva ao abrir o BI Faturamento**
   - Carregar a preferência global do usuário na montagem da tela.
   - Sincronizar o singleton de arredondamento para que os componentes da página usem o modo salvo sem depender da Biblioteca BI estar aberta antes.

3. **Preservar o comportamento por página onde já existe override**
   - Não mexer no override do BI Comercial (`pageKey`) nem no fluxo já corrigido de persistência.
   - Aplicar no Faturamento apenas o padrão global, já que essa tela hoje usa `pageKey="faturamento-genius"` no contexto de widgets, mas a renderização principal ainda está fora do pipeline comum da Biblioteca BI.

4. **Validar os pontos visíveis da tela**
   - KPIs.
   - Tabelas por revenda, origem, mês e detalhe.
   - Drill e resumos auxiliares que hoje usam `fmtBRL` / `fmtNum` / `fmtPct` locais.

## Arquivos previstos
- `src/pages/FaturamentoGeniusPage.tsx`
- Possivelmente um ajuste pequeno em utilitário compartilhado do BI se necessário para reaplicar o modo salvo sem duplicação.

## Detalhes técnicos
- Hoje a persistência em `user_preferences.bi_display_prefs` existe e as políticas permitem leitura/escrita do próprio usuário.
- O desvio principal encontrado é que `FaturamentoGeniusPage.tsx` usa funções locais (`fmtBRL`, `fmtNum`, `fmtPct`) com casas decimais fixas, ignorando `src/components/bi/utils/formatters.ts`.
- A correção vai centralizar moeda/número em `formatCurrency` / `formatNumber` compartilhados e inicializar o modo salvo ao entrar na página.

## Resultado esperado
- Usuário muda para **Sem decimais** na Biblioteca BI.
- Faz logout/login ou abre o **BI Faturamento** diretamente.
- O BI Faturamento continua exibindo números sem casas decimais, sem voltar para o formato completo por padrão.