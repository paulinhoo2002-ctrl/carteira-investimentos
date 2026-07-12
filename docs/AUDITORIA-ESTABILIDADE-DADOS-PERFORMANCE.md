# Auditoria tecnica de estabilidade, dados, performance e manutencao

## 1. Resumo executivo

O projeto esta funcional e o smoke test local nao mostrou erro critico de console, overflow horizontal ou quebra de navegacao nas areas principais testadas.

Ao mesmo tempo, a base tecnica continua concentrada em um unico `index.html` muito grande, com varias funcoes longas e muita duplicacao da mesma lista de campos entre save, load, cloud sync e backup. O maior risco real encontrado nao e visual: e de sobrescrita ou divergencia de dados em cenarios de duas abas, sincronizacao atrasada e restauracao de backup.

Conclusao pratica:

- nao encontrei quebra critica comprovada no estado atual;
- encontrei risco alto de conflito de escrita entre abas;
- encontrei risco medio de manutencao e performance pela arquitetura monolitica;
- encontrei divida tecnica de documentacao e falta de testes automatizados de comportamento.

## 2. Estado atual do projeto

- Branch atual de auditoria: `audit/estabilidade-performance-dados`
- Merge presente no topo da `main`: `ba8719a` (`Merge pull request #140 from paulinhoo2002-ctrl/style/dividendos-resumo-enxuto`)
- `git status --short`: limpo no inicio da auditoria
- `main` alinhada com `origin/main` antes da criacao da branch
- `index.html` tem cerca de 21.659 linhas e ~1,23 MB
- `npm run build`: passa
- `git diff --check`: passa

Smokes realizados em `http://127.0.0.1:8000/index.html?testMode=1`:

- desktop 1366x768: sem overflow horizontal nas telas testadas
- mobile 390x844: sem overflow horizontal nas telas testadas
- console: sem erro critico
- navegacao por abas principais: funcionou
- alternancia em Dividendos entre `Visao geral`, `Recebimentos` e `Por ativo`: funcionou

Limitacao desta auditoria:

- nao houve validacao com dados reais autenticados nesta etapa;
- nao houve escrita, importacao ou restauracao real de dados de producao.

## 3. Pontos fortes

- `load()` e dividido em blocos `try/catch`, reduzindo o risco de uma falha unica derrubar toda a inicializacao (`index.html:4174-4255`).
- `backupCorruptedStorageValue()` preserva o valor bruto corrompido antes de sobrescrever (`index.html:4117-4128`).
- O modal de backup avisa explicitamente que a importacao substitui a carteira ativa e pede confirmacao antes de restaurar (`index.html:4905-5334`).
- O modo de teste local desliga Firebase, sync, importacao/exportacao e `localStorage` externo, reduzindo risco durante validacao (`index.html:3720-3873`, `index.html:17273-17276`).
- A navegacao principal usa `aria-current` e `details/summary` em grupos de abas, o que ajuda teclado e leitores de tela (`index.html:17210-17218`, `index.html:21232-21254`).
- Nao encontrei nomes de funcoes duplicados no arquivo.
- O smoke test nao gerou erros de console.

## 4. Inventario dos fluxos criticos

| Fluxo | Arquivo / regiao | Observacao |
|---|---|---|
| Inicializacao do app | `index.html:17164-17296`, `index.html:4174-4255` | `load()` restaura estado e `render()` monta a interface inteira |
| Login e logout | `index.html:4261-4703` | `initFirebase()`, `signInGoogle()`, `signOutGoogle()` |
| Selecao e troca de carteira | `index.html:4000-4059`, `index.html:4989-5018` | troca de carteira altera o estado global inteiro |
| Criacao / edicao / exclusao de ativos | `index.html:21288-21353` | `edA()`, `svA()` e fluxo de exclusao local |
| Criacao / edicao / exclusao de aportes | `index.html:21355-21496` | `edP()`, `svP()`, `rmP()` |
| Exclusao | `index.html:4059`, `index.html:21496`, `index.html:21518-21532` | confirmacoes existem, mas a escrita e global |
| `save()` | `index.html:4089-4108` | persiste o estado inteiro no `localStorage` |
| Persistencia local | `index.html:4089-4255`, `index.html:5135-5319` | `save()`, `load()`, `backupCurrentState()`, `applyBackupData()` |
| Firebase | `index.html:4261-4684` | init, sync, upload e listeners de snapshot |
| Sincronizacao | `index.html:4619-4684` | `startCloudSync()`, `queueCloudSave()`, `uploadLocalToCloud()` |
| Backup / restauracao | `index.html:4905-5334` | exporta, importa, confirma e aplica backup |
| Importacao | `index.html:5334-5414`, `index.html:5891-6636`, `index.html:7554-9972` | B3, PDF, nota corretora |
| Exportacao | `index.html:15446-16751`, `index.html:5279-5290` | PDFs e backup JSON |
| Renda fixa | `index.html:18184-18379`, `index.html:10822-11006` | tela principal e normalizacao dos eventos |
| Dividendos | `index.html:20335-20855`, `index.html:11970-12444` | visao consolidada, filtros e auditoria de vinculo |
| Relatorios | `index.html:17110-17171`, `index.html:15446-16751` | resumo e PDFs |
| Assistente inteligente | `index.html:21194-21218`, `index.html:21593-21688` | area separada do dashboard |
| Service worker e cache | `index.html:21777-21787` e `sw.js` | registro no load e reload no `controllerchange` |
| Atualizacao de versao | `docs/VERSION.md`, `index.html:21777-21787` | nota de versao ainda depende de manutencao manual |

