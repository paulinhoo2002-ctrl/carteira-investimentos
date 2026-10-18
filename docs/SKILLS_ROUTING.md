# Skills routing — compatibility bridge

A política canônica de descoberta, classificação e seleção mínima está em
[.agents/SKILL_ROUTER.md](../.agents/SKILL_ROUTER.md). Confirme a identidade e
os limites em AGENTS.md antes de qualquer trabalho; leia também
docs/ai/PERMANENT_OPERATING_CONTRACT.md.

A seleção começa pelo inventário físico versionado em .agents/skills.
Skills fornecidas pelo runtime são consideradas somente após confirmação de
disponibilidade. Modelo, chat e seleção de Skills são independentes. O seletor
scripts/qa/select-skills.js usa docs/ai/skills-routing.json, não instala Skills
e nunca concede autorização.

Esta ponte existe para links antigos. docs/ai/SKILLS_ROUTING.md e
docs/ai/SKILL_ROUTER.md também apontam para a fonte canônica.
