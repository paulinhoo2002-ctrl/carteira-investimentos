# M560 — proteções locais de custo e deployment

Status: proposta local para revisão; nenhuma configuração remota foi alterada.

## GitHub Actions

O workflow `CI` mantém os gatilhos atuais (`push` somente em `main` e `pull_request` com base em `main`) e os três jobs obrigatórios: Build and test, V289 visual regression e Auth and Firestore emulator QA.

A concorrência agrupa eventos de PR pelo número da PR e outros eventos pela referência. Execuções fora de `main` podem substituir execução em andamento no mesmo grupo. Cada execução de `main` recebe grupo único por `github.run_id` e `cancel-in-progress` é falso, evitando cancelamento de publicação/validação de produção.

O workflow não declara `workflow_dispatch`; portanto execução manual não é atualmente acionável. O teste cobre os contextos de expressão que uma execução manual produziria: em `main`, grupo único e sem cancelamento; em outra branch, grupo por referência e substituição apenas no mesmo grupo. Isso valida a expressão, não habilita um gatilho manual.

Nenhum job, suíte, permissão ou evento obrigatório foi removido. A configuração reduz trabalho redundante de branches/PRs sem encurtar os gates de CI.

## Branches Vercel

`git.deploymentEnabled` usa minimatch; branches sem regra explícita são habilitadas por padrão. Quando uma branch corresponde a várias regras, basta uma regra `true` para permitir deployment. Por isso a política usa bloqueio amplo e opt-ins explícitos:

| Padrão | Deploy automático |
| --- | --- |
| `**` | Bloqueado por padrão, inclusive nomes desconhecidos |
| `main` | Permitido; publicação de produção preservada |
| `codex/preview/**` | Preview autorizado explicitamente |
| `m5-preview/**` | Preview autorizado explicitamente |

Branches observadas no repositório incluem `codex/...` e nomes de missão como `m537-...`, `m549-...`, `m557-...`; o Git não registra com confiabilidade se Hermes, Codex ou uma pessoa criou cada ref. O bloqueio `**` também cobre novas convenções, como `feat/...`, evitando lacunas de prefixo. A branch desta proposta, `codex/m560-3-safe-git-recovery`, também fica bloqueada; a PR pode validar pelo GitHub Actions sem gerar Preview Vercel.

As exceções autorizam todas as branches dentro desses dois namespaces; prefixo de branch não prova a identidade de quem fez push. Use esses nomes somente quando Preview for necessário. Branches como `feat/...`, `m557-...` e qualquer prefixo desconhecido deixam de gerar Preview automaticamente. Neste projeto, a leitura autenticada confirmou que nenhum Deployment Check Vercel está configurado como obrigatório; em outro projeto, uma regra de merge que exija Preview precisaria ser reavaliada antes de adotar a mesma política.

Esta configuração é versionada em `vercel.json`. Na leitura autenticada de 20/10/2026, o projeto `carteira-investimentos` estava no time correto e no plano Hobby. O ambiente Production mostrava `main` como Branch Tracking efetiva; Preview estava habilitado para branches não atribuídas a outro ambiente. O Ignored Build Step estava em `Automatic`, sem script customizado, e os Deployment Checks da Vercel estavam vazios.

O painel mostrou o build de Production atual sobrescrito pelo `vercel.json` da própria implantação: `npm run build:modern && npm run build`, saída `.`, framework `null` e regras de rota/cabeçalhos do arquivo. A tela de configurações de projeto exibia valores de build diferentes, portanto o arquivo versionado é a fonte efetiva para esses campos. Não foi identificada configuração remota que contradiga `git.deploymentEnabled`.

Na tela de Rulesets do GitHub não havia rulesets; em Branch protection rules não havia regra configurada. Portanto não existem required status checks configurados nessa proteção. A tela de Deployment Checks da Vercel também dizia `No checks configured`; não existe um check Vercel que possa ficar pendente por uma branch bloqueada. O workflow `CI` continua acionado em pull requests com base em `main`, com os três jobs existentes. A política não desativa esses jobs.

A página de Actions mostrava permissão padrão do `GITHUB_TOKEN` somente leitura e sem permissão para criar/aprovar PRs. A página de Budgets mostrava Actions com limite de US$ 0, gasto de US$ 0 e status `Usage blocked`; alertas de uso incluído estavam ativos. Não foi feita alteração de billing. O estado observado do deployment de Production era `READY`, no SHA `bb3ac065ec1da6cbdc7b1ee50a5ae5796b5e4f68` da branch `main`; o alias principal era `carteira-investimentos-delta.vercel.app`.

Essas leituras confirmam a configuração atual do painel, mas não ativam a nova política: ela só terá efeito quando `vercel.json` for integrado e processado pela Vercel. O deployment atual estar em `main` não foi usado como prova da Production Branch; a confirmação veio diretamente de Production > Branch Tracking.

## Validação local

`npm run test:zero-cost-guards` verifica os gatilhos e três jobs de CI, os contextos principais de concorrência, `main`, branches de agente, namespaces de Preview e branches desconhecidas. O modelo de branch no teste cobre os padrões usados nesta política (`**`, nomes exatos e sufixo `/**`); não substitui o parser do Vercel.

## Riscos e reversão

- `main` permanece explicitamente habilitada; nenhuma outra branch pode sobrepor sua execução do GitHub Actions.
- A Production Branch foi confirmada como `main`; a regra `main: true` preserva o caminho de produção.
- Branches com nome desconhecido são bloqueadas na Vercel até receberem namespace opt-in. Atualmente não há required status checks de GitHub nem Deployment Checks da Vercel configurados; os jobs do workflow de PR continuam executando.
- Qualquer branch sob `codex/preview/**` ou `m5-preview/**` inicia Preview automaticamente. A autorização é por convenção de nome, não por identidade.
- O dashboard pode manter settings gerais diferentes dos valores versionados de build; a implantação observada usa o `vercel.json`. Revalidar se houver mudança futura no painel ou no arquivo.
- Economia não quantificada: depende de execuções concorrentes canceladas e de quantos deployments de branches bloqueadas ocorreriam.
- Reversão: commit normal removendo o bloco `concurrency` de `.github/workflows/ci.yml`; no `vercel.json`, remover o objeto `git` adicionado. Não requer mudança de billing/plano.

## Ativação

Commit, um push normal e uma Draft PR foram autorizados por esta missão, mas só depois dos gates locais. Nenhuma configuração remota de billing, Actions, branch protection ou Vercel foi alterada. A regra Vercel só pode ser considerada ativa depois que a alteração for integrada e o projeto efetivamente processar a configuração; a configuração observada foi validada em sessão autenticada antes da publicação.