## 5. Riscos criticos

Nenhum risco critico comprovado foi reproduzido no smoke test local.

## 6. Riscos altos

| Descricao | Evidencia concreta | Arquivo | Funcao / regiao aproximada | Impacto | Probabilidade | Classificacao | Recomendacao | Tamanho estimado | Backup | Teste de restauracao | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sobrescrita por concorrencia entre abas ou sync atrasada | `save()` grava o estado inteiro; `queueCloudSave()` adia envio; `uploadLocalToCloud()` faz merge do payload inteiro; nao ha resolucao de conflito por versao | `index.html` | `save()`, `queueCloudSave()`, `uploadLocalToCloud()`, `beforeunload` | Edicao recente pode ser substituida por estado mais antigo de outra aba ou de um envio tardio | Media | ALTO | Evitar edicao simultanea em duas abas; numa evolucao futura, adicionar stamp de versao e alerta de conflito | Medio | Sim | Sim | Sim |

## 7. Riscos medios

| Descricao | Evidencia concreta | Arquivo | Funcao / regiao aproximada | Impacto | Probabilidade | Classificacao | Recomendacao | Tamanho estimado | Backup | Teste de restauracao | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Monolito de interface e funcoes muito grandes | `index.html` com 21.659 linhas e 1,23 MB; `dividendsLegacyTab` 514 linhas; `printPdfReport` 433; `irpfTabLegacy` 331; `reportPdfPreview` 329; `b3MovementReviewModal` 297; `irpfTabPremium` 277 | `index.html` | Varios blocos de render e modais | Manutencao mais lenta e risco maior de regressao lateral | Alta | MEDIO | Nao dividir agora; planejar fragmentacao por area somente depois de testes de comportamento | Grande | Nao | Nao | Sim |
| Schema de persistencia duplicado em varios pontos | A mesma lista de campos aparece em `backupCurrentState`, `save`, `cloudPayload`, `applyCloudData` e no restore local | `index.html` | `backupCurrentState()`, `save()`, `cloudPayload()`, `applyCloudData()` | Campo novo pode ser salvo em um lugar e esquecido em outro, gerando backup incompleto ou restaura sem um pedaco do estado | Media | MEDIO | Centralizar a lista de campos persistidos antes de ampliar o modelo de dados | Medio | Sim | Sim | Sim |
| Render completo em toda navegacao | `go()` chama `save(); render();`; `render()` recria `root.innerHTML=app()` e chama `bind()` de novo | `index.html` | `render()`, `go()` | Custo maior em navegacao e maior superficie para bugs visuais quando uma area muda | Alta | MEDIO | Manter assim no curto prazo; otimizar apenas com teste de regressao e medicao real | Grande | Nao | Nao | Sim |
| Falta de testes automatizados de comportamento | `package.json` define `build` como checagem de existencia de arquivos, sem validar fluxos ou DOM | `package.json` | scripts | Regressoes funcionais dependem muito de validacao manual | Alta | MEDIO | Adicionar pelo menos um smoke test automatizado na proxima etapa segura | Medio | Sim | Sim | Sim |

## 8. Riscos baixos

