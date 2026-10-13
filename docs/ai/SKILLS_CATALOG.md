# Catálogo e gate de Skills

`skills-catalog.json` é o registro versionado do inventário físico observado. Cada entrada preserva o ID e descrição do frontmatter, caminho da instrução, SHA-256 observado na origem e, separadamente, o SHA-256 do snapshot versionado quando presente. A origem local é uma fotografia de host, não uma garantia de instalação em outros runtimes.

`SKILLS_INDEX.md` resume finalidade e disponibilidade. `skills-routing.json` continua sendo a única configuração de seleção por categoria; referências que dependem do runtime ficam explicitadas em `runtimeOnlySkills`. `scripts/qa/select-skills.js` não carrega nem instala skills.

## Gate

- `npm run verify:skills`: compara a descoberta física de primeiro nível desta cópia com o catálogo, exige Skills marcadas como versionadas, rejeita IDs duplicados e rotas sem registro local ou runtime explícito.
- `npm run verify:skills -- --skills-root "C:\Projetos\carteira-investimentos\.agents\skills" --strict-source`: comparação recursiva/hash contra o snapshot de origem registrado. Execute apenas quando a origem autorizada estiver disponível; drift exige revisão e atualização deliberada do catálogo.
- `npm run test:skills-routing`: inclui testes de drift e executa o gate padrão, para que a validação de QA/CI detecte catálogo desatualizado.

Candidatos duplicados, backups e documentos internos sem frontmatter permanecem listados como excluídos. Não são carregados pelo router. Quatro Skills com escopo explícito da Carteira 2.0 estão bloqueadas para roteamento LEGACY.

## Limites de metadados

O catálogo não afirma que analisou o corpo completo de cada Skill. Quando dependências, anti-gatilhos ou riscos não puderam ser confirmados, os campos declaram `NOT_AUDITED` ou `NOT_ASSESSED_FROM_FRONTMATTER`. A Skill nunca substitui `AGENTS.md`, contratos financeiros, gates humanos ou autorização explícita.

Compatibilidade significa apenas que o formato Markdown pode ser descoberto pelos runtimes Hermes e Codex; disponibilidade do pacote e das ferramentas referenciadas continua sujeita à descoberta por sessão. Duplicatas exatas/por ID estão listadas; sobreposição funcional permanece `NOT_AUDITED_FROM_FULL_SKILL_TEXT` quando não comprovada.
