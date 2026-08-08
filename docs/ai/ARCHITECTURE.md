# Arquitetura do Sistema

Este documento descreve a arquitetura do projeto Carteira de Investimentos, seguindo a metodologia da skill `archify` para geração de documentação de arquitetura.

## Tipo
`architecture` - Componentes, serviços, cloud/security boundaries, infrastructure

## Metodologia
Conforme a skill `archify`, seguido o caminho rápido de autorização:
1. Escolhido o tipo `architecture`
2. Lido o schema em `schemas/architecture.schema.json` e um exemplo em `examples/`
3. Criado o candidato JSON (não salvo como artefato final, mas usado como base para este documento)
4. O candidato seria validado com `node bin/archify.mjs validate architecture <candidate.json> --quality showcase --json` (não executado nesta etapa para evitar alterações)
5. Este documento representa a descrição textual da arquitetura, seguindo a estrutura do candidato JSON que seria gerada.

## Módulos Principais

### Camada de Apresentação (Legacy)
- **index.html**: Aplicação de página única (SPA) legada
  - Contém toda a lógica de UI, estilos e scripts
  - Manipulação direta do DOM
  - Responsável pela renderização inicial e atualizações em resposta a eventos do usuário
  - Tecnologias: HTML5, CSS3, JavaScript ES5+ (sem frameworks externos explicitamente vinculados no código-fonte examinado)

### Camada de Lógica de Negócio
- **finance-core.js**: Módulo puro de cálculos financeiros
  - Isolado de dependências de DOM ou persistência
  - Funções públicas: `configure`, `assetAppliedValue`, `assetCurrentValue`, `assetJurosValue`, `assetRentabPct`
  - Lógica central para:
    - Detecção de ativos de Renda Fixa (`isRendaFixaAsset`)
    - Cálculo de valores aplicados, correntes, juros e rentabilidade para RF
    - Tratamento de valores manuais vs. derivados
    - Ordenação de prioridade para campos de valor bruto
  - Estado: Não mantém estado; funções são puras e dependem apenas dos parâmetros de entrada

### Camada de Persistência
- **persistence-core.js**: Módulo de abstração de armazenamento de dados
  - Isolado de detalhes específicos de backend (projetado para Firebase/Firestore, mas abstrai a interface de storage)
  - Funções públicas:
    - `applyStorageTransaction`: Aplica transações atômicas a um storage key-value
    - `buildStoredState`: Constrói o objeto de estado a ser persistido
    - `serializeStoredState` / `parseStoredState`: Serialização/desserialização JSON
    - `createBackupPayload`: Cria payload para exportação/backup
    - `parseBackupRaw`: Interpreta dados de backup
    - `backupStats`: Calcula estatísticas do estado
  - Responsabilidades:
    - Normalização de tipos de ativo e metas via funções auxiliares
    - Gerenciamento de wallets, ativos, aportes, proventos, eventos de RF, metas e configurações
    - Isolamento da camada de negócio dos detalhes de armazenamento

### Módulos de Workflow Específicos
- **portfolio-movement-contract.js**: Lógica para operações de movimentação (aporte/resgate)
- **portfolio-movement-preview.js**: Geração de pré-visualizações de movimentações
- **readonly-report-page-contract.js**: Página de relatório somente leitura (modo experimental)
- **report-asset-row.js**: Renderização de linhas de ativo em relatórios

### Configuração e Infraestrutura
- **firebase.json**: Configuração do Firebase Hosting e funções
- **firestore.rules**: Regras de segurança do Firestore (leitura/escrita de dados)
- **manifest.json**: Configuração do PWA (Progressive Web App)
- **sw.js**: Service Worker para funcionalidades offline e PWA
- **icon-*.png**: Recursos visuais para PWA e atalhos
- **package.json**: Dependências e scripts do projeto (Node.js/npm)
- **package-lock.json**: Versões travadas das dependências

