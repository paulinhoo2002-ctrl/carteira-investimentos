# Release Checklist v1.0 RC1

Checklist de preparação para publicação do Release Candidate do projeto Carteira de Investimentos.

## Validação concluída

- [x] Fase 44 concluída: QA geral de produção.
- [x] Fase 45 concluída: backup e restauração auditados.
- [x] Fase 46 concluída: PWA, cache e atualização auditados.
- [x] Produção acessível.
- [x] Navegação geral validada.
- [x] Mobile validado.
- [x] Backup/exportação validado.
- [x] PWA/service worker validados.
- [x] Console sem erro crítico conhecido.

## Ponto conhecido

- [x] Aviso futuro de depreciação do Firebase `enableMultiTabIndexedDbPersistence()` registrado como não bloqueante.

## Pronto para RC

- [x] Nenhuma alteração em cálculos financeiros.
- [x] Nenhuma alteração em lógica de dados ou persistência.
- [x] Nenhuma alteração em API Yahoo, Firestore Rules, Firebase config ou regras sensíveis.
- [x] Nenhuma alteração em telas do app.
- [x] Build validado com `npm run build`.

## Próximos passos

- [ ] Criar tag `v1.0.0-rc1` após a validação final.
- [ ] Publicar a tag no repositório remoto.
