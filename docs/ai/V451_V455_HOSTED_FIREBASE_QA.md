# V451–V455 — Hosted Firebase QA Certification (2026-10-10)

MISSION=V451_V455_HOSTED_FIREBASE_QA
STATUS=COMPLETED
PROJECT_IDENTITY_GATE=PASS — worktree v437-v450-daily-readiness, branch codex/v451-v455-hosted-firebase-qa (base c7690df = main), remote paulinhoo2002-ctrl/carteira-investimentos, checkout limpo.
MODEL_USED=z-ai/glm-5.3 (Hermes/NVIDIA)
SKILLS_USED=carteira-legacy-qa-missions, superpowers:using-superpowers, ponytail full, caveman, verification-before-completion

## V451 — PROVISIONAR FIREBASE QA — COMPLETED (reuso em vez de duplicação)
- Projeto QA **já existia** e foi reutilizado: **carteira-invest-qa-v316** ("Carteira Investimentos QA V316", projectNumber 571302584960), distinto da produção carteira-de-investimento-16725. Conta Google autenticada: paulinhoo2002@gmail.com (via firebase-tools). Web App: 1:571302584960:web:8d654b0a34d4c09968fc65, authDomain carteira-invest-qa-v316.firebaseapp.com. Spark/free (sem faturamento configurado; nenhum billing ativado nesta missão). Nenhuma configuração de produção tocada.
- Nota: o projeto contém 1 usuário pré-existente — a conta pessoal do dono (pmarquesdossantos48@gmail.com, sign-in V316 histórico). NÃO foi usada em nenhum teste; os testes usaram exclusivamente as duas contas sintéticas criadas nesta missão.

## V452 — AUTH E FIRESTORE — COMPLETED
- Firestore: banco (default) NATIVE STANDARD já presente.
- Regras: as regras canônicas do LEGACY (`firestore.rules` do repo — UID-scoped: /users/{uid} e /portfolios/{uid} owner-only; /meta/access admin-only) foram deployadas no projeto QA via `firebase deploy --only firestore:rules --project carteira-invest-qa-v316` (config scratch separado; DUPLA conferência do projectId antes do deploy). Fail-closed confirmado pelos testes (abaixo).
- Authentication: provider **Email/Password habilitado** via Identity Toolkit v2 config PATCH (updateMask signIn.email), usando o token de acesso do firebase-tools em-process (token nunca impresso). Provider Google do QA permanece como estava; produção intocada.

## V453 — DUAS CONTAS SINTÉTICAS — COMPLETED
- Criadas via REST signUp (apiKey pública do web app QA):
  - qa-a@exemplo-invalido.test (localId Aha9QbZ57RdMvinz0FJdSP3QlG72)
  - qa-b@exemplo-invalido.test (localId 7IL5SvaGTyWDd4Alyh7NWEknGLu1)
- Senhas sintéticas fortes, usadas somente nos testes, não commitadas ao repo.
- Isolamento comprovado (REST contra Firestore do QA, regras canônicas ativas):
  - B não lê dados de A: **403**
  - B não escreve dados de A: **403**
  - A não lê dados de B: **403**
  - A não escreve meta/access (não-admin): **403**
  - Anônimo sem token: **401**
  - Login com senha errada: rejeitado
- USER_A_ISOLATION=PASS | USER_B_ISOLATION=PASS

## V454 — PERSISTÊNCIA HOSPEDADA — COMPLETED
- A grava /portfolios/{A} sintético (200), lê de volta (200).
- B grava /portfolios/{B} sintético (200).
- **Novo login (token novo) + releitura persiste**: A re-autentica e lê o mesmo documento (200) — persistência entre sessões comprovada no hospedado.
- Cleanup controlado: apenas os documentos sintéticos desta missão foram deletados (200 ambos) e ausência confirmada (404).
- HOSTED_PERSISTENCE=PASS. Zero escritas em produção. Zero dados reais.

## V455 — CERTIFICAÇÃO — COMPLETED (bateria local no HEAD)
- npm test: **868/868** | test:modern: **823/823** | verify:release: **1714/1714** (OVERFLOW=0, CONSOLE=0, PAGE=0, REQUEST=0) | qa:all: PASS 0/0/0/0 | test:finance: 94/94 | git diff --check: clean.
- Nota de ambiente: o smoke requer `PLAYWRIGHT_BROWSERS_PATH=%LOCALAPPDATA%\ms-playwright` nesta máquina (binário chromium 1248 instalado via npx playwright install); sem o env, a perna qa:smoke do verify:release falha por "Executable doesn't exist". CI do GitHub não é afetado (instala browsers próprios).

### Matriz de permissões (regras canônicas, validadas no QA hospedado)
| Caminho | Owner | Outro usuário | Anônimo |
|---|---|---|---|
| /users/{uid} | read/write ✅ | 403 | 401 |
| /portfolios/{uid} | read/write ✅ | 403 | 401 |
| /meta/access | admin-only | 403 | 401 |
| resto (deny-all implícito) | — | — | — |

### Diferenças emulador vs QA hospedado
- Emulador: identitytoolkit/firestore em 127.0.0.1, regras v311 (QA identity por regex de email), usuários efêmeros.
- Hospedado QA: regras canônicas do repo (isAdmin por email verificado do dono), contas persistentes, latência real de rede, Auth REST real. Ambos fail-closed; hospedado confirma o mesmo comportamento com tokens reais do Google.

### Riscos e observações
- R1 (resolvido): QA hospedado agora existe e está certificado — bloqueio V436/V439 superado.
- R2: órfãos do emulador por ciclo local (precheck existente resolve; fora do escopo hospedado).
- R3: sw.js WebKit flaky em loopback local (não afeta hospedado).
- O usuário pré-existente no QA (conta pessoal do dono, sign-in histórico) não participou dos testes; recomenda-se removê-lo do projeto QA para higiene (ação de console, opcional).

### Parecer
GO_NO_GO=**CONDITIONAL_GO** — autenticação hospedada, isolamento multiusuário e persistência agora COMPROVADOS no QA hospedado com contas sintéticas. Falta apenas a validação funcional humana em produção (fluxo interno autenticado no app em https) para o GO final. PRODUCTION_READY=false até essa validação.

PRODUCTION_FIREBASE_WRITES=0 (nenhuma operação contra carteira-de-investimento-16725)
REAL_FINANCIAL_WRITES=0 | REAL_FINANCIAL_IMPORT=false | REAL_FINANCIAL_RESTORE=false | MANUAL_PRODUCTION_DEPLOY=false | MERGE=false