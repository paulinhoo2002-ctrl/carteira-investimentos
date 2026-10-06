# V324 — backup longevity e disaster recovery (proposta)

Status: especificação pronta; implementação não autorizada. Sem configuração de credenciais, armazenamento externo, e-mail ou restore real.

## Escopo

- Backup manual reutilizando o contrato V2 atual.
- Backup automático mensal, retenção das últimas 12 cópias mensais e snapshot anual protegido contra rotação mensal.
- Manifesto versionado com `schemaVersion`, versão do app, instante de criação, domínios requeridos/opcionais e contagens, mais hash de integridade.
- Abstração mínima de destino externo; escolher provedor, custo, região e credenciais em decisão humana separada. Não colocar segredo no código, Git, log ou mensagem.
- Notificação por e-mail apenas com link autenticado e expirável; sem anexar dados financeiros nem valores.
- Preview obrigatório antes de restore e snapshot de segurança imediatamente antes da aplicação.

## Critérios de aceite

1. Falhas de captura, checksum, upload, retenção e notificação são explícitas; não anunciam backup válido.
2. Ausência/parcialidade de domínio continua `PARTIAL`, nunca é convertida em vazio/zero.
3. Snapshot anual não é removido pela rotação mensal.
4. Restore valida schema, domínios, integridade e contagens antes de qualquer mutação; preview não grava.
5. Testes sintéticos cobrem falha/retry, limites de retenção, snapshot anual, hash inválido, schema futuro, partial backup e restore preview.
6. Credenciais, custo, provedor e política de retenção externa passam por gate humano antes de integração.
