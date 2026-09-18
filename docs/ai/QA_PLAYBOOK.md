# Playbook de QA

## Ordem local

1. Usar worktree limpo e servidor local isolado.
2. Rodar testes focados; depois `npm.cmd test`, `npm.cmd run test:ui` e build
   quando o código aplicável mudou.
3. Para UI, validar 390x844, 430x932, 768x900, 1366x768 e 1920x1080.
4. Medir overflow de página, não confundir scroll interno intencional com
   overflow global.

## QA autenticado

- Perfil autoritativo: `%LOCALAPPDATA%\CarteiraInvestimentos\qa-browser-authenticated`.
- CDP local padrão: `9233`; reutilizar sessão existente, sem copiar cookies ou
  tokens.
- Usar `protectedReadOnlyQa=1` ou o equivalente vigente.
- Confirmar autenticação real, não inferir pelo perfil.

## Observabilidade

- Capturar console, page errors, request failures e respostas relevantes.
- Separar erro da aplicação, warning opcional de provider, ruído de extensão e
  abort benigno.
- Bloquear o gate em erro fatal da aplicação, erro de página ou blocker de rede
  necessário.

## Zero-write

Antes e depois da jornada, verificar saves, escritas Firestore, mutações
financeiras, confirmação de import e realização de evento corporativo. O
resultado esperado em QA protegido/read-only é zero.

## Service Worker

Verificar versão do cache, atualização do worker, ativação do novo release,
preservação de dados locais, fallback do app shell e ausência de limpeza ampla
de `localStorage`, IndexedDB ou caches não pertencentes ao app.

