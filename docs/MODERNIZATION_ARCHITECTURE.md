# Arquitetura alvo da modernizacao

## 1. Estado atual

O projeto atual continua funcional em producao, mas a maior parte da interface e da orquestracao ainda esta concentrada em `index.html`.

Pontos objetivos do estado atual:

- `index.html` concentra boa parte da interface, do CSS inline e da orquestracao da aplicacao;
- modulos ja extraidos e reutilizados:
  - `finance-core.js`;
  - `persistence-core.js`;
  - `report-asset-row.js`;
- suites de teste atuais:
  - financeiro;
  - persistencia;
  - backup/restore;
  - load;
  - roundtrip;
  - extraction;
  - UI;
  - performance;
- total atual de `145` testes;
- CI existente em GitHub Actions;
- deploy atual em Vercel;
- `Firebase/Auth`, sync cloud e backup/restauracao seguem como areas sensiveis.

Leitura importante:

- o sistema atual nao deve ser tratado como descartavel;
- a modernizacao precisa preservar o que ja esta estavel.

## 2. Problemas que a modernizacao pretende resolver

Problemas comprovados e relevantes:

- monolito dificil de manter;
- dependencias implicitas entre funcoes globais;
- renderizacao extensa e sensivel a regressao lateral;
- HTML, CSS e JavaScript muito acoplados;
- risco elevado de mudancas colaterais;
- dificuldade de tipagem progressiva;
- dificuldade de testar por tela e por responsabilidade;
- dificuldade de evolucao visual consistente sem tocar varias areas ao mesmo tempo.

O que este documento nao afirma:

- nao afirma que o sistema atual precisa ser reescrito;
- nao afirma que a troca de stack por si so resolve todos os riscos;
- nao afirma que Firebase, schema ou persistencia devem mudar agora.

## 3. Principios

- preservar dados;
- preservar comportamento;
- migracao incremental;
- compatibilidade temporaria;
- uma tela por vez;
- uma responsabilidade por modulo;
- testes antes da migracao;
- rollback simples;
- producao nunca depende de codigo parcialmente migrado;
- evitar abstracoes prematuras.

## 4. Arquitetura alvo

Estrutura alvo proposta:

```text
src/
  app/
  components/
  features/
  domain/
  services/
  infrastructure/
  styles/
  types/
  legacy/
```

Responsabilidade de cada diretorio:

- `app/`
  - bootstrap da aplicacao React;
  - shell principal;
  - roteamento interno e providers do lado moderno.
- `components/`
  - componentes visuais reutilizaveis;
  - elementos de interface sem regra de negocio propria.
- `features/`
  - telas e fluxos por area de negocio;
  - agrupamento por contexto funcional.
- `domain/`
  - calculos financeiros;
  - modelos;
  - snapshots;
  - regras puras de negocio.
- `services/`
  - casos de uso;
  - coordenacao de acoes;
  - adaptacao entre dominio e interface.
- `infrastructure/`
  - `localStorage`;
  - Firebase;
  - rede;
  - Yahoo;
  - backup;
  - importacao e exportacao.
- `styles/`
  - tokens visuais;
  - estilos compartilhados do shell novo;
  - pontos de integracao com o legado.
- `types/`
  - contratos TypeScript;
  - tipos de dominio, snapshots e infraestrutura.
- `legacy/`
  - adaptadores de coexistencia;
  - bridges temporarias com o fluxo atual;
  - pontos de fallback para a interface legada.

Esta estrutura e alvo de migracao. Ela nao sera criada nesta fase.

## 5. Fronteiras obrigatorias

### Dominio

Deve concentrar:

- calculos financeiros;
- snapshots;
- regras de negocio;
- modelos;
- funcoes puras.

Nao deve acessar:

- DOM;
- `localStorage`;
- Firebase;
- fetch;
- Vercel;
- detalhes de UI.

### Aplicacao

Deve concentrar:

- casos de uso;
- coordenacao de acoes;
- preparacao de dados para interface;
- decisao de qual adaptador de infraestrutura chamar.

Nao deve:

