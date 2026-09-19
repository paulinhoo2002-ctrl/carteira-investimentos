# Roteamento permanente de Skills

Este é o entrypoint portátil para Codex, Hermes, OpenCode e agentes genéricos.
O catálogo operacional canônico está em
[`docs/ai/SKILL_ROUTING.md`](ai/SKILL_ROUTING.md).

## SUPERPOWERS_FIRST

`SUPERPOWERS_FIRST=true`.

Para toda missão técnica, o executor confirma identidade, lê `AGENTS.md`,
`docs/ai/PROJECT_MEMORY.md` e o router canônico, descobre as Skills reais,
localiza e lê Superpowers quando disponível e seleciona o menor conjunto
especializado relevante.

Fluxo: `Superpowers → Skill especializada → execução → testes → code review →
QA → handoff`.

Superpowers não concede autorização para merge, deploy, cloud writes,
alterações financeiras, persistência, schema, secrets, force push ou remoção
destrutiva. A autorização da missão e os contratos do projeto prevalecem.

Se Superpowers não estiver instalada, usar o melhor fallback disponível e
registrar a limitação. Se a categoria mudar, registrar
`SKILL_REEVALUATED=true` e reavaliar.

## Handoff e boot

A política não depende de chat, memória de sessão, modelo ou executor. O
handoff deve conter `SKILLS_DISCOVERED`, `SUPERPOWERS_AVAILABLE`,
`SUPERPOWERS_USED`, `SKILLS_CONSIDERED`, `SKILLS_USED`, `SKILLS_NOT_USED`,
`SKILL_SELECTION_REASON`, `SKILL_REEVALUATED` e `SKILL_GAPS_FOUND`.

Boot: confirmar identidade; ler os arquivos normativos; descobrir Superpowers e
Skills; classificar autorização; proteger worktrees; executar, testar, revisar,
fazer QA e entregar o handoff.
