

# Transformar o app em PWA (Progressive Web App)

## O que é um PWA?

Um PWA permite que seu aplicativo seja **instalado direto do navegador** no celular ou computador, como se fosse um app nativo. Funciona em iPhone e Android, sem precisar publicar na App Store ou Google Play.

## Duas opções disponíveis

### Opção 1: App Instalável (simples — recomendado)
- Permite instalar o app na tela inicial do celular
- Não precisa de service worker nem configuração complexa
- Funciona criando apenas um `manifest.json` com ícones e configurações básicas
- **Limitação**: não funciona offline

### Opção 2: PWA Completo (com suporte offline)
- Tudo da opção 1 + cache offline via service worker
- Configuração mais avançada
- **Atenção**: funcionalidades PWA (offline, prompt de instalação) só funcionam na versão publicada, não no editor/preview do Lovable

## Plano de implementação (Opção 1 — Instalável)

### 1. Criar `public/manifest.json`
- Nome do app: "Sapiens Control Center"
- `display: "standalone"`, cores do tema, ícones

### 2. Criar ícones PWA
- Adicionar ícones 192x192 e 512x512 em `public/`

### 3. Atualizar `index.html`
- Adicionar `<link rel="manifest" href="/manifest.json">`
- Adicionar meta tags para tema e cor no mobile (`theme-color`, `apple-mobile-web-app-capable`)

### Arquivos afetados
- `public/manifest.json` (novo)
- `index.html` (adicionar link do manifest e meta tags)

## Nota importante
O PWA só funcionará corretamente na **versão publicada** (https://ez-erp-ia.lovable.app), não dentro do preview do Lovable.

