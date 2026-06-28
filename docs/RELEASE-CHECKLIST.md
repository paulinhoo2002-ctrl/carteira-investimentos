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
