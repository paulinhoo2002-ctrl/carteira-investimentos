# AGENTS.md

Documento de governanca aplicavel a qualquer agente humano ou IA operando no
repositorio `paulinhoo2002-ctrl/carteira-investimentos` (Hermes, Codex, Claude
Code, GitHub Copilot e similares).

Objetivo: garantir que o notebook e o computador compartilhem o mesmo conjunto
de regras para que a evolucao do projeto seja previsivel, reversivel e sem
regressoes funcionais.

Este arquivo complementa (e nao substitui) as instrucoes oficiais ja
versionadas em `docs/FLUXO-DESENVOLVIMENTO.md`, `docs/ESTABILIDADE.md`,
`docs/project-phases-roadmap.md`, `REGRESSION_CHECKLIST.md` e
`.github/PULL_REQUEST_TEMPLATE.md`. Em caso de conflito, siga a regra mais
conservadora que nao altere o que ja foi documentado em outros lugares.

## Identidade do projeto

- Repositorio: `paulinhoo2002-ctrl/carteira-investimentos`.
- Finalidade: controle pessoal de investimentos.
- Comportamento existente, dados historicos e persistencia sao ativos a
  preservar.
- Nao reconstruir o sistema do zero em nome de modernizacao ampla.

## Princípios Caveman

- Mudancas minimas; preferir alteracoes pontuais e verificaveis.
- Simplicidade acima de elegancia abstrata.
- Evitar complexidade desnecessaria, dependencias novas ou abstracoes sem
  motivo.
- Preservar dados existentes (carteira, proventos, renda fixa, metas, backup).
- Rollback facil: cada mudanca deve poder ser revertida de forma simples.
- Nao reconstruir funcoes estaveis a cada fase.
- Uma mudanca por objetivo; diffs pequenos e tematicos.
- Preferir extracoes pequenas e reversiveis sobre reescritas amplas.

## Princípios Impeccable

- Auditar antes e depois da mudanca.
- Verificar qualidade de codigo, clareza e consistencia.
- Acessibilidade (foco, contraste, leitura por leitor de tela).
- Responsividade (390, 768, 1366, 1920).
- Performance (sem recalculo redundante, sem listener orfao).
- Riscos (dados, persistencia, compatibilidade).
- Regressoes (manuais e funcionais).
- Testar somente os arquivos diretamente relacionados com a mudanca e tambem as suites gerais exigidas pela fase, pelo `docs/project-phases-roadmap.md` ou pela governanca do projeto (build, `npm.cmd test`, smoke/guard documental quando aplicavel). Esta regra nao pode ser usada para pular testes, builds ou guards obrigatorios.
- Revisar o diff completo antes de commit.

## Interface Design

Em mudancas visuais, revisar:

- Hierarquia visual e ordem de leitura.
- Tipografia (tamanhos, pesos, fluencia da fonte).
- Contraste (legibilidade em claro e escuro).
- Espacamento e densidade.
- Comportamento em mobile (390/768) e desktop (1366/1920).
- Excesso de cards, bordas, brilhos, sombras e gradientes.

## Playwright

Apos mudancas visuais, validar obrigatoriamente:

- 390px, 768px, 1366px, 1920px.
- Navegacao principal e secundaria.
- Filtros, abas, ordenacoes, expansoes.
- Overflow horizontal (proibido).
- Console (sem erro vermelho novo).
- Page errors e request failures (somente relevantes).
- Fluxos diretamente alterados.

## Governanca Git

- Uma branch por objetivo.
- Uma PR por objetivo.
- Nao misturar documentacao, visual e funcional na mesma PR.
- Nao fazer merge sem autorizacao explicita do usuario.
- Nao marcar Ready sem autorizacao explicita.
- Nao fazer deploy manual sem autorizacao.
- Nao iniciar a proxima fase automaticamente.
- Sempre encerrar documentalmente as fases funcionais antes da proxima.
- Squash merge obrigatorio.
- Nao usar force push sem autorizacao explicita.
- Nao trabalhar na mesma branch simultaneamente em duas maquinas.

## Troca entre notebook e computador

Antes de trabalhar (notebook ou computador):

```powershell
git switch main
git pull --ff-only origin main
git status
```

Ao continuar uma branch remota existente:

```powershell
git fetch origin
git switch --track origin/NOME-DA-BRANCH
```

