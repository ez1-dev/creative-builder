## Diagnóstico

Consultei a tabela `menu_layout_global` no Cloud e ela está **vazia** (0 linhas). Ou seja, nenhuma edição feita na aba "Padrão global (admin)" chegou a ser gravada. Sem gravação, os outros usuários não têm o que carregar — por isso nada reflete para eles.

Duas causas prováveis (não dá para saber qual sem instrumentar):

1. **As edições foram feitas na aba errada.** A tela abre por padrão em "Meu usuário". Se o admin não clicou explicitamente em "Padrão global (admin)" antes de renomear/mover/ocultar, tudo caiu em `menu_layout_user` (só para ele mesmo).
2. **O upsert está sendo bloqueado por RLS** (`is_admin(auth.uid())` retornando `false`) e o erro está sendo engolido em algum caminho — hoje o `mutate` da página mostra toast em caso de erro, mas ações auxiliares (ex.: reset, ou salvamento em cascata) podem não estar cobertas.

## O que fazer

### 1. Deixar o escopo ativo impossível de confundir
- Badge grande e colorido no topo da tela dizendo **"Editando: Meu usuário"** (azul) ou **"Editando: Padrão global — afeta todos"** (âmbar, com ícone de alerta).
- Ao trocar de aba, mostrar toast informativo ("Agora você está editando o padrão global").
- Em cada card de menu top, uma tag pequena repetindo o escopo, para que fique visível durante toda a rolagem.

### 2. Confirmar gravação de fato
- Depois de cada mutação em escopo global, mostrar toast discreto **"Padrão global salvo"** (hoje salva sem feedback).
- Se o upsert falhar (RLS ou rede), toast de erro vermelho com a mensagem real do backend.

### 3. Facilitar propagação
- Botão **"Publicar para todos agora"** no topo do escopo global — apenas força um upsert do estado atual + dispara um evento realtime, garantindo que quem estiver online receba na hora (o mecanismo de realtime + refetch em focus já existe).
- Texto de ajuda: "Usuários online recebem em segundos; quem estiver offline recebe ao abrir o app."

### 4. Ver quem realmente aplicou
- Mostrar no topo do escopo global: **"Última publicação: <data/hora> por <usuário>"** (usa `updated_at` / `updated_by` que já existem na tabela).
- Se estiver vazio, deixar explícito: **"Nenhum padrão global publicado ainda."** — isso já teria evitado a confusão atual.

### 5. Confirmar que é o problema
Antes de mudar UI, quero validar a hipótese: pedir para o admin abrir a tela, ir na aba **Padrão global (admin)**, renomear qualquer item, e me avisar se apareceu erro. Enquanto isso, eu implemento os itens 1–4 acima que valem para os dois cenários.

## Detalhes técnicos

- `src/hooks/useMenuLayout.tsx`: adicionar toast de sucesso/erro no `setLayout` quando `scope === 'global'`; expor `globalMeta` (`{ updatedAt, updatedBy }`).
- `src/pages/PersonalizarMenusPage.tsx`: badge de escopo persistente no topo, toast ao trocar de aba, banner com "Última publicação" + botão "Publicar para todos agora" (re-upsert do `globalLayout` atual).
- Sem mudanças de schema — a tabela `menu_layout_global` e as policies já estão corretas.
