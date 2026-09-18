# Decisões V192

## V192-001 — Memória canônica vive no Git

Memória Git-tracked em `docs/ai/` é a fonte de verdade. Índices MCP são
derivados e convenientes; sessão/chat não é fonte durável.

## V192-002 — Codebase Memory verificado, mas não auto-configurado

O release Windows v0.8.1 foi baixado da release oficial e conferido por
SHA-256 contra o manifesto oficial. O binário executou `--help` e `--version`.
A instalação persistente/configuração de clientes foi bloqueada pelo executor
por exigir autorização adicional para escrever no perfil do usuário. Não houve
contorno nem auto-configuração.

## V192-003 — Browser Use não entra no conjunto padrão

O projeto já possui Playwright, browser-harness, CDP autenticado e
observabilidade de viewport/console/rede. Browser Use adicionaria sobreposição,
dependência e possível telemetria sem lacuna concreta demonstrada.

## V192-004 — Design específico do projeto

`DESIGN.md` é a fonte visual do LEGACY. Referências externas orientam estrutura
e disciplina, mas não substituem o navy/teal, semântica financeira, densidade e
contratos já aprovados.

