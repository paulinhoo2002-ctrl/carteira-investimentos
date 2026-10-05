# V316: handoff do Provider QA em Preview

## Estado atual após V321 sobre o main V320

- Main inclui V317/PR #442 e V320/PR #443; SHA `c14924998aadf3b783e790294b7efa74877bbcd0`. CI pós-merge run `37315410156` (#774) SUCCESS. Runtime financeiro local permanece certificado somente com dados sintéticos.
- A sucessora de reconciliação é `codex/v321-postmerge-reconcile`, baseada nesse main. #440 e #441 permanecem separadas, abertas em Draft e sem merge; não use os deployments antigos dessas PRs para validar a implementação reconciliada.
- V321 mantém QA Firebase exclusivo em Preview autorizado, configuração de produção removida do artefato Preview, sem fallback, guards read-only e regras de produção intactas. Se a persistência `SESSION` falhar ou estiver indisponível, login e sessão restaurada ficam bloqueados antes da leitura de acesso.
- Teste cruzado cobre compra V317 em runtime local sintético e bloqueio no Preview antes de `save()`. Isso não autentica Google nem certifica cloud persistence. `REAL_PROVIDER_QA=NOT_TESTED`; `CLOUD_PERSISTENCE_CERTIFIED=false`.
- Após o push, exigir novo deployment Preview da branch V321 com SHA idêntico ao HEAD da PR. Inspecionar somente URL Preview/SHA e o resultado do smoke; nunca enviar valores das sete variáveis, email, senha, MFA, cookies, tokens ou bypass por chat.
- A tentativa local de Auth/Firestore Emulator não iniciou: Firebase CLI encontrou `EPERM` ao acessar a configuração global e, com configuração isolada, o Firestore Emulator encerrou inesperadamente sem diagnóstico. A CI Ubuntu no HEAD reconciliado é a evidência necessária para esse gate.
- Estado observado em 2026-10-05: PR #444 tem CI #777 SUCCESS no HEAD `e74df87bdb345801d803dd3fd1417c376cc41759`; Preview Ready nesse SHA em `carteira-investimentos-111kuhx36-paulinhoo2002-ctrls-projects.vercel.app`. A página pública mostra login desabilitado e autenticação indisponível, conforme esperado sem QA config. A consulta Vercel sem descriptografar valores não encontrou variáveis no escopo da branch `codex/v321-postmerge-reconcile`; o novo deployment precisa ser gerado após configurar as sete variáveis no escopo Preview/branch.

- Atualização V321 em `e189ea273379772ec69f2708d972298172fc2049`: as sete variáveis `QA_FIREBASE_*` foram encontradas no escopo Preview da branch `codex/v321-postmerge-reconcile` (valores não lidos/exibidos). O deployment desse SHA foi criado antes delas e não contém o novo ambiente; o próximo Preview deve ser gerado por um push autorizado.
- O harness `scripts/qa/preview-provider-browser.cjs` agora exige `QA_BROWSER_CDP_ENDPOINT` em loopback e se conecta ao Chrome já autenticado, criando apenas uma nova aba e roteando somente essa aba e seus popups. Não exporta nem persiste cookies. Sem endpoint, retorna `VERCEL_AUTH_REQUIRED` e não abre Chromium vazio. Também classifica configuração/descritor, tenta Google QA pela UI, verifica sessão após reload/logout e bloqueia qualquer solicitação Firebase antes de validar a fronteira.
- A porta local padrão CDP `127.0.0.1:9222` não estava disponível na inspeção de 2026-10-05. `GOOGLE_PROVIDER_QA=NOT_TESTED`; não usar o navegador isolado antigo nem alegar certificação live até haver acesso suportado ao mesmo contexto autenticado. A consulta CUA do Preview corrente não tinha `__FIREBASE_DEPLOYMENT__` e não foi usada para ler estado financeiro.

Escopo: #440/#441 não devem ser merged; PR V321 permanece draft até revisão e validação externa aplicáveis. O projeto Firebase QA deve ser isolado e nunca receber dados reais.
`firebase.qa-preview.rules` é exclusivo desse projeto; **não publicar em produção**.
O app Preview bloqueia login sem configuração QA completa e host autorizado.

## Ações humanas externas, em ordem

1. **Firebase Console > Add project**: criar projeto QA novo, sem importar dados,
   usuários ou regras de produção. Em Project Overview > ícone Web > Register app,
   registrar app Web QA. Em Project settings > General > Your apps > SDK setup and
   configuration, conferir os seis campos da tabela abaixo. Verificar visualmente
   que Project ID difere do projeto de produção. Agente consumirá somente o
   deployment Preview e metadados; valores da configuração devem ser inseridos
   diretamente na Vercel, nunca no chat.
