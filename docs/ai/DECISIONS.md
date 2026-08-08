# Decisões Arquiteturais Permanentes

Este documento registra decisões arquiteturais que foram validadas pelo projeto e devem ser preservadas.

## Decision 001
**Título**: Uso obrigatório do finance-core para cálculos financeiros

**Contexto**: O projeto contém funções estabelecidas em `finance-core.js` que implementam regras financeiras corretas e testadas. Criar funções paralelas ou duplicar lógica financeira introduz risco de inconsistência e manutenção.

**Decisão**: Sempre reutilizar as funções oficiais de `finance-core.js` para qualquer cálculo financeiro. Nunca criar funções paralelas ou duplicar lógica existente.

**Motivo**: Preservar a corretidão financeira comprovada pelos testes, evitar divergências entre cálculos e manter uma única fonte de verdade para regras de negócio.

**Consequências**:
- Todos os cálculos de valor aplicado, valor corrente, juros e rentabilidade devem usar `finance-core.js`
- Qualquer alteração em regras financeiras deve ser feita exclusivamente em `finance-core.js`
- Testes financeiros existentes continuam válidos
- Redução de surface de bugs financeiros

**Status**: Ativo e vinculante

## Decision 002
**Título**: Persistência centralizada via persistence-core

**Contexto**: O projeto possui `persistence-core.js` que gerencia o armazenamento de estado de forma segura e testada. Acesso direto a localStorage ou outros mecanismos de storage contorna proteções e pode causar inconsistência.

**Decisão**: Todas as operações de leitura e escrita de estado devem passar pelas funções oficiais de `persistence-core.js`. Nunca escrever diretamente em storage se existir fluxo oficial.

**Motivo**: Garantir que o estado seja gerenciado de forma consistente, com tratamento adequado de erros, versionamento e backup.

**Consequências**:
- Funções como `buildStoredState`, `serializeStoredState`, `parseStoredState` devem ser usadas
- Operações de backup e restauração usam as APIs oficiais
- Evita problemas de serialização e conflitos de estado
- Mantém a integridade do sistema de persistência comprovada pelos testes

**Status**: Ativo e vinculante

## Decision 003
**Título**: Estado global S como base da renderização no legado

**Contexto**: O frontend legado usa um estado global `S` (ou equivalente) que representa o estado completo da aplicação. Renderizar baseado nesse estado garante consistência entre dados e UI.

**Decisão**: A renderização da interface do usuário legado deve ser baseada no estado global `S` (ou seu equivalente via persistence), nunca em estado local ou duplicado.

**Motivo**: Prevenir inconsistências entre o estado exibido e o estado real da aplicação, especialmente após operações assíncronas ou atualizações parciais.

**Consequências**:
- Componentes que dependem de dados devem ler de `S` ou funções que acessam `persistence-core`
- Atualizações de estado devem passar pelos fluxos oficiais que atualizam `S`
- Evita condições de corrida e estados intermediários incorretos

**Status**: Ativo e vinculante

## Decision 004
**Título**: Movimentações de RF devem reutilizar saveRfMovimentacao

**Contexto**: A função `saveRfMovimentacao` contém a lógica completa e testada para salvar movimentações de renda fixa, incluindo validações, atualização de estado e efeitos colaterais necessários.

**Decisão**: Para qualquer operação que resulte em uma movimentação de renda fixa (aporte, resgate, taxa, etc.), deve-se usar exclusivamente a função `saveRfMovimentacao`.

**Motivo**: Esta função incorpora décadas de aprendizado sobre edge cases de RF, incluindo tratamento de juros, datas, valores líquidos/brutos e integração com o sistema de proventos.

**Consequências**:
- Nenhuma nova função de salvamento de RF deve ser criada
- Alterações em regras de movimentação de RF devem ser feitas em `saveRfMovimentacao`
- Garante que todas as movimentações sigam o mesmo caminho validado
- Mantém a atomicidade e consistência das operações de RF

**Status**: Ativo e vinculante

## Decision 005
**Título**: O modern/ não substitui automaticamente o legado

**Contexto**: O projeto possui um frontend moderno em desenvolvimento paralelo ao legado. No entanto, o moderno ainda não atingiu paridade funcional completa.

**Decisão**: O frontend moderno (`modern/`) não deve ser considerado substituto automático do legado (`index.html`) até que haja autorização explícita e comprovação de paridade funcional.

**Motivo**: Prevenir perda de funcionalidade, garantir que usuários não sejam expostos a recursos incompletos e manter um caminho claro de migração quando autorizado.

**Consequências**:
- Nenhum código deve assumir que o moderno está ativo ou completo
- Referências ao moderno devem ser protegidas por flags ou detecção de disponibilidade
- O legado permanece como fonte primária de verdade até autorização para mudança
- Qualquier trabalho no moderno deve seguir regras específicas de branch e fase

**Status**: Ativo e vinculante

## Decision 006
**Título**: UI deve preservar estado visual em refresh

**Contexto**: Operações de atualização de dados (como refresh de cotação) não devem causar perda de estado da interface, como abas abertas, posições de scroll ou seleções de usuário.

**Decisão**: Qualquer operação que atualize dados deve preservar o estado visual da interface existente, restaurando abas, scroll e foco após a atualização.

**Motivo**: Melhorar a experiência do usuário evitando comportamentos disruptivos durante operações normais como atualização de preços.

**Consequências**:
- Funções de refresh devem salvar e restaurar estado de UI
- Componentes devem ser resumíveis após atualização de dados
- Testes de UI devem verificar preservação de estado
- Evita frustração do usuário durante operações frequentes

**Status**: Ativo e vinculante

## Decision 007
**Título**: Skills ficam em .agents/skills

**Contexto**: O projeto usa um sistema de skills para encapsular conhecimento e procedimentos de IA. Essas skills precisam estar em localização padronizada para serem descobertas e usadas.

**Decisão**: Todas as skills locais do projeto devem ficar no diretório `.agents/skills/` na raiz do repositório.

**Motivo**: Padronização facilita descoberta, versionamento e uso consistente por diferentes agentes e ferramentas.

**Consequências**:
- Ferramentas de IA podem procurar skills em `.agents/skills/`
- Novas skills devem ser criadas nesse diretório
- Documentação referencia esse local padrão
- Facilita compartilhamento e reutilização entre sessões

**Status**: Ativo e vinculante

## Decision 008
**Título**: docs/ai é a memória persistente do projeto para IA

**Contexto**: O projeto precisa de um local centralizado para documentação permanente que oriente o trabalho de agentes de IA, separada da documentação funcional do produto.

**Decisão**: Todo conhecimento permanente destinado a orientar agentes de IA (regras, decisões, histórico, workflow) deve ficar em `docs/ai/`.

**Motivo**: Separação clara entre documentação do produto (para usuários) e documentação do processo (para desenvolvedores/IA), facilitando manutenção e foco.

**Consequências**:
- `docs/ai/` contém apenas materiais de orientação de IA
- Nenhum código de produção ou documentação de usuário vai para `docs/ai/`
- Agentes de IA devem consultar `docs/ai/` como primeira fonte de orientação
- Facilita auditar e atualizar o conhecimento de IA separadamente do produto

**Status**: Ativo e vinculante
