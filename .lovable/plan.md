# Drills novos — Salário Base (nominal) e INSS Patronal

Backend já publicou o contrato. Cards `salario_base` e `inss_patronal` retornam campos extras no `agrupar_por=colaborador` e devem ganhar colunas dedicadas no drawer. Nos agrupamentos `filial` e `mes` o item vem enxuto (chave/label/valor/qtd) e cai no render "raso" atual.

## O que muda

### 1. `src/lib/rh/types.ts` — `ResumoFolhaDrillItem`
Adicionar campos opcionais (todos `?`), documentados como "apenas quando `card ∈ {salario_base, inss_patronal}` e `agrupar_por=colaborador`":
- `tipo_salario?: string` (`"Mensalista" | "Horista"`)
- `salario_cadastral?: number` (mensalista = salário mensal; horista = taxa/hora)
- `horas_mes?: number`
- `base_inss?: number`
- `aliquota?: string` (ex.: `"20%"`)

### 2. `src/components/rh/ResumoFolhaDrillDrawer.tsx`
Detectar um novo modo de render por card + agrupamento (não mexer nos modos existentes `raso/cruz/analitico`):

```
richMode = "salario_base_colab"  se card === "salario_base"  && tab === "colaborador"
richMode = "inss_patronal_colab" se card === "inss_patronal" && tab === "colaborador"
```

Colunas:

- **Salário Base · colaborador**  
  `Colaborador (matricula) · Tipo · Salário cadastral · Horas/mês · Nominal (valor)`  
  Formatar `salario_cadastral`: se `tipo_salario==="Horista"` mostrar `R$ x,xx /h`; senão moeda normal. `horas_mes` com 1 casa.

- **INSS Patronal · colaborador**  
  `Colaborador (matricula) · Base INSS · Alíquota · Patronal (valor)`  
  `aliquota` renderizada como texto (já vem `"20%"`).

Comportamento comum:
- Reusar o header "confere/diverge" já existente (compara soma de `valor` com `total`).
- Manter aviso de truncamento (`limite=5000`) e o botão "Tentar novamente" em erro/timeout.
- Nos agrupamentos `filial` e `mes` desses cards, não alterar nada — o render raso atual já cobre `{chave,label,valor,qtd}`.

### 3. `drills_menu` — travar agrupamentos inválidos
O backend não expõe `agrupar_por=evento` para esses cards (retorna 422). O drawer já é dirigido pelo `drills_menu` do dashboard, então não precisa lista hardcoded — apenas garantir que **não** oferecemos fallback para `evento` quando o menu não trouxer. Adicionar guarda: se o backend responder 422, mostrar mensagem "Agrupamento não suportado para este card" em vez do erro genérico de rede.

## Fora de escopo
- Cards que já funcionam (Proventos, Descontos, Líquido, Benefícios, INSS empregado etc.) permanecem inalterados.
- Nenhuma mudança em `api.ts` além de tipagem (payload já é passado adiante como `any`).
- Sem mudanças no backend.

## Verificação
- Type-check.
- Abrir card **Salário Base** → agrupamento **colaborador** → conferir colunas Tipo/Cadastral/Horas/Nominal e total batendo com o KPI.
- Abrir card **INSS Patronal** → agrupamento **colaborador** → conferir Base × 20% = Patronal e total batendo.
- Trocar para `filial`/`mes` nos dois cards → render raso, total confere.
