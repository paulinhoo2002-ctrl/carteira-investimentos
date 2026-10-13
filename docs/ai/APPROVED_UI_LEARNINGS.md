# Aprendizados visuais aprovados

Fonte: diretório local de referências aprovado pelo usuário, inventariado em 2026-10-13. O manifesto [`approved-ui-reference-manifest.json`](approved-ui-reference-manifest.json) registra somente caminhos relativos, tipo, dimensões e estado de revisão; imagens e valores financeiros não foram copiados.

## Manter

- Hierarquia executiva: KPIs antes de análises detalhadas.
- Tabelas analíticas densas e legíveis no desktop.
- Agrupamento visual consistente e navegação lateral previsível.
- Cores semânticas com contraste, sem depender apenas da cor para comunicar estado.
- Separação clara entre resumo, gráficos e detalhes.

## Adaptar ao LEGACY

- Reorganizar tabelas de desktop em cartões com divulgação progressiva no celular; as referências revisadas são capturas desktop e não definem uma solução mobile.
- Preservar os contratos financeiros, navegação, persistência e identidade já aprovados para o LEGACY.
- Usar números tabulares, foco visível e estados distintos de carregamento, vazio, erro e cobertura parcial.

## Padrões adicionais observados nas 21 capturas revisadas

- Em tabelas desktop, alinhar colunas numéricas e manter filtros/pesquisa próximos da tabela; no celular, revelar detalhes progressivamente em cartões.
- Matrizes mensais devem distinguir ausência de registro de cobertura conhecida; um traço visual sem explicação não prova recebimento zero.
- Formulários podem separar entrada, resumo da posição e revisão da ação, sem antecipar confirmação ou persistência.
- Seções recolhíveis ajudam a organizar detalhes, mas precisam de nome acessível e estado expandido comunicável.
- Composições com muitos KPIs ou gráficos podem orientar agrupamento; não adotar scores, estimativas ou métricas sem fonte e contrato.
- Imagens são referências visuais apenas; nenhum número, ticker, identificador, regra ou cálculo foi extraído como dado do produto.

## Evitar

- Copiar identidade ou layout pixel a pixel.
- Microtexto ou comprimir tabelas desktop no celular.
- Tratar projeções como valores confirmados ou dados ausentes como zero.
- Adotar dependências CDN de protótipos. HTML foi renderizado apenas em contexto isolado, com rede externa e service workers bloqueados; interação funcional não foi certificada.

As referências orientam composição visual; não autorizam alterar cálculos, regras financeiras ou identidade do produto.
