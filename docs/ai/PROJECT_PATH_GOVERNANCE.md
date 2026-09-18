# Governança de caminhos e artefatos do projeto

Este documento define os caminhos canônicos do projeto LEGACY e os limites
para trabalho paralelo, auditoria e limpeza. Ele complementa `AGENTS.md` e os
documentos de fluxo existentes; não autoriza alterações financeiras,
persistência, deploy ou limpeza por si só.

## Identidade e separação

- Projeto: `Carteira de Investimentos LEGACY`.
- Raiz oficial do projeto: `C:\Projetos\carteira-investimentos`.
- `C:\Projetos\carteira-2.0` é um projeto separado e não deve ser lido,
  escrito, migrado ou limpo por missões deste repositório sem autorização
  específica.

## Worktrees

- Toda nova worktree LEGACY deve ser criada em
  `C:\Projetos\carteira-investimentos.worktrees`.
- Não criar novas worktrees em
  `C:\Projetos\carte-investimentos.worktrees`, que é um caminho legado com
  grafia incorreta.
- Antes de editar uma worktree, confirmar caminho, repositório, branch, HEAD,
  status e `origin/main`.
- Não reutilizar uma worktree histórica suja para objetivo não relacionado.
- Antes de remover uma worktree, verificar individualmente status, PRs,
  commits únicos e arquivos não rastreados importantes.
- Worktrees registradas devem ser removidas com `git worktree remove`; não
  apagar primeiro a pasta pelo Explorer ou por operação equivalente.
- Worktrees sujas, desconhecidas, com PR aberto, dependência ativa ou conteúdo
  único devem ser preservadas.
- Não usar reset, restore, clean, stash automático, rebase ou force push para
  resolver uma ambiguidade histórica.

## Skills do projeto

- A raiz canônica de Skills específicas do projeto é
  `C:\Projetos\carteira-investimentos\.agents\skills`.
- Não criar cópias em outros locais sem justificativa explícita.
- Diretórios de backup, referências e suporte não são automaticamente Skills
  descartáveis.
- Skills com o mesmo nome só podem ser comparadas ou removidas após conferência
  da lista de arquivos e dos hashes de conteúdo.
- A cópia canônica nunca deve ser removida por causa de uma duplicata.

## Segurança financeira e dados

- QA deve usar modo protegido e somente leitura quando aplicável.
- Não executar escrita financeira real, alteração de persistência, confirmação
  de importação ou realização automática de evento sem o gate próprio.
- Preservar a autoridade manual de renda fixa, o comportamento de importação,
  o histórico de lançamentos e a distinção entre ausência e zero.
- Não inserir dados financeiros fictícios para preencher telas ou evidências.

## Regra de limpeza

Uma remoção só é candidata quando o item está limpo, não tem PR aberto, não
possui commits ou arquivos importantes únicos, não é canônico nem ativo, e sua
substituição ou incorporação foi comprovada. Em caso de dúvida, manter o item
e registrar a razão para uma revisão futura.

