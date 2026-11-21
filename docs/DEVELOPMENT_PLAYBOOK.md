# Playbook de desenvolvimento — Carteira de Investimentos

Este guia reúne o fluxo operacional para manutenção segura. Ele complementa,
mas não substitui, `AGENTS.md`, contratos financeiros, documentação de
arquitetura, release ou o roteador canônico de Skills.

## Comece pelas fontes canônicas

1. Confirme repositório, raiz Git, `origin`, branch, HEAD, status e worktrees
   em `AGENTS.md`. O projeto é exclusivamente `carteira-investimentos`; não o
   misture com Minhas Economias ou `carteira-2.0`.
2. Leia `docs/ai/PERMANENT_OPERATING_CONTRACT.md`,
   `docs/ai/PROJECT_MEMORY.md`, `docs/ai/PROJECT_STATE.md`,
   `docs/ai/NEXT_STEP.md` e `docs/ai/DECISIONS.md`.
3. Para código, consulte `docs/ai/ARCHITECTURE_MAP.md`; para cálculos e dados,
   `docs/ai/PRODUCT_CONTRACTS.md` e `docs/ai/FINANCIAL_RULES.md`; para PR ou
   release, `docs/ai/TESTING_AND_RELEASE.md`.
4. Classifique a tarefa em `.agents/SKILL_ROUTER.md`. Esse é o único roteador
   canônico. `docs/ai/SKILLS_ROUTING.md` é uma ponte. A seleção não instala
   Skills nem autoriza operações.
5. Trate o Git e a implementação atual como fatos. Documentos com datas,
   métricas ou estado de fase são snapshots: revalide-os antes de agir.

## O que é o sistema e onde alterar

O produto é uma PWA de controle de investimentos, com aplicação legada em
`index.html`, persistência local/offline e sincronização Firebase autenticada.
O caminho moderno em `modern/` é somente leitura; não substitui o legado.

| Área | Fonte principal | Limite |
|---|---|---|
| Bootstrap, telas e rotas legadas | `index.html` | Monólito sensível; patch pequeno e testes do fluxo alterado |
| Cálculos financeiros | `finance-core.js` e adaptadores existentes | Não duplicar fórmulas nem arredondamento |
| Estado e armazenamento | `persistence-core.js` | Não contornar serialização, recuperação e autoridade |
| Movimentos | contratos `portfolio-movement-*` | Preservar validação, prévia e confirmação explícita |
| Firebase | bootstrap legado, `firestore.rules`, `firebase*.json` | Validar destino antes de qualquer acesso ou comando |
| Frontend moderno | `modern/src/`, `modern/vite.config.ts` | Somente leitura; `modern/dist` é gerado e não deve ser commitado |
| QA local | `tests/local-http-server.js`, `scripts/qa/`, fixtures | Sintético e local; não comprova produção ou Firebase hospedado |
| CI e deploy | `.github/workflows/`, `vercel.json` | Build de Preview não prova deployment nem configuração em runtime |

Leia `docs/ai/ARCHITECTURE_MAP.md` antes de escolher um ponto de mudança. Use
sempre o cálculo e a fronteira de persistência já existentes.

## Regras que não podem ser quebradas

- `UNKNOWN != ZERO`, `MISSING != ZERO`, `PARTIAL != COMPLETE` e
  `EXPECTED != RECEIVED`. Quantidade, preço, custo, evento ou cobertura
  ausentes permanecem desconhecidos.
- Não alterar cálculos, histórico, schema, persistência, autenticação,
  Firestore Rules, backup, `sw.js`, `manifest.json`, `finance-core.js` ou
  `persistence-core.js` fora de uma fase autorizada para esse domínio.
- Falha ao salvar exige quarentena do estado afetado e diagnóstico; não
  apresentar sucesso nem gravar uma forma alternativa silenciosamente.