| Descricao | Evidencia concreta | Arquivo | Funcao / regiao aproximada | Impacto | Probabilidade | Classificacao | Recomendacao | Tamanho estimado | Backup | Teste de restauracao | Rollback |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Documentacao desalinhada com o estado atual | `docs/VERSION.md` ainda aponta `v1.1.0-rc1` / `e8a1e6c`; `README.md` ainda referencia a ultima grande entrega como Fase 57 | `docs/VERSION.md`, `README.md`, `CHANGELOG.md` | docs de referencia | Pode confundir a leitura sobre a versao real e o ultimo merge | Alta | BAIXO | Atualizar a documentacao depois da estabilizacao | Pequeno | Nao | Nao | Sim |
| Labels curtos em mobile reduzem clareza | Exemplo: `Rentab.` no menu inferior mobile; varios pontos usam abreviacoes curtas | `index.html` | navegacao mobile | Leitura menos imediata para usuario leigo | Media | BAIXO | Trocar abreviacoes somente em fase visual dedicada e com validacao mobile | Pequeno | Nao | Nao | Sim |

## 9. Riscos de perda de dados

### Cenarios avaliados

| Cenario | Protecao existente | Residuo de risco |
|---|---|---|
| Navegador fechado durante salvamento local | `save()` grava `localStorage` de forma sincrona | Baixo para dados locais; alto somente para sync remoto atrasado |
| Internet indisponivel | `uploadLocalToCloud()` captura erro e preserva o estado local | Divergencia entre local e nuvem |
| Firebase indisponivel | `initFirebase()` / `startCloudSync()` nao derrubam a tela; erro vai para toast | Nao perde o local, mas pode acumular pendencia de sync |
| Duas abas abertas | Nenhuma resolucao de conflito por versao foi encontrada | Alto risco de last write wins |
| Importacao repetida | Ha confirmacao antes de substituir a carteira | Risco operacional aceitavel, pois a acao e proposital |
| Restauracao de backup antigo | `confirmBackupImport()` avisa que o backup substitui os dados atuais | Pode sobrescrever dados novos se o usuario confirmar o arquivo errado |
| Arquivo de backup incompleto | `backupFromRaw()` valida formato basico antes de aplicar | Um JSON parcialmente valido ainda pode ser aceito se tiver chaves conhecidas |
| Limpeza do navegador / troca de computador | Existe exportacao de backup JSON | Sem backup externo, o risco e o mesmo de qualquer app local |
| Cache antigo / versao nova | Service worker registra e troca controller, mas depende de atualizacao do navegador | Baixo a medio, depende do fluxo de update do PWA |
| Salvamento parcial / falha na sincronizacao | Local e cloud sao camadas separadas | Local preservado; cloud pode ficar desatualizado |

## 10. Gargalos de performance

Principais fontes de custo observadas:

- `render()` reconstrui a interface inteira em cada chamada (`index.html:17164-17296`).
- `go()` salva e renderiza de novo a cada troca de aba (`index.html:21259-21269`).
- Funcoes muito grandes concentram render + regra + marcacao visual no mesmo bloco:
  - `dividendsLegacyTab` (`20342-20855`)
  - `printPdfReport` (`15446-15878`)
  - `irpfTabLegacy` (`13231-13561`)
  - `reportPdfPreview` (`16751-17079`)
  - `b3MovementReviewModal` (`9681-9977`)
  - `irpfTabPremium` (`13562-13838`)
  - `rendaFixaTab` (`18184-18379`)
  - `apTab` (`19219-19418`)
- Algumas areas fazem varias filtragens sobre os mesmos dados, especialmente relatatorios, dividendos e revisoes B3/IRPF.
- Varios handlers chamam `save(); render();` de forma encadeada, o que aumenta repaints e dificulta rastrear custo real.

## 11. Problemas de usabilidade

Nao encontrei bloqueio grave de usabilidade no smoke test, mas ha pontos de atencao:

- areas muito densas como backup, PDF, IRPF e revisoes B3 exigem mais leitura e rolagem interna do que o ideal;
- a tela principal ainda depende de muitas superficies com informacao concorrendo por atencao;
- o menu mobile usa abreviacoes curtas em alguns pontos, o que reduz autoexplicacao;
- a manutencao de muitos cards e modais em um unico arquivo aumenta a chance de pequenas inconsistencias visuais reaparecerem.

## 12. Problemas de acessibilidade

Validacoes locais:

- `Tab` percorre os controles principais da barra superior e da navegacao;
- `Visao geral`, `Recebimentos` e `Por ativo` de Dividendos funcionam com teclado;
- `details/summary` continuam sendo a base de varios blocos recolhiveis;
- nao houve erro de console durante o smoke.

Pontos de atencao:

