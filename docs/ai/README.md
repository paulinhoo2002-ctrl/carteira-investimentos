# AI Documentation

Este é o ponto de entrada para qualquer agente novo que trabalhar com a infraestrutura de IA do projeto.

## Ordem Obrigatória de Leitura

1. **AI_BASELINE.md** - Versão da baseline, arquitetura principal, módulos oficiais, fluxo oficial, skills obrigatórias, convenções do projeto e princípios de desenvolvimento.
2. **PROJECT_CONTEXT.md** - Objetivo do projeto, arquitetura, detalhes do index.html legado, modern/, finance-core, persistence, principais módulos, organização geral, convenções, decisões arquiteturais, fluxo de render, estado global S, regras de persistência e pontos críticos.
3. **PROJECT_RULES.md** - Regras absolutas do projeto para qualquer agente, incluindo nunca duplicar regra financeira, reutilizar finance-core, persistência centralizada, reutilizar saveRfMovimentacao, testes obrigatórios, validação UI, não misturar objetivos, respeitar áreas protegidas, respeitar AGENTS.md e usar skills locais.
4. **ARCHITECTURE.md** - Descrição da arquitetura do sistema gerada pela skill archify, incluindo módulos, dependências, fluxo de dados, renderização, estado global, persistência e responsabilidades.
5. **FINANCIAL_RULES.md** - Regras de negócio existentes extraídas do código atual (finance-core.js e persistence-core.js), incluindo ativos, aportes, vendas, dividendos, renda fixa, eventos RF, saldo, persistência, movimentações, validações, duplicidade e cálculo financeiro.
6. **UI_GUIDELINES.md** - Diretrizes de interface do usuário extraídas do DESIGN.md e práticas observadas, incluindo hierarquia visual, tipografia, contraste, espaçamento, densidade, comportamento em mobile e desktop, e excesso de cards, bordas, brilhos, sombras e gradientes.
7. **WORKFLOW.md** - Fluxo oficial de desenvolvimento: auditoria → implementação → testes unitários → Playwright → Impeccable → Caveman-review → Commit → Push → PR Draft → Ready → Merge → Validação pós-merge, incluindo quando usar cada skill.
8. **SKILLS.md** - Lista e descrição das skills locais do projeto, incluindo frontend-design, interface-design, impeccable, playwright, caveman, caveman-review, caveman-commit, caveman-compress, caveman-help, caveman-stats, cavecrew e archify.
9. **DECISIONS.md** - Registro de decisões arquiteturais permanentes, incluindo uso obrigatório do finance-core, persistência centralizada, estado global S, movimentações de RF, modern/ não substitui legado, UI preserva estado visual, skills em .agents/skills, e docs/ai como memória persistente.
10. **PROJECT_MEMORY.md** - Registro apenas de fatos históricos, como resumos de PRs importantes e decisões permanentes.
11. **AI_CHANGELOG.md** - Registro de mudanças relevantes na arquitetura/processo de IA, como criação da baseline, adoção de skills, adoção do Archify, criação do workflow, criação do PROJECT_MEMORY, criação do setup-ai.ps1, consolidação de regras e decisões.
