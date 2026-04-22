

## Corrigir Auditoria Apontamento Genius com validação nativa e diagnóstico explícito

### Objetivo
Ajustar a tela para parar de tratar `dados: []` como “sem registros” de forma definitiva e passar a operar sobre o fluxo nativo de apontamento de produção, com diagnóstico visível quando o backend não retornar linhas.

### Situação atual identificada
- A página já existe em `src/pages/AuditoriaApontamentoGeniusPage.tsx`.
- Hoje ela:
  - consulta `GET /api/auditoria-apontamento-genius`;
  - mostra alerta fixo “Sem registros para o período” quando `dados.length === 0`;
  - aceita apenas `status_op = EM_ANDAMENTO | FINALIZADO`;
  - usa lista fixa de origens GENIUS;
  - não exibe SQL final nem contagens intermediárias do filtro.
- O network mostra `200 OK` com `dados: []`, então o problema agora é de contrato/diagnóstico, não de rota nem autenticação.

## O que será implementado

### 1) Revisar o contrato da tela para o fluxo nativo de apontamento
Atualizar a integração para consumir o retorno nativo do backend com foco em:
- base de apontamentos de produção, sem reaproveitar lógica consolidada de Engenharia x Produção;
- parâmetros nativos do fluxo:
  - `CodOri`
  - `NumOrp`
  - `CodEtg`
  - `SeqRot`
  - `DatMov`
  - `HorMov`
- status reais da OP vindos da `E900COP`, preservando:
  - `L` = Liberada
  - `A` = Andamento
  - `F` = Finalizada
  - `C` = Cancelada
  - OPs ativas = `E`, `L`, `A`

### 2) Ajustar a UI para status nativo da OP
Na página `src/pages/AuditoriaApontamentoGeniusPage.tsx`:
- trocar o filtro atual de `status_op` para aceitar os códigos/agrupamentos nativos;
- revisar os badges de “Status OP” para exibir os status reais do backend;
- manter os KPIs de topo, mas calcular:
  - OPs em andamento = conjunto ativo (`E`, `L`, `A`)
  - OPs finalizadas = `F`
- tratar `C` e `SEM_STATUS` explicitamente na tabela/diagnóstico.

### 3) Corrigir a lógica de data e origem
Na tela:
- alinhar os filtros para usar a data real de movimento de apontamento (`DatMov`);
- revisar a origem GENIUS para iniciar corretamente em `110`;
- manter a seleção de origem no frontend, mas depender do backend para validar a lista final aplicada;
- preservar o atalho “Últimos 12 meses”.

### 4) Remover o falso positivo “Sem registros para o período”
Substituir o alerta atual por uma abordagem em duas fases:
- se `dados` vier vazio, a tela não afirmará mais que não há apontamentos;
- antes disso, exibirá um bloco de diagnóstico informando:
  - quantidade de OPs GENIUS no período;
  - quantidade de apontamentos por OP;
  - quantidade por status da OP;
  - quantidade por origem;
  - em qual etapa os registros foram eliminados.

### 5) Adicionar painel de diagnóstico técnico na própria tela
Acima da tabela, adicionar um card de diagnóstico/validação quando:
- `dados` vier vazio; ou
- o backend retornar informações de depuração.

Esse card mostrará:
- SQL final montada;
- parâmetros efetivamente aplicados;
- contagem por etapa do filtro, por exemplo:
  1. movimentos no período (`DatMov`);
  2. movimentos em origens GENIUS;
  3. OPs encontradas;
  4. OPs por status (`E/L/A/F/C`);
  5. linhas após filtros opcionais;
  6. linhas finais paginadas.
- totais auxiliares por:
  - origem;
  - status da OP;
  - OP;
  - apontamentos por OP.

Formato esperado no retorno do backend:
```text
debug: {
  sql_final: string,
  parametros: {...},
  etapas: [
    { nome: "movimentos_no_periodo", quantidade: 1234 },
    { nome: "origens_genius", quantidade: 842 },
    { nome: "ops_validas", quantidade: 615 },
    ...
  ],
  contagem_por_origem: [...],
  contagem_por_status_op: [...],
  contagem_por_op: [...]
}
```

### 6) Tornar a tipagem da API resiliente ao novo contrato
Em `src/lib/api.ts`:
- expandir `AuditoriaApontamentoGeniusResponse` para incluir:
  - `debug`;
  - possíveis status nativos da OP;
  - contagens auxiliares;
  - campos de resumo vindos do backend sem depender só de fallback local.
- manter guards opcionais para evitar crash com respostas parciais.

### 7) Atualizar a documentação do backend esperado
Em `docs/backend-auditoria-apontamento-genius.md`:
- remover a ambiguidade com a base consolidada;
- documentar explicitamente que esta tela usa apontamentos nativos;
- registrar:
  - status reais da `E900COP`;
  - regra de OP ativa = `E`, `L`, `A`;
  - uso de `DatMov`/`HorMov`;
  - filtro GENIUS começando em `110`;
  - novo bloco `debug` obrigatório enquanto a investigação estiver ativa;
  - obrigação de retornar SQL final e contagem por etapa antes de concluir “sem dados”.

## Arquivos a alterar
- `src/pages/AuditoriaApontamentoGeniusPage.tsx`
- `src/lib/api.ts`
- `docs/backend-auditoria-apontamento-genius.md`

## Trabalho esperado no backend ERP
Fora deste repositório, será necessário ajustar a rota `GET /api/auditoria-apontamento-genius` para:
- usar base nativa de apontamentos;
- aplicar os filtros nativos corretos;
- derivar status reais da OP via `E900COP`;
- retornar o bloco `debug` com SQL final e contagens por etapa.

A exportação `GET /api/export/auditoria-apontamento-genius` deve seguir a mesma origem de dados e os mesmos filtros nativos.

## Resultado esperado
Na tela `/auditoria-apontamento-genius`:
- o usuário verá dados nativos de apontamento quando o backend os retornar;
- os status da OP serão os reais da `E900COP`;
- a data filtrará pelo movimento real de apontamento;
- se vier vazio, a interface mostrará diagnóstico objetivo do funil de filtragem e a SQL final, em vez de afirmar incorretamente que não existem registros.

