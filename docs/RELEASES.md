# Releases

Historico resumido das versoes publicadas.


## Release LEGACY — 2026-10-17

- PR #501 substituiu a #500 por release sanitizada e foi squash-merged em `6619c9ed6286bd1b446ec90d07432ace000e4e03`.
- CI do commit de produção passou; Vercel `carteira-investimentos` ficou `READY` no mesmo SHA.
- Smoke autenticado read-only passou nas rotas críticas; Axe autenticado diretamente em produção não foi verificado.
- IR2026 permanece sem certificação por dados reais; Package2 V3 não foi promovido; patrimônio global não está certificado.
- Sem escrita financeira hospedada, mudança de Auth/Rules ou deploy manual.
- Registro completo: [`docs/ai/LEGACY_FINAL_RELEASE_2026-10-17.md`](ai/LEGACY_FINAL_RELEASE_2026-10-17.md).
## v1.1.0-rc1

Release de estabilizacao da base atual.

### Principais pontos
- Ativos estaveis;
- excluir aporte funcionando;
- labels corrigidos;
- console limpo;
- build passando.

### Marco tecnico
- commit: `e8a1e6c`
- tag: `v1.1.0-rc1`
