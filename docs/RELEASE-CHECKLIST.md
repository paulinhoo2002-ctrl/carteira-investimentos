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

## Gate M781-M789 — backup sem senha: certificação final (2026-10-23)

- [x] M781: a4a2bc4 filho direto de 8cfb99b (PR #536 head); diff = docs/BACKUP_PROCEDURE.md + index.html (opção `exportBackup({encrypted:false})` explícita, protegido permanece default) + tests/backup-encryption.test.js (+130); zero regras/manifests/modern-dist.
- [x] M782: manifests intactos; `npm ci --ignore-scripts` reproduzível (94 pacotes, zero install scripts).
- [x] M783: verify:release no HEAD final e49cb7f = **2074/2074 fail 0 exit 0** (inclui Finance/UI/Persistence/Auth/E2E, Modern, qa:all/smoke, V289/V346, Axe, Hide Values). Primeira rodada em a4a2bc4 encontrou 1 falha real (seletor V249) — corrigida em e49cb7f (contrato preservado: payload portability, zero brapiToken).
- [x] M784: Auth Browser, Axe, Hide Values, backup suites (30/30 + v249 3/3) e regressão visual verdes dentro da bateria no HEAD final.
- [x] M785: validação em navegador do guard anti-vazamento — em modo QA sintético `exportBackup({encrypted:false})` exibe "🧪 Modo de teste local: exportação desativada.", NÃO gera download e não altera estado; exportação sem senha real só ocorre na sessão legítima do proprietário (roteiro pós-deploy). Gate de confirmação obrigatória antes de restaurar presente.
- [x] M786: compatibilidade com backups protegidos anteriores mantida (suites: protected continua exigindo senha + autenticação AES-GCM antes da validação; rótulo 'Legado'; backup real do proprietário ÍNTEGRO por sidecar SHA-256 — não convertido, não substituído).
- [x] M787: reconciliação UID — evidência MATCH da M721–M730 não é reproduzível de fonte independente acessível (não está no repo/docs/sessões acessíveis); posição conservadora: NOT_VERIFIED até confirmação de 1 min do proprietário no Console. Identidade/projeto/regras exatos confirmados (projeto carteira-de-investimento-16725 via CLI autenticado; hash de regras pinado e certificado 10/10 no CI).
- [x] M788: backup real ÍNTEGRO (sidecar SHA-256 confere); snapshot das regras hospedadas ÍNTEGRO e duplicado em duas capturas idênticas; diff explícito hospedado↔candidato executado: produção roda regras ANTIGAS permissivas (isSignedIn + sandbox por uid + isAdmin sem verificação), candidato = owner-only (UID fixo + verificado + e-mail). Zero escritas no Firebase.
- [x] M789: atualização única da PR #536 preparada (push de e49cb7f sobre 8cfb99b, fast-forward) — impacto CI: V249 selector fix + testes de backup ampliados dentro do job existente (~+segundos); impacto Vercel: NENHUM (guard de preview ativo; merge não autorizado).

Regras de segurança mantidas: backup sem senha NÃO é criptografado (declarado na UI e no procedimento); SHA-256 detecta corrupção acidental, NÃO substitui autenticação contra adulteração deliberada (AES-GCM do modo protegido sim); política owner-only intacta.
