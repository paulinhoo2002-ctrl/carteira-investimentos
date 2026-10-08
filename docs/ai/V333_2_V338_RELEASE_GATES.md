# V333.2–V338 — gates de revisão e publicação

SUPERPOWERS + PONYTAIL FULL + CAVEMAN

Data: 2026-10-08. Escopo: LEGACY; somente fixtures sintéticas.

| Missão | Resultado | Gate restante |
|---|---|---|
| V333.2 | readonly bloqueado em 17 entradas; média histórica sem cobertura indisponível em Legacy/Modern; RED→GREEN | revisão humana por PR |
| V334 | revisão independente e cadeia #456→#457 sincronizada sem force push | #457/#458 sem CI GitHub pela base empilhada; nenhuma integração autorizada |
| V335 | auditoria read-only de index/dependências antigos; matriz 13 KEEP/ADAPT/DO_NOT_COPY | não copiar semântica/ponte QA antigas |
| V336 | Ativos recebe região focável e orientação para rolagem; código 6511dc4 | Draft #458 dependente #457 |
| V337 | 117/117 focais sintéticos no estado integrado; backup, restore, load, roundtrip e auth boundary | Firestore Emulator local falha startup; provider QA externo isolado ausente |
| V338 | release local PASS, Chrome/Edge 30 combinações cada, A11Y e visual PASS | Firefox/WebKit não certificados; não é liberação de produção |

## SHAs e evidência

- #456 HEAD c3f34826659ef6f2978ae5c410711b6d28384d4e; código 5c87918fad9861e4f60e7fc5d586bcc16cb4641f. CI 37795440118 PASS em Build/test, visual e Auth/Firestore Emulator.
- #457 HEAD 01fe79eea628a790660d0a8ba1814c1bf572d3db; média 04e1563; fixture ec8eabf. Preview PASS; CI GitHub ausente na base não-main.
- #458 contém código 6511dc4 e este checkpoint; Preview/HEAD devem ser reconferidos antes da integração.
- verify:release na cadeia final: Modern 822/822; visual 15/15; A11Y adicional 19/19; A11Y/retry/replay/reliability da #457 199/199; readonly unit 43/43 e browser 1/1. Todos sem failures/skips nas execuções registradas.
- Chrome e Edge: Dashboard/Ativos/Dividendos, 390/430/768/1366/1920, dark/light, zero overflow/page/console errors/Firebase requests/storage writes; memória financeira intacta. ArrowRight rola região de Ativos em 1366 dark/light.
- Diagnóstico render sintético: Chrome V336 6.2–18.2 ms (mediana 8.4); Edge 6.7–17.7 ms (mediana 9.2). Medição local, não Core Web Vitals ou SLA.
- npm ci somente V336; lockfile/dependências não alterados. npm audit --omit=dev: zero vulnerabilidades. Avisos dev preexistentes não corrigidos automaticamente.

## Como repetir

Executar dentro da worktree autorizada após identity gate:

1. npm.cmd run verify:release
2. npm.cmd run test:local-synthetic:browser
3. node --test tests/a11y-functional.test.js
4. node --test tests/e2e-auth-mode.test.js tests/local-synthetic-qa-runtime.test.js tests/persistence-core.test.js tests/backup-restore-integration.test.js tests/backup-recovery-hardening.test.js tests/v324-backup-lifecycle.test.js tests/load-integration.test.js tests/save-load-roundtrip.test.js
5. npm.cmd run test:auth-emulator somente demo Auth+Firestore; não tratar falha local startup como PASS.

## Publicação preparada, não executada

Main remoto permanece cefc725f2378648c29593b27399a2f9bf2656db7. Checkout canônico sujo preservado. #454→#455 independentes preservadas; #456→#457→#458 continuam Draft. Sem merge de PR/main, force push, produção ou import/restore/write financeiros reais.

Ordem candidata de integração: #456, depois #457, depois #458, cada uma com autorização humana específica e validação no SHA/base vigente. Antes da primeira integração, verificar Git production branch/auto-deploy Vercel; nenhuma configuração remota foi alterada. Provider QA exige projeto/conta sintéticos isolados; Preview com configuração produção não é ambiente autorizado para esse teste.
