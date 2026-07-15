Remover, na barra de status do resultado da tela **DRE Studio → Visualização** (`src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`, bloco iniciado na linha 1629):

1. O chip "Fonte: E650SAL.SALMES" (linhas 1641-1643).
2. O chip "Modo: MENSAL_E650SAL" (linhas 1644-1646) — costuma acompanhar o anterior; removo junto para não ficar órfão. Se preferir manter, me avise.
3. O texto "**Origem:** Snapshot Supabase / Senior ERP" (linhas 1655-1662).
4. O chip de status "CONCLUIDO" (linhas 1687-1689).
5. A linha de aviso "O snapshot é mantido em cache. Use **Atualizar Resultado** para buscar lançamentos novos do ERP." (linhas 1691-1695).

Mantidos:
- "Última atualização: …"
- Chips de "Referência Senior: Sim/Não", origem da ref. e quantidade (quando aplicável)
- Alerta vermelho "E650SAL pura / referência oficial Senior não aplicada"
- Botão **Atualizar Resultado** no cabeçalho (linha 1751) — só sumirá o texto explicativo, não o botão.

Nenhuma outra tela é alterada.