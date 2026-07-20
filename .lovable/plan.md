## Contexto verificado

- `src/hooks/contabil/useVincularContasBalancoSenior.ts` já usa `TIMEOUT_MS = 60_000` (linha 24) com `AbortController`.
- `src/hooks/contabil/useVincularContasDRESenior.ts` já usa `TIMEOUT_MS = 60_000` (linha 30) com `AbortController`.
- Não existe hook/rota separada para `vincular-contas-balanco-senior` — o Balanço usa `/vincular-contas-senior` (item 1 do prompt). Sem terceira rota a criar.
- Botões já ficam `disabled` enquanto `isPending`; `DreStudioEstruturaPage` já mostra bloco "Vinculando contas da DRE..." com spinner; `DreStudioVisualizacaoPage` e `DreStudioConfiguracoesPage` mostram apenas "Vinculando..." curto, sem aviso de duração.
- Toast de sucesso do hook DRE já lista `contas_lidas / linhas_criadas / contas_vinculadas / já existentes / ignoradas`. O hook Balanço mostra apenas `linhas_criadas` e `contas_vinculadas` — o backend agora também retorna `contas_lidas_senior`, `contas_ja_existentes` e `linhas_reordenadas`, que hoje são descartados.

## O que fazer

1. **Enriquecer o resumo do Balanço** (`useVincularContasBalancoSenior.ts`)
   - Estender `VincularContasBalancoResumo` com `contas_lidas_senior?`, `contas_ja_existentes?`, `linhas_reordenadas?`.
   - Ler esses campos de `data.resumo` / raiz (mesmo padrão do hook DRE).
   - Ampliar o toast de sucesso para: `Contas lidas: X · Linhas criadas: Y · Contas vinculadas: Z · Já existentes: W · Reordenadas: R` (só inclui os que vierem preenchidos). Mantém idempotência silenciosa.

2. **Melhorar o feedback de progresso nos botões que ainda não têm**
   - `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`
     - Nos dois CTAs "Vincular contas automaticamente" (linhas ~1376 e ~1428) e no botão compacto "Vincular contas" (~1861): quando `vincular.isPending`, trocar o label para `Vinculando... (pode levar até 1 min)` e manter `disabled` como já está.
     - Adicionar, logo abaixo do CTA principal (empty state), uma linha auxiliar `text-xs text-muted-foreground` visível só durante o pending: "Lendo o plano Senior e criando as linhas analíticas — não feche a página."
   - `src/pages/contabilidade/dre-studio/DreStudioConfiguracoesPage.tsx` (linhas ~519 e ~529)
     - Adicionar `description`/hint nos dois cards ("Vincular contas Senior (DRE)" e "(Balanço)") ou um `<p className="text-xs text-muted-foreground">` sob o botão quando `isPending`, com o mesmo texto "Pode levar até 1 minuto. Não recarregue a página."
   - `DreStudioEstruturaPage` já tem esse feedback — nenhum ajuste.

3. **Não alterar o timeout** — já está em 60 s nos dois hooks; o prompt pede exatamente esse valor. Nenhuma outra chamada deve herdar esse timeout ampliado.

## Fora de escopo

- Nenhuma mudança em `contabilApi.ts` (timeout global permanece 15 s).
- Nenhuma mudança de lógica de retry (a idempotência do backend cobre re-clique acidental).
- Sem alterações no editor de estrutura, drills ou visualização de resultado.

## Resumo em uma linha

Enriquecer o toast do hook de Balanço com o resumo completo do backend e adicionar o aviso "pode levar até 1 min / não feche a página" nos dois botões de "Vincular contas" da Visualização e das Configurações — timeouts (60 s) e disable já estão corretos.