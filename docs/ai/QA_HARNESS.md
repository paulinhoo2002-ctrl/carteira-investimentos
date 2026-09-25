# QA Harness local e multiagente

Esta é a infraestrutura local, não destrutiva e reutilizável para Work,
Hermes, OpenCode e Codex validarem a SPA legada e os gates da Phase 4H.

## Princípios

- O servidor legado é `node tests/local-http-server.js --port 4173`; ele escuta
  somente em `127.0.0.1`, retorna 404 antes de enviar cabeçalhos de sucesso e
  aceita `--port 0` para testes com porta efêmera.
- O navegador QA usa Chrome estável com perfil dedicado, fora do repositório,
  e CDP somente em `127.0.0.1`. Chrome for Testing pode ser usado em smoke
  sintético, mas não é a base de login Google autenticado.
- A autenticação ocorre somente pela UI normal. Não copiar cookies, tokens ou
  localStorage e não usar `testMode` para provar o fluxo protegido.
- A sessão persistente do perfil pode ser reutilizada; se expirar, o agente
  pausa somente para o login normal.
- O dry-run exercita superfície, clique, plan provider e executor, mas para
  antes de snapshot, mutação, save e sync.
- Perfis, traces, screenshots e dados reais nunca entram no Git.

## Inicialização

```text
npm.cmd run qa:serve:legacy
npm.cmd run qa:browser:start
npm.cmd run qa:browser:check
```

O launcher usa `QA_PROFILE_DIR` quando informado ou
`%LOCALAPPDATA%\CarteiraInvestimentos\qa-browser-profile` fora do repositório.
O login,
quando necessário, deve ser feito normalmente nessa janela dedicada.

Depois de autenticado:

```text
npm.cmd run qa:auth-smoke
```

O comando abre a superfície interna com `internalRecoveryDryRun=1`, preenche a
autorização de teste como string nativa, clica no controle real e exige
`DRY_RUN_PREWRITE_READY`. Ele nunca executa recovery real.

## Pirâmide de testes

| Camada | Uso | Dados |
| --- | --- | --- |
| A | unitários determinísticos | sintéticos |
| B | contratos financeiros/persistência/import/recovery | sintéticos |
| C | integração sandbox e rollback | sintéticos |
| D | browser local sem autenticação | local |
| E | browser local autenticado | perfil QA persistente; somente leitura |
| F | protected dry-run | runtime real; antes de snapshot/mutação |

CI executa as camadas A-D e os builds. A camada E/F é local, pois não usa
conta, token ou carteira real em CI.

## Comandos

- `npm.cmd run qa:browser:start`: inicia ou detecta o Chrome QA.
- `npm.cmd run qa:browser:check`: verifica CDP, servidor e superfície.
- `npm.cmd run qa:smoke`: smoke local sem autenticação, sem dados reais. **Auto-inicia servidor QA local se QA_ORIGIN não estiver definido**.
- `npm.cmd run qa:auth-smoke`: prova autenticada native-click em dry-run.
- `npm.cmd run qa:phase4h-native`: repete três cliques nativos dry-run e
  valida refresh, hard refresh e reabertura de rota.
- `npm.cmd run qa:phase4h-persistence`: repete três cliques nativos dry-run e
  exercita o callback oficial de read-back. Valida o contrato
  `{ok,value} -> value:string|null -> parseStoredState()`, sem snapshot, save,
  sync ou escrita real.
- `npm.cmd run qa:all`: suites não destrutivas, builds e guards locais. **Auto-inicia servidor QA local quando QA_ORIGIN não está definido**.
- `npm.cmd run qa:all-safe`: alias explícito para a suíte não destrutiva.

### Sobre QA_ORIGIN

O comando `qa:smoke` (e portanto `qa:all`) agora suporta execução autônoma:

- **Sem QA_ORIGIN**: Inicia automaticamente o servidor QA local em porta efêmera (OS-assigned), aguarda prontidão, executa smoke e encerra o servidor.
- **Com QA_ORIGIN definido** (ex: `QA_ORIGIN=http://127.0.0.1:4173 npm run qa:smoke`): Usa a origem fornecida, **não** inicia servidor local. Mantém compatibilidade total com modo manual de servidor.

O servidor local reutiliza a implementação existente `tests/local-http-server.js` com hardening V265 (contenção de path, 403 em traversal, porta efêmera via `--port 0`).

## Handoff entre agentes

Antes de qualquer trabalho protegido: validar workspace/branch/HEAD, iniciar o
servidor legado, verificar CDP e autenticação normal, executar o dry-run e
congelar um manifesto novo. Autorização single-use deve sempre estar ligada a
fingerprints recém-calculados. Recovery Yahoo e piloto de agosto permanecem
operações separadas e não são executados por este harness.

Uma autorização protegida é consumida assim que o executor entra na mutação,
mesmo quando um gate posterior falha e o rollback restaura o estado. Nunca
reutilizar o mesmo manifesto/autorização após esse ponto.
