# V213 Transactions, Asset Detail and Data Trust

## Goal

Evoluir a leitura de Movimentações e Detalhe do Ativo com produtividade,
consistência e provenance factual, sem alterar fórmulas, persistência, schema
ou qualquer fluxo real de escrita financeira.

## Scope

- Criar helpers puros para período, busca, filtros e ordenação de movimentações.
- Consolidar resumo textual determinístico baseado apenas em registros confirmados.
- Reutilizar a relação existente entre ativos e histórico de movimentações.
- Refinar a experiência de Aportes/Movimentações em desktop e mobile.
- Refinar Detalhe do Ativo com posição, renda e histórico já disponíveis.
- Exibir provenance somente quando metadata real existir.
- Cobrir unknown, unavailable, loading, error e empty sem converter ausência em zero.
- Adicionar testes unitários/estruturais e QA read-only.

## Non-goals and hard boundaries

- Não alterar `finance-core.js`, `persistence-core.js`, Firebase, schema,
  `modern/src`, ledger, fórmulas, quantidade, preço médio ou cálculo de posição.
- Não alterar `saveTransaction`, `updateTransaction`, `deleteTransaction`,
  writes Firestore, dedupe persistence ou semântica de importação.
- Não ampliar compra, venda, edição ou qualquer operação financeira.
- Não inventar provenance, score de qualidade ou valor zero para dado ausente.
- Preservar autoridade manual da renda fixa e o modo shadow de eventos corporativos.

## Architecture

A implementação permanecerá na arquitetura legada existente. Helpers puros
serão pequenos e receberão arrays/objetos já normalizados, retornando novos
arrays ou resumos sem mutar estado. A camada de renderização consumirá esses
helpers; handlers de escrita e fontes oficiais permanecerão intocados.

Movimentações usará uma única sequência derivada para período, busca, filtro,
ordenação e paginação. Detalhe do Ativo reutilizará a mesma normalização para
histórico e proventos, evitando agregadores divergentes. Provenance será uma
camada de apresentação factual, usando apenas campos existentes como `source`,
`authority`, `valuationMode`, `valuationAsOf`, `sourceAsOf`, `observedAt`,
`manual`, `estimated`, `fallback`, `stale`, `unsupported` e `reason`.

## Expected behavior

- O padrão de movimentações continua mais recentes primeiro.
- Busca e filtros são locais, previsíveis e acessíveis por teclado.
- Resumos dizem apenas quantidades e categorias realmente calculadas.
- Histórico do ativo é relacionado ao ticker/identidade real e ordenado por data.
- Valores ausentes aparecem como `—`, indisponível ou mensagem equivalente.
- `0` só aparece quando o dado zero está confirmado.
- Provenance authoritative/manual/estimated/fallback/stale/unsupported é
  diferenciada sem sugerir certeza além da metadata disponível.
- Nenhuma ação de leitura dispara escrita.

## Testing and QA

Adicionar testes para os helpers e estados de Movimentações, Detalhe do Ativo,
provenance e consistência cross-page. Preservar as suítes V200, V201, V206,
V208, V210, Renda Fixa e Corporate Events. Validar 390x844, 430x932, 768x900,
1366x768 e 1920x1080, sem overflow horizontal, com foco/teclado e touch
targets de pelo menos 44px. Executar testes direcionados, regressões exigidas,
UI, reliability smokes e build antes da PR.

## Release boundary

A branch será enviada e uma PR será criada, mas não haverá merge nem deploy
manual nesta missão. A PR só será marcada merge-ready se o diff permanecer
limitado às superfícies aprovadas, todos os testes exigidos estiverem verdes e
os invariantes financeiros permanecerem inalterados.
