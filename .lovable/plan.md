## Diagnóstico

O banner "API contábil offline" está correto: os endpoints do DRE Studio **não existem no backend**.

Verificação feita agora contra `https://api-erp-renato.ngrok.app`:

- `GET /api/contabil/health` → **HTTP 404** (`{"detail":"Not Found"}`)
- `/openapi.json` responde 200 e lista 24 rotas de contabilidade, todas sob **outros prefixos**:
  - `/api/contabilidade/*` (balanço, conciliação)
  - `/api/bi/contabilidade/*` (DRE matriz, DRE drill, DRE dinâmica, plano de contas, exceções, classificação, depara)
  - `/api/export/contabilidade/*`
- **Nenhuma rota começa com `/api/contabil/`**. Portanto todo o cliente `dreStudioApi.ts` aponta para caminhos inexistentes: `/api/contabil/health`, `/modelos`, `/estrutura-padrao`, `/plano-contas`, `/centros-custo`, `/orcamento`, `/modelos/{id}/resultado-cache` etc.

Não é problema de URL, ngrok, VPN ou SQL Server — a API principal simplesmente não expõe esses caminhos ainda.

## O que decidir

O DRE Studio foi portado assumindo a especificação `/api/contabil/*` que iria ser integrada à API principal. Essa integração ainda não foi publicada no FastAPI em produção. Preciso saber qual caminho seguir antes de mexer no código:

### Opção A — Documentar pendência e deixar o módulo em "aguardando backend"
- Manter as telas do DRE Studio como estão.
- Substituir o banner por um estado explícito ("Módulo aguardando publicação dos endpoints `/api/contabil/*` no backend") em vez de "API offline", que sugere problema de infraestrutura.
- Criar `docs/backend-dre-studio-endpoints.md` listando cada endpoint esperado (método, payload, resposta) para o time de backend implementar.
- Nenhuma tela quebra o resto do portal; DRE Configurável antigo (`/bi/contabilidade/*`) continua funcional.

### Opção B — Reapontar o DRE Studio para os endpoints que já existem
- Descartar a spec `/api/contabil/*` e reescrever `dreStudioApi.ts` sobre `/api/bi/contabilidade/*` (DRE dinâmica + plano-contas + dre-matriz).
- Limitações: os endpoints atuais **não têm** CRUD de "modelos" com UUID, nem orçamento, nem `resultado-cache`. Só suportam visualização de DRE dinâmica e vínculo de contas. Isso significa cortar do DRE Studio: criação/edição de modelos, orçamento, resultado comparativo, drill, exportação. Sobra basicamente uma tela de vínculo de contas — funcionalidade que já existe no módulo antigo.
- Não recomendo, porque efetivamente desmonta o DRE Studio.

### Opção C — Ocultar temporariamente o menu do DRE Studio
- Manter arquivos e rotas, mas remover os itens do sidebar até o backend publicar `/api/contabil/*`.
- Combinável com A (documentar pendência + esconder menu).

## Minha recomendação

**Opção A + C**: manter o módulo pronto, esconder do menu (ou marcar como "em breve"), trocar o texto do banner para deixar claro que é pendência de backend e gerar o documento de contrato para o time da API. Assim que os endpoints subirem, basta religar o menu — nenhum retrabalho de front.

Me diga qual opção seguir (ou combine A/C/B) que já implemento.
