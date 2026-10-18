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
