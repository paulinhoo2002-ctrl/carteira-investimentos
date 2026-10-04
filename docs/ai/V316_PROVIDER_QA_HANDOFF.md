# V316: handoff do Provider QA em Preview

Escopo: PR #440 em draft, sem merge. Projeto Firebase QA vazio e separado.
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
   `codex/v315-final-operationalization` se a UI oferecer branch scope. Não
   selecionar Production, Development ou All Environments. Em
   `QA_FIREBASE_PREVIEW_ALLOWED_HOSTS`, inserir somente o host Preview estável
   que foi autorizado no Firebase. Usar o host que o build recebe em
   `VERCEL_BRANCH_URL` (ou `VERCEL_URL` se não houver branch URL), sem `https://`.
   Verificar visualmente sete nomes, escopo Preview/branch e host idêntico ao
   autorizado no Firebase; não compartilhar valores em chat.
   No deployment do HEAD `58ad9a7`, a alias de branch observada é
   `carteira-investimentos-git-a76546-paulinhoo2002-ctrls-projects.vercel.app`.
   Conferir essa alias em **Deployments > Domains** antes de usá-la no Firebase
   e em `QA_FIREBASE_PREVIEW_ALLOWED_HOSTS`; se mudar, usar o valor atual
   exibido pela Vercel em ambos os lugares.
6. **Vercel > Deployments > Preview da branch da PR #440**: gerar novo deployment
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
npm.cmd run qa:preview-provider-smoke -- https://HOST_PREVIEW_ESTAVEL/ QA_PROJECT_ID
```

O comando verifica HTTPS, host permitido, configuração QA completa no
descritor público, projeto QA distinto da produção e ausência de API key de
produção no HTML. Saída `PREVIEW_QA_BOUNDARY_PASS` **não prova login**.
O agente também executa `npm.cmd run test:qa-preview-config` e gates de CI no
SHA exato. Se o Preview estiver protegido pela Vercel, usar o acesso oficial
ao deployment para ler o HTML; não remover proteção para fazer o teste passar.

Quando a identidade QA estiver disponível, executar o gate interativo em
navegador isolado (abre janela temporária; nenhum token é salvo no repositório):

```powershell
npm.cmd run qa:preview-provider-browser -- https://HOST_PREVIEW_ESTAVEL/ QA_PROJECT_ID
```

O operador conclui somente o popup Google na janela aberta. O script bloqueia
requests Firebase para outros projetos, bloqueia writes Firestore e localStorage
financeiro, exige leitura QA autorizada e verifica logout. Ele não usa senha,
MFA ou cookie fornecido ao agente. O resultado só é válido se esse comando
terminar `PROVIDER_QA_PASS` no deployment do HEAD correto.

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
