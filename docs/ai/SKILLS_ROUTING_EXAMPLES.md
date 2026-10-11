# Exemplos de roteamento de Skills

Os exemplos usam somente o inventário presente no comando. Troque a lista pela
disponibilidade real do runtime. O seletor recomenda nomes; o agente ainda deve
ler cada `SKILL.md` e seguir `AGENTS.md`.

```powershell
# Financeiro: uma Skill específica por padrão.
node scripts/qa/select-skills.js financial --available=doubt-driven-development,source-driven-development

# Fontes oficiais: habilita a segunda Skill apenas com gatilho explícito.
node scripts/qa/select-skills.js financial --available=doubt-driven-development,source-driven-development --triggers=officialSource

# Firebase com fronteira financeira: no máximo duas Skills.
node scripts/qa/select-skills.js firebase --available=firebase-security-rules-auditor,doubt-driven-development --triggers=financialBoundary

# UI com acessibilidade: não seleciona Playwright automaticamente.
node scripts/qa/select-skills.js ui --available=interface-design,web-quality-audit --triggers=accessibility

# Browser: escolhe somente uma alternativa primária disponível.
node scripts/qa/select-skills.js browser --available=browser-harness,playwright,browser-testing-with-devtools

# Backup, security, docs, release e descoberta usam as categorias correspondentes.
node scripts/qa/select-skills.js backup --available=doubt-driven-development,caveman-review
node scripts/qa/select-skills.js security --available=firebase-security-rules-auditor,source-driven-development
node scripts/qa/select-skills.js documentation --available=caveman-review,archify
node scripts/qa/select-skills.js release --available=verification-before-completion,caveman-commit --triggers=gitCloseout
node scripts/qa/select-skills.js skillDiscovery --available=find-skills
```

`missingRequiredSkills` e `missingTriggeredSkills` representam lacunas; o helper não instala, procura pela
rede, invoca ferramentas, substitui Skills ausentes ou autoriza ações. Se um
requisito essencial estiver ausente, a missão precisa registrar a limitação e
decidir pela governança se pode continuar com segurança.
