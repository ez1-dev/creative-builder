## Diagnóstico

A tela está chamando o endpoint correto:
```
GET /api/producao/ordem-producao/impressao?cod_emp=1&listar_componentes=S&listar_desenho=N
```

Mas o FastAPI responde **404 Not Found** (registrado em `error_logs`, status_code 404, detail "Not Found"). Isso significa que a rota **ainda não foi implementada no backend** — não é problema do frontend.

Observação adicional: nos testes recentes a chamada foi feita apenas com `cod_emp=1`, sem `cod_ori` nem `num_orp`. Mesmo assim o erro 404 ocorre antes da validação de parâmetros, confirmando que a rota não existe.

## O que fazer

### 1. Criar documento de especificação do backend
Arquivo: `docs/backend-impressao-ordem-producao.md`

Conteúdo:
- Rota: `GET /api/producao/ordem-producao/impressao`
- Parâmetros obrigatórios: `cod_emp`, `cod_ori`, `num_orp`
- Parâmetros opcionais: `listar_componentes` (S/N), `listar_desenho` (S/N), `cod_etg`, `cod_cre`
- Contrato de resposta JSON espelhando `OpImpressao` (cabecalho, componentes, operacoes, observacoes, mensagem_responsabilidade) — copiando os campos já definidos em `src/lib/producao/opImpressao.ts`
- Regras: retornar 404 só quando a OP de fato não existe; retornar 422 quando faltar `cod_ori`/`num_orp`; nunca calcular dados no frontend
- Exemplo de payload de resposta para Empresa=1, Origem=210, OP=86993

### 2. Melhorar feedback no frontend (somente UX)
Em `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`:
- Validar no clique de "Consultar" que `cod_emp`, `cod_ori` e `num_orp` estão preenchidos. Se faltar, mostrar toast "Informe Empresa, Origem e Nº da O.P." em vez de disparar request inválido.
- Quando a API responder 404, exibir mensagem mais clara: "Ordem de produção não encontrada para Empresa X / Origem Y / OP Z" (usando os filtros usados na consulta).
- Quando o backend responder com `detail: "Not Found"` genérico (rota inexistente), distinguir de "OP inexistente" exibindo: "Endpoint indisponível no backend (`/api/producao/ordem-producao/impressao`). Solicite ao time de backend implementar conforme `docs/backend-impressao-ordem-producao.md`."

### 3. Fora de escopo
- Não mexer em sidebar, rota, permissões, design system, Cloud, ETL, ou layout de impressão.
- Não implementar o backend (é em FastAPI externo, fora deste repositório). Apenas documentar.

## Validação
1. Após implantação do backend, recarregar `/producao/impressao-op` com Empresa=1, Origem=210, OP=86993 → deve renderizar a folha A4 com cabeçalho, componentes e operações.
2. Tentar consultar sem `cod_ori`/`num_orp` → frontend bloqueia antes do request.
3. Consultar OP inexistente → frontend mostra mensagem com os parâmetros usados.