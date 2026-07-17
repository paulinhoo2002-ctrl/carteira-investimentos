# Fase 202 - Painel consolidado de desempenho dos ativos

## Contexto

A Fase 200 resolveu o refinamento visual da aba Dividendos e deixou claro um risco real em 768px. A Fase 202 entra para dar uma leitura confiavel do desempenho dos ativos sem criar formulas novas ou duplicar calculos oficiais.

## Objetivo

Criar um painel consolidado para identificar:

- ativos mais positivos;
- ativos mais negativos;
- resultado em reais;
- resultado percentual;
- filtros por classe;
- ordenacao;
- explicacao clara sobre a fonte oficial de cada valor.

## Fontes oficiais

O painel usa somente calculos e sinais ja existentes no legado, principalmente:

- `assetCurrentValue()`;
- `assetAppliedValue()`;
- `assetJurosValue()`;
- `assetRentabPct()`;
- `TYPE_ORDER`;
- `sortAssetsByGroup()`;
- `cx()`;
- `assetAnalysisRows()`.

## Escopo

- nova aba interna em `Ativos`, chamada `Desempenho`;
- resumo com ativos analisados, resultado consolidado e base suficiente;
- lista consolidada com resultado em reais e percentual;
- filtros por classe oficial;
- ordenacao por resultado, percentual, valor atual e ticker;
- explicabilidade sobre valor investido, valor atual, zero e dado ausente;
- responsividade em 390px, 768px, 1366px e 1920px;
- shell moderno permanece readonly.

## Fora de escopo

- criar nova formula financeira;
- inventar preco medio, cotacao ou patrimonio;
- duplicar calculos oficiais;
- alterar schema, Firebase/Auth, storage ou dependencias;
- mover a tela para o shell moderno;
- iniciar a Fase 204.

## Riscos

- regressao visual em 768px;
- confusao entre zero e dado ausente;
- exibicao de resultado sem base oficial;
- duplicacao acidental de formula do legado;
- overflow horizontal em telas menores.

## Criterios de conclusao

- painel visivel e funcional no legado;
- dados oficiais preservados;
- zero continua diferente de ausente;
- filtros e ordenacao operando sem alterar o calculo;
- leitura confiavel em desktop, tablet e mobile;
- `modern/dist` fora do indice;
- testes e builds verdes.

## Rollback

- remover os arquivos criados pela fase;
- reverter somente os commits desta fase;
- manter as fases readonly anteriores intactas.