- Nenhuma escrita financeira silenciosa, importação aproximada ou alteração
  automática de posição/custo médio. Prévia e confirmação continuam necessárias.
- Dados financeiros pessoais, extratos, backups, tokens, cookies e credenciais
  não entram em testes, logs, commits ou documentação. Use fixtures sintéticas.
- Uma Skill é orientação, não autorização. O agente deve aplicar Superpowers
  primeiro quando disponível, seguir Ponytail full e Caveman, e então usar a
  seleção mínima de `.agents/SKILL_ROUTER.md` (até duas Skills especialistas).
- A autorização de produção, Firebase hospedado, credenciais, merge e deploy é
  independente dos testes locais. Nunca inferir aprovação por ausência de erro.

## Ciclo rápido de cinco passos

1. **Mudança pequena:** confirme identidade e estado Git, entenda o contrato,
   localize os chamadores e reproduza o problema com dados sintéticos.
2. **Demo local:** use `npm.cmd run qa:local-synthetic` para servir a app em
   loopback com fixture local. Não configure Firebase hospedado para demo.
3. **Medição:** antes de capturas, medir viewport, `scrollWidth` versus
   `innerWidth`, dimensões dos elementos afetados e estilo calculado relevante.
   Use os seletores semânticos existentes; não reduza asserts nem mude
   breakpoints para contornar uma falha.
4. **Testes:** rode primeiro o teste do fluxo alterado, depois as regressões
   financeiras, de persistência, segurança ou navegador aplicáveis. Amplie para
   a suíte global e builds quando o risco ou os contratos exigirem.
5. **Fechamento:** revise o diff completo, `git diff --check`, status e arquivos
   não rastreados; registre resultados/exit codes. Faça commit pequeno somente
   quando a fase e a autorização cobrirem o commit. Push, PR, merge e deploy
   são gates separados.

## Comandos verificados no `package.json`

No PowerShell do Windows, use `npm.cmd` para evitar resolução do shim incorreto.
Os scripts `npm run`/`npm test` abaixo foram conferidos no `package.json` desta
versão do guia; `npm.cmd ci` é o comando padrão do npm e usa o lockfile. A
presença dos comandos confirma que estão declarados, não que passaram nesta
máquina.

```powershell
# Dependências: worktree isolada/autorizada; verifique lifecycle scripts antes de executar.
npm.cmd ci

# Demo legada sintética em http://127.0.0.1:8765
npm.cmd run qa:local-synthetic

# Verificações rápidas e fluxos focados
npm.cmd run build
npm.cmd run build:modern
npm.cmd run test:finance
npm.cmd run test:persistence
npm.cmd run test:backup-restore
npm.cmd run test:local-synthetic
npm.cmd run test:local-synthetic:browser
npm.cmd run test:skills-routing
npm.cmd run test:rf-semantic-browser
npm.cmd run test:auth-emulator
npm.cmd run test:auth-access-emulator
npm.cmd run test:m594-real-rules-emulator
npm.cmd run emulators:qa

# Suítes maiores; podem levar mais tempo e executar build como pretest
npm.cmd test
npm.cmd run test:modern
npm.cmd run test:visual-regression
npm.cmd run verify
npm.cmd run verify:full
```

`npm.cmd ci` pode executar lifecycle scripts dos pacotes; revise-os e não
aprove scripts bloqueados pelo npm sem verificar procedência e necessidade.
`npm.cmd test` inclui o pretest `build:modern` e a cadeia legada declarada no
script `test`; `test:modern` é separado. `verify:full` executa a sequência
completa definida em `scripts/verify.js`. `test:local-synthetic:browser` exige
Chromium/Chrome e Playwright disponíveis; o teste atual exercita viewports de
celular e desktop, mas não substitui a matriz manual completa.
`build:modern`, `npm.cmd test` e `test:visual-regression` podem gerar/escrever
`modern/dist`; execute-os em worktree isolada e nunca versione esse artefato.
`verify:full` inclui comparação com `origin/main`; atualize/confira essa ref
antes de interpretar esse gate como comparação contra a base remota atual.
Os testes de emulador acima são locais, usam configs e IDs `demo-*` explícitos;
não os substitua por comandos Firebase sem `--project` confirmado.

