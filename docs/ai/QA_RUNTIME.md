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
