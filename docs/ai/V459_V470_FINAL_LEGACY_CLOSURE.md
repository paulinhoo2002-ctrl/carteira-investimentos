# V459–V470 — Encerramento técnico LEGACY

DATA=2026-10-10
STATUS=DOCUMENTACAO_E_REGRESSAO_LOCAL_CONCLUIDAS
MERGE=false
PRODUCTION_READY=false

## Identidade e branches

- Repositório esperado: `paulinhoo2002-ctrl/carteira-investimentos`.
- Main remota confirmada: `7d8a523abbef3f055ca3a6e85cf976fe06705462`.
- PR #473: OPEN/DRAFT; head `bd7f33e051fe1f14d3ea779208003c4ab8732280`; CI e Preview associados aprovados no SHA consultado.
- PR #474: OPEN/DRAFT; head `a266da3cc87944726605b2fe6f3f55cc044d5487`; CI e Preview associados aprovados no SHA consultado.
- A worktree canônica estava suja e foi preservada. A integração e validação local ocorreram em worktree isolada; nenhum arquivo do checkout canônico foi alterado.

## Reconciliação documental

- #473 adiciona o checkpoint V437–V450.
- #474 adiciona o mesmo checkpoint (blob idêntico) e o relatório V451–V455.
- O checkpoint duplicado não contém divergência textual; depois da integração de #473, sua reaplicação é no-op. Não há conflito de conteúdo entre esses documentos.
- O relatório original de #474 contém identificadores pessoais/de ambiente que não são necessários para a evidência agregada. A versão sanitizada está em `V451_V455_HOSTED_FIREBASE_QA.md` nesta proposta de substituição. O histórico existente da #474 não é apagado por essa cópia.
- Estratégia segura: integrar #473 primeiro; não mesclar #474. Revisar a substituição sanitizada como PR independente baseada na main atual. Não fazer force-push nem reescrever histórico.

## Testes e build

Execução local em `C:\Projetos\carteira-investimentos.worktrees\v437-v450-daily-readiness`, branch `codex/v451-v455-hosted-firebase-qa`, SHA exato `a266da3cc87944726605b2fe6f3f55cc044d5487`:

- `npm.cmd run verify:release`: PASS, exit code 0. O script encadeia `npm test`, `test:modern`, `qa:all` e V289.
- `test:modern`: 823/823.
- `qa:all`: larguras configuradas sem overflow; console/page/requisições relevantes sem erros.
- V289: 18/18, incluindo verificações de cobertura de proventos em desktop e mobile.
- `npm test`: PASS dentro do `verify:release` (o comando composto chegou ao final com sucesso).
- `git diff --check`: limpo na validação de código anterior às alterações documentais desta PR.
- A primeira tentativa isolada foi bloqueada pelo sandbox ao limpar artefatos gerados; a mesma suíte foi concluída com sucesso em execução elevada, sem mudar permissões ou encerrar processos.
- CI da main, #473 e #474 passou nos SHAs exatos consultados. Vercel marcou as implantações correspondentes como prontas/sucesso. O estado Vercel indica publicação do build, não certificação funcional autenticada.

## Firebase e segurança

- Regras Firestore de produção não foram modificadas nesta missão.
- Não foram acessados credenciais, logs privados, Firebase hospedado nem dados de carteira.
- Os resultados de autenticação/persistência hospedadas registrados na #474 são evidência histórica de terceiros/execução anterior e não foram repetidos nesta revisão.
- `AUTH_QA_CURRENT=NOT_RETESTED`; `HOSTED_QA_CURRENT=NOT_RETESTED`.
- Nenhum processo foi encerrado. Nenhuma carteira real foi acessada ou alterada.

## Riscos e gates pendentes

- BLOCKER=0 para regressão local/documental neste escopo.
- MAJOR=0 encontrado na integração documental e revisão de segurança executadas.
- MINOR: PR #474 e seu histórico permanecem acessíveis com identificadores pessoais/de ambiente; a sanitização da nova cópia não remove dados de commits já publicados. A substituição deve ser usada em vez da #474. A decisão de fechar/substituir formalmente a PR antiga e qualquer pedido de remoção de histórico ficam para revisão humana/repositório.
- QA hospedado autenticado não foi reexecutado; não declarar certificação operacional atual.
- PRODUCTION_GO_NO_GO=NO_GO para certificação de produção: não houve validação funcional humana autenticada em produção, e esta missão não autorizou acessar dados reais.
- Rollback de uma eventual integração documental: revert normal do commit squash da PR de documentação; nenhuma mudança de produto ou regra Firebase está incluída.

REAL_FINANCIAL_WRITES=0
REAL_IMPORT=false
REAL_RESTORE=false
MANUAL_PRODUCTION_DEPLOY=false
MERGE=false
