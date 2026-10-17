# Backlog vigente da Carteira LEGACY

Este é o backlog operacional único após a release de 17/10/2026. Estado de produção e critérios de certificação ficam em [`PROJECT_STATE.md`](PROJECT_STATE.md) e [`LEGACY_SYSTEM_STATUS.md`](LEGACY_SYSTEM_STATUS.md).

## Bloqueadores de release

`RELEASE_BLOCKERS=NONE_KNOWN`

## P0 — incidentes críticos

Nenhum incidente crítico conhecido na certificação da release. Incidente reproduzível de segurança, disponibilidade ou corrupção de dados entra nesta prioridade imediatamente.

## P1 — certificação de dados fiscais

- Obter posição oficial de abertura fiscal em 31/12/2025, com quantidade e custo por ativo.
- Obter memória documentada de prejuízos anteriores por categoria fiscal e competência.
- Obter informes e comprovantes de IRRF, custos incidentais e taxas com data e escopo.
- Completar documentos fiscais por custódia e classificação de eventos corporativos.
- Revisar as regras legais de 2026 pendentes por fonte oficial e revisão independente.

Documento que orienta a coleta: [`IR2026_DOCUMENT_REQUEST.md`](IR2026_DOCUMENT_REQUEST.md). Sem evidência suficiente, manter `TAX_PAYABLE_STATUS=NOT_CALCULATED`.

## P2 — Package2 V3 hospedado

- Provar a identidade do proprietário por fluxo autorizado, sem registrar UID pessoal na documentação pública.
- Fazer leitura exata do documento de destino e guardar evidência privada, fora do Git.
- Revisar diff de campo antes de qualquer promoção.
- Obter autorização específica para uma atualização limitada ao campo V3, com concorrência, backup e rollback verificados.

`PACKAGE2_V3_HOSTED_PROMOTED=NO`. Nenhuma etapa de escrita está autorizada por este backlog.

## P3 — reconciliação global

- Confirmar identidade e data do outro custodiante por fonte primária.
- Resolver sobreposição entre posições e movimentações de custódias distintas.
- Comparar valores com a mesma data e base de valuation.
- Preservar posição global como não certificada até a cobertura ser demonstrada.

## P4 — interpretação fiscal e jurídica

- Resolver a classificação e o tratamento de LIG por fonte primária.
- Certificar a interpretação fiscal de BDR quando aplicável.
- Diferenciar amortização, devolução de principal e rendimento por produto.
- Não alterar regras de cálculo até que evidência e revisão sustentem a decisão.

## P5 — privacidade técnica preexistente

- Classificar referências legadas em `firestore.rules` e documentação herdada sem reproduzir valores, contas, contatos ou caminhos privados.
- Avaliar a exposição do histórico remoto pré-sanitização da PR #500. A cleanroom #501 impediu que esse histórico entrasse em `main`; não reescrever o histórico remoto sem autorização específica.
- Manter sanitização diferencial em futuras PRs e evitar publicar artefatos financeiros privados.

## P6 — recuperação administrativa

- Confirmar MFA, métodos de recuperação e responsável de contingência no painel dos provedores.
- Manter `ADMIN_RECOVERY_RISK=OPEN` até essa verificação independente.
- Não adicionar usuários nem alterar regras de acesso como parte deste backlog.

## P7 — UX opcional

Somente melhorias com problema reproduzível, benefício claro e escopo separado. Feature freeze segue ativo até revisão do backlog.