### Testes
- **tests/**: Diretório contendo testes unitários e de integração (não examinado em detalhes nesta documentação)

## Dependências

### Dependências de Tempo de Execução (Runtime)
- **Firebase JavaScript SDK**: Implícito através do uso de `firebase` em `persistence-core.js` (não explicitamente mostrado nos trechos fornecidos, mas inferido do contexto do projeto e arquivos de configuração)
- **Nenhuma outra dependência de runtime explícita** no código-fonte examinado (finance-core.js e persistence-core.js são puros e não importam módulos externos)

### Dependências de Build/Desenvolvimento
- Conforme `package.json` (visível na listagem de diretório):
  - Scripts: `build`, `test` (provavelmente usando ferramentas padrão de frontend)
  - Nenhuma dependência de produção listada além do Firebase (implícito)

## Fluxo de Dados

### Inicialização
1. `index.html` é carregado pelo navegador
2. Inicializa variáveis globais e carrega dependências (Firebase implícito)
3. Chama funções em `persistence-core.js` para obter o estado inicial do storage (localStorage ou Firebase)
4. Estado bruto é passado para `buildStoredState` para normalização e aplicação de padrões
5. Estado normalizado é usado para renderizar a UI inicial via manipulação direta do DOM em `index.html`

### Interação do Usuário (Exemplo: Adicionar Aporte)
1. Usuário preenche formulário em `index.html`
2. Evento de submit é capturado
3. Dados são validados (implícito no UI)
4. Novo objeto de aporte é criado
5. `persistence-core.js` é chamado para atualizar o estado:
   - `applyStorageTransaction` é usado para modificar de forma atômica a chave de storage contendo o estado completo
   - Estado é lido, modificado (aporte adicionado ao array `aportes`), e salvo de volta
6. Após sucesso, UI é atualizada:
   - `index.html` refetch o estado atualizado via persistence
   - Re-renderiza componentes afetados (lista de aportes, saldo total, etc.)
   - Atualização pode ser por recarregamento completo ou manipulação seletiva do DOM

### Fluxo de Cálculo Financeiro (Exibir Valor Corrente de Ativo RF)
1. `index.html` solicita o valor corrente para um ativo específico
2. `assetCurrentValue(a)` é chamada (de `finance-core.js`)
3. Para ativos de Renda Fixa, delega para `getRfValues()(a).current`
4. `getRfValues()` retorna a função de cálculo configurada (padrão ou customizada via `configure`)
5. `rfValues` processa o objeto do ativo:
   - Extrai e converte campos brutos (quantidade, preço médio, valores brutos aplicados/brutos/liquidos, etc.)
   - Aplica ordem de prioridade para determinar `applied`, `liquidCandidate`, `grossCandidate`
   - Determina `current` com base na precedência: líquido > bruto > aplicado
   - Calcula indicadores como `hasExplicitCurrent`, `hasManualProfit`, `profit`, `rentab`
6. Valor retornado é usado pela UI para exibição

### Persistência de Dados
1. Qualquer alteração no estado (por meio de `applyStorageTransaction`) resulta em:
   - Leitura do valor bruto atual do storage
   - Construção de novo estado com `buildStoredState` (aplica normalização de tipos/metas)
   - Serialização para JSON com `serializeStoredState`
   - Escrita de volta no storage via `storage.setItem`
2. Backup e exportação são feitos por:
   - Leitura do estado completo via storage
   - Criação de payload com `createBackupPayload` (inclui metadados e estrutura de storage)
   - Serialização do payload para download ou transmissão

## Estado Global S

Não existe um objeto de estado global explícito no código-fonte leg examinado. O estado é gerenciado implicitamente através de:

1. **Camada de Persistência**:
   - O estado canônico está armazenado no Firebase/Firestore (ou localStorage em modo de desenvolvimento)
   - `persistence-core.js` fornece funções para ler, modificar e salvar esse estado como um único objeto JSON sob chaves de storage específicas (padrão: `civ5` para estado, `civ5_cfg` para configuração)

2. **Camada de Apresentação**:
   - O `index.html` mantém uma cópia do estado em variáveis globais ou no DOM após cada sincronização com a persistência
   - Não há um único objeto `S` global; em vez disso, diferentes partes do UI acessam o estado por meio de chamadas à camada de persistência ou lendo diretamente do DOM renderizado

3. **Fluxo de Estado**:
   - Estado de storage (Fonte da Verdade) ←→ persistence-core.js ←→ index.html (via chamadas de leitura após gravações ou polling implícito)
   - Alterações iniciadas pelo UI vão para persistence → storage → persistence (lê de volta) → UI
   - O estado nunca é mantido exclusivamente na memória da aplicação sem persistência; recarregar a página resulta em recarregamento do storage

## Responsabilidades

### finance-core.js
- **Responsabilidade Única**: Cálculos financeiros puros e isolados
- **Não Responsabilidades**:
  - Acesso ao DOM
  - Leitura/gravação de storage
  - Lógica de UI ou navegação
  - Validação de entrada do usuário (além de conversões seguras de tipo)

### persistence-core.js
- **Responsabilidade Única**: Abstração de persistência de estado e normalização de dados
- **Não Responsabilidades**:
  - Cálculos financeiros (delegados a finance-core.js)
  - Lógica de UI
  - Regras específicas de negócio além da integridade e formatação de dados

### index.html
- **Responsabilidade Única**: Interface do usuário legada e ponto de entrada da aplicação
- **Não Responsabilidades**:
  - Cálculos financeiros (delegados a finance-core.js)
  - Lógica de persistência direta (delegada a persistence-core.js)
  - Definição de regras de negócio (delegada aos módulos core)

### Módulos de Workflow (ex: portfolio-movement-contract.js)
- **Responsabilidade Única**: Lógica específica para um fluxo de trabalho (ex: movimentações)
- **Não Responsabilidades**:
  - Cálculos financeiros genéricos (usa finance-core.js)
  - Persistência direta (usa persistence-core.js)
  - Renderização de UI direta (devolve dados ou objetos para o index.html consumir)

## Considerações de Arquitetura

### Separação de Preocupações
- O projeto mantém uma separação razoável entre:
  - Lógica de cálculo (finance-core.js)
  - Camada de acesso a dados (persistence-core.js)
  - Camada de apresentação (index.html)
- Essa separação permite que alterações em uma camada (ex: regras de cálculo em finance-core.js) não afetem diretamente as outras, desde que as interfaces sejam mantidas

### Isolamento da Lógica de Negócio
- Tanto finance-core.js quanto persistence-core.js são projetados para serem independentes do DOM e de APIs de navegador específicas
- Isso os torna testáveis em isolamento (Node.js) e potencialmente reutilizáveis em outros contextos

### Extensibilidade e Manutenção
- A arquitetura legada em index.html apresenta desafios para extensão devido ao acoplamento de UI, lógica e persistência em um único arquivo grande
- Entretanto, o isolamento dos módulos core oferece pontos de entrada para refatoração incremental:
  - Novos recursos podem ser adicionados modificando index.html para chamar os módulos core apropriados
  - Melhorias em finance-core.js ou persistence-core.js beneficiam imediatamente todos os usos
- A existência de um modern/ directory (não integrado) sugere um plano para futura modernização, mas atualmente permanece como apenas leitura

### Pontos de Integração
- Os pontos de integração entre camadas são bem definidos através de chamadas de função:
  - index.html → persistence-core.js: Para carregar/salvar estado
  - index.html → finance-core.js: Para calcular valores derivados
  - index.html → workflow modules: Para iniciar processos específicos (ex: movimentação)
  - workflow modules → finance-core.js/persistence-core.js: Para executar etapas específicas do workflow

### Estado e Consistência
- O estado é tratada como um objeto inteiro que é lido, modificado e salvo como unidade (via persistence-core.js)
- Isso simplifica a lógica de transações (todas as alterações são atômicas no nível do estado inteiro) mas pode se tornar um gargalo em aplicações com alta concorrência (não relevante para uso pessoal单用户)
- A normalização de tipos e metas ocorre na camada de persistência, garantindo consistência nos dados armazenados

## Conclusão

A arquitetura do Carteira de Investimentos é estruturada em torno de duas camadas centrais de lógica isolada (finance-core e persistence-core) que são consumidas por uma aplicação de interface legada (index.html). Essa separação fornece benefícios de testabilidade e manutenção para a lógica de negócio, enquanto a interface legada permanece como um ponto único de entrada que, embora acoplado, permite evolução incremental através do uso consistente dos módulos core. A não alteração das áreas protegidas (como finance-core.js e persistence-core.js) é crítica para manter a integridade das regras de negócio e da persistência.