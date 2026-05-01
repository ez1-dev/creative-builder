
# Corrigir exibição de sessões no Monitor de Usuários Senior

## Diagnóstico

O SQL no servidor retorna 6 sessões (Sapiens) com as colunas:

```
sessao, usuario_senior, usuario_sistema_operacional, computador,
aplicativo, codigo_modulo, modulo_acessado, data_hora_conexao,
instancia, tipo_aplicacao, mensagem_admin
```

A página `MonitorUsuariosSeniorPage.tsx` espera outras chaves no JSON:

```
numsec, usuario_windows, cod_modulo, modulo, ...
```

Resultado: mesmo se o backend responder 200 com os 6 registros, a tabela mostra linhas em branco (sem usuário, sem computador, sem módulo) e o filtro padrão `Aplicativo = SAPIENS` filtra corretamente — mas **a chave primária `numsec` fica `undefined`**, o que pode quebrar a renderização (`key={String(s.numsec)}`) e, somado ao filtro de aplicativo case-sensitive, a percepção é "não está mostrando nada".

Além disso, hoje não temos forma rápida de ver no preview qual JSON o backend devolveu — só toast genérico.

## O que vai ser feito

### 1. Mapear a resposta da API para o formato interno

Em `MonitorUsuariosSeniorPage.tsx`, criar uma função `normalizeSessao(raw)` que aceita os dois formatos (legado e atual do FastAPI) e devolve o objeto `SessaoSenior` esperado:

| Campo interno              | Aceita também (fallback)                          |
|----------------------------|---------------------------------------------------|
| `numsec`                   | `sessao`, `num_sec`, `numSec`                     |
| `usuario_senior`           | `usuario`, `app_usr`, `appusr`                    |
| `usuario_windows`          | `usuario_sistema_operacional`, `usr_nam`, `usrnam`|
| `computador`               | `com_nam`, `comnam`                               |
| `aplicativo`               | `app_nam`, `appnam`                               |
| `cod_modulo`               | `codigo_modulo`, `mod_nam`, `modnam`              |
| `modulo`                   | `modulo_acessado`, `descricao_modulo`             |
| `data_hora_conexao`        | `dat_tim`, `dattim`                               |
| `minutos_conectado`        | calculado se ausente: `(now - data_hora_conexao)` |
| `instancia`                | `id_inst`, `idinst`                               |
| `tipo_aplicacao`           | `app_knd`, `appknd`                               |
| `mensagem_admin`           | `adm_msg`, `admmsg`                               |

A normalização é aplicada logo após `api.get(...)`:

```ts
const rows: SessaoSenior[] = (Array.isArray(res) ? res : (res?.sessoes ?? res?.data ?? []))
  .map(normalizeSessao);
```

### 2. Calcular `minutos_conectado` no frontend quando não vier do backend

O SQL atual não devolve `minutos_conectado`. Calcular a partir de `data_hora_conexao` (diferença com `Date.now()` em minutos). Isso já alimenta corretamente o KPI "Conectados > 4h" e a coluna "Min." da tabela.

### 3. Tornar o filtro "Aplicativo" tolerante e padrão "Todos"

- Trocar o default de `fAplicativo` de `'SAPIENS'` para `'__all__'` para evitar esconder linhas quando o backend devolve aplicativo em minúsculo, vazio ou diferente.
- Comparação continua case-insensitive (já é).

### 4. Garantir `key` único na tabela mesmo sem `numsec`

Usar `key={String(s.numsec ?? `${s.usuario_senior}-${s.computador}-${i}`)}` para não sobrescrever linhas quando o backend não preenche `numsec`.

### 5. Mostrar preview do JSON cru quando vier resposta inesperada

Adicionar um pequeno bloco colapsável (visível apenas quando `import.meta.env.DEV` ou quando `data.length === 0` mas `connStatus.kind === 'online'`) com os primeiros 500 chars do JSON recebido. Isso ajuda a identificar rapidamente outro mismatch no futuro.

Implementação: armazenar `rawSamplePreview: string | null` em estado, preencher no `load()` com `JSON.stringify(res, null, 2).slice(0, 1500)`. Mostrar dentro de um `<details>` abaixo do `BackendStatusCard` quando aplicável.

### 6. Logar no console o shape da primeira linha

No `load()`, depois de obter `rows`, fazer:

```ts
console.info('[MonitorSenior] sample row keys', rows[0] ? Object.keys(rows[0]) : []);
```

Útil para debugging futuro — sem custo.

## Arquivos alterados

- `src/pages/MonitorUsuariosSeniorPage.tsx` (única mudança)
  - Adicionar `normalizeSessao()`.
  - Aplicar normalização e cálculo de `minutos_conectado`.
  - Mudar default de `fAplicativo` para `'__all__'`.
  - Reforçar `key` da `TableRow`.
  - Estado e UI opcional do preview cru (`<details>`).
  - Log estruturado das chaves da primeira linha.

Sem mudanças em `src/lib/api.ts`, sem mudanças no banco, sem mudanças no backend.

## Fora de escopo

- Não vamos pedir ao backend para renomear campos. O frontend se adapta ao que o FastAPI já retorna (formato visível no SQL).
- O sistema de diagnóstico (`BackendStatusCard`, `UpdateApiUrlDialog`) já implementado continua funcionando como hoje.