- renderizar HTML diretamente;
- implementar infraestrutura concreta dentro do caso de uso.

### Infraestrutura

Deve concentrar:

- `localStorage`;
- Firebase;
- rede;
- Yahoo;
- backup;
- importacao/exportacao.

Nao deve:

- conter regra financeira central;
- decidir comportamento de tela.

### Interface

Deve concentrar:

- React;
- componentes;
- paginas;
- modais;
- navegacao;
- formularios;
- acessibilidade.

Nao deve:

- acessar `localStorage` diretamente;
- acessar Firebase diretamente;
- recalcular regra de negocio na camada visual.

## 6. Estrategia de coexistencia

Coexistencia proposta entre legado e React:

- a aplicacao atual continua como caminho principal no inicio;
- Vite entra em paralelo, sem remover o build atual;
- o React deve montar primeiro em um container isolado;
- a primeira migracao deve ser de uma tela somente leitura;
- toda tela moderna precisa ter fallback claro para a tela legada;
- nao deve haver compartilhamento por manipulacao direta de DOM;
- a comunicacao deve ocorrer por adaptadores explicitos;
- codigo legado so pode ser removido quando a nova tela estiver validada.

Como impedir dois sistemas de alterarem os mesmos dados ao mesmo tempo:

- nas fases iniciais, o estado legado continua como fonte de verdade;
- as telas React iniciais recebem snapshots somente leitura;
- escritas continuam exclusivamente no legado ate a fase especifica de formularios;
- nenhum componente React acessa `save()` ou `load()` diretamente sem adaptador controlado;
- cada fluxo de escrita precisa ter um unico orquestrador ativo.

## 7. Ordem das proximas fases

### Fase 161

Base Vite + React + TypeScript em paralelo, sem substituir a aplicacao atual.

### Fase 162

Tipos e contratos de dominio, sem migrar calculos.

### Fase 163

CSS base e tokens visuais separados.

### Fase 164

Shell, tema e navegacao React isolados.

### Fase 165

Primeira tela simples e somente leitura.

### Fase 166

Telas de consulta de ativos e relatorios.

### Fase 167

Formularios e operacoes de escrita.

### Fase 168

Backup, importacao, exportacao e relatorios sensiveis.

### Fase 169

Auth, Firebase e sincronizacao.

### Fase 170

Remocao progressiva do monolito legado.

### Fase 171

Prettier, ESLint e padronizacao completa.

### Fase 172

Auditoria final de acessibilidade, performance, seguranca e dados.

## 8. Primeira tela candidata

Tela escolhida:

- previa somente leitura de Ativos em Relatorios.

Justificativa:

- e somente leitura;
- nao grava dados;
- nao depende de Firebase;
- nao depende de backup/restauracao;
- nao possui autenticacao propria;
- e visualmente isolavel;
- ja possui cobertura de testes;
- ja passou por validacao manual;
- permite comparacao direta com o legado;
- conversa bem com a extracao ja feita em `report-asset-row.js`.

Por que nao escolher outra tela primeiro:

- dashboard inicial ainda mistura mais agregacoes e areas visuais;
- formularios e operacoes de escrita aumentariam risco cedo demais;
- telas com backup, importacao, auth ou persistencia violariam a regra de baixo risco.

## 9. Estrategia de dados

- o estado legado continua como fonte de verdade inicialmente;
- React recebe snapshots somente leitura por adaptador;
- escritas continuam no legado nas primeiras fases;
- nenhum componente acessa `localStorage` diretamente;
- nenhum componente acessa Firebase diretamente;
- servicos encapsulam infraestrutura;
- tipos devem refletir o schema atual antes de qualquer mudanca de schema;
- toda divergencia entre legado e React deve ser tratada como bug de equivalencia.

## 10. Estrategia de testes

- manter os `145` testes atuais;
- adicionar testes do novo codigo sem remover os antigos;
- criar testes de equivalencia legado versus React;
- manter testes de dominio em Node;
- adicionar testes de componentes para a nova interface;
- criar testes de integracao para adaptadores;
- usar UI/E2E apenas em fluxos criticos;
- manter CI executando legado e moderno durante a coexistencia.