Resultado: exit code `0` significa que aquele comando terminou sem falha segundo
os asserts que executou. Não significa aprovação de testes que não rodaram,
autenticidade de documento, configuração remota correta ou certificação de
dados financeiros reais.

Não use comandos que não estejam declarados na versão atual do `package.json`.
Por exemplo, referências antigas a `npm run dev`, `npm run dev:emulator`,
`backup:list` ou `backup:restore` no README não são comandos declarados aqui.
Revalide o arquivo antes de copiar qualquer comando para uma automação.

## Ambientes e fronteiras de acesso

### Local sintético

- `qa:local-synthetic` usa servidor Node ligado a `127.0.0.1:8765` e injeta um
  marcador de QA. A rota sintética não comprova autenticação real, persistência
  hospedada, download real ou recuperação financeira.
- Encerre pelo `Ctrl+C` no terminal que iniciou o servidor; não finalize processos
  por nome/porta sem comprovar que pertencem à execução atual.
- Os testes de browser observam chamadas Firebase e usam fixtures sintéticas;
  prefira-os a uma conta real para validar layout e comportamento local.
- O modo `testMode` usa fixture em memória. `save()` não comprova persistência
  real e recarregar reinicializa os dados de teste.

### Firebase Emulator

- Os scripts `test:auth-emulator`, `test:auth-access-emulator` e
  `test:m594-real-rules-emulator` apontam explicitamente para project IDs
  `demo-*` e arquivos de configuração locais. Use o script correspondente e
  confirme portas livres antes de iniciar emuladores.
- Nesta base, `.firebaserc` tem `default` apontando para o projeto de produção;
  não execute `firebase deploy`, `firebase use` ou comandos administrativos sem
  confirmar `--project`, configuração e destino. Um alias `default` não é QA.
- O teste do emulador valida somente as regras e fluxos carregados naquela
  execução local. Não é evidência de regras publicadas ou isolamento em QA
  hospedado.

### Preview/QA hospedado e produção

- Identifique o deployment pelo SHA completo, projeto Vercel, branch e estado.
  Um domínio fixo, URL de Preview ou SHA curto não basta.
- Antes de autenticar, confira o `projectId` Firebase efetivamente usado pelo
  deployment e confirme que Auth, Firestore e variáveis pertencem ao QA. Se o
  destino estiver ausente, conflitante ou não verificável, bloqueie a conexão.
- A configuração pública do Firebase no cliente não substitui credenciais
  administrativas. Nunca coloque service-account, token ou senha no bundle,
  repositório, logs ou URL.
- As regras precisam autorizar apenas o UID proprietário do documento e negar
  anônimo/acesso cruzado. Teste leitura e escrita permitidas e negadas com
  identidades sintéticas distintas antes de considerar QA hospedado certificado.
- A configuração local atual aponta o alias Firebase `default` para produção.
  O workflow `.github/workflows/preview.yml` instala/builda e informa o estado;
  ele próprio declara que não executa deploy Vercel. `vercel.json` define build
  e rotas, não prova associação do projeto, variáveis remotas, SSO ou Firebase em
  runtime.
- Nunca teste contra produção com fixtures. Não altere produção, regras
  hospedadas ou dados reais sem autorização específica para o projeto e a
  operação.

## QA financeiro e consistência

- Para cálculos, use `finance-core.js`/adaptadores canônicos e
  `npm.cmd run test:finance`; acrescente testes de renda fixa, proventos,
  exportação ou histórico conforme os chamadores afetados.
- Preserve a autoridade manual de Renda Fixa definida pelo produto; não use
  cotações ou campos incompletos para substituir base/custo sem evidência.
