## Objetivo

Adicionar suporte a impressão de desenhos da OP: novo campo de texto "Caminho da pasta de desenhos", checkbox "Incluir desenhos", envio dos parâmetros `incluir_desenhos=S` e `pasta_desenhos=<URL encoded>` para os endpoints individual e em lote, e renderização das imagens de desenho em páginas A4 separadas após cada OP.

## Mudanças na UI (`src/pages/producao/ImpressaoOrdemProducaoPage.tsx`)

No grupo "Refinamento" do card de filtros, adicionar:

1. **Checkbox "Incluir desenhos"** (componente `Checkbox` do shadcn já importado).
2. **Input de texto "Caminho da pasta de desenhos"** (placeholder com exemplos: `/mnt/desenhos_op`, `C:\Desenhos\OP`). Habilitado somente quando o checkbox estiver marcado.

Os dois controles substituem visualmente o select atual "Desenhos (S/N)" — o checkbox passa a controlar `listar_desenho` ('S'/'N') e também o novo `incluir_desenhos`.

Estado novo no componente:
- `incluirDesenhos: boolean` (default `false`)
- `pastaDesenhos: string` (default `''`)

Persistir os dois também no objeto `EMPTY`/`filtros` estendido (campos opcionais).

## Mudanças no contrato de filtros (`src/lib/producao/opImpressao.ts`)

Adicionar a `ImpressaoOpFiltros`:
```ts
incluir_desenhos?: 'S' | 'N' | '';
pasta_desenhos?: string;
```

Adicionar a `OpImpressao`:
```ts
desenhos?: OpDesenho[];
```

Novo tipo:
```ts
export interface OpDesenho {
  ordem?: number;
  nome_arquivo?: string;
  tipo?: string;
  pasta?: string;
  url?: string;
}
```

## Mudanças no hook individual (`src/hooks/useImpressaoOrdemProducao.ts`)

Quando `filters.incluir_desenhos === 'S'`, adicionar ao payload:
- `incluir_desenhos: 'S'`
- `pasta_desenhos: encodeURIComponent(filters.pasta_desenhos)` somente se preenchido.

(Como o helper `api.get` já costuma encodar query params, validar o comportamento de `src/lib/api.ts` para evitar dupla codificação — se `api.get` já faz `encodeURIComponent`, passar a string crua; caso contrário, encodar manualmente. Aplicar a opção que evita dupla codificação.)

## Mudanças no lote (`src/lib/producao/opImpressaoLote.ts`)

Adicionar em `ImpressaoOpLoteParams`:
- `incluir_desenhos?: 'S' | 'N'`
- `pasta_desenhos?: string`

Em `fetchImpressaoLote`, anexar `incluir_desenhos` e `pasta_desenhos` à query quando preenchidos (mesma regra de encoding acima).

Atualizar também a chamada paralela em `imprimirSelecionadas` (dentro de `ImpressaoOrdemProducaoPage.tsx`) para enviar os novos parâmetros.

E em `imprimirTodas`, repassar `incluir_desenhos` e `pasta_desenhos`.

## Renderização dos desenhos na impressão

Em `src/components/producao/OpPrintSheet.tsx`:

- Após o bloco de RESPONSABILIDADE/FOOTER da OP, mapear `data.desenhos ?? []` e renderizar **uma página A4 por desenho** dentro da mesma sheet, usando uma `<div className="op-drawing-page">` com:
  - cabeçalho curto: nome do arquivo + pasta
  - `<img src={desenho.url} alt={desenho.nome_arquivo} className="op-drawing-img" />`

Em `src/components/producao/op-print.css`:

- Adicionar `.op-drawing-page { page-break-before: always; break-before: page; display: flex; flex-direction: column; align-items: center; }`
- `.op-drawing-img { max-width: 100%; max-height: 260mm; object-fit: contain; }`
- Pequeno header `.op-drawing-header` com nome do arquivo e pasta.

Para impressão em lote (`OpPrintBatch.tsx`), nenhuma mudança — cada `OpPrintSheet` já cuida dos seus desenhos.

## Fora do escopo

- Upload de desenhos ou listagem por outro meio (somente o caminho manual).
- Mudanças no backend (apenas consumo do contrato `desenhos[]` já documentado).
- Alteração no documento `docs/backend-impressao-ordem-producao.md`.

## Detalhes técnicos

- O checkbox controla simultaneamente `listar_desenho` (compat com flag antiga) e `incluir_desenhos`. Quando desmarcado, ambos viram `'N'` e `pasta_desenhos` não é enviado.
- Validação: se o checkbox está marcado e a pasta está vazia, ainda assim mandar `incluir_desenhos=S` (caso o backend tenha um default), mas exibir um `toast.info` discreto sugerindo informar a pasta.
- `encodeURIComponent` aplicado apenas se `api.get` não já fizer encoding — verificar `src/lib/api.ts` na implementação.
