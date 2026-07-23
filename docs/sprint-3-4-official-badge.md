# Sprint 3.4 - Badge oficial e aplicação piloto

## Problema

O projeto tinha estilos locais para categorias, estados e pequenas etiquetas. Isso gerava:

- inconsistência de cor e borda;
- repetição de chips e pills;
- contraste irregular;
- confusão entre texto, badge e botão;
- adoção gradual difícil.

## Casos de uso

- categoria de ativo;
- estado positivo, negativo e neutro;
- warning para indisponibilidade ou atenção não bloqueadora;
- informação curta e não interativa;
- indicação de indisponibilidade quando já existir na tela.

## Casos de não uso

- botão;
- filtro;
- menu;
- tooltip obrigatório;
- texto longo;
- decoração excessiva;
- status genérico para qualquer rótulo curto.

## Arquitetura da informação

### Quando usar

- rótulos curtos;
- classificação visual discreta;
- leitura rápida sem ação do usuário.

### Quando não usar

- quando o conteúdo precisa ser clicável;
- quando o conteúdo pede seleção ou edição;
- quando a informação tem mais peso que o restante da linha;
- quando texto simples resolve melhor.

### Diferença entre Badge, Button, Select e texto simples

- Badge: informação curta, estática, sem ação.
- Button: ação explícita.
- Select: escolha entre opções.
- Texto simples: quando cor extra não adiciona leitura.

## Componente oficial

Criado em `modern/src/components/Badge`.

### API final

- `children`
- `variant`
- `size`
- `className`

### Variantes

- `neutral`
- `positive`
- `negative`
- `info`
- `warning`

### Tamanhos

- `sm`
- `md`

### Defaults

- `variant`: `neutral`
- `size`: `sm`

## Regras oficiais

- Badge não interativo;
- sem clique;
- sem seleção;
- sem menu;
- sem tooltip obrigatório;
- warning usado para indisponibilidade ou atenção não bloqueadora;
- warning não substitui mensagem de erro;
- warning não deve ser usado como decoração;
- tamanho padrão permanece compacto;
- somente `sm` e `md`;
- uso gradual, sem migração em massa;
- nenhuma dependência nova;
- nenhuma alteração em Firebase, schema ou persistência.

## Fluxo piloto

Piloto em `AssetsReadonlyPage`, com uso técnico restrito e de baixo risco.

Preferência:

1. `AssetsReadonlyPage` como piloto técnico;
2. uso de Badge primeiro em categoria e status curto;
3. migração gradual, sem troca em massa.

## Acessibilidade

- contraste suficiente;
- significado não depende só da cor;
- texto sempre presente;
- sem role desnecessária;
- sem aria-label quando o texto já comunica;
- zoom suportado;
- sem movimento por padrão.

## Riscos

- virar chip genérico;
- excesso de cores por categoria;
- uso em textos longos;
- confusão com botão ou filtro;
- migração apressada de telas antigas.

## Fora do escopo

- implementação em produção nesta sprint;
- migração em massa;
- mudança de Firebase;
- schema;
- persistência;
- dependências;
- `modern/dist`;
- 404 experimental.

## Próximos passos

1. aprovar protótipo visual;
2. manter uso gradual no piloto;
3. testar acessibilidade e contraste;
4. abrir uso gradual na camada moderna.

## Encerramento

- protótipo aprovado;
- implementação definitiva aplicada em `modern/src/components/Badge`;
- piloto em `AssetsReadonlyPage`;
- variantes e tamanhos oficiais validados;
- warning formalizado para indisponibilidade e atenção não bloqueadora;
- protótipo removido após a implementação;
- nenhuma alteração em Firebase, schema ou persistência.
