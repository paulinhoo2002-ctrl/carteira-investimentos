# Auditoria da origem compartilhada de Skills

Data: 2026-10-11. Escopo: leitura recursiva de `C:\Projetos\skills`; nenhum
script da origem foi executado. O diretório somava 43 arquivos `SKILL.md`, 38
nomes com frontmatter, três arquivos stub sem frontmatter, duas famílias
duplicadas (`archify`, `browser-harness`) e um arquivo de backup
(`impeccable.bak`). Tamanho observado: 48.731.962 bytes.

## Compatibilidade e destino

Hermes e Codex conseguem ler instruções Markdown. Isso não comprova suporte a
hooks, perfis de subagentes, MCP, CLIs, Python/Node ou scripts citados pela
Skill; esses requisitos precisam existir no runtime. A raiz canônica continua
`C:\Projetos\carteira-investimentos\.agents\skills`. O destino adjacente
`C:\Projetos\carteira-investimentos.agents\skills` não existe e não é uma
raiz de descoberta comprovada, portanto não foi criado nem populado. Não houve
integração nova: capacidades relevantes já existem na raiz canônica ou no
runtime e cópias criariam duplicação. Skills destinadas à Carteira 2.0 foram
rejeitadas para este projeto.

## Inventário classificado

`H/C` significa “instruções Markdown legíveis por Hermes e Codex”; execução de
dependências continua condicional. Risco descreve o pacote/fluxo observado, não
uma vulnerabilidade confirmada.

| Skill e caminho em `C:\Projetos\skills` | Finalidade e dependências observadas | H/C | Classe e decisão LEGACY; risco/duplicação |
|---|---|---|---|
| `ui-ux-pro-max` | Recomendações UX/UI; diretórios `data/`, `scripts/`; Python 3 stdlib segundo instruções. | Sim; Python condicional | OPTIONAL; só pesquisa ampla; grande e sobrepõe `interface-design`/`design-system`. |
| `design-system` | Tokens e especificações; `data/`, `references/`, `scripts/`, `templates/`. | Sim; scripts condicionais | TASK_SPECIFIC; cópia canônica difere; apenas mudança real de tokens; não sobrescrever nem executar scripts no inventário. |
| `doubt-driven-development` | Revisão adversarial de decisões; revisão isolada/subagente ou CLI externo para fluxo completo. | Sim; revisor condicional | TASK_SPECIFIC; já existe idêntica na raiz canônica; instruções exigem atenção a custo e autorização de CLI. |
| `interview-me` | Descoberta de requisitos por entrevista. | Sim; texto | OPTIONAL; somente pedido realmente ambíguo; pode contrariar autonomia quando usado sem necessidade. |
| `mantis-structural-index` | Índice semântico estrutural de código; pacote adicional limitado a licença. | Sim; ferramenta Mantis não confirmada | OPTIONAL; não integrado ao runtime atual; saída pode persistir índices. |
| `caveman` | Comunicação concisa. | Sim; texto | ESSENTIAL; arquivo idêntico já existe na raiz canônica; não duplicar. |
| `mantis-critic` | Triagem crítica de achados. | Sim; ferramentas/perfis Mantis não confirmados | OPTIONAL; só com achados a revisar; sem integração Mantis comprovada. |
| `slides` | Apresentações HTML e visualização. | Sim; referências locais | OPTIONAL; fora do fluxo normal do produto. |
| `browser-testing-with-devtools` | QA via Chrome DevTools MCP. | Sim; requer MCP DevTools | TASK_SPECIFIC; Skill idêntica já canônica; MCP específico não foi confirmado neste runtime. |
| `interface-design` | Implementação e revisão de interfaces. | Sim; `agents/`, `references/` | TASK_SPECIFIC; já canônica, mas conteúdo da origem diverge; não sobrescrever. |
| `mantis-review` | Revisão independente de achados. | Sim; ferramenta/perfis Mantis não confirmados | OPTIONAL; exige artefato e runtime Mantis adequados. |
| `cavecrew` | Delegação compacta a subagentes. | Sim; perfis locais específicos | OPTIONAL; já canônica; instruções de projeto registram perfis `cavecrew-*` ausentes. |
| `mantis-architecture` | Base de conhecimento arquitetural. | Sim; capacidades Mantis não confirmadas | OPTIONAL; não carregar em tarefas comuns; pode criar/alterar documentação. |
| `ui-styling` | UI com shadcn/Radix/Tailwind; referências e scripts. | Sim; stack/dependências específicas | OPTIONAL; usar somente em componente compatível; não corresponde ao Legacy geral. |
| `mantis-report` | Relatório de segurança baseado em achados confirmados. | Sim; pipeline Mantis não confirmado | OPTIONAL; não é auditor autônomo nem substitui evidência. |
| `fact-checker` | Verificação de afirmações; `references/`, `scripts/`, `templates/`, `tests/`, licença. | Sim; Python e fontes externas | OPTIONAL; rede e escrita de artefatos podem ser necessárias. |
| `carteira-migracao-segura` | Migração Legado → Carteira 2.0. | Sim; instruções específicas | REJECTED; nome e escopo direcionam a outro projeto, expressamente fora desta missão. |
| `source-tracker` | Banco persistente de fontes; scripts, templates, testes e referências. | Sim; ferramentas/armazenamento local | OPTIONAL; somente pesquisa com citações; introduz estado local e verificações de links. |
| `playwright` | Automação de navegador por CLI; `agents/`, `assets/`, `references/`, `scripts/`. | Sim; Playwright/browser instalados | TASK_SPECIFIC; arquivo da origem diverge da cópia canônica; não sobrescrever. |
| `caveman-review` | Revisão concisa de código/diff. | Sim; texto | TASK_SPECIFIC; cópia canônica diverge; usar a versão governada, não sincronizar cegamente. |
| `carteira-finance-core-review` | Revisão financeira explicitamente da Carteira 2.0. | Sim; comandos de teste da 2.0 | REJECTED; projeto errado para LEGACY. |
| `planning-with-files` | Planejamento persistente; scripts, templates, exemplos e licença. | Sim; scripts opcionais | OPTIONAL; runtime já oferece alternativas; pode escrever arquivos de plano, usar só com caminho aprovado. |
| `archify` | Diagramas e validação; pacote Node com lockfile, scripts, schemas e testes. | Sim; Node/CLI | OPTIONAL; existe cópia canônica divergente e outro bundle duplicado; não instalar dependências. |
| `caveman-help` | Referência dos modos Caveman. | Sim; README | OPTIONAL; conteúdo de referência; já disponível no runtime, sem cópia canônica local. |
| `carteira-checkpoint-git` | Checkpoint Git explícito para Carteira 2.0. | Sim; comandos Git | REJECTED; alvo do projeto errado. |
| `design` | Roteador de múltiplas tarefas de design; data, referências e scripts. | Sim; scripts opcionais | OPTIONAL; meta-skill sobreposta a tracks específicas; evitar carregar junto com elas. |
| `impeccable` | Auditoria/polish visual; agentes, referências e scripts. | Sim; recursos locais e workflow específico | OPTIONAL; disponível também no runtime; manter track de UI exclusiva e não duplicar. |
| `caveman-compress` | Compactação de texto; scripts. | Sim; script opcional | OPTIONAL; sobrescreve alvo e cria `.original.md`; somente com arquivo explicitamente autorizado. Cópia canônica existente. |
| `caveman-stats` | Estatística real de tokens via hooks Claude; lê log de sessão e grava sufixo de economia. | Parcial; depende de hook Claude | REJECTED; `hooks/caveman-stats.js` e `hooks/caveman-mode-tracker.js` ausentes; risco de privacidade e alegação sem evidência. |
| `carteira-auditoria-real` | Auditoria de dados/ambiente da Carteira 2.0. | Sim; filesystem/browser/IndexedDB específicos | REJECTED; projeto errado e pode acessar artefatos financeiros locais. |
| `mantis-threat-model` | Modelo de ameaças. | Sim; workflow Mantis não confirmado | OPTIONAL; usar apenas se ferramentas e artefato alvo existirem. |
| `source-driven-development` | Decisões apoiadas em documentação oficial. | Sim; ferramentas de pesquisa conforme tarefa | TASK_SPECIFIC; cópia idêntica canônica. |
| `caveman-commit` | Mensagem curta de commit. | Sim; texto | TASK_SPECIFIC; cópia canônica divergente; não é necessário sem commit autorizado. |
| `browser-harness` | Automação/interação via browser harness; referências e pacote Python em um bundle. | Parcial; CDP, Python/pacote e configuração | OPTIONAL; duas versões na origem; regra “always use” não prevalece sobre roteamento LEGACY, que escolhe alternativa suficiente. |
| `banner-design` | Banners e artes; referências, instruções de Python e helpers citados. | Parcial; Python e ferramentas de imagem | OPTIONAL; fora de UI funcional; dependências auxiliares citadas não foram confirmadas. |
| `deep-research` | Pesquisa externa iterativa; avaliações e referências. | Sim; ferramentas/rede conforme execução | OPTIONAL; pode usar rede e consumir tempo/cota; não necessário aqui. |
| `frontend-design` | Direção visual e construção de UI. | Sim; texto/licença | TASK_SPECIFIC; já canônica e idêntica; não copiar novamente. |
| `brand` | Voz/identidade e ativos; scripts, referências e templates. | Sim; scripts e arquivos de marca | OPTIONAL; somente trabalho de marca autorizado; scripts podem alterar tokens/ativos. |

