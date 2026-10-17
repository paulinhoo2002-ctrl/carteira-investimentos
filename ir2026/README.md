# IR2026 — Fundação fiscal local (LEGACY)

Módulo local-only do domínio fiscal. Documentos e resultados financeiros
privados ficam em `.qa-state/` (ignorado pelo Git); o repositório contém
contratos, engine, fixtures sintéticas, testes e metadados sem dados de carteira.

## Contratos centrais

- `CURRENT_AVG_COST != FISCAL_COST`; `FIFO != FISCAL_LEDGER`; `UNKNOWN != ZERO`.
- `PARTIAL != COMPLETE`; `EXPECTED != RECEIVED`.
- O custo fiscal de RV e RF segue contratos distintos e exige proveniência.
- Transferências não realizam resultado; custo sem continuidade documentada
  permanece `FISCAL_COST_UNKNOWN`.
- Eventos `UNKNOWN` mantêm seu impacto declarado.
- `TAX_DUE=NOT_CALCULATED` até que regras e evidências exigidas sejam
  certificadas.

## Abertura fiscal

`build-opening-v1.js` produz uma visão analítica DERIVED a partir de evidências
locais autorizadas e da engine compartilhada do ledger. Cada posição mantém seu
estado de cobertura: DERIVED, PARTIAL, UNKNOWN ou NOT_APPLICABLE. A ausência de
uma posição oficial de encerramento mantém a abertura não certificada; replay
não cria uma compra sintética nem substitui a visão conservadora do produto.

O relatório detalhado e suas proveniências ficam somente em armazenamento
privado ignorado pelo Git. `opening-v1-summary.json` contém estados gerais, sem
posições, instrumentos, quantidades, valores, datas de atividade ou hashes de
fontes privadas.

## Evidências para certificação

- Posição oficial de encerramento do exercício anterior, com custo por ativo.
- Evidência de prejuízos acumulados por categoria aplicável.
- Extrato de IRRF com cobertura identificável.
- Taxas itemizadas e documentação de eventos ambíguos.

Sem a evidência correspondente, custos, retenções, perdas ou imposto devido
permanecem desconhecidos, parciais ou não calculados.

## Módulos

- `blockers.js`: taxonomia de bloqueios e checklist.
- `precedence.js`: precedência de evidências; heurísticas não certificam.
- `matcher.js`: matching determinístico com estados de ambiguidade.
- `ingest.js`: detecção de documento por conteúdo e proveniência por linha.
- `promotion.js`: propostas de promoção; conflitos não são resolvidos
  automaticamente.
- `fees.js`, `irrf.js`, `losses.js`: cobertura específica por tipo de evidência.
- `day-trade.js`: relação de eventos com parciais e remanescentes explícitos.
- `coverage.js`: cobertura multidimensional.
- `scripts/ingest-dry-run.js`: análise local sem escrita.

As fixtures públicas usam identificadores e dados sintéticos. Nenhum artefato
local de reconciliação é necessário para executar a suíte de testes.