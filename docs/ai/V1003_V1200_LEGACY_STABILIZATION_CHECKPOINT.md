# V1003–V1200 — estabilização LEGACY, checkpoint

Data de verificação: 2026-10-11. Evidências remotas consultadas por integrações GitHub/Vercel; os SHAs e status abaixo foram conferidos nesta sessão.

## Identidade e Git

- Repositório: `paulinhoo2002-ctrl/carteira-investimentos`.
- Main observada: `6b559adac12cdedb40d7b8294b14c82469c07446`.
- Worktree desta atualização: `C:\Projetos\carteira-investimentos.worktrees\v1003-post-merge-continuity`.
- Branch: `codex/v1003-v1200-legacy-stabilization`; base inicial: `6b559ad...`.
- Checkout canônico sujo foi preservado. Nenhum outro projeto foi aberto ou alterado.

## PRs integradas

| PR | Estado | HEAD final da PR | Merge SHA | CI do HEAD da PR |
|---|---|---|---|---|
| #485 | MERGED | `b38eb01e53360b69e33f18915df3af1237f441ed` | `6b559adac12cdedb40d7b8294b14c82469c07446` | run `38141526685`, SUCCESS |
| #486 | MERGED | `8639de10f00ab785b69d46abe38ef9cbf06eea98` | `78549c05c0a9baf8cabf7c57513bf6946f399908` | run `38137552802`, SUCCESS |
| #487 | MERGED | `9339673bdbf319018cf2cf77adc042249a0fff2d` | `a746e0c4cd198baa6d9af00cc4188557dfa5300d` | run `38106363081`, SUCCESS |

Os três HEADs de PR também têm status Vercel success. A ferramenta disponível lista apenas runs disparados por PR e retornou lista vazia para o merge SHA; portanto `POST_MERGE_GITHUB_ACTIONS=NOT_OBSERVED`, não PASS. Vercel reportou deployment `READY` no commit main `6b559ad...` (target production). Foi somente leitura de metadados; nenhum deploy foi iniciado manualmente e isso não certifica uso diário.

## Backup e recuperação

- PR #485 integrada: isolamento de snapshots locais por escopo derivado do UID, prevenção de overwrite exato, verificação de manifesto/checksum e limites explícitos do verificador.
- Capacidades permanecem distintas: export manual, snapshots IndexedDB locais/oportunistas, verificação do backup e preview/restore sintético.
- Backup off-device independente, criptografia de destino externo, agenda garantida, notificação de falha e recuperação após perda total do dispositivo: `NOT_CERTIFIED`.
- Nenhum backup financeiro real foi lido, exportado ou restaurado.

## Firebase e autenticação

- CI dos HEADs #485/#486/#487 executou Auth/Firestore Emulator QA com sucesso quando presente no workflow da PR.
- Emulator QA não prova Firebase hospedado. Login/logout hospedado, persistência após nova sessão e isolamento entre dois usuários sintéticos: `NOT_TESTED` nesta verificação.
- Nenhuma credencial/OAuth foi acessada; nenhuma escrita Firebase real ocorreu.

## Dependências

- `npm audit` read-only no lockfile da main: 7 findings totais, 4 high e 3 moderate, em dependências de desenvolvimento (baseline-browser-mapping, browserslist, esbuild, nanoid, postcss, source-map-js, vite); `fixAvailable=true` foi reportado pelo audit.
- `npm audit --omit=dev`: zero findings.
- Nenhum pacote ou lockfile foi alterado. Correção exige autorização/escopo específico de dependências e matriz de compatibilidade; não executar `npm audit fix` indiscriminadamente.

## Finanças, performance e QA

- Esta fase não mudou código financeiro; não constitui auditoria independente integral de fórmulas.
- Evidência CI das PRs é herdada apenas para seus SHAs exatos. Não rodamos suites locais nesta atualização documental; Actions para o merge SHA da main não foram observadas.
- Performance não foi medida nesta fase. Sem alegações de otimização.
- Sem dado financeiro real, escrita financeira, importação, restauração real, OAuth, infraestrutura paga ou deploy manual.

## Resultado e retomada

- `PR485_PR486_PR487=MERGED`.
- `MAIN_VERCEL_DEPLOYMENT=READY` para o SHA exato listado; `POST_MERGE_GITHUB_ACTIONS=NOT_OBSERVED`.
- `DEVELOPMENT_DEPENDENCY_REMEDIATION=HUMAN_SCOPE_GATE`.
- `HOSTED_MULTIUSER_FIREBASE_QA=NOT_TESTED`.
- `INDEPENDENT_EXTERNAL_BACKUP=NOT_CERTIFIED`.
- `PRODUCTION_READY=false`.
- Próximo passo: autorização delimitada para corrigir dependências de desenvolvimento em worktree isolada; depois avaliar QA hospedado/backup externo sob credenciais e destino explicitamente autorizados.

REAL_FINANCIAL_WRITES=0
REAL_FINANCIAL_EXPORT=false
REAL_FINANCIAL_RESTORE=false
PRODUCTION=false
MERGE=false