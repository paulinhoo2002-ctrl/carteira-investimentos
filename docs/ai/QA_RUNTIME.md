# Runtime QA canônico

- Servidor: `python.exe -m http.server 4173 --bind 127.0.0.1`
- Origem: `http://127.0.0.1:4173`
- URL protegida: `http://127.0.0.1:4173/index.html?protectedReadOnlyQa=1`
- CDP: `127.0.0.1:9233`
- Perfil: `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-authenticated`,
  perfil `Default`
- Runtime de autoridade: V2; cache esperado: `carteira-investimentos-v18`.
- Durante uma atualização, o cliente ativo pode continuar em uma versão anterior
  enquanto o novo worker fica `waiting`; o cache anterior só é removido depois
  da ativação explícita e segura do novo worker.

Comandos: `npm.cmd run qa:browser:start`, `qa:browser:doctor`,
`qa:auth:status`, `qa:browser:stop`. Nunca matar Chrome desconhecido. O V77
corrigiu o launcher que esperava o marcador `phase4i-authority-1` em vez de
`phase4i-authority-2`.

## V262 — preview autenticado

- A superfície real de Renda Fixa V262 é a aplicação legacy em `/` com
  `?protectedReadOnlyQa=1`; `/modern/` é um host separado, não o fluxo fiscal/RF
  real. `testMode=1&activeWalletHost=1` intencionalmente ignora o bootstrap do
  Firebase e não serve para diagnosticar Auth.
- Para QA de preview, use somente o perfil QA isolado
  `%LOCALAPPDATA%\\CarteiraInvestimentos\\qa-browser-authenticated`; CDP pode
  usar a porta local configurada para aquela instância (V262 usou 9234). Nunca
  anexar ao perfil pessoal nem transferir cookies/tokens/sessão.
- Verifique Firebase SDK/config/app/Auth/Firestore e estado de acesso antes de
  pedir login manual. O login normal deve ocorrer na janela visível; não
  contornar SSO, Authorized Domains ou segurança Firebase.
- O teste offline precisa de snapshot confiável, user-bound e gerado
  organicamente após carga online autenticada. Perfil frio sem snapshot deve
  permanecer gated/unavailable; não fabrique nem injete dados no storage.
- A criação do snapshot por fluxo autenticado normal pode produzir auditoria de
  acesso não financeira. Separe esse evento dos contadores de mutação financeira
  e fiscal; não declare zero backend writes globais sem instrumentação que
  prove isso.
