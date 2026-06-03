## Problema
`src/components/etl/EditarSqlModal.tsx` carrega `acao.sql_template` (SQL real do Cloud) e logo depois sobrescreve com o retorno do FastAPI `buscarComandoSql()`. Para `VM_FATURAMENTO` o FastAPI devolve o ponteiro `STATIC:SQL_VM_FATURAMENTO`, escondendo o SQL real (31.706 chars) já presente no banco.

## Correção
No `useEffect` (linhas 137-143 do modal):
- Se a resposta do FastAPI vier vazia OU começar com `STATIC:`, **não sobrescrever**; manter o `sql_template` vindo do Cloud.
- Apenas substituir quando o FastAPI retornar um SQL real (sem prefixo `STATIC:`).

Critério: `if (real && real.trim() && !/^\s*STATIC:/i.test(real)) { setSql(real); setSqlOriginal(real); }`

## Fora de escopo
- Lógica do FastAPI / backend.
- Outras ações ou edge functions.