# Histórico mensal de Proventos

## Protótipo aprovado

O protótipo visual foi validado e a implementação definitiva entrou em `index.html`.

## Fonte oficial de dados

- histórico mensal real de proventos já registrado no sistema;
- distinção preservada entre `R$ 0,00` e `—`;
- meses futuros e ausentes continuam neutros;
- nenhum novo schema, dependência ou integração com Firebase foi criado.

## Decisões finais

- visão `Lista` como padrão no mobile;
- `Matriz` como alternativa;
- gráfico horizontal apenas complementar;
- resumo leve e leitura rápida;
- tabela anual como protagonista na leitura principal.

## Correções aplicadas

- classe `.hidden` corrigida para ocultar de fato os anos recolhidos;
- quebra legível de `Melhor mês` no mobile;
- `padding-bottom` reforçado com `env(safe-area-inset-bottom)` para não cobrir linhas nem botões;
- layout mobile ajustado para manter o conteúdo acima da barra inferior fixa.

## Resultado

- protótipo aprovado;
- implementação definitiva em `index.html`;
- sem alteração em schema;
- sem alteração em Firebase;
- sem alteração em persistência;
- sem dependência nova;
- sem mudança de regras financeiras.
