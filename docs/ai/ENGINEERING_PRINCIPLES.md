# Princípios de engenharia

Este documento traduz práticas de desenvolvimento assistido por IA para o
repositório `Carteira de Investimentos LEGACY`. Ele complementa `AGENTS.md`;
não concede autorização para alterar finanças, persistência, merge ou deploy.

## Ordem de precedência

1. Segurança do sistema e do usuário.
2. Governança do projeto e áreas protegidas.
3. Contratos financeiros e de persistência.
4. Escopo da missão atual.
5. Workflow da Skill selecionada.
6. Recomendações genéricas externas.

## Loop mínimo

1. Confirmar raiz física, branch, HEAD, status e `origin/main`.
2. Ler o documento canônico pertinente antes de editar.
3. Descrever hipótese, risco, arquivos afetados e critério de sucesso.
4. Reproduzir ou caracterizar o problema com evidência.
5. Fazer a menor alteração reversível que resolve a causa.
6. Testar diretamente o comportamento alterado.
7. Revisar diff completo, escopo e segredos.
8. Registrar decisão duradoura em `docs/ai/` quando necessário.

## Regras contra deriva

- Não transformar uma hipótese em fato sem teste ou fonte primária.
- Não abstrair antes de haver repetição real ou benefício mensurável.
- Não misturar refatoração ampla com uma correção funcional.
- Não trocar `ausente`, `desconhecido` ou `indisponível` por zero.
- Não “corrigir” uma falha enfraquecendo asserções ou omitindo o teste.
- Não copiar um conjunto externo inteiro de Skills; roteie por necessidade.

## Entrega segura

Uma entrega só é considerada pronta quando o diff é coerente, os testes
aplicáveis passam, os riscos estão explícitos e o próximo gate (PR, merge ou
deploy) está claramente separado.

