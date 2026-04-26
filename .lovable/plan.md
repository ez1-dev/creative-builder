## Causa da página em branco

Os logs do Vite mostram o erro:

```
[vite:css] @import must precede all other statements (besides @charset or empty @layer)
src/index.css:5
```

O `@import` do Google Fonts está depois das diretivas `@tailwind`, o que viola a especificação CSS e quebra o build do estilo — resultando na tela branca.

## Correção (1 linha de mudança)

Mover o `@import` do Google Fonts para **antes** das diretivas `@tailwind` em `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Arquivos alterados

- `src/index.css` — reordenar as 5 primeiras linhas.

Nada mais precisa mudar. Após a correção o HMR do Vite recompila o CSS e a página volta a renderizar.
