# Plano: Refinos finais na tela Regras LSP para E098REG

Status atual: o grosso já foi feito (mapper UPPER, id sintético, badge Origem, ações condicionais por `id_regra`, `unwrapList` aceita `dados`). Restam apenas refinamentos pedidos no prompt.

## 1. `src/components/regras-senior/RegrasList.tsx`

- **Adicionar coluna "Empresa"** (`codemp`) entre Origem e Nome.
- **Reordenar/renomear "Cód ERP" → "Código Regra"** (alinhar com a spec).
- **Botão "Ver identificador"** sempre habilitado: navega para `/regras-senior/identificadores?codemp=<>&modsis=<>&idereg=<>`. Mantém os botões de editar/exportar/status desabilitados quando `id_regra == null`. Ícone `Link2` ou `ExternalLink`.
- **emptyMessage** → `"Nenhuma regra encontrada. Cadastre uma regra no portal ou verifique se existem identificadores com regra vinculada na E098REG."`

## 2. `src/components/regras-senior/IdentificadoresList.tsx`

Já aceita querystring `codemp`/`modsis`/`idereg`? Conferir: hoje os filtros são lidos só via `useState` inicial, sem `useSearchParams`. Adicionar:

```ts
const [sp] = useSearchParams();
const [codemp, setCodemp] = useState(sp.get('codemp') ?? '');
const [modsis, setModsis] = useState(sp.get('modsis') ?? '');
const [idereg, setIdereg] = useState(sp.get('idereg') ?? '');
```

Para que o botão "Ver identificador" caia já filtrado.

## Fora de escopo

- Não criar tela de detalhe de regra E098REG (ações de detalhe ficam desabilitadas — basta o link para o identificador).
- Não mexer em login/rotas/layout.
- Não alterar tipos novamente (já cobrem `origem`, `id_regra`, `codemp`).

## Arquivos

- `src/components/regras-senior/RegrasList.tsx`
- `src/components/regras-senior/IdentificadoresList.tsx`
