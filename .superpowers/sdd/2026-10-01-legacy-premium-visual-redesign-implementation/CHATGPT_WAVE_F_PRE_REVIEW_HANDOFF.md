# V294 Wave F — Confiabilidade | Handoff para revisão

## Estado

```text
START_HEAD=92e585753535e8c631a05576f09eb74476467806
CURRENT_HEAD=ce66e2d8d0f8cc9a68b5c38a1a9fc6f4f8a51e0e
PRODUCT_COMMIT=517410161b72c756a97e3b6748979066084f57a0 refactor(ui): prioritize reliability evidence
TEST_COMMIT=ce66e2d8d0f8cc9a68b5c38a1a9fc6f4f8a51e0e test(ui): verify reliability viewport states
WAVE_F_IMPLEMENTATION_COMPLETE=true
WAVE_F_EXTERNALLY_CERTIFIED=false
WAVE_G_STARTED=false
```

## Escopo e decisões

- A rota Confiabilidade abre com estado geral, frescor identificado, estado de sincronização, cobertura por classificação, origem/autoridade e até três lacunas de evidência. Em mobile, mostra até duas lacunas antes dos diagnósticos recolhidos.
- Itens de lacuna usam o produtor/priorização existentes, mantêm impacto e recomendação factual existentes e encaminham por ações já disponíveis. Nenhuma orientação de compra/venda foi criada.
- Posições, filtros, reconciliações, autoridade manual, auditorias V257 e monitoramento V258 continuam disponíveis em disclosure sem remoção de dados/evidências.
- Estados de ausência, desconhecido, parcial, desatualizado, sincronização e autoridade continuam acompanhados por texto. A ausência de achados não vira certificação de completude.
- Cobertura sem registros permanece indisponível/sem posição para avaliar; não é exibida como 0%. `SOURCE_AS_OF` e `FINANCIAL_AS_OF` são mostrados por campos de origem distintos quando realmente presentes. Datas sem horário ISO são formatadas como data civil local para evitar recuo de um dia.
- Auditoria atual: KEEP — filtros, linhas/evidências, reconciliações, histórico, ações V257/V258 e estados; MOVE — síntese, frescor, cobertura, autoridade e lacunas para o início; COLLAPSE — listas longas, reconciliações e diagnósticos técnicos sob disclosure; REMOVE — nada.
- Escopo de código: apenas apresentação em `index.html` e teste de browser sintético em `tests/v289-reliability.test.js`.

## Verificação

```text
FOCUSED=4/4 PASS
NEIGHBORS=185/185 PASS
FULL_TEST=252/252 PASS
MODERN_TEST=815/815 PASS
BUILD=PASS
BUILD_MODERN=PASS
DIFF_CHECK=PASS
VIEWPORTS=390,430,768,1366,1440,1536,1920; dark/light
OVERFLOW=0
PRIMARY_TEXT_CLIPPING=0
INTERACTIVE_TARGETS_BELOW_44PX=0
CONSOLE_ERRORS=0
PAGE_ERRORS=0
LOCAL_REQUEST_FAILURES=0
```

`phase-198-production-system-audit.test.js` foi executado adicionalmente e falhou em um contrato documental preexistente: espera `# Project Phases Roadmap`, mas `docs/project-phases-roadmap.md` já começa com `# CURRENT PROJECT STATE` no HEAD inicial; nenhum desses documentos foi modificado nesta missão. A falha não integra a contagem das suítes vizinhas verdes.

## Semântica e segurança

```text
UNKNOWN_NOT_ZERO=preserved_and_tested
PARTIAL_NOT_COMPLETE=preserved_and_tested
SOURCE_AS_OF_DISTINCT_FROM_FINANCIAL_AS_OF=preserved_and_tested
AUTHORITY_DISTINCT=manual_authority_explicit_and_tested
TECH_DIAGNOSTICS_SECONDARY=collapsed_and_keyboard_tested
FINANCIAL_LOGIC_CHANGED=false
PERSISTENCE_CHANGED=false
FIREBASE_CHANGED=false
IMPORT_AUTHORITY_CHANGED=false
REAL_DATA_USED=false
LOCAL_IMPORTS_ACCESSED=false
FINANCIAL_WRITES=0
```

## Evidência visual

Capturas locais, não versionadas, feitas em runtime `testMode=1` com fixture V289 sintética:

- Desktop: [v294-confiabilidade-1366-dark.png](v294-confiabilidade-1366-dark.png) — 1366×768, 229801 bytes.
- Mobile: [v294-confiabilidade-390-dark.png](v294-confiabilidade-390-dark.png) — 390×844, 115118 bytes.
- Índice: [PHOTO_PICKUP_INDEX.md](PHOTO_PICKUP_INDEX.md).

## Itens diferidos

- `XLSX_INTEGRATION_CLASSIFICATION=DEFERRED_INTEGRATION_GAP`
- `XLSX_REQUIRED_BEFORE_RELEASE_CANDIDATE=true` — ainda é preciso validar carregamento CDN/SheetJS e decodificação XLSX com fixture sintética; nenhuma importação privada foi executada.
- `PHASE_206_CLASSIFICATION=TEST_HARNESS_FAILURE` — 4/5 por dependência VM `assetCurrentValue`; não alterado, fora do escopo Wave F.
- `V286_FINANCIAL_ACTION_AUDIT=NOT_PRESENT_IN_THIS_CHECKOUT` — o documento solicitado na missão não existe no checkout; a Wave F não recriou nem inferiu seu conteúdo.
- `PHASE_198_DOCUMENTATION_TEST=PREEXISTING_FAILURE` — divergência do cabeçalho acima.

## Revisão

```text
TECH_REVIEW_RECOMMENDED=GLM_5_3
VISUAL_REVIEW_RECOMMENDED=KIMI_K3_OR_CHATGPT_VISION
WAVE_F_EXTERNALLY_CERTIFIED=false
NEXT_ACTION=TECH_REVIEW_THEN_VISUAL_REVIEW
```
