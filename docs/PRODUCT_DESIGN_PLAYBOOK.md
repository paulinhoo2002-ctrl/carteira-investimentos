# Product Design Playbook

## Missao do produto

Construir um sistema financeiro simples, confiavel, bonito e sustentavel para uso de longo prazo.

## Filosofia

- simplicidade vence complexidade
- mostrar o essencial antes dos detalhes
- uma tela deve ter um protagonista visual
- uma acao primaria por fluxo
- espaco antes de borda
- cards somente quando necessarios
- reduzir carga cognitiva
- fundacao visual primeiro, migracao de tela depois
- desktop e mobile compartilham a mesma linguagem
- mobile deve ser projetado deliberadamente
- implementacao visual somente apos wireframe e prototipo aprovados

## Arquitetura da informacao

Contexto
-> Protagonista
-> Resumo
-> Acao principal
-> Detalhamento
-> Historico
-> Configuracoes

## Processo oficial

Analise
-> Arquitetura da informacao
-> Wireframe
-> Prototipo
-> Aprovacao visual
-> Implementacao
-> Testes
-> Revisao
-> Commit
-> Push
-> Merge

## Regras para desktop e mobile

### Desktop

- privilegiar leitura rapida e densidade equilibrada
- manter o protagonista visual visivel sem competir com o resto
- usar o espaco para organizar, nao para decorar

### Mobile

- empilhar somente o que perderia clareza em colunas
- preservar ordem de leitura e acao principal
- reduzir bordas, blocos e alturas desnecessarias

## Acessibilidade

- foco visivel em todos os elementos interativos
- contraste suficiente em texto, badges e estados
- estado nao depender somente de cor
- reducao de movimento respeitada quando solicitada pelo sistema

## Performance visual

- uma leitura principal por tela
- menos caixas, mais separacao util
- evitar recalculo visual desnecessario
- evitar excesso de sombras, brilhos e bordas

## Regra de aprovacao visual

- wireframe e prototipo precisam de aprovacao visual antes da implementacao

## Checklist

- existe um protagonista claro?
- existe somente uma acao primaria?
- a tela pode ser compreendida em aproximadamente 3 segundos?
- o mobile foi projetado deliberadamente?
- a solucao reduz carga cognitiva?
- o componente ja existe?
- o token ja existe?
- acessibilidade foi preservada?
- performance foi preservada?
- parece pertencer ao mesmo produto?
