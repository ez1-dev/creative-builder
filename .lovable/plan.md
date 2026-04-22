

## Investigar por que `horas_apontadas` chega zerada do backend

### Diagnóstico
A requisição `GET /api/auditoria-apontamento-genius` está retornando **221.569 linhas**, mas em **todas** os campos de apontamento vêm vazios:
- `horas_apontadas: 0.0`
- `hora_inicio: ""`, `hora_fim: ""`
- `nome_usuario: ""`, `codigo_usuario: 0`
- `data_apontamento: ""`
- `total_sem_inicio: 221565` no resumo

Ou seja: a tela está mostrando exatamente o que o backend mandou. **O problema NÃO é frontend** — o `LEFT JOIN APONT` na SQL do endpoint não está casando nenhum registro de `E930MPR` com as OPs de `E900COP`.

### Hipóteses no SQL do backend

1. **Granularidade da chave de join está errada.** Hoje o JOIN é por `(CODEMP, CODORI, NUMORP, CODETG, SEQROT)`, mas a CTE `OPS` puxa `CODETG/SEQROT` da `E900OOP` com `LEFT JOIN` simples — sem garantir que o par retornado bate com o par real do apontamento em `E930MPR`. Resultado: cada OP devolve uma linha de roteiro arbitrária, que dificilmente coincide com alguma chave real de apontamento.

2. **Campos errados em `E930MPR`.** No padrão Senior, apontamentos de produção podem usar `NUMETG` no lugar de `CODETG`, ou `OPESEQ` em vez de `SEQROT`. Pode também não existir `HORINI/HORFIM` no nome esperado (em algumas implantações é `HORINIO`/`HORFINA`).

3. **Join com `E099USU`.** O SQL faz `U.CODUSU = M.USU_NUMCAD`. No Senior, `E099USU` chaveia por `NUMCAD`, não `CODUSU`. Isso por si não zera horas, mas zera operador.

4. **Cálculo de horas inválido.** `(horfim/100.0 - horini/100.0)` trata HHMM como decimal: 1730-0830 dá 9.0 (acidentalmente certo), mas 1015-0945 dá 0.7 em vez de 0.5. Precisa converter HHMM para minutos: `((horfim/100*60 + horfim%100) - (horini/100*60 + horini%100)) / 60.0`.

### Ação proposta

#### 1. Pedir ao backend a SQL corrigida
A tela do frontend já consome os campos corretos. O ajuste necessário está **fora deste repositório**, na rota `/api/auditoria-apontamento-genius`. Encaminhar ao responsável pelo backend ERP:

- **Refazer a CTE base como apontamento-driven** em vez de OP-driven. Partir de `E930MPR` filtrando por `DatMov` no período + `CodOri` GENIUS, e depois fazer `LEFT JOIN E900COP` para trazer status da OP.
- **Validar nomes reais das colunas** em `E930MPR`: confirmar se são `CODETG`/`SEQROT`/`HORINI`/`HORFIM`/`USU_NUMCAD`/`DATMOV`. Se forem diferentes, ajustar.
- **Corrigir cálculo de horas** para tratar HHMM:
  ```sql
  ((horfim/100)*60 + (horfim - (horfim/100)*100)) -
  ((horini/100)*60 + (horini - (horini/100)*100)) ) / 60.0
  ```
- **Corrigir join de operador**: `U.NUMCAD = M.USU_NUMCAD` (não `U.CODUSU`).
- **Reativar o bloco `debug`** da resposta com a SQL final montada e contagem por etapa, para que o card de diagnóstico do frontend (já implementado) volte a mostrar onde os apontamentos estão sendo filtrados/perdidos.

#### 2. Ajuste mínimo no frontend (este repositório)
Único arquivo: `src/pages/AuditoriaApontamentoGeniusPage.tsx`.

- Quando `dados.length > 0` mas a coluna `horas_apontadas` for zero em **todos** os registros (ou `total_sem_inicio` ≈ `total_registros`), exibir um **alerta amarelo** acima da tabela:
  > "O backend retornou OPs mas nenhum apontamento de produção foi vinculado. Verifique o JOIN com E930MPR (chaves CODETG/SEQROT/HORINI/HORFIM e cálculo de horas em HHMM)."
- Adicionar um **botão "Ver Diagnóstico Técnico"** que renderiza o `DiagnosticoApontGeniusCard` mesmo sem `data.debug`, mostrando os parâmetros enviados e a contagem local por status (já calculada na tela).
- Ordenar a tabela trazendo registros com `horas_apontadas > 0` primeiro, para o usuário ver imediatamente os poucos casos válidos quando existirem.

### Fora de escopo
- Reescrever a SQL no backend (não está neste repositório).
- Alterar contrato de `/api/auditoria-apontamento-genius`.

### Resultado
- O frontend ganha um aviso explícito quando o backend devolve OPs sem apontamento, transformando o sintoma silencioso atual ("coluna zerada") em um diagnóstico acionável.
- Fica documentado e formalizado o ajuste necessário no backend para que `horas_apontadas` volte a vir preenchida.

