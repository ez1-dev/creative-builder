

# Adicionar rodapé com versão e direitos reservados

## O que será feito
Adicionar um **footer fixo** no layout principal com a versão do app e texto de direitos reservados, visível em todas as páginas.

## Alterações

### 1. `package.json` — Atualizar versão
- Alterar `"version": "0.0.0"` para `"1.0.0"` (ou versão desejada)

### 2. `src/components/AppLayout.tsx` — Adicionar footer
- Inserir um `<footer>` abaixo do `<main>`, dentro do flex column
- Conteúdo: `EZ ERP IA v1.0.0 — © 2025 Todos os direitos reservados.`
- Estilo: barra discreta com `text-xs text-muted-foreground`, borda superior, altura compacta
- A versão será importada dinamicamente do `package.json` para facilitar atualização futura

### Resultado visual
```text
┌─────────────────────────────────────────┐
│ Header (Olá, usuário / Sair)            │
├─────────────────────────────────────────┤
│                                         │
│            Conteúdo da página            │
│                                         │
├─────────────────────────────────────────┤
│ EZ ERP IA v1.0.0 · © 2025 Todos os     │
│ direitos reservados.                    │
└─────────────────────────────────────────┘
```

