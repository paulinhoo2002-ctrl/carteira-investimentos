# Fase 200 - Refinamento confiavel da tela de Dividendos

## Contexto

A tela de Dividendos ja mostra dados oficiais do legado e precisa de um refinamento confiavel para deixar claro o que entra em "Recebido no mes", remover o destaque redundante de "Historico recente" da visao geral e manter o "Historico mensal" como a primeira secao principal da pagina.

## Objetivo

- explicar a composicao de "Recebido no mes" com base em registros oficiais;
- preservar o Historico mensal como secao principal da visao geral;
- manter o Historico recente em sua propria area operacional;
- corrigir o comportamento em 768px sem criar formulas novas;
- preservar filtros, edicao, exclusao, acessibilidade e historia completa.

## Fonte de verdade

- o legado continua como fonte de verdade;
- o shell moderno permanece readonly;
- nenhuma mudanca de schema, dependencia ou calculo financeiro novo e permitida.

## Escopo

- melhorar a leitura da visao geral;
- deixar a composicao do mes atual clara e auditavel;
- manter a linha do tempo mensal e a tabela historica intactas;
- tratar tablet e mobile com layout seguro e sem overflow horizontal global.

## Fora de escopo

- criar novas formulas financeiras;
- inventar estimativas ou correcoes aproximadas;
- copiar outra interface ou site;
- alterar schema, Firebase/Auth, storage, cache ou dependencias;
- remover edicao, exclusao ou filtros;
- iniciar a Fase 201 ou qualquer fase futura sem autorizacao.

## Riscos

- overflow em 768px;
- confusao entre soma oficial e nova formula;
- regressao visual em desktop ou mobile;
- esconder dados operacionais existentes.

## Criterios de conclusao

- "Recebido no mes" fica claro e auditavel;
- "Historico recente" sai da visao geral;
- "Historico mensal" fica logo abaixo dos cards de resumo;
- validacao visual passa em 390px, 768px, 1366px e 1920px;
- nenhum dado funcional e removido;
- nenhum numero financeiro novo e criado;
- `npm run build`, `npm test`, `npm run build:modern` e `npm run test:modern` passam.

## Rollback

- reverter os ajustes da fase 200;
- remover este documento e os testes desta entrega;
- manter as fases readonly anteriores e o legado intactos.
