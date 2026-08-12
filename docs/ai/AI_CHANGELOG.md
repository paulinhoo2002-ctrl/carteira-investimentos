# AI Changelog

## 2026-08-12

- Instaladas 4 skills do upstream oficial `addyosmani/agent-skills`, pinadas ao tag `0.6.6` (commit `bdf76c7c6b7b3b3e01bb15c9fdc42ac5351855c1`, licenca MIT): `interview-me`, `source-driven-development`, `doubt-driven-development` e `browser-testing-with-devtools`.
- Instalacao seletiva por copia dos diretorios autorizados a partir do tag 0.6.6 (o CLI oficial `npx skills` nao suporta pin de versao; instalacao individual oficial nao copia `references/`).
- Destino: `.agents/skills/<skill>/SKILL.md` (integridade verificada por SHA-256 vs tag 0.6.6). Referencia compartilhada necessaria preservada em `.agents/skills/references/orchestration-patterns.md` (usada por `doubt-driven-development`).
- SKILL.md hashes (SHA-256):
  - `interview-me`: `1D94741D10D2C826CD0C191AEA3981EE94C8ABB27EF2A166F6A372117D06448F`
  - `source-driven-development`: `B979E7531EA601ED14A090F32A5B135DB517C48AB9821C5E8B09EFD80F4FF4D8`
  - `doubt-driven-development`: `59AEF769ADEAE40AAD67A1D54474AAF914EA7ECDFC2A4752A54840A8D29F80DE`
  - `browser-testing-with-devtools`: `4E3AACD6A380CD25BC6C2D67FDD1C926A9B22535B8A62109ECD33CEFD909E3D9`
  - `references/orchestration-patterns.md`: `61E543D86F19F86B83074F8C1C769455C7085A2C72DD47B1DA21A8C63785BE4A`
- Regras de ativacao da Carteira: `interview-me` condicional (sem CI/loop autonomo); `source-driven-development` exige fontes primarias (conflito = PARAR); `doubt-driven-development` obrigatoria no dominio financeiro sensivel; `browser-testing-with-devtools` complementa Playwright.
- Lock atualizado (schema preservado, skills array +4) e `setup-ai.ps1` reconhece as quatro novas skills.
- Pendencia operacional registrada: Chrome DevTools MCP (requisito de `browser-testing-with-devtools`) nao configurado; requer etapa propria.

## 2026-08-11

- Registrada `ui-ux-pro-max` como 13a skill oficial, validada na versao `v2.14.1`.
- Instalacoes oficiais geradas para Codex (`.agents/skills/`) e OpenCode (`.opencode/`).
- Documentados o papel complementar da skill, o comando oficial e os limites contra alteracoes financeiras/persistencia.

## 2026-08-11

- PRs #266/#267 registrados: acessibilidade de Dividendos e correcoes RF com smoke funcional.
- Registrados testMode em memoria, gate externo de build:modern e isolamento entre agentes.
- Adotada a skill local `frontend-design` para planejamento e revisao de UI/UX, com validacao no lock e no setup-ai.

Este documento registra mudanças relevantes na arquitetura e processo de IA do projeto.

## Eventos

- Criação da baseline de IA (AI_BASELINE.md)
- Criação do documento de contexto do projeto (PROJECT_CONTEXT.md)
- Criação das regras financeiras (FINANCIAL_RULES.md)
- Criação das diretrizes de UI (UI_GUIDELINES.md)
- Criação do workflow oficial (WORKFLOW.md)
- Criação da lista de skills (SKILLS.md)
- Criação do arquivo de lock de skills (skills.lock.json)
- Criação do documento de memória do projeto (PROJECT_MEMORY.md)
- Criação do script de validação de IA (scripts/setup-ai.ps1)
- Criação do documento de regras do projeto (PROJECT_RULES.md)
- Criação do documento de decisões arquiteturais (DECISIONS.md)
- Criação deste changelog (AI_CHANGELOG.md)
- Criação do README da documentação de IA (README.md)
- Criação do arquivo de versão de arquitetura (architecture-version.json)
