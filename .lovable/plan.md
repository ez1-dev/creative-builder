## Objetivo

Enriquecer o painel lateral de **Detalhes do usuário** (aba Usuários do SGU) para mostrar todos os campos retornados pelo backend com placeholders consistentes e chips de status visuais para R910/R999/E099USU.

## Mudanças

Arquivo único afetado: `src/components/sgu/SguUsuariosTab.tsx` (apenas o JSX dentro do `<Sheet>`).

### 1. Grade de campos completa

Hoje o painel mistura `nomcom || desusu` numa linha só e omite a separação. Passar para 7 linhas, uma por campo, todas com o mesmo placeholder `—` quando vazio/null/`""`:

| Label                       | Fonte                       |
|-----------------------------|-----------------------------|
| Código                      | `codusu`                    |
| Login (nomusu)              | `nomusu`                    |
| Nome completo (nomcom)      | `nomcom`                    |
| Descrição (desusu)          | `desusu`                    |
| Tipo (tipcol)               | `tipcol`                    |
| Empresa (empcol)            | `empcol`                    |
| Filial (filcol)             | `filcol`                    |

Helper inline para evitar repetição: `(v) => v != null && v !== '' ? String(v) : '—'`.

### 2. Chips de status

Logo abaixo da grade, uma linha de `<Badge>` (componente shadcn já importado) com tokens semânticos:

- **R910**: `secondary` "R910 OK" se `existe_r910`, senão `destructive` "Sem R910".
- **R999**: idem para `existe_r999`.
- **E099USU**: `secondary` "E099USU: N" se `qtd_empresas_e099usu > 0`, senão `destructive` "E099USU: 0".

Layout: `flex flex-wrap gap-2 pt-1`.

### 3. Nada mais muda

- Bloco "Resumo de acessos" continua igual.
- Estado de erro (`detalheErro`) e loading continuam iguais.
- Sem alteração em `sguApi.ts` nem na tabela principal.

## Detalhes técnicos

Substituir o bloco `{detalheUsr ? (<div className="grid grid-cols-2 ...">...</div>)` por um fragmento contendo a grade expandida + a fileira de chips, mantendo o ramo `!detalheErro ? <p>Sem dados...</p> : null`. Sem novos imports (Badge e AlertTriangle já estão em uso no arquivo).