## Arquivos de Skill que não são Skills integráveis

- `impeccable.bak/SKILL.md`: backup de uma linha, sem frontmatter; não integrar.
- `browser-harness-main/src/browser_harness/SKILL.md` e
  `browser-harness-main/skills/browser-harness/SKILL.md`: stubs de 14 bytes,
  sem frontmatter; não integrar.
- `archify-main/archify-main/archify/SKILL.md`: segunda cópia do pacote
  `archify`; não integrar separadamente.
- `browser-harness-main/SKILL.md`: bundle completo, não stub; inclui pacote
  Python, `.env.example`, perfis/arquivos de agente e testes. Não duplicar sem
  necessidade e validação própria.

## Integração aprovada

- **Novas Skills copiadas:** nenhuma. Capacidade essencial ou de uso recorrente
  já está no `.agents/skills` canônico ou no runtime Codex. Superpowers e
  Ponytail são skills/plugins do runtime, não existem na origem compartilhada.
- **`caveman-stats`:** rejeitada até os hooks serem fornecidos, revisados e
  compatibilidade/privacy testados; não estimar token savings.
- **Destino adjacente:** não criado/populado, pois não está configurado como
  raiz de descoberta para Hermes ou Codex. O teste do roteador confirma seleção
  dentro do inventário fornecido, não prova descoberta desse caminho externo.
- **Princípio:** instalar somente após confirmar lacuna concreta, runtime de
  descoberta, dependências, licença e ausência de cópia equivalente.
