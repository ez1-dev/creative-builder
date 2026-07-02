## Diagnóstico

Este prompt repete a especificação do botão **"Exportar Excel"** que já foi implementada em turnos anteriores:

- `src/lib/rh/api.ts` já expõe `exportarResumoFolhaExcel(...)` que:
  - Monta `GET {API_BASE}/api/rh/resumo-folha/exportar?anomes_ini&anomes_fim&codemp[&cd_filial]`
  - Envia `Authorization: Bearer <token>` (não usa access_token em query string).
  - Baixa como `blob`, lê `Content-Disposition` para o filename, faz fallback para `resumo_folha_<codemp>_<ini>_<fim>.xlsx`, cria `URL.createObjectURL`, dispara o download e revoga a URL.
  - Lança erros tipados para 401 / 404 / 422 / demais.
- `src/pages/rh/ResumoFolhaPage.tsx` já tem o botão ao lado de "Sincronizar RH" com ícone `FileSpreadsheet`, spinner (`Loader2`) via `useMutation`, toasts de sucesso e mensagens específicas por status (401 "sessão expirada", 404 "endpoint indisponível", 422 "informe o período", genérica com detalhe).
- Filtros reaproveitados via `toAnomes` + `codemp` + `cd_filial` do formulário atual.
- Nenhum card, filtro ou lógica de dados foi tocado.

O novo texto do prompt só descreve **conteúdo interno do .xlsx** (15 abas, comparativos, totais). Isso é responsabilidade do backend FastAPI — o front apenas baixa o arquivo entregue pela API. Nada muda no Lovable.

## Plano

Nenhuma alteração de código. Ações:

1. Confirmar ao usuário que o botão já está no ar exatamente como o prompt descreve (endpoint, headers, blob, filename via `Content-Disposition`, tratamento 401/404/422).
2. Lembrar que o layout de 15 abas + linhas de totais depende do restart do FastAPI 8070 — enquanto a build antiga responde, o botão devolverá 404 e o toast "endpoint de exportação indisponível na API" será exibido, comportamento já previsto.
3. Após o restart, se quiser, valido via Playwright autenticado clicando no botão e conferindo o `.xlsx` baixado (nome do arquivo + status HTTP) — sem abrir o conteúdo das abas, que é responsabilidade do backend.

## Fora de escopo
- Alterar cards, filtros, grid, tipos ou qualquer lógica de dados.
- Gerar/validar as 15 abas ou a linha de totais no frontend.
