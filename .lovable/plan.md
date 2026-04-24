
## Objetivo

Adicionar uma linha **TOTAL** (Esperado vs API) ao final da tabela do painel **Validação Genius (QA)** em `/faturamento-genius`, com os agregados do período corrigidos:

- **Fat., Dev., Impostos, Fat. Líq., Qtd, Nº Vendas** = soma simples dos meses
- **% Rep (Total)** = `100,00%` (fixo, é o todo)
- **% Dev. (Total)** = `sum(dev) / sum(fat) * 100` (ponderado, não média de %)
- **Preço Médio (Total)** = `sum(fat) / sum(qtd)` (ponderado)
- **Ticket Médio (Total)** = `sum(fat) / sum(n_vendas)` (ponderado, com NFs distintas no período inteiro)
- **Nº Vendas (Total)** = `COUNT DISTINCT` de NFs em todo o período (não soma dos meses, evita duplicidade entre meses, embora na prática seja igual)
- **Nº Clientes (Total)** = `COUNT DISTINCT` de clientes em **todo o período** (não a soma dos `n_clientes` mensais — um cliente que compra em 3 meses conta 1 vez)

## Valores esperados (referência do relatório oficial)

| Campo | Valor |
|---|---|
| Fat. | 794.052 |
| % Rep | 100,00% |
| Dev. | 8.879 |
| % Dev. | 1,12% |
| Impostos | -120.598 |
| Fat. Líq. | 653.862 |
| Qtd | 11.430 |
| Preço Médio | ~69 (794.052 / 11.430 = 69,47) |
| Nº Vendas | 98 |
| Nº Clientes | 34 (distintos no período) |
| Ticket Médio | ~8.103 (794.052 / 98) |

## Alterações em código

Arquivo único: `src/pages/FaturamentoGeniusPage.tsx` — componente `ValidacaoGeniusPanel`.

### 1. Adicionar entrada TOTAL em `GENIUS_TARGETS`

Acrescentar uma chave especial `'TOTAL'` ao objeto `GENIUS_TARGETS` (linhas ~1059-1062) com os valores oficiais agregados acima.

### 2. Calcular o TOTAL agregado a partir de `linhasGenius`

Dentro do `useMemo` que produz `linhasComparacao` (linhas ~1082-1127), após montar `porMes`, computar um objeto `totalComputed` rodando uma única passada sobre `linhasGenius` (não sobre `porMes`) para garantir contagens distintas corretas:

```ts
const nfsPeriodo = new Set<string>();
const clientesPeriodo = new Set<string>();
let fatTot = 0, devTot = 0, impTot = 0, qtdTot = 0;

linhasGenius.forEach((r) => {
  fatTot  += Number(r.valor_total)     || 0;
  devTot  += Number(r.valor_devolucao) || 0;
  impTot  += -((Number(r.valor_icms)||0)+(Number(r.valor_ipi)||0)+(Number(r.valor_pis)||0)+(Number(r.valor_cofins)||0));
  qtdTot  += Number(r.quantidade)      || 0;
  nfsPeriodo.add(`${r.empresa}-${r.filial}-${r.numero_nf}-${r.serie_nf}`);
  clientesPeriodo.add(String(r.cliente || ''));
});

const totalComputed = {
  fat: fatTot,
  pct_rep: 100,                                   // sempre 100% para o total
  dev: devTot,
  pct_dev: fatTot > 0 ? (devTot / fatTot) * 100 : 0,
  impostos: impTot,
  fat_liq: fatTot - devTot - Math.abs(impTot),
  qtd: qtdTot,
  preco_medio: qtdTot > 0 ? fatTot / qtdTot : 0,  // ponderado, não média
  n_vendas: nfsPeriodo.size,                      // distintas no período
  n_clientes: clientesPeriodo.size,               // distintas no período
  ticket_medio: nfsPeriodo.size > 0 ? fatTot / nfsPeriodo.size : 0,
};
```

Retornar do `useMemo` `{ porAnomes: [...], total: { target: GENIUS_TARGETS.TOTAL, computed: totalComputed } }`.

### 3. Renderizar a linha TOTAL no `<tbody>`

Após o `.map` das linhas mensais (linhas ~1213-1231), acrescentar duas linhas com cabeçalho destacado (`bg-amber-100/40 font-semibold border-t-2`):

```tsx
<tr className="border-t-2 border-amber-400 bg-amber-100/30">
  <td rowSpan={2} className="p-2 font-bold align-top">TOTAL<div className="text-[10px] text-muted-foreground">Jan–Abr/2026</div></td>
  <td className="p-2 text-muted-foreground font-semibold">Esperado</td>
  {campos.map((c) => (
    <td key={c.key} className="p-2 text-right tabular-nums font-semibold">{fmtCmp(total.target[c.key], c.dec)}{c.suf || ''}</td>
  ))}
</tr>
<tr className="bg-amber-100/20">
  <td className="p-2 text-muted-foreground font-semibold">API</td>
  {campos.map((c) => (
    <td key={c.key} className={`p-2 text-right tabular-nums font-semibold ${statusCor(total.target[c.key], total.computed[c.key])}`}>
      {fmtCmp(total.computed[c.key], c.dec)}{c.suf || ''}
    </td>
  ))}
</tr>
```

### 4. Nota de rodapé

Acrescentar uma linha em `text-[10px] text-muted-foreground`:

> "Total: Nº Clientes e Nº Vendas usam contagem distinta no período (um cliente/NF aparece 1 vez, mesmo se em vários meses). Preço Médio e Ticket Médio são ponderados por Fat./Qtd e Fat./Nº Vendas."

## Resultado

A tabela QA passa a ter, ao final, uma linha TOTAL bem destacada com Esperado vs API. As fórmulas eliminam os bugs:

- `Preço Médio` deixa de espelhar o último mês → vira `~69,47`
- `Nº Clientes` deixa de ser soma (66) ou último mês → vira `34` (distintos no período)
- `% Rep` deixa de ficar vazio → vira `100,00%`
- `Ticket Médio` passa a usar agregação correta (`~8.103`)

Sem mudanças em backend ou em outras tabelas da página.
