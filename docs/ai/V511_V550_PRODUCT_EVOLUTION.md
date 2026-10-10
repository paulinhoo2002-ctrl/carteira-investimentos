# V511–V550 — Legacy Product Evolution (2026-10-10)

MISSION=V511_V550_LEGACY_PRODUCT_EVOLUTION
STATUS=COMPLETED (auditoria completa; nenhum defeito novo; nenhum código fabricado)
PROJECT_IDENTITY_GATE=PASS — worktree v511-550-product-evolution criada de origin/main **5aea145fab900a76d5f3fbe4eee54cd4779cda06** (pós-#479, igual ao informado; #479 e #478 confirmadas MERGED), remote paulinhoo2002-ctrl/carteira-investimentos, checkout limpo.
MODEL_USED=z-ai/glm-5.3 (Hermes/NVIDIA); Flash não necessário; Codex Luna High indisponível.

## LOTE 1 — V511–V515 — Inventário real do produto
Mapeamento por código-fonte + suítes (verificado, não presumido):
- **Cadastro de ativos: IMPLEMENTED** (formulário completo em index.html: ticker/metadata/preço médio/cotação/DY/alvo + RF com taxa/vencimento; suítes asset-detail 18/18, auto-metadata).
- **Compras e vendas: IMPLEMENTED** (quick-movement com preview fail-closed, validação inline de erros, auto-metadata, PnL via TaxCostBasisIntelligence; suítes dedicated 44/44).
- **Proventos: IMPLEMENTED** (motor canônico de classificação DECLARED/EXPECTED/RECEIVED, matriz anual, timeline mensal, maiores pagadores; 49+ suítes verdes).
- **Renda fixa: IMPLEMENTED** (posição manual + eventos RF, projection readonly modern, diagnóstico IPCA V262, trust filter/sort; 98/98).
- **Importações: IMPLEMENTED** (Import Center: B3 CSV/XLSX, fail-closed em formato desconhecido; 27/27).
- **Notas da corretora: IMPLEMENTED** (brokerage-professional: preview read-only, dedupe EXACT_DUPLICATE/CONFLICT, reconciliação, escala 1/10/100; 31+6/6).
- **Dashboard/patrimônio: IMPLEMENTED** (KPIs, evolução, alocação com estados UNKNOWN/PARTIAL, highlights V348).
Classificação geral: **nenhuma capacidade MISSING ou BLOCKED** nas áreas auditadas. Lacunas de benefício real: nenhuma identificada além das já conhecidas (PROVIDER_QA etc. — fora de escopo de produto).

## LOTE 2 — V516–V520 — Notas da corretora — COMPLETE (nada a implementar)
Auditoria do pipeline existente: importação ✓ (fixtures sintéticas Inter/B3), classificação por tipo ✓, **pré-visualização antes de confirmar ✓** (v330-note-preview read-only), **detecção de duplicidade ✓** (classifyNoteDuplicate → EXACT_DUPLICATE_NOTE/CONFLICTING_NOTE + duplicateGuard por transação), **conciliação ✓** (same-day matching marca "possível duplicata" sem colapsar), **dados incompletos ✓** (fail-closed: side/asset/identity ausentes → NEEDS_REVIEW; gross ≠ qty×price rejeita; nunca inventa). Layouts universais NÃO presumidos — parser é por família comprovada. Suítes: 31/31 + 27/27 + 6/6 verdes. **Nenhuma nota real importada** (fixtures sintéticas apenas). Nenhuma alteração necessária.

## LOTE 3 — V521–V525 — Controle financeiro — PASS
Preço médio (média ponderada), custos/taxas (fail-closed UNKNOWN≠ZERO), quantidade/posições encerradas (V259 replay de venda parcial/recompra), eventos corporativos (splits/lineage sem transações sintéticas), valorização por ativo, patrimônio consolidado — suítes: tax-cost-basis 32/32, reconstrução histórica 31/31, corporate events 16/16. Consistência movimentos↔posições garantida pelo engine (position authority + reconciliação read-only). Zero defeitos reproduzidos; zero fórmulas alteradas.

## LOTE 4 — V526–V530 — Renda passiva — PASS
Recebidos/declarados/projetados separados por design (DECLARED/EXPECTED nunca somam a RECEBIDO); média mensal só com meses completos; renda por tipo; evolução mensal com **"período observado, sem projeção no histórico"** explícito no UI (linha 35121) e "Renda projetada/mês" claramente marcada como "Estimativa da carteira" (20932); calendário anual; projeções com premissas explícitas (RF exige taxa+vencimento, senão "dados insuficientes"). Provento manual sem estado = PAID preservado. 49/49 + 3/3 verdes.

## LOTE 5 — V531–V535 — UX e produtividade — PASS
Cadastro/edição com validação inline; ativos ± separados por classe com sinais consistentes; navegação sidebar+bottom-nav com foco gerenciado; filtros/busca (assets, dividendos, RF trust filter/sort); mensagens de erro acessíveis (role=status); estados vazios (ds-empty-state) e UNKNOWN nunca zero; responsividade 320–3440 (V346); a11y axe dark/light (V289). Suítes UX: 44/44 + 9/9. Nenhum defeito demonstrado — nenhuma mudança fabricada.

## LOTE 6 — V536–V540 — Qualidade dos dados — PASS
Dedupe determinístico (identidade econômica exata; mesmo mês/ticker = novo evento, não duplicata); IDs estáveis (fingerprint); referências por assetId exato (nunca ticker aproximado); datas legadas validadas sem coerção de timezone; ausência ≠ zero em toda a cadeia (data-quality + trust-ui 44/44; fixture manifest + movement-id 51/51). Nenhum dado real tocado.

## LOTE 7 — V541–V545 — Segurança e regressão — PASS
Auth/isolamento: emulador 8/8 no CI por push + QA hospedado certificado 15/15 (V451–V455, contas sintéticas); write-boundary 116/116 (incl. origin-isolation + synthetic runtime); PWA offline seguro 12/12; service worker reliability 4/4. Credenciais: zero em código/docs. Dependência de produção: modo sintético/emulador é loopback-gated; nenhum fallback de produção. Produção intocada.

## LOTE 8 — V546–V550 — Entrega consolidada — PASS (nenhuma alteração → nenhuma PR)
Bateria final no HEAD exato 5aea145: npm test **868/868**; test:modern **823/823**; verify:release **1714/1714** (exit 0, inclui visual via pretest fix do #479); qa:all **PASS 0/0/0/0**; git diff --check clean. Worktree sem alterações — **nenhuma Draft PR criada** (diretriz: não fabricar mudanças; não abrir PR desnecessária). CI main no 5aea145 SUCCESS (pós-merge #479); Vercel production success.

FEATURES_FOUND=7 áreas, todas IMPLEMENTED | FEATURES_IMPLEMENTED=0 (nada faltando) | BUGS_FIXED=0 (nenhum defeito reproduzido em 8 lotes)
FINANCIAL_INVARIANTS=PRESERVED (todas as 7 suítes canônicas verdes; PAID-default intacto)
TESTS_ADDED=0 (nenhum necessário — sem mudanças)

REAL_FINANCIAL_WRITES=0; REAL_FINANCIAL_IMPORT=false; REAL_FINANCIAL_RESTORE=false; MANUAL_PRODUCTION_DEPLOY=false; MERGE=false.