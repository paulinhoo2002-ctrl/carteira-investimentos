# Fase 204A - Dashboard executivo com destaques da carteira

## Objetivo

- substituir o card `Maiores pagadores do mes` do Dashboard por `Destaques da carteira`;
- manter `Composicao por classe` ao lado;
- mostrar abas `Maiores altas` e `Maiores baixas`;
- reutilizar apenas dados e criterios oficiais ja existentes na Fase 202;
- nao criar formula financeira nova;
- nao iniciar 204B, 204C, 206, 208, 210 ou 212.

## Fonte oficial

- `assetPerformanceOverviewRows()`;
- `assetCurrentValue()`;
- `assetAppliedValue()`;
- `assetJurosValue()`;
- `assetRentabPct()`;
- `cx()`;
- `TYPE_ORDER`;
- `sortAssetsByGroup()`.

## Regras de inclusao

- so entram ativos com base financeira completa;
- valor atual disponivel e valor aplicado disponivel;
- base incompleta fica fora;
- zero real continua valido;
- ausente continua diferente de zero;
- resultado exatamente zero nao entra em altas nem em baixas.

## Regras de ordenacao

- Maiores altas: resultado percentual desc, resultado em reais desc, ticker asc;
- Maiores baixas: resultado percentual asc, resultado em reais asc, ticker asc;
- desempate final por ticker em ordem alfabetica.

## Tratamento de zero e ausente

- zero real permanece zero;
- dado ausente permanece ausente;
- nenhuma conversao implicita de ausente para zero;
- nenhuma base incompleta entra no ranking.

## Layout

- card compacto ao lado de `Composicao por classe`;
- abas internas com foco visivel;
- limite inicial de 3 ativos por aba;
- acao `Ver todos` para `Ativos -> Desempenho`;
- leitura confortavel em 390px, 768px, 1366px e 1920px;
- sem overflow horizontal relevante.

## Acessibilidade

- abas com `role="tablist"` e `role="tab"`;
- `aria-selected` para estado ativo;
- botao navegavel por teclado;
- texto curto e legivel;
- contraste e hierarquia preservados.

## Riscos

- excesso de altura se a lista nao for limitada;
- regressao de 768px se o empilhamento nao respeitar o layout;
- duplicacao de calculo se o ranking deixar de usar a base oficial.

## Testes

- card e abas presentes no `index.html`;
- ordem de altas e baixas validada com dados oficiais;
- zero e base incompleta fora do ranking;
- estados vazios presentes;
- acao `Ver todos` apontando para Desempenho.

## Rollback

- remover o card novo, os testes da Fase 204A e a entrada da roadmap;
- restaurar o Dashboard anterior sem alterar dados, schema ou calculos.

## Conclusao Caveman

- menor passo seguro: mostrar destaque pronto, sem recalcular nada novo.

## Conclusao Impeccable

- rotas e estados claros;
- dados oficiais reaproveitados;
- acessibilidade e responsividade consideradas;
- nenhuma formula nova;
- UTF-8 sem BOM e sem mojibake.