- algumas labels de mobile continuam curtas demais para leitura rapida;
- modais e tabelas densas devem continuar sendo revisados com foco e teclado antes de qualquer expansao funcional;
- areas com muito texto pequeno continuam dependentes de contraste aceitavel no tema claro e no escuro.

## 13. Problemas de documentacao

- `docs/VERSION.md` nao reflete o merge mais recente.
- `README.md` e `CHANGELOG.md` ainda usam marcos mais antigos da evolucao do projeto.
- `docs/ROADMAP.md` segue util, mas nao foi ajustado para a ultima sequencia de merges e entregas.

Impacto:

- nao quebra o app;
- porem pode induzir a leitura errada do estado real do produto e do que ja foi validado.

## 14. Divida tecnica

1. `index.html` continua sendo o monolito central do app.
2. O schema persistido aparece repetido em varios metodos.
3. Ha muitos fluxos de tela misturados na mesma unidade de manutencao.
4. O teste padrao de build e apenas estrutural; nao cobre comportamento.
5. O fluxo de sincronizacao ainda depende de estado global e de timers.

Essa divida nao exige reescrita total agora, mas pede disciplina de fases pequenas.

## 15. Itens que nao devem ser alterados agora

- calculos financeiros existentes;
- `save()`;
- Firebase/Auth;
- backup/restauracao;
- sincronizacao;
- `sw.js`;
- `firestore.rules`;
- `package.json`;
- formato dos dados persistidos;
- areas de importacao/exportacao ate existirem testes de comportamento;
- renderizacao principal ate existir cobertura minima;
- qualquer tentativa de reescrever o monolito de uma vez.

## 16. Melhorias rapidas e seguras

1. Atualizar `README.md`, `docs/VERSION.md` e `docs/CHANGELOG.md` para refletir o merge atual.
2. Explicitar no proprio app o cuidado com duas abas abertas ao editar a mesma carteira.
3. Centralizar a lista de campos persistidos em um helper pequeno, sem mudar o formato salvo.

## 17. Melhorias que exigem testes previos

1. Criar um helper unico de serializacao para `save`, `backup` e `cloud sync`.
2. Reduzir o custo do `render()` separando telas mais pesadas em partes menores.
3. Adicionar um smoke test automatizado para as abas e modais centrais.
4. Implementar conflito de escrita entre abas/dispositivos com aviso ao usuario.
5. Fragmentar `dividendsLegacyTab`, `irpfTabPremium`, `reportPdfPreview` e outras funcoes grandes.

## 18. Melhorias que devem ser evitadas

- reescrever o projeto em outro framework sem necessidade comprovada;
- quebrar `index.html` em muitos pedacos antes de haver cobertura minima;
- trocar o schema de backup ou cloud de uma vez;
- remover o caminho atual de localStorage sem plano de transicao;
- mexer em Firebase, backup ou sincronizacao sem validar restauracao;
- otimizar performance apenas por intuicao sem medir o custo real.

## 19. Roadmap recomendado em fases pequenas

### Fase 1

- atualizar documentacao de versao e estado atual;
- registrar limitacoes conhecidas de multi-abas e restauracao;
- manter o app como esta funcionalmente.

### Fase 2

- centralizar o schema de persistencia em um helper pequeno;
- adicionar checagem basica para evitar sobrescrita obvia entre abas;
- validar exportacao/importacao com uma amostra de backup real.

### Fase 3

- introduzir smoke test automatizado para troca de abas, backup e restore;
- medir o custo das funcoes mais pesadas;
- separar somente os blocos realmente caros.

### Fase 4

- reduzir o monolito de `index.html` em partes menores;
- manter compatibilidade total com dados antigos;
- so depois avaliar melhorias mais amplas.

## 20. Plano de recuperacao caso uma mudanca futura de errado

1. Interromper a mudanca e voltar para a branch anterior limpa.
2. Exportar um backup JSON antes de tocar no fluxo de persistencia.
3. Validar o restore do backup em ambiente local isolado.
4. Se o problema envolver dados, restaurar o ultimo backup conhecido como bom.
5. Se o problema envolver UI, reverter apenas o menor diff possivel.
6. Se o problema envolver sync, manter o local intacto e parar o envio remoto ate entender o erro.
7. Registrar o ponto exato de falha antes de tentar outra abordagem.

## Validacao final da auditoria

- Revisor mental aplicado com Caveman: foco em simplicidade e mudancas pequenas.
- Revisor mental aplicado com Impeccable: foco em clareza, responsividade, teclado e consistencia visual.
- Nenhum arquivo funcional foi alterado nesta auditoria.
- Somente este documento de auditoria deve ser criado.
