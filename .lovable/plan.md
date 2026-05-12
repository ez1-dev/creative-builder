# Ver regra de negócio

Adicionar uma visão de **regra de negócio** (resumo conceitual da regra) acessível pela tela Regras LSP, funcionando tanto para registros do ERP Senior (E098REG) quanto do portal.

## 1. Nova rota e página

**Rota:** `/regras-senior/regras/:id/negocio`
**Arquivo:** `src/pages/regras-senior/RegraNegocioPage.tsx`

A rota aceita dois modos:

- **Portal**: `:id` é o `id_regra` numérico. Busca a regra com `seniorApi.obterRegra(id)`.
- **ERP Senior** (id_regra nulo): usa `:id = "erp"` + query string com chave composta
  `?codemp=&modsis=&idereg=&codtns=&codreg=`. Busca via `seniorApi.listarRegras` filtrando por essa chave e pega o primeiro registro de origem `E098REG`. Como fallback, pode aceitar os campos via `location.state` quando navegado direto da listagem.

A página tem 2 layouts conforme `origem`:

### Para E098REG

Cabeçalho com **OrigemBadge "ERP Senior"** + botão **Voltar**.

Cards lado a lado (responsivo, grid 2-3 colunas):
- Empresa, Módulo, Identificador, Transação, Código da regra, Descrição, Observação (OBSREG), Situação (`status_regra`), Origem.

Banner amarelo:
> "Este registro vem da E098REG. Ele mostra o vínculo do identificador com o código da regra. Para visualizar a lógica completa da regra, importe ou clone o fonte LSP para o portal."

Seção **"Resumo da regra de negócio"** mostrando `descricao` e `observacao` (OBSREG) em formato legível (prose). Se ambos vazios, exibir "Sem descrição/observação cadastrada na E098REG."

Botão CTA: **"Clonar para portal / Importar fonte LSP"** → abre `ClonarParaPortalDialog` existente.

### Para PORTAL

Cabeçalho com **OrigemBadge "Portal"**, status, nome, ambiente + botão **Voltar** + botão **"Abrir editor"** (link para `/regras-senior/regras/:id/editor`).

Seções (cards verticais):
1. **Resumo da regra** — descrição + observação (OBSREG, quando existir) + dados-chave (módulo, identificador, transação, código ERP).
2. **Fonte LSP** — bloco `<pre>` monoespaçado, somente leitura, com scroll, e link "Editar no editor".
3. **Validações encontradas** — lista derivada de `seniorApi.validarRegra(id)` (avisos por nível).
4. **Tabelas consultadas / alteradas** — extraídas do fonte LSP via parser regex (ver §3).
5. **Mensagens (GeraLog / Mensagem)** — extraídas via parser.
6. **Comandos ExecSQL / ExecSQLEx** — extraídos via parser; cada comando em bloco `<pre>` com badge `SQL`.
7. **Riscos** — heurística simples a partir dos achados do parser (ver §3).
8. **Histórico de versões** — usa `seniorApi.listarVersoes(id)`; tabela compacta (versão, status, data, autor, motivo).

## 2. Ajustes na listagem `RegrasList.tsx`

No `DropdownMenu` de ações, adicionar item **"Regra de negócio"** (ícone `BookOpen`) **para ambas as origens**, **sempre habilitado** (mesmo quando `id_regra` é null, pois usamos a chave composta):

- Portal → `navigate('/regras-senior/regras/' + id_regra + '/negocio')`
- E098REG com `id_regra` → mesmo destino acima
- E098REG sem `id_regra` → `navigate('/regras-senior/regras/erp/negocio?codemp=&modsis=&idereg=&codtns=&codreg=' + codreg_erp, { state: { regra } })`

Posicionar logo após "Ver detalhes". Não esconder/remover nenhuma linha por `id_regra` null (manter o comportamento atual de só desabilitar ações que dependem de id_regra).

## 3. Parser LSP (cliente)

Arquivo: `src/lib/senior/lspAnalyzer.ts`. Função `analisarFonteLsp(src: string)` retorna:

```text
{
  tabelas_consultadas: string[]   // de SELECT ... FROM <tab>, JOIN <tab>, "SELECT" ... "FROM" "tab"
  tabelas_alteradas: string[]     // INSERT INTO, UPDATE, DELETE FROM
  mensagens: string[]             // GeraLog(...) e Mensagem(...) — captura argumentos string
  comandos_sql: string[]          // conteúdo de ExecSQL(...)/ExecSQLEx(...)
  riscos: { nivel: 'info'|'warning'|'error'; mensagem: string }[]
}
```

Regras de risco (heurísticas simples):
- `DELETE` sem `WHERE` → error
- `UPDATE` sem `WHERE` → error
- `DROP|TRUNCATE` → error
- `ExecSQL` com concatenação de string + variável → warning
- Mais de N tabelas alteradas → info

Sem dependências externas; só regex tolerantes ao formato LSP.

## 4. Tipos e mapeamento

`src/lib/senior/types.ts`: adicionar `observacao?: string | null` em `RegraLSP`.
`src/lib/senior/mappers.ts`: incluir `observacao: r?.observacao ?? r?.OBSREG ?? null`.

## 5. Roteamento

`src/App.tsx`: nova rota acima da existente do editor:

```text
<Route path="/regras-senior/regras/:id/negocio"
       element={<ProtectedRoute path="/regras-senior/regras"><RegraNegocioPage /></ProtectedRoute>} />
```

## 6. Fora do escopo

- Backend dedicado de análise LSP (a heurística de tabelas/riscos é client-side).
- Edição de OBSREG (somente exibição).
- Mudanças em rotas existentes, autenticação ou layout global.

## Arquivos

```text
NOVO  src/pages/regras-senior/RegraNegocioPage.tsx
NOVO  src/lib/senior/lspAnalyzer.ts
EDIT  src/App.tsx                                       (registrar rota)
EDIT  src/components/regras-senior/RegrasList.tsx       (item "Regra de negócio")
EDIT  src/lib/senior/types.ts                           (observacao)
EDIT  src/lib/senior/mappers.ts                         (OBSREG → observacao)
```
