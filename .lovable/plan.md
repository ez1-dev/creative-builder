## Cross-filter no gráfico "Por Produto" em `/passagens-aereas`

Hoje o gráfico "Por Produto" só reage aos demais filtros; clicar nas barras não faz nada. Adicionar cross-filter por produto no mesmo padrão de CC/Destino/UF.

### Alterações em `src/components/passagens/PassagensDashboard.tsx`

1. Novo estado: `const [selectedProduto, setSelectedProduto] = useState<string[]>([]);` junto aos demais `selected*`.
2. Estender `applyCross` com opção `produto?: boolean`; quando ativa e `selectedProduto.length > 0`, filtrar linhas por `((r.produto ?? '').trim() || 'Sem produto')`.
3. Ativar `produto: true` em todos os `applyCross` dos demais gráficos/KPIs (mes, motivo, cc, destino, uf, tipo_despesa e `crossFiltered` para tabela/export), **exceto** no próprio `porProduto` (que continua ignorando seu próprio eixo). Adicionar `selectedProduto` aos arrays de dependências dos `useMemo` correspondentes.
4. Incluir `selectedProduto` em `hasCrossFilter` e no `limparTudo` (reset para `[]`).
5. Renderizar chips ativos de produto na barra de filtros ativos (padrão dos outros: "Produto: X" com botão X para remover).
6. No card `chart-por-produto`:
   - Título ganha "(clique para adicionar/remover)" quando `selectedProduto.length > 0`.
   - `<Bar>` recebe `cursor="pointer"` e `onClick={(d) => setSelectedProduto((prev) => toggleItem(prev, d.name))}`.
   - Cada `<Cell>` ganha `fillOpacity={selectedProduto.length > 0 && !selectedProduto.includes(entry.name) ? dimOpacity : 1}`.

### Fora de escopo
- Nenhuma outra tela, API ou lógica.
- Não mexer em cores, layout, filtros de topo.

### Validação
- Clicar em uma barra em "Por Produto": barra fica destacada, chip aparece, demais gráficos/KPIs/tabela recalculam. Clicar de novo remove. Múltipla seleção funciona (OR). "Limpar tudo" zera.
