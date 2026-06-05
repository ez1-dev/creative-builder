# Color picker por unidade em /bi/comercial

Adicionar um seletor de cor de fundo no header da página, que altera a cor da unidade atualmente selecionada (GENIUS / ESTRUTURAL ZORTEA / CONSOLIDADO). A escolha é salva no `localStorage` do navegador e sobrescreve o tema padrão definido em `comercialTheme.ts`.

## O que muda

1. **Botão "Cor da página"** no header da `/bi/comercial`, ao lado dos toggles existentes:
   - Ícone `Palette` + amostra circular da cor atual
   - Abre um `Popover` (shadcn) com:
     - Input nativo `<input type="color">` para escolher qualquer cor
     - 6–8 swatches sugeridos (laranja claro, azul claro, verde, roxo, cinza, branco, etc.)
     - Botão "Restaurar padrão" que volta ao tema original da unidade

2. **Override persistente por unidade**:
   - Chave única: `bi-comercial:bg-color:<UNIDADE>`
   - Apenas o `pageBackground` é sobrescrito; `primary`, `accent`, badges e cores dos gráficos continuam vindo de `comercialTheme.ts` (mantém a identidade visual da unidade)
   - Se nenhuma cor foi escolhida, usa o `pageBackground` padrão do tema

3. **Aplicação dinâmica**:
   - Função `getEffectiveTheme(unidade)` lê o override do localStorage e mescla com o tema base
   - Ao trocar a unidade no filtro, o fundo passa a refletir a cor salva daquela unidade
   - Se o usuário escolher uma cor enquanto está em GENIUS, só GENIUS muda; ESTRUTURAL e CONSOLIDADO continuam com suas cores

## Escopo (NÃO mexer)

- Sem alterações no tema global do sistema
- Sem alterações em outras páginas BI
- Sem backend (puro frontend + localStorage)
- Sem mexer em `primary`/`accent` — só fundo da página
- Filtros recolhíveis, IA generator, dashboard editor, drill: tudo intacto

## Arquivos

- `src/pages/bi/comercialTheme.ts` — adicionar helpers `getBgOverride(unidade)`, `setBgOverride(unidade, color)`, `clearBgOverride(unidade)`, `getEffectiveTheme(unidade)`
- `src/pages/bi/ComercialPage.tsx` — novo botão Popover no header; usar `getEffectiveTheme` no lugar de `unidadeThemes[unidade]` para o `pageBackground`
- (opcional) `src/pages/bi/BgColorPicker.tsx` — componente isolado do popover, se ficar maior que ~40 linhas
