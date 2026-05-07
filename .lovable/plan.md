## Objetivo

Antes de salvar um widget pelo modal **Aplicar componente**, o usuário verá uma seção de pré-visualização mostrando exatamente o que vai chegar à página alvo: filtros ativos no momento, campos mapeados e um preview visual do componente renderizado com dados reais (ou amostra quando não houver).

## Mudanças

### 1. `src/components/bi/runtime/ApplyComponentDialog.tsx`
Adicionar bloco **"Pré-visualização"** abaixo do mapeamento, contendo:

- **Resumo de dados de origem** (compacto, em pills):
  - Página alvo + rota
  - Seção alvo + tipos aceitos
  - Para cada campo mapeado: `label do input → label do campo da página` com badge do tipo (kpi/série/linhas) e prévia do valor/contagem (ex.: `Total Compras → R$ 1.2M`, `Compras por Mês → 12 pontos`, `Linhas → 487 registros`).
  - Filtros ativos: lista de chips lidos via `usePageData()` quando o dialog está aberto sobre uma página piloto; quando aberto a partir de `/biblioteca-bi` (sem contexto), mostrar mensagem "Os filtros ativos da página alvo serão aplicados automaticamente."

- **Preview visual** do componente:
  - Renderizar `def.render({...})` dentro de um container `border rounded p-2 bg-muted/10` com altura limitada (`max-h-56 overflow-hidden`).
  - Construir `ctx` para o render:
    1. Se houver `usePageData()` ativo e `pageKey` selecionado bate com o contexto → usar `kpis/series/rows` reais.
    2. Caso contrário → buscar amostra via novo helper `fetchPagePreviewData(pageKey)` (ver item 3) com cache simples por sessão.
    3. Fallback final → dados sintéticos derivados do `schema` (KPIs com valores aleatórios estáveis por seed do key, séries com 6 pontos mock, 5 linhas mock).
  - Indicador no rodapé do preview: `Fonte: dados reais | amostra | mock` para o usuário saber.

- Tudo dentro de `<details open>` para o usuário poder colapsar.

### 2. `src/lib/bi/previewData.ts` (novo)
Helper único responsável por compor os dados de preview:

```ts
export function buildPreviewCtx(
  page: BiPageDef,
  liveCtx: PageDataValue | null,
): { kpis; series; rows; source: 'live' | 'mock' }
```

- Se `liveCtx?.pageKey === page.key` e tem dados → retorna `{...liveCtx, source: 'live'}`.
- Senão → gera mocks determinísticos a partir do `page.schema` (números fixos por hash do key para o preview ser estável).

Sem chamada de rede no MVP — fica aberto para depois plugar fetch real por página.

### 3. `src/components/bi/runtime/ApplyComponentDialog.tsx` — layout
Reorganizar o `DialogContent` para `max-w-2xl` e duas colunas em md+:

```text
+------------------------------+----------------------------+
| Página / Seção               | Pré-visualização           |
| Mapeamento                   |  - Resumo (chips)          |
| Título / Largura             |  - Render do componente    |
+------------------------------+----------------------------+
```

Em telas pequenas, empilha (preview embaixo).

### 4. Atualização cosmética
- `ApplyComponentDialog` passa a usar `usePageData()` (import de `@/lib/bi/PageDataContext`) — quando o dialog é aberto a partir de uma página piloto via `<ApplyComponentButton/>` embutido, captura filtros automaticamente. Em `/biblioteca-bi` o context será null e cai no mock.

## Arquivos

- editar `src/components/bi/runtime/ApplyComponentDialog.tsx`
- criar `src/lib/bi/previewData.ts`

Sem alterações de schema, RLS, registry de páginas/componentes ou páginas piloto.

## Resultado esperado

No modal, abaixo do mapeamento, aparece "Pré-visualização" mostrando: chips com página/seção/campos mapeados/filtros, e um render real do componente com os dados que ele receberá. O usuário decide salvar com confiança porque vê antes o que vai aparecer.