2. **Firebase Console do projeto QA > Build > Firestore Database > Create database**:
   criar banco `(default)` em modo bloqueado/produção, não Test mode. Em
   Firestore Database > Rules, publicar o conteúdo exato de
   `firebase.qa-preview.rules` **somente no projeto QA**. Verificar visualmente
   regras publicadas e ausência de permissões de escrita. Não alterar
   `firestore.rules` de produção.
3. **Firestore Database > Data**: criar somente `meta/access` com
   `enabled` (boolean) = `true` e `allowedEmails` (array de string) contendo
   exatamente o e-mail da identidade Google sintética QA. Não usar conta de
   produção, domínio amplo, dados de carteira ou valores financeiros. Conferir
   visualmente caminho, tipo dos campos e único e-mail autorizado. O agente
   consumirá apenas resultado de autorização/negação, sem ler o e-mail.
4. **Firebase Console QA > Authentication > Sign-in method > Google**: habilitar
   Google e salvar. Em Authentication > Settings > Authorized domains, adicionar
   somente o host Preview estável escolhido, sem protocolo ou caminho. Verificar
   visualmente Google `Enabled` e host exato na lista. Não autorizar domínio de
   produção nem outros Previews. Uma identidade Google sintética QA deve estar
   disponível para o login interativo; senha, MFA e tokens não devem ser enviados
   ao agente. O login Google cria o usuário Auth no primeiro acesso.
5. **Vercel > projeto `carteira-investimentos` > Settings > Environment Variables**:
   criar as sete chaves abaixo apenas em **Preview**, limitadas à branch
   `codex/v321-postmerge-reconcile` se a UI oferecer branch scope. Não
   selecionar Production, Development ou All Environments. Em
   `QA_FIREBASE_PREVIEW_ALLOWED_HOSTS`, inserir somente o host Preview estável
   que foi autorizado no Firebase. Usar o host que o build recebe em
   `VERCEL_BRANCH_URL` (ou `VERCEL_URL` se não houver branch URL), sem `https://`.
   Verificar visualmente sete nomes, escopo Preview/branch e host idêntico ao
   autorizado no Firebase; não compartilhar valores em chat.
   A alias de branch observada durante a preparação V316 é
   `carteira-investimentos-git-a76546-paulinhoo2002-ctrls-projects.vercel.app`.
   Conferir essa alias em **Deployments > Domains** antes de usá-la no Firebase
   e em `QA_FIREBASE_PREVIEW_ALLOWED_HOSTS`; se mudar, usar o valor atual
   exibido pela Vercel em ambos os lugares.
6. **Vercel > Deployments > Preview da branch da PR V321**: gerar novo deployment
   depois de salvar as variáveis, pois elas não mudam deployments anteriores.
   Conferir commit SHA da PR e estado Ready. Não usar `--prod`, não promover
   deployment e não fazer merge. O agente consumirá URL e SHA do Preview; ambos
   são não secretos. Se Deployment Protection impedir HTTP público, a validação
   deve usar acesso oficial à Preview, sem expor bypass/token no chat.

## Variáveis Vercel Preview

