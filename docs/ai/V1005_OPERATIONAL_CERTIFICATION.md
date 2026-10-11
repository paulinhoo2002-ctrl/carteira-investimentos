# V1005 — certificação operacional LEGACY

Data: 2026-10-11. Escopo: testes sintéticos e análise local na worktree
`codex/v1005-operational-certification`, baseada em `origin/main`
`4cc31ed54000754bda0905aae2e9d06aa75ed6e6`.

## Exportação portátil protegida

- O JSON baixado pelo Centro de Backup usa WebCrypto AES-256-GCM; a chave é
  derivada da senha informada com PBKDF2/SHA-256 (310.000 iterações), salt de
  16 bytes e IV aleatórios de 12 bytes. A senha não é gravada. O payload passa
  pela validação de manifesto, proprietário e SHA-256 antes de cifrar; ao
  importar, é decifrado antes da mesma validação.
- Senha perdida, envelope incompatível, senha incorreta ou arquivo adulterado
  não libera payload. Senha mínima: 12 caracteres. O limite do payload
  exportado é 25 MiB.
- O arquivo baixado é protegido; snapshots mantidos no armazenamento local do
  navegador continuam sem esta criptografia. A UI informa essa distinção.
- A importação de backup continua em prévia; esta entrega não habilita
  restauração real. Nenhum dado de usuário foi exportado, importado ou
  restaurado.

## Recuperação e cobertura operacional

- Verificação sintética: backup criptografado round-trip, ausência do marcador
  de texto claro, salt/IV novos, rejeição de senha errada/adulteração, falhas
  de manifesto e integridade, ciclo de prévia/restauração isolado e retenção.
- O teste de recuperação usa somente stores em memória/sintéticos. Não prova
  recuperação de arquivo real nem sobrevivência à perda de dispositivo.
- Firestore Emulator não iniciou nesta sessão: Firestore Emulator 1.22.0 falhou
  ao criar conexão loopback (`Unable to establish loopback connection`). Isso é
  bloqueio do ambiente, não PASS de regras. QA hospedado com duas identidades,
  login/logout e persistência permanece NOT_TESTED; não houve contas, credenciais
  ou escrita remota.
- Build Modern conclui com avisos preexistentes sobre script classic e import
  `default` ausente em `readonly-report-page-contract.js`. `test:modern` passa.

## Evidência executada

- `npm ci`: PASS; lockfile e package.json sem alteração; auditoria npm reportou
  zero vulnerabilidades.
- `npm test`: PASS (inclui Legacy 255/255 e modo sintético 44/44).
- `npm run test:modern`: PASS (823/823).
- `npm run qa:all`: PASS; overflow, erros de console, page errors e requests
  relevantes = 0 nas larguras 390, 430, 768, 1366, 1440, 1536 e 1920.
- `npm run verify:release`: PASS; 18/18 testes visuais, incluindo estados
  financeiros unknown e navegação responsiva.
- `test:backup-restore`: 16/16; `test:backup-recovery`: 9/9;
  `test:v324-backup`: 17/17; browser read-only sintético: 1/1; E2E financeiro
  e relatórios: 33/33 em execuções focadas.
- O E2E de Relatórios inicialmente falhou 10/10 porque seu servidor de teste
  não injetava o marcador confiável exigido pelo runtime V332. O harness foi
  atualizado para reutilizar `tests/local-http-server.js`; a suíte passou
  10/10 sem reduzir asserts ou alterar segurança.
- GitHub Actions/Vercel para o novo SHA dependem de publicação; nenhum deploy
  manual ou merge foi feito.

## Limites e próximo gate

- Backup externo independente, OAuth/storage, notificação e confirmação de
  agendamento real não estão certificados aqui.
- Uso diário autenticado permanece CONDITIONAL_GO/NO_GO até QA hospedado,
  isolamento multiusuário e recuperação real serem aprovados separadamente.
- Próximo passo: revisar diff, commit/push normal, abrir Draft PR e observar
  CI/Preview no SHA exato. Manter Draft; não mesclar.

`REAL_FINANCIAL_WRITES=0`; `REAL_IMPORT=false`; `REAL_RESTORE=false`;
`REMOTE_WRITES=0`; `PRODUCTION=false`; `MERGE=false`.
