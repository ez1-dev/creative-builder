## Situação atual

O botão **"Exportar Excel"** já foi implementado exatamente como esse prompt descreve, na rodada anterior. Verificação no código atual:

- `src/lib/rh/api.ts` já expõe `exportarResumoFolhaExcel(params)` que:
  - normaliza `anomes_ini`/`anomes_fim` com `toAnomes`,
  - envia `Authorization: Bearer <token>` via `fetch` (não expõe token na URL),
  - trata **401 → SESSAO_EXPIRADA**, **404/405/501 → ENDPOINT_INDISPONIVEL**, **422 → PERIODO_INVALIDO**, demais → **ERRO_GENERICO**,
  - devolve `{ blob, filename }` lendo `Content-Disposition` (fallback `resumo_folha_<codemp>_<ini>_<fim>.xlsx`).
- `src/pages/rh/ResumoFolhaPage.tsx` já renderiza o botão ao lado do "Sincronizar RH" com ícone `FileSpreadsheet`, `useMutation` chamando `exportarResumoFolhaExcel(baseParams)` (mesmos filtros da tela, inclusive `cd_filial` quando presente), spinner enquanto gera, download via `URL.createObjectURL` + revogação, e toasts de sucesso/erro específicos por código.

## Plano

Nada a alterar no front. Ação necessária apenas do lado do backend / ambiente:

1. **Reiniciar o processo do FastAPI na porta 8070** para que o endpoint `GET /api/rh/resumo-folha/exportar` fique disponível — enquanto o processo antigo estiver rodando, o front continuará recebendo 404 e mostrando o toast *"Exportação ainda não disponível no backend."*.
2. Após o restart, clicar **Exportar Excel** na tela `/rh/resumo-folha` com os filtros desejados (o botão está no canto superior direito, à esquerda do "Sincronizar RH").
3. Se algo falhar após o restart (ex.: 500, arquivo vazio, aba faltando), me avise com o toast/mensagem exibido que eu ajusto — mas isso seria correção pontual, não reimplementação.

## Detalhes técnicos (referência)

- Arquivos envolvidos (já prontos): `src/lib/rh/api.ts` (`exportarResumoFolhaExcel`, `ExportarResumoFolhaError`), `src/pages/rh/ResumoFolhaPage.tsx` (botão + mutation + toasts).
- Parâmetros enviados: `anomes_ini`, `anomes_fim`, `codemp`, e `cd_filial` quando o filtro de filial estiver aplicado.
- Não há nenhuma mudança em cards, filtros, KPIs ou lógica de dados — o botão apenas reaproveita `baseParams` da tela.