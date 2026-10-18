# Roteamento de Skills — Carteira LEGACY

Este arquivo é a ponte curta de governança. A fonte canônica, as classes de
missão, as Skills mínimas, aliases, contratos visuais e exemplos sem histórico
de chat estão em [.agents/SKILL_ROUTER.md](../../.agents/SKILL_ROUTER.md).

Em cada missão substancial:

1. confirme identidade, limites e estado do projeto em AGENTS.md;
2. leia docs/ai/PERMANENT_OPERATING_CONTRACT.md;
3. use Superpowers primeiro quando estiver disponível, depois Ponytail full e
   Caveman conforme a política;
4. classifique a missão pelo roteador canônico;
5. descubra Skills físicas no projeto e confirme Skills de runtime antes de
   selecioná-las;
6. escolha o menor conjunto útil, reclassifique se o escopo mudar e reporte
   Skills consideradas/usadas/não usadas e lacunas.

scripts/qa/select-skills.js e docs/ai/skills-routing.json dão suporte
determinístico à seleção. O seletor não instala nem executa Skills, não escolhe
modelos e nunca concede autorização. Seleção de Skills é independente do modelo
e do histórico de chat. Autorização da missão, regras de dados/Git e contratos
financeiros sempre prevalecem.

Modelo e agente são escolhidos separadamente conforme disponibilidade real e
docs/ai/AGENT_ROUTER.md; catálogo público não prova que um runtime esteja
conectado.


---

## MODEL AND REVIEWER ROUTING (ALL RUNTIMES)

`AGENT_MODEL_ROUTING_POLICY=true`. Before every large mission, compare current model options and record
`MELHOR_PELO_HERMES`, `FALLBACK_HERMES`, `MELHOR_PELO_CODEX`,
`FALLBACK_CODEX` and `MOTIVO`. Recheck the current NVIDIA catalog for Hermes;
catalog descriptions are not benchmark proof, so avoid unsupported absolute
claims and account for runtime availability. Codex defaults to GPT-6 Luna
Medium; use GPT-6 Sol Medium only when task complexity materially justifies
escalation. `USER_CHOOSES_RUNTIME=true`.

- `DEFAULT_IMPLEMENTATION_MODEL=Codex GPT-6 Luna Medium`: normal and large
  implementation, tests, CI, docs, local fixes, known-scope refactors, release
  execution and repository maintenance.
- `COMPLEXITY_ESCALATION_MODEL=Codex GPT-6 Sol Medium`: difficult architecture,
  protected financial conflicts, auth/security, persistence/integrity ambiguity,
  or a root cause unresolved after three reasoned attempts. Stop repeating the
  same local fix, reassess, then escalate.
- `DEFAULT_INDEPENDENT_REVIEWER=Hermes GLM-5.3 via NVIDIA` when available for
  technical, PR, root-cause, behavioral, test-quality, release and security
  review. Prefer `IMPLEMENTER != INDEPENDENT_REVIEWER`.
- Nemotron 3 Ultra 550B A55B is an optional heavy reviewer when healthy; Kimi
  K3 is an optional visual reviewer when safely available, with ChatGPT vision
  as a fallback. Do not introduce API keys for visual review or retry known
  unavailable endpoints indefinitely. If NVIDIA is unavailable, use a fresh
  context Codex GPT-6 Sol Medium for deep review and report the actual model.
- The NVIDIA catalog checked 2026-10-10 lists Poolside Laguna XS 2.1 for
  agentic coding/tool use and GLM-5.3 for reasoning/tool calling. These are
  candidates only; catalog listing does not prove credentials, endpoint access,
  or runtime availability. Recheck the [NVIDIA model catalog](https://build.nvidia.com/models?filters=nimType%3Anim_type_preview)
  for a large mission.
- `PROJECT_MUST_NOT_DEPEND_ON_ONE_MODEL=true`. Any runtime can continue by
  reading `AGENTS.md`, `docs/ai/PROJECT_MEMORY.md`, this file and
  `docs/ai/PROJECT_SKILLS_MANIFEST.md`; repository evidence outranks chat.

Before a large mission, state `MODELO RECOMENDADO`: principal, reviewer and
escalation model, each with a reason. These are recommendations, not claims
about the model running in the current session. Model and agent choice remains
separate from Skill selection, which is independent of model and chat history.
