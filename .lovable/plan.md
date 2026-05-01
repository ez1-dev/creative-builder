## Objetivo

Hoje o "Aplicar regras agora" usa **todas as regras ligadas** em Configurações. Quero deixar o usuário **escolher na hora** quais regras serão aplicadas, sem precisar entrar em Configurações para ligar/desligar.

## Mudanças

### `src/components/erp/ApplyRulesDialog.tsx`

1. Novo estado local `selectedKeys: Set<string>` — começa com todas as regras `enabled` marcadas ao abrir o diálogo.
2. Adicionar uma **seção de seleção** logo abaixo do header, antes da tabela de candidatos:
   - Lista cada regra (`rules`) com `Checkbox` + nome + descrição curta + parâmetros principais (ex.: "após 22h", ">12h", "ocioso 30min").
   - Regras com `enabled = false` aparecem mas iniciam desmarcadas (ainda dá pra marcar pra usar uma vez).
   - Botões rápidos "Marcar todas" / "Desmarcar todas".
3. Recalcular `candidatos` usando uma lista derivada `rulesParaUsar = rules.filter(r => selectedKeys.has(r.rule_key))` ao invés de `rules`. O `avaliarSessoes` já filtra por `enabled`, então passamos as regras escolhidas com `enabled: true` forçado:
   ```ts
   const rulesParaUsar = rules
     .filter((r) => selectedKeys.has(r.rule_key))
     .map((r) => ({ ...r, enabled: true }));
   ```
4. Ajustar mensagens:
   - Se nenhuma regra marcada → aviso "Selecione pelo menos uma regra".
   - Botão "Confirmar" desabilitado quando `selectedKeys.size === 0` ou `candidatos.length === 0`.
5. Remover o bloco "Nenhuma regra está ligada" (não é mais bloqueante — usuário pode marcar uma desligada para uso pontual).
6. O motivo gravado no log já inclui `c.motivo` (vindo da regra que disparou), nada muda aí.

### Sem mudanças

- `src/lib/seniorRules.ts` — lógica permanece igual.
- `senior_disconnect_rules` (banco) — toggles em Configurações continuam funcionando como **default** ao abrir o diálogo.
- `MonitorUsuariosSeniorPage.tsx` — só passa `rules` como já passa.

## UX final

```text
┌ Aplicar regras de desconexão agora ─────────────────┐
│ Selecione as regras a aplicar:                      │
│  [x] Fora do horário comercial  (sáb/dom, após 22h) │
│  [x] Sessão ociosa sem módulo  (>30 min)            │
│  [ ] Sessão muito longa  (>12h)                     │
│  [Marcar todas] [Desmarcar todas]                   │
│                                                     │
│ 4 sessão(ões) candidata(s)  [fora_horario: 3] ...   │
│ <tabela de candidatos>                              │
│ Motivo do lote: [________]                          │
│                                                     │
│ [Cancelar]  [Confirmar desconexão em lote]          │
└─────────────────────────────────────────────────────┘
```

A lista de candidatos atualiza em tempo real conforme o usuário marca/desmarca regras.
