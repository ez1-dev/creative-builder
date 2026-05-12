# Plano: Aceitar regras vindas da E098REG na tela Regras LSP

Backend vai passar a retornar em `GET /api/senior/regras` registros sem `ID_REGRA` (são vínculos reais do ERP, origem `E098REG`). Hoje o mapper assume `id` truthy; precisa gerar um id sintético e exibir badge de origem.

## 1. `src/lib/senior/types.ts`

Adicionar campos opcionais em `RegraLSP`:

```ts
origem?: 'E098REG' | 'PORTAL' | string | null;
codemp?: number | null;
id_regra?: number | string | null;  // id real no portal (pode ser null)
```

Manter `status_regra: StatusRegra` mas estender o tipo para aceitar os valores que o backend devolve da E098REG: `'ATIVA' | 'INATIVA' | 'TESTE_X' | 'OUTRA'` além dos atuais. Como o badge precisa entender ambos, ampliar o union.

## 2. `src/lib/senior/mappers.ts` — `mapRegra`

- Gerar id sintético quando `ID_REGRA` for `null`:
  ```
  id = ID_REGRA ?? `${ORIGEM ?? 'E098REG'}-${CODEMP}-${MODSIS}-${IDEREG}-${CODREG_ERP}`
  ```
- Adicionar `origem`, `codemp`, `id_regra` no objeto retornado.
- Normalizar `status_regra` vindo do ERP (`'ATIVA'/'INATIVA'/'TESTE_X'`) — manter como veio; o badge passa a tratar.

## 3. `src/components/regras-senior/StatusRegraBadge.tsx`

Adicionar entradas no mapa de status para `ATIVA`, `INATIVA`, `TESTE_X`, `OUTRA` (cores via tokens semânticos: success/muted/warning/secondary). Sem cor hardcoded.

## 4. `src/components/regras-senior/RegrasList.tsx`

- Nova coluna **Origem**: badge "ERP Senior" para `origem === 'E098REG'`, "Portal" para `'PORTAL'`. Componente inline `OrigemBadge` usando `Badge` do shadcn com classes `bg-primary/10 text-primary` (E098REG) e `bg-accent/30 text-accent-foreground` (PORTAL) — tudo via tokens.
- Coluna **ID** passa a mostrar `id_regra ?? '—'` (porque o `id` agora pode ser sintético).
- Ações que dependem de `id_regra` real (editar, alterar status, exportar TXT, ver detalhes) ficam desabilitadas quando `r.origem === 'E098REG'` e `id_regra == null`, com tooltip "Disponível apenas para regras criadas no portal". O botão Ver detalhes pode continuar habilitado se quisermos só visualizar — mantemos desabilitado por enquanto, pois `GET /regras/:id` exige id real.

## 5. (Opcional, não bloqueante) `RegrasSeniorDashboard`

Se o resumo for impactado, deixar como está — escopo é a lista. Sem mudanças.

## Arquivos a alterar

- `src/lib/senior/types.ts` — campos novos + status union ampliado
- `src/lib/senior/mappers.ts` — id sintético, origem, codemp, id_regra
- `src/components/regras-senior/StatusRegraBadge.tsx` — novos valores
- `src/components/regras-senior/RegrasList.tsx` — coluna Origem, ID ajustado, ações condicionais

## Fora de escopo

- Não mexer no backend (já está sendo ajustado pelo usuário).
- Não alterar tela de Identificadores (já mostra os 211 corretamente).
- Não mudar layout/rotas/auth.