- Para armazenamento/recuperação, use `npm.cmd run test:persistence`,
  `npm.cmd run test:backup-restore` e os testes focados em backup relevantes.
  Teste arquivo inválido, falha parcial, idempotência, rollback/diário e
  preservação de dados não relacionados em fixtures temporárias.
- Diferencie backup criptografado, restauração local, persistência Firestore e
  recuperação independente do dispositivo. Uma simulação ou round-trip em
  memória não certifica recuperação real.
- Para dados de corretora, mantenha separados autenticidade da fonte, identidade
  de owner/carteira/ativo, período coberto, eventos esperados/observados,
  duplicidade/sobreposição, posição inicial e custo remanescente. Evidência
  parcial permanece pendente; hash de arquivo sozinho não prova autenticidade.
- Não usar documentos, saldos ou operações reais para “corrigir” fixtures ou
  snapshots. Uma divergência em fixture exige comprovar primeiro o contrato
  correto.

## Responsividade e acessibilidade

Para mudança visual, leia `docs/ai/VISUAL_CANON.md`,
`docs/ai/VISUAL_UX_RESPONSIVE_CONTRACT.md` e os alvos visuais aplicáveis. A
matriz governada em `AGENTS.md` é 390, 430, 768, 1366 e 1920 px. Verifique
overflow horizontal, navegação, foco, contraste, leitura acessível e controles
da tela alterada. Registre medidas automáticas antes de gerar capturas; captura
é evidência complementar, não substitui asserts de comportamento ou console.

`test:local-synthetic:browser` cobre o teste browser sintético existente;
`test:visual-regression` executa os testes de regressão visual declarados e seu
pretest de build moderno. Não afirme que esses comandos cobrem toda a matriz
sem conferir os viewports/asserts de cada teste.

## Git, CI, Preview, release e recuperação

