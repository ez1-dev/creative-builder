## Renomear produto para "HUB de Gestão"

Trocar todas as ocorrências visíveis de marca ("Sapiens Control Center" / "EZ ERP IA" / "Sapiens") por **HUB de Gestão** nos pontos que o usuário enxerga.

### Alterações

1. **`index.html`**
   - `<title>` → `HUB de Gestão`
   - `<meta name="description">` → descrição curta do HUB
   - `og:title` / `twitter:title` → `HUB de Gestão`
   - `og:description` / `twitter:description` alinhadas

2. **`public/manifest.json`** (PWA)
   - `name`: `HUB de Gestão`
   - `short_name`: `HUB Gestão`
   - `description`: atualizada

3. **`src/components/AppLayout.tsx`**
   - `useBrand('EZ ERP IA')` → `useBrand('HUB de Gestão')` (usado no rodapé)

4. **Varredura de strings visíveis**
   - Buscar `Sapiens Control Center`, `Sapiens`, `EZ ERP IA`, `ez-erp-ia`, `Sapiens ERP` em `src/` e substituir apenas em textos exibidos ao usuário (títulos de páginas, telas de login, loading, PWA prompts, e-mails/toasts se houver).
   - **Não** alterar: identificadores internos como `sapiens-erp-mcp` (nome técnico do servidor MCP), nomes de tabelas, chaves de banco, URLs de deploy (`ez-erp-ia.lovable.app`), variáveis de ambiente.

5. **Ícones/logos**: manter os atuais (usuário não pediu troca de identidade visual).

### Fora do escopo
- Mudança de URL de publicação, logo, paleta de cores ou reestruturação de navegação.
- Renomear o servidor MCP interno ou tabelas do banco.
