## Modo Apresentação (1 clique)

Um botão no topo do app liga/desliga um "Modo Apresentação" que substitui automaticamente dados sensíveis por versões fictícias, sem precisar configurar campo a campo. As substituições são **determinísticas**: o mesmo cliente/placa/CNPJ vira sempre o mesmo nome fake, mantendo consistência entre telas, gráficos e relatórios.

### Como funciona para o usuário

- Botão **"Modo Apresentação"** no header (ao lado do sino / avatar), com um selo visível "APRESENTAÇÃO" enquanto ativo.
- 1 clique: liga com regras padrão fortes. Desligou: tudo volta ao normal.
- Configurações rápidas (popover no próprio botão):
  - Fator de valores (padrão ×0,73; opções ×0,5 / ×1 / ×1,25 / custom).
  - Estilo dos nomes ("Cliente Alfa 12", "Empresa Norte", ou nomes fantasia de uma lista).
  - Mostrar/ocultar documentos (CNPJ/CPF/placa).
  - Nome fantasia da empresa exibido (ex.: "Empresa Demo S/A") + logo alternativa.
- Aproveita o `DemoModeContext` já existente — o Modo Apresentação é uma **preset "global forte"** dele, ativável em 1 clique, sem eliminar a configuração granular atual.

### O que é mascarado

**BI e telas operacionais**
- Nomes: clientes, fornecedores, revendas, motoristas, colaboradores, placas, veículos, máquinas, centros de custo.
- Valores monetários: multiplicados pelo fator escolhido (consistente entre gráficos, KPIs e totais).
- Documentos: CNPJ/CPF/placa formatados como `••.•••.•••/••••-••` / `AAA-0A00`.
- Textos livres com padrões sensíveis (e-mails, telefones).

**Relatórios e exportações**
- PDFs, Excel e CSV gerados pelo app aplicam o mesmo mascaramento no momento da geração.
- Rodapé do PDF ganha marca d'água "APRESENTAÇÃO — DADOS FICTÍCIOS".

**Links públicos (Frota, Máquinas, Passagens)**
- Nova opção ao criar/editar o link: **"Publicar em Modo Apresentação"** (default ligado para links novos criados enquanto o modo está ativo).
- A flag fica salva no próprio link (colunas novas nas tabelas `*_share_links`) e é aplicada server-side pelas RPCs `get_*_via_token` antes de devolver os dados, para que nem o payload de rede exponha os originais.

**Identidade da empresa**
- Sidebar, header, título da aba, favicon e cabeçalho de relatórios trocam nome/logo pelo par "demo" configurado.
- Meta description e og:title também trocam enquanto o modo está ativo (apenas em runtime).

### Determinismo (mesmo dado → mesmo fake)

- Função `maskLabel(kind, original)` usa hash estável (FNV-1a) do texto original + salt do usuário → índice em uma lista de nomes por categoria (clientes, fornecedores, motoristas, etc.).
- Fator de valor é constante na sessão de apresentação (não aleatório por render), garantindo que soma de partes = total.
- Sem "criptografia reversível" real (não guardamos chave para reverter) — é pseudonimização estável. Se você desligar o modo, os dados originais voltam porque nunca foram sobrescritos no banco.

### Arquitetura técnica

**Frontend**
- `src/contexts/DemoModeContext.tsx`: adicionar `presentationMode: boolean`, `presentationSettings` (fator, estilo nomes, empresa fake, logo), e helpers determinísticos `maskEntity(kind, value)`.
- Novo componente `PresentationToggle` no `AppLayout` header (botão + popover de config rápida).
- Componentes `<DemoText/>`, `<DemoMoney/>`, `<DemoDoc/>` já existentes passam a usar as regras do preset quando `presentationMode` ativo.
- Sweep de instrumentação nas telas ainda não cobertas: dashboards BI (Comercial, Compras, Contas, RH, Faturamento Genius), listas de Frota/Máquinas/Passagens, tabelas de registros e headers de relatórios.
- Camada de exportação (PDF/Excel/CSV): wrapper `applyPresentationToRows(rows, schema)` chamado antes de gerar o arquivo; marca d'água no PDF via helper existente.
- Identidade: `useBrand()` devolve `{ name, logo }` respeitando o modo.

**Backend (Lovable Cloud)**
- Migração:
  - `user_demo_preferences`: adicionar `presentation_enabled bool`, `presentation_settings jsonb`.
  - `manutencao_frota_share_links`, `manutencao_maquinas_share_links`, `passagens_aereas_share_links`: adicionar `presentation_mode bool default false`, `presentation_settings jsonb`.
  - Atualizar RPCs `get_frota_via_token`, `get_maquinas_via_token`, `get_passagens_via_token` para, quando `presentation_mode = true`, devolver colunas já mascaradas (nomes via hash determinístico em SQL, valores × fator, documentos redigidos). GRANTs preservados.
  - Nova RPC `set_share_link_presentation(_token, _enabled, _settings)` protegida por `can_manage_*_share`.
- Nenhuma alteração destrutiva em dados reais.

### Fora de escopo

- Criptografia reversível com chave (foi descartado — pseudonimização determinística cobre o caso de investidores).
- Perfil de acesso "Investidor" separado (pode vir depois; hoje qualquer usuário liga/desliga pelo botão).
- Mascaramento de imagens/anexos enviados pelos usuários.
- Reescrita de módulos legados que renderizam HTML cru fora do design system (serão migrados sob demanda conforme aparecerem).

### Entregáveis

1. Migração Cloud com colunas novas + RPCs atualizadas.
2. `DemoModeContext` estendido + `PresentationToggle` no header + selo global.
3. Helpers determinísticos + varredura de instrumentação das telas BI e listas prioritárias.
4. Camada de exportação com mascaramento e marca d'água.
5. UI nos formulários de link público para marcar "Publicar em Modo Apresentação".
6. `useBrand()` + troca de nome/logo/favicon/título enquanto ativo.
