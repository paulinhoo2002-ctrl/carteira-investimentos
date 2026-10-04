# V294 — Wave F Confiabilidade: handoff final

## Estado

WAVE=V294 / Wave F
START_HEAD=0c0556661f1f73e9e33bfed1cb2fe5d4c152df87
CURRENT_HEAD=0aa3462ab8397cf516f09935cf0db4294592b34f
WAVE_F_AUTHORITY_FIX_COMMIT=0aa3462ab8397cf516f09935cf0db4294592b34f
COMMIT_MESSAGE=fix(ui): expose asset authority in reliability view

A apresentação por ativo expõe autoridade, fonte e data de atualização em campos distintos. A classificação só usa metadados explícitos disponíveis; quando não há autoridade, a interface informa “Não informada”. Conteúdo técnico detalhado continua recolhido.

## Certificação

TECH_REVIEW: BLOCKER=0, MAJOR=0, MINOR=0
VISUAL_REVIEW: BLOCKER=0, MAJOR=0, MINOR=1 (evidence-only)

ASSET_AUTHORITY_VISIBLE=true
SOURCE_DISTINCT_FROM_AUTHORITY=true
FRESHNESS_DISTINCT_FROM_AUTHORITY=true
UNKNOWN_AUTHORITY_NOT_FABRICATED=true

WAVE_F_FOCUSED=5/5 PASS
NEIGHBORS=77/77 PASS (confiança/proveniência, Renda Fixa, detalhe de ativo e navegação)
FULL_TEST=252/252 PASS
MODERN_TEST=815/815 PASS
BUILD=PASS
BUILD_MODERN=PASS (execução standalone; sem EPERM)
DIFF_CHECK=PASS

## Evidência visual

Capturas dark sintéticas atuais: `v294-confiabilidade-1366-dark-post-major-fix.png` e `v294-confiabilidade-390-dark-post-major-fix.png`, verificadas no diretório SDD. O `PHOTO_PICKUP_INDEX.md` contém links relativos e caminhos absolutos canônicos.

## Pendências conhecidas

PHASE_198=PREEXISTING_FAILURE_DOCUMENTATION_DRIFT
V286_DOC=NOT_PRESENT_IN_THIS_BRANCH_BY_DESIGN
PHASE_206=TEST_HARNESS_FAILURE (4/5; harness VM, não corrigido nem enfraquecido)
XLSX=DEFERRED_INTEGRATION_GAP
XLSX_REQUIRED_BEFORE_RELEASE_CANDIDATE=true

## Incidente operacional

WRONG_CHECKOUT_GIT_VERIFICATION=true
LOCAL_IMPORTS_FILENAMES_LISTED=true
LOCAL_IMPORTS_CONTENT_READ=false
LOCAL_IMPORTS_MODIFIED=false
Nenhum nome de arquivo privado é reproduzido aqui. Após o incidente, as operações desta Wave ocorreram exclusivamente na worktree visual e consultas de status excluíram `local-imports`.

## Segurança e escopo

FINANCIAL_LOGIC_CHANGED=false
PERSISTENCE_CHANGED=false
FIREBASE_CHANGED=false
IMPORT_AUTHORITY_CHANGED=false
REAL_DATA_USED=false
LOCAL_IMPORTS_ACCESSED=false
WAVE_F_IMPLEMENTATION_COMPLETE=true
WAVE_F_EXTERNALLY_CERTIFIED=false
WAVE_G_STARTED=false
PUSH=false
PR=false
MERGE=false
DEPLOY=false

## Próximo passo

Após confirmar o fechamento local da Wave F, retomar a governança Ponytail pendente separadamente. Não iniciar Wave G neste handoff.
