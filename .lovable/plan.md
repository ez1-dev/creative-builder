## Problema
Na aba "Rótulos" do editor visual, os campos abaixo dos toggles "Mostrar nome / Mostrar percentual" ficam visualmente desorganizados: o `grid grid-cols-2` mistura selects, números, fonte e Prefixo/Sufixo em alturas e larguras irregulares; o bloco condicional dos rótulos enriquecidos cola sem respiro nos campos seguintes.

## Mudanças (apenas UI — `src/components/bi/visual/VisualConfigEditor.tsx`, aba `rotulos`)

1. **Agrupar em seções claras** dentro da aba, cada uma com card sutil (`rounded-md border bg-muted/20 p-3 space-y-3`):
   - **Conteúdo do rótulo** — toggle "Exibir valores", toggle "Rótulos enriquecidos" + texto explicativo, e (quando rich) os switches "Mostrar nome / Mostrar percentual" lado a lado.
   - **Aparência** — Posição, Fonte (px), Família da fonte.
   - **Formato** — Formato, Casas decimais, Prefixo, Sufixo (Prefixo/Sufixo só quando NÃO for rich).

2. **Grid consistente** — usar `grid grid-cols-2 gap-x-3 gap-y-3` em cada seção e marcar campos largos (Família da fonte) com `col-span-2` para não quebrar o alinhamento. Labels uniformes `text-xs font-medium text-muted-foreground`.

3. **Desabilitar (não esconder) campos** quando `dataLabels.visible = false`, para evitar o layout "pulando". Usar `opacity-60 pointer-events-none` no wrapper das seções Aparência/Formato.

4. **Toggle Rich** — manter o card destacado, mas reduzir borda/padding (`p-2.5`) e alinhar os dois switches internos em `grid grid-cols-2 gap-2` com largura igual.

5. **Nada muda** em comportamento/estado (`cfg.dataLabels.*`), tipos, outras abas, ou nos componentes de gráfico. Apenas reorganização visual.

## Arquivo
- `src/components/bi/visual/VisualConfigEditor.tsx` (somente o bloco da aba `rotulos`, linhas ~165–245)

## Resultado esperado
- Aba "Rótulos" com 3 blocos visualmente separados, alinhamento consistente, sem campos "soltos" entre toggles e selects.
- Sem mudança funcional: as mesmas opções continuam disponíveis e produzindo o mesmo efeito nos gráficos.
