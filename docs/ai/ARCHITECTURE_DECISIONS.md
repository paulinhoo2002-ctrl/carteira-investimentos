# Decisões arquiteturais

## ADR-001 — preços públicos sem token

Status: ativo. Yahoo Chart é o provider gratuito de cotações/histórico; Brapi
é opcional. Dados privados da carteira nunca são enviados.

## ADR-002 — eventos públicos separados

Status: ativo. CVM IPE/documentos oficiais e fontes secundárias alimentam cache
público e eventos esperados; o ledger realizado permanece separado.

## ADR-003 — MODE_A

Status: ativo. Descoberta automática pode sugerir; realização é manual.
`REAL_AUTO_REALIZATION_ENABLED=false`.

## ADR-004 — stores derivados locais

Status: ativo. `portfolioValuationSnapshotsV1` e
`portfolioExternalCashFlowsV1` são versionados, locais e isolados de `civ5`.

## ADR-005 — renda fixa conservadora

Status: ativo. Valor manual/importado é autoridade. CDI pode ser estimado em
sombra pelo BCB SGS; IPCA+/CRA/debêntures sem metadados suficientes ficam
manuais.

## ADR-006 — parser fail-closed

Status: ativo. Parser oficial/importador só promove campos determinísticos;
ambiguidade vira revisão.
