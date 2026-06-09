# Lista dinâmica de Mês e Ano nos filtros BI Comercial

## Objetivo
Substituir os inputs livres "AnoMês Início" e "AnoMês Fim" (formato `202601`) por dois `Select`s lado a lado em cada campo: **Mês** (Jan–Dez) e **Ano** (2022 até ano atual + 1). O valor enviado ao backend continua sendo `AAAAMM`, sem mudanças de contrato.

## Componente compartilhado

Criar `src/components/bi/comercial/AnomesSelect.tsx`:

- Props: `label`, `value` (`string` AAAAMM), `onChange(next: string)`, `id?`.
- Calcula `anoAtual = new Date().getFullYear()`; lista de anos = `[2022 ... anoAtual + 1]` em ordem decrescente.
- Lista de meses fixa: `['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']` → valor `01..12`.
- Faz parse defensivo do `value` (`YYYY` + `MM`); se inválido, default `anoAtual` + `01`.
- Render: `<Label>` + grid `grid-cols-2 gap-1`, dois `<Select>` shadcn `h-8 text-xs`.
- Ao mudar mês ou ano, emite `onChange(`${ano}${mes}`)`.

## Locais a atualizar

### 1. `src/pages/bi/ComercialPage.tsx`
- Importar `AnomesSelect`.
- **Bloco principal (linhas ~1219–1228):** substituir os dois `<Input>` por `<AnomesSelect label="AnoMês Início" value={draft.anomes_ini} onChange={(v)=>setDraft({...draft, anomes_ini:v})} />` e equivalente para `anomes_fim`.
- **Subcomponente de filtros menor (linhas ~90–140, próximo do botão `Aplicar` em 135):** aplicar a mesma substituição.

### 2. `src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx`
- Localizar os inputs de `anomes_ini`/`anomes_fim` e substituí-los pelo `AnomesSelect`. Mantém o mesmo `draft`/`apply` existente.

### 3. `src/pages/bi/MetasFaturamentoPage.tsx`
- Mesma substituição nos inputs de filtro de período.

## Fora do escopo
- Não alterar contrato/queries (`fetchComercial*`, edge functions): seguem recebendo `AAAAMM`.
- Não criar endpoint dinâmico de anos disponíveis (range fixo 2022→ano+1 conforme decidido).
- Sem mudança em drill drawer, IA, layouts ou demais telas.

## Critério de aceite
- Em `/bi/comercial`, `/bi/comercial/relatorio-executivo` e `/bi/comercial/metas`, os campos AnoMês Início e Fim aparecem como dois selects (Mês + Ano).
- Selecionar Mar/2026 grava `202603` no estado e envia ao backend.
- Valor inicial reflete o `filters` atual; após "Aplicar", dashboards atualizam normalmente.
- Anos listados: 2022 até `ano atual + 1`, ordem decrescente.
