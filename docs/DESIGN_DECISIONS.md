# Design Decisions

## Contexto anterior

- excesso de cards
- aparencia semelhante a ERP
- pouca hierarquia visual
- bordas em excesso
- multiplos elementos competindo
- implementacao antes da aprovacao visual
- inconsistencias entre desktop e mobile

## Aprendizados

- um protagonista por tela
- grafico secundario quando aplicavel
- historicos integrados a pagina
- espaco como ferramenta de hierarquia
- menos containers
- mobile projetado e nao apenas adaptado
- prototipo aprovado antes da implementacao
- mudancas pequenas e isoladas por branch
- fundacao visual e funcionalidade seguem escopos separados
- Dividendos V4 mostrou que leitura compacta precisa de menos caixas, nao de mais aderecos

## Decisao atual

Adotar um Design System gradual, compativel com o legado e sem migracao disruptiva.

## Separacao de escopo

- a fundacao visual nao altera regra de negocio
- tokens e documentos vem antes de migracao de componentes
- telas novas continuam usando o mesmo contrato visual
- Sprint 3.1 nao substitui telas; apenas fixa linguagem

## Regra de continuidade

- nao remover o legado antes da cobertura nova existir
- nao substituir tudo de uma vez
- nao introduzir tokens sem uso planejado
- nao misturar modernizacao com redesenho amplo

## Decisoes adiadas

- biblioteca de componentes
- migração ampla de telas
- refatoracao visual do legado

## Criterio de sucesso

- mesma linguagem visual entre telas
- menos variacao improvisada
- previsibilidade em componentes
- facilidade de migrar por fase
- zero regressao funcional
