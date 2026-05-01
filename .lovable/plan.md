## Diagnóstico

Pelos screenshots e pela análise do código:

1. **Linhas em branco na tabela** (Código/Nome/Tipo/Empresa/Filial todos como "—"): o backend está retornando registros (já que aparecem `OK/OK` em R910/R999 e `2` em E099USU), mas os campos `codusu`, `nomusu`, `tipcol`, `empcol`, `filcol` estão chegando com nomes diferentes do esperado pelo frontend. Como `codusu` está vindo vazio/inválido, qualquer ação posterior (Detalhes/Origem/Destino) dispara o erro **422** `path.codusu: Input should be a valid integer` porque o React envia `undefined` na URL `/api/sgu/usuarios/undefined`.

2. **Falta do `key` válido na tabela**: `<TableRow key={u.codusu}>` produz keys duplicadas/`undefined`, agravando o problema de render.

## Plano de correção

### 1. Inspecionar o payload real do backend
Adicionar `console.table` e `console.dir` na resposta de `getUsuarios` em `src/lib/sguApi.ts` para mostrar nas próximas mensagens **exatamente** quais nomes de campo o FastAPI está retornando (pode ser `cod_usu`, `codUsu`, `CODUSU`, `usuario`, `nome`, etc.).

### 2. Normalizar os campos no `sguApi.ts`
Mapear nomes alternativos de forma defensiva ao retornar usuários, cobrindo as variantes mais comuns:

```ts
function normalizar(u: any): SguUsuario {
  return {
    codusu: Number(u.codusu ?? u.cod_usu ?? u.CODUSU ?? u.codigo ?? u.id),
    nomusu: u.nomusu ?? u.nom_usu ?? u.NOMUSU ?? u.nome ?? '',
    tipcol: u.tipcol ?? u.tip_col ?? u.TIPCOL ?? null,
    empcol: u.empcol ?? u.emp_col ?? u.EMPCOL ?? null,
    filcol: u.filcol ?? u.fil_col ?? u.FILCOL ?? null,
    existe_r910: u.existe_r910 ?? u.r910 ?? 0,
    existe_r999: u.existe_r999 ?? u.r999 ?? 0,
    qtd_empresas_e099usu: u.qtd_empresas_e099usu ?? u.qtd_e099usu ?? 0,
  };
}
```

Aplicar em `getUsuarios` e `getUsuario` antes de retornar.

### 3. Validar `codusu` antes das chamadas
Em `SguUsuariosTab.tsx` e nos demais handlers (Origem/Destino/Detalhes), bloquear ação e exibir toast quando `codusu` for `NaN`/`undefined`, evitando o 422 silencioso.

### 4. Corrigir `key` da tabela
Trocar `key={u.codusu}` por `key={u.codusu ?? \`row-${idx}\`}` usando o índice como fallback.

### 5. Mensagem de erro mais útil
No `handleError` do `sguApi.ts`, quando `status === 422` e a mensagem mencionar `codusu`, exibir: "Resposta do backend SGU não trouxe o código do usuário. Verifique o mapeamento de campos."

## Arquivos a modificar
- `src/lib/sguApi.ts` — função `normalizar`, log do payload, mensagem 422 mais clara
- `src/components/sgu/SguUsuariosTab.tsx` — validação de `codusu` antes das ações + key fallback

Após aplicar, você reabre a página, faz uma pesquisa e me envia (ou eu leio via console logs) o objeto bruto que o backend retornou — assim afino o mapeamento se algum campo ainda estiver fora.

**Aprova?**