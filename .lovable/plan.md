## Objetivo

Correção foi feita no backend/API (nova pasta de desenhos `\\EZ-SRV-007\99-GENIUS-KPIs\01-Desenhos\02-JPG_OP` + restart da API 8070). O frontend **não muda regra**, apenas melhora a mensagem amigável quando a API retornar erro de pasta/desenho e reforça que a URL vem sempre da API.

## Escopo (mínimo)

Alterar somente `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` (e, se necessário, o `Alert` já existente para `desenhosA4Errors` e `pdfJob.avisos`) para:

1. **Mensagem amigável única** ao usuário final quando a API/manifest de desenho falhar ou o job retornar aviso de pasta inacessível / produto sem desenho:
   - Texto: *"Desenho não encontrado ou pasta de desenhos indisponível. Verifique o cadastro do produto ou o acesso à pasta de desenhos."*
   - Não exibir o caminho de rede (`\\EZ-SRV-007\...` nem `/mnt/desenhos_op`) na UI de usuário final. Manter caminho técnico apenas no bloco de **Diagnóstico** já existente (`/api/producao/ordem-producao/desenhos/diagnostico`), que é a "tela técnica/admin".

2. **Nenhuma URL fixa no front.** Manter o fluxo atual: `data.desenhos[].url_impressao|url` e `url_manifest_a4` vindos da API são a única fonte. Confirmar que `useAuthedBlobUrls` / `useDesenhosA4` continuam a ser os únicos consumidores.

3. **Preview/thumbnail/impressão** continuam sendo renderizados normalmente quando a API responde com desenho válido — sem alteração de layout nem fluxo.

4. **Sem mocks.** Nenhum fallback local para JPG.

## Validação (após restart da API 8070)

Rodar manualmente pela própria tela `/producao/impressao-ordem-producao`:

1. Consultar uma OP do produto `cod_pro = 110000002` com "Imprimir desenhos da OP" ligado.
2. Confirmar que o preview mostra `110000002-1.jpg`.
3. Rodar **Diagnóstico** e conferir na resposta:
   - `pasta_existe = true`
   - `arquivo_encontrado = true`
   - `cod_pro = 110000002`
   - `arquivo = 110000002-1.jpg`
4. Rodar "Gerar PDF completo com desenhos" para 1 OP com desenho e confirmar `desenhos_resumo.ops_com_desenho ≥ 1` e ausência de aviso "Pasta de desenhos inacessível".
5. Forçar erro (produto sem desenho) e confirmar que aparece a mensagem amigável, sem caminho de rede.

## Fora de escopo

- Não mexer em `useDesenhosA4`, `opDesenhosA4.ts`, `useAuthedBlobUrls`, backend, layout da página, filtros ou fluxo de job PDF.
- Não alterar `.env`, config de API ou caminhos.

## Detalhes técnicos

- Ajustar apenas os textos dos `Alert`s existentes na página (`desenhosA4Errors` e o bloco de `pdfJob.avisos` quando contiver "Pasta de desenhos inacessível" ou "Nenhum desenho encontrado"). Sanitizar avisos removendo trechos de caminho antes de exibir ao usuário final; manter o array bruto no bloco de diagnóstico técnico.
