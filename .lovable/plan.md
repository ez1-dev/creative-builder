## Objetivo

Mover a configuração das **Regras de Desconexão Senior** (parâmetros das regras + whitelist) de `Configurações → Regras Senior` para **dentro da página Monitor de Usuários Senior**, onde o uso já acontece.

## Mudanças

### 1. `src/pages/MonitorUsuariosSeniorPage.tsx`
- Adicionar um botão **"Configurar regras"** (ícone `Settings`) no header, ao lado de "Aplicar regras agora", visível só para `canDisconnect` (admin/RENATO).
- Botão abre um novo `Dialog` (largo, com scroll) que renderiza o `<SeniorRulesSection />` existente.
- Ao fechar o diálogo, chamar `reload()` do hook `useSeniorDisconnectRules` para atualizar regras/whitelist usadas pelo `ApplyRulesDialog`.

### 2. `src/pages/ConfiguracoesPage.tsx`
- Remover a aba **"Regras Senior"**: a `<TabsTrigger value="senior-rules">` (linha 510) e o `<TabsContent value="senior-rules">` (linhas 1164–1167).
- Remover o import de `SeniorRulesSection` (linha 16) e do ícone `PowerOff` se não for usado em outro lugar do arquivo.

### 3. `src/components/erp/ApplyRulesDialog.tsx`
- Atualizar a mensagem "Crie regras em Configurações → Regras Senior" para algo coerente como "Use o botão **Configurar regras** acima para cadastrar."

### Sem mudanças
- `SeniorRulesSection.tsx` continua igual — só muda quem o renderiza.
- Banco, hooks, RLS: nada muda.

## Resultado

```text
Monitor de Usuários Senior
[Auto-atualizar] [Exportar CSV] [Atualizar] [⚙ Configurar regras] [⏻ Aplicar regras agora]
                                              └─ abre diálogo com SeniorRulesSection
                                                 (parâmetros + whitelist)
```

Configurações fica mais enxuto e tudo relacionado a sessões Senior vive numa tela só.
