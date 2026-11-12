# Protocolo de continuidade

## Início

1. Ler `PROJECT_MEMORY.md`, `PROJECT_STATE.md`, `OPEN_WORK.md` e
   `FINANCIAL_INVARIANTS.md`.
2. Confirmar workspace, branch, HEAD e worktree.
3. Comparar baseline e fingerprint antes de qualquer persistência.
4. Ler contratos do subsistema e reutilizar evidência verde.
5. Não reabrir recovery nem repetir fundações concluídas.

## Fim

Atualizar memória antes do handoff: HEAD funcional, commits, testes, QA,
baseline, blockers, riscos, decisões e próximo passo. Não incluir tokens,
cookies, credenciais, PDFs reais ou linhas financeiras privadas.

`MISSION_NOT_COMPLETE_UNTIL_MEMORY_UPDATED=true`.

## Protocolo de continuidade (SM100)

Este protocolo complementa o acima. Não substitui `AGENTS.md` e não concede autorização: o registro documenta o estado.

### Início de missão

1. Ler `PROJECT_STATE.md` (bloco de atualização de continuidade) e `REGISTRO_CONTINUIDADE.md`.
2. Ler bloqueios (`## Bloqueios`) e tarefas com status `PENDENTE` ou `BLOQUEADO`.
3. Confirmar a autorização da missão na mensagem do proprietário. Tarefa pendente não é autorização.
4. Conferir Git (branch, HEAD, status, worktrees) e as evidências citadas.

### Encerramento de missão

1. Registrar o que mudou, com o commit ou PR correspondente, quando existirem.
2. Registrar testes executados e resultados, incluindo falhas pré-existentes.
3. Atualizar o estado em `PROJECT_STATE.md` e as tarefas (status e fase), bloqueios e decisões.
4. Rodar `npm run verify:continuity` e corrigir qualquer erro antes de encerrar.
5. Informar riscos residuais e o que depende de autorização.

Estados de entrega nunca são equivalentes: implementado localmente, commitado localmente, publicado em branch remota, PR aberto, integrado ao `main`, implantado e homologado.