| Nome | Origem no Web app QA | Classe | Contrato |
|---|---|---|---|
| `QA_FIREBASE_API_KEY` | `apiKey` | PUBLIC_CONFIG; DO_NOT_SEND_IN_CHAT | API key do app QA, diferente da produção |
| `QA_FIREBASE_AUTH_DOMAIN` | `authDomain` | PUBLIC_CONFIG; DO_NOT_SEND_IN_CHAT | `<QA_PROJECT_ID>.firebaseapp.com` |
| `QA_FIREBASE_PROJECT_ID` | `projectId` | PUBLIC_CONFIG; DO_NOT_SEND_IN_CHAT | ID QA diferente da produção |
| `QA_FIREBASE_STORAGE_BUCKET` | `storageBucket` | PUBLIC_CONFIG; DO_NOT_SEND_IN_CHAT | bucket do mesmo projeto QA |
| `QA_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | PUBLIC_CONFIG; DO_NOT_SEND_IN_CHAT | dígitos do app QA |
| `QA_FIREBASE_APP_ID` | `appId` | PUBLIC_CONFIG; DO_NOT_SEND_IN_CHAT | app ID do mesmo projeto QA |
| `QA_FIREBASE_PREVIEW_ALLOWED_HOSTS` | host Vercel Preview estável | PUBLIC_CONFIG; DO_NOT_SEND_IN_CHAT | host exato, sem esquema/caminho |

Não configurar `PRODUCTION_FIREBASE_PROJECT_ID` na Vercel: o build extrai
internamente a fronteira do código existente. `VERCEL_ENV`, `VERCEL_URL` e
`VERCEL_BRANCH_URL` são variáveis de sistema da Vercel. Senha, MFA, token,
OAuth client secret e bypass de Deployment Protection são `SECRET;
DO_NOT_SEND_IN_CHAT` e não são variáveis requeridas pelo app.

## Validação após provisionamento

No worktree LEGACY correto, com o novo Preview Ready e sem credenciais no
terminal, executar:

```powershell
npm.cmd run qa:preview-provider-smoke -- https://HOST_PREVIEW_ESTAVEL/
```

O comando verifica HTTPS, host permitido, configuração QA completa no
descritor público, projeto QA distinto da produção e ausência de configuração
de produção no HTML. Saída
`PREVIEW_QA_BOUNDARY_PASS` **não prova login**. O harness lê internamente o
ID QA público já implantado; nenhum valor precisa ser enviado no chat.
O agente também executa `npm.cmd run test:qa-preview-config` e gates de CI no
SHA exato. Se o Preview estiver protegido pela Vercel, usar o acesso oficial
ao deployment para ler o HTML; não remover proteção para fazer o teste passar.

Quando o endpoint CDP local do Chrome já autenticado estiver disponível,
executar o gate interativo pelo mesmo perfil (somente `http://127.0.0.1` ou
`http://localhost`; nenhum cookie/token é exportado ou salvo):

```powershell
$env:QA_BROWSER_CDP_ENDPOINT = 'http://127.0.0.1:9222'
npm.cmd run qa:preview-provider-browser -- https://HOST_PREVIEW_ESTAVEL/
```

O script cria uma aba nova no contexto autenticado existente; não toca nas
demais abas. Antes da fronteira validada, aborta e registra qualquer solicitação
Firebase. Depois aceita somente Auth QA e leituras Firestore QA, bloqueia outros
projetos, writes Firestore, escritas/remoções financeiras locais e
`localStorage.clear()`, e valida sessão persistente e logout. Se surgir SSO,
continua esperando na mesma janela/contexto; autenticação, cookies, MFA ou
bypass nunca são lidos pelo script. Sem endpoint local, o gate para com
`VERCEL_AUTH_REQUIRED`; não inicie uma sessão limpa nem repita login. O resultado
só é válido se terminar `PROVIDER_QA_PASS` no deployment do HEAD correto.

O smoke Node por URL funciona quando o deployment é acessível por HTTP público.
No Preview atual, Vercel SSO responde a clientes anônimos; não desligar a
proteção nem compartilhar link/token de bypass. Para esse caso, o agente usa a
leitura autenticada pelo conector Vercel para o smoke público e o operador usa
a janela isolada acima para SSO + Provider.

Mesmo se o navegador já tiver `civ5` de Preview antigo, o runtime QA não lê
esse estado, não mescla proventos locais e não grava snapshot financeiro offline.
Os dados locais existentes permanecem intactos; a sessão QA usa apenas memória
limpa e o projeto QA autorizado. Snapshots de avaliação e fluxos V76 também
começam vazios sem ler as chaves antigas do `localStorage`; as funções que os
criam ou alteram ficam inativas em QA protegido. Um backup exportado começa
com stores V76 vazias daquela sessão.

O gate interativo usa navegador QA isolado, identidade sintética e somente
leitura: abrir o mesmo host, conferir botão Google disponível, autenticar,
conferir `meta/access` aprovado, carteira QA vazia, logout e sessão encerrada.
Na captura de rede, permitir Auth do projeto QA e leituras Firestore QA;
reprovar qualquer requisição a projeto Firebase de produção ou qualquer write
Firestore/local financeiro. Testar identidade não permitida e host desconhecido:
acesso deve falhar fechado. Sem identidade/conta disponível, reportar
`PROVIDER_LOGIN=NOT_TESTED`; nunca substituí-lo por `testMode` ou emulador.

Referências oficiais: [Firebase Web setup](https://firebase.google.com/docs/web/setup),
[Google Auth](https://firebase.google.com/docs/auth/web/google-signin),
[Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started),
[Vercel environment variables](https://vercel.com/docs/environment-variables).