- Uma mudança por branch/worktree. Novas worktrees ficam sob
  `C:\Projetos\carteira-investimentos.worktrees\`; não edite uma worktree
  suja de outra frente.
- Antes/depois: `git status --short --branch`, `git diff --check`, revisão de
  `git diff` e inventário de não rastreados. Não use reset/clean/stash destrutivo;
  preserve `_mission-logs/` e evidências.
- Commit somente após diff revisado e gate autorizado. Não force push; não faça
  merge ou deploy de produção sem autorização explícita.
- Para commitar, selecione arquivos explícitos; nunca use `git add -A` para
  incluir arquivos que não foram revisados:

  ```powershell
  git status --short --branch
  git diff --check
  git add -- docs/DEVELOPMENT_PLAYBOOK.md AGENTS.md README.md .agents/SKILL_ROUTER.md
  git diff --cached --check
  git diff --cached
  git commit -m "docs: add development playbook"
  ```

  O exemplo é somente para esta alteração documental. Para outra tarefa, troque
  a lista de arquivos e mensagem depois de revisar o diff.
- `npm.cmd run audit:ci` grava `audit-result.json` na raiz conforme o script do
  pacote. Revise e preserve esse arquivo como evidência local; não o inclua em
  commits sem necessidade e inspeção.
- CI, `.github/workflows/ci.yml`, release e Preview não são equivalentes. Leia o
  workflow que roda no SHA em questão e confirme checks no SHA completo.
- `vercel.json` configura a saída estática e o build moderno. Build local verde
  não prova deployment, SSO, domínio nem configuração Firebase do Preview.
- Para rollback de código, use o procedimento aprovado do provedor e preserve a
  referência do deployment anterior. Para dados, use somente o procedimento de
  backup/restauração autorizado. Rollback de código não restaura dados.
- Leia `docs/BACKUP_PROCEDURE.md`, `docs/BACKUP_RECOVERY_RUNBOOK.md` e
  `docs/RELEASE-CHECKLIST.md` antes de operações correspondentes; não executar
  seus passos que escrevem dados reais durante QA sintético.

## Conhecimento classificado — verificado em 2026-11-21

### VERIFICADO

- `package.json` exige Node `>=22.14.0`; o ambiente desta verificação tinha
  Node `v26.7.0` e npm `11.19.0`.
- `.firebaserc` declara o projeto de produção como `default`; as configurações
  locais de Auth/Firestore Emulator e scripts de teste usam projetos `demo-*`.
- `.github/workflows/preview.yml` usa Node 20 e não publica deployment; o
  workflow de CI também usa Node 20 em seus jobs principais, enquanto
  `.github/workflows/release.yml` usa Node 22.
- A versão do Playbook não cria nem provisiona Firebase/Vercel hospedados.
- Release de `808ef95` falhou no teste `security-secrets` ("No hardcoded
  Google API keys"): a chave pública QA (`carteira-invest-qa-v316`) está em
  `index.html` desde #581 e a lista de chaves públicas só tinha a de produção.
  Correção proposta: PR #583 (uma entrada exata na lista do teste; o scanner
  continua reprovando qualquer outra chave). Até esse PR ser mesclado, o
  Release da `main` segue vermelho.
- CI do PR #582 em `9bd27cc` passou em Node 20 (job `Build and test`).
- `carteira-investimentos-delta.vercel.app` serve `index.html` byte a byte
  igual ao da `main` em `808ef95` (verificação somente leitura, 2026-11-21).
  Isso não prova o login nem o funcionamento do domínio.

### PENDENTE

- Decidir a correção da chave QA do Release: PR #583 (exceção por valor exato)
  ou remoção da configuração QA do HTML.
- Alinhar Node dos workflows CI/Preview com `engines.node` (ou rever o contrato
  de engine com decisão explícita). Este playbook não altera workflows.
- Comprovar projeto QA hospedado, variáveis e regras por deployment/runtime; os
  arquivos locais examinados não bastam para certificar essa configuração.
- Verificar a URL estável de QA, SSO e processo real de deploy/rollback no
  provedor antes de homologação/publicação.

### HISTÓRICO

- Totais de testes, vulnerabilidades, cobertura, versões de service worker e
  estados de release em documentos antigos são snapshots. Não os reutilize
  como resultado atual sem executar a verificação na branch/SHA atual.
- O README anterior listava scripts de desenvolvimento e backup que não estão
  declarados no `package.json` examinado; use a tabela de comandos deste guia e
  confirme-a novamente no repositório ativo.

### HIPÓTESE

- Não há hipótese registrada como solução. Suspeitas futuras devem receber
  evidência, escopo e método de verificação antes de serem copiadas para
  “VERIFICADO”.

## Checklist para cada manutenção

- [ ] Projeto, branch, HEAD, status, remote e worktree confirmados; arquivos
      de outras frentes preservados.
- [ ] AGENTS, contratos, estado/next step e Skill Router lidos; Skills físicas
      selecionadas e aplicadas conforme a tarefa.
- [ ] Problema reproduzido ou necessidade documentada; camada responsável
      identificada; sem duplicar cálculo ou persistência.
- [ ] Dados exclusivamente sintéticos e ambiente/destino verificados antes de
      qualquer teste de Auth/Firestore/Preview.
- [ ] Demo local e medições relevantes executadas antes de capturas.
- [ ] Testes focados e regressões de finanças, persistência, segurança e UI
      proporcionais ao risco executados; exit codes registrados.
- [ ] Build/CI conferidos quando aplicáveis; limitações e testes não executados
      nomeados explicitamente.
- [ ] Diff integral, arquivos não rastreados e `git diff --check` revisados.
- [ ] Commit temático criado somente quando autorizado; logs e dados pessoais
      permanecem fora do commit.
- [ ] Preview identificado por SHA e projeto; produção continua separada e sem
      alterações não autorizadas.
