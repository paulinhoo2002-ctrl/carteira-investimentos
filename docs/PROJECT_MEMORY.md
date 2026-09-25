# Project memory entry point

A memória durável e o estado canônico do projeto LEGACY são mantidos em
[`ai/PROJECT_MEMORY.md`](ai/PROJECT_MEMORY.md). Este arquivo é somente um
entry point de compatibilidade; não duplique aqui estado atual, histórico de
release ou dados transitórios.

A decisão permanente de bootstrap de agentes, seleção obrigatória de
Superpowers, descoberta dinâmica de Skills e roteamento Hermes/NVIDIA com
fallbacks está documentada em [`SKILLS_ROUTING.md`](SKILLS_ROUTING.md) e
resumida na memória canônica. Regras de projeto prevalecem sobre histórico de
chat e memória externa.