Antes de trocar de maquina:

- Working tree limpo.
- Commit criado localmente.
- Branch enviada para `origin` (`git push`).
- PR draft aberta quando aplicavel.
- Nunca deixar trabalho importante somente local.
- Nunca copiar manualmente a pasta do projeto entre maquinas; usar Git.

## Regras Windows

- Usar `npm.cmd` ou `cmd /c npm` ao inves de `npm` cru no PowerShell.
- Nao usar `Set-ExecutionPolicy Unrestricted`.
- Nao rodar `npm audit fix` fora de fase especifica autorizada.
- Nao expor tokens, credenciais ou dados reais no chat ou em codigo.
- Nao pedir que o usuario envie tokens pelo chat.
- Agentes nao podem executar `git credential fill`, `git credential-manager get` ou comandos equivalentes para extrair tokens ou senhas armazenados.
- Agentes nao podem ler, imprimir, copiar, transformar ou reutilizar credenciais do Windows Credential Manager, do Git credential helper ou de qualquer outro cofre do sistema.
- A autenticacao deve ocorrer somente pelos fluxos normais e interativos do Git, GitHub Desktop ou ferramenta oficialmente conectada ao repositorio.
- Se uma operacao exigir autenticacao indisponivel, realizar apenas a parte possivel e reportar a limitacao ao usuario.
- Nunca contornar falta de `gh`, de token ou de autenticacao extraindo credenciais armazenadas.

## Areas protegidas

Nao alterar sem autorizacao explicita e fase especifica:

- Formulas financeiras.
- Dados historicos persistidos.
- Schema, persistencia, localStorage ou equivalente.
- Firebase, Auth, sincronizacao, backups.
- `firestore.rules`.
- `sw.js`.
- `manifest.json`.
- `finance-core.js`.
- `persistence-core.js`.
- `modern/src`.
- `modern/dist`.
- Logica de "zero versus ausencia".

## Frontend moderno

- O frontend moderno continua somente leitura.
- `modern/dist` deve permanecer fora do indice (`git ls-files modern/dist` retorna vazio).
- Nao migrar telas automaticamente para o moderno.
- Nao alterar o bridge legado/moderno sem fase propria.
- Nao substituir o legado sem paridade funcional comprovada e autorizacao.

## Estado atual do projeto (snapshot)

- Branch oficial: `main`.
- SHA de referencia no momento da criacao deste arquivo:
  `470d5682fe9831445b9cee5e457c0d21ad66fff5`.
- Este SHA e um snapshot; nao precisa permanecer inalterado em trabalhos
  futuros e nao deve ser tratado como gatilho de erro.
- Fonte oficial e atualizada do estado das fases, do SHA da `main`, da
  situacao documental e do que esta ou nao autorizado e
  `docs/project-phases-roadmap.md`. Sempre consulte esse arquivo
  antes de tomar decisoes sobre fases, PRs ou merge.
- Fase 214: funcionalmente e documentalmente encerrada.
- Fase atual: nenhuma.
- Implementacao ativa: nenhuma.
- Fases 204C, 210 e 212: continuam nao autorizadas.
- Fase 216: nao iniciada.
- Intencao registrada: reduzir progressivamente o tamanho e o acoplamento do
  `index.html` continua como intencao, sem fase numerada ou autorizada.

## Modularizacao futura da `index.html`

Regra para quando essa modularizacao vier a ser autorizada:

- Reduzir o `index.html` gradualmente, em extracoes pequenas.
- Uma extracao por fase; sem reconstrucao ampla.
- Nao comecar por Firebase, sincronizacao, persistencia ou estado global.
- Preservar comportamento visivel e dados.
- Testes antes e depois de cada extracao.
- Rollback simples e comprovado.
- Comparar visual e funcionalmente antes e depois.

## Regra de parada

Sempre parar e pedir autorizacao explicita antes de:

- Commit.
- Push.
- Abrir PR.
- Marcar Ready.
- Merge.
- Deploy.
- Iniciar nova fase.
- Mudanca de schema.
- Alteracao de persistencia.
- Instalacao de dependencia.

Ate nova orientacao, este `AGENTS.md` nao substitui nem altera qualquer
documento oficial existente: ele somente consolida as regras que Hermes,
Codex e outros agentes devem seguir no fluxo diario.
