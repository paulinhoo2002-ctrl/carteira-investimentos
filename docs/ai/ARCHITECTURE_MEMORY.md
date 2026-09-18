# Memória de arquitetura

## Identidade e limites

- Projeto: `Carteira de Investimentos LEGACY`.
- Raiz oficial: `C:\Projetos\carteira-investimentos`.
- Worktrees novas: `C:\Projetos\carteira-investimentos.worktrees`.
- Projeto separado proibido: `C:\Projetos\carteira-2.0`.
- Skills canônicas: `C:\Projetos\carteira-investimentos\.agents\skills`.

## Camadas atuais

- `index.html`: shell e apresentação Legacy, navegação e integração dos fluxos.
- Módulos `*-core.js`: regras financeiras e transformações determinísticas.
- `persistence-core.js`: fronteira de persistência; não alterar sem fase própria.
- `modern/`: frontend somente leitura, com bridge e contratos próprios.
- `tests/`: testes unitários, de contrato, smoke e integração local.
- `sw.js`: cache/update do app shell; mudanças exigem QA de atualização.

## Fluxos sensíveis

- Valor de ativo e patrimônio dependem das fontes e contratos oficiais do
  projeto; a camada visual não deve recalcular valores.
- Renda Fixa usa autoridade manual quando fornecida e provenance para explicar
  fallback, estimativa, as-of e stale.
- Import Center segue FILE → DETECT → PARSE → NORMALIZE → VALIDATE → PREVIEW
  → DEDUPE → CONFIRM; preview não escreve.
- Eventos corporativos permanecem shadow/read-only; realização automática está
  desativada.
- Leitura cloud não é escrita cloud; QA protegido deve ser zero-write.

## Memória estrutural

`ARCHITECTURE_MAP.md`, `ARCHITECTURE.md`, `PRODUCT_CONTRACTS.md` e os contratos
financeiros existentes são a fonte narrativa. Um índice externo, se instalado,
é apenas inteligência derivada: nunca substitui estes arquivos nem autoriza
alterações.

