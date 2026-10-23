# Release Checklist v1.0 RC1+1

## Hardening pós-RC

- [x] `sw.js` atualizado para `CACHE_NAME = carteira-investimentos-v16`.
- [x] `sw.js` continua com bypass para `/api/` e `sw.js`.
- [x] Firestore Rules exigem `email_verified == true` para admin.
- [x] `meta/access` restrito ao administrador.
- [x] Logs diretos de produção reduzidos no `index.html`.

## Validações mantidas

- [x] Produção acessível.
- [x] Build validado com `npm run build`.
- [x] Nenhum cálculo financeiro alterado.
- [x] Nenhuma tela ou fluxo principal alterado.
- [x] `api/yahoo-quote.js` não alterado.
- [x] `firestore.rules`, `firebase.json` e `.firebaserc` revisados sem impacto fora do hardening.

## Observação

- Aviso futuro de depreciação do Firebase `enableMultiTabIndexedDbPersistence()` continua conhecido e não bloqueante.

## Gate local M631 — 2026-10-23

- [ ] O proprietário compara, na sessão legítima do Firebase Console, o UID da própria conta em **Authentication → Users** com o UID fixo em `firestore.rules` da candidata; confere também o e-mail e `email_verified`. Registrar somente `MATCH`, `NO MATCH` ou `NOT_VERIFIED`, sem enviar identificadores, tokens ou capturas da conta.
- [ ] O teste de regras cobre DELETE, listagem e consultas restritas pelo nome do documento. A execução dinâmica nova está pendente: o emulador Firestore local encerra antes dos testes porque `Selector.open()` falha no Java 21 e 26. O CI verde da PR #536 certifica somente os testes presentes no HEAD remoto anterior.
- [ ] O backup financeiro real deve ser exportado pelo proprietário conforme `docs/BACKUP_PROCEDURE.md`; sidecar SHA-256 e armazenamento independente devem ser conferidos. Restauração real exige autorização separada.
- [ ] QA autenticado da versão candidata e QA posterior à publicação permanecem `NOT_VERIFIED`. Evidência histórica de produção não certifica a candidata.
