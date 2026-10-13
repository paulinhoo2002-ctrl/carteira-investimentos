# MEGA 18 - revisao de divergencias do inventario de Skills

Data da revisao: 2026-10-13. Escopo: comparar individualmente as nove entradas marcadas como divergentes entre o inventario local de origem e o snapshot versionado. A origem foi consultada somente para leitura; nenhum arquivo de Skill foi sincronizado nesta revisao.

| Skill | Diferenca observada | Avaliacao | Decisao |
|---|---|---|---|
| archify | Hash binario diferente; linhas normalizadas iguais. | Diferenca de bytes/normalizacao, sem mudanca semantica observada. | Manter snapshot; nenhuma sincronizacao. |
| banner-design | Hash binario diferente; linhas normalizadas iguais. | Diferenca de bytes/normalizacao, sem mudanca semantica observada. | Manter snapshot; nenhuma sincronizacao. |
| brand | Hash binario diferente; linhas normalizadas iguais. | Diferenca de bytes/normalizacao, sem mudanca semantica observada. | Manter snapshot; nenhuma sincronizacao. |
| design-system | Hash binario diferente; linhas normalizadas iguais. | Diferenca de bytes/normalizacao, sem mudanca semantica observada. | Manter snapshot; nenhuma sincronizacao. |
| playwright | Hash binario diferente; linhas normalizadas iguais. | Diferenca de bytes/normalizacao, sem mudanca semantica observada. | Manter snapshot; nenhuma sincronizacao. |
| slides | Hash binario diferente; linhas normalizadas iguais. | Diferenca de bytes/normalizacao, sem mudanca semantica observada. | Manter snapshot; nenhuma sincronizacao. |
| caveman-commit | Duas linhas adicionais na descricao de frontmatter da origem mencionam ativacao automatica ao preparar staging. | Metadado de descoberta; nao concede autorizacao Git, que continua governada por AGENTS.md e gates humanos. | Manter snapshot ate revisao/versionamento independente. |
| caveman-review | Duas linhas adicionais na descricao de frontmatter da origem mencionam ativacao automatica ao revisar PRs. | Metadado de descoberta; nao concede autorizacao de publicacao/revisao. | Manter snapshot ate revisao/versionamento independente. |
| interface-design | Snapshot tem conteudo substancialmente mais amplo (320 linhas/~30 KB) que o arquivo de origem (34 linhas/~2 KB). | Snapshot inclui exploracao, hierarquia, tokens, controles, acessibilidade e fluxo de trabalho; a origem contem um fluxo mais curto. Nao ha evidencia suficiente para substituir a versao rica. | Manter snapshot versionado; avaliar divergencia em mudanca propria. |

## Resultado e limites

- As seis diferencas de bytes sem diferenca textual normalizada nao exigem sincronizacao semantica.
- As duas alteracoes de descricao nao alteram autorizacao.
- A divergencia de interface-design e material e permanece aberta para decisao de governanca; nao foi resolvida copiando nenhum dos lados.
- O gate estrito de origem passou para o inventario consultado. Isso confirma hashes/arquivos catalogados neste host, nao equivalencia entre todos os ambientes de runtime.
- Dependencias, sobreposicao funcional e seguranca nao sao inferidas somente do frontmatter; placeholders NOT_AUDITED/NOT_ASSESSED continuam explicitos.
- Skills que o manifesto marca REJECTED_CROSS_PROJECT_SCOPE nao podem ser selecionadas pelo roteador LEGACY.
