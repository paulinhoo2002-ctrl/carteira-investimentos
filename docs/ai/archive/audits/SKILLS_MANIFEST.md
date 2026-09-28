# Manifesto de Skills e ferramentas

Status: V192 — avaliação curada; nenhuma dependência de runtime adicionada.

| Item | Fonte/versão | Instalação | Status | Uso/removal |
|---|---|---|---|---|
| `browser-testing-with-devtools` | `.agents/skills` em `origin/main` | Git-tracked | KEEP | browser diagnosis; remover somente com revisão |
| `doubt-driven-development` | `.agents/skills` em `origin/main` | Git-tracked | KEEP | financeiro/persistência/incerteza |
| `interview-me` | `.agents/skills` em `origin/main` | Git-tracked | KEEP | pedido realmente subespecificado |
| `source-driven-development` | `.agents/skills` em `origin/main` | Git-tracked | KEEP | docs primárias e APIs |
| `references` | `.agents/skills/references` | Git-tracked auxiliar | PRESERVE | material compartilhado, não roteável |
| Codebase Memory MCP | `DeusData/codebase-memory-mcp` v0.8.1 | release Windows verificado, não configurado | BLOCKED_INSTALL | checksum verificado; instalação persistente bloqueada pelo executor |
| Superpowers | `obra/superpowers` | plugin externo | SKIP | sobreposição com governança; reavaliar em fase própria |
| Karpathy principles | `multica-ai/andrej-karpathy-skills` | extração documental | CURATED | princípios incorporados em `ENGINEERING_PRINCIPLES.md` |
| Addy agent-skills | `addyosmani/agent-skills` | não copiado | EVALUATED | conceitos de processo; evitar pacote redundante |
| Awesome DESIGN.md | `VoltAgent/awesome-design-md` | não copiado | EVALUATED | estrutura inspirou este `DESIGN.md` |
| Browser Use | `browser-use/browser-use` | não instalado | SKIP_REDUNDANT | Playwright/CDP/browser tools existentes cobrem o caso |
| Defuddle | `kepano/defuddle` | não instalado | SKIP | extração web não é requisito atual |
| Caveman | `JuliusBrussee/caveman` | não instalado | SKIP | compressão não deve remover evidência |
| Agent Reach | `Panniantong/Agent-Reach` | não instalado | SKIP | nenhuma fonte externa inacessível demonstrada |
| Composio | `ComposioHQ/composio` | não instalado | SKIP | sem necessidade de SaaS/integradores |
| Marketing skills | `coreyhaines31/marketingskills` | não instalado | SKIP | produto pessoal, sem escopo de growth |

## Política de atualização

Fixar versão/commit quando uma ferramenta externa for instalada. Revisar
release, checksum, permissões, rede, telemetria, arquivos alterados, teste de
compatibilidade e procedimento de remoção. Não acompanhar `latest` cegamente.

