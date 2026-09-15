# Runbook de eventos corporativos

## Ativação pública V69

O caminho público read-only usa `market-data-providers.js`/Yahoo Chart para
cotações e eventos históricos sem token. A coleta é feita por ticker, com
quantidades e custo combinados somente localmente. Brapi é opcional e pode
exigir token; nunca coloque token no repositório ou na URL.

Cobertura pública é parcial: anúncio futuro, JCP, correções e eventos de fundos
devem manter proveniência e, quando necessário, validação oficial. Nenhuma
resposta pública promove evento ao ledger realizado.

## Fonte oficial CVM IPE

O catálogo público `cia_aberta-doc-ipe` da CVM é a fonte oficial de descoberta
de documentos eventuais de companhias. O módulo `official-events-provider.js`
consulta apenas o catálogo e exige campos estruturados antes de produzir um
evento; título ou palavra-chave isolada nunca cria provento. Documentos sem
valor, data e identidade determinísticos ficam para revisão.

Para FIIs/FIAGRO, a cobertura automática permanece parcial. O sistema deve
mostrar a origem e o estado de cobertura, mantendo B3 como reconciliação
opcional e documentos de administrador/gestor como validação.

## Fluxo normal

1. Identificar ativos mantidos e vendidos recentemente com direito pendente.
2. Consultar fontes públicas configuradas, com cache por provedor/símbolo/período.
3. Normalizar, deduplicar por `eventKey` e preservar todas as evidências.
4. Calcular quantidade elegível na data-base/ex-date.
5. Exibir `ANUNCIADO` ou `A RECEBER` separadamente do realizado.
6. Usar B3 como auditoria opcional quando o usuário importar o arquivo.

Fontes preferenciais: documento oficial do emissor/fundo/CVM; provedor
estruturado gratuito como camada rápida; B3 UP2DATA somente como opção. Uma
fonte secundária nunca apaga a proveniência oficial.

## V71 — documento e identidade

O caminho oficial passa por `issuer-mapping.js`, `official-document-fetcher.js`,
`official-document-parser.js` e `official-document-pipeline.js`. O fetcher só
aceita hosts oficiais, limita tamanho/tempo, valida redirecionamentos e gera
SHA-256. O parser exige identidade, valor e semântica de data suficientes;
texto ambíguo fica em revisão. Ações, JCP, FII, parcelas e cancelamentos são
representados como evidência read-only. Nenhum resultado escreve `civ5`, ledger
realizado ou Firebase.

## Estados

`DISCOVERED → ANNOUNCED → ELIGIBILITY_KNOWN → EXPECTED → PAYMENT_DUE →
PAID_PENDING_CONFIRMATION → REALIZED`. Correções geram revisão e cancelamentos
geram `CANCELLED`; divergências geram `CONFLICT`.

## Falhas e reconciliação

- Fonte indisponível: manter cache, marcar atualização parcial e tentar a próxima.
- Valor/data divergente: manter conflito e a fonte de maior autoridade para
  exibição, sem alterar histórico realizado silenciosamente.
- Duplicata entre CVM, provedor e B3: um evento, várias fontes.
- Sem data de pagamento: mostrar “A definir”, nunca esconder nem estimar como
  anunciado.
- B3: `CONFIRMED`, `MISSING_LOCAL`, `VALUE_CONFLICT`, `DATE_CONFLICT` ou
  `UNRECOGNIZED`.

## Custos e privacidade

O fluxo padrão não exige dependência paga nem envia carteira, posições ou
transações para cache público. Apenas dados públicos de eventos podem ser
cacheados. Token, se algum provedor exigir, entra somente em configuração
segura e nunca em `index.html` ou no repositório.