Regra de convivencia:

- migracao nova so avanca se a cobertura anterior continuar passando;
- a suite moderna cresce sem enfraquecer a suite legada.

## 11. Estrategia de CSS

- nao mover todo o CSS de uma vez;
- introduzir tokens visuais primeiro;
- criar estilos do shell novo isoladamente;
- evitar colisoes com seletores legados;
- usar classes locais ou CSS Modules;
- nao adotar biblioteca visual inicialmente;
- preservar responsividade atual;
- validar desktop `1366x768` e mobile `390x844`.

## 12. Estrategia de build e deploy

- Vite entra inicialmente em paralelo;
- o build legado continua valido;
- nenhum deploy depende do novo bundle antes de validacao dedicada;
- Vercel continua com rollback simples;
- CI precisa executar build legado e build moderno durante a coexistencia;
- qualquer mudanca de output final fica para fase propria;
- PWA/service worker permanece legado ate fase dedicada.

## 13. Riscos

| Risco | Impacto | Mitigacao |
| --- | --- | --- |
| Duplicacao temporaria de UI | aumento de manutencao e chance de divergencia | migrar uma tela por vez e remover legado apenas depois de equivalencia comprovada |
| Divergencia entre legado e React | inconsistencias funcionais e visuais | testes de equivalencia, validacao manual e snapshots comparaveis |
| Estado duplicado | risco de dados inconsistentes | manter legado como fonte de verdade nas fases iniciais |
| Dois fluxos de escrita | corrupcao ou sobrescrita indevida | manter escrita apenas no legado ate fase especifica de formularios |
| CSS conflitante | regressao visual lateral | isolamento progressivo, tokens e escopo controlado |
| Aumento temporario do tamanho do projeto | custo maior de manutencao durante a migracao | aceitar coexistencia temporaria com revisao por fase |
| Rollback dificil apos remocao do legado | risco operacional em producao | so remover codigo antigo com rollback documentado e equivalencia validada |
| Firebase/Auth migrados cedo demais | risco alto em area sensivel | adiar auth e sync para fase propria |
| PWA quebrada por mudanca de build | risco de offline e cache incorreto | manter service worker legado ate fase dedicada |

## 14. Criterios de remocao do legado

Uma tela antiga so pode ser removida quando:

- a nova tela tiver equivalencia funcional;
- os testes passarem;
- desktop e mobile estiverem validados;
- acessibilidade estiver validada;
- os dados apresentados forem equivalentes;
- rollback estiver documentado;
- producao tiver sido observada sem regressao;
- nenhum fluxo oculto depender mais da tela antiga.

## 15. Criterios de sucesso da modernizacao

- zero perda de dados;
- schema preservado ate decisao explicita;
- testes sempre crescentes;
- nenhuma fase exige reescrita total;
- cada fase tem rollback;
- producao permanece utilizavel;
- reducao progressiva do `index.html`;
- componentes e regras testaveis;
- CSS progressivamente isolado.

## 16. Decisoes adiadas

Ficam explicitamente adiadas:

- troca de Firebase;
- mudanca de schema;
- nova biblioteca de estado global;
- design system externo;
- SSR;
- Next.js;
- microfrontends;
- Web Workers;
- troca completa do PWA;
- banco novo;
- backend novo;
- Prettier no monolito atual.

## 17. Definition of Done da Fase 160

- documento criado;
- roadmap atualizado;
- nenhuma dependencia instalada;
- nenhum arquivo de producao alterado;
- nenhum teste removido;
- `145/145` continuam passando;
- arquitetura, fases, riscos e rollback definidos;
- primeira tela candidata escolhida;
- proxima fase claramente definida.

## Parecer Caveman

- sem reescrita total;
- sem instalar stack agora;
- sem tocar producao;
- uma trilha por vez;
- rollback sempre possivel.

## Parecer Impeccable

- arquitetura alvo auditavel;
- fronteiras obrigatorias claras;
- riscos com mitigacao;
- coexistencia e rollback definidos antes da migracao real;
- primeira tela candidata escolhida com criterio tecnico.
