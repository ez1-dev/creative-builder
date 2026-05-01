## Diagnóstico confirmado

O backend FastAPI SGU está retornando `codusu` como **string com o login do usuário** (`"ademir.passos"`, `"admin"`, `"agendador"`) em vez do **inteiro PK** da tabela `R910USU`. Além disso, `tipcol`, `empcol`, `filcol` estão vindo todos `null` — provavelmente também precisam ser revistos no SELECT do backend.

Como o codusu correto **é numérico**, a solução definitiva é no backend. O frontend já está correto.

## Plano

### 1. Documentar bug e correção esperada para o backend
Criar `docs/backend-sgu-codusu-bug.md` com:
- Sintoma observado (JSON atual)
- Lista dos endpoints afetados
- Schema esperado (`codusu: int`, `nomusu: string`, `descusu: string?`)
- SQL sugerido (`SELECT R910USU.CODUSU AS codusu, R910USU.NOMUSU AS nomusu, ...`)
- Critério de validação

### 2. Mensagem clara no frontend enquanto o backend não é corrigido
Em `src/components/sgu/SguUsuariosTab.tsx`:
- Quando **todos** os registros retornarem com `codusu` inválido (string), exibir um banner `<Alert variant="destructive">` acima da tabela:
  > "O backend SGU está retornando `codusu` no formato incorreto (texto em vez de número inteiro). Aguardando correção do backend conforme `docs/backend-sgu-codusu-bug.md`. As ações Detalhes/Origem/Destino ficarão desabilitadas."
- Manter as linhas visíveis (apenas leitura) para o usuário ver que a pesquisa funciona.

### 3. Reverter parcialmente o aviso "inválido" para algo mais amigável
Em vez de mostrar "inválido" em vermelho na coluna Código, mostrar o `nomusu` precedido de um ícone de alerta com tooltip "Aguardando correção do backend (codusu numérico)". Mais limpo visualmente.

### 4. Manter `normalizarUsuario` resiliente
O mapeamento defensivo (`pickFirst`) continua útil — se o backend corrigir e mudar nomes (`cod_usu`, `CODUSU`), nada quebra.

## Arquivos a alterar (após aprovação)
- `docs/backend-sgu-codusu-bug.md` — novo (especificação de correção do backend)
- `src/components/sgu/SguUsuariosTab.tsx` — banner de alerta + ajuste visual da coluna Código

## Próximo passo após implementação
Você envia o arquivo `docs/backend-sgu-codusu-bug.md` ao desenvolvedor backend FastAPI. Quando ele ajustar a query/serializer para retornar `codusu` como inteiro PK, a tela funciona automaticamente (incluindo Detalhes/Origem/Destino) sem mais nenhuma mudança no frontend.

**Aprova?**