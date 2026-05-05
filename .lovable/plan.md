## Adicionar aba "Documentação" em Configurações

Disponibilizar a documentação técnica completa do projeto (PDF gerado) diretamente dentro da página de Configurações, como uma nova aba.

### Mudanças

**1. `public/docs/sapiens-control-center.pdf`** (novo)
- Copiar o PDF gerado (`/mnt/documents/documentacao-sapiens-control-center.pdf`) para `public/docs/` para que fique servido estaticamente pelo app em `/docs/sapiens-control-center.pdf`.

**2. `src/pages/ConfiguracoesPage.tsx`** (editar)
- Importar ícone `BookOpen` (lucide-react).
- Adicionar `<TabsTrigger value="documentacao">` ao final do `TabsList` (após "Versão").
- Adicionar `<TabsContent value="documentacao">` com:
  - Card "Documentação Técnica do Projeto" descrevendo o conteúdo (visão geral, arquitetura, rotas, módulos, endpoints, banco de dados, edge functions, segurança, IA/tracking).
  - Botão "Baixar PDF" → link `/docs/sapiens-control-center.pdf` com `download` e `target="_blank"`.
  - Botão "Abrir em nova aba" → mesmo link sem `download`.
  - `<iframe src="/docs/sapiens-control-center.pdf">` com altura ~`70vh` para visualização inline.
  - Versão do documento + data de geração no rodapé do card.

### Fora de escopo
- Não modifica permissões: a aba ficará visível a quem já vê `/configuracoes`.
- Não regenera o PDF dinamicamente — é um arquivo estático; quando precisar atualizar, basta gerar e substituir.
- Sem mudanças no banco, edge functions ou outras telas.