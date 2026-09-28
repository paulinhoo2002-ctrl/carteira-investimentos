# Runbook de importação mensal

## NORMAL_MODE

1. Confirmar workspace, branch e HEAD.
2. Confirmar origem HTTP, runtime V2, Service Worker v17 e sessão QA.
3. Ler o baseline real somente leitura e registrar FP.
4. Selecionar exportação local do mês, calcular SHA-256 e registrar proveniência.
5. Gerar plano sem escrita. Conferir total, vínculos, novos, exclusões,
   ambiguidades e conflitos.
6. Executar sombra 3x (5x quando houver risco maior), com readback, reload,
   uma prova de reinício, stale-cloud, duplicidade/idempotência e cloud-zero.
7. Gerar manifesto hashado com `DO_NOT_EXECUTE=true`.
8. Só após nova autorização explícita, executar uma vez e validar readback,
   sem retry automático.

## INCIDENT_MODE

Escalar se houver mismatch de runtime/autoridade, baseline ou FP inesperado,
divergência local/cloud, `save()` falso, escrita parcial, readback divergente,
duplicidade/ambiguidade, conflito na fonte, ownership anômalo, mudança de schema,
persistence ou Firebase. Nesse caso, suspender o mês e repetir a investigação
completa de segurança e durabilidade.

## Contrato de execução futura

Entradas obrigatórias: mês, HEAD exato, manifesto, source hash, plan FP,
baseline FP e target FP. Uma tentativa apenas. Falha após o início da mutação
consome a autorização e não dispara retry, recovery, rollback automático ou
cloud sync. Agosto e recovery permanecem escopos separados.
