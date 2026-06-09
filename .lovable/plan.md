
# Plano — Componente isolado "FaturamentoRealizadoMetaCard"

Criar um componente reutilizável e standalone que mostra **apenas** Faturamento (Realizado / Meta / Diferença), exatamente como na imagem. Não fica acoplado ao BI Comercial — pode ser usado em qualquer página passando os 3 números.

## Arquivo novo

`src/components/bi/kpis/FaturamentoRealizadoMetaCard.tsx`

```ts
export interface FaturamentoRealizadoMetaCardProps {
  realizado: number | null | undefined;
  meta: number | null | undefined;
  diferenca?: number | null;          // se omitido, calcula realizado - meta
  title?: string;                     // default "Faturamento"
  format?: 'currency' | 'number' | 'currency-no-symbol'; // default "currency"
  className?: string;
  loading?: boolean;
  /** Quando true, colore Diferença em verde (>=0) ou vermelho (<0) usando tokens. */
  colorirDiferenca?: boolean;         // default true
}
```

- Internamente reusa `KpiTriStackCard` (já existe e renderiza exatamente o layout da imagem) para não duplicar UI.
- Calcula `diferenca = realizado - meta` quando não vier por prop.
- `colorirDiferenca`: aplica `hsl(var(--success))` (verde) ou `hsl(var(--destructive))` (vermelho) no item Diferença — **tokens semânticos**, nada de cor hardcoded.
- `loading=true` renderiza um Skeleton de mesma altura para não dar layout shift.
- Sem fetch, sem dependência de filtros do BI Comercial — totalmente isolado.

## Exportação

- Adicionar `export * from './kpis/FaturamentoRealizadoMetaCard';` em `src/components/bi/index.ts`, para uso via `import { FaturamentoRealizadoMetaCard } from '@/components/bi'`.

## Demo no catálogo

- Em `src/pages/BiComponentsDemoPage.tsx`, na seção KPIs, adicionar um `DemoBlock` com:
  ```tsx
  <FaturamentoRealizadoMetaCard
    realizado={54_176_118}
    meta={76_059_798}
  />
  ```

## O que NÃO muda

- `KpiTriStackCard` permanece intacto.
- Widget `resumo-faturamento` do BI Comercial inalterado.
- Sem backend, sem rota nova.

## Arquivos

```text
src/components/bi/kpis/FaturamentoRealizadoMetaCard.tsx  (novo)
src/components/bi/index.ts                               (editar — re-export)
src/pages/BiComponentsDemoPage.tsx                       (editar — DemoBlock)
```

## Validação

- Demo `/bi-components` mostra o card idêntico à referência: título "Faturamento", linhas Realizado / Meta / Diferença com valores grandes centralizados.
- Trocar para valores negativos pinta Diferença em vermelho semântico; positivos em verde.
- Componente funciona em qualquer página recebendo apenas os 3 números.
